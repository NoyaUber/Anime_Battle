'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Award, CalendarCheck, Coins, ExternalLink, Library, LogIn, Save, Swords, TrendingUp, Users } from 'lucide-react';
import { claimDaily, ensureStarterSave, getRank, DEFAULT_CREDITS, localDateKey } from '@/lib/progression';
import { characters } from '@/lib/characters';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/use-user';
import FighterPortrait from '@/components/fighter-portrait';
import { PROFILE_COLS, type PlayerProfile, errMsg, fighterFor } from '@/lib/social';

export default function ProfilePage() {
  const { user, configured } = useUser();
  const [loaded, setLoaded] = useState(false);
  const [points, setPoints] = useState(0);
  const [credits, setCredits] = useState(DEFAULT_CREDITS);
  const [owned, setOwned] = useState<string[]>([]);
  const [claimed, setClaimed] = useState(false);
  const [message, setMessage] = useState('');
  // identitas online
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const s = ensureStarterSave();
    setPoints(Number(s.rankPoints) || 0);
    setCredits(typeof s.credits === 'number' ? s.credits : DEFAULT_CREDITS);
    setOwned(Array.from(new Set(s.owned ?? [])));
    setClaimed(s.dailyClaimDate === localDateKey());
    setLoaded(true);
  }, []);

  useEffect(() => {
    const sb = supabase;
    if (!sb || !user) { setProfile(null); setFriendCount(null); return; }
    sb.from('profiles').select(PROFILE_COLS).eq('id', user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      const p = data as PlayerProfile;
      setProfile(p); setUsername(p.username ?? ''); setBio(p.bio ?? ''); setAvatar(p.avatar_character);
    });
    sb.from('friendships').select('id', { count: 'exact', head: true }).eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).then(({ count }) => setFriendCount(count ?? 0));
  }, [user]);

  const rank = getRank(points);
  const progress = rank.next === null ? 100 : Math.min(100, Math.max(0, ((points - rank.min) / (rank.next - rank.min)) * 100));
  const ownedFighters = useMemo(() => owned.map((id) => characters.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => !!c), [owned]);
  const shownAvatar = fighterFor(avatar ?? ownedFighters[0]?.id);
  const displayName = profile?.username || (user ? 'Memuat…' : 'Arena Rookie');

  function daily() { const r = claimDaily(); setCredits(r.credits); setClaimed(true); setMessage(r.message); }

  async function save() {
    const sb = supabase;
    if (!sb) return;
    setSaving(true); setNotice(null);
    const { error } = await sb.rpc('update_my_profile', { p_username: username, p_bio: bio, p_avatar: avatar ?? '', p_rank: points });
    if (error) setNotice({ kind: 'err', text: errMsg(error) + (/function|schema cache/i.test(errMsg(error)) ? ' (jalankan migrasi 003 di Supabase)' : '') });
    else { setNotice({ kind: 'ok', text: 'Profil tersimpan.' }); setProfile((p) => p && { ...p, username: username.trim(), bio: bio.trim(), avatar_character: avatar, rank_points: points }); }
    setSaving(false);
  }

  return <>
    <div className="page-heading"><div><div className="eyebrow">PLAYER DATA / COMPETITIVE PROFILE</div><h1>Player <span>Profile</span></h1><p>Identitas, rank, dan koin kamu. Profil online bisa dilihat teman dan pemain lain.</p></div>
      {profile?.username && <Link className="button button-ghost" href={`/u/${encodeURIComponent(profile.username)}`}><ExternalLink size={16}/> Lihat profil publik</Link>}</div>

    <section className="pf-hero">
      <div className="pf-portrait-wrap"><FighterPortrait fighter={shownAvatar} className="soc-avatar lg"/></div>
      <div className="pf-id">
        <div className="eyebrow">{user ? 'ARENA ID · ONLINE PLAYER' : 'ARENA ID · LOCAL PLAYER'}</div>
        <h2>{displayName}</h2>
        <p className="pf-bio">{profile?.bio || (user ? 'Tulis bio singkat di bawah.' : 'Fokus pada strategi, bukan hanya rarity karakter.')}</p>
        <div className="pf-chips"><span className="profile-rank-chip"><Award size={15}/>{rank.name.toUpperCase()} RANK</span></div>
      </div>
      <div className="pf-points"><small>RANK POINTS</small><strong>{points}</strong><span>{rank.next === null ? 'MAX RANK' : `${rank.next - points} poin ke rank berikutnya`}</span></div>
    </section>

    <div className="pf-stats">
      <article className="profile-stat"><div className="profile-stat-icon"><TrendingUp size={19}/></div><span>WIN / LOSS</span><b>+10 / −5 RP</b><small>Per pertandingan</small></article>
      <article className="profile-stat"><div className="profile-stat-icon coins"><Coins size={19}/></div><span>COINS</span><b>{credits.toLocaleString()}</b><small>Untuk gacha</small></article>
      <article className="profile-stat"><div className="profile-stat-icon"><Library size={19}/></div><span>FIGHTERS</span><b>{ownedFighters.length}<small className="pf-of"> / {characters.length}</small></b><small>Koleksi di perangkat ini</small></article>
      <article className="profile-stat"><div className="profile-stat-icon"><Users size={19}/></div><span>FRIENDS</span><b>{friendCount ?? '—'}</b><small>{user ? <Link href="/friends">Kelola teman →</Link> : 'Masuk untuk punya teman'}</small></article>
    </div>

    {!user && <section className="pf-login"><div><div className="eyebrow">ONLINE FEATURES</div><h3>Masuk untuk profil publik, teman, dan chat</h3><p>{configured ? 'Progress rank, koin, dan koleksi tetap tersimpan lokal. Akun dibutuhkan agar pemain lain bisa melihat profilmu.' : 'Supabase belum dikonfigurasi, jadi fitur online belum aktif.'}</p></div>{configured && <Link className="button button-primary" href="/account"><LogIn size={16}/> Sign in / Create account</Link>}</section>}

    {user && <section className="profile-panel pf-edit">
      <div className="section-head"><div><div className="eyebrow">PUBLIC IDENTITY</div><h2>Edit <span>profil</span></h2></div></div>
      <div className="pf-form">
        <label className="pf-field">Username<input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} placeholder="3–20 karakter: huruf, angka, _ . -"/></label>
        <label className="pf-field">Bio<textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} rows={3} placeholder="Ceritakan gaya bertarungmu…"/><small>{bio.length}/160</small></label>
        <div className="pf-field">Avatar (pilih dari fighter yang kamu miliki)
          <div className="pf-avatar-grid">{ownedFighters.map((f) => <button type="button" key={f.id} title={f.name} aria-pressed={avatar === f.id} className={`pf-pick ${avatar === f.id ? 'selected' : ''}`} onClick={() => setAvatar(f.id)}><FighterPortrait fighter={f} className="soc-avatar"/></button>)}</div>
        </div>
      </div>
      {notice && <div className={`soc-notice ${notice.kind}`}>{notice.text}</div>}
      <button className="button button-primary" onClick={save} disabled={saving || !username.trim()}><Save size={16}/> {saving ? 'Menyimpan…' : 'Simpan profil'}</button>
    </section>}

    <section className="profile-panel"><div className="section-head"><div><div className="eyebrow">RANK PROGRESSION</div><h2>Climb the <span>ladder</span></h2></div><span className="profile-rank-chip"><Award size={15}/>{rank.name}</span></div>
      <div className="rank-progress-label"><span>{points} RP</span><span>{rank.next === null ? 'Rank maksimum' : `${rank.next} RP`}</span></div>
      <div className="rank-progress-track"><i style={{ width: `${progress}%` }}/></div>
      <div className="rank-ladder">{[{ name: 'Rookie', min: 0 }, { name: 'Bronze', min: 100 }, { name: 'Silver', min: 300 }, { name: 'Gold', min: 600 }, { name: 'Platinum', min: 1000 }, { name: 'Diamond', min: 1500 }].map((r, i) => <div key={r.name} className={`rank-step ${points >= r.min ? 'unlocked' : ''} ${rank.name === r.name ? 'current' : ''}`}><span>{i + 1}</span><b>{r.name}</b><small>{r.min} RP</small></div>)}</div>
    </section>

    <section className="daily-panel"><div className="daily-icon"><CalendarCheck size={25}/></div><div className="daily-copy"><div className="eyebrow">DAILY SUPPLY DROP</div><h2>Daily <span>Claim</span></h2><p>Klaim 500 koin sekali setiap hari untuk membantu mengembangkan koleksimu.</p>{message && <small className="daily-message">{message}</small>}</div>
      <button className="button button-primary daily-button" disabled={!loaded || claimed} onClick={daily}><Coins size={17}/>{claimed ? 'Claimed Today' : '+500 Claim'}</button></section>

    <div className="profile-note">Koin, koleksi, dan daily claim tersimpan di browser/perangkat ini. Rank point disinkronkan ke profil publik saat kamu online, tetapi masih dihitung di perangkat (belum divalidasi server).</div>
    <div className="hero-actions"><Link className="button button-primary" href="/battle"><Swords size={16}/> Play Battle</Link><Link className="button button-ghost" href="/gacha"><Coins size={16}/> Open Gacha</Link></div>
  </>;
}
