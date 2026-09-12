import { BuildRow } from "@/components/build-row";
import { SiteFooter } from "@/components/site-footer";
import { listBuilds, listEvents } from "@/lib/queries";

export const metadata = { title: "Explore" };

export default async function ExplorePage() {
  const [builds, events] = await Promise.all([listBuilds(), listEvents()]);
  const byEvent = new Map(events.map((event) => [event.slug, event]));
  // Proofs, not projects: a team of four ships one build and carries four
  // credentials, and the label says "proofs".
  const proofs = builds.reduce(
    (total, build) => total + build.credentials.length,
    0,
  );

  return (
    <div className="relative">

      <section className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-5 pt-[150px] pb-14 md:px-10">
        <span className="type-meta text-text-tertiary">Explore</span>
        <div className="flex flex-wrap items-end justify-between gap-8">
          <h1 className="type-h1 text-text-primary max-w-[680px]">
            Everything that shipped.
          </h1>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <span className="type-h1 text-text-primary">{proofs}</span>
            <span className="type-meta text-text-tertiary">
              Proofs onchain
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-10">
        {builds.length === 0 ? (
          <p className="rule type-body-m text-text-tertiary py-10">
            Nothing here yet. Be the first to register a build.
          </p>
        ) : (
          <ul className="flex flex-col">
            {builds.map((build) => (
              <BuildRow
                key={build.slug}
                build={build}
                event={byEvent.get(build.eventSlug) ?? null}
              />
            ))}
          </ul>
        )}
      </section>

      <SiteFooter className="mt-24" />
    </div>
  );
}
