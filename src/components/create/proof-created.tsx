"use client";

import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import type { BuildDraft } from "@/lib/build-draft";
import { explorerUrl, shortAddress, type EventRecord } from "@/lib/domain";
import { CLUSTER } from "@/lib/solana/cluster";
import type { MintResult } from "./use-mint";

/** Figma: 08 Mint · Proof created 12:69. */

export function ProofCreated({
  result,
  draft,
  event,
  track,
}: {
  result: MintResult;
  draft: BuildDraft;
  event: EventRecord;
  track: string;
}) {
  const rows = [
    { label: "Transaction", value: shortAddress(result.signature, 4, 4) },
    { label: "Mint", value: shortAddress(result.mint, 4, 4) },
    { label: "Timestamp", value: formatTimestamp(result.issuedAt) },
    {
      label: "Asset",
      value: `POB · ${event.name} ${event.year} — ${draft.name}`,
    },
  ];

  return (
    <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-16 px-5 pt-[150px] pb-24 md:px-20 lg:grid-cols-[minmax(0,560px)_minmax(0,600px)]">
      <div className="animate-rise flex flex-col items-start gap-6">
        <Badge>Verified onchain</Badge>

        <h1 className="type-h1 text-text-primary">Proof created.</h1>
        <p className="type-body-m text-text-secondary">
          Your build now has a permanent onchain record.
        </p>

        <dl className="mt-4 w-full">
          {rows.map((row) => (
            <div
              key={row.label}
              className="rule flex items-baseline justify-between gap-6 py-3.5"
            >
              <dt className="type-meta text-text-tertiary">{row.label}</dt>
              <dd className="type-meta text-text-secondary text-right break-all">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <ButtonLink href={`/b/${result.buildSlug}`}>View proof</ButtonLink>
          <a
            href={explorerUrl("tx", result.signature, CLUSTER)}
            target="_blank"
            rel="noreferrer noopener"
            className="focus-ring inline-flex items-center rounded-full border border-[rgb(255_255_255/0.08)] bg-[rgb(255_255_255/0.04)] px-[22px] py-[14px] text-[15px] leading-none font-medium tracking-[-0.033em] text-white shadow-[inset_0_1px_0_0_rgb(255_255_255/0.1)] backdrop-blur-[12px] transition-colors hover:border-[rgb(255_255_255/0.12)] hover:bg-[rgb(255_255_255/0.06)]"
          >
            View transaction
          </a>
        </div>

        <p className="type-meta text-[rgb(255_255_255/0.3)]">
          {track} track · {event.name} {event.year}
        </p>
      </div>

      {event.artwork && (
        <div className="relative mx-auto hidden aspect-[600/760] w-full max-w-[600px] lg:block">
          <div
            aria-hidden
            className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgb(255_210_140/0.12)_0%,transparent_62%)] blur-2xl"
          />
          <div className="animate-float absolute inset-0">
            <Image
              src={event.artwork}
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 600px, 0px"
              className="object-contain drop-shadow-[0_40px_60px_rgb(0_0_0/0.6)]"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Cordoba",
  }).format(date);
  return `${formatted} ART`.toUpperCase();
}
