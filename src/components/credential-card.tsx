"use client";

import Image from "next/image";
import { useRef } from "react";
import { cn } from "@/lib/cn";

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
        "relative aspect-[520/720] w-full max-w-[520px] overflow-hidden rounded-[32px]",
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

      <header className="type-meta-l absolute inset-x-[6%] top-[3.75%] flex items-start justify-between text-text-secondary">
        <span>{issuer}</span>
        <span>{year}</span>
      </header>

      {artwork && (
        <div className="absolute top-[9.5%] left-1/2 h-[56%] w-[62%] -translate-x-1/2">
          <div
            aria-hidden
            className="absolute bottom-[-6%] left-1/2 h-[47px] w-[260px] max-w-[80%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse,rgb(0_0_0/0.7)_0%,transparent_70%)] blur-md"
          />
          <Image
            src={artwork}
            alt=""
            fill
            priority={interactive}
            sizes="(min-width: 1024px) 330px, 60vw"
            className="object-contain drop-shadow-[0_30px_50px_rgb(0_0_0/0.6)]"
          />
        </div>
      )}

      <div className="absolute inset-x-[6%] top-[68.8%] flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <span className="type-meta text-text-tertiary">Builder</span>
          <span className="text-[26px] leading-[1.1] font-medium tracking-[-0.02em] text-white">
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
      </div>

      <footer className="type-meta absolute inset-x-[6%] bottom-[3.5%] flex items-start justify-between text-[rgb(255_255_255/0.35)]">
        <span>Proof of Build</span>
        <span>Issuer · {issuer}</span>
      </footer>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_0_0_rgb(255_255_255/0.12)]"
      />
    </div>
  );
}
