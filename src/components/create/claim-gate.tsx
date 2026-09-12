"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { EventRecord } from "@/lib/domain";

/**
 * The gate in front of the create flow.
 *
 * An event's credential carries that issuer's signature, so it cannot be
 * handed to whoever arrives with a wallet. The event shares a code; without
 * one you do not get to the wizard.
 *
 * This check is for the builder's benefit — it fails fast instead of after
 * five steps. The code is checked again, and actually spent, when the
 * transaction is prepared on the server.
 */
export function ClaimGate({
  event,
  onUnlock,
}: {
  event: EventRecord;
  onUnlock: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const submit = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    if (code.trim().length < 4) return;

    setChecking(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/events/${encodeURIComponent(event.slug)}/claim-code`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "That code is not valid.");
        return;
      }
      onUnlock(code.trim().toUpperCase());
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col px-5 pt-[150px] pb-24 md:px-20 lg:pt-[200px]">
      <div className="mx-auto w-full max-w-[560px]">
        <div className="mb-8 flex flex-col gap-3">
          <span className="type-meta-l text-text-tertiary">
            {event.name} {event.year} · {event.issuer}
          </span>
          <h1 className="type-h2 text-text-primary">Claim your Proof.</h1>
          <p className="type-body-m text-text-secondary">
            Enter the code this event gave you. It is what tells us the issuer
            actually watched you build.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="glass glass-grain animate-rise rounded-[28px] p-8 md:p-10"
        >
          <Field
            label="Claim code"
            placeholder="CBAHACK-2026"
            value={code}
            autoFocus
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            onChange={(changeEvent) => {
              setCode(changeEvent.target.value);
              if (error) setError(null);
            }}
            className="[&_input]:uppercase"
          />

          {error && (
            <p className="type-meta mt-5 text-text-secondary" role="alert">
              {error}
            </p>
          )}

          <div className="mt-7 flex items-center justify-between gap-4 pt-2">
            <span className="type-meta text-[rgb(255_255_255/0.3)]">
              One build per wallet
            </span>
            <Button type="submit" disabled={checking || code.trim().length < 4}>
              {checking ? "Checking…" : "Continue"}
            </Button>
          </div>
        </form>

        <p className="type-meta mt-6 text-[rgb(255_255_255/0.3)]">
          Do not have a code? Ask the organisers of {event.name}.
        </p>
      </div>
    </div>
  );
}
