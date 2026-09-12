-- Claim codes are secrets. RLS on, and deliberately NO policy: with RLS
-- enabled and no policy, `anon` and `authenticated` can read nothing at all.
-- Every other table in `public` is public on purpose; this one is the
-- exception, because a readable claim code is a giveaway credential.
ALTER TABLE "claim_codes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- One credential per wallet per event. A builder registers what they shipped,
-- once — this is also what stops a single leaked code being redeemed over and
-- over from the same wallet.
--
-- Indexed on lower(wallet): base58 is case-sensitive and a wallet always
-- reports the same casing, but the lookups in queries.ts compare
-- case-insensitively, so the constraint has to match or it could be sidestepped
-- by changing case.
CREATE UNIQUE INDEX "builds_event_wallet_idx"
  ON "builds" ("event_slug", lower("wallet"));
--> statement-breakpoint

-- A code cannot be redeemed more times than it allows.
ALTER TABLE "claim_codes"
  ADD CONSTRAINT "claim_codes_uses_within_max" CHECK ("uses" <= "max_uses");
