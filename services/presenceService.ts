// SashLive — Presence Service: heartbeat + last seen
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

/** Update online status and last_seen for current user */
export async function updatePresence(userId: string, isOnline: boolean): Promise<void> {
  await supabase
    .from('user_profiles')
    .update({ is_online: isOnline, last_seen: new Date().toISOString() })
    .eq('id', userId);
}

/** Format relative time string */
export function formatLastSeen(lastSeen: string | null | undefined, isOnline: boolean): string {
  if (isOnline) return 'Online now';
  if (!lastSeen) return 'Long time ago';
  const diff = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(lastSeen).toLocaleDateString();
}

/** Fetch is_online + last_seen for a list of user IDs */
export async function fetchPresenceBulk(userIds: string[]): Promise<Map<string, { is_online: boolean; last_seen: string }>> {
  if (!userIds.length) return new Map();
  const { data } = await supabase
    .from('user_profiles')
    .select('id, is_online, last_seen')
    .in('id', userIds);
  const map = new Map<string, { is_online: boolean; last_seen: string }>();
  (data || []).forEach((u: any) => map.set(u.id, { is_online: u.is_online, last_seen: u.last_seen }));
  return map;
}
