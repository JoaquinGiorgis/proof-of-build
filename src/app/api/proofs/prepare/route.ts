import { NextResponse } from "next/server";
import { z } from "zod";
import { buildDraftSchema } from "@/lib/build-draft";
import { ClaimError, createBuildDraft, type ClaimFailure } from "@/lib/mutations";
import { getEvent } from "@/lib/queries";
import { prepareCredential } from "@/lib/solana/credential";

/**
 * Records the build and issuer-signs its credential transaction.
 *
 * The browser sends the draft and its own address; everything is re-validated
 * here, because a request body is untrusted input. The issuer key never leaves
 * this process, and the response carries no secret — only a transaction that
 * is useless until the builder signs it as fee payer.
 */

export const runtime = "nodejs";

const bodySchema = z.object({
  draft: buildDraftSchema,
  payer: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid payer"),
  claimCode: z
    .string("This event needs a claim code.")
    .trim()
    .min(4, "This event needs a claim code.")
    .max(32),
});

const CLAIM_MESSAGES: Record<ClaimFailure, string> = {
  "unknown-code": "That code does not exist.",
  "wrong-event": "That code belongs to a different event.",
  expired: "That code has expired.",
  exhausted: "That code has been used up.",
  "already-claimed": "This wallet already has a build at this event.",
};

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

  const { draft, payer, claimCode } = parsed.data;

  const event = await getEvent(draft.eventSlug);
  if (!event) {
    return NextResponse.json({ error: "unknown event" }, { status: 404 });
  }
  // The track has to belong to this event — not any string the client sends.
  if (!event.tracks.some((track) => track.slug === draft.trackSlug)) {
    return NextResponse.json({ error: "unknown track" }, { status: 400 });
  }

  const siteUrl = siteUrlFrom(request);

  let buildSlug: string;
  try {
    // Redeeming the code and writing the build happen in one transaction, and
    // this is the only gate on the issuer's signature. The build is written
    // before the transaction is built so the credential's metadata URL points
    // at a page that exists.
    ({ slug: buildSlug } = await createBuildDraft({
      draft,
      wallet: payer,
      builderName: draft.team[0] ?? "",
      claimCode,
    }));
  } catch (cause) {
    if (cause instanceof ClaimError) {
      return NextResponse.json(
        { error: CLAIM_MESSAGES[cause.reason] },
        { status: 403 },
      );
    }
    console.error("[proofs/prepare] claim", cause);
    return NextResponse.json(
      { error: "Could not register the build. Nothing was sent." },
      { status: 500 },
    );
  }

  try {
    const prepared = await prepareCredential({
      draft,
      event,
      payer,
      siteUrl,
      buildSlug,
    });
    return NextResponse.json({ ...prepared, buildSlug });
  } catch (cause) {
    console.error("[proofs/prepare]", cause);
    return NextResponse.json(
      { error: "Could not build the transaction. Nothing was sent." },
      { status: 500 },
    );
  }
}

function siteUrlFrom(request: Request) {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}
