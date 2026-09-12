import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Proof of Build — Postgres schema (Supabase).
 *
 * Deliberately small. The chain holds the proof; this holds the content that
 * makes the proof readable — and nothing personal beyond what the team chose
 * to publish on their own build page.
 */

export const buildStatus = pgEnum("build_status", [
  "draft",
  "ready",
  "minting",
  "minted",
  "failed",
]);

export const cluster = pgEnum("cluster", ["devnet", "mainnet-beta"]);

export const events = pgTable("events", {
  slug: varchar("slug", { length: 64 }).primaryKey(),
  name: text("name").notNull(),
  issuer: text("issuer").notNull(),
  year: integer("year").notNull(),
  verified: boolean("verified").notNull().default(false),
  location: text("location").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  /** Public path or URL of the credential artwork. */
  artwork: text("artwork"),
  /** The issuer's onchain address — the key that signs every credential. */
  issuerAddress: varchar("issuer_address", { length: 44 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tracks = pgTable(
  "tracks",
  {
    slug: varchar("slug", { length: 64 }).notNull(),
    eventSlug: varchar("event_slug", { length: 64 })
      .notNull()
      .references(() => events.slug, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
  },
  (table) => [
    uniqueIndex("tracks_event_slug_slug_idx").on(table.eventSlug, table.slug),
  ],
);

export const builds = pgTable(
  "builds",
  {
    slug: varchar("slug", { length: 64 }).primaryKey(),
    name: text("name").notNull(),
    tagline: text("tagline").notNull(),
    /** Display names, in the order the team wants to be credited. */
    team: jsonb("team").$type<string[]>().notNull().default([]),
    trackSlug: varchar("track_slug", { length: 64 }).notNull(),
    eventSlug: varchar("event_slug", { length: 64 })
      .notNull()
      .references(() => events.slug, { onDelete: "cascade" }),
    githubUrl: text("github_url"),
    demoUrl: text("demo_url"),
    /** Base58 address of the builder who owns the credential. */
    wallet: varchar("wallet", { length: 44 }).notNull(),
    builderName: text("builder_name").notNull(),
    status: buildStatus("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("builds_wallet_idx").on(table.wallet),
    index("builds_event_slug_idx").on(table.eventSlug),
  ],
);

export const credentials = pgTable(
  "credentials",
  {
    /** Token-2022 mint address — one credential per mint, by definition. */
    mint: varchar("mint", { length: 44 }).primaryKey(),
    buildSlug: varchar("build_slug", { length: 64 })
      .notNull()
      .references(() => builds.slug, { onDelete: "cascade" }),
    /** Transaction signature of the mint, confirmed before it is written. */
    signature: varchar("signature", { length: 88 }).notNull(),
    cluster: cluster("cluster").notNull().default("devnet"),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // A signature can only ever count once — the same rule as a payment.
    uniqueIndex("credentials_signature_idx").on(table.signature),
    uniqueIndex("credentials_build_slug_idx").on(table.buildSlug),
  ],
);

export type EventRow = typeof events.$inferSelect;
export type TrackRow = typeof tracks.$inferSelect;
export type BuildRow = typeof builds.$inferSelect;
export type CredentialRow = typeof credentials.$inferSelect;
