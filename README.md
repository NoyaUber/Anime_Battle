# Anime Battle Arena

A deployable Next.js prototype for a fan-made character archive, local demo gacha, collection, and 1v1 battle simulation. The interface is designed for desktop and mobile.

## Current features

- Responsive dark interface with Dashboard, Fighter Archive, Summon Chamber, Battle Lab, and Collection pages.
- Search and rarity filtering in the character archive.
- Fighter dossier with Power, Speed, and Durability values.
- Demo gacha using 1,200 starting credits and 100 credits per pull.
- Local browser persistence for credits, pity counter, and recruited characters.
- 1v1 weighted-stat battle prototype with a readable battle log.
- Optional Supabase schema foundation in `supabase/migrations/001_initial_schema.sql`.
- Runs in demo mode when Supabase environment variables are not set.

## Important scope limits

This is a working **prototype**, not the full production backend. Sample characters and their stats are fictional placeholders, not verified VSBW data or official canon outcomes. The battle algorithm is a transparent weighted-stat comparison, not a complete powerscaling engine. The displayed pity counter is a UI prototype: soft pity adjustments and a server-enforced hard pity are not implemented yet. Login, account sync, server-authoritative gacha, battle history persistence, and verified-source data ingestion still need implementation.

## Run locally

Requirements: Node.js 20+ recommended and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy to Vercel

1. Extract this ZIP.
2. Create a GitHub repository and upload the project files (including `package.json`, `app/`, `components/`, `lib/`, `public/`, `supabase/`, `tsconfig.json`, and `next.config.mjs`). Do not upload `node_modules`, `.next`, or `.env`.
3. In Vercel, choose **Add New → Project**, import the repository, and keep the framework preset as Next.js.
4. Deploy. No environment variables are required for the local demo UI.
5. If the build fails, open the deployment Build Logs and use the first actual error to troubleshoot.

## Optional Supabase foundation

1. Create a Supabase project.
2. Open **SQL Editor** and run `supabase/migrations/001_initial_schema.sql` once in a new project.
3. Copy the project URL and anon/public key into Vercel Project Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Redeploy after adding environment variables.

The current UI does not yet call Supabase for auth or gacha writes; adding the variables alone does not enable account sync. Never place the Supabase `service_role` key in a `NEXT_PUBLIC_` variable or browser code. Do not run this starter migration over an existing database without reviewing table and policy conflicts first.

## Gacha prototype values

| Rarity | Display rate |
|---|---:|
| Mythic | 1% |
| Legendary | 5% |
| Epic | 14% |
| Rare | 35% |
| Common | 45% |

These are illustrative values for the demo. The current pull code samples a rarity, then chooses a character of that rarity; when the sample archive has no character for a rolled rarity it falls back to a random character. That fallback is only for testing the interface and should be replaced by a server-side weighted pool before public release.

## Before public launch

- Implement Supabase Auth and protected user profiles.
- Move gacha selection, pity calculation, credit deduction, and inventory grants to a single transactional server-side function/RPC.
- Add server-side rate validation and a ledger to prevent duplicate or tampered pulls.
- Implement and test the exact soft-pity curve and hard-pity guarantee (planned 50/60 thresholds).
- Import sourced character data with source URLs, versioning, and review notes; distinguish sourced feats from game assumptions.
- Add automated tests for battle rules, gacha probabilities, RLS policies, and edge cases.
- Review VSBW and other source licensing/attribution requirements before redistributing copied content.

## Tech stack

- Next.js App Router, React, TypeScript
- Lucide icons
- Optional Supabase JS client and SQL foundation
- Vercel deployment
