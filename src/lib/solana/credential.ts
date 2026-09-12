import "server-only";

import {
  address,
  appendTransactionMessageInstruction,
  appendTransactionMessageInstructionPlan,
  createNoopSigner,
  createTransactionMessage,
  generateKeyPairSigner,
  getBase64EncodedWireTransaction,
  partiallySignTransactionMessageWithSigners,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
} from "@solana/kit";
import {
  AuthorityType,
  extension,
  getMintSize,
  getCreateMintInstructionPlan,
  getMintToATAInstructionPlanAsync,
  getSetAuthorityInstruction,
} from "@solana-program/token-2022";
import type { BuildDraft } from "@/lib/build-draft";
import type { EventRecord } from "@/lib/domain";
import { getIssuerSigner } from "./issuer";
import { getServerClient } from "./server-client";

/**
 * Builds the credential transaction.
 *
 * The credential is a Token-2022 mint with three things set at creation:
 *   · NonTransferable  — it cannot be sold or moved. A record of what you
 *                        built is not a tradable asset.
 *   · MetadataPointer  — pointed at the mint itself.
 *   · TokenMetadata    — name, symbol, uri and the build's facts, onchain.
 * Supply is one, decimals zero, and the mint authority is revoked in the same
 * transaction, so no second copy can ever exist.
 *
 * The builder is the fee payer and pays the rent (~0.002 SOL). The issuer is
 * the mint and update authority and signs here, on the server. The builder's
 * signature is added by their wallet in the browser — we never see their key.
 *
 * Only the build's public facts go onchain: no emails, no names beyond what
 * the team chose to publish. See "Product" in docs/SOLANA-RULES.md.
 */

export type PreparedCredential = {
  /** Base64 wire transaction, partially signed by the issuer and the mint. */
  transaction: string;
  mint: Address;
  issuer: Address;
};

/**
 * The TokenMetadata extension for a build.
 *
 * Shared with the cost estimate on purpose: the metadata is stored *inside*
 * the mint account, so its length is what the rent is charged on. Estimating
 * the cost from anything other than the exact bytes we are about to write
 * gives a number that is wrong in the direction that hurts — the builder gets
 * waved through and the wallet rejects them.
 */
function buildMetadata({
  draft,
  event,
  siteUrl,
  buildSlug,
  updateAuthority,
  mint,
}: {
  draft: BuildDraft;
  event: EventRecord;
  siteUrl: string;
  buildSlug: string;
  updateAuthority: Address;
  mint: Address;
}) {
  const track =
    event.tracks.find((item) => item.slug === draft.trackSlug)?.name ??
    draft.trackSlug;

  return extension("TokenMetadata", {
    updateAuthority,
    mint,
    name: truncate(draft.name, 32),
    symbol: "POB",
    uri: `${siteUrl}/api/proofs/${buildSlug}/metadata`,
    additionalMetadata: new Map<string, string>([
      ["event", `${event.name} ${event.year}`],
      ["issuer", event.issuer],
      ["track", track],
      ["team", draft.team.join(" · ")],
      ["tagline", truncate(draft.tagline, 140)],
      ...(draft.githubUrl ? ([["github", draft.githubUrl]] as const) : []),
      ...(draft.demoUrl ? ([["demo", draft.demoUrl]] as const) : []),
      ["proof", `${siteUrl}/b/${buildSlug}`],
    ]),
  });
}

export async function prepareCredential({
  draft,
  event,
  payer,
  siteUrl,
  buildSlug,
}: {
  draft: BuildDraft;
  event: EventRecord;
  payer: string;
  siteUrl: string;
  buildSlug: string;
}): Promise<PreparedCredential> {
  const client = getServerClient();
  const issuer = await getIssuerSigner();

  const feePayer = createNoopSigner(address(payer));
  const mint = await generateKeyPairSigner();

  const metadata = buildMetadata({
    draft,
    event,
    siteUrl,
    buildSlug,
    updateAuthority: issuer.address,
    mint: mint.address,
  });

  const createMintPlan = await getCreateMintInstructionPlan(client, {
    payer: feePayer,
    newMint: mint,
    decimals: 0,
    mintAuthority: issuer,
    extensions: [
      extension("MetadataPointer", {
        authority: issuer.address,
        metadataAddress: mint.address,
      }),
      extension("NonTransferable", {}),
      metadata,
    ],
  });

  const mintToPlan = await getMintToATAInstructionPlanAsync({
    payer: feePayer,
    owner: feePayer.address,
    mint: mint.address,
    mintAuthority: issuer,
    amount: 1,
    decimals: 0,
  });

  // Revoke the mint authority in the same transaction: supply is one, for good.
  const revokeMintAuthority = getSetAuthorityInstruction({
    owned: mint.address,
    owner: issuer,
    authorityType: AuthorityType.MintTokens,
    newAuthority: null,
  });

  const { value: latestBlockhash } = await client.rpc
    .getLatestBlockhash({ commitment: "confirmed" })
    .send();

  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstructionPlan(createMintPlan, tx),
    (tx) => appendTransactionMessageInstructionPlan(mintToPlan, tx),
    (tx) => appendTransactionMessageInstruction(revokeMintAuthority, tx),
  );

  // The issuer and the mint sign here — they are attached to the instructions
  // as signers. The fee payer is a noop signer, so its slot stays empty for
  // the builder's wallet to fill.
  const transaction = await partiallySignTransactionMessageWithSigners(message);

  return {
    transaction: getBase64EncodedWireTransaction(transaction),
    mint: mint.address,
    issuer: issuer.address,
  };
}

/**
 * Confirms a signature actually landed and did what we asked, before anything
 * is recorded as minted.
 *
 * A signature on its own is not a proof: the RPC may have dropped it, it may
 * have failed onchain, or it may be some other confirmed transaction entirely.
 * So we check three things — it exists, it succeeded, and the mint we issued
 * is one of its accounts. Without the last check, any confirmed signature on
 * devnet would pass.
 */
export async function confirmCredential(signature: string, mint: string) {
  const client = getServerClient();

  // A signature the wallet just broadcast is not visible to the RPC the
  // instant it comes back, so asking once and calling it missing turns the
  // happy path into "Transaction not found." Poll for a little while, and only
  // then decide. A real failure — `err` set — is final and returns straight
  // away; there is nothing to wait for.
  const deadline = Date.now() + 25_000;
  let status: Awaited<
    ReturnType<ReturnType<typeof client.rpc.getSignatureStatuses>["send"]>
  >["value"][number] = null;

  for (let attempt = 0; ; attempt++) {
    ({
      value: [status],
    } = await client.rpc
      .getSignatureStatuses([signature as never], {
        searchTransactionHistory: true,
      })
      .send());

    if (status?.err) {
      return { confirmed: false as const, reason: "failed onchain" };
    }
    if (
      status?.confirmationStatus === "confirmed" ||
      status?.confirmationStatus === "finalized"
    ) {
      break;
    }
    if (Date.now() >= deadline) break;
    await sleep(Math.min(500 * 2 ** attempt, 2_000));
  }

  if (!status) return { confirmed: false as const, reason: "not found" };
  if (
    status.confirmationStatus !== "confirmed" &&
    status.confirmationStatus !== "finalized"
  ) {
    return { confirmed: false as const, reason: "not confirmed yet" };
  }

  const transaction = await client.rpc
    .getTransaction(signature as never, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
      encoding: "jsonParsed",
    })
    .send();

  if (!transaction) {
    return { confirmed: false as const, reason: "not readable yet" };
  }

  const accounts = transaction.transaction.message.accountKeys.map((key) =>
    String(key.pubkey),
  );
  if (!accounts.includes(mint)) {
    return { confirmed: false as const, reason: "not this credential" };
  }

  return { confirmed: true as const, slot: status.slot };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * What this particular claim costs, asked of the cluster rather than assumed.
 *
 * Almost all of it is rent for the mint account, and the mint carries the
 * metadata inline — so a longer tagline or a longer repo URL genuinely costs
 * more. A fixed constant was wrong for every build that was not the one it was
 * measured on, and wrong low is the bad direction: the builder is told they
 * can pay, and then the wallet refuses.
 *
 * Phantom's summary line shows only the signature fee — 0.00002 SOL — which is
 * the smallest part of this and the reason the number there looks nothing like
 * the number we quote.
 */
export async function estimateClaimCost({
  draft,
  event,
  siteUrl,
  buildSlug,
}: {
  draft: BuildDraft;
  event: EventRecord;
  siteUrl: string;
  buildSlug: string;
}): Promise<bigint> {
  const client = getServerClient();
  const issuer = await getIssuerSigner();

  // A placeholder mint of the right shape: only the byte count matters here.
  const metadata = buildMetadata({
    draft,
    event,
    siteUrl,
    buildSlug,
    updateAuthority: issuer.address,
    mint: issuer.address,
  });

  const mintSize = getMintSize([
    extension("MetadataPointer", {
      authority: issuer.address,
      metadataAddress: issuer.address,
    }),
    extension("NonTransferable", {}),
    metadata,
  ]);

  const [mintRent, tokenRent] = await Promise.all([
    client.getMinimumBalance(mintSize),
    client.getMinimumBalance(TOKEN_ACCOUNT_SIZE),
  ]);

  return BigInt(mintRent) + BigInt(tokenRent) + FEE_MARGIN_LAMPORTS;
}

/**
 * Token-2022 account with ImmutableOwner and NonTransferableAccount: the 165
 * byte base, one byte of account type, and a four byte header per extension.
 * Measured against a real claim — 174 bytes is 0.001534 SOL of rent, and the
 * 170 this used to say was 20_000 lamports short.
 */
const TOKEN_ACCOUNT_SIZE = 174;

/**
 * Signature fees plus a little slack. Five thousand lamports per signature and
 * there are three, but the margin also absorbs the handful of bytes the build
 * slug can differ by between this estimate and the write.
 */
const FEE_MARGIN_LAMPORTS = BigInt(200_000); // 0.0002 SOL

/**
 * Checks the builder can actually pay before the wallet ever opens.
 *
 * Without this the first thing they see is Phantom refusing to simulate, which
 * says "insufficient SOL" without saying on which network — and on devnet the
 * balance that matters is not the mainnet one they are looking at.
 */
export async function checkPayerFunds(payer: string, needed: bigint) {
  const client = getServerClient();
  const { value: lamports } = await client.rpc
    .getBalance(address(payer), { commitment: "confirmed" })
    .send();

  if (lamports >= needed) return { ok: true as const, lamports, needed };
  return { ok: false as const, lamports, needed };
}

/** Token-2022 metadata caps `name` at 32 bytes; the rest we keep sane by hand. */
function truncate(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}
