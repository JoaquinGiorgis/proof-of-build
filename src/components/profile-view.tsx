import { BuildRow } from "@/components/build-row";
import { SiteFooter } from "@/components/site-footer";
import type { Build, BuilderProfile, EventRecord } from "@/lib/domain";

/** Figma: 10 Builder profile · Desktop 17:33. */

export function ProfileView({
  profile,
  events,
}: {
  profile: BuilderProfile;
  events: EventRecord[];
}) {
  const byEvent = new Map(events.map((event) => [event.slug, event]));
  const shipped = profile.builds.filter((build) => build.credential).length;
  const byYear = groupByYear(profile.builds);

  return (
    <>
      <section className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-5 pt-[150px] pb-14 md:px-10">
        <span className="type-meta text-text-tertiary">Builder</span>
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="flex min-w-0 flex-col gap-3">
            <h1 className="type-h1 text-text-primary">{profile.name}</h1>
            <span className="type-meta text-text-tertiary break-all">
              {profile.wallet}
            </span>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <span className="type-h1 text-text-primary">{shipped}</span>
            <span className="type-meta text-text-tertiary">Builds shipped</span>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-10">
        {profile.builds.length === 0 ? (
          <p className="rule type-body-m text-text-tertiary py-10">
            No builds registered yet.
          </p>
        ) : (
          byYear.map(([year, builds]) => (
            <div key={year} className="mb-14">
              <span className="type-meta text-text-tertiary">{year}</span>
              <ul className="mt-4 flex flex-col">
                {builds.map((build) => (
                  <BuildRow
                    key={build.slug}
                    build={build}
                    event={byEvent.get(build.eventSlug) ?? null}
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <SiteFooter className="mt-10" />
    </>
  );
}

function groupByYear(builds: Build[]): [string, Build[]][] {
  const groups = new Map<string, Build[]>();
  for (const build of builds) {
    const year = String(
      new Date(build.credential?.issuedAt ?? build.createdAt).getUTCFullYear(),
    );
    const bucket = groups.get(year);
    if (bucket) bucket.push(build);
    else groups.set(year, [build]);
  }
  return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}
