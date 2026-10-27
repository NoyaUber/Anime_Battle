'use client';
import Link from 'next/link';
import { DatabaseZap, LogIn } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { useUser } from '@/lib/use-user';

export default function AuthGate({ feature, children }: { feature: string; children: (user: User) => React.ReactNode }) {
  const { user, loading, configured } = useUser();
  if (loading) return <div className="soc-empty"><p>Memeriksa sesi akun…</p></div>;
  if (!configured) return <div className="soc-empty"><DatabaseZap size={28}/><h3>Supabase belum dikonfigurasi</h3><p>Fitur {feature} membutuhkan database. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY, lalu jalankan migrasi 003.</p></div>;
  if (!user) return <div className="soc-empty"><LogIn size={28}/><h3>Masuk untuk memakai {feature}</h3><p>Buat akun atau login dulu agar pemain lain bisa mengenalimu.</p><Link className="button button-primary" href="/account"><LogIn size={16}/> Sign in / Create account</Link></div>;
  return <>{children(user)}</>;
}
