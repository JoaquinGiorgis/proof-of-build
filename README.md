# Proof of Build

A verifiable record of what you actually shipped. Builders register a build at
an event and claim a credential onchain; anyone can check the claim without
asking us.

First issuer: **Córdoba Hack 2026 · Naranja X**.

## What the credential is

A **Token-2022 mint** with three things set at creation:

| Extension | Why |
|---|---|
| `NonTransferable` | A record of what you built is not a tradable asset. |
| `MetadataPointer` | Points at the mint itself. |
| `TokenMetadata` | Name, symbol, uri and the build's facts, onchain. |

Supply is one, decimals zero, and the mint authority is revoked in the same
transaction — no second copy can ever exist. Do not call it an NFT.

Only public facts go onchain: project, track, event, team, wallet. Nothing
personal — a chain is public and indelible.

## Stack

Follows [Superteam Argentina's Solana guide](https://superteam.ar/stack); the
rules file it ships is committed at [`docs/SOLANA-RULES.md`](docs/SOLANA-RULES.md)
and the full guide at [`docs/superteam-solana-stack.md`](docs/superteam-solana-stack.md).

- **Next.js 16** (App Router, Turbopack) · **React 19** · **Tailwind v4**
- **`@solana/kit` v8** + `kit-plugin-wallet` (Wallet Standard) and
  `kit-plugin-rpc`. No `web3.js` v1, no `wallet-adapter`.
- **`@solana-program/token-2022`** for the credential.
- **Drizzle + Postgres (Supabase)** for the content behind the proof.
- Network: **devnet**, always.

## Running it

```bash
pnpm install
cp .env.example .env.local
pnpm issuer:keygen          # prints ISSUER_SECRET_KEY — paste it into .env.local
solana airdrop 1 <issuer address> --url devnet
pnpm dev
```

The screens render on seed data (`src/lib/mock.ts`) until `DATABASE_URL` is
set; `src/lib/queries.ts` is the single seam between the screens and the data
source.

| Script | What it does |
|---|---|
| `pnpm dev` | Dev server on :3000 |
| `pnpm build` | Production build (typechecks) |
| `pnpm lint` / `pnpm typecheck` | ESLint / `tsc --noEmit` |
| `pnpm issuer:keygen` | Generates the issuer keypair |
| `pnpm db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzle Kit |

## How a proof is issued

A credential carries the event's signature, so it is not handed to whoever
shows up with a wallet. There are two ways in, and one Solana path.

**A signed link** (`/claim?t=…`). The event's own system already verified what
the team shipped, so it signs a payload (HMAC-SHA256, shared
`CLAIM_LINK_SECRET`) and Proof of Build honours the signature. Nothing is
typed: the builder sees the exact credential, connects a wallet and mints. The
payload carries the team's id, so every member of a team lands on **one** build
and claims their own credential against it. See
[`src/lib/claim-link.ts`](src/lib/claim-link.ts).

**A claim code** (`/create?event=…`). The event hands out a code bounded by
`max_uses` and `expires_at`; one registration per wallet per event. For events
with no system of their own.

Then, either way:

1. `POST /api/proofs/prepare` — the server authorises the claim, writes the
   build, and signs the Token-2022 transaction as the **issuer** and as the new
   **mint**. The issuer key never leaves the server. On the code path, redeeming
   is a single conditional `UPDATE`, so two builders racing for a code's last
   use cannot both win.
2. The browser's wallet adds the **fee-payer** signature and broadcasts it. The
   builder pays the fee and the rent (~0.002 SOL). Their key never leaves the
   wallet.
3. `POST /api/proofs/confirm` — the server checks the signature landed,
   succeeded, **and involves the mint we issued**, before anything is recorded.
   A signature is not a proof. The name on the credential comes from the signed
   link, never from the request.

Events are added by seed, never self-serve: put one in `src/lib/mock.ts` and
run `pnpm db:seed`. Re-seeding never refunds spent code uses.

## Design

Built from the Figma file *Proof of Build — MVP*
(`MYecCva4jZgIAjO7YoqGdR`). One palette: black base, white at 72 / 45 / 12 / 8 /
6 / 3.5 %. The golden ninja is the only chromatic element; everything else is
lighting, reflection, glass and grain. Tokens live in
[`src/app/globals.css`](src/app/globals.css); the hero shader is
[`src/components/liquid-black.tsx`](src/components/liquid-black.tsx).

## Layout

```
src/
  app/            routes — /, /explore, /events/[slug], /create, /b/[slug], /u/[wallet], /builds, /about
    api/          builds, proofs/prepare, proofs/confirm, proofs/[slug]/metadata
  components/     screens and primitives (ui/ holds the Figma component set)
  db/             Drizzle schema + connection
  lib/            domain types, queries, solana client / issuer / credential
```
