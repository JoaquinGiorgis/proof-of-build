import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import type { BuildDraft } from "./build-draft";
import { slugify } from "./slug";

/**
 * The only writes in the product, and both of them run from an API route that
 * has already re-validated its input. There is no path from the browser to
 * these functions.
 */

export type ClaimFailure =
  | "unknown-code"
  | "wrong-event"
  | "expired"
  | "exhausted"
  | "already-claimed";

export class ClaimError extends Error {
  constructor(readonly reason: ClaimFailure) {
    super(reason);
    this.name = "ClaimError";
  }
}

/**
 * Checks a claim code without spending a use.
 *
 * Read-only, for the gate the builder sees before the wizard. The real check
 * is `redeemClaimCode`, which is the one that counts — never gate a signature
 * on a check that the client could have skipped.
 */
export async function peekClaimCode(code: string, eventSlug: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.claimCodes)
    .where(eq(schema.claimCodes.code, normalizeCode(code)))
    .limit(1);

  if (!row) return { ok: false as const, reason: "unknown-code" as const };
  if (row.eventSlug !== eventSlug) {
    return { ok: false as const, reason: "wrong-event" as const };
  }
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    return { ok: false as const, reason: "expired" as const };
  }
  if (row.uses >= row.maxUses) {
    return { ok: false as const, reason: "exhausted" as const };
  }
  return { ok: true as const };
}

/**
 * Records the draft before the transaction is signed, so a proof that lands
 * always has a build behind it — and returns the slug the credential's
 * metadata URL will point at.
 *
 * The claim code is spent in the same transaction as the insert. Spending it
 * is a single conditional UPDATE (`uses < max_uses AND not expired`), so two
 * builders racing for the last use of a code cannot both win: Postgres
 * serialises the row update and the loser's UPDATE matches nothing.
 *
 * A wallet may register the same project name twice; the slug gets a numeric
 * suffix rather than silently overwriting somebody else's build.
 */
export async function createBuildDraft({
  draft,
  wallet,
  builderName,
  claimCode,
}: {
  draft: BuildDraft;
  wallet: string;
  builderName: string;
  claimCode: string;
}): Promise<{ slug: string }> {
  const db = getDb();
  const code = normalizeCode(claimCode);
  const base = slugify(draft.name);

  return db.transaction(async (tx) => {
    // Spend a use, but only if the code belongs to this event, has not
    // expired, and has a use left. One statement, so no window to race in.
    const [spent] = await tx
      .update(schema.claimCodes)
      .set({ uses: sql`${schema.claimCodes.uses} + 1` })
      .where(
        and(
          eq(schema.claimCodes.code, code),
          eq(schema.claimCodes.eventSlug, draft.eventSlug),
          sql`${schema.claimCodes.uses} < ${schema.claimCodes.maxUses}`,
          sql`(${schema.claimCodes.expiresAt} is null or ${schema.claimCodes.expiresAt} > now())`,
        ),
      )
      .returning({ code: schema.claimCodes.code });

    if (!spent) {
      // Tell the builder which of the four it was, but only after the write
      // failed — the distinction is for them, not for someone probing codes.
      const peek = await peekClaimCode(code, draft.eventSlug);
      throw new ClaimError(peek.ok ? "exhausted" : peek.reason);
    }

    for (let attempt = 0; attempt < 20; attempt++) {
      const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
      try {
        const [row] = await tx
          .insert(schema.builds)
          .values({
            slug,
            name: draft.name,
            tagline: draft.tagline,
            team: draft.team,
            trackSlug: draft.trackSlug,
            eventSlug: draft.eventSlug,
            githubUrl: draft.githubUrl || null,
            demoUrl: draft.demoUrl || null,
            wallet,
            builderName,
            status: "ready",
            claimCode: code,
          })
          .onConflictDoNothing({ target: schema.builds.slug })
          .returning({ slug: schema.builds.slug });

        if (row) return row;
      } catch (cause) {
        // The (event, wallet) unique index — this wallet already has a build
        // at this event. Rolls back the spent use with the transaction.
        if (isUniqueViolation(cause)) throw new ClaimError("already-claimed");
        throw cause;
      }
    }

    throw new Error("Could not find a free slug for this build.");
  });
}

/** Codes are shown and typed in any case; they are stored uppercase. */
function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

/**
 * Postgres unique-violation (23505), found anywhere in the cause chain.
 *
 * Drizzle wraps driver errors in a `DrizzleQueryError`, so the pg error code
 * is not on the object it throws — it is one or more `cause` hops down.
 */
function isUniqueViolation(cause: unknown) {
  for (let current = cause, hops = 0; current && hops < 5; hops++) {
    if (
      typeof current === "object" &&
      "code" in current &&
      (current as { code?: string }).code === "23505"
    ) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/**
 * Writes the credential once the signature is confirmed onchain.
 *
 * The unique index on `signature` is what makes this safe to call twice: a
 * retried confirm resolves to the same row instead of minting a second record.
 * Returns null when the build does not belong to this wallet — a confirm for
 * somebody else's build is not an error to explain, it is a request to ignore.
 */
export async function recordCredential({
  buildSlug,
  wallet,
  mint,
  signature,
  cluster,
}: {
  buildSlug: string;
  wallet: string;
  mint: string;
  signature: string;
  cluster: "devnet" | "mainnet-beta";
}): Promise<{ issuedAt: Date } | null> {
  const db = getDb();

  const [build] = await db
    .select({ slug: schema.builds.slug })
    .from(schema.builds)
    .where(
      and(
        eq(schema.builds.slug, buildSlug),
        sql`lower(${schema.builds.wallet}) = lower(${wallet})`,
      ),
    )
    .limit(1);
  if (!build) return null;

  const [credential] = await db
    .insert(schema.credentials)
    .values({ mint, buildSlug, signature, cluster })
    .onConflictDoUpdate({
      target: schema.credentials.signature,
      set: { mint, buildSlug },
    })
    .returning({ issuedAt: schema.credentials.issuedAt });

  await db
    .update(schema.builds)
    .set({ status: "minted" })
    .where(eq(schema.builds.slug, buildSlug));

  return credential ?? null;
}

/** Marks a build as failed so it does not sit in `ready` forever. */
export async function markBuildFailed(buildSlug: string) {
  const db = getDb();
  await db
    .update(schema.builds)
    .set({ status: "failed" })
    .where(eq(schema.builds.slug, buildSlug));
}
