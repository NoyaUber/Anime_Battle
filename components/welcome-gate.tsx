'use client';
import { FormEvent, useState } from 'react';
import { LogIn, ShieldCheck, Swords, UserPlus, Users, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { errMsg } from '@/lib/social';
import { AUTH_EVENT_KEY } from './auth-event-notifier';

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,20}$/;

// Layar pertama untuk pengunjung yang belum login: wajib daftar / masuk sebelum membuka aplikasi.
export default function WelcomeGate() {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(''); setMessage('');
    const sb = supabase;
    if (!sb) return;
    if (mode === 'signup') {
      if (!USERNAME_RE.test(username.trim())) { setError('Username harus 3–20 karakter: huruf, angka, _ . atau -'); return; }
      if (!agree) { setError('Centang persetujuan pengumpulan data keamanan untuk melanjutkan.'); return; }
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: err } = await sb.auth.signUp({ email: email.trim(), password, options: { data: { username: username.trim() } } });
        if (err) throw err;
        if (data.session) sessionStorage.setItem(AUTH_EVENT_KEY, 'signup');
        else { setMessage('Pendaftaran diterima. Buka email kamu, klik tautan konfirmasi, lalu kembali ke sini dan masuk.'); setMode('login'); }
      } else {
        const { error: err } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
        sessionStorage.setItem(AUTH_EVENT_KEY, 'login');
      }
    } catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  }

  return <div className="gate">
    <div className="gate-bg"/>
    <section className="gate-card">
      <div className="gate-intro">
        <div className="gate-brand"><span className="brand-mark"><Swords size={24}/></span><span>ANIME<span className="brand-accent"> ARENA</span></span></div>
        <div className="eyebrow">SELAMAT DATANG, CALON JUARA</div>
        <h1>Daftar dulu,<br/><span>baru masuk arena.</span></h1>
        <p>Buat akun gratis untuk mengoleksi fighter lewat gacha, bertarung, naik rank, berteman, dan ngobrol di chat global.</p>
        <ul className="gate-points">
          <li><Sparkles size={16}/> Gacha &amp; koleksi fighter dari VS Battles</li>
          <li><Swords size={16}/> Battle Lab &amp; multiplayer 1v1</li>
          <li><Users size={16}/> Teman, profil publik, dan chat global</li>
        </ul>
      </div>
      <div className="gate-form-panel">
        <div className="account-tabs">
          <button type="button" className={mode === 'signup' ? 'selected' : ''} onClick={() => { setMode('signup'); setError(''); setMessage(''); }}><UserPlus size={15}/> Daftar</button>
          <button type="button" className={mode === 'login' ? 'selected' : ''} onClick={() => { setMode('login'); setError(''); setMessage(''); }}><LogIn size={15}/> Masuk</button>
        </div>
        <h2>{mode === 'signup' ? 'Buat akun baru' : 'Selamat datang kembali'}</h2>
        <form onSubmit={submit} className="account-form">
          {mode === 'signup' && <label>Username<input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="3–20: huruf, angka, _ . -" maxLength={20} autoComplete="nickname" required/></label>}
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kamu@contoh.com" autoComplete="email" required/></label>
          <label>Kata sandi<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required/></label>
          {mode === 'signup' && <label className="gate-consent"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)}/><span>Saya mengerti dan setuju data keamanan saya (lihat rincian di bawah) dicatat untuk pengelola situs.</span></label>}
          <button className="button button-primary account-submit" disabled={busy}>{mode === 'signup' ? <UserPlus size={16}/> : <LogIn size={16}/>} {busy ? 'Mohon tunggu…' : mode === 'signup' ? 'Daftar & masuk' : 'Masuk'}</button>
        </form>
        {error && <p className="account-message account-error">{error}</p>}
        {message && <p className="account-message account-success">{message}</p>}
        <details className="gate-privacy">
          <summary><ShieldCheck size={14}/> Data apa yang dicatat saat daftar / masuk?</summary>
          <p>Demi keamanan dan pencegahan penyalahgunaan, setiap kali kamu mendaftar atau masuk, pengelola situs menerima notifikasi berisi: <b>username, email, alamat IP, perkiraan lokasi (dari IP, bukan GPS), jenis perangkat, model perangkat bila terbaca browser, browser &amp; sistem operasi, bahasa/zona waktu, ukuran layar, serta waktu kejadian</b>. Kata sandi tidak pernah dikirim atau dicatat. Data tidak dijual atau dibagikan ke pihak lain.</p>
        </details>
      </div>
    </section>
  </div>;
}
