'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type UAData = { getHighEntropyValues?: (hints: string[]) => Promise<{ model?: string; platform?: string; platformVersion?: string }> };

// Mengirim info perangkat ke /api/notify SEKALI setelah pemain benar-benar daftar / login
// (ditandai oleh WelcomeGate lewat sessionStorage). Pemulihan sesi biasa tidak memicu notifikasi.
export const AUTH_EVENT_KEY = 'aba-auth-event';

export default function AuthEventNotifier() {
  useEffect(() => {
    const sb = supabase;
    if (!sb) return;
    const event = sessionStorage.getItem(AUTH_EVENT_KEY);
    if (event !== 'signup' && event !== 'login') return;
    sessionStorage.removeItem(AUTH_EVENT_KEY);
    (async () => {
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      let model = ''; let platform = ''; let platformVersion = '';
      try {
        const uad = (navigator as Navigator & { userAgentData?: UAData }).userAgentData;
        if (uad?.getHighEntropyValues) {
          const h = await uad.getHighEntropyValues(['model', 'platform', 'platformVersion']);
          model = h.model ?? ''; platform = h.platform ?? ''; platformVersion = h.platformVersion ?? '';
        }
      } catch { /* browser tidak mendukung / ditolak */ }
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          event, model, platform, platformVersion,
          screen: `${window.screen.width}x${window.screen.height}`, pixelRatio: window.devicePixelRatio,
          language: navigator.language, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      }).catch(() => undefined);
    })();
  }, []);
  return null;
}
