-- Anime Battle Arena: online private rooms and winner coin rewards.
-- Safe to run after 001_initial_schema.sql. Does not delete existing data.
create table if not exists public.multiplayer_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique check (room_code ~ '^[A-Z0-9]{6}$'),
  host_id uuid not null references auth.users(id) on delete cascade,
  guest_id uuid references auth.users(id) on delete set null,
  status text not null default 'waiting' check (status in ('waiting','active','finished')),
  state jsonb not null default '{}'::jsonb,
  winner_id uuid references auth.users(id) on delete set null,
  reward_claimed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (guest_id is null or guest_id <> host_id)
);
create index if not exists multiplayer_rooms_host_idx on public.multiplayer_rooms(host_id, created_at desc);
create index if not exists multiplayer_rooms_guest_idx on public.multiplayer_rooms(guest_id, created_at desc);
alter table public.multiplayer_rooms enable row level security;
drop policy if exists "Room participants can read" on public.multiplayer_rooms;
create policy "Room participants can read" on public.multiplayer_rooms for select to authenticated
  using (auth.uid() = host_id or auth.uid() = guest_id);
drop policy if exists "Authenticated players create own room" on public.multiplayer_rooms;
create policy "Authenticated players create own room" on public.multiplayer_rooms for insert to authenticated
  with check (auth.uid() = host_id and guest_id is null and winner_id is null and reward_claimed = false);
drop policy if exists "Room participants can update room" on public.multiplayer_rooms;
create policy "Room participants can update room" on public.multiplayer_rooms for update to authenticated
  using (auth.uid() = host_id or auth.uid() = guest_id)
  with check (auth.uid() = host_id or auth.uid() = guest_id);

create or replace function public.join_multiplayer_room(p_code text, p_fighter_id text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare r public.multiplayer_rooms%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in before joining a room.'; end if;
  if coalesce(length(trim(p_fighter_id)),0) = 0 then raise exception 'Choose a fighter first.'; end if;
  select * into r from public.multiplayer_rooms where room_code = upper(trim(p_code)) for update;
  if not found then raise exception 'Room code was not found.'; end if;
  if r.host_id = auth.uid() then raise exception 'You cannot join your own room with the same account.'; end if;
  if r.status <> 'waiting' or r.guest_id is not null then raise exception 'This room is already full.'; end if;
  update public.multiplayer_rooms set guest_id = auth.uid(), status = 'active',
    state = jsonb_set(jsonb_set(state, '{guestFighter}', to_jsonb(p_fighter_id)), '{logs}',
      coalesce(state->'logs','[]'::jsonb) || to_jsonb('Opponent joined. Host goes first.'::text)),
    updated_at = now()
  where id = r.id;
  return r.id;
end;
$$;

create or replace function public.claim_multiplayer_reward(p_room_id uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare r public.multiplayer_rooms%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in to claim rewards.'; end if;
  select * into r from public.multiplayer_rooms where id = p_room_id for update;
  if not found then raise exception 'Room not found.'; end if;
  if r.status <> 'finished' or r.winner_id <> auth.uid() then raise exception 'Only the winner of a finished room can claim this reward.'; end if;
  if r.reward_claimed then return 0; end if;
  insert into public.player_wallets(user_id, credits, updated_at)
    values(auth.uid(), 1350, now())
    on conflict(user_id) do update set credits = public.player_wallets.credits + 150, updated_at = now();
  update public.multiplayer_rooms set reward_claimed = true, updated_at = now() where id = p_room_id;
  return 150;
end;
$$;
revoke all on function public.join_multiplayer_room(text,text) from public;
revoke all on function public.claim_multiplayer_reward(uuid) from public;
grant execute on function public.join_multiplayer_room(text,text) to authenticated;
grant execute on function public.claim_multiplayer_reward(uuid) to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.multiplayer_rooms;
exception when duplicate_object then null;
when undefined_object then raise notice 'Publication supabase_realtime not found; enable Realtime for multiplayer_rooms in Supabase Dashboard.';
end $$;
