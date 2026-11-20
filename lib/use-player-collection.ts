'use client';

import { useCallback, useEffect, useState } from 'react';
import { mergeCharacterIds, normalizeCharacterIds } from '@/lib/collection-storage';
import { ensureStarterSave, readSave, STARTER_IDS, writeSave } from '@/lib/progression';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/use-user';

const ACCOUNT_CACHE_PREFIX = 'aba-owned-collection-v1:';
const LEGACY_IMPORT_KEY = 'aba-owned-collection-legacy-imported-v1';

function accountCacheKey(userId: string) {
  return `${ACCOUNT_CACHE_PREFIX}${userId}`;
}

function readAccountCache(userId: string): string[] | null {
  try {
    const value = localStorage.getItem(accountCacheKey(userId));
    if (!value) return null;
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? normalizeCharacterIds(parsed) : null;
  } catch {
    return null;
  }
}

function writeAccountCache(userId: string, ids: string[]) {
  try {
    localStorage.setItem(accountCacheKey(userId), JSON.stringify(ids));
  } catch {
    // The Supabase copy remains authoritative if browser storage is unavailable.
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Gagal menyimpan koleksi ke akun.';
}

export function usePlayerCollection() {
  const { user, loading: authLoading } = useUser();
  const [ownedCharacterIds, setOwnedCharacterIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    let active = true;
    const sb = supabase;

    async function loadCollection() {
      setLoading(true);
      setError('');

      if (!user || !sb) {
        const localIds = mergeCharacterIds(ensureStarterSave().owned, STARTER_IDS);
        if (active) {
          setOwnedCharacterIds(localIds);
          setLoading(false);
        }
        return;
      }

      const cachedIds = readAccountCache(user.id);
      try {
        const { data: row, error: readError } = await sb
          .from('player_character_collections')
          .select('character_ids')
          .eq('user_id', user.id)
          .maybeSingle();
        if (readError) throw readError;

        const firstAccountSave = !row && !cachedIds && localStorage.getItem(LEGACY_IMPORT_KEY) === null;
        const legacyIds = firstAccountSave ? normalizeCharacterIds(readSave().owned) : [];
        const pendingIds = mergeCharacterIds(row?.character_ids, cachedIds, legacyIds, STARTER_IDS);

        if (firstAccountSave) localStorage.setItem(LEGACY_IMPORT_KEY, user.id);
        writeAccountCache(user.id, pendingIds);
        if (active) setOwnedCharacterIds(pendingIds);

        const { data, error: syncError } = await sb.rpc('merge_my_character_collection', {
          p_character_ids: pendingIds,
        });
        if (syncError) throw syncError;
        if (!Array.isArray(data)) throw new Error('Respons koleksi akun tidak valid.');

        const savedIds = mergeCharacterIds(data, pendingIds);
        writeAccountCache(user.id, savedIds);
        if (active) {
          setOwnedCharacterIds(savedIds);
          setError('');
        }
      } catch (loadError) {
        const fallback = cachedIds ?? mergeCharacterIds(readSave().owned, STARTER_IDS);
        if (!cachedIds && localStorage.getItem(LEGACY_IMPORT_KEY) === null) {
          localStorage.setItem(LEGACY_IMPORT_KEY, user.id);
          writeAccountCache(user.id, fallback);
        }
        if (active) {
          setOwnedCharacterIds(fallback);
          setError(`Koleksi akun belum tersinkron: ${errorMessage(loadError)}`);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCollection();
    return () => {
      active = false;
    };
  }, [authLoading, user?.id]);

  const persistOwnedCharacterIds = useCallback(async (ids: string[]) => {
    const nextIds = mergeCharacterIds(ownedCharacterIds, ids, STARTER_IDS);
    setOwnedCharacterIds(nextIds);

    const sb = supabase;
    if (user && sb) {
      writeAccountCache(user.id, nextIds);
      const { data, error: syncError } = await sb.rpc('merge_my_character_collection', {
        p_character_ids: nextIds,
      });
      if (syncError) {
        const message = `Koleksi tersimpan di perangkat, tetapi belum tersinkron ke akun: ${errorMessage(syncError)}`;
        setError(message);
        throw new Error(message);
      }
      if (!Array.isArray(data)) {
        const message = 'Koleksi tersimpan di perangkat, tetapi server mengirim respons yang tidak valid.';
        setError(message);
        throw new Error(message);
      }

      const savedIds = mergeCharacterIds(data, nextIds);
      writeAccountCache(user.id, savedIds);
      setOwnedCharacterIds(savedIds);
      setError('');
      return savedIds;
    }

    const save = readSave();
    writeSave({ ...save, owned: nextIds });
    setError('');
    return nextIds;
  }, [ownedCharacterIds, user?.id]);

  return {
    ownedCharacterIds,
    loading: authLoading || loading,
    error,
    persistOwnedCharacterIds,
    userId: user?.id ?? null,
  };
}
