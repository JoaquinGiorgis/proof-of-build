import type { Build, BuilderProfile, EventRecord } from "./domain";

/**
 * Seed content for the screens while the database is not provisioned yet.
 * Everything here mirrors what `src/db/schema.ts` will store, so swapping the
 * reads for queries later is a one-file change in `src/lib/queries.ts`.
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

export const EVENTS: EventRecord[] = [CORDOBA_HACK];

export const BUILDS: Build[] = [
  {
    slug: "room-pay",
    name: "Room Pay",
    tagline: "Split shared expenses with your roommates.",
    team: ["Joaco", "Luca", "Artu"],
    trackSlug: "solana",
    eventSlug: "cordoba-hack-2026",
    githubUrl: "https://github.com/joaco/room-pay",
    demoUrl: "https://roompay.app",
    wallet: "4RWTEXSVHTR9NR2XESZJ78XPVCKD1J7X1B54TAARPV14",
    builderName: "Joaquín Giorgis",
    status: "minted",
    credential: {
      mint: "9wVVPGkS5rYdTgqZq8mRhLmtTGqLvXMdE7dUvJqPUAoN",
      signature:
        "5Yy5b8Kf1hQnEgmMBLh2u9nCkNQ4E6aQ1tXqWyVn3dFhVKcxgNGp7C4jPvz2hLqU8bT1sWJ9rDmXeY6oKfA3RzTn",
      cluster: "devnet",
      issuedAt: "2026-09-20T21:12:00Z",
    },
    createdAt: "2026-09-20T18:40:00Z",
  },
  {
    slug: "sello",
    name: "Sello",
    tagline: "Notarise a document without uploading it anywhere.",
    team: ["Mora", "Feli"],
    trackSlug: "solana",
    eventSlug: "cordoba-hack-2026",
    githubUrl: "https://github.com/mora/sello",
    demoUrl: null,
    wallet: "7pLQ2JmWnYh4KdVtRsX1BzAoCfE9uMgN6TqPvHrJeZ3S",
    builderName: "Mora Beltrán",
    status: "minted",
    credential: {
      mint: "3KpXnQvLtY8mRdW2FsBhTcJ5eA9uNgZ1QoPvMrXeH7dS",
      signature:
        "2Qp7nRvLtY8mRdW2FsBhTcJ5eA9uNgZ1QoPvMrXeH7dSKfA3RzTnWyVn3dFhVKcxgNGp7C4jPvz2hLqU8bT1sWJ9",
      cluster: "devnet",
      issuedAt: "2026-09-20T22:03:00Z",
    },
    createdAt: "2026-09-20T19:55:00Z",
  },
  {
    slug: "ferro",
    name: "Ferro",
    tagline: "Parametric crop insurance that settles itself.",
    team: ["Nacho", "Ceci", "Tomi"],
    trackSlug: "fintech",
    eventSlug: "cordoba-hack-2026",
    githubUrl: "https://github.com/nacho/ferro",
    demoUrl: "https://ferro.ar",
    wallet: "8mNrVpQ2LkYtXsBhZcJ4eA7uNgW1QoPvMrXeH9dTfR5K",
    builderName: "Nacho Peralta",
    status: "ready",
    credential: null,
    createdAt: "2026-09-21T02:14:00Z",
  },
  {
    slug: "cantera",
    name: "Cantera",
    tagline: "A registry of open datasets, with provenance.",
    team: ["Sol"],
    trackSlug: "ai",
    eventSlug: "cordoba-hack-2026",
    githubUrl: "https://github.com/sol/cantera",
    demoUrl: null,
    wallet: "6tHkWmQ9LpYrXsBhZcJ2eA5uNgV1QoPvMrXeH3dTfB8N",
    builderName: "Sol Ferreyra",
    status: "minted",
    credential: {
      mint: "5DfRtY8mQvLnXkW3FsBhTcJ7eA2uNgZ9QoPvMrXeH1dS",
      signature:
        "4Nf7nRvLtY8mRdW2FsBhTcJ5eA9uNgZ1QoPvMrXeH7dSKfA3RzTnWyVn3dFhVKcxgNGp7C4jPvz2hLqU8bT1sQx",
      cluster: "devnet",
      issuedAt: "2026-09-21T00:41:00Z",
    },
    createdAt: "2026-09-20T23:30:00Z",
  },
];

export const PROFILE: BuilderProfile = {
  wallet: "4RWTEXSVHTR9NR2XESZJ78XPVCKD1J7X1B54TAARPV14",
  name: "Joaquín Giorgis",
  handle: "joaquingiorgis",
  builds: BUILDS.filter(
    (build) => build.wallet === "4RWTEXSVHTR9NR2XESZJ78XPVCKD1J7X1B54TAARPV14",
  ),
};
