'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Award, Check, Clock, MessageSquare, Pencil, UserMinus, UserPlus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getRank } from '@/lib/progression';
import AuthGate from '@/components/auth-gate';
import FighterPortrait from '@/components/fighter-portrait';
import { PROFILE_COLS, type Friendship, type PlayerProfile, errMsg, escapeLike, fighterFor, formatDate, isOnline, timeAgo } from '@/lib/social';

function PublicProfile({ userId }: { userId: string }) {
  const params = useParams<{ username: string }>();
  const wanted = decodeURIComponent(String(params?.username ?? ''));
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [rel, setRel] = useState<Friendship | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    const sb = supabase;
    if (!sb) return;
    const { data: p } = await sb.from('profiles').select(PROFILE_COLS).ilike('username', escapeLike(wanted)).limit(1).maybeSingle();
    setProfile((p as PlayerProfile) ?? null);
    if (p && p.id !== userId) {
      const { data: f } = await sb.from('friendships').select('*')
        .or(`and(requester_id.eq.${userId},addressee_id.eq.${p.id}),and(requester_id.eq.${p.id},addressee_id.eq.${userId})`).maybeSingle();
      setRel((f as Friendship) ?? null);
    } else setRel(null);
    setLoading(false);
  }, [wanted, userId]);
  useEffect(() => { setLoading(true); load(); }, [load]);

  async function act(fn: () => PromiseLike<{ data?: unknown; error: unknown }>, ok: string) {
    setBusy(true); setNotice(null);
    const { error } = await fn();
    if (error) setNotice({ kind: 'err', text: errMsg(error) }); else { setNotice({ kind: 'ok', text: ok }); await load(); }
    setBusy(false);
  }
  const sb = supabase;

  if (loading) return <div className="soc-empty"><p>Memuat profil…</p></div>;
  if (!profile) return <div className="soc-empty"><h3>Pemain tidak ditemukan</h3><p>Tidak ada pemain dengan username “{wanted}”.</p><Link className="button button-ghost" href="/friends">Cari pemain</Link></div>;

  const rank = getRank(profile.rank_points);
  const on = isOnline(profile.last_seen);
  const mine = profile.id === userId;
  const name = profile.username || 'Player';
  return <>
    <section className="pf-hero">
      <div className="pf-portrait-wrap"><FighterPortrait fighter={fighterFor(profile.avatar_character)} className="soc-avatar lg"/><i className={`soc-dot lg ${on ? 'on' : ''}`}/></div>
      <div className="pf-id">
        <div className="eyebrow">PLAYER PROFILE · {on ? 'ONLINE' : `AKTIF ${timeAgo(profile.last_seen).toUpperCase()}`}</div>
        <h2>{name}</h2>
        <p className="pf-bio">{profile.bio || 'Belum menulis bio.'}</p>
        <div className="pf-chips"><span className="profile-rank-chip"><Award size={15}/>{rank.name.toUpperCase()} RANK</span><span className="pf-chip">Bergabung {formatDate(profile.created_at)}</span></div>
      </div>
      <div className="pf-points"><small>RANK POINTS</small><strong>{profile.rank_points}</strong><span>{rank.next === null ? 'MAX RANK' : `${rank.next - profile.rank_points} poin ke rank berikutnya`}</span></div>
    </section>
    {notice && <div className={`soc-notice ${notice.kind}`}>{notice.text}</div>}
    <div className="pf-actions">
      {mine ? <Link className="button button-primary" href="/profile"><Pencil size={16}/> Edit profilku</Link> : <>
        {!rel && <button className="button button-primary" disabled={busy} onClick={() => sb && act(() => sb.rpc('send_friend_request', { p_username: name }), `Permintaan dikirim ke ${name}.`)}><UserPlus size={16}/> Tambah teman</button>}
        {rel?.status === 'pending' && rel.requester_id === userId && <button className="button button-ghost" disabled={busy} onClick={() => sb && act(() => sb.rpc('remove_friendship', { p_id: rel.id }), 'Permintaan dibatalkan.')}><Clock size={16}/> Terkirim · Batalkan</button>}
        {rel?.status === 'pending' && rel.addressee_id === userId && <>
          <button className="button button-primary" disabled={busy} onClick={() => sb && act(() => sb.rpc('respond_friend_request', { p_id: rel.id, p_accept: true }), `Kamu dan ${name} sekarang berteman!`)}><Check size={16}/> Terima permintaan</button>
          <button className="button button-ghost" disabled={busy} onClick={() => sb && act(() => sb.rpc('respond_friend_request', { p_id: rel.id, p_accept: false }), 'Permintaan ditolak.')}><X size={16}/> Tolak</button>
        </>}
        {rel?.status === 'accepted' && <><span className="soc-tag ok big"><Check size={14}/> Berteman</span><button className="button button-ghost danger" disabled={busy} onClick={() => sb && window.confirm(`Hapus ${name} dari daftar teman?`) && act(() => sb.rpc('remove_friendship', { p_id: rel.id }), 'Dihapus dari daftar teman.')}><UserMinus size={16}/> Hapus teman</button></>}
      </>}
      <Link className="button button-ghost" href="/chat"><MessageSquare size={16}/> Global Chat</Link>
    </div>
  </>;
}

export default function UserProfilePage() {
  return <>
    <div className="page-heading"><div><div className="eyebrow">COMMUNITY / PLAYER</div><h1>Player <span>Card</span></h1><p>Profil publik pemain Anime Battle Arena.</p></div></div>
    <AuthGate feature="profil pemain">{(user) => <PublicProfile userId={user.id}/>}</AuthGate>
  </>;
}
