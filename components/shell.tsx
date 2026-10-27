'use client';
import Nav from './nav';
import Link from 'next/link';
import { Swords, UserRound } from 'lucide-react';
import PresenceBeacon from './presence-beacon';
import AuthEventNotifier from './auth-event-notifier';
import WelcomeGate from './welcome-gate';
import { useUser } from '@/lib/use-user';

export default function Shell({children}:{children:React.ReactNode}) {
  const { user, loading, configured } = useUser();
  // Supabase aktif: pengunjung wajib daftar / masuk dulu. Tanpa Supabase (mode demo lokal) aplikasi tetap terbuka.
  if (configured && loading) return <div className="gate-splash"><span className="brand-mark"><Swords size={26}/></span><small>MEMUAT…</small></div>;
  if (configured && !user) return <WelcomeGate/>;
  return <div className="app-shell"><PresenceBeacon/><AuthEventNotifier/><Nav/><main className="main-content"><header className="topbar"><div className="breadcrumb">ARENA <span>/</span> <b>CONTROL CENTER</b></div><div className="topbar-right"><span className="status-pill"><i/> SYSTEM ONLINE</span><Link href="/account" className="account-top-link"><UserRound size={15}/><span>Account</span></Link></div></header><div className="page-content">{children}</div><footer className="footer">ANIME BATTLE ARENA <span>•</span> FAN-MADE SIMULATION PROTOTYPE <span className="footer-right">BUILD 0.1.0</span></footer></main></div>;
}
