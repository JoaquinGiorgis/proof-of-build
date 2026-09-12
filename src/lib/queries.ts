import "server-only";

import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import type {
  Build,
  BuildStatus,
  BuilderProfile,
  Credential,
  EventRecord,
} from "./domain";
import { shortAddress } from "./domain";

/**
 * The single seam between the screens and the database.
 *
 * Everything is read-only and public — a build's whole point is that anybody
 * can check it, so there is nothing to authenticate on the way in. Writes live
 * in `mutations.ts` and only ever run from an API route.
 */

type EventRow = typeof schema.events.$inferSelect;
type TrackRow = typeof schema.tracks.$inferSelect;
type BuildRow = typeof schema.builds.$inferSelect;
type CredentialRow = typeof schema.credentials.$inferSelect;

export async function listEvents(): Promise<EventRecord[]> {
  const db = getDb();
  const [eventRows, trackRows] = await Promise.all([
    db.select().from(schema.events).orderBy(desc(schema.events.year)),
    db.select().from(schema.tracks).orderBy(asc(schema.tracks.position)),
  ]);
  return eventRows.map((event) =>
    toEvent(
      event,
      trackRows.filter((track) => track.eventSlug === event.slug),
    ),
  );
}

export async function getEvent(slug: string): Promise<EventRecord | null> {
  const db = getDb();
  const [event] = await db
    .select()
    .from(schema.events)
    .where(eq(schema.events.slug, slug))
    .limit(1);
  if (!event) return null;

  const trackRows = await db
    .select()
    .from(schema.tracks)
    .where(eq(schema.tracks.eventSlug, slug))
    .orderBy(asc(schema.tracks.position));

  return toEvent(event, trackRows);
}

export async function listBuilds(options?: {
  eventSlug?: string;
  trackSlug?: string;
}): Promise<Build[]> {
  const filters = [];
  if (options?.eventSlug) {
    filters.push(eq(schema.builds.eventSlug, options.eventSlug));
  }
  if (options?.trackSlug) {
    filters.push(eq(schema.builds.trackSlug, options.trackSlug));
  }
  return selectBuilds(filters.length ? and(...filters) : undefined);
}

export async function getBuild(slug: string): Promise<Build | null> {
  const [build] = await selectBuilds(eq(schema.builds.slug, slug));
  return build ?? null;
}

export async function listBuildsByWallet(wallet: string): Promise<Build[]> {
  // Addresses are case-sensitive base58, but a pasted address may differ in
  // case from what the wallet reported, so match case-insensitively.
  return selectBuilds(
    sql`lower(${schema.builds.wallet}) = lower(${wallet})`,
  );
}

export async function getProfile(
  wallet: string,
): Promise<BuilderProfile | null> {
  const builds = await listBuildsByWallet(wallet);
  if (builds.length === 0) return null;
  return {
    wallet: builds[0].wallet,
    name: builds[0].builderName || shortAddress(builds[0].wallet, 6, 6),
    handle: null,
    builds,
  };
}

/* -------------------------------------------------------------------------- */

async function selectBuilds(where?: SQL) {
  const db = getDb();
  const rows = await db
    .select({ build: schema.builds, credential: schema.credentials })
    .from(schema.builds)
    .leftJoin(
      schema.credentials,
      eq(schema.credentials.buildSlug, schema.builds.slug),
    )
    .where(where)
    .orderBy(desc(schema.builds.createdAt));

  return rows.map((row) => toBuild(row.build, row.credential));
}

function toEvent(event: EventRow, trackRows: TrackRow[]): EventRecord {
  return {
    slug: event.slug,
    name: event.name,
    issuer: event.issuer,
    year: event.year,
    verified: event.verified,
    location: event.location,
    startsAt: event.startsAt.toISOString().slice(0, 10),
    endsAt: event.endsAt.toISOString().slice(0, 10),
    artwork: event.artwork,
    cover: event.cover,
    tracks: trackRows.map((track) => ({ slug: track.slug, name: track.name })),
  };
}

function toBuild(build: BuildRow, credential: CredentialRow | null): Build {
  return {
    slug: build.slug,
    name: build.name,
    tagline: build.tagline,
    team: build.team,
    trackSlug: build.trackSlug,
    eventSlug: build.eventSlug,
    githubUrl: build.githubUrl,
    demoUrl: build.demoUrl,
    wallet: build.wallet,
    builderName: build.builderName,
    status: build.status as BuildStatus,
    credential: credential ? toCredential(credential) : null,
    createdAt: build.createdAt.toISOString(),
  };
}

function toCredential(credential: CredentialRow): Credential {
  return {
    mint: credential.mint,
    signature: credential.signature,
    cluster: credential.cluster as Credential["cluster"],
    issuedAt: credential.issuedAt.toISOString(),
  };
}
