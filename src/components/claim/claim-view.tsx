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
import { CLAIM_COST_SOL, CLUSTER, CLUSTER_LABEL } from "@/lib/solana/cluster";

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
      {/* Sized to land inside one screen. This is a page with exactly one
          thing to do on it, and a Claim button below the fold is a Claim
          button people do not press. */}
      <div className="mx-auto grid w-full max-w-[1320px] grid-cols-1 items-center gap-10 px-5 pt-20 pb-6 [@media(max-height:820px)]:pt-16 md:px-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-14 xl:px-20">
        <div className="animate-rise flex flex-col items-start gap-4 [@media(max-height:820px)]:gap-3">
          {done ? (
            <Badge>
              {done.alreadyClaimed ? "Already onchain" : "Verified onchain"}
            </Badge>
          ) : (
            <Badge dot={false}>
              {event.name} {event.year} · {event.issuer}
            </Badge>
          )}

          <h1 className="type-h2 text-text-primary">
            {done ? "Proof created." : payload.n}
          </h1>
          <p className="type-body-m text-text-secondary max-w-[520px]">
            {done
              ? done.alreadyClaimed
                ? "You already had this one. Here it is."
                : "Your build now has a permanent onchain record."
              : payload.d}
          </p>

          {/* Two to a row: the same facts in half the height. */}
          <dl className="mt-1 grid w-full grid-cols-2 gap-x-6 sm:gap-x-10">
            <Row label="Builder">{payload.builder}</Row>
            <Row label="Team">{payload.team_names.join(" · ")}</Row>
            <Row label="Track">{track}</Row>
            <Row label="Event">
              {event.name} {event.year}
            </Row>
            {payload.gh && (
              <Row label="GitHub" muted className="col-span-2 sm:col-span-1">
                {payload.gh}
              </Row>
            )}
            {payload.live && (
              <Row label="Demo" muted className="col-span-2 sm:col-span-1">
                {payload.live}
              </Row>
            )}
            <Row label="Wallet" mono className="col-span-2">
              {address ?? "Not connected"}
            </Row>
          </dl>

          {done ? (
            <div className="mt-4 flex flex-wrap items-center gap-4">
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
            <div className="mt-4 flex flex-col gap-3">
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
                  {`One signature · Solana ${CLUSTER_LABEL} · ~${CLAIM_COST_SOL} SOL`}
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

        {/* Capped by the height that is left rather than by width — the card
            is what decides whether this page needs a scrollbar. */}
        <CredentialCard
          className="order-first mx-auto h-[min(calc(100svh-11.5rem),560px)] max-h-[46svh] min-h-[430px] w-auto max-w-full lg:order-none lg:max-h-none lg:min-h-0"
          issuer={event.name}
          year={event.year}
          builderName={payload.builder}
          artwork={event.artwork}
          tags={[payload.n, `${track} track`, "Shipped"]}
        />
      </div>

      <SiteFooter className="!pt-4 !pb-5" />
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
    <div className={`rule flex w-full flex-col gap-1 py-2.5 [@media(max-height:820px)]:py-1.5 ${className ?? ""}`}>
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
