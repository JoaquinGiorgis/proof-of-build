"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { UiWallet } from "@wallet-standard/ui";
import { CLUSTER_LABEL } from "@/lib/solana/cluster";
import { useWallet } from "./wallet-provider";

/** Figma: Wallet modal 17:148. */

/** Wallets we point people at when nothing is installed. */
const SUGGESTED = [
  { name: "Phantom", url: "https://phantom.app/download" },
  { name: "Solflare", url: "https://solflare.com/download" },
  { name: "Backpack", url: "https://backpack.app/download" },
];

function WalletIcon({ wallet }: { wallet: UiWallet }) {
  if (!wallet.icon) {
    return <span className="size-8 shrink-0 rounded-[10px] bg-[rgb(255_255_255/0.12)]" />;
  }
  return (
    <span className="relative size-8 shrink-0 overflow-hidden rounded-[10px] bg-[rgb(255_255_255/0.12)]">
      <Image
        src={wallet.icon}
        alt=""
        width={32}
        height={32}
        unoptimized
        className="size-full object-cover"
      />
    </span>
  );
}

export function WalletModal() {
  const { modalOpen, closeModal, wallets, connect, isConnecting, error } =
    useWallet();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [modalOpen, closeModal]);

  if (!modalOpen) return null;

  const installed = new Set(wallets.map((wallet) => wallet.name));
  const missing = SUGGESTED.filter((suggested) => !installed.has(suggested.name));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={closeModal}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-[2px]"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        className="glass glass-grain animate-rise relative w-full max-w-[440px] rounded-[28px] bg-black/55 px-8 pt-8 pb-7 outline-none"
      >
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 id="wallet-modal-title" className="type-h3 text-text-primary">
              Connect wallet
            </h2>
            <p className="type-meta text-text-tertiary">
              Solana {CLUSTER_LABEL} · Wallet Standard
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Close"
            className="focus-ring -mt-1 -mr-1 rounded-full p-2 text-text-tertiary transition-colors hover:text-white"
          >
            ✕
          </button>
        </header>

        <ul className="mt-6 flex flex-col gap-2">
          {wallets.map((wallet) => (
            <li key={wallet.name}>
              <button
                type="button"
                disabled={isConnecting}
                onClick={() => connect(wallet)}
                className="focus-ring flex w-full items-center justify-between rounded-2xl border border-[rgb(255_255_255/0.08)] bg-[rgb(255_255_255/0.04)] px-4 py-3.5 transition-colors hover:border-[rgb(255_255_255/0.14)] hover:bg-[rgb(255_255_255/0.07)] disabled:opacity-50"
              >
                <span className="flex items-center gap-3.5">
                  <WalletIcon wallet={wallet} />
                  <span className="type-body-m text-text-primary">
                    {wallet.name}
                  </span>
                </span>
                <span className="type-meta text-text-secondary">Detected</span>
              </button>
            </li>
          ))}

          {missing.map((suggested) => (
            <li key={suggested.name}>
              <a
                href={suggested.url}
                target="_blank"
                rel="noreferrer noopener"
                className="focus-ring flex w-full items-center justify-between rounded-2xl border border-[rgb(255_255_255/0.08)] bg-[rgb(255_255_255/0.04)] px-4 py-3.5 transition-colors hover:border-[rgb(255_255_255/0.14)]"
              >
                <span className="flex items-center gap-3.5">
                  <span className="size-8 shrink-0 rounded-[10px] bg-[rgb(255_255_255/0.12)]" />
                  <span className="type-body-m text-text-primary">
                    {suggested.name}
                  </span>
                </span>
                <span className="type-meta text-[rgb(255_255_255/0.35)]">
                  Install
                </span>
              </a>
            </li>
          ))}
        </ul>

        {error && (
          <p className="type-meta mt-5 text-text-secondary" role="alert">
            {error}
          </p>
        )}

        <p className="type-meta mt-6 text-[rgb(255_255_255/0.35)]">
          You only sign. We never hold your keys.
        </p>
      </div>
    </div>
  );
}
