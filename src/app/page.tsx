import Image from "next/image";
import { SiteFooter } from "@/components/site-footer";
import { ConnectCta } from "@/components/connect-cta";
import { ButtonLink } from "@/components/ui/button";
import { listEvents } from "@/lib/queries";

/**
 * Figma: 01 Home · Desktop 5:2.
 *
 * The hero and nothing else. The three "01 Build / 02 Prove / 03 Keep" panels
 * that used to sit under it explained a product the hero already states in two
 * lines, and their only real effect was to put a scrollbar on the one page
 * that should not have one.
 */

export default async function HomePage() {
  // The eyebrow names the most recent issuer rather than a hardcoded event —
  // this is a platform, and the landing should say so when a second event
  // shows up.
  const events = await listEvents();
  const featured = events[0];

  return (
    /* One screen. The section takes the viewport minus the footer, and the
       grid centres inside it, so the gap under the navbar is whatever is left
       over rather than a number picked to look right at one window size. */
    <>
      <section className="relative flex min-h-[calc(100svh-7rem)] items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-10 px-5 pt-24 pb-10 [@media(max-height:820px)]:pt-20 md:px-20 lg:grid-cols-[minmax(0,599px)_minmax(0,520px)] lg:gap-16 lg:pt-20">
          <div className="animate-rise flex flex-col items-start gap-6 [@media(max-height:820px)]:gap-4">
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

            <h1 className="type-hero text-text-primary [@media(max-height:820px)]:text-[clamp(3rem,6.5vw,5.5rem)]">
              Proof of
              <br />
              Build
            </h1>

            <p className="type-h2 text-text-secondary [@media(max-height:820px)]:text-[clamp(1.75rem,3vw,2.25rem)]">
              Ship something.
              <br />
              Prove you built it.
            </p>

            <p className="type-body-l text-text-tertiary max-w-[520px]">
              A verifiable record of what you actually shipped.
            </p>

            <div className="flex flex-wrap items-center gap-5">
              <ConnectCta
                connectedLabel="Claim your Proof"
                connectedHref="/events"
              />
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
          <div className="relative mx-auto hidden aspect-[1856/2304] h-[min(560px,calc(100svh-16rem))] w-auto lg:block">
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

      <SiteFooter className="!pt-0 !pb-6" />
    </>
  );
}
