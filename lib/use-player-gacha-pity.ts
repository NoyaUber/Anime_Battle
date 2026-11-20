'use client';

import { useCallback, useEffect, useState } from 'react';
import { normalizePity, resolveInitialPity } from '@/lib/gacha-pity';
import { readSave, writeSave } from '@/lib/progression';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/use-user';

const ACCOUNT_CACHE_PREFIX = 'aba-gacha-pity-v1:';
const LEGACY_IMPORT_KEY = 'aba-gacha-pity-legacy-imported-v1';

function accountCacheKey(userId: string) {
  return `${ACCOUNT_CACHE_PREFIX}${userId}`;
}

function readAccountPity(userId: string): number | null {
  try {
    const value = localStorage.getItem(accountCacheKey(userId));
    if (value === null) return null;
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'number' ? normalizePity(parsed) : null;
  } catch {
    return null;
  }
}

function writeAccountPity(userId: string, pity: number) {
  try {
    localStorage.setItem(accountCacheKey(userId), JSON.stringify(pity));
  } catch {
    // The Supabase row remains authoritative if browser storage is unavailable.
  }
}

function legacyImportClaimed() {
  try {
    return localStorage.getItem(LEGACY_IMPORT_KEY) !== null;
  } catch {
    return true;
  }
}

function claimLegacyImport(userId: string) {
  try {
    localStorage.setItem(LEGACY_IMPORT_KEY, userId);
  } catch {
    // Account data stays isolated in Supabase if local storage is unavailable.
  }
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'Gagal menyinkronkan pity ke akun.';
}

export function usePlayerGachaPity() {
  const { user, loading: authLoading } = useUser();
  const [pity, setPity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    let active = true;

    async function loadPity() {
      setLoading(true);
      setError('');

      if (!user || !supabase) {
        const localPity = normalizePity(readSave().pity);
        if (active) {
          setPity(localPity);
          setLoading(false);
        }
        return;
      }

      const cachedPity = readAccountPity(user.id);
      try {
        const { data: row, error: readError } = await supabase
          .from('gacha_pity')
          .select('pulls_since_mythic')
          .eq('user_id', user.id)
          .maybeSingle();
        if (readError) throw readError;

        const importLegacy = !row && cachedPity === null && !legacyImportClaimed();
        const nextPity = resolveInitialPity(
          row?.pulls_since_mythic,
          cachedPity,
          importLegacy ? readSave().pity : null,
          importLegacy,
        );
        if (importLegacy) claimLegacyImport(user.id);
        writeAccountPity(user.id, nextPity);
        if (active) setPity(nextPity);

        if (!row) {
          const { data, error: writeError } = await supabase.rpc('save_my_gacha_pity', {
            p_pulls_since_mythic: nextPity,
          });
          if (writeError) {
            if (active) setError(`Pity tersimpan di perangkat, tetapi belum tersinkron ke akun: ${errorMessage(writeError)}`);
            return;
          }
          if (typeof data !== 'number') {
            if (active) setError('Pity tersimpan di perangkat, tetapi respons Supabase tidak valid.');
            return;
          }

          const savedPity = normalizePity(data);
          writeAccountPity(user.id, savedPity);
          if (active) setPity(savedPity);
        }
      } catch (loadError) {
        const importLegacy = cachedPity === null && !legacyImportClaimed();
        const fallbackPity = resolveInitialPity(
          null,
          cachedPity,
          importLegacy ? readSave().pity : null,
          importLegacy,
        );
        if (importLegacy) claimLegacyImport(user.id);
        writeAccountPity(user.id, fallbackPity);
        if (active) {
          setPity(fallbackPity);
          setError(`Pity akun belum tersinkron: ${errorMessage(loadError)}`);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPity();
    return () => {
      active = false;
    };
  }, [authLoading, user?.id]);

  const persistPity = useCallback(async (value: number) => {
    const nextPity = normalizePity(value);
    setPity(nextPity);

    const sb = supabase;
    if (!user || !sb) {
      writeSave({ ...readSave(), pity: nextPity });
      setError('');
      return nextPity;
    }

    writeAccountPity(user.id, nextPity);
    const { data, error: writeError } = await sb.rpc('save_my_gacha_pity', {
      p_pulls_since_mythic: nextPity,
    });
    if (writeError) {
      const message = `Pity tersimpan di perangkat, tetapi belum tersinkron ke akun: ${errorMessage(writeError)}`;
      setError(message);
      throw new Error(message);
    }
    if (typeof data !== 'number') {
      const message = 'Pity tersimpan di perangkat, tetapi respons Supabase tidak valid.';
      setError(message);
      throw new Error(message);
    }

    const savedPity = normalizePity(data);
    writeAccountPity(user.id, savedPity);
    setPity(savedPity);
    setError('');
    return savedPity;
  }, [user?.id]);

  return { pity, loading: authLoading || loading, error, persistPity, userId: user?.id ?? null };
}
