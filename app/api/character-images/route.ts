import { NextResponse } from 'next/server';
import { characters } from '@/lib/characters';

export const revalidate = 86400;

type Page = { title?: string; thumbnail?: { source?: string } };

export async function GET() {
  const titles = [...new Set(characters.map((c) => c.vsbTitle))];
  const byTitle: Record<string, string> = {};
  try {
    // MediaWiki limits the number of page titles per request; batch them to avoid silent truncation.
    for (let start = 0; start < titles.length; start += 40) {
      const batch = titles.slice(start, start + 40);
      const params = new URLSearchParams({
        action: 'query', format: 'json', prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '600',
        titles: batch.join('|'),
      });
      const response = await fetch(`https://vsbattles.fandom.com/api.php?${params.toString()}`, {
        headers: { 'User-Agent': 'AnimeBattleArena/1.0 (fan project; source links shown in UI)' },
      });
      if (!response.ok) continue;
      const payload = await response.json();
      const pages = Object.values(payload?.query?.pages ?? {}) as Page[];
      for (const page of pages) if (page.title && page.thumbnail?.source) byTitle[page.title.toLowerCase()] = page.thumbnail.source;
    }
    const images: Record<string, string> = {};
    for (const fighter of characters) {
      const image = byTitle[fighter.vsbTitle.toLowerCase()];
      if (image) images[fighter.id] = image;
    }
    return NextResponse.json({ images }, { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } });
  } catch {
    return NextResponse.json({ images: {}, warning: 'Could not retrieve source thumbnails; initials fallback is active.' });
  }
}
