'use client';
import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { LogIn, LogOut, Mail, ShieldCheck, UserRound, UserPlus } from 'lucide-react';

export default function AccountPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [username, setUsername] = useState('');
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(''); const [error, setError] = useState('');
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('');
    if (!supabase) { setError('Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di environment variables Vercel.'); return; }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { username: username.trim() || email.split('@')[0] } } });
        if (authError) throw authError;
        if (data.session) { setUser(data.user); setMessage('Akun berhasil dibuat dan kamu sudah masuk.'); }
        else setMessage('Pendaftaran diterima. Periksa email untuk tautan konfirmasi, lalu kembali untuk masuk.');
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError; setUser(data.user); setMessage('Berhasil masuk.');
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Autentikasi gagal. Coba lagi.'); }
    finally { setBusy(false); }
  }
  async function signOut() {
    if (!supabase) return; setError(''); setMessage(''); const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message); else { setUser(null); setMessage('Kamu sudah keluar dari akun.'); }
  }
  return <>
    <div className="page-heading"><div><div className="eyebrow">PLAYER ID / ACCOUNT CENTER</div><h1>Player <span>Account</span></h1><p>Buat akun atau masuk untuk menyiapkan identitas pemain berbasis Supabase.</p></div><div className="battle-mode"><ShieldCheck size={18}/><div><small>AUTH PROVIDER</small><b>SUPABASE AUTH</b></div></div></div>
    <section className="account-layout"><div className="account-intro"><div className="account-illustration"><UserRound size={56}/></div><div className="eyebrow">YOUR ARENA ID</div><h2>One account.<br/><span>Your own roster.</span></h2><p>Autentikasi email dan kata sandi menggunakan Supabase. Sinkronisasi koleksi, kredit, dan riwayat battle lintas perangkat merupakan tahap integrasi berikutnya.</p><div className="account-check"><ShieldCheck size={17}/><span><b>Supabase Auth</b><small>Kata sandi ditangani oleh penyedia autentikasi.</small></span></div></div>
      <div className="account-form-panel">{loading ? <div className="log-empty">Memeriksa sesi akun…</div> : user ? <div className="account-signed-in"><div className="signed-icon"><UserRound size={28}/></div><div className="eyebrow">SESSION ACTIVE</div><h2>Your account is <span>active</span></h2><p>Akun yang sedang digunakan:</p><div className="account-email"><Mail size={16}/>{user.email}</div><div className="account-username">Player ID <b>{user.id.slice(0, 8).toUpperCase()}</b></div><button className="button button-ghost account-submit" onClick={signOut}><LogOut size={16}/> Sign out</button></div> : <>
        <div className="account-tabs"><button className={mode === 'login' ? 'selected' : ''} onClick={() => { setMode('login'); setError(''); setMessage(''); }}><LogIn size={15}/> Sign in</button><button className={mode === 'signup' ? 'selected' : ''} onClick={() => { setMode('signup'); setError(''); setMessage(''); }}><UserPlus size={15}/> Create account</button></div>
        <h2>{mode === 'login' ? 'Welcome back' : 'Join the arena'}</h2><p className="account-form-caption">{mode === 'login' ? 'Masuk untuk mengakses identitas pemainmu.' : 'Gunakan email aktif dan kata sandi minimal 6 karakter.'}</p>
        <form onSubmit={submit} className="account-form">{mode === 'signup' && <label>Username<input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username (3–20: huruf, angka, _ . -)" autoComplete="nickname"/></label>}<label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/></label><button className="button button-primary account-submit" disabled={busy}>{mode === 'login' ? <LogIn size={16}/> : <UserPlus size={16}/>} {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button></form>
        {error && <p className="account-message account-error">{error}</p>}{message && <p className="account-message account-success">{message}</p>}{!supabase && <p className="account-message account-warning">Mode demo: Supabase belum dikonfigurasi. Form tidak akan mengirim data sampai environment variables ditambahkan.</p>}
        <small className="account-privacy">Jangan gunakan kata sandi yang sama dengan akun penting lain. Aktifkan konfirmasi email dari pengaturan Supabase Auth jika diperlukan.</small>
      </>}</div></section>
  </>;
}
