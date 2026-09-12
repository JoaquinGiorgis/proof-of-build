DROP INDEX "builds_source_external_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "builds_source_external_idx" ON "builds" USING btree ("source","external_id") WHERE "builds"."archived_at" is null;