'use client';
import { useEffect, useState } from 'react';
import type { Fighter } from '@/lib/characters';

type ImageMap = Record<string, string>;
let imageRequest: Promise<ImageMap> | null = null;
function getImages(): Promise<ImageMap> {
  if (!imageRequest) imageRequest = fetch('/api/character-images').then((r) => r.json()).then((d) => d.images ?? {}).catch(() => ({}));
  return imageRequest;
}
export default function FighterPortrait({ fighter, className = '', showImage = true }: { fighter: Fighter; className?: string; showImage?: boolean }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { let active = true; getImages().then((map) => { if (active && map[fighter.id]) setSrc(map[fighter.id]); }); return () => { active = false; }; }, [fighter.id]);
  const initials = fighter.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 3);
  return <div className={className} style={{ '--fighter-color': fighter.color } as React.CSSProperties}>
    {showImage && src && !failed ? <img src={src} alt={`${fighter.name} — source thumbnail`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <span className="portrait-initials">{initials}</span>}
  </div>;
}
