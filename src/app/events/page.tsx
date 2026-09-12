import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/primitives";
import { listBuilds, listEvents } from "@/lib/queries";

export const metadata = {
  title: "Events",
  description: "The events issuing credentials on Proof of Build.",
};

/** The issuers on the platform. Events are added by seed, never self-serve. */
export default async function EventsPage() {
  const [events, builds] = await Promise.all([listEvents(), listBuilds()]);
  const countByEvent = builds.reduce<Record<string, number>>((acc, build) => {
    acc[build.eventSlug] = (acc[build.eventSlug] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="relative">
      <section className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-5 pt-[150px] pb-14 md:px-10">
        <span className="type-meta text-text-tertiary">Events</span>
        <h1 className="type-h1 text-text-primary max-w-[820px]">
          Who issues proofs here.
        </h1>
        <p className="type-body-l text-text-secondary max-w-[620px]">
          Each event signs its own credentials, and hands its builders a code.
          A proof is only worth something because the issuer behind it is.
        </p>
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-10">
        {events.length === 0 ? (
          <p className="rule type-body-m text-text-tertiary py-10">
            No events yet.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {events.map((event) => (
              <li key={event.slug}>
                <Link
                  href={`/events/${event.slug}`}
                  className="focus-ring glass glass-grain glass-hover group block overflow-hidden rounded-3xl"
                >
                  <span className="relative block aspect-square w-full overflow-hidden bg-bg-2">
                    {event.cover ? (
                      <Image
                        src={event.cover}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 620px, 100vw"
                        className="object-cover transition-transform duration-[600ms] ease-[var(--ease-out-soft)] group-hover:scale-[1.02]"
                      />
                    ) : (
                      event.artwork && (
                        <Image
                          src={event.artwork}
                          alt=""
                          fill
                          sizes="(min-width: 768px) 620px, 100vw"
                          className="object-contain p-12"
                        />
                      )
                    )}
                  </span>

                  <span className="flex flex-col gap-4 p-7">
                    <span className="flex flex-wrap items-center gap-3">
                      {event.verified ? (
                        <Badge>Verified issuer</Badge>
                      ) : (
                        <Badge dot={false}>Unverified</Badge>
                      )}
                      <span className="type-meta text-text-tertiary">
                        {countByEvent[event.slug] ?? 0} builds
                      </span>
                    </span>

                    <span className="type-h3 text-text-primary block">
                      {event.name} {event.year}
                    </span>
                    <span className="type-body-s text-text-tertiary block">
                      {event.issuer} · {event.location}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SiteFooter className="mt-24" />
    </div>
  );
}
