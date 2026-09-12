import { NextResponse } from "next/server";
import { z } from "zod";
import { peekClaimCode } from "@/lib/mutations";

/**
 * Checks a claim code so the create flow can tell the builder early that they
 * have the wrong one, instead of after they have filled in five steps.
 *
 * This does not spend a use and it is not what authorises anything — the
 * credential is gated in `/api/proofs/prepare`, which redeems the code in the
 * same transaction that writes the build. A client that skips this endpoint
 * gains nothing.
 */

export const runtime = "nodejs";

const bodySchema = z.object({
  code: z.string().trim().min(4).max(32),
});

const MESSAGES: Record<string, string> = {
  "unknown-code": "That code does not exist.",
  "wrong-event": "That code belongs to a different event.",
  expired: "That code has expired.",
  exhausted: "That code has been used up.",
  "already-claimed": "This wallet already has a build at this event.",
};

export async function POST(
  request: Request,
  { params }: RouteContext<"/api/events/[slug]/claim-code">,
) {
  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your code." }, { status: 400 });
  }

  const result = await peekClaimCode(parsed.data.code, slug);
  if (!result.ok) {
    return NextResponse.json(
      { error: MESSAGES[result.reason] ?? "That code is not valid." },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true });
}
