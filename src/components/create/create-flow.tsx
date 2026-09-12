"use client";

import { useMemo, useState } from "react";
import type { EventRecord } from "@/lib/domain";
import {
  EMPTY_DRAFT,
  formatTeam,
  parseTeam,
  type BuildDraft,
} from "@/lib/build-draft";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { TrackChip } from "@/components/ui/primitives";
import { ClaimGate } from "./claim-gate";
import { ProofPreview } from "./proof-preview";

/**
 * Figma: 04 Create · Project 10:12 and 05 Create · Track 10:64.
 *
 * One panel is active at a time. The previous panel recedes behind it —
 * scale .95, opacity .45, y -24, 1px blur — and the next one enters from
 * y +24, which is the motion spec for this flow.
 */

const STEPS = [
  { key: "project", label: "01 — Project" },
  { key: "build", label: "02 — Build" },
  { key: "team", label: "03 — Team" },
  { key: "track", label: "04 — Track" },
  { key: "proof", label: "05 — Proof" },
] as const;

export function CreateFlow({ event }: { event: EventRecord }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<BuildDraft>({
    ...EMPTY_DRAFT,
    eventSlug: event.slug,
  });
  const [teamInput, setTeamInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Held in memory only. It is re-checked and spent server-side, so keeping it
  // in a cookie or localStorage would buy nothing and leak the event's secret.
  const [claimCode, setClaimCode] = useState<string | null>(null);

  const set = <K extends keyof BuildDraft>(key: K, value: BuildDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const canContinue = useMemo(() => {
    switch (step) {
      case 0:
        return draft.name.trim().length >= 2 && draft.tagline.trim().length >= 4;
      case 1:
        return true; // GitHub and demo are both optional.
      case 2:
        return parseTeam(teamInput).length > 0;
      case 3:
        return draft.trackSlug.length > 0;
      default:
        return true;
    }
  }, [step, draft, teamInput]);

  const next = () => {
    if (step === 2) {
      const team = parseTeam(teamInput);
      if (!team.length) {
        setError("At least one builder.");
        return;
      }
      set("team", team);
    }
    setError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const back = () => {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
  };

  if (!claimCode) {
    return <ClaimGate event={event} onUnlock={setClaimCode} />;
  }

  if (step === 4) {
    return (
      <ProofPreview
        draft={draft}
        event={event}
        claimCode={claimCode}
        onBack={back}
      />
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-16 px-5 pt-[150px] pb-24 md:px-20 lg:grid-cols-[minmax(0,320px)_minmax(0,640px)] lg:pt-[200px]">
      <div className="flex flex-col gap-20">
        <ol className="flex flex-col gap-[22px]">
          {STEPS.map((item, index) => (
            <li key={item.key} className="flex items-center gap-3">
              <span
                aria-hidden
                className={cn(
                  "h-px shrink-0 transition-all duration-[240ms] ease-[var(--ease-out-soft)]",
                  index === step
                    ? "w-7 bg-white"
                    : "w-3 bg-[rgb(255_255_255/0.25)]",
                )}
              />
              <span
                className={cn(
                  "type-meta-l transition-colors duration-[240ms]",
                  index === step
                    ? "text-text-primary"
                    : index < step
                      ? "text-text-secondary"
                      : "text-[rgb(255_255_255/0.35)]",
                )}
              >
                {item.label}
              </span>
            </li>
          ))}
        </ol>

        <div className="hidden flex-col gap-3 lg:flex">
          <h1 className="type-h3 text-text-primary">Register your build</h1>
          <p className="type-body-s text-text-tertiary">
            {event.name} {event.year} · {event.issuer}
          </p>
        </div>
      </div>

      <div className="relative">
        {/* The receding ghost of the previous panel. */}
        {step > 0 && (
          <div
            aria-hidden
            className="glass pointer-events-none absolute inset-x-0 -top-8 hidden rounded-[28px] p-10 opacity-45 blur-[1px] lg:block"
            style={{ transform: "scale(0.95)" }}
          >
            <span className="type-meta-l text-text-tertiary">
              {String(step).padStart(2, "0")}
            </span>
            <p className="type-h2 mt-2 text-text-primary">
              {STEPS[step - 1].label.split("— ")[1]}
            </p>
          </div>
        )}

        <div
          key={step}
          className="glass glass-grain animate-rise relative rounded-[28px] p-8 md:p-10"
        >
          <header className="flex flex-col gap-2">
            <span className="type-meta-l text-text-tertiary">
              {String(step + 1).padStart(2, "0")}
            </span>
            <h2 className="type-h2 text-text-primary">
              {STEPS[step].label.split("— ")[1]}
            </h2>
            {step === 3 && (
              <p className="type-body-s text-text-tertiary">
                Pick the track your build belongs to.
              </p>
            )}
          </header>

          <div className="mt-7 flex flex-col gap-5">
            {step === 0 && (
              <>
                <Field
                  label="Project name"
                  placeholder="Proof of Build"
                  value={draft.name}
                  autoFocus
                  onChange={(event) => set("name", event.target.value)}
                />
                <Field
                  label="One-line description"
                  placeholder="A verifiable record of what you actually shipped."
                  value={draft.tagline}
                  onChange={(event) => set("tagline", event.target.value)}
                />
              </>
            )}

            {step === 1 && (
              <>
                <Field
                  label="GitHub"
                  placeholder="github.com/JoaquinGiorgis/proof-of-build"
                  value={draft.githubUrl}
                  autoFocus
                  onChange={(event) => set("githubUrl", event.target.value)}
                />
                <Field
                  label="Demo"
                  placeholder="proof-of-build.vercel.app"
                  hint="Optional — a link the judges can open."
                  value={draft.demoUrl}
                  onChange={(event) => set("demoUrl", event.target.value)}
                />
              </>
            )}

            {step === 2 && (
              <Field
                label="Builders"
                placeholder="Joaco · Luca · Artu"
                hint="Separate names with · or a comma."
                value={teamInput}
                autoFocus
                onChange={(event) => setTeamInput(event.target.value)}
              />
            )}

            {step === 3 && (
              <div className="flex flex-wrap gap-3">
                {event.tracks.map((track) => (
                  <TrackChip
                    key={track.slug}
                    selected={draft.trackSlug === track.slug}
                    onClick={() => set("trackSlug", track.slug)}
                    className="px-[26px] py-4"
                  >
                    {track.name}
                  </TrackChip>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="type-meta mt-5 text-text-secondary" role="alert">
              {error}
            </p>
          )}

          <div className="mt-7 flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={back} disabled={step === 0}>
              Back
            </Button>
            <Button onClick={next} disabled={!canContinue}>
              Continue
            </Button>
          </div>
        </div>

        {/* A quiet echo of what has been captured so far. */}
        {step > 0 && (
          <p className="type-meta mt-6 text-[rgb(255_255_255/0.3)]">
            {[draft.name, draft.team.length ? formatTeam(draft.team) : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}
