import { NextResponse } from 'next/server';
import { characters } from '@/lib/characters';
import { imageOverrides } from '@/lib/image-overrides';

export const revalidate = 86400;

const API = 'https://vsbattles.fandom.com/api.php';
const UA = { 'User-Agent': 'AnimeBattleArena/1.0 (fan project; source links shown in UI)' };
type Page = { title?: string; thumbnail?: { source?: string } };
const norm = (s: string) => s.replace(/_/g, ' ').trim().toLowerCase();
const bad = (u?: string) => !u || /\.svg(\/|\?|$)/i.test(u);

async function getJson(url: string) {
  const r = await fetch(url, { headers: UA, next: { revalidate: 86400 } });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

// 1) MediaWiki pageimages + redirects (banyak judul VSB adalah redirect; tanpa ini thumbnail kosong).
async function viaPageImages(titles: string[], out: Record<string, string>) {
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40);
    const params = new URLSearchParams({
      action: 'query', format: 'json', prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '600',
      redirects: '1', converttitles: '1', titles: batch.join('|'),
    });
    try {
      const p = await getJson(`${API}?${params}`);
      const hop: Record<string, string> = {}; // judul awal -> judul akhir
      for (const n of p?.query?.normalized ?? []) hop[norm(n.from)] = norm(n.to);
      for (const r of p?.query?.redirects ?? []) hop[norm(r.from)] = norm(r.to);
      const finalImg: Record<string, string> = {};
      for (const pg of Object.values(p?.query?.pages ?? {}) as Page[])
        if (pg.title && !bad(pg.thumbnail?.source)) finalImg[norm(pg.title)] = pg.thumbnail!.source!;
      for (const t of batch) {
        let k = norm(t);
        for (let n = 0; n < 4 && hop[k]; n++) k = hop[k];
        if (finalImg[k]) out[norm(t)] = finalImg[k];
      }
    } catch { /* lanjut ke fallback */ }
  }
}

// 2) Fandom Articles/Details (satu judul per request; hanya untuk yang masih kosong).
async function viaDetails(title: string): Promise<string | undefined> {
  try {
    const d = await getJson(`https://vsbattles.fandom.com/api/v1/Articles/Details?titles=${encodeURIComponent(title)}&width=600&abstract=0`);
    const item = Object.values(d?.items ?? {})[0] as { thumbnail?: string } | undefined;
    return bad(item?.thumbnail) ? undefined : item?.thumbnail;
  } catch { return undefined; }
}

// 3) og:image dari halaman profil.
async function viaOg(title: string): Promise<string | undefined> {
  try {
    const r = await fetch(`https://vsbattles.fandom.com/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`, { headers: UA, next: { revalidate: 86400 } });
    if (!r.ok) return undefined;
    const html = await r.text();
    const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return bad(m?.[1]) ? undefined : m?.[1].replace(/&amp;/g, '&');
  } catch { return undefined; }
}

async function pool<T>(items: string[], fn: (t: string) => Promise<T>, size = 6) {
  const res: T[] = new Array(items.length);
  let idx = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (idx < items.length) { const i = idx++; res[i] = await fn(items[i]); }
  }));
  return res;
}

export async function GET(req: Request) {
  const debug = new URL(req.url).searchParams.has('debug');
  const titles = [...new Set(characters.map((c) => c.vsbTitle))];
  const byTitle: Record<string, string> = {};
  const via: Record<string, string> = {};

  await viaPageImages(titles, byTitle);
  titles.forEach((t) => { if (byTitle[norm(t)]) via[norm(t)] = 'pageimages'; });

  let missing = titles.filter((t) => !byTitle[norm(t)]);
  const d = await pool(missing, viaDetails);
  missing.forEach((t, i) => { if (d[i]) { byTitle[norm(t)] = d[i]!; via[norm(t)] = 'details'; } });

  missing = titles.filter((t) => !byTitle[norm(t)]);
  const o = await pool(missing, viaOg);
  missing.forEach((t, i) => { if (o[i]) { byTitle[norm(t)] = o[i]!; via[norm(t)] = 'og:image'; } });

  const images: Record<string, string> = {};
  const report: Record<string, string> = {};
  for (const f of characters) {
    const img = imageOverrides[f.id] || byTitle[norm(f.vsbTitle)];
    if (img) { images[f.id] = img; report[f.id] = imageOverrides[f.id] ? 'override' : via[norm(f.vsbTitle)]; }
    else report[f.id] = 'MISSING';
  }
  const stillMissing = characters.filter((f) => !images[f.id]).map((f) => `${f.id} (${f.vsbTitle})`);
  return NextResponse.json(
    debug ? { images, report, missing: stillMissing } : { images, ...(stillMissing.length ? { warning: `${stillMissing.length} karakter tanpa gambar` } : {}) },
    { headers: { 'Cache-Control': debug ? 'no-store' : 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
