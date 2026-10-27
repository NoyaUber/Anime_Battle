-- Optional database foundation. The UI currently runs in local demo mode without Supabase.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  created_at timestamptz not null default now()
);
create table if not exists public.characters (
  id text primary key,
  name text not null,
  universe text not null,
  rarity text not null check (rarity in ('Common','Rare','Epic','Legendary','Mythic')),
  power integer not null default 0 check (power between 0 and 100),
  speed integer not null default 0 check (speed between 0 and 100),
  durability integer not null default 0 check (durability between 0 and 100),
  ability text not null default '',
  description text not null default '',
  source_url text,
  source_notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.player_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credits bigint not null default 1200 check (credits >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.player_inventory (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id text not null references public.characters(id) on delete restrict,
  obtained_at timestamptz not null default now()
);
create table if not exists public.gacha_pity (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pulls_since_mythic integer not null default 0 check (pulls_since_mythic >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  fighter_a text not null references public.characters(id),
  fighter_b text not null references public.characters(id),
  ruleset jsonb not null default '{"mode":"lore","format":"1v1","prep":"full","mindset":"character","win":"ko"}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists player_inventory_user_idx on public.player_inventory(user_id);
create index if not exists battles_user_created_idx on public.battles(user_id, created_at desc);
alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.player_wallets enable row level security;
alter table public.player_inventory enable row level security;
alter table public.gacha_pity enable row level security;
alter table public.battles enable row level security;
drop policy if exists "Profiles view own" on public.profiles;
create policy "Profiles view own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Profiles update own" on public.profiles;
create policy "Profiles update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "Characters readable by everyone" on public.characters;
create policy "Characters readable by everyone" on public.characters for select using (true);
drop policy if exists "Wallet view own" on public.player_wallets;
create policy "Wallet view own" on public.player_wallets for select using (auth.uid() = user_id);
drop policy if exists "Inventory view own" on public.player_inventory;
create policy "Inventory view own" on public.player_inventory for select using (auth.uid() = user_id);
drop policy if exists "Pity view own" on public.gacha_pity;
create policy "Pity view own" on public.gacha_pity for select using (auth.uid() = user_id);
drop policy if exists "Battles view own" on public.battles;
create policy "Battles view own" on public.battles for select using (auth.uid() = user_id);
-- Important: writes for wallets, inventory and pity should be done by trusted server-side RPC/functions,
-- not by exposing service_role credentials to the browser. Do not seed fictional demo stats as verified canon.
