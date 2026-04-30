// SashLive — PK Battle Service
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

export interface PKBattle {
  id: string;
  room_id?: string;
  host_id: string;
  opponent_id?: string;
  host_score: number;
  opponent_score: number;
  status: 'pending' | 'active' | 'finished';
  winner_id?: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds: number;
  created_at: string;
  host?: { id: string; username: string; display_name: string; avatar_url: string };
  opponent?: { id: string; username: string; display_name: string; avatar_url: string };
}

/** Create a PK invite (challenger sends to opponent) */
export async function createPKInvite(
  hostId: string,
  opponentId: string,
  durationSeconds = 300
): Promise<{ data: PKBattle | null; error: string | null }> {
  const { data, error } = await supabase
    .from('pk_battles')
    .insert({ host_id: hostId, opponent_id: opponentId, status: 'pending', duration_seconds: durationSeconds })
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as PKBattle, error: null };
}

/** Accept a PK invite */
export async function acceptPKInvite(battleId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('pk_battles')
    .update({ status: 'active', started_at: new Date().toISOString() })
    .eq('id', battleId);
  return { error: error?.message || null };
}

/** Decline a PK invite */
export async function declinePKInvite(battleId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('pk_battles')
    .update({ status: 'finished', ended_at: new Date().toISOString() })
    .eq('id', battleId);
  return { error: error?.message || null };
}

/** Poll pending PK invites for a user (includes challenger display name) */
export async function fetchPendingPKInvites(userId: string): Promise<{ data: (PKBattle & { challenger_name?: string })[]; error: string | null }> {
  const { data, error } = await supabase
    .from('pk_battles')
    .select(`
      *,
      host:host_id (id, username, display_name, avatar_url),
      opponent:opponent_id (id, username, display_name, avatar_url)
    `)
    .eq('opponent_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) return { data: [], error: error.message };
  return {
    data: ((data || []) as any[]).map(b => ({
      ...b,
      challenger_name: b.host?.display_name || b.host?.username || 'Someone',
    })),
    error: null,
  };
}

/** Poll a specific battle's live scores */
export async function fetchBattleScores(battleId: string): Promise<PKBattle | null> {
  const { data } = await supabase
    .from('pk_battles')
    .select('host_score, opponent_score, status, winner_id')
    .eq('id', battleId)
    .single();
  return data as PKBattle | null;
}

/** Update scores for a running battle */
export async function updateBattleScores(
  battleId: string,
  hostScore: number,
  opponentScore: number
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('pk_battles')
    .update({ host_score: hostScore, opponent_score: opponentScore })
    .eq('id', battleId);
  return { error: error?.message || null };
}

/** End battle and set winner */
export async function endBattle(
  battleId: string,
  winnerId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('pk_battles')
    .update({ status: 'finished', winner_id: winnerId, ended_at: new Date().toISOString() })
    .eq('id', battleId);
  return { error: error?.message || null };
}

/** Fetch battles for a user (their own challenges or ones they received) */
export async function fetchUserBattles(userId: string): Promise<{ data: PKBattle[]; error: string | null }> {
  const { data, error } = await supabase
    .from('pk_battles')
    .select(`
      *,
      host:host_id (id, username, display_name, avatar_url),
      opponent:opponent_id (id, username, display_name, avatar_url)
    `)
    .or(`host_id.eq.${userId},opponent_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return { data: [], error: error.message };
  return { data: (data || []) as PKBattle[], error: null };
}
