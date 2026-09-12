import { createClient } from "@solana/kit";
import { solanaRpc } from "@solana/kit-plugin-rpc";
import { walletSigner } from "@solana/kit-plugin-wallet";

/**
 * The browser-side Kit client.
 *
 * `walletSigner` installs `client.wallet` and syncs the connected account into
 * both `client.payer` and `client.identity`; `solanaRpc` needs a payer, so the
 * wallet plugin has to come first.
 *
 * The RPC URL is read from the environment, never hardcoded — the public
 * endpoint rate-limits exactly during a demo (see docs/SOLANA-RULES.md).
 */

import { CHAIN, CLUSTER, DEFAULT_RPC_URL } from "./cluster";

export { CHAIN, CLUSTER };

const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? DEFAULT_RPC_URL;

let client: ReturnType<typeof buildClient> | undefined;

function buildClient() {
  return createClient()
    .use(walletSigner({ chain: CHAIN, autoConnect: true }))
    .use(solanaRpc({ rpcUrl: RPC_URL }));
}

/**
 * A module-level singleton: the wallet plugin holds subscriptions and a
 * persisted connection, so rebuilding it on every render would drop the
 * auto-reconnect. Safe on the server — the plugin is SSR-aware and parks in
 * the `pending` status there.
 */
export function getSolanaClient() {
  if (!client) client = buildClient();
  return client;
}

export type SolanaClient = ReturnType<typeof getSolanaClient>;
