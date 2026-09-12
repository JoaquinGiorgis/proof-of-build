"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/wallet/wallet-provider";

/**
 * The hero CTA. One button with two jobs: open the connect modal when there is
 * no wallet, go straight to the create flow once there is one.
 */
export function ConnectCta({
  connectedLabel = "Register a build",
  connectedHref = "/create",
}: {
  connectedLabel?: string;
  connectedHref?: string;
}) {
  const { address, isReady, openModal } = useWallet();
  const router = useRouter();

  if (!isReady) {
    return <span className="h-[43px] w-[149px] rounded-full bg-[rgb(255_255_255/0.06)]" />;
  }

  return (
    <Button
      onClick={() => (address ? router.push(connectedHref) : openModal())}
    >
      {address ? connectedLabel : "Connect wallet"}
    </Button>
  );
}
