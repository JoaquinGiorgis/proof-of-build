import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyClaimToken } from "@/lib/claim-link";
import { recordCredential } from "@/lib/mutations";
import { getBuild, getBuildByExternalId } from "@/lib/queries";
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

  // Which build this credential attaches to is never taken on trust. The
  // request names one, but it only counts if the caller can show they are
  // entitled to it — otherwise anyone holding a valid code could mint their
  // own credential and then confirm it against somebody else's project.
  const claim = await authorise({ buildSlug, token, payer, builderName });
  if (!claim.ok) {
    return NextResponse.json({ error: claim.error }, { status: claim.status });
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
      buildSlug: claim.buildSlug,
      wallet: payer,
      builderName: claim.builderName,
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

type Authorised =
  | { ok: true; buildSlug: string; builderName: string }
  | { ok: false; error: string; status: number };

/**
 * Decides which build this credential may attach to, and under what name.
 *
 * Both answers come from something the caller had to prove, never from the
 * request alone:
 *
 *  · with a **signed link**, the build is looked up from the team id inside
 *    the signature, so a token for one team cannot be pointed at another
 *    team's project, and the name is the one the issuer put in the payload;
 *  · with a **claim code**, the build has to be the one this wallet
 *    registered, which is the only build that wallet is entitled to.
 */
async function authorise({
  buildSlug,
  token,
  payer,
  builderName,
}: {
  buildSlug: string;
  token?: string;
  payer: string;
  builderName?: string;
}): Promise<Authorised> {
  if (token) {
    const verdict = verifyClaimToken(token);
    if (!verdict.ok) {
      return {
        ok: false,
        error: "That claim link is not valid.",
        status: 403,
      };
    }
    const build = await getBuildByExternalId("hackcba", verdict.payload.team);
    if (!build) {
      return { ok: false, error: "unknown build", status: 404 };
    }
    // The client's own idea of the slug is only a cross-check; the signature
    // is what decides.
    if (build.slug !== buildSlug) {
      return {
        ok: false,
        error: "That link does not belong to this build.",
        status: 403,
      };
    }
    return {
      ok: true,
      buildSlug: build.slug,
      builderName: verdict.payload.builder,
    };
  }

  const build = await getBuild(buildSlug);
  if (!build) return { ok: false, error: "unknown build", status: 404 };

  if (!build.wallet || build.wallet.toLowerCase() !== payer.toLowerCase()) {
    return {
      ok: false,
      error: "That build was not registered by this wallet.",
      status: 403,
    };
  }

  // Only a name the build already credits publicly — it goes on a public card.
  const name =
    builderName && build.team.includes(builderName)
      ? builderName
      : (build.builderName ?? build.team[0]);
  if (!name) {
    return {
      ok: false,
      error: "Could not tell who this credential belongs to.",
      status: 403,
    };
  }
  return { ok: true, buildSlug: build.slug, builderName: name };
}
