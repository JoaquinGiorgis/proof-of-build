import { ClaimView } from "@/components/claim/claim-view";
import { SiteFooter } from "@/components/site-footer";
import { verifyClaimToken } from "@/lib/claim-link";
import { getEvent } from "@/lib/queries";

export const metadata = { title: "Claim your Proof" };

/**
 * The landing for a signed claim link.
 *
 * The event's own system knows what the team shipped and already verified it,
 * so nothing is typed here: the builder sees exactly the credential they are
 * about to claim, connects a wallet, and mints. The token is verified on the
 * server before any of it renders — a tampered link never reaches the screen.
 */
export default async function ClaimPage({ searchParams }: PageProps<"/claim">) {
  const { t } = await searchParams;
  const token = typeof t === "string" ? t : "";

  if (!token) return <Problem title="This link is incomplete." />;

  const verdict = verifyClaimToken(token);
  if (!verdict.ok) {
    return (
      <Problem
        title={
          verdict.reason === "expired"
            ? "This link has expired."
            : "This link is not valid."
        }
        detail={
          verdict.reason === "expired"
            ? "Ask the event for a fresh one — the project is still there."
            : "It was not issued by an event on Proof of Build, or it was edited after it was signed."
        }
      />
    );
  }

  const event = await getEvent(verdict.payload.ev);
  if (!event) return <Problem title="That event is not on Proof of Build." />;

  const track =
    event.tracks.find((item) => item.slug === verdict.payload.tr)?.name ??
    verdict.payload.tr;

  return <ClaimView payload={verdict.payload} event={event} track={track} token={token} />;
}

function Problem({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="relative">
      <section className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-5 pt-[180px] pb-24 md:px-10">
        <span className="type-meta text-text-tertiary">Claim</span>
        <h1 className="type-h2 text-text-primary">{title}</h1>
        {detail && (
          <p className="type-body-m text-text-secondary max-w-[520px]">
            {detail}
          </p>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
