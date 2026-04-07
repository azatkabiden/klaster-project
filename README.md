# KlasterAI

KlasterAI is a Next.js + Solana devnet MVP for fractional ownership of AI compute pools.
Operators submit vaults for review, admins bootstrap and approve them onchain, investors buy non-transferable Token-2022 shares, operators deposit revenue, and investors claim yield per vault.

## Runtime Modes

The repo intentionally supports two local modes:

- Seeded demo mode: the app renders seeded marketplace and workspace data and uses demo sessions for admin/operator/investor shells. This is the default local fallback when live auth/runtime secrets are missing.
- Live mode: wallet SIWS auth, Supabase-backed reads, Pinata metadata publishing, Helius webhook mirroring, and live admin/operator/investor transaction rails are enabled.

Seeded demo mode remains active locally when `SESSION_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, or `SUPABASE_SERVICE_ROLE_KEY` are not configured.

## Requirements

- Bun 1.x
- Node.js runtime compatible with Next.js 16
- Rust + Solana toolchain only if you need to build or test the Anchor program
- Supabase, Helius, and Pinata credentials for full live mode

## Quick Start

1. Install dependencies:

```bash
bun install
```

2. Copy the environment template:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
bun run dev
```

4. Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

If you leave the live-only secrets empty, the app boots into seeded demo mode and keeps the public/product surfaces explorable.

## Environment Setup

`.env.example` is grouped by:

- minimum local seeded/demo mode
- full live mode
- optional analytics/notification services

Live mode requires the env set from `docs/TECH_SPEC.md` plus a migrated Supabase schema and a deployed `klaster_vault` program id.

Important notes:

- `NEXT_PUBLIC_PROGRAM_ID_KLASTER_VAULT` is the client-facing program id used when building transactions.
- `PROGRAM_ID_KLASTER_VAULT` can mirror the same address for server-side or tooling workflows.
- `SOLANA_ADMIN_MULTISIG` is used as the platform treasury owner for approval and revenue flows.
- `USDC_MINT_ADDRESS` must match the active cluster.
- Leave `APP_REGION_BLOCKLIST` empty on the hackathon deployment so judge wallet sign-in is not region-blocked.

## Vercel Deployment

The app is intended to deploy as a standard Next.js project on Vercel.

Recommended deployment defaults:

- import the repo as a Next.js project
- keep the repo root as the working directory
- use the env values from `.env.example`
- set `NEXT_PUBLIC_APP_URL` to the final production URL
- leave `APP_REGION_BLOCKLIST` empty for the hackathon judge deployment

The current live deployment posture is tx-first:

- wallet sign-in, admin approval, operator deposit, and investor claim all execute on devnet
- Helius webhook mirroring is still treated as best-effort UI sync, so judges should not rely on immediate post-transaction read-model updates

## Core Scripts

- `bun run dev` — start the Next.js app
- `bun run build` — production build
- `bun run lint` — Biome checks
- `bun run typecheck` — Next route typegen + TypeScript
- `bun run test` — Vitest suite
- `bun run verify` — lint + typecheck + unit tests
- `bun run test:e2e` — Playwright browser tests
- `bun run program:build` — build the Anchor program
- `bun run program:test` — run the Rust program tests
- `bun run program:client` — regenerate the generated program client via Codama

## Verification Path

Use this order for a reproducible local verification pass:

```bash
bun run verify
bun run test:e2e
```

If you are changing the onchain program or generated client:

```bash
bun run program:test
bun run program:client
```

## Devnet Caveats

- The checkpoint is devnet-first. Mainnet is still blocked by explicit release approval and audit sign-off.
- Public purchase, admin approval, operator deposit, and investor claim flows require a valid devnet wallet plus full live runtime configuration.
- Seeded demo mode is for UI/product exploration only; it does not simulate durable live settlement.
- Webhook-driven Postgres mirrors are eventually consistent, so transaction submission success may refresh before the activity stream catches up.

## Manual Live QA

For full checkpoint QA on devnet:

1. Sign in with an admin wallet and approve a pending vault.
2. Buy shares from an investor wallet.
3. Deposit revenue from the operator wallet.
4. Claim yield from the investor wallet.
5. Verify Supabase/read-model surfaces reflect approval, revenue split, and claim indexing.
