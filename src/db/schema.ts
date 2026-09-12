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

/** Where a build came from. See `builds.source`. */
export const buildSource = pgEnum("build_source", ["manual", "hackcba"]);

export const events = pgTable("events", {
  slug: varchar("slug", { length: 64 }).primaryKey(),
  name: text("name").notNull(),
  issuer: text("issuer").notNull(),
  year: integer("year").notNull(),
  verified: boolean("verified").notNull().default(false),
  location: text("location").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  /** Public path or URL of the credential artwork — what goes on the card. */
  artwork: text("artwork"),
  /** The event's own poster. Used on the event page and the events index. */
  cover: text("cover"),
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

/**
 * What lets a builder claim an event's credential.
 *
 * The issuer's signature is the whole value of the product, so it cannot be
 * handed to whoever shows up with a wallet. The event shares a code — on a
 * slide, in its Discord, on a badge — and only a holder of that code gets a
 * credential signed by that issuer.
 *
 * A code is a bearer token: if it leaks, it leaks. `maxUses` and `expiresAt`
 * bound the damage, and a build is limited to one per wallet per event.
 */
export const claimCodes = pgTable(
  "claim_codes",
  {
    /** Stored uppercase; lookups uppercase the input before matching. */
    code: varchar("code", { length: 32 }).primaryKey(),
    eventSlug: varchar("event_slug", { length: 64 })
      .notNull()
      .references(() => events.slug, { onDelete: "cascade" }),
    label: text("label"),
    maxUses: integer("max_uses").notNull().default(100),
    uses: integer("uses").notNull().default(0),
    /** Null means it never expires on its own. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("claim_codes_event_slug_idx").on(table.eventSlug)],
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
    /**
     * Who registered the build. Not the owner of the credential — a build is
     * a project, and every member of the team claims their own credential
     * against it. Null for builds that arrived from an event's own system,
     * where nobody "registered" it by hand.
     */
    wallet: varchar("wallet", { length: 44 }),
    builderName: text("builder_name"),
    status: buildStatus("status").notNull().default("draft"),
    /**
     * Where the build came from. `hackcba` builds are created from a signed
     * link the event issued; `manual` ones from the create flow with a code.
     */
    source: buildSource("source").notNull().default("manual"),
    /** The id this build has in the event's own system, when it has one. */
    externalId: text("external_id"),
    /** Which code authorised this build — null when a signed link did. */
    claimCode: varchar("claim_code", { length: 32 }).references(
      () => claimCodes.code,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("builds_wallet_idx").on(table.wallet),
    index("builds_event_slug_idx").on(table.eventSlug),
    // One build per team in the source system. This is what makes four
    // teammates opening four links land on the same project.
    uniqueIndex("builds_source_external_idx").on(table.source, table.externalId),
  ],
);

/**
 * A claimed credential. Many per build: a team ships one project, and every
 * member carries their own proof of having built it.
 */
export const credentials = pgTable(
  "credentials",
  {
    /** Token-2022 mint address — one credential per mint, by definition. */
    mint: varchar("mint", { length: 44 }).primaryKey(),
    buildSlug: varchar("build_slug", { length: 64 })
      .notNull()
      .references(() => builds.slug, { onDelete: "cascade" }),
    /** Base58 address of the builder this credential belongs to. */
    wallet: varchar("wallet", { length: 44 }).notNull(),
    /** How this builder is credited on the card. */
    builderName: text("builder_name").notNull(),
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
    index("credentials_wallet_idx").on(table.wallet),
  ],
);

export type EventRow = typeof events.$inferSelect;
export type TrackRow = typeof tracks.$inferSelect;
export type BuildRow = typeof builds.$inferSelect;
export type CredentialRow = typeof credentials.$inferSelect;
export type ClaimCodeRow = typeof claimCodes.$inferSelect;
