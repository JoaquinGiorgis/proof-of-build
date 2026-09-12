"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { shortAddress } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/wallet/wallet-provider";

/** Figma: Navbar 5:10 — a 56px liquid-glass pill, inset 40px from the edges. */

const LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/builds", label: "My Builds" },
  { href: "/about", label: "About" },
];

export function SiteNav() {
  const pathname = usePathname();
  const { address, isReady, openModal, disconnect } = useWallet();

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 px-5 pt-5 md:px-10 md:pt-6">
      <nav className="glass pointer-events-auto mx-auto flex h-14 w-full max-w-[1360px] items-center justify-between rounded-full py-2 pr-2 pl-5 md:pl-6">
        <Link
          href="/"
          className="focus-ring rounded-full text-[15px] leading-none font-medium tracking-[-0.033em] text-white"
        >
          Proof of Build
        </Link>

        <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "focus-ring type-body-s rounded transition-colors",
                    active
                      ? "text-text-primary"
                      : "text-text-secondary hover:text-white",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Hold the slot until auto-reconnect settles, so a persisted wallet
            never flashes "Connect wallet" on load. */}
        {!isReady ? (
          <span className="h-[35px] w-[141px] rounded-full bg-[rgb(255_255_255/0.06)]" />
        ) : address ? (
          <button
            type="button"
            onClick={disconnect}
            title="Disconnect"
            className="focus-ring group flex items-center gap-2 rounded-full border border-[rgb(255_255_255/0.08)] bg-[rgb(255_255_255/0.04)] px-4 py-2.5 transition-colors hover:border-[rgb(255_255_255/0.14)]"
          >
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-white shadow-[0_0_8px_0_rgb(255_255_255/0.6)]"
            />
            <span className="type-meta text-text-secondary group-hover:text-white">
              {shortAddress(address)}
            </span>
          </button>
        ) : (
          <Button onClick={openModal} className="px-[18px] py-2.5">
            Connect wallet
          </Button>
        )}
      </nav>
    </header>
  );
}
