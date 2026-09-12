import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyClaimToken } from "@/lib/claim-link";
import { recordCredential } from "@/lib/mutations";
import { getBuild } from "@/lib/queries";
import { CLUSTER } from "@/lib/solana/cluster";
import { confirmCredential } from "@/lib/solana/credential";

/**
 * Confirms a credential landed before anything is marked as minted.
 *
 * On a timeout the client may retry; checking the signature's status is the
 * safe way to do that — resending blind double-pays if the first one landed
 * and the RPC lost the reply (docs/SOLANA-RULES.md). The unique indexes on
 * `signature` and on (build, wallet) make the write itself idempotent.
 *
 * The name on the credential is never taken from the request. It comes from
 * the signed link that authorised the claim, or — on the claim-code path —
 * has to be one of the names the build is already credited to. That name goes
 * on a public card, so the client does not get to choose it freely.
 */

export const runtime = "nodejs";

const base58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

const bodySchema = z.object({
  buildSlug: z.string().min(1).max(64),
  signature: z.string().min(64).max(88).regex(base58, "invalid signature"),
  mint: z.string().min(32).max(44).regex(base58, "invalid mint"),
  payer: z.string().min(32).max(44).regex(base58, "invalid payer"),
  token: z.string().min(16).max(4096).optional(),
  builderName: z.string().trim().min(1).max(80).optional(),
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

  const { buildSlug, signature, mint, payer, token, builderName } = parsed.data;

  const build = await getBuild(buildSlug);
  if (!build) {
    return NextResponse.json({ error: "unknown build" }, { status: 404 });
  }

  const name = resolveBuilderName({ token, builderName, team: build.team });
  if (!name) {
    return NextResponse.json(
      { error: "Could not tell who this credential belongs to." },
      { status: 403 },
    );
  }

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
      builderName: name,
      mint,
      signature,
      cluster: CLUSTER,
    });
    if (!credential) {
      return NextResponse.json({ error: "unknown build" }, { status: 404 });
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

function resolveBuilderName({
  token,
  builderName,
  team,
}: {
  token?: string;
  builderName?: string;
  team: string[];
}): string | null {
  // The signed link is the issuer saying who this is. Nothing beats it.
  if (token) {
    const verdict = verifyClaimToken(token);
    return verdict.ok ? verdict.payload.builder : null;
  }
  // Otherwise, only a name the build already credits publicly.
  if (builderName && team.includes(builderName)) return builderName;
  return team[0] ?? null;
}
