"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  useConnect,
  useConnectedWallet,
  useDisconnect,
  useIsWalletReady,
  useWallets,
  useWalletStatus,
} from "@solana/kit-plugin-wallet/react";
import type { UiWallet } from "@wallet-standard/ui";
import { getSolanaClient } from "@/lib/solana/client";

/**
 * Wallet Standard only — the deps already in the project (`kit-plugin-wallet`
 * + `@solana/react`). No wallet-adapter: see docs/SOLANA-RULES.md.
 *
 * The context exists so the navbar, the connect modal and the mint flow all
 * read one connection and one "open the modal" handle.
 */

type WalletContextValue = {
  wallets: readonly UiWallet[];
  address: string | null;
  isReady: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: (wallet: UiWallet) => void;
  disconnect: () => void;
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

/** A store that never changes: `false` on the server, `true` once hydrated. */
const subscribeToNothing = () => () => {};
const onClient = () => true;
const onServer = () => false;

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const client = getSolanaClient();

  const wallets = useWallets(client);
  const connected = useConnectedWallet(client);
  const status = useWalletStatus(client);
  const isReady = useIsWalletReady(client);
  const connectAction = useConnect(client);
  const disconnectAction = useDisconnect(client);

  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The wallet store settles synchronously in the browser but is permanently
  // `pending` on the server, so the first client render has to match the
  // server's — otherwise hydration fails on every page with a connect button.
  const mounted = useSyncExternalStore(subscribeToNothing, onClient, onServer);

  const connect = useCallback(
    (wallet: UiWallet) => {
      setError(null);
      connectAction
        .dispatchAsync(wallet)
        .then(() => setModalOpen(false))
        .catch((cause: unknown) => {
          setError(
            cause instanceof Error ? cause.message : "Could not connect.",
          );
        });
    },
    [connectAction],
  );

  const disconnect = useCallback(() => {
    disconnectAction.dispatch();
  }, [disconnectAction]);

  const value = useMemo<WalletContextValue>(
    () => ({
      wallets,
      address: mounted ? (connected?.account.address ?? null) : null,
      isReady: mounted && isReady,
      isConnecting: status === "connecting" || connectAction.isRunning,
      error,
      connect,
      disconnect,
      modalOpen,
      openModal: () => setModalOpen(true),
      closeModal: () => setModalOpen(false),
    }),
    [
      wallets,
      connected,
      isReady,
      mounted,
      status,
      connectAction.isRunning,
      error,
      connect,
      disconnect,
      modalOpen,
    ],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) {
    throw new Error("useWallet must be used inside <WalletProvider>");
  }
  return value;
}
