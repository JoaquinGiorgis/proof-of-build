"use client";

import { CredentialCard } from "@/components/credential-card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/wallet/wallet-provider";
import { formatTeam, type BuildDraft } from "@/lib/build-draft";
import { shortAddress, type EventRecord } from "@/lib/domain";
import { useMint } from "./use-mint";
import { MintProgress } from "./mint-progress";
import { ProofCreated } from "./proof-created";

/** Figma: 06 Proof preview 11:21. */

export function ProofPreview({
  draft,
  event,
  claimCode,
  onBack,
}: {
  draft: BuildDraft;
  event: EventRecord;
  claimCode: string;
  onBack: () => void;
}) {
  const { address, openModal } = useWallet();
  const mint = useMint();

  const track =
    event.tracks.find((item) => item.slug === draft.trackSlug)?.name ?? "—";

  if (mint.result) {
    return (
      <ProofCreated
        result={mint.result}
        draft={draft}
        event={event}
        track={track}
      />
    );
  }

  if (mint.stage !== "idle") {
    return <MintProgress stage={mint.stage} onCancel={mint.cancel} />;
  }

  return (
    <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-start gap-16 px-5 pt-[150px] pb-24 md:px-20 lg:grid-cols-[minmax(0,560px)_minmax(0,520px)] lg:pt-[150px]">
      <div className="animate-rise flex flex-col">
        <div className="flex flex-col gap-3.5 pb-7">
          <span className="type-meta-l text-text-tertiary">05 — Proof</span>
          <h1 className="type-h1 text-text-primary">{draft.name}</h1>
          <p className="type-body-l text-text-secondary max-w-[520px]">
            {draft.tagline}
          </p>
        </div>

        <Row label="Team">{formatTeam(draft.team)}</Row>

        <div className="flex w-full gap-10">
          <Row label="Track" className="flex-1">
            {track}
          </Row>
          <Row label="Event" className="flex-1">
            {event.name} {event.year}
          </Row>
        </div>

        {draft.githubUrl && (
          <Row label="GitHub" muted>
            {draft.githubUrl}
          </Row>
        )}
        {draft.demoUrl && (
          <Row label="Demo" muted>
            {draft.demoUrl}
          </Row>
        )}

        <div className="rule flex w-full flex-col gap-1.5 py-4">
          <span className="type-meta text-text-tertiary">Wallet</span>
          <span className="type-meta-l text-text-secondary break-all">
            {address ?? "Not connected"}
          </span>
        </div>

        <div className="mt-10 flex flex-col gap-3.5">
          <h2 className="type-h3 text-text-primary">Ready to go onchain.</h2>
          <div className="flex flex-wrap items-center gap-5">
            <Button
              className="px-8 py-[18px] text-[17px]"
              onClick={() =>
                address ? mint.start({ draft, claimCode }) : openModal()
              }
            >
              {address ? "Claim Proof" : "Connect wallet"}
            </Button>
            <span className="type-meta text-text-tertiary">
              One signature · Solana devnet · ~0.002 SOL
            </span>
          </div>
          {mint.error && (
            <p className="type-meta text-text-secondary" role="alert">
              {mint.error}
            </p>
          )}
          <Button variant="ghost" onClick={onBack} className="self-start">
            Back
          </Button>
        </div>
      </div>

      <CredentialCard
        className="mx-auto"
        issuer={event.name}
        year={event.year}
        builderName={address ? shortAddress(address, 6, 6) : "Your wallet"}
        artwork={event.artwork}
        tags={[draft.name, `${track} track`, "Shipped"]}
      />
    </div>
  );
}

function Row({
  label,
  children,
  muted = false,
  className,
}: {
  label: string;
  children: React.ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <div className={`rule flex w-full flex-col gap-1.5 py-4 ${className ?? ""}`}>
      <span className="type-meta text-text-tertiary">{label}</span>
      <span
        className={`type-body-m break-words ${muted ? "text-text-secondary" : "text-text-primary"}`}
      >
        {children}
      </span>
    </div>
  );
}
