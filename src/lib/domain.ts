/**
 * The product's vocabulary. Deliberately small: a build is a thing somebody
 * shipped at an event, and a proof is the onchain credential that says so.
 *
 * Never call the credential an NFT — it is a non-transferable Token-2022 mint
 * whose metadata lives onchain via the TokenMetadata extension.
 */

export type BuildStatus = "draft" | "ready" | "minting" | "minted" | "failed";

export type Track = {
  slug: string;
  name: string;
};

export type EventRecord = {
  slug: string;
  name: string;
  issuer: string;
  year: number;
  /** The issuer signed the credential, so the badge reads "verified issuer". */
  verified: boolean;
  location: string;
  startsAt: string;
  endsAt: string;
  tracks: Track[];
  /** Public path of the event artwork used on the credential card. */
  artwork: string | null;
};

export type Build = {
  slug: string;
  name: string;
  tagline: string;
  /** Display names, in the order the team wants to be credited. */
  team: string[];
  trackSlug: string;
  eventSlug: string;
  githubUrl: string | null;
  demoUrl: string | null;
  /** Base58 address of the builder who owns the credential. */
  wallet: string;
  builderName: string;
  status: BuildStatus;
  credential: Credential | null;
  createdAt: string;
};

export type Credential = {
  /** Token-2022 mint address. */
  mint: string;
  /** Transaction signature of the mint. */
  signature: string;
  cluster: "devnet" | "mainnet-beta";
  issuedAt: string;
};

export type BuilderProfile = {
  wallet: string;
  name: string;
  handle: string | null;
  builds: Build[];
};

/* -------------------------------------------------------------------------- */

export function shortAddress(address: string, lead = 4, tail = 4) {
  if (address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

export function explorerUrl(
  kind: "tx" | "address",
  value: string,
  cluster: Credential["cluster"] = "devnet",
) {
  const suffix = cluster === "devnet" ? "?cluster=devnet" : "";
  return `https://explorer.solana.com/${kind}/${value}${suffix}`;
}

export const STATUS_LABEL: Record<BuildStatus, string> = {
  draft: "Draft",
  ready: "Ready to mint",
  minting: "Minting",
  minted: "Proof onchain",
  failed: "Failed",
};
