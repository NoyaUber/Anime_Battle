'use client';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Search, UserMinus, UserPlus, Users, X, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getRank } from '@/lib/progression';
import AuthGate from '@/components/auth-gate';
import FighterPortrait from '@/components/fighter-portrait';
import { PROFILE_COLS, type Friendship, type PlayerProfile, errMsg, escapeLike, fighterFor, isOnline, timeAgo } from '@/lib/social';

type Tab = 'friends' | 'requests' | 'add';
type Notice = { kind: 'ok' | 'err'; text: string } | null;

function Person({ p, sub, children }: { p?: PlayerProfile; sub?: React.ReactNode; children?: React.ReactNode }) {
  const name = p?.username || 'Player';
  const on = isOnline(p?.last_seen);
  return <article className="soc-card">
    <Link href={`/u/${encodeURIComponent(name)}`} className="soc-av-wrap" aria-label={`Profil ${name}`}>
      <FighterPortrait fighter={fighterFor(p?.avatar_character)} className="soc-avatar"/>
      <i className={`soc-dot ${on ? 'on' : ''}`}/>
    </Link>
    <div className="soc-meta">
      <Link href={`/u/${encodeURIComponent(name)}`} className="soc-name">{name}</Link>
      <span className="soc-sub"><b className="soc-rank">{getRank(p?.rank_points ?? 0).name}</b> · {sub ?? (on ? 'Online' : `Terakhir aktif ${timeAgo(p?.last_seen)}`)}</span>
    </div>
    <div className="soc-actions">{children}</div>
  </article>;
}

function FriendsInner({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Friendship[]>([]);
  const [people, setPeople] = useState<Record<string, PlayerProfile>>({});
  const [tab, setTab] = useState<Tab>('friends');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [name, setName] = useState('');
  const [results, setResults] = useState<PlayerProfile[]>([]);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const sb = supabase;
    if (!sb) return;
    const { data, error } = await sb.from('friendships').select('*')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).order('created_at', { ascending: false });
    if (error) { setNotice({ kind: 'err', text: errMsg(error) + ' (sudah menjalankan migrasi 003?)' }); setLoading(false); return; }
    const list = (data ?? []) as Friendship[];
    const ids = Array.from(new Set(list.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id))));
    const map: Record<string, PlayerProfile> = {};
    if (ids.length) {
      const { data: ps } = await sb.from('profiles').select(PROFILE_COLS).in('id', ids);
      (ps ?? []).forEach((p: PlayerProfile) => { map[p.id] = p; });
    }
    setRows(list); setPeople(map); setLoading(false);
  }, [userId]);

  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    load();
    const timer = setInterval(load, 45000);
    const channel = sb.channel(`friendships-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => { load(); })
      .subscribe();
    return () => { clearInterval(timer); sb.removeChannel(channel); };
  }, [load, userId]);

  useEffect(() => {
    const q = name.trim();
    const sb = supabase;
    if (tab !== 'add' || q.length < 2 || !sb) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await sb.from('profiles').select(PROFILE_COLS).ilike('username', `${escapeLike(q)}%`).neq('id', userId).order('username').limit(8);
      setResults((data ?? []) as PlayerProfile[]);
    }, 300);
    return () => clearTimeout(t);
  }, [name, tab, userId]);

  const otherId = (r: Friendship) => (r.requester_id === userId ? r.addressee_id : r.requester_id);
  const friends = useMemo(() => rows.filter((r) => r.status === 'accepted')
    .sort((a, b) => Number(isOnline(people[otherId(b)]?.last_seen)) - Number(isOnline(people[otherId(a)]?.last_seen))), [rows, people]); // eslint-disable-line react-hooks/exhaustive-deps
  const incoming = rows.filter((r) => r.status === 'pending' && r.addressee_id === userId);
  const outgoing = rows.filter((r) => r.status === 'pending' && r.requester_id === userId);
  const relation = (id: string) => {
    const r = rows.find((x) => otherId(x) === id);
    if (!r) return null;
    return r.status === 'accepted' ? 'friend' : r.requester_id === userId ? 'sent' : 'received';
  };

  async function sendRequest(username: string) {
    const sb = supabase;
    if (!sb || !username.trim()) return;
    setBusy('add:' + username); setNotice(null);
    const { data, error } = await sb.rpc('send_friend_request', { p_username: username.trim() });
    if (error) setNotice({ kind: 'err', text: errMsg(error) });
    else { setNotice({ kind: 'ok', text: data === 'accepted' ? `Kamu dan ${username} sekarang berteman! 🎉` : `Permintaan pertemanan dikirim ke ${username}.` }); setName(''); await load(); }
    setBusy('');
  }
  async function respond(id: string, accept: boolean) {
    const sb = supabase;
    if (!sb) return;
    setBusy('r:' + id); setNotice(null);
    const { error } = await sb.rpc('respond_friend_request', { p_id: id, p_accept: accept });
    if (error) setNotice({ kind: 'err', text: errMsg(error) });
    else { setNotice({ kind: 'ok', text: accept ? 'Permintaan diterima.' : 'Permintaan ditolak.' }); await load(); }
    setBusy('');
  }
  async function remove(id: string, label: string) {
    const sb = supabase;
    if (!sb || !window.confirm(label)) return;
    setBusy('r:' + id); setNotice(null);
    const { error } = await sb.rpc('remove_friendship', { p_id: id });
    if (error) setNotice({ kind: 'err', text: errMsg(error) });
    else { setNotice({ kind: 'ok', text: 'Berhasil diperbarui.' }); await load(); }
    setBusy('');
  }
  function submit(e: FormEvent) { e.preventDefault(); sendRequest(name); }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'friends', label: 'Teman', count: friends.length },
    { id: 'requests', label: 'Permintaan', count: incoming.length },
    { id: 'add', label: 'Tambah teman' },
  ];
  return <>
    <div className="soc-tabs" role="tablist">{tabs.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} className={`soc-tab ${tab === t.id ? 'selected' : ''}`} onClick={() => { setTab(t.id); setNotice(null); }}>{t.label}{!!t.count && <span className={t.id === 'requests' ? 'soc-count hot' : 'soc-count'}>{t.count}</span>}</button>)}</div>
    {notice && <div className={`soc-notice ${notice.kind}`}>{notice.text}</div>}
    {loading ? <div className="soc-empty"><p>Memuat daftar teman…</p></div> : <>
      {tab === 'friends' && (friends.length ? <div className="soc-list">{friends.map((r) => <Person key={r.id} p={people[otherId(r)]}>
        <Link className="button button-ghost button-sm" href={`/u/${encodeURIComponent(people[otherId(r)]?.username || '')}`}>Profil</Link>
        <button className="button button-ghost button-sm danger" disabled={busy === 'r:' + r.id} onClick={() => remove(r.id, `Hapus ${people[otherId(r)]?.username || 'pemain ini'} dari daftar teman?`)} aria-label="Hapus teman"><UserMinus size={15}/></button>
      </Person>)}</div> : <div className="soc-empty"><Users size={28}/><h3>Belum ada teman</h3><p>Cari pemain lewat tab “Tambah teman”, atau klik nama seseorang di Global Chat.</p><button className="button button-primary" onClick={() => setTab('add')}><UserPlus size={16}/> Tambah teman</button></div>)}

      {tab === 'requests' && <>
        <h3 className="soc-section">Permintaan masuk ({incoming.length})</h3>
        {incoming.length ? <div className="soc-list">{incoming.map((r) => <Person key={r.id} p={people[otherId(r)]} sub={`Ingin berteman · ${timeAgo(r.created_at)}`}>
          <button className="button button-primary button-sm" disabled={busy === 'r:' + r.id} onClick={() => respond(r.id, true)}><Check size={15}/> Terima</button>
          <button className="button button-ghost button-sm" disabled={busy === 'r:' + r.id} onClick={() => respond(r.id, false)}><X size={15}/> Tolak</button>
        </Person>)}</div> : <p className="soc-hint">Tidak ada permintaan masuk.</p>}
        <h3 className="soc-section">Permintaan terkirim ({outgoing.length})</h3>
        {outgoing.length ? <div className="soc-list">{outgoing.map((r) => <Person key={r.id} p={people[otherId(r)]} sub={`Menunggu respons · ${timeAgo(r.created_at)}`}>
          <button className="button button-ghost button-sm" disabled={busy === 'r:' + r.id} onClick={() => remove(r.id, 'Batalkan permintaan pertemanan ini?')}><X size={15}/> Batalkan</button>
        </Person>)}</div> : <p className="soc-hint">Tidak ada permintaan yang menunggu.</p>}
      </>}

      {tab === 'add' && <>
        <form className="soc-search" onSubmit={submit}>
          <Search size={17}/>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ketik username pemain…" maxLength={20} autoComplete="off"/>
          <button className="button button-primary button-sm" disabled={!name.trim() || busy.startsWith('add:')}><UserPlus size={15}/> Kirim permintaan</button>
        </form>
        {name.trim().length >= 2 && (results.length ? <div className="soc-list">{results.map((p) => {
          const rel = relation(p.id);
          return <Person key={p.id} p={p}>
            {rel === 'friend' ? <span className="soc-tag ok"><Check size={13}/> Teman</span>
              : rel === 'sent' ? <span className="soc-tag"><Clock size={13}/> Terkirim</span>
              : <button className="button button-primary button-sm" disabled={busy === 'add:' + p.username} onClick={() => sendRequest(p.username || '')}><UserPlus size={15}/> {rel === 'received' ? 'Terima' : 'Tambah'}</button>}
          </Person>;
        })}</div> : <p className="soc-hint">Tidak ada pemain dengan awalan “{name.trim()}”.</p>)}
        {name.trim().length < 2 && <p className="soc-hint">Ketik minimal 2 huruf untuk mencari. Kamu juga bisa menambah teman dari profil seseorang atau dari Global Chat.</p>}
      </>}
    </>}
  </>;
}

export default function FriendsPage() {
  return <>
    <div className="page-heading"><div><div className="eyebrow">COMMUNITY / FRIEND LIST</div><h1>Friends <span>&amp; Requests</span></h1><p>Tambah teman lewat username, terima permintaan, dan lihat siapa yang sedang online.</p></div></div>
    <AuthGate feature="daftar teman">{(user) => <FriendsInner userId={user.id}/>}</AuthGate>
  </>;
}
