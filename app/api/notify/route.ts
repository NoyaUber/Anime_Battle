import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Notifikasi Telegram untuk pendaftaran / login. Token bot hanya dibaca di server (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID).
// Email & username diambil dari sesi Supabase yang diverifikasi server, bukan dari isi request, sehingga tidak bisa dipalsukan.

type Body = {
  event?: 'signup' | 'login'; model?: string; platform?: string; platformVersion?: string;
  screen?: string; pixelRatio?: number; language?: string; timezone?: string;
};

const recent = new Map<string, number>(); // dedupe sederhana per instance (best-effort)
const esc = (s: unknown) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as Record<string, string>)[c]);
const clip = (s: unknown, n = 80) => String(s ?? '').slice(0, n);

function parseUA(ua: string) {
  let os = 'Tidak diketahui'; let type = 'Desktop'; let uaModel = '';
  if (/Android/i.test(ua)) {
    os = 'Android ' + (ua.match(/Android\s([\d.]+)/)?.[1] ?? '');
    type = /Mobile/i.test(ua) ? 'Ponsel' : 'Tablet';
    const m = ua.match(/Android [\d.]+; ([^;)]+?)(?: Build|\)|;)/)?.[1]?.trim();
    if (m && m !== 'K' && !/^Mobile$/i.test(m)) uaModel = m; // Chrome modern menyamarkan model jadi "K"
  } else if (/iPhone|iPod/.test(ua)) { os = 'iOS ' + (ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.') ?? ''); type = 'Ponsel (iPhone)'; }
  else if (/iPad/.test(ua)) { os = 'iPadOS'; type = 'Tablet (iPad)'; }
  else if (/Windows NT/.test(ua)) os = 'Windows ' + (ua.match(/Windows NT ([\d.]+)/)?.[1] === '10.0' ? '10/11' : ua.match(/Windows NT ([\d.]+)/)?.[1] ?? '');
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/CrOS/.test(ua)) os = 'ChromeOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  const pick = (re: RegExp) => ua.match(re)?.[1]?.split('.')[0];
  let browser = 'Tidak diketahui';
  if (/Edg(e|A|iOS)?\//.test(ua)) browser = 'Edge ' + (pick(/Edg(?:e|A|iOS)?\/([\d.]+)/) ?? '');
  else if (/OPR\//.test(ua)) browser = 'Opera ' + (pick(/OPR\/([\d.]+)/) ?? '');
  else if (/SamsungBrowser\//.test(ua)) browser = 'Samsung Internet ' + (pick(/SamsungBrowser\/([\d.]+)/) ?? '');
  else if (/Firefox\/|FxiOS\//.test(ua)) browser = 'Firefox ' + (pick(/(?:Firefox|FxiOS)\/([\d.]+)/) ?? '');
  else if (/CriOS\/|Chrome\//.test(ua)) browser = 'Chrome ' + (pick(/(?:CriOS|Chrome)\/([\d.]+)/) ?? '');
  else if (/Safari\//.test(ua)) browser = 'Safari ' + (pick(/Version\/([\d.]+)/) ?? '');
  if (/; wv\)|\bwv\b/.test(ua)) browser += ' (WebView / browser dalam aplikasi)';
  return { os, type, browser, uaModel };
}

// iPhone tidak mengirim nama model; ini perkiraan dari ukuran layar (CSS px) + pixel ratio.
function iphoneGuess(screen?: string, dpr?: number) {
  const key = `${screen}@${Math.round(dpr ?? 0)}`;
  const table: Record<string, string> = {
    '320x568@2': 'iPhone 5/5s/SE (gen 1)', '375x667@2': 'iPhone 6/7/8/SE (gen 2–3)', '414x736@3': 'iPhone 6/7/8 Plus',
    '375x812@3': 'iPhone X/XS/11 Pro/12 mini/13 mini', '414x896@2': 'iPhone XR/11', '414x896@3': 'iPhone XS Max/11 Pro Max',
    '390x844@3': 'iPhone 12/13/14 (reguler/Pro)', '428x926@3': 'iPhone 12/13 Pro Max/14 Plus', '393x852@3': 'iPhone 14 Pro/15/15 Pro/16',
    '430x932@3': 'iPhone 14 Pro Max/15 Plus/15 Pro Max/16 Plus', '402x874@3': 'iPhone 16 Pro', '440x956@3': 'iPhone 16 Pro Max',
  };
  return table[key];
}

export async function POST(req: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN; const chatId = process.env.TELEGRAM_CHAT_ID;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!botToken || !chatId || !url || !anon) return NextResponse.json({ ok: false, reason: 'not-configured' });

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });
  const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: auth, error } = await sb.auth.getUser(token);
  const user = auth?.user;
  if (error || !user) return NextResponse.json({ ok: false }, { status: 401 });

  const last = recent.get(user.id) ?? 0;
  if (Date.now() - last < 20000) return NextResponse.json({ ok: true, skipped: 'duplicate' });
  recent.set(user.id, Date.now());
  if (recent.size > 500) recent.clear();

  let body: Body = {};
  try { body = (await req.json()) as Body; } catch { /* body opsional */ }

  const { data: prof } = await sb.from('profiles').select('username').eq('id', user.id).maybeSingle();
  const username = prof?.username || (user.user_metadata?.username as string | undefined) || '(belum ada)';

  const h = req.headers;
  const ip = clip(h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'tidak diketahui', 60);
  const dec = (v: string | null) => { try { return v ? decodeURIComponent(v) : ''; } catch { return v ?? ''; } };
  const city = dec(h.get('x-vercel-ip-city')); const region = h.get('x-vercel-ip-country-region') ?? ''; const cc = h.get('x-vercel-ip-country') ?? '';
  let country = cc; try { if (cc) country = new Intl.DisplayNames(['id'], { type: 'region' }).of(cc) ?? cc; } catch { /* abaikan */ }
  const lat = h.get('x-vercel-ip-latitude'); const lon = h.get('x-vercel-ip-longitude');
  const place = [city, region, country].filter(Boolean).join(', ') || 'tidak tersedia (hanya ada saat di-deploy ke Vercel)';

  const ua = clip(h.get('user-agent') ?? '', 400);
  const p = parseUA(ua);
  const model = clip(body.model, 60) || p.uaModel;
  const isIphone = /iPhone/.test(ua);
  const guess = isIphone ? iphoneGuess(clip(body.screen, 20), body.pixelRatio) : undefined;
  const modelText = model ? model : isIphone ? (guess ? `perkiraan: ${guess}` : 'iPhone (model tidak dapat dibaca browser)') : 'tidak terdeteksi (browser menyembunyikan model)';

  const tz = process.env.NOTIFY_TIMEZONE || 'Asia/Jakarta';
  const fmt = (d: Date) => d.toLocaleString('id-ID', { timeZone: tz, dateStyle: 'full', timeStyle: 'medium' }) + (tz === 'Asia/Jakarta' ? ' WIB' : ` (${tz})`);
  const title = body.event === 'signup' ? '🆕 <b>PENDAFTARAN BARU</b>' : '🔐 <b>LOGIN</b>';

  const lines = [
    title,
    `👤 Username: <b>${esc(username)}</b>`,
    `📧 Email: ${esc(user.email ?? '-')}`,
    `🌐 IP: <code>${esc(ip)}</code>`,
    `📍 Lokasi (perkiraan dari IP): ${esc(place)}${lat && lon ? ` — <a href="https://www.google.com/maps?q=${esc(lat)},${esc(lon)}">peta</a>` : ''}`,
    `📱 Perangkat: ${esc(p.type)} — ${esc(modelText)}`,
    `⚙️ Sistem: ${esc(p.os)}${body.platformVersion ? ` (platform ${esc(clip(body.platformVersion, 20))})` : ''}`,
    `🧭 Browser: ${esc(p.browser)}`,
    `🖥 Layar: ${esc(clip(body.screen, 20) || '-')}${body.pixelRatio ? ` @${esc(body.pixelRatio)}x` : ''} · Bahasa: ${esc(clip(body.language, 20) || '-')} · Zona waktu: ${esc(clip(body.timezone, 40) || '-')}`,
    `🕒 Waktu: ${esc(fmt(new Date()))}`,
    `🗓 Akun dibuat: ${esc(user.created_at ? fmt(new Date(user.created_at)) : '-')}`,
  ];

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
    body: JSON.stringify({ chat_id: chatId, text: lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true }),
  }).catch(() => null);
  return NextResponse.json({ ok: !!res?.ok });
}
