"use client";

import { useCallback, useRef, useState } from "react";
import {
  getBase58Decoder,
  getBase64Encoder,
  getTransactionDecoder,
  signAndSendTransactionWithSigners,
} from "@solana/kit";
import type { BuildDraft } from "@/lib/build-draft";
import { getSolanaClient } from "@/lib/solana/client";

/**
 * The five states the mint screen walks through. `done` is not in the rail —
 * it swaps the whole screen for the success state.
 */
export const MINT_STAGES = [
  "preparing",
  "opening",
  "awaiting",
  "sending",
  "confirming",
] as const;

export type MintStage = (typeof MINT_STAGES)[number] | "idle" | "done";

export type MintResult = {
  signature: string;
  mint: string;
  buildSlug: string;
  issuedAt: string;
  /** True when the builder already held this credential. Nothing was minted. */
  alreadyClaimed?: boolean;
};

/**
 * How this claim is authorised: a code the builder typed, or a link the event
 * signed. The server accepts either and the Solana path is the same.
 */
export type MintAuth =
  | { kind: "code"; draft: BuildDraft; claimCode: string }
  | { kind: "link"; token: string };

export function useMint() {
  const [stage, setStage] = useState<MintStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MintResult | null>(null);
  const cancelled = useRef(false);

  const cancel = useCallback(() => {
    cancelled.current = true;
    setStage("idle");
    setError(null);
  }, []);

  const start = useCallback(async (auth: MintAuth) => {
    cancelled.current = false;
    setError(null);
    setResult(null);
    setStage("preparing");

    try {
      const client = getSolanaClient();
      const connected = client.wallet.getState().connected;
      if (!connected?.signer) {
        throw new Error("Connect a wallet that can sign transactions.");
      }
      const payer = connected.account.address;

      // 1. The server authorises the claim, records the build, and signs as
      //    the issuer and as the new mint. The browser sees neither key.
      const prepared = await postJson<{
        transaction?: string;
        mint: string;
        buildSlug: string;
        builderName?: string;
        alreadyClaimed?: boolean;
        signature?: string;
      }>(
        "/api/proofs/prepare",
        auth.kind === "link"
          ? { token: auth.token, payer }
          : { draft: auth.draft, claimCode: auth.claimCode, payer },
      );
      if (cancelled.current) return;

      // This builder already holds a credential for this build. Show it
      // instead of minting a second one.
      if (prepared.alreadyClaimed && prepared.signature) {
        setStage("done");
        setResult({
          signature: prepared.signature,
          mint: prepared.mint,
          buildSlug: prepared.buildSlug,
          issuedAt: new Date().toISOString(),
          alreadyClaimed: true,
        });
        return;
      }
      if (!prepared.transaction) throw new Error("No transaction to sign.");

      setStage("opening");

      const transaction = getTransactionDecoder().decode(
        getBase64Encoder().encode(prepared.transaction),
      );

      setStage("awaiting");

      // 2. The wallet adds the fee-payer signature and broadcasts it. The
      //    user's key never leaves the wallet.
      const signatureBytes = await signAndSendTransactionWithSigners(
        [connected.signer],
        transaction,
      );
      if (cancelled.current) return;
      const signature = getBase58Decoder().decode(signatureBytes);

      setStage("sending");
      setStage("confirming");

      // 3. The server confirms against the cluster before recording anything.
      //    A signature on its own is not a proof.
      const confirmed = await postJson<{ issuedAt: string }>(
        "/api/proofs/confirm",
        {
          buildSlug: prepared.buildSlug,
          signature,
          mint: prepared.mint,
          payer,
          ...(auth.kind === "link"
            ? { token: auth.token }
            : { builderName: prepared.builderName }),
        },
      );
      if (cancelled.current) return;

      setStage("done");
      setResult({
        signature,
        mint: prepared.mint,
        buildSlug: prepared.buildSlug,
        issuedAt: confirmed.issuedAt,
      });
    } catch (cause) {
      if (cancelled.current) return;
      setStage("idle");
      setError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong. Nothing was sent.",
      );
    }
  }, []);

  return { stage, error, result, start, cancel };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string" ? payload.error : "Request failed.",
    );
  }
  return payload as T;
}
