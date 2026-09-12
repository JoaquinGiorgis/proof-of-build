import "server-only";

import { createClient } from "@solana/kit";
import { rpcGetMinimumBalance, solanaRpcConnection } from "@solana/kit-plugin-rpc";

/**
 * The server-side Kit client. RPC only — the server never holds a payer,
 * because the builder pays their own fee and rent.
 *
 * The URL comes from the environment (Triton in production). The public
 * endpoint rate-limits exactly when it matters; see docs/SOLANA-RULES.md.
 */

export const RPC_URL =
  process.env.SOLANA_RPC_URL ??
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  "https://api.devnet.solana.com";

let client: ReturnType<typeof build> | undefined;

function build() {
  return createClient()
    .use(solanaRpcConnection({ rpcUrl: RPC_URL }))
    .use(rpcGetMinimumBalance());
}

export function getServerClient() {
  if (!client) client = build();
  return client;
}
