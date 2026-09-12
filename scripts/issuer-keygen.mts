/**
 * Generates the issuer keypair and prints the line to paste into `.env.local`.
 * Run it once per environment:
 *
 *   pnpm issuer:keygen
 *
 * The secret is printed to stdout and never written to disk by this script —
 * paste it into `.env.local` (gitignored) and, for production, into the
 * project's environment variables. Do not commit it, do not paste it in chat.
 */

import { getBase58Decoder } from "@solana/kit";

// A 32-byte seed is the private key; the address is derived from it.
const seed = crypto.getRandomValues(new Uint8Array(32));

const privateKey = await crypto.subtle.importKey(
  "pkcs8",
  toPkcs8(seed),
  "Ed25519",
  false,
  ["sign"],
);
// Round-tripping through a signature is not needed — derive the public key by
// importing the seed as a JWK and exporting the matching public half.
const jwk = await crypto.subtle.exportKey("jwk", await importExtractable(seed));
const publicKey = base64UrlToBytes(jwk.x!);

const secretKey = new Uint8Array(64);
secretKey.set(seed, 0);
secretKey.set(publicKey, 32);

const base58 = getBase58Decoder();

console.log(`# Issuer address: ${base58.decode(publicKey)}`);
console.log(`ISSUER_SECRET_KEY=${base58.decode(secretKey)}`);
console.log();
console.log("Fund it on devnet before issuing anything:");
console.log(`  solana airdrop 1 ${base58.decode(publicKey)} --url devnet`);

// Keep the non-extractable handle referenced so the import above is not
// optimised away by a future refactor — it is the check that the seed is valid.
void privateKey;

/** Wraps a raw Ed25519 seed in the fixed 16-byte pkcs8 envelope. */
function toPkcs8(rawSeed: Uint8Array) {
  const header = new Uint8Array([
    0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70,
    0x04, 0x22, 0x04, 0x20,
  ]);
  const pkcs8 = new Uint8Array(header.length + rawSeed.length);
  pkcs8.set(header, 0);
  pkcs8.set(rawSeed, header.length);
  return pkcs8;
}

function importExtractable(rawSeed: Uint8Array) {
  return crypto.subtle.importKey("pkcs8", toPkcs8(rawSeed), "Ed25519", true, [
    "sign",
  ]);
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(Buffer.from(padded, "base64"));
}
