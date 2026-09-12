import type { EventRecord } from "./domain";

/**
 * Seed content for the issuer.
 *
 * Builds are not defined here — they come from the database, written by the
 * create flow. A build that nobody actually shipped is not a proof of
 * anything, so there is no fixture data for them.
 */

export const CORDOBA_HACK: EventRecord = {
  slug: "cordoba-hack-2026",
  name: "Córdoba Hack",
  issuer: "Naranja X",
  year: 2026,
  verified: true,
  location: "Córdoba, Argentina",
  startsAt: "2026-09-19",
  endsAt: "2026-09-21",
  artwork: "/assets/cordoba-hack-proof.png",
  tracks: [
    { slug: "solana", name: "Solana" },
    { slug: "ai", name: "AI" },
    { slug: "fintech", name: "Fintech" },
    { slug: "open", name: "Open" },
  ],
};
