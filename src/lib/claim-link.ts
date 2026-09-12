import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * The signed claim link.
 *
 * An event's own system already knows who shipped what — it verified the repo
 * and stamped the submission. That knowledge *is* the issuer's attestation, so
 * rather than make a builder retype it behind a shared code, the event signs a
 * link and Proof of Build honours the signature.
 *
 * The payload travels in the URL, so it is readable by whoever holds the link.
 * That is fine: everything in it is already public on the build's own page.
 * Nothing personal goes in here — no email, no phone. What the signature buys
 * is integrity, not secrecy: you cannot edit the project, the team or the
 * event and still have it verify.
 *
 * Shared secret with the event's system, out of `CLAIM_LINK_SECRET`. Same
 * value on both sides, never in the client bundle.
 */

export const claimPayloadSchema = z.object({
  /** Which event signed this. Must match an event on the platform. */
  ev: z.string().min(1).max(64),
  /** The team's id in the event's system — one build per team. */
  team: z.string().min(1).max(64),
  /** Project name. */
  n: z.string().trim().min(1).max(64),
  /** One-line description. */
  d: z.string().trim().min(1).max(280),
  /** Track slug, validated against the event's tracks on arrival. */
  tr: z.string().min(1).max(64),
  /** Repo and demo, already normalised by the issuer. */
  gh: z.string().max(200).optional().default(""),
  live: z.string().max(200).optional().default(""),
  /** The team, in the order they want to be credited. */
  team_names: z.array(z.string().trim().min(1).max(80)).min(1).max(12),
  /** How THIS builder is credited on their own card. */
  builder: z.string().trim().min(1).max(80),
  /** Seconds since the epoch. A link is not valid forever. */
  exp: z.number().int().positive(),
});

export type ClaimPayload = z.infer<typeof claimPayloadSchema>;

export type ClaimVerdict =
  | { ok: true; payload: ClaimPayload }
  | { ok: false; reason: "malformed" | "bad-signature" | "expired" };

function secret() {
  const value = process.env.CLAIM_LINK_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "CLAIM_LINK_SECRET is missing or too short (needs 32+ chars).",
    );
  }
  return value;
}

function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

/** `<base64url(payload)>.<base64url(hmac)>` — compact enough for a QR. */
export function createClaimToken(payload: ClaimPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyClaimToken(token: string): ClaimVerdict {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [body, signature] = parts;

  // Compare in constant time: a fast-failing comparison leaks, byte by byte,
  // what the right signature would have been.
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, reason: "bad-signature" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }

  const result = claimPayloadSchema.safeParse(parsed);
  if (!result.success) return { ok: false, reason: "malformed" };

  // Checked after the signature on purpose: an expired-but-valid link and a
  // forged one are different problems, and only one of them is the builder's.
  if (result.data.exp * 1000 <= Date.now()) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, payload: result.data };
}
