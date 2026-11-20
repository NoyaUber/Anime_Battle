'use client';

import FighterPortrait from '@/components/fighter-portrait';
import { useMemo } from 'react';
import Link from 'next/link';
import { BookOpen, Sparkles } from 'lucide-react';
import { characters } from '@/lib/characters';
import { usePlayerCollection } from '@/lib/use-player-collection';

const rarityClass: Record<string, string> = {
  Common: 'common', Rare: 'rare', Epic: 'epic', Legendary: 'legendary', Mythic: 'mythic',
};

export default function Collection() {
  const { ownedCharacterIds, loading, error, userId } = usePlayerCollection();
  const items = useMemo(
    () => ownedCharacterIds.map((id) => characters.find((character) => character.id === id)).filter(Boolean),
    [ownedCharacterIds],
  );

  return <>
    <div className="page-heading">
      <div>
        <div className="eyebrow">PLAYER DATA / {userId ? 'ACCOUNT SAVE' : 'LOCAL SAVE'}</div>
        <h1>My <span>Collection</span></h1>
        <p>{userId ? 'Karakter tersimpan pada akunmu dan akan dimuat kembali saat masuk lagi.' : 'Fighter tersimpan di browser pada perangkat ini.'}</p>
      </div>
      <div className="heading-count"><b>{String(items.length).padStart(2, '0')}</b><span>CHARACTERS</span></div>
    </div>

    {loading ? <div className="empty-state"><h2>Memuat koleksi…</h2></div> : items.length ? <div className="collection-grid">
      {items.map((fighter) => fighter && <article className="collection-card" key={fighter.id}>
        <FighterPortrait fighter={fighter} className="archive-avatar" />
        <div><span className={`rarity ${rarityClass[fighter.rarity]}`}>{fighter.rarity.toUpperCase()}</span><h3>{fighter.name}</h3><p>{fighter.universe}</p></div>
        <div className="collection-power"><small>POWER</small><b>{fighter.power}</b></div>
      </article>)}
    </div> : <div className="empty-state">
      <div className="empty-state-icon"><BookOpen size={27}/></div>
      <h2>Your archive is empty.</h2>
      <p>Summon your first fighter to start building your roster.</p>
      <Link href="/gacha" className="button button-primary"><Sparkles size={17}/> Visit Summon Chamber</Link>
    </div>}

    {error && <p className="account-message account-warning">{error}</p>}
    <p className="disclaimer">{userId ? 'Koleksi akun dicadangkan di Supabase; local cache dipakai bila koneksi gagal. Jalankan migration 004 bila penyimpanan akun belum aktif.' : 'Mode lokal: data dapat terhapus jika penyimpanan browser dibersihkan.'}</p>
  </>;
}
