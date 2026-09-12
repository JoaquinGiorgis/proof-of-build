import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  exists,
  inArray,
  isNull,
  sql,
  type SQL,
} from "drizzle-orm";
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

/**
 * Live builds only. Archived ones are still readable one at a time — see
 * `getBuild` — they just stop counting as projects anybody is being shown.
 */
const isLive = isNull(schema.builds.archivedAt);

/**
 * Has at least one credential. A build row is written during `prepare`, before
 * the builder has signed anything, because the slug has to exist to go into
 * the metadata URI. If they close the tab there, the row stays — and a list
 * headed "Everything that shipped" would be advertising a project that never
 * did. Shipping is a credential onchain; until then there is nothing to show.
 */
function hasCredential() {
  return exists(
    getDb()
      .select({ one: sql`1` })
      .from(schema.credentials)
      .where(eq(schema.credentials.buildSlug, schema.builds.slug)),
  );
}

export async function listBuilds(options?: {
  eventSlug?: string;
  trackSlug?: string;
}): Promise<Build[]> {
  const filters = [isLive, hasCredential()];
  if (options?.eventSlug) {
    filters.push(eq(schema.builds.eventSlug, options.eventSlug));
  }
  if (options?.trackSlug) {
    filters.push(eq(schema.builds.trackSlug, options.trackSlug));
  }
  return selectBuilds(and(...filters));
}

/**
 * One build by slug, archived or not.
 *
 * Deliberately not filtered. A minted credential's metadata URI names this
 * slug and can never be changed, so the page behind it has to keep answering
 * — it just says it is archived. Everything else is a listing, and listings
 * filter.
 */
export async function getBuild(slug: string): Promise<Build | null> {
  const [build] = await selectBuilds(eq(schema.builds.slug, slug));
  return build ?? null;
}

/** The build a team's project maps to in the event's own system. */
export async function getBuildByExternalId(
  source: "manual" | "hackcba",
  externalId: string,
): Promise<Build | null> {
  const [build] = await selectBuilds(
    and(
      eq(schema.builds.source, source),
      eq(schema.builds.externalId, externalId),
    ),
  );
  return build ?? null;
}

/** The builds a wallet holds a credential for. */
export async function listBuildsByWallet(wallet: string): Promise<Build[]> {
  const db = getDb();
  const claimed = await db
    .select({ buildSlug: schema.credentials.buildSlug })
    .from(schema.credentials)
    .where(sql`lower(${schema.credentials.wallet}) = lower(${wallet})`);

  if (claimed.length === 0) return [];
  return selectBuilds(
    and(
      isLive,
      inArray(
        schema.builds.slug,
        claimed.map((row) => row.buildSlug),
      ),
    ),
  );
}

export async function getProfile(
  wallet: string,
): Promise<BuilderProfile | null> {
  const builds = await listBuildsByWallet(wallet);
  if (builds.length === 0) return null;

  // The name comes from this builder's own credential, not the build's — on a
  // team project, each member is credited under their own name.
  const mine = builds[0].credentials.find(
    (credential) => credential.wallet.toLowerCase() === wallet.toLowerCase(),
  );

  return {
    wallet: mine?.wallet ?? wallet,
    name: mine?.builderName || shortAddress(wallet, 6, 6),
    handle: null,
    builds,
  };
}

/* -------------------------------------------------------------------------- */

async function selectBuilds(where?: SQL) {
  const db = getDb();
  const buildRows = await db
    .select()
    .from(schema.builds)
    .where(where)
    .orderBy(desc(schema.builds.createdAt));

  if (buildRows.length === 0) return [];

  const credentialRows = await db
    .select()
    .from(schema.credentials)
    .where(
      inArray(
        schema.credentials.buildSlug,
        buildRows.map((build) => build.slug),
      ),
    )
    .orderBy(asc(schema.credentials.issuedAt));

  const byBuild = new Map<string, CredentialRow[]>();
  for (const credential of credentialRows) {
    const bucket = byBuild.get(credential.buildSlug);
    if (bucket) bucket.push(credential);
    else byBuild.set(credential.buildSlug, [credential]);
  }

  return buildRows.map((build) =>
    toBuild(build, byBuild.get(build.slug) ?? []),
  );
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

function toBuild(build: BuildRow, credentials: CredentialRow[]): Build {
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
    archived: build.archivedAt !== null,
    credentials: credentials.map(toCredential),
    createdAt: build.createdAt.toISOString(),
  };
}

function toCredential(credential: CredentialRow): Credential {
  return {
    mint: credential.mint,
    wallet: credential.wallet,
    builderName: credential.builderName,
    signature: credential.signature,
    cluster: credential.cluster as Credential["cluster"],
    issuedAt: credential.issuedAt.toISOString(),
  };
}
