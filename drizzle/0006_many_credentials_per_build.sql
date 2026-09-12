-- A build is a project, not a person.
--
-- Until now a build was one wallet's, and a credential was one build's. That
-- was wrong for how a hackathon actually works: a team of four ships one
-- project, and each of the four carries their own proof of having built it.
-- So the rules move down a level — from the build to the credential.

-- "One build per wallet per event" was the old rule. It cannot survive a build
-- that has no single owner, and it would stop a builder's second project at a
-- future event from being registered by the same wallet.
DROP INDEX IF EXISTS "builds_event_wallet_idx";
--> statement-breakpoint

-- The rule that replaces it: one credential per builder per build. Claiming
-- twice from the same wallet returns the credential you already have instead
-- of minting a second one.
--
-- lower(wallet) for the same reason as before: base58 is case-sensitive but
-- the lookups compare case-insensitively, so the constraint has to match or it
-- could be sidestepped by changing case.
CREATE UNIQUE INDEX "credentials_build_wallet_idx"
  ON "credentials" ("build_slug", lower("wallet"));
--> statement-breakpoint

-- A build either came from an event's system with an id, or it did not.
-- `manual` builds must not carry one, or two of them could collide on the
-- (source, external_id) unique index.
ALTER TABLE "builds"
  ADD CONSTRAINT "builds_external_id_matches_source"
  CHECK (("source" = 'manual') = ("external_id" IS NULL));
