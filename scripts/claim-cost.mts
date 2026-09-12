/**
 * What a claim actually costs, measured instead of estimated.
 *
 *   pnpm claim:cost <payer-address> [claim-token]
 *
 * Asks production to prepare a real transaction, simulates it against the
 * cluster, and reports how many lamports leave the payer. The fee Phantom
 * shows on its summary line is only the signature fee — the rent for the mint
 * and the token account is the part that actually costs money, and it does not
 * appear there.
 */

import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const site = process.argv[4] ?? "https://proof-of-build-ten.vercel.app";
const rpc = process.argv[5] ?? "https://api.mainnet-beta.solana.com";
const payer = process.argv[2];
const token = process.argv[3];
if (!payer) throw new Error("usage: pnpm claim:cost <payer> <claim-token>");

const prepared = await fetch(`${site}/api/proofs/prepare`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ payer, token }),
}).then((r) => r.json());

if (prepared.error) throw new Error(`prepare: ${prepared.error}`);

const rpcCall = async (method: string, params: unknown[]) => {
  const res = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  }).then((r) => r.json());
  if (res.error) throw new Error(`${method}: ${JSON.stringify(res.error)}`);
  return res.result;
};

const before = await rpcCall("getBalance", [payer, { commitment: "confirmed" }]);

const sim = await rpcCall("simulateTransaction", [
  prepared.transaction,
  {
    encoding: "base64",
    sigVerify: false,
    replaceRecentBlockhash: true,
    commitment: "confirmed",
    accounts: { encoding: "base64", addresses: [payer] },
  },
]);

if (sim.value.err) {
  console.log("simulación falló:", JSON.stringify(sim.value.err));
  console.log((sim.value.logs ?? []).slice(-6).join("\n"));
  process.exit(1);
}

const after = sim.value.accounts?.[0]?.lamports ?? null;
const sol = (n: number) => (n / 1e9).toFixed(6);

console.log(`  saldo antes:   ${sol(before.value)} SOL`);
if (after !== null) {
  console.log(`  saldo después: ${sol(after)} SOL`);
  console.log(`  COSTO REAL:    ${sol(before.value - after)} SOL`);
}
console.log(`  unidades de cómputo: ${sim.value.unitsConsumed}`);
