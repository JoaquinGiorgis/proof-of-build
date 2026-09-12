import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CredentialCard } from "@/components/credential-card";
import { ShareBuild } from "@/components/share-build";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/primitives";
import { explorerUrl, isOnchain, shortAddress } from "@/lib/domain";
import { getBuild, getEvent } from "@/lib/queries";

/** Figma: 09 Public build · Desktop 16:28. */

export async function generateMetadata({
  params,
}: PageProps<"/b/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const build = await getBuild(slug);
  if (!build) return { title: "Build not found" };
  return { title: build.name, description: build.tagline };
}

export default async function PublicBuildPage({
  params,
}: PageProps<"/b/[slug]">) {
  const { slug } = await params;
  const build = await getBuild(slug);
  if (!build) notFound();

  const event = await getEvent(build.eventSlug);
  const onchain = isOnchain(build);
  const first = build.credentials[0] ?? null;
  const track =
    event?.tracks.find((item) => item.slug === build.trackSlug)?.name ??
    build.trackSlug;

  return (
    <div className="relative">

      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-start gap-16 px-5 pt-[150px] pb-16 md:px-20 lg:grid-cols-[minmax(0,560px)_minmax(0,520px)]">
        <div className="animate-rise flex flex-col items-start gap-6">
          {/* Archived says the project is no longer listed, not that the
              credentials are void — they are onchain and nothing here can
              touch them. Saying both at once is the honest version. */}
          <div className="flex flex-wrap items-center gap-3">
            {onchain ? (
              <Badge>Verified onchain</Badge>
            ) : (
              <Badge dot={false}>Not yet onchain</Badge>
            )}
            {build.archived && <Badge dot={false}>Archived</Badge>}
          </div>

          <h1 className="type-h1 text-text-primary uppercase">{build.name}</h1>
          <p className="type-body-m text-text-secondary">{build.tagline}</p>

          {event && (
            <div className="mt-4 flex flex-col gap-1.5">
              <span className="type-meta text-text-tertiary">Built at</span>
              <span className="type-h3 text-text-primary">
                {event.name} {event.year}
              </span>
              <span className="type-body-s text-text-tertiary">
                {event.issuer} · {event.location}
              </span>
            </div>
          )}

          <div className="mt-6 grid w-full grid-cols-2 gap-8 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <span className="type-meta text-text-tertiary">By</span>
              {build.team.map((member) => (
                <span key={member} className="type-body-m text-text-primary">
                  {member}
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <span className="type-meta text-text-tertiary">Track</span>
              <span className="type-body-m text-text-primary">{track}</span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="type-meta text-text-tertiary">Links</span>
              {build.githubUrl && (
                <ExternalLink href={build.githubUrl}>GitHub</ExternalLink>
              )}
              {build.demoUrl && (
                <ExternalLink href={build.demoUrl}>Live demo</ExternalLink>
              )}
              {!build.githubUrl && !build.demoUrl && (
                <span className="type-body-m text-text-tertiary">—</span>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            {first && (
              <a
                href={explorerUrl("tx", first.signature, first.cluster)}
                target="_blank"
                rel="noreferrer noopener"
                className="focus-ring inline-flex items-center rounded-full bg-white px-[22px] py-[14px] text-[15px] leading-none font-medium tracking-[-0.033em] text-black shadow-[0_0_12px_0_rgb(255_255_255/0.12)] transition-[transform,filter] hover:-translate-y-px hover:brightness-[0.94] active:scale-[0.98]"
              >
                View on Solana Explorer
              </a>
            )}
            <ShareBuild slug={build.slug} name={build.name} />
          </div>
        </div>

        <CredentialCard
          className="mx-auto"
          issuer={event?.name ?? "Proof of Build"}
          year={event?.year ?? new Date(build.createdAt).getFullYear()}
          builderName={first?.builderName ?? build.team[0] ?? "—"}
          artwork={event?.artwork ?? null}
          tags={[build.name, `${track} track`, "Shipped"]}
        />
      </div>

      {/* One row per builder who claimed. A team ships one project and each
          member carries their own credential, so the proof is a list. */}
      {onchain && (
        <div className="mx-auto mt-6 flex w-full max-w-[1280px] flex-col gap-3 px-5 md:px-10">
          {build.credentials.map((credential) => (
            <div
              key={credential.mint}
              className="glass flex flex-wrap items-center gap-x-12 gap-y-4 rounded-2xl px-6 py-5"
            >
              <Badge className="border-none bg-transparent shadow-none backdrop-blur-none">
                Verified onchain
              </Badge>
              <Fact label="Builder">{credential.builderName}</Fact>
              <Fact label="Transaction">
                {shortAddress(credential.signature, 4, 4)}
              </Fact>
              <Fact label="Wallet">
                {shortAddress(credential.wallet, 4, 4)}
              </Fact>
              <Fact label="Timestamp">
                {formatStamp(credential.issuedAt)}
              </Fact>
              <Fact label="Network">Solana {credential.cluster}</Fact>
            </div>
          ))}
        </div>
      )}

      <SiteFooter className="mt-16" />
    </div>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="type-meta text-text-tertiary">{label}</span>
      <span className="type-meta text-text-secondary">{children}</span>
    </div>
  );
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="focus-ring type-body-m text-text-primary inline-flex items-center gap-1 transition-colors hover:text-white"
    >
      {children}
      <span aria-hidden className="text-text-tertiary">
        ↗
      </span>
    </a>
  );
}

function formatStamp(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Cordoba",
  })
    .format(new Date(iso))
    .toUpperCase();
}
