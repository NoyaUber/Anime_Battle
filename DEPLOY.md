# Deploy checklist

## Vercel
1. Extract this ZIP.
2. Upload the project contents to a GitHub repository.
3. Import the repository at https://vercel.com/new.
4. In Vercel → Project Settings → Environment Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL` — Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase publishable/anon key
5. In Supabase → Authentication → URL Configuration, set the Site URL to the deployed Vercel URL and add that URL to Redirect URLs.
6. Redeploy after changing environment variables.

Without the two Supabase variables, the rest of the app runs in demo mode and the Account page explains that authentication is unavailable.

## Supabase SQL
The existing `supabase/migrations/001_initial_schema.sql` is the starter schema. If it was already run on the same project, do not run it again blindly. The account screen uses Supabase Auth directly and does not require another SQL migration. Collection/gacha syncing to a signed-in account is not implemented by this update yet.

## Local development
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Battle rules
Battle Lab is now a turn-based prototype: choose one of four moves, then the CPU fighter responds. HP reaches zero to end the match; a Victory/Defeat popup appears. Damage, hit chance, cooldowns and defensive stance are game mechanics, not official VS Battles Wiki statistics.

Each fighter's first skill uses the roster's existing `ability` label and profile link. The other moves (rapid attack, defensive stance, and ultimate adaptation) are game-design placeholders, not a verified extraction of four canon abilities from every VS Battles Wiki page. Verify each character's exact version and ability list before claiming that a move is source-verified.

## Security notes
Never add a Supabase `service_role` key to frontend code or a `NEXT_PUBLIC_` variable. Account authentication is implemented, but cross-device inventory, gacha wallet, and battle-history persistence still need secure server-side/RPC integration.

## Update: win rewards and multiplayer rooms

If you already ran `supabase/migrations/001_initial_schema.sql`, open Supabase Dashboard → SQL Editor and run **only** `supabase/migrations/002_multiplayer_and_rewards.sql`. Do not rerun or delete the existing schema. This adds private room storage, Realtime subscriptions, a room-join RPC, and an idempotent 150-credit winner reward RPC.

After the SQL completes, verify that `multiplayer_rooms` is included in Supabase Realtime (the migration attempts to add it to `supabase_realtime`). Sign in at `/account`, open `/multiplayer`, create a room, and send the six-character code to a friend who also has an account on the same deployed app.

Single-player Battle Lab wins award **200 demo coins** in browser storage. Multiplayer wins award **150 coins** through the Supabase wallet RPC and also update the local demo wallet shown by the current gacha UI. This is a prototype economy: the current multiplayer turn state is still submitted by clients and should be moved to server-validated actions before using competitive rankings or valuable persistent currency.


### New profile/rank/gacha UI
No new SQL migration is needed for the current local-demo Profile & Rank, daily claim, starter roster, or 10-pull gacha. These values are stored in the current browser's `aba-demo-save`; they do not sync across devices. Keep the existing SQL migrations for multiplayer as documented above.


## Update: profil publik, teman, dan chat global
Jalankan **hanya** `supabase/migrations/003_social_profile_friends_chat.sql` di Supabase → SQL Editor (setelah 001 dan 002; aman dijalankan ulang). Migrasi ini:
- menambah kolom profil (`bio`, `avatar_character`, `rank_points`, `last_seen`), membuat profil otomatis untuk akun baru, dan mengisi profil akun lama;
- membuat tabel `friendships` (permintaan teman) dan `chat_messages` (chat global) lengkap dengan RLS, batas spam (5 pesan / 10 detik), dan Realtime;
- mengubah edit profil agar lewat fungsi `update_my_profile` (validasi username/bio). Policy update langsung ke `profiles` dihapus.

Halaman baru: `/friends` (daftar teman, permintaan, cari & tambah), `/chat` (chat global realtime), `/u/<username>` (profil publik + tombol tambah teman), dan `/profile` yang dirombak (edit username, bio, avatar).

Tips uji coba: buat 2 akun (browser biasa + jendela incognito). Jika "Confirm email" aktif di Supabase Auth, nonaktifkan sementara saat testing. Pastikan Realtime aktif untuk `chat_messages` dan `friendships` (Database → Replication).

Catatan keamanan: rank point masih dihitung di perangkat pemain lalu disinkronkan ke profil, jadi belum anti-curang. Profil (username, bio, avatar, rank) terlihat oleh semua pemain yang login; email tidak pernah dibagikan. Belum ada fitur block/report maupun moderasi chat; pertimbangkan sebelum dibuka untuk umum.
