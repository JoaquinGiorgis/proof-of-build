import { NextResponse } from "next/server";
import { z } from "zod";
import { buildDraftSchema, type BuildDraft } from "@/lib/build-draft";
import { verifyClaimToken } from "@/lib/claim-link";
import {
  ClaimError,
  createBuildDraft,
  findCredential,
  upsertExternalBuild,
  type ClaimFailure,
} from "@/lib/mutations";
import { getEvent } from "@/lib/queries";
import { slugify } from "@/lib/slug";
import { CLUSTER_LABEL, IS_MAINNET } from "@/lib/solana/cluster";
import {
  checkPayerFunds,
  estimateClaimCost,
  prepareCredential,
} from "@/lib/solana/credential";

/**
 * Builds and issuer-signs a credential transaction.
 *
 * Two ways in, one Solana path:
 *
 *  · a **claim code** the event handed out, plus a draft the builder typed;
 *  · a **signed link** the event's own system issued, which already carries
 *    the project it verified — nothing to type, nothing to trust from the
 *    client beyond a signature we can check.
 *
 * Either way the issuer key never leaves this process, and the response
 * carries no secret: the transaction is useless until the builder signs it as
 * fee payer.
 */

export const runtime = "nodejs";

const wallet = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid payer");

const bodySchema = z.union([
  z.object({
    payer: wallet,
    token: z.string().min(16).max(4096),
  }),
  z.object({
    payer: wallet,
    draft: buildDraftSchema,
    claimCode: z
      .string("This event needs a claim code.")
      .trim()
      .min(4, "This event needs a claim code.")
      .max(32),
  }),
]);

const CLAIM_MESSAGES: Record<ClaimFailure, string> = {
  "unknown-code": "That code does not exist.",
  "wrong-event": "That code belongs to a different event.",
  expired: "That code has expired.",
  exhausted: "That code has been used up.",
  "already-claimed": "This wallet already registered a build at this event.",
};

const TOKEN_MESSAGES = {
  malformed: "That claim link is not readable.",
  "bad-signature": "That claim link was not issued by this event.",
  expired: "That claim link has expired. Ask the event for a new one.",
} as const;

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

  const input = parsed.data;
  const siteUrl = siteUrlFrom(request);

  let draft: BuildDraft;
  let buildSlug: string;
  let builderName: string;
  let event: Awaited<ReturnType<typeof getEvent>>;

  if ("token" in input) {
    const verdict = verifyClaimToken(input.token);
    if (!verdict.ok) {
      return NextResponse.json(
        { error: TOKEN_MESSAGES[verdict.reason] },
        { status: 403 },
      );
    }
    const payload = verdict.payload;

    event = await getEvent(payload.ev);
    if (!event) {
      return NextResponse.json({ error: "unknown event" }, { status: 404 });
    }
    // The track is signed, but it still has to be one this event runs — a
    // stale link from before a track was renamed should fail loudly.
    if (!event.tracks.some((track) => track.slug === payload.tr)) {
      return NextResponse.json(
        { error: "That link points at a track this event no longer has." },
        { status: 409 },
      );
    }

    draft = {
      eventSlug: event.slug,
      name: payload.n,
      tagline: payload.d,
      githubUrl: payload.gh,
      demoUrl: payload.live,
      team: payload.team_names,
      trackSlug: payload.tr,
    };
    builderName = payload.builder;

    const shortfall = await affordable({
      draft,
      event,
      siteUrl,
      // The slug this build will get. A collision suffix moves the metadata
      // URI by two characters, which the fee margin covers.
      buildSlug: slugify(payload.n),
      payer: input.payer,
    });
    if (shortfall) return shortfall;

    ({ slug: buildSlug } = await upsertExternalBuild({
      source: "hackcba",
      externalId: payload.team,
      eventSlug: event.slug,
      name: payload.n,
      tagline: payload.d,
      team: payload.team_names,
      trackSlug: payload.tr,
      githubUrl: payload.gh || null,
      demoUrl: payload.live || null,
    }));

    // Claiming twice is a refresh, not an error. Hand back what they have
    // rather than minting a second credential for the same builder.
    const existing = await findCredential(buildSlug, input.payer);
    if (existing) {
      return NextResponse.json(
        {
          alreadyClaimed: true,
          buildSlug,
          mint: existing.mint,
          signature: existing.signature,
        },
        { status: 200 },
      );
    }
  } else {
    event = await getEvent(input.draft.eventSlug);
    if (!event) {
      return NextResponse.json({ error: "unknown event" }, { status: 404 });
    }
    if (!event.tracks.some((track) => track.slug === input.draft.trackSlug)) {
      return NextResponse.json({ error: "unknown track" }, { status: 400 });
    }

    draft = input.draft;
    builderName = input.draft.team[0] ?? "";

    const shortfall = await affordable({
      draft,
      event,
      siteUrl,
      buildSlug: slugify(input.draft.name),
      payer: input.payer,
    });
    if (shortfall) return shortfall;

    try {
      // Redeeming the code and writing the build happen in one transaction,
      // and this is the only gate on the issuer's signature.
      ({ slug: buildSlug } = await createBuildDraft({
        draft: input.draft,
        wallet: input.payer,
        builderName,
        claimCode: input.claimCode,
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
  }

  try {
    const prepared = await prepareCredential({
      draft,
      event,
      payer: input.payer,
      siteUrl,
      buildSlug,
    });
    return NextResponse.json({ ...prepared, buildSlug, builderName });
  } catch (cause) {
    console.error("[proofs/prepare]", cause);
    return NextResponse.json(
      { error: "Could not build the transaction. Nothing was sent." },
      { status: 500 },
    );
  }
}

/** Lamports as SOL, without a tail of zeros: 6000000n -> "0.006". */
/**
 * Returns a response when the builder cannot pay, and nothing when they can.
 *
 * Run before the build is written and before the wallet opens: the builder
 * pays the rent, and learning that from a wallet that refuses to simulate —
 * without being told which network it means — is a bad way to find out.
 */
async function affordable({
  draft,
  event,
  siteUrl,
  buildSlug,
  payer,
}: {
  draft: BuildDraft;
  event: NonNullable<Awaited<ReturnType<typeof getEvent>>>;
  siteUrl: string;
  buildSlug: string;
  payer: string;
}) {
  const needed = await estimateClaimCost({ draft, event, siteUrl, buildSlug });
  const funds = await checkPayerFunds(payer, needed);
  if (funds.ok) return null;

  return NextResponse.json(
    {
      error: `This wallet has ${formatSol(funds.lamports)} SOL on ${CLUSTER_LABEL} and this claim needs ${formatSol(funds.needed)} — almost all of it rent for the credential, which you keep.${IS_MAINNET ? "" : " Top it up at faucet.solana.com."} Check the wallet is on ${CLUSTER_LABEL}.`,
    },
    { status: 402 },
  );
}

function formatSol(lamports: bigint) {
  const sol = Number(lamports) / 1_000_000_000;
  return sol === 0 ? "0" : sol.toFixed(4).replace(/\.?0+$/, "");
}

function siteUrlFrom(request: Request) {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}
