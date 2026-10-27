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
    {showImage && src && !failed ? <img src={src} alt={`${fighter.name} illustration`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <div className="portrait-fallback-art" role="img" aria-label={`${fighter.name} stylized placeholder`}><svg viewBox="0 0 120 150" aria-hidden="true"><defs><linearGradient id={`g-${fighter.id}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={fighter.color}/><stop offset="1" stopColor="#171421"/></linearGradient></defs><circle cx="60" cy="55" r="38" fill={`url(#g-${fighter.id})`} opacity=".5"/><path d="M22 150 Q24 94 60 92 Q96 94 98 150Z" fill={`url(#g-${fighter.id})`} stroke={fighter.color} strokeWidth="2"/><path d="M37 58 Q28 15 60 15 Q92 15 83 58 L74 40 L63 31 L48 44Z" fill={fighter.color}/><ellipse cx="60" cy="57" rx="23" ry="29" fill="#d9c3b4"/><path d="M37 52 Q33 20 60 20 Q85 18 84 48 L74 39 L63 29 L48 43Z" fill={fighter.color}/><path d="M48 58h7m10 0h7" stroke="#25202d" strokeWidth="3" strokeLinecap="round"/><path d="M54 72 Q60 76 66 72" fill="none" stroke="#7e4e54" strokeWidth="2"/><path d="M39 101 L60 119 L81 101" fill="none" stroke="#f5f1ff" strokeOpacity=".7" strokeWidth="3"/></svg><span className="portrait-initials">{initials}</span></div>}
  </div>;
}
