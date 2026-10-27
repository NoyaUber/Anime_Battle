'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { readSave } from '@/lib/progression';

// Heartbeat tiap 60 dtk: menandai pemain online dan menyinkronkan rank point ke profil publik.
export default function PresenceBeacon() {
  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    const beat = async () => {
      const { data } = await sb.auth.getSession();
      if (!data.session || document.visibilityState === 'hidden') return;
      const rank = Math.max(0, Math.floor(Number(readSave().rankPoints) || 0));
      await sb.rpc('touch_presence', { p_rank: rank });
    };
    beat();
    const timer = setInterval(beat, 60000);
    return () => clearInterval(timer);
  }, []);
  return null;
}
