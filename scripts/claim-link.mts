/**
 * Mints a signed claim link from the command line.
 *
 *   pnpm claim:link '<json payload>'
 *
 * This is the same thing an event's system does — useful for testing the
 * claim screen, and for handing a link to a team whose submission never made
 * it through the normal path.
 */

import { readFileSync } from "node:fs";
import { createClaimToken, claimPayloadSchema } from "../src/lib/claim-link";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const raw = process.argv[2];
if (!raw) {
  console.error("usage: pnpm claim:link '<json payload>'");
  process.exit(1);
}

const payload = claimPayloadSchema.parse({
  exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  ...JSON.parse(raw),
});

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
console.log(`${base}/claim?t=${createClaimToken(payload)}`);
