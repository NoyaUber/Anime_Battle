-- Anime Battle Arena: profil publik, sistem teman, dan chat global.
-- Jalankan SETELAH 001 dan 002. Aman dijalankan ulang (idempotent). Tidak menghapus data pemain.

-- ============================================================
-- 1) PROFIL
-- ============================================================
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists avatar_character text;
alter table public.profiles add column if not exists rank_points integer not null default 0;
alter table public.profiles add column if not exists last_seen timestamptz;

do $$ begin
  alter table public.profiles add constraint profiles_bio_len check (char_length(bio) <= 160);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_rank_range check (rank_points between 0 and 100000);
exception when duplicate_object then null; end $$;
do $$ begin
  -- NOT VALID: baris lama tidak diperiksa ulang, hanya perubahan baru.
  alter table public.profiles add constraint profiles_username_format
    check (username is null or username ~ '^[A-Za-z0-9_.-]{3,20}$') not valid;
exception when duplicate_object then null; end $$;

create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));
create index if not exists profiles_last_seen_idx on public.profiles (last_seen desc);

-- Buat profil otomatis untuk akun baru (username diambil dari form pendaftaran, dibersihkan & dibuat unik).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare base text; candidate text; n int := 0;
begin
  base := regexp_replace(coalesce(nullif(new.raw_user_meta_data->>'username',''), split_part(coalesce(new.email,''),'@',1), 'player'), '[^A-Za-z0-9_.-]', '', 'g');
  if char_length(base) < 3 then base := 'player' || base; end if;
  base := left(base, 16);
  candidate := base;
  while exists (select 1 from public.profiles where lower(username) = lower(candidate)) and n < 20 loop
    n := n + 1;
    candidate := base || floor(random() * 9000 + 1000)::int;
  end loop;
  insert into public.profiles (id, username) values (new.id, candidate) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Backfill akun yang sudah ada.
insert into public.profiles (id, username)
select u.id, 'player' || substr(replace(u.id::text, '-', ''), 1, 8) from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
update public.profiles set username = 'player' || substr(replace(id::text, '-', ''), 1, 8) where username is null;

-- Pemain yang login boleh melihat profil publik pemain lain (tanpa email).
drop policy if exists "Profiles readable by players" on public.profiles;
create policy "Profiles readable by players" on public.profiles for select to authenticated using (true);
-- Edit profil hanya lewat RPC di bawah (validasi username/bio), bukan update langsung.
drop policy if exists "Profiles update own" on public.profiles;

create or replace function public.update_my_profile(p_username text, p_bio text, p_avatar text, p_rank integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Masuk dulu untuk mengubah profil.'; end if;
  p_username := trim(coalesce(p_username, ''));
  if p_username !~ '^[A-Za-z0-9_.-]{3,20}$' then
    raise exception 'Username harus 3–20 karakter: huruf, angka, _ . atau -';
  end if;
  if exists (select 1 from public.profiles where lower(username) = lower(p_username) and id <> auth.uid()) then
    raise exception 'Username sudah dipakai pemain lain.';
  end if;
  update public.profiles set
    username = p_username,
    bio = left(trim(coalesce(p_bio, '')), 160),
    avatar_character = nullif(left(trim(coalesce(p_avatar, '')), 60), ''),
    rank_points = greatest(0, least(coalesce(p_rank, rank_points), 100000))
  where id = auth.uid();
end;
$$;

-- Penanda "online" + sinkron rank (rank masih dihitung di perangkat pemain: prototipe, belum anti-curang).
create or replace function public.touch_presence(p_rank integer default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  update public.profiles set last_seen = now(),
    rank_points = case when p_rank is null then rank_points else greatest(0, least(p_rank, 100000)) end
  where id = auth.uid();
end;
$$;

-- ============================================================
-- 2) TEMAN
-- ============================================================
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;
drop policy if exists "Friendships visible to both parties" on public.friendships;
create policy "Friendships visible to both parties" on public.friendships for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
-- Tidak ada policy insert/update/delete: semua perubahan lewat RPC di bawah.

create or replace function public.send_friend_request(p_username text)
returns text language plpgsql security definer set search_path = public as $$
declare target uuid; f public.friendships%rowtype;
begin
  if auth.uid() is null then raise exception 'Masuk dulu untuk menambah teman.'; end if;
  select id into target from public.profiles where lower(username) = lower(trim(coalesce(p_username, '')));
  if target is null then raise exception 'Pemain dengan username itu tidak ditemukan.'; end if;
  if target = auth.uid() then raise exception 'Kamu tidak bisa menambahkan dirimu sendiri.'; end if;

  select * into f from public.friendships
   where least(requester_id, addressee_id) = least(auth.uid(), target)
     and greatest(requester_id, addressee_id) = greatest(auth.uid(), target);
  if found then
    if f.status = 'accepted' then raise exception 'Kalian sudah berteman.'; end if;
    if f.requester_id = auth.uid() then raise exception 'Permintaan sudah terkirim. Tunggu dia menerima.'; end if;
    -- Dia sudah lebih dulu mengirim permintaan ke kamu: langsung jadi teman.
    update public.friendships set status = 'accepted', responded_at = now() where id = f.id;
    return 'accepted';
  end if;

  if (select count(*) from public.friendships where requester_id = auth.uid() and status = 'pending') >= 30 then
    raise exception 'Terlalu banyak permintaan yang masih tertunda (maks. 30).';
  end if;
  insert into public.friendships (requester_id, addressee_id) values (auth.uid(), target);
  return 'sent';
end;
$$;

create or replace function public.respond_friend_request(p_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare f public.friendships%rowtype;
begin
  if auth.uid() is null then raise exception 'Masuk dulu.'; end if;
  select * into f from public.friendships where id = p_id for update;
  if not found or f.addressee_id <> auth.uid() or f.status <> 'pending' then
    raise exception 'Permintaan pertemanan tidak ditemukan.';
  end if;
  if p_accept then
    update public.friendships set status = 'accepted', responded_at = now() where id = p_id;
  else
    delete from public.friendships where id = p_id;
  end if;
end;
$$;

-- Dipakai untuk: hapus teman, batalkan permintaan terkirim.
create or replace function public.remove_friendship(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Masuk dulu.'; end if;
  delete from public.friendships where id = p_id and (requester_id = auth.uid() or addressee_id = auth.uid());
end;
$$;

-- ============================================================
-- 3) CHAT GLOBAL
-- ============================================================
create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null default '',
  avatar_character text,
  content text not null check (char_length(content) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_created_idx on public.chat_messages (created_at desc);

alter table public.chat_messages enable row level security;
drop policy if exists "Chat readable by players" on public.chat_messages;
create policy "Chat readable by players" on public.chat_messages for select to authenticated using (true);
drop policy if exists "Players post own chat" on public.chat_messages;
create policy "Players post own chat" on public.chat_messages for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Players delete own chat" on public.chat_messages;
create policy "Players delete own chat" on public.chat_messages for delete to authenticated using (auth.uid() = user_id);

-- Isi nama/avatar dari profil (tidak bisa dipalsukan klien), rapikan teks, dan batasi spam (maks. 5 pesan / 10 detik).
create or replace function public.chat_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare p public.profiles%rowtype;
begin
  select * into p from public.profiles where id = new.user_id;
  new.username := coalesce(p.username, 'Player');
  new.avatar_character := p.avatar_character;
  new.content := trim(regexp_replace(new.content, '\s+', ' ', 'g'));
  if (select count(*) from public.chat_messages where user_id = new.user_id and created_at > now() - interval '10 seconds') >= 5 then
    raise exception 'Terlalu cepat. Tunggu beberapa detik sebelum mengirim lagi.';
  end if;
  return new;
end;
$$;
drop trigger if exists chat_before_insert_trg on public.chat_messages;
create trigger chat_before_insert_trg before insert on public.chat_messages for each row execute function public.chat_before_insert();

-- ============================================================
-- 4) HAK AKSES RPC + REALTIME
-- ============================================================
revoke all on function public.update_my_profile(text,text,text,integer) from public;
revoke all on function public.touch_presence(integer) from public;
revoke all on function public.send_friend_request(text) from public;
revoke all on function public.respond_friend_request(uuid,boolean) from public;
revoke all on function public.remove_friendship(uuid) from public;
grant execute on function public.update_my_profile(text,text,text,integer) to authenticated;
grant execute on function public.touch_presence(integer) to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid,boolean) to authenticated;
grant execute on function public.remove_friendship(uuid) to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null;
when undefined_object then raise notice 'Publication supabase_realtime tidak ditemukan; aktifkan Realtime untuk chat_messages di Dashboard.';
end $$;
do $$ begin
  alter publication supabase_realtime add table public.friendships;
exception when duplicate_object then null;
when undefined_object then raise notice 'Publication supabase_realtime tidak ditemukan; aktifkan Realtime untuk friendships di Dashboard.';
end $$;
