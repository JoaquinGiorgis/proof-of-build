"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/wallet/wallet-provider";
import { CLUSTER_LABEL } from "@/lib/solana/cluster";

/** Figma: Event CTA 6:31 — button plus the cluster/connection meta beside it. */
export function ClaimProofCta({ eventSlug }: { eventSlug: string }) {
  const { address, isReady, openModal } = useWallet();
  const router = useRouter();

  return (
    <>
      <Button
        disabled={!isReady}
        onClick={() =>
          address ? router.push(`/create?event=${eventSlug}`) : openModal()
        }
      >
        Claim your Proof
      </Button>
      <span className="type-meta text-text-tertiary">
        {address ? "Wallet connected" : "Connect a wallet"} · {CLUSTER_LABEL}
      </span>
    </>
  );
}
