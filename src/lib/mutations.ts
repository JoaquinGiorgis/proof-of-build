import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import type { BuildDraft } from "./build-draft";
import { slugify } from "./slug";

/** A database handle: the pool, or a transaction already in flight. */
type Executor = Pick<ReturnType<typeof getDb>, "select">;

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
export async function peekClaimCode(
  code: string,
  eventSlug: string,
  /**
   * Run on an existing transaction when there is one. Checking out a second
   * connection while a transaction still holds the first is how a small pool
   * deadlocks: with `max: 4`, four simultaneous failed claims each hold one
   * and wait for a fifth that cannot exist.
   */
  executor: Executor = getDb(),
) {
  const [row] = await executor
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
      const peek = await peekClaimCode(code, draft.eventSlug, tx);
      throw new ClaimError(peek.ok ? "exhausted" : peek.reason);
    }

    // One registration per wallet per event on this path. It used to be a
    // unique index, but that had to go when a build stopped belonging to a
    // single wallet — so it is checked here, inside the transaction that
    // spent the use, and a failure refunds it.
    const [already] = await tx
      .select({ slug: schema.builds.slug })
      .from(schema.builds)
      .where(
        and(
          eq(schema.builds.eventSlug, draft.eventSlug),
          sql`lower(${schema.builds.wallet}) = lower(${wallet})`,
        ),
      )
      .limit(1);
    if (already) throw new ClaimError("already-claimed");

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
        // A unique we did not anticipate. Rolls the spent use back with the
        // transaction rather than burning it on a failure that is ours.
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
 * Upserts the build a signed claim link describes.
 *
 * Keyed on the team's id in the event's system, so four teammates opening four
 * links land on one project rather than four copies of it.
 *
 * An existing build is returned untouched rather than refreshed. A link stays
 * valid for weeks, so "refresh from the token" means any older link rewrites
 * whatever the build currently says — a teammate opening yesterday's email
 * would revert a description the team fixed this morning. Freezing the content
 * at the first claim is also the truer record: the metadata minted into that
 * first credential is immutable, and the page should agree with it.
 */
export async function upsertExternalBuild({
  source,
  externalId,
  eventSlug,
  name,
  tagline,
  team,
  trackSlug,
  githubUrl,
  demoUrl,
}: {
  source: "hackcba";
  externalId: string;
  eventSlug: string;
  name: string;
  tagline: string;
  team: string[];
  trackSlug: string;
  githubUrl: string | null;
  demoUrl: string | null;
}): Promise<{ slug: string; archived: boolean }> {
  const db = getDb();

  const [existing] = await db
    .select({ slug: schema.builds.slug, archivedAt: schema.builds.archivedAt })
    .from(schema.builds)
    .where(
      and(
        eq(schema.builds.source, source),
        eq(schema.builds.externalId, externalId),
      ),
    )
    .limit(1);

  // Archived is reported rather than acted on here: this function's job is to
  // say which build a link maps to, and the route decides what that means.
  if (existing) {
    return { slug: existing.slug, archived: existing.archivedAt !== null };
  }

  const base = slugify(name);
  for (let attempt = 0; attempt < 20; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const [row] = await db
      .insert(schema.builds)
      .values({
        slug,
        name,
        tagline,
        team,
        trackSlug,
        eventSlug,
        githubUrl,
        demoUrl,
        status: "ready",
        source,
        externalId,
      })
      .onConflictDoNothing({ target: schema.builds.slug })
      .returning({ slug: schema.builds.slug });

    if (row) return { slug: row.slug, archived: false };
  }

  throw new Error("Could not find a free slug for this build.");
}

/**
 * Writes a builder's credential once the signature is confirmed onchain.
 *
 * Many credentials hang off one build — a team ships one project and each
 * member claims their own. Two uniques make this safe to call twice: on
 * `signature`, so a retried confirm resolves to the same row rather than
 * recording a second mint; and on (build, wallet), so a builder who claims
 * twice gets back the credential they already hold.
 */
export async function recordCredential({
  buildSlug,
  wallet,
  builderName,
  mint,
  signature,
  cluster,
}: {
  buildSlug: string;
  wallet: string;
  builderName: string;
  mint: string;
  signature: string;
  cluster: "devnet" | "mainnet-beta";
}): Promise<{ issuedAt: Date } | null> {
  const db = getDb();

  const [build] = await db
    .select({ slug: schema.builds.slug })
    .from(schema.builds)
    .where(eq(schema.builds.slug, buildSlug))
    .limit(1);
  if (!build) return null;

  const [credential] = await db
    .insert(schema.credentials)
    .values({ mint, buildSlug, wallet, builderName, signature, cluster })
    .onConflictDoUpdate({
      target: schema.credentials.signature,
      set: { mint, buildSlug, wallet, builderName },
    })
    .returning({ issuedAt: schema.credentials.issuedAt });

  await db
    .update(schema.builds)
    .set({ status: "minted" })
    .where(eq(schema.builds.slug, buildSlug));

  return credential ?? null;
}

/** The credential this wallet already holds against a build, if any. */
export async function findCredential(buildSlug: string, wallet: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.credentials)
    .where(
      and(
        eq(schema.credentials.buildSlug, buildSlug),
        sql`lower(${schema.credentials.wallet}) = lower(${wallet})`,
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Marks a build as failed so it does not sit in `ready` forever. */
export async function markBuildFailed(buildSlug: string) {
  const db = getDb();
  await db
    .update(schema.builds)
    .set({ status: "failed" })
    .where(eq(schema.builds.slug, buildSlug));
}
