import Image from "next/image";
import { SiteFooter } from "@/components/site-footer";
import { ConnectCta } from "@/components/connect-cta";
import { ButtonLink } from "@/components/ui/button";
import { listEvents } from "@/lib/queries";

/** Figma: 01 Home · Desktop 5:2. */

const STEPS = [
  { label: "01 — Build", title: "Create something real." },
  { label: "02 — Prove", title: "Register the build onchain." },
  { label: "03 — Keep", title: "Carry your proof anywhere." },
];

export default async function HomePage() {
  // The eyebrow names the most recent issuer rather than a hardcoded event —
  // this is a platform, and the landing should say so when a second event
  // shows up.
  const events = await listEvents();
  const featured = events[0];

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-16 px-5 pt-[180px] pb-24 md:px-20 lg:grid-cols-[minmax(0,599px)_minmax(0,520px)] lg:pt-[236px] lg:pb-40">
          <div className="animate-rise flex flex-col items-start gap-7">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="h-px w-7 bg-[rgb(255_255_255/0.45)]"
              />
              <span className="type-meta-l text-text-tertiary">
                {featured
                  ? `${featured.name} ${featured.year} · ${featured.issuer}`
                  : "Onchain credentials for hackathons"}
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
              <ConnectCta connectedLabel="Claim your Proof" connectedHref="/events" />
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

          {/* Hero asset — a liquid-chrome seal with an embossed check, the one
              object that says what the product does. Screen-blended and masked
              because the render's black is not pure 0: without it the plate
              reads as a grey rectangle sitting on top of the shader. */}
          <div className="relative mx-auto hidden aspect-[1856/2304] w-full max-w-[560px] lg:block">
            <div
              aria-hidden
              className="absolute -inset-[12%] rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.08)_0%,transparent_65%)] blur-3xl"
            />
            <div className="animate-float absolute inset-0 mix-blend-screen [mask-image:radial-gradient(ellipse_at_center,black_58%,transparent_80%)]">
              <Image
                src="/assets/proof-of-build-seal.png"
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
