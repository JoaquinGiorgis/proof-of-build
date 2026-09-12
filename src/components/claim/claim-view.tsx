"use client";

import { CredentialCard } from "@/components/credential-card";
import { MintProgress } from "@/components/create/mint-progress";
import { useMint } from "@/components/create/use-mint";
import { SiteFooter } from "@/components/site-footer";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { useWallet } from "@/components/wallet/wallet-provider";
import type { ClaimPayload } from "@/lib/claim-link";
import { explorerUrl, type EventRecord } from "@/lib/domain";
import { CLUSTER } from "@/lib/solana/cluster";

/**
 * What a builder sees when they open the link their event sent them: the
 * credential itself, the project it is for, and one button.
 *
 * Everything on screen came out of a signed payload the server already
 * verified, so there is nothing to fill in and nothing to get wrong.
 */
export function ClaimView({
  payload,
  event,
  track,
  token,
}: {
  payload: ClaimPayload;
  event: EventRecord;
  track: string;
  token: string;
}) {
  const { address, isReady, openModal } = useWallet();
  const mint = useMint();

  if (mint.stage !== "idle" && mint.stage !== "done") {
    return <MintProgress stage={mint.stage} onCancel={mint.cancel} />;
  }

  const done = mint.result;

  return (
    <div className="relative">
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-start gap-16 px-5 pt-[150px] pb-16 md:px-20 lg:grid-cols-[minmax(0,560px)_minmax(0,520px)]">
        <div className="animate-rise flex flex-col items-start gap-6">
          {done ? (
            <Badge>
              {done.alreadyClaimed ? "Already onchain" : "Verified onchain"}
            </Badge>
          ) : (
            <Badge dot={false}>
              {event.name} {event.year} · {event.issuer}
            </Badge>
          )}

          <h1 className="type-h1 text-text-primary">
            {done ? "Proof created." : payload.n}
          </h1>
          <p className="type-body-l text-text-secondary max-w-[520px]">
            {done
              ? done.alreadyClaimed
                ? "You already had this one. Here it is."
                : "Your build now has a permanent onchain record."
              : payload.d}
          </p>

          <dl className="mt-2 w-full">
            <Row label="Builder">{payload.builder}</Row>
            <Row label="Team">{payload.team_names.join(" · ")}</Row>
            <div className="flex w-full gap-10">
              <Row label="Track" className="flex-1">
                {track}
              </Row>
              <Row label="Event" className="flex-1">
                {event.name} {event.year}
              </Row>
            </div>
            {payload.gh && (
              <Row label="GitHub" muted>
                {payload.gh}
              </Row>
            )}
            {payload.live && (
              <Row label="Demo" muted>
                {payload.live}
              </Row>
            )}
            <Row label="Wallet" mono>
              {address ?? "Not connected"}
            </Row>
          </dl>

          {done ? (
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <ButtonLink href={`/b/${done.buildSlug}`}>View proof</ButtonLink>
              <a
                href={explorerUrl("tx", done.signature, CLUSTER)}
                target="_blank"
                rel="noreferrer noopener"
                className="focus-ring inline-flex items-center rounded-full border border-[rgb(255_255_255/0.08)] bg-[rgb(255_255_255/0.04)] px-[22px] py-[14px] text-[15px] leading-none font-medium tracking-[-0.033em] text-white shadow-[inset_0_1px_0_0_rgb(255_255_255/0.1)] backdrop-blur-[12px] transition-colors hover:border-[rgb(255_255_255/0.12)]"
              >
                View transaction
              </a>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-3.5">
              <div className="flex flex-wrap items-center gap-5">
                <Button
                  className="px-8 py-[18px] text-[17px]"
                  disabled={!isReady}
                  onClick={() =>
                    address
                      ? mint.start({ kind: "link", token })
                      : openModal()
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
              <p className="type-meta text-[rgb(255_255_255/0.3)]">
                Every builder on this team claims their own.
              </p>
            </div>
          )}
        </div>

        <CredentialCard
          className="mx-auto"
          issuer={event.name}
          year={event.year}
          builderName={payload.builder}
          artwork={event.artwork}
          tags={[payload.n, `${track} track`, "Shipped"]}
        />
      </div>

      <SiteFooter className="mt-16" />
    </div>
  );
}

function Row({
  label,
  children,
  muted = false,
  mono = false,
  className,
}: {
  label: string;
  children: React.ReactNode;
  muted?: boolean;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={`rule flex w-full flex-col gap-1.5 py-4 ${className ?? ""}`}>
      <dt className="type-meta text-text-tertiary">{label}</dt>
      <dd
        className={
          mono
            ? "type-meta-l text-text-secondary break-all"
            : `type-body-m break-words ${muted ? "text-text-secondary" : "text-text-primary"}`
        }
      >
        {children}
      </dd>
    </div>
  );
}
