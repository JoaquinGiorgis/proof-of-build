"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";
import { Ninja } from "./ninja";

/**
 * Figma: Proof · Credential card 11:67.
 *
 * A 520×720 plate: #171717 → #050505 gradient, a gold ambient bloom behind the
 * artwork, an 18°-rotated specular streak, grain, and a warm outer glow
 * (rgba(255,204,115,.1) at 120px). The ninja is the only chromatic element.
 *
 * Motion spec: 2–3° tilt parallax that follows the pointer.
 */

export type CredentialCardProps = {
  issuer: string;
  year: number | string;
  builderName: string;
  artwork: string | null;
  tags: string[];
  className?: string;
  /** Turn the tilt off where the card is a small thumbnail in a grid. */
  interactive?: boolean;
};

const MAX_TILT = 3;

export function CredentialCard({
  issuer,
  year,
  builderName,
  artwork,
  tags,
  className,
  interactive = true,
}: CredentialCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    node.style.transform = `perspective(1200px) rotateY(${x * MAX_TILT * 2}deg) rotateX(${-y * MAX_TILT * 2}deg)`;
  };

  const reset = () => {
    const node = ref.current;
    if (node) node.style.transform = "";
  };

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      className={cn(
        "@container relative flex aspect-[520/720] w-full max-w-[520px] flex-col overflow-hidden rounded-[32px]",
        "border border-[rgb(255_255_255/0.12)]",
        "bg-gradient-to-b from-[#171717] to-[#050505]",
        "shadow-[0_0_120px_0_rgb(255_204_115/0.1),0_40px_80px_-20px_rgb(0_0_0/0.7)]",
        "transition-transform duration-300 ease-[var(--ease-out-soft)] will-change-transform",
        className,
      )}
    >
      {/* Gold ambient — the single warm note in a monochrome product. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[12%] left-[10%] size-[80%] rounded-full bg-[radial-gradient(circle,rgb(255_204_115/0.16)_0%,transparent_62%)] blur-2xl"
      />
      {/* Specular streak, 18° across the plate. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-28%] top-[8%] h-[120px] rotate-[18deg] bg-gradient-to-b from-transparent via-[rgb(255_255_255/0.07)] to-transparent blur-[12px]"
      />
      <div aria-hidden className="glass-grain pointer-events-none absolute inset-0" />

      {/* Header, artwork and details are a flow column, not three blocks
          pinned at fixed percentages. Pinned, the artwork keeps its 56% while
          the details grow upward, and on a short or narrow card the ninja ends
          up sitting on top of the builder's name. */}
      <header className="type-meta-l relative flex shrink-0 items-start justify-between px-[6%] pt-[3.75%] text-text-secondary">
        <span>{issuer}</span>
        <span>{year}</span>
      </header>

      {artwork && (
        <div className="relative mx-auto mt-[2%] min-h-0 w-[62%] flex-1">
          <div
            aria-hidden
            className="absolute bottom-[-6%] left-1/2 h-[47px] w-[260px] max-w-[80%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse,rgb(0_0_0/0.7)_0%,transparent_70%)] blur-md"
          />
          {/* The same ninja as the event page — one still with the glint
              travelling over it. The card already tilts under the pointer; a
              second, independent motion on the figure inside it was two
              effects competing for the same glance. */}
          <Ninja
            src={artwork}
            priority={interactive}
            sizes="(min-width: 1024px) 330px, 60vw"
            className="absolute inset-0"
            float={false}
          />
        </div>
      )}

      {/* Details and footer share one bottom-anchored column instead of being
          two absolutely-placed blocks. Positioned separately, a name that runs
          long or tags that wrap to a second line push straight through the
          footer — which they do on any narrow card. */}
      <div className="relative flex shrink-0 flex-col gap-3.5 px-[6%] pt-[4%] pb-[3.5%]">
        <div className="flex flex-col gap-1.5">
          <span className="type-meta text-text-tertiary">Builder</span>
          <span className="text-[clamp(19px,5cqw,26px)] leading-[1.1] font-medium tracking-[-0.02em] text-white">
            {builderName}
          </span>
        </div>

        <ul className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <li
              key={tag}
              className={cn(
                "type-meta rounded-full border border-[rgb(255_255_255/0.1)] px-3 py-2",
                index === 0
                  ? "bg-[rgb(255_255_255/0.1)] text-white"
                  : "bg-[rgb(255_255_255/0.04)] text-text-secondary",
              )}
            >
              {tag}
            </li>
          ))}
        </ul>

        <footer className="type-meta flex items-start justify-between gap-4 pt-1 text-[rgb(255_255_255/0.35)]">
          <span>Proof of Build</span>
          <span className="text-right">Issuer · {issuer}</span>
        </footer>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_0_rgb(255_255_255/0.12)]"
      />
    </div>
  );
}
