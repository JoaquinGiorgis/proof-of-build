import Image from "next/image";
import Link from "next/link";
import { isOnchain, type Build, type EventRecord } from "@/lib/domain";

/**
 * Figma: 10 Builder profile 17:33 — the row used in the profile and explore
 * lists. Thumbnail, issuer + name, date, track, verified marker.
 */
export function BuildRow({
  build,
  event,
}: {
  build: Build;
  event: EventRecord | null;
}) {
  const onchain = isOnchain(build);
  const track =
    event?.tracks.find((item) => item.slug === build.trackSlug)?.name ??
    build.trackSlug;

  return (
    <li className="rule">
      <Link
        href={`/b/${build.slug}`}
        className="focus-ring group grid grid-cols-[56px_minmax(0,1fr)] items-center gap-6 rounded-2xl py-5 transition-[transform,background-color] duration-[240ms] ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:bg-[rgb(255_255_255/0.02)] md:grid-cols-[56px_minmax(0,1fr)_140px_140px_120px] md:px-2"
      >
        <span className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-[rgb(255_255_255/0.08)] bg-gradient-to-b from-[#171717] to-[#050505]">
          {event?.artwork && (
            <Image
              src={event.artwork}
              alt=""
              fill
              sizes="56px"
              className="object-contain p-1"
            />
          )}
        </span>

        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="type-meta text-text-tertiary truncate">
            {event?.name ?? "Proof of Build"}
          </span>
          <span className="type-h3 text-text-primary truncate">
            {build.name}
          </span>
        </span>

        <span className="hidden flex-col gap-1.5 md:flex">
          <span className="type-meta text-text-tertiary">Date</span>
          <span className="type-body-m text-text-primary">
            {formatDate(build.credentials[0]?.issuedAt ?? build.createdAt)}
          </span>
        </span>

        <span className="hidden flex-col gap-1.5 md:flex">
          <span className="type-meta text-text-tertiary">Track</span>
          <span className="type-body-m text-text-primary">{track}</span>
        </span>

        <span className="hidden items-center gap-2 justify-self-end md:flex">
          <span
            aria-hidden
            className={
              onchain
                ? "size-1.5 rounded-full bg-white shadow-[0_0_8px_0_rgb(255_255_255/0.6)]"
                : "size-1.5 rounded-full bg-[rgb(255_255_255/0.25)]"
            }
          />
          <span className="type-meta text-text-secondary">
            {onchain
              ? build.credentials.length > 1
                ? `${build.credentials.length} claimed`
                : "Verified"
              : "Pending"}
          </span>
        </span>
      </Link>
    </li>
  );
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}
