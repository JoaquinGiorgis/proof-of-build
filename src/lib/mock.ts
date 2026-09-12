import type { EventRecord } from "./domain";

/**
 * Seed content for the issuers on the platform.
 *
 * Events are created here and applied with `pnpm db:seed` — there is no
 * self-serve event creation, so an issuer's signature is only ever handed to
 * an event that was added on purpose.
 *
 * Builds are not defined here: they come from the database, written by the
 * create flow. A build that nobody actually shipped is not a proof of
 * anything, so there is no fixture data for them.
 */

export type SeedEvent = EventRecord & {
  /** Codes the event hands to its builders. See `claim_codes`. */
  claimCodes: {
    code: string;
    label: string;
    maxUses: number;
    /** ISO date; null never expires. */
    expiresAt: string | null;
  }[];
};

export const CORDOBA_HACK: SeedEvent = {
  slug: "cordoba-hack-2026",
  name: "Córdoba Hack",
  issuer: "Naranja X",
  year: 2026,
  verified: true,
  location: "Córdoba, Argentina",
  // 24 hours to ship your best idea — 11 September 2026.
  startsAt: "2026-09-11",
  endsAt: "2026-09-12",
  artwork: "/assets/cordoba-hack-proof.png",
  cover: "/assets/cordoba-hack-cover.webp",
  // Slugs match hackcba's own (`src/app/dashboard/content.ts` there), because
  // a signed claim link carries the track the team picked in that dashboard.
  // Rename one and the old links stop verifying — which is the point.
  tracks: [
    { slug: "ai", name: "AI" },
    { slug: "web3", name: "Web3" },
    { slug: "agro", name: "Agro" },
    { slug: "twin", name: "Fintech" },
  ],
  claimCodes: [
    {
      code: "CBAHACK-2026",
      label: "Handed to builders at the venue",
      maxUses: 200,
      // A week after the event closes, the code stops working — a hackathon
      // credential should not be claimable in December.
      expiresAt: "2026-09-19",
    },
  ],
};

export const SEED_EVENTS: SeedEvent[] = [CORDOBA_HACK];
