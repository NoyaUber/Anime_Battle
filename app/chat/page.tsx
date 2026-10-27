'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Radio, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AuthGate from '@/components/auth-gate';
import FighterPortrait from '@/components/fighter-portrait';
import { errMsg, fighterFor, formatTime } from '@/lib/social';

type Msg = { id: number; user_id: string; username: string; avatar_character: string | null; content: string; created_at: string };
const MAX = 300;

function ChatRoom({ userId }: { userId: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const [online, setOnline] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  const merge = (incoming: Msg[]) => setMsgs((prev) => {
    const map = new Map<number, Msg>();
    [...prev, ...incoming].forEach((m) => map.set(m.id, m));
    return Array.from(map.values()).sort((a, b) => a.id - b.id).slice(-200);
  });

  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    let active = true;
    sb.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(100).then(({ data, error: e }) => {
      if (!active) return;
      if (e) setError(errMsg(e) + ' (sudah menjalankan migrasi 003?)');
      else merge((data ?? []) as Msg[]);
    });
    const channel = sb.channel('global-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => merge([payload.new as Msg]))
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));
    return () => { active = false; sb.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    const run = async () => {
      const since = new Date(Date.now() - 150000).toISOString();
      const { count } = await sb.from('profiles').select('id', { count: 'exact', head: true }).gt('last_seen', since);
      setOnline(count ?? 0);
    };
    run();
    const t = setInterval(run, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending || !supabase) return;
    setSending(true); setError('');
    const { data, error: err } = await supabase.from('chat_messages').insert({ user_id: userId, content }).select().single();
    if (err) setError(errMsg(err));
    else { setText(''); stick.current = true; if (data) merge([data as Msg]); }
    setSending(false);
  }

  return <section className="chat-shell">
    <div className="chat-head">
      <div><b># global</b><small>Ngobrol dengan semua pemain Anime Battle Arena</small></div>
      <div className="chat-head-right">
        <span className={`chat-status ${live ? 'live' : ''}`}><Radio size={13}/> {live ? 'LIVE' : 'MENYAMBUNG…'}</span>
        {online !== null && <span className="chat-count">{online} online</span>}
      </div>
    </div>
    <div className="chat-list" ref={listRef} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
      {msgs.length === 0 && !error && <div className="chat-empty">Belum ada pesan. Jadilah yang pertama menyapa! 👋</div>}
      {msgs.map((m) => {
        const mine = m.user_id === userId;
        const name = m.username || 'Player';
        return <div key={m.id} className={`chat-row ${mine ? 'mine' : ''}`}>
          <Link href={`/u/${encodeURIComponent(name)}`} aria-label={`Profil ${name}`}><FighterPortrait fighter={fighterFor(m.avatar_character)} className="soc-avatar sm"/></Link>
          <div className="chat-bubble-wrap">
            <div className="chat-meta"><Link href={`/u/${encodeURIComponent(name)}`}>{mine ? 'Kamu' : name}</Link><time>{formatTime(m.created_at)}</time></div>
            <div className="chat-bubble">{m.content}</div>
          </div>
        </div>;
      })}
    </div>
    {error && <div className="chat-error">{error}</div>}
    <form className="chat-form" onSubmit={send}>
      <input className="chat-input" value={text} maxLength={MAX} onChange={(e) => setText(e.target.value)} placeholder="Tulis pesan…" autoComplete="off"/>
      <span className="chat-limit">{text.length}/{MAX}</span>
      <button className="button button-primary" disabled={sending || !text.trim()}><Send size={16}/> Kirim</button>
    </form>
  </section>;
}

export default function ChatPage() {
  return <>
    <div className="page-heading"><div><div className="eyebrow">COMMUNITY / GLOBAL CHAT</div><h1>Global <span>Chat</span></h1><p>Obrolan langsung antar pemain. Klik nama atau avatar untuk melihat profil dan menambah teman. Jaga sopan santun ya.</p></div></div>
    <AuthGate feature="chat global">{(user) => <ChatRoom userId={user.id}/>}</AuthGate>
  </>;
}
