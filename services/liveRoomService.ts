// SashLive — Live Room DB Service
import { getSupabaseClient } from '@/template';

export interface LiveRoom {
  id: string;
  host_id: string;
  title: string;
  stream_type: 'video' | 'audio' | 'party' | 'pk';
  thumbnail_url?: string;
  viewers: number;
  is_live: boolean;
  is_pk: boolean;
  is_party: boolean;
  pk_opponent_id?: string;
  pk_score_host: number;
  pk_score_opponent: number;
  diamonds_earned: number;
  started_at: string;
  ended_at?: string;
  // Joined
  host?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

const supabase = getSupabaseClient();

// ── Create a live room ──
export async function createLiveRoom(
  hostId: string,
  title: string,
  streamType: LiveRoom['stream_type'],
  thumbnailUrl?: string
): Promise<{ data: LiveRoom | null; error: string | null }> {
  const { data, error } = await supabase
    .from('live_rooms')
    .insert({
      host_id: hostId,
      title,
      stream_type: streamType,
      thumbnail_url: thumbnailUrl,
      viewers: 0,
      is_live: true,
      is_pk: streamType === 'pk',
      is_party: streamType === 'party',
      pk_score_host: 0,
      pk_score_opponent: 0,
      diamonds_earned: 0,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as LiveRoom, error: null };
}

// ── End a live room ──
export async function endLiveRoom(
  roomId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('live_rooms')
    .update({ is_live: false, ended_at: new Date().toISOString() })
    .eq('id', roomId);
  return { error: error?.message || null };
}

// ── Fetch active live rooms ──
export async function fetchLiveRooms(
  streamType?: LiveRoom['stream_type']
): Promise<{ data: LiveRoom[]; error: string | null }> {
  let query = supabase
    .from('live_rooms')
    .select(`
      *,
      host:host_id (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('is_live', true)
    .order('viewers', { ascending: false })
    .limit(20);

  if (streamType) {
    query = query.eq('stream_type', streamType);
  }

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };
  return { data: (data || []) as LiveRoom[], error: null };
}

// ── Increment viewer count ──
export async function incrementViewers(roomId: string): Promise<void> {
  await supabase.rpc('increment', { table_name: 'live_rooms', field: 'viewers', row_id: roomId }).catch(() => {
    // Fallback: manual update
    supabase
      .from('live_rooms')
      .select('viewers')
      .eq('id', roomId)
      .single()
      .then(({ data }) => {
        if (data) {
          supabase
            .from('live_rooms')
            .update({ viewers: data.viewers + 1 })
            .eq('id', roomId);
        }
      });
  });
}

// ── Update PK scores ──
export async function updatePKScore(
  roomId: string,
  hostScore: number,
  opponentScore: number
): Promise<void> {
  await supabase
    .from('live_rooms')
    .update({ pk_score_host: hostScore, pk_score_opponent: opponentScore })
    .eq('id', roomId);
}

// ── Add diamonds earned ──
export async function addDiamondsEarned(
  roomId: string,
  amount: number
): Promise<void> {
  const { data } = await supabase
    .from('live_rooms')
    .select('diamonds_earned')
    .eq('id', roomId)
    .single();

  if (data) {
    await supabase
      .from('live_rooms')
      .update({ diamonds_earned: (data.diamonds_earned || 0) + amount })
      .eq('id', roomId);
  }
}

// ── Fetch my live rooms (history) ──
export async function fetchMyLiveRooms(
  hostId: string
): Promise<{ data: LiveRoom[]; error: string | null }> {
  const { data, error } = await supabase
    .from('live_rooms')
    .select('*')
    .eq('host_id', hostId)
    .order('started_at', { ascending: false })
    .limit(20);

  if (error) return { data: [], error: error.message };
  return { data: (data || []) as LiveRoom[], error: null };
}
