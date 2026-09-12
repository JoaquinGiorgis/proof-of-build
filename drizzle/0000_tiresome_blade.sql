CREATE TYPE "public"."build_status" AS ENUM('draft', 'ready', 'minting', 'minted', 'failed');--> statement-breakpoint
CREATE TYPE "public"."cluster" AS ENUM('devnet', 'mainnet-beta');--> statement-breakpoint
CREATE TABLE "builds" (
	"slug" varchar(64) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tagline" text NOT NULL,
	"team" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"track_slug" varchar(64) NOT NULL,
	"event_slug" varchar(64) NOT NULL,
	"github_url" text,
	"demo_url" text,
	"wallet" varchar(44) NOT NULL,
	"builder_name" text NOT NULL,
	"status" "build_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credentials" (
	"mint" varchar(44) PRIMARY KEY NOT NULL,
	"build_slug" varchar(64) NOT NULL,
	"signature" varchar(88) NOT NULL,
	"cluster" "cluster" DEFAULT 'devnet' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"slug" varchar(64) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"issuer" text NOT NULL,
	"year" integer NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"location" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"artwork" text,
	"issuer_address" varchar(44),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"slug" varchar(64) NOT NULL,
	"event_slug" varchar(64) NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "builds" ADD CONSTRAINT "builds_event_slug_events_slug_fk" FOREIGN KEY ("event_slug") REFERENCES "public"."events"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_build_slug_builds_slug_fk" FOREIGN KEY ("build_slug") REFERENCES "public"."builds"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_event_slug_events_slug_fk" FOREIGN KEY ("event_slug") REFERENCES "public"."events"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "builds_wallet_idx" ON "builds" USING btree ("wallet");--> statement-breakpoint
CREATE INDEX "builds_event_slug_idx" ON "builds" USING btree ("event_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "credentials_signature_idx" ON "credentials" USING btree ("signature");--> statement-breakpoint
CREATE UNIQUE INDEX "credentials_build_slug_idx" ON "credentials" USING btree ("build_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "tracks_event_slug_slug_idx" ON "tracks" USING btree ("event_slug","slug");