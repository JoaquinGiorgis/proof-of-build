import { NextResponse } from "next/server";
import { getBuild, getEvent } from "@/lib/queries";

/**
 * The off-chain metadata document the credential's `uri` points at.
 *
 * Only public facts — the same ones already on the build's public page. Never
 * anything personal: what a wallet can read, everyone can read.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/proofs/[slug]/metadata">) {
  const { slug } = await params;
  const build = await getBuild(slug);
  if (!build) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const event = await getEvent(build.eventSlug);
  const track =
    event?.tracks.find((item) => item.slug === build.trackSlug)?.name ??
    build.trackSlug;

  return NextResponse.json(
    {
      name: build.name,
      symbol: "POB",
      description: build.tagline,
      external_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/b/${build.slug}`,
      attributes: [
        { trait_type: "Event", value: event ? `${event.name} ${event.year}` : "—" },
        { trait_type: "Issuer", value: event?.issuer ?? "—" },
        { trait_type: "Track", value: track },
        { trait_type: "Team", value: build.team.join(" · ") },
      ],
    },
    {
      headers: {
        // Metadata only changes when the build does, and a build is immutable
        // once its proof is onchain.
        "cache-control": "public, max-age=300, stale-while-revalidate=86400",
      },
    },
  );
}
