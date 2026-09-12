/**
 * The network, in one place. Devnet always — nobody deploys a hackathon
 * project to mainnet (docs/SOLANA-RULES.md).
 *
 * Kept free of any Kit import so both server routes and client components can
 * read it without pulling the wallet plugin into a server bundle.
 */
export const CLUSTER = "devnet" as const;
export const CHAIN = "solana:devnet" as const;
