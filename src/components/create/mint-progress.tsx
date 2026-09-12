"use client";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { MINT_STAGES, type MintStage } from "./use-mint";

/**
 * Figma: 07 Mint · Awaiting signature 12:22.
 * Concentric rings breathing on a 3s cycle around a single point of light.
 */

const COPY: Record<Exclude<MintStage, "idle" | "done">, {
  title: string;
  detail: string;
}> = {
  preparing: {
    title: "Preparing proof…",
    detail: "Building the transaction · Devnet",
  },
  opening: {
    title: "Opening your wallet…",
    detail: "Approve the transaction in your wallet · Devnet",
  },
  awaiting: {
    title: "Awaiting signature…",
    detail: "Approve the transaction in your wallet · Devnet",
  },
  sending: {
    title: "Sending to Solana…",
    detail: "Broadcasting the transaction · Devnet",
  },
  confirming: {
    title: "Confirming…",
    detail: "Waiting for the cluster to confirm · Devnet",
  },
};

export function MintProgress({
  stage,
  onCancel,
}: {
  stage: MintStage;
  onCancel: () => void;
}) {
  const activeIndex = MINT_STAGES.indexOf(stage as (typeof MINT_STAGES)[number]);
  const copy = COPY[stage as keyof typeof COPY] ?? COPY.preparing;

  return (
    <div className="relative mx-auto flex min-h-[80vh] w-full max-w-[1440px] items-center px-5 pt-[150px] pb-24 md:px-20">
      <ol className="absolute left-5 flex flex-col gap-[15px] md:left-20">
        {MINT_STAGES.map((item, index) => (
          <li key={item} className="flex items-center gap-3">
            <span
              aria-hidden
              className={cn(
                "size-[5px] rounded-full transition-colors duration-300",
                index < activeIndex
                  ? "bg-[rgb(255_255_255/0.45)]"
                  : index === activeIndex
                    ? "bg-white shadow-[0_0_8px_0_rgb(255_255_255/0.8)]"
                    : "bg-[rgb(255_255_255/0.18)]",
              )}
            />
            <span
              className={cn(
                "type-meta transition-colors duration-300",
                index < activeIndex
                  ? "text-text-tertiary"
                  : index === activeIndex
                    ? "text-text-primary"
                    : "text-[rgb(255_255_255/0.25)]",
              )}
            >
              {String(index + 1).padStart(2, "0")} {LABELS[item]}
            </span>
          </li>
        ))}
      </ol>

      <div className="mx-auto flex flex-col items-center gap-8">
        <div className="relative flex size-[420px] items-center justify-center">
          {[0, 1, 2, 3].map((ring) => (
            <span
              key={ring}
              aria-hidden
              className="animate-breathe absolute rounded-full border border-[rgb(255_255_255/0.09)]"
              style={{
                width: `${140 + ring * 90}px`,
                height: `${140 + ring * 90}px`,
                animationDelay: `${ring * 0.28}s`,
              }}
            />
          ))}
          <span
            aria-hidden
            className="size-2 rounded-full bg-white shadow-[0_0_24px_6px_rgb(255_255_255/0.35)]"
          />
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="type-h3 text-text-primary" aria-live="polite">
            {copy.title}
          </h1>
          <p className="type-body-s text-text-tertiary">{copy.detail}</p>
        </div>

        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

const LABELS: Record<(typeof MINT_STAGES)[number], string> = {
  preparing: "Preparing proof",
  opening: "Wallet opens",
  awaiting: "Awaiting signature…",
  sending: "Sending to Solana",
  confirming: "Confirming",
};
