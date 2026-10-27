export type PlayerSave = { credits?: number; pity?: number; owned?: string[]; rankPoints?: number; dailyClaimDate?: string; username?: string };
export const SAVE_KEY = 'aba-demo-save';
export const STARTER_IDS = ['tanjiro-kamado','izuku-midoriya','levi-ackerman','edward-elric','yuji-itadori','killua-zoldyck'];
export const DEFAULT_CREDITS = 300;
export function readSave(): PlayerSave {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') as PlayerSave; } catch { return {}; }
}
export function writeSave(save: PlayerSave) { if (typeof window !== 'undefined') localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
export function ensureStarterSave() {
  const old = readSave();
  const owned = Array.isArray(old.owned) && old.owned.length ? old.owned : [...STARTER_IDS];
  const save = { ...old, credits: typeof old.credits === 'number' ? old.credits : DEFAULT_CREDITS, rankPoints: typeof old.rankPoints === 'number' ? old.rankPoints : 0, owned };
  writeSave(save); return save;
}
export function awardRank(result: 'win'|'loss') {
  const save = ensureStarterSave();
  const before = Math.max(0, Number(save.rankPoints) || 0);
  const delta = result === 'win' ? 10 : -5;
  const points = Math.max(0, before + delta);
  writeSave({ ...save, rankPoints: points });
  return { before, points, delta, rank: getRank(points).name };
}
export function getRank(points: number) {
  if (points >= 1500) return { name: 'Diamond', min: 1500, next: null as number | null };
  if (points >= 1000) return { name: 'Platinum', min: 1000, next: 1500 };
  if (points >= 600) return { name: 'Gold', min: 600, next: 1000 };
  if (points >= 300) return { name: 'Silver', min: 300, next: 600 };
  if (points >= 100) return { name: 'Bronze', min: 100, next: 300 };
  return { name: 'Rookie', min: 0, next: 100 };
}
export function localDateKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function claimDaily() {
  const save = ensureStarterSave();
  const today = localDateKey();
  if (save.dailyClaimDate === today) return { ok: false, credits: typeof save.credits === 'number' ? save.credits : DEFAULT_CREDITS, message: 'Daily claim sudah diambil hari ini.' };
  const credits = (typeof save.credits === 'number' ? save.credits : DEFAULT_CREDITS) + 500;
  writeSave({ ...save, credits, dailyClaimDate: today });
  return { ok: true, credits, message: 'Daily reward +500 koin berhasil diklaim.' };
}
