/**
 * The network, in one place.
 *
 * Driven by `NEXT_PUBLIC_SOLANA_CLUSTER` rather than hardcoded, so local work
 * stays on devnet while production can be on mainnet without a code change —
 * and so flipping back is an environment variable, not a revert.
 *
 * On mainnet the builder pays real rent (see `CLAIM_COST_LAMPORTS`) and the
 * mints are permanent. The `cluster` column on `credentials` records which
 * network each one was issued on, so the two can coexist in one database and
 * the explorer links stay correct for both.
 *
 * Kept free of any Kit import so both server routes and client components can
 * read it without pulling the wallet plugin into a server bundle.
 */

export type Cluster = "devnet" | "mainnet-beta";

function readCluster(): Cluster {
  // Inlined at build time by Next, so it cannot be read from a variable name.
  const value = process.env.NEXT_PUBLIC_SOLANA_CLUSTER?.trim();
  if (value === "mainnet-beta" || value === "mainnet") return "mainnet-beta";
  return "devnet";
}

export const CLUSTER: Cluster = readCluster();

export const CHAIN =
  CLUSTER === "mainnet-beta"
    ? ("solana:mainnet" as const)
    : ("solana:devnet" as const);

/** What to call it on screen. "Mainnet" reads better than "mainnet-beta". */
export const CLUSTER_LABEL = CLUSTER === "mainnet-beta" ? "mainnet" : "devnet";

export const IS_MAINNET = CLUSTER === "mainnet-beta";

/** The default endpoint for this cluster. Overridden by the RPC env vars. */
export const DEFAULT_RPC_URL = IS_MAINNET
  ? "https://api.mainnet-beta.solana.com"
  : "https://api.devnet.solana.com";

/**
 * What the builder pays to claim: rent for the Token-2022 mint (three
 * extensions with the metadata inline) and for their token account, plus the
 * fee. Shown on the button and enforced in `checkPayerFunds`, from here, so
 * the number the page promises and the number the server demands cannot drift.
 */
export const CLAIM_COST_SOL = 0.006;
export const CLAIM_COST_LAMPORTS = BigInt(Math.round(CLAIM_COST_SOL * 1e9));
