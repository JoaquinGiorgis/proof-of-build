import Image from "next/image";
import { LiquidBlack } from "@/components/liquid-black";
import { SiteFooter } from "@/components/site-footer";
import { ConnectCta } from "@/components/connect-cta";
import { ButtonLink } from "@/components/ui/button";

/** Figma: 01 Home · Desktop 5:2. */

const STEPS = [
  { label: "01 — Build", title: "Create something real." },
  { label: "02 — Prove", title: "Register the build onchain." },
  { label: "03 — Keep", title: "Carry your proof anywhere." },
];

export default function HomePage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        {/* The shader plate sits behind the hero and fades into the page. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[min(1000px,110vh)]">
          <LiquidBlack />
          <div className="absolute inset-x-0 bottom-0 h-[35%] bg-gradient-to-b from-transparent to-black" />
        </div>

        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-16 px-5 pt-[180px] pb-24 md:px-20 lg:grid-cols-[minmax(0,599px)_minmax(0,520px)] lg:pt-[236px] lg:pb-40">
          <div className="animate-rise flex flex-col items-start gap-7">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="h-px w-7 bg-[rgb(255_255_255/0.45)]"
              />
              <span className="type-meta-l text-text-tertiary">
                Córdoba Hack 2026 · Naranja X
              </span>
            </div>

            <h1 className="type-hero text-text-primary">
              Proof of
              <br />
              Build
            </h1>

            <p className="type-h2 text-text-secondary">
              Ship something.
              <br />
              Prove you built it.
            </p>

            <p className="type-body-l text-text-tertiary max-w-[520px]">
              A verifiable record of what you actually shipped.
            </p>

            <div className="flex flex-wrap items-center gap-5">
              <ConnectCta />
              <ButtonLink href="/explore" variant="ghost">
                Explore builds
                <span
                  aria-hidden
                  className="text-text-tertiary transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  →
                </span>
              </ButtonLink>
            </div>
          </div>

          {/* Hero asset — a liquid-chrome knot, generated for this screen. It
              is screen-blended because the render's black is not pure 0. */}
          <div className="relative mx-auto hidden aspect-[520/650] w-full max-w-[560px] lg:block">
            <div
              aria-hidden
              className="absolute -inset-[12%] rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.08)_0%,transparent_65%)] blur-3xl"
            />
            <div className="animate-float absolute inset-0 mix-blend-screen [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_78%)]">
              <Image
                src="/assets/proof-of-build-hero.png"
                alt=""
                fill
                priority
                sizes="(min-width: 1024px) 560px, 0px"
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-10 px-5 pb-28 md:grid-cols-3 md:px-10">
        {STEPS.map((step) => (
          <div key={step.label} className="rule flex flex-col gap-5 pt-7">
            <span className="type-meta-l text-text-tertiary">{step.label}</span>
            <h2 className="type-h3 text-text-primary max-w-[360px]">
              {step.title}
            </h2>
          </div>
        ))}
      </section>

      <SiteFooter />
    </>
  );
}
