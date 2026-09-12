import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { ClaimProofCta } from "@/components/claim-proof-cta";
import { NinjaTurntable } from "@/components/ninja-turntable";
import { Badge } from "@/components/ui/primitives";
import { getEvent, listBuilds } from "@/lib/queries";

/** Figma: 03 Event · Desktop 6:6. */

export default async function EventPage({ params }: PageProps<"/events/[slug]">) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const builds = await listBuilds({ eventSlug: event.slug });

  const dates = formatRange(event.startsAt, event.endsAt);
  const stats = [
    { value: "100", label: "Builders" },
    { value: "24", label: "Hours" },
    { value: String(builds.length), label: "Builds" },
    { value: String(event.tracks.length), label: "Tracks" },
  ];

  return (
    <>
      <section className="relative overflow-hidden">

        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-16 px-5 pt-[160px] pb-20 md:px-20 lg:grid-cols-[minmax(0,600px)_minmax(0,600px)] lg:pt-[220px]">
          <div className="animate-rise flex flex-col items-start gap-7">
            {event.verified && <Badge>Verified issuer</Badge>}

            <h1 className="type-hero text-text-primary uppercase">
              {event.name}
            </h1>

            <div className="flex flex-col gap-2">
              <p className="type-body-l text-text-secondary">{dates}</p>
              <p className="type-body-l text-text-tertiary">
                {event.issuer} · {event.location}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-5">
              <ClaimProofCta eventSlug={event.slug} />
            </div>
          </div>

          {/* The golden ninja — the only chromatic element in the product, and
              only ever on Córdoba Hack surfaces. */}
          {event.artwork && (
            <div className="relative mx-auto hidden aspect-[600/760] w-full max-w-[600px] lg:block">
              <div
                aria-hidden
                className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgb(255_210_140/0.1)_0%,transparent_62%)] blur-2xl"
              />
              <div
                aria-hidden
                className="absolute bottom-[4%] left-1/2 h-[78px] w-[420px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse,rgb(0_0_0/0.75)_0%,transparent_70%)] blur-xl"
              />
              {/* Turning, not glinting: the rotation already catches the
                  light, and running both reads as two effects fighting. */}
              <NinjaTurntable
                poster={event.artwork}
                mp4="/assets/ninja-360/ninja-spin.mp4"
                webm="/assets/ninja-360/ninja-spin.webm"
                alt={`${event.name} ${event.year} credential artwork`}
                priority
                sizes="(min-width: 1024px) 600px, 0px"
                className="animate-float absolute inset-0"
              />
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1280px] grid-cols-2 gap-10 px-5 md:grid-cols-4 md:px-10">
        {stats.map((stat) => (
          <div key={stat.label} className="rule flex flex-col gap-3 pt-6">
            <span className="type-h1 text-text-primary">{stat.value}</span>
            <span className="type-meta-l text-text-tertiary">{stat.label}</span>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-20 flex w-full max-w-[1280px] flex-wrap items-center gap-6 px-5 md:px-10">
        <span className="type-meta-l text-text-tertiary">Tracks</span>
        {event.tracks.map((track) => (
          <span
            key={track.slug}
            className="rounded-xl border border-[rgb(255_255_255/0.08)] bg-[rgb(255_255_255/0.04)] px-[18px] py-3 text-[15px] leading-none font-medium tracking-[-0.033em] text-white backdrop-blur-[12px] shadow-[inset_0_1px_0_0_rgb(255_255_255/0.1)]"
          >
            {track.name}
          </span>
        ))}
      </section>

      <SiteFooter className="mt-28" />
    </>
  );
}

function formatRange(startsAt: string, endsAt: string) {
  const start = new Date(`${startsAt}T00:00:00Z`);
  const end = new Date(`${endsAt}T00:00:00Z`);
  const month = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
  }).format(start);
  return `${month} ${start.getUTCDate()}–${end.getUTCDate()}, ${end.getUTCFullYear()}`;
}
