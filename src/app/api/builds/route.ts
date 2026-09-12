import { NextResponse } from "next/server";
import { listBuildsByWallet, listEvents } from "@/lib/queries";

/**
 * The builds registered under a wallet.
 *
 * Read-only and public: a build's whole point is that anybody can check it.
 * The wallet address is the identifier, so there is nothing to authenticate.
 */
export async function GET(request: Request) {
  const wallet = new URL(request.url).searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }
  // Base58, 32 bytes — anything else is not an address and we do not query on it.
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
    return NextResponse.json({ error: "invalid wallet" }, { status: 400 });
  }

  const [builds, events] = await Promise.all([
    listBuildsByWallet(wallet),
    listEvents(),
  ]);
  return NextResponse.json({ builds, events });
}
