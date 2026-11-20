-- Persist each player's gacha pity counter using the table created in migration 001.
-- The summon roll remains client-side in this prototype; this RPC persists the
-- counter but does not make the roll or pity value authoritative.

update public.gacha_pity
set pulls_since_mythic = least(pulls_since_mythic, 60)
where pulls_since_mythic > 60;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gacha_pity_pulls_since_mythic_max'
      and conrelid = 'public.gacha_pity'::regclass
  ) then
    alter table public.gacha_pity
      add constraint gacha_pity_pulls_since_mythic_max
      check (pulls_since_mythic between 0 and 60) not valid;
  end if;
end;
$$;

alter table public.gacha_pity
  validate constraint gacha_pity_pulls_since_mythic_max;
alter table public.gacha_pity enable row level security;

drop policy if exists "Pity view own" on public.gacha_pity;
create policy "Pity view own"
  on public.gacha_pity for select to authenticated
  using (auth.uid() = user_id);

revoke all on table public.gacha_pity from anon, authenticated;
grant select on table public.gacha_pity to authenticated;

create or replace function public.save_my_gacha_pity(p_pulls_since_mythic integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_pity integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in to save gacha pity.';
  end if;
  if p_pulls_since_mythic is null or p_pulls_since_mythic not between 0 and 60 then
    raise exception 'Pity counter must be between 0 and 60.';
  end if;

  insert into public.gacha_pity (user_id, pulls_since_mythic, updated_at)
  values (auth.uid(), p_pulls_since_mythic, now())
  on conflict (user_id) do update
    set pulls_since_mythic = excluded.pulls_since_mythic,
        updated_at = now()
  returning pulls_since_mythic into saved_pity;

  return saved_pity;
end;
$$;

revoke all on function public.save_my_gacha_pity(integer) from public, anon, authenticated;
grant execute on function public.save_my_gacha_pity(integer) to authenticated;
comment on function public.save_my_gacha_pity(integer)
  is 'Persists the client-side pity counter only; it does not validate a gacha roll.';
