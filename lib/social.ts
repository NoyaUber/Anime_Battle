import { characters, type Fighter } from '@/lib/characters';
import { STARTER_IDS } from '@/lib/progression';

export type PlayerProfile = {
  id: string; username: string | null; bio: string; avatar_character: string | null;
  rank_points: number; last_seen: string | null; created_at: string;
};
export type Friendship = {
  id: string; requester_id: string; addressee_id: string; status: 'pending' | 'accepted'; created_at: string;
};
export const PROFILE_COLS = 'id,username,bio,avatar_character,rank_points,last_seen,created_at';

// Dianggap online bila heartbeat terakhir < 2,5 menit yang lalu (heartbeat dikirim tiap 60 dtk).
export function isOnline(lastSeen?: string | null) {
  return !!lastSeen && Date.now() - new Date(lastSeen).getTime() < 150000;
}
export function fighterFor(id?: string | null): Fighter {
  return characters.find((c) => c.id === id) ?? characters.find((c) => STARTER_IDS.includes(c.id)) ?? characters[0];
}
export function errMsg(e: unknown) {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return 'Terjadi kesalahan. Coba lagi.';
}
export function timeAgo(iso?: string | null) {
  if (!iso) return 'belum pernah';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
}
export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
// Escape karakter wildcard untuk ilike.
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => '\\' + m);
