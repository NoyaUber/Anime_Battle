-- Account-scoped collection storage. The client may only merge IDs for its own user;
-- direct table writes are disabled. Gacha rolls remain client-side in this prototype.
create table if not exists public.player_character_collections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  character_ids text[] not null default '{}'::text[],
  updated_at timestamptz not null default now(),
  constraint player_character_collections_limit check (cardinality(character_ids) <= 200)
);

alter table public.player_character_collections enable row level security;
drop policy if exists "Players read own character collection" on public.player_character_collections;
create policy "Players read own character collection"
  on public.player_character_collections for select to authenticated
  using (auth.uid() = user_id);

revoke all on table public.player_character_collections from anon, authenticated;
grant select on table public.player_character_collections to authenticated;

create or replace function public.merge_my_character_collection(p_character_ids text[])
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_ids text[];
  saved_ids text[];
begin
  if auth.uid() is null then
    raise exception 'Sign in to save your character collection.';
  end if;
  if cardinality(coalesce(p_character_ids, '{}'::text[])) > 200 then
    raise exception 'Too many character IDs.';
  end if;

  select coalesce(array_agg(id order by id), '{}'::text[])
    into clean_ids
    from (
      select distinct trim(input.id) as id
      from unnest(coalesce(p_character_ids, '{}'::text[])) as input(id)
      where input.id is not null
        and trim(input.id) ~ '^[a-z0-9][a-z0-9_-]{0,79}$'
    ) valid_ids;

  insert into public.player_character_collections as current_collection (user_id, character_ids, updated_at)
  values (auth.uid(), clean_ids, now())
  on conflict (user_id) do update
    set character_ids = (
          select coalesce(array_agg(id order by id), '{}'::text[])
          from (
            select distinct trim(input.id) as id
            from unnest(current_collection.character_ids || excluded.character_ids) as input(id)
            where input.id is not null
              and trim(input.id) ~ '^[a-z0-9][a-z0-9_-]{0,79}$'
          ) merged_ids
        ),
        updated_at = now()
  returning character_ids into saved_ids;

  return saved_ids;
end;
$$;

revoke all on function public.merge_my_character_collection(text[]) from public;
grant execute on function public.merge_my_character_collection(text[]) to authenticated;
