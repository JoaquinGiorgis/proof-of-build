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

/**
 * Records the draft before the transaction is signed, so a proof that lands
 * always has a build behind it — and returns the slug the credential's
 * metadata URL will point at.
 *
 * A wallet may register the same project name twice; the slug gets a numeric
 * suffix rather than silently overwriting somebody else's build.
 */
export async function createBuildDraft({
  draft,
  wallet,
  builderName,
}: {
  draft: BuildDraft;
  wallet: string;
  builderName: string;
}): Promise<{ slug: string }> {
  const db = getDb();
  const base = slugify(draft.name);

  for (let attempt = 0; attempt < 20; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const [row] = await db
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
      })
      .onConflictDoNothing({ target: schema.builds.slug })
      .returning({ slug: schema.builds.slug });

    if (row) return row;
  }

  throw new Error("Could not find a free slug for this build.");
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
