CREATE TYPE "public"."build_source" AS ENUM('manual', 'hackcba');--> statement-breakpoint
DROP INDEX "credentials_build_slug_idx";--> statement-breakpoint
ALTER TABLE "builds" ALTER COLUMN "wallet" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "builds" ALTER COLUMN "builder_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "builds" ADD COLUMN "source" "build_source" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "builds" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "credentials" ADD COLUMN "wallet" varchar(44) NOT NULL;--> statement-breakpoint
ALTER TABLE "credentials" ADD COLUMN "builder_name" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "builds_source_external_idx" ON "builds" USING btree ("source","external_id");--> statement-breakpoint
CREATE INDEX "credentials_wallet_idx" ON "credentials" USING btree ("wallet");