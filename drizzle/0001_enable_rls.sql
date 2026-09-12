-- Row Level Security.
--
-- `public` is exposed through Supabase's Data API, so every table in it is
-- reachable by the `anon` and `authenticated` roles unless RLS says otherwise.
--
-- The access model here is simple and matches the product: a build's whole
-- point is that anybody can read it, and nobody but the server may write it.
-- So: RLS on, one SELECT policy per table for anon + authenticated, and no
-- INSERT / UPDATE / DELETE policies at all. Writes go through Drizzle as the
-- `postgres` role, which has BYPASSRLS — the API routes are the only path in,
-- and they validate before writing.

ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tracks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "builds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credentials" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "events are public" ON "events"
  FOR SELECT TO anon, authenticated USING (true);
--> statement-breakpoint

CREATE POLICY "tracks are public" ON "tracks"
  FOR SELECT TO anon, authenticated USING (true);
--> statement-breakpoint

CREATE POLICY "builds are public" ON "builds"
  FOR SELECT TO anon, authenticated USING (true);
--> statement-breakpoint

CREATE POLICY "credentials are public" ON "credentials"
  FOR SELECT TO anon, authenticated USING (true);
