/**
 * Seeds the issuers, their tracks and their claim codes. Idempotent — run it
 * as often as you like:
 *
 *   pnpm db:seed
 *
 * Adding an event to the platform means adding it to `src/lib/mock.ts` and
 * running this. There is no self-serve event creation on purpose: an event
 * gets the issuer's signature, so it is added deliberately.
 *
 * A code's `uses` is never reset here — re-seeding must not hand back uses
 * that builders already spent.
 */

import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { claimCodes, events, tracks } from "../src/db/schema";
import { SEED_EVENTS } from "../src/lib/mock";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const pool = new Pool({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const db = drizzle(pool);

for (const event of SEED_EVENTS) {
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
      cover: event.cover,
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
        startsAt: new Date(`${event.startsAt}T00:00:00Z`),
        endsAt: new Date(`${event.endsAt}T23:59:59Z`),
        artwork: event.artwork,
        cover: event.cover,
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

  for (const code of event.claimCodes) {
    await db
      .insert(claimCodes)
      .values({
        code: code.code.toUpperCase(),
        eventSlug: event.slug,
        label: code.label,
        maxUses: code.maxUses,
        expiresAt: code.expiresAt
          ? new Date(`${code.expiresAt}T23:59:59Z`)
          : null,
      })
      .onConflictDoUpdate({
        target: claimCodes.code,
        // Note the absence of `uses`: re-seeding must not refund spent uses.
        set: {
          label: code.label,
          maxUses: code.maxUses,
          expiresAt: code.expiresAt
            ? new Date(`${code.expiresAt}T23:59:59Z`)
            : null,
        },
      });
  }

  console.log(
    `Seeded ${event.name} ${event.year} — ${event.tracks.length} tracks, ${event.claimCodes.length} claim code(s).`,
  );
}

await pool.end();
