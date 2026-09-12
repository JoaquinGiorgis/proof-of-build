import "server-only";

import { createKeyPairSignerFromBytes, getBase58Encoder } from "@solana/kit";

/**
 * The issuer keypair. Server-only, and never returned in any response.
 *
 * `ISSUER_SECRET_KEY` holds the 64-byte secret key, either as a base58 string
 * (what `solana-keygen` prints) or as the JSON array `solana-keygen` writes to
 * disk. Keys never leave the server; see docs/SOLANA-RULES.md.
 */

let cached: Awaited<ReturnType<typeof createKeyPairSignerFromBytes>> | undefined;

export async function getIssuerSigner() {
  if (cached) return cached;

  const raw = process.env.ISSUER_SECRET_KEY;
  if (!raw) {
    throw new Error(
      "ISSUER_SECRET_KEY is not set. Run `pnpm issuer:keygen` and put it in .env.local.",
    );
  }

  cached = await createKeyPairSignerFromBytes(parseSecretKey(raw));
  return cached;
}

function parseSecretKey(raw: string): Uint8Array {
  const trimmed = raw.trim();

  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed) as number[];
    if (parsed.length !== 64) {
      throw new Error("ISSUER_SECRET_KEY must be a 64-byte secret key.");
    }
    return Uint8Array.from(parsed);
  }

  const bytes = new Uint8Array(getBase58Encoder().encode(trimmed));
  if (bytes.length !== 64) {
    throw new Error("ISSUER_SECRET_KEY must be a 64-byte secret key.");
  }
  return bytes;
}
