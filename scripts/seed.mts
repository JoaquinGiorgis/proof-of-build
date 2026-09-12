/**
 * Seeds the issuer and its tracks. Idempotent — run it as often as you like.
 *
 *   pnpm db:seed
 *
 * Builds are not seeded: they arrive from the create flow, and a build with no
 * credential behind it is not a proof of anything.
 */

import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { events, tracks } from "../src/db/schema";
import { CORDOBA_HACK } from "../src/lib/mock";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const pool = new Pool({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const db = drizzle(pool);

const event = CORDOBA_HACK;

await db
  .insert(events)
  .values({
    slug: event.slug,
    name: event.name,
    issuer: event.issuer,
    year: event.year,
    verified: event.verified,
    location: event.location,
    startsAt: new Date(`${event.startsAt}T00:00:00Z`),
    endsAt: new Date(`${event.endsAt}T23:59:59Z`),
    artwork: event.artwork,
    issuerAddress: process.env.ISSUER_ADDRESS ?? null,
  })
  .onConflictDoUpdate({
    target: events.slug,
    set: {
      name: event.name,
      issuer: event.issuer,
      year: event.year,
      verified: event.verified,
      location: event.location,
      artwork: event.artwork,
    },
  });

for (const [position, track] of event.tracks.entries()) {
  await db
    .insert(tracks)
    .values({
      slug: track.slug,
      eventSlug: event.slug,
      name: track.name,
      position,
    })
    .onConflictDoUpdate({
      target: [tracks.eventSlug, tracks.slug],
      set: { name: track.name, position },
    });
}

console.log(
  `Seeded ${event.name} ${event.year} with ${event.tracks.length} tracks.`,
);
await pool.end();
