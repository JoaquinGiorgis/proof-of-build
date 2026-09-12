"use client";

import { useEffect, useState } from "react";
import { BuildRow } from "@/components/build-row";
import { SiteFooter } from "@/components/site-footer";
import { Button, ButtonLink } from "@/components/ui/button";
import { useWallet } from "@/components/wallet/wallet-provider";
import type { Build, EventRecord } from "@/lib/domain";

/**
 * The connected builder's own list. Client-side because the identity is the
 * wallet, which only exists in the browser.
 */
export function MyBuilds() {
  const { address, isReady, openModal } = useWallet();

  return (
    <>
      <section className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-5 pt-[150px] pb-14 md:px-10">
        <span className="type-meta text-text-tertiary">My Builds</span>
        <h1 className="type-h1 text-text-primary">
          {address ? "Everything you shipped." : "Connect to see your builds."}
        </h1>
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-10">
        {!isReady && <Skeleton />}

        {isReady && !address && (
          <div className="rule flex flex-col items-start gap-6 py-10">
            <p className="type-body-m text-text-tertiary max-w-[520px]">
              Your builds live under your wallet. Nothing is stored against an
              account you did not create.
            </p>
            <Button onClick={openModal}>Connect wallet</Button>
          </div>
        )}

        {/* Keyed on the wallet so switching accounts restarts the fetch from
            its loading state instead of showing the previous builder's list. */}
        {isReady && address && <BuildsList key={address} wallet={address} />}
      </section>

      <SiteFooter className="mt-20" />
    </>
  );
}

function BuildsList({ wallet }: { wallet: string }) {
  const [state, setState] = useState<{
    status: "loading" | "ready" | "error";
    builds: Build[];
    events: EventRecord[];
  }>({ status: "loading", builds: [], events: [] });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/builds?wallet=${encodeURIComponent(wallet)}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load your builds.");
        return response.json();
      })
      .then((payload: { builds: Build[]; events: EventRecord[] }) => {
        setState({
          status: "ready",
          builds: payload.builds,
          events: payload.events,
        });
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setState({ status: "error", builds: [], events: [] });
      });
    return () => controller.abort();
  }, [wallet]);

  if (state.status === "loading") return <Skeleton />;

  if (state.status === "error") {
    return (
      <p className="rule type-body-m text-text-tertiary py-10">
        Could not load your builds. Try again in a moment.
      </p>
    );
  }

  if (state.builds.length === 0) {
    return (
      <div className="rule flex flex-col items-start gap-6 py-10">
        <p className="type-body-m text-text-tertiary">
          Nothing registered under this wallet yet.
        </p>
        <ButtonLink href="/create">Register a build</ButtonLink>
      </div>
    );
  }

  const byEvent = new Map(state.events.map((event) => [event.slug, event]));

  return (
    <ul className="flex flex-col">
      {state.builds.map((build) => (
        <BuildRow
          key={build.slug}
          build={build}
          event={byEvent.get(build.eventSlug) ?? null}
        />
      ))}
    </ul>
  );
}

function Skeleton() {
  return <div className="rule h-24 animate-pulse bg-[rgb(255_255_255/0.02)]" />;
}
