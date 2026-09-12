import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCredential } from "@/lib/mutations";
import { CLUSTER } from "@/lib/solana/cluster";
import { confirmCredential } from "@/lib/solana/credential";

/**
 * Confirms the credential landed before anything is marked as minted.
 *
 * On a timeout the client may retry; checking the signature's status is the
 * safe way to do that — resending blind double-pays if the first one landed
 * and the RPC lost the reply (docs/SOLANA-RULES.md). The unique index on
 * `signature` makes the write itself idempotent.
 */

export const runtime = "nodejs";

const base58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

const bodySchema = z.object({
  buildSlug: z.string().min(1).max(64),
  signature: z.string().min(64).max(88).regex(base58, "invalid signature"),
  mint: z.string().min(32).max(44).regex(base58, "invalid mint"),
  payer: z.string().min(32).max(44).regex(base58, "invalid payer"),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid request" },
      { status: 400 },
    );
  }

  const { buildSlug, signature, mint, payer } = parsed.data;

  try {
    const status = await confirmCredential(signature, mint);
    if (!status.confirmed) {
      return NextResponse.json(
        { error: `Transaction ${status.reason}.` },
        { status: 409 },
      );
    }

    const credential = await recordCredential({
      buildSlug,
      wallet: payer,
      mint,
      signature,
      cluster: CLUSTER,
    });
    if (!credential) {
      return NextResponse.json(
        { error: "That build does not belong to this wallet." },
        { status: 403 },
      );
    }

    return NextResponse.json({ issuedAt: credential.issuedAt.toISOString() });
  } catch (cause) {
    console.error("[proofs/confirm]", cause);
    return NextResponse.json(
      { error: "Could not confirm the transaction." },
      { status: 500 },
    );
  }
}
