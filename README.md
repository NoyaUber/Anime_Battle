# Anime Battle Arena

A deployable Next.js prototype for a fan-made character archive, local demo gacha, collection, and 1v1 battle simulation. The interface is designed for desktop and mobile.

## Current features

- Responsive dark interface with Dashboard, Fighter Archive, Summon Chamber, Battle Lab, and Collection pages.
- Search and rarity filtering in the character archive.
- Fighter dossier with Power, Speed, and Durability values.
- Demo gacha using 1,200 starting credits and 100 credits per pull.
- Local browser persistence for credits, pity counter, and recruited characters.
- Turn-based 1v1 skill battle prototype with four selectable moves, CPU response, HP bars, battle log, and Victory/Defeat popup.
- Optional Supabase schema foundation in `supabase/migrations/001_initial_schema.sql`.
- Runs in demo mode when Supabase environment variables are not set.

## Important scope limits

This is a working **prototype**, not the full production backend. Sample characters and their stats are fictional placeholders, not verified VSBW data or official canon outcomes. The battle algorithm is a transparent weighted-stat comparison, not a complete powerscaling engine. The displayed pity counter is a UI prototype: soft pity adjustments and a server-enforced hard pity are not implemented yet. Supabase email/password account creation and login are implemented. Cross-device collection/account sync, server-authoritative gacha, battle history persistence, and verified-source ingestion of all four abilities per fighter still need implementation.

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

The Account page uses Supabase Auth when the variables are configured. Adding the variables does not yet enable cross-device inventory or gacha sync. Never place the Supabase `service_role` key in a `NEXT_PUBLIC_` variable or browser code. Do not run this starter migration over an existing database without reviewing table and policy conflicts first.

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


## Expanded fiction roster and character images

The starter roster now includes anime/manga, comics, webnovels/novels, and SCP entries. The 0–100 Power/Speed/Durability values and rarity tiers are **game-balance estimates**, not official VS Battles Wiki statistics or canon verdicts. The selected profile title is stored per fighter so users can inspect the source page and version assumptions.

Character thumbnails are requested in one cached server-side batch from the VS Battles Wiki/Fandom MediaWiki PageImages API. If a page has no usable thumbnail, Fandom blocks the request, or the source changes, the UI falls back to initials; the app does not download or redistribute image files. Each character source link should be reviewed for correct continuity and image usage rights.

### Does this require new Supabase SQL?

No SQL is needed for the local demo roster, because the app currently reads `lib/characters.ts`. The existing `characters` table has `source_url` and `source_notes` but does not yet store the VSB page title or thumbnail. If you later switch the UI to read roster data from Supabase, add migration columns for `vsb_title`, `image_url`, `version_label`, and `stat_note`, then seed the character rows. Do not rerun the initial migration on an existing database.


## Account and skill battle update

- Open `/account` to create an account, sign in, or sign out using Supabase Auth. The account is managed by Supabase; the app does not store plaintext passwords.
- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel and configure Supabase Auth Site URL / Redirect URLs to match the deployment.
- Battle Lab now has four moves per fighter, turn-based HP, an automatic CPU response, cooldown display, battle log, and a Victory/Defeat popup.
- `lib/skills.ts` defines the move kit. The signature skill uses the roster's existing ability label; rapid attack, defensive stance, and ultimate are gameplay adaptations. They are **not** a verified extraction of four canonical VS Battles Wiki abilities for every character. The linked character profile is the reference to verify before competitive use.
- No new SQL migration is required for this update. Do not rerun the existing initial migration on a database where it has already been applied.

## Win rewards and online multiplayer

- Winning a single-player Battle Lab match grants 200 demo coins to the `aba-demo-save` browser wallet.
- The `/multiplayer` page supports authenticated private room creation, six-character join codes, realtime room updates, turn-based four-skill combat, battle logs, and a 150-coin winner reward through Supabase RPC.
- Existing Supabase projects must run `supabase/migrations/002_multiplayer_and_rewards.sql` once in SQL Editor after migration 001. Do not delete existing tables.
- Multiplayer requires both players to sign into the same Supabase-backed deployment. The turn state is currently client-submitted and is suitable as a prototype, not as an anti-cheat production economy.
