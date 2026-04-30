// SashLive — Follow Service with Supabase DB
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

export async function followUser(followerId: string, followingId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId });
  if (error && error.code !== '23505') return { error: error.message }; // ignore duplicate
  return { error: null };
}

export async function unfollowUser(followerId: string, followingId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
  return { error: error?.message || null };
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .single();
  return !!data;
}

export async function fetchFollowers(userId: string): Promise<{ data: any[]; error: string | null }> {
  const { data, error } = await supabase
    .from('follows')
    .select(`
      follower_id,
      follower:follower_id (
        id, username, display_name, avatar_url, followers, vip_level
      )
    `)
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return { data: [], error: error.message };
  return { data: (data || []).map((d: any) => d.follower).filter(Boolean), error: null };
}

export async function fetchFollowing(userId: string): Promise<{ data: any[]; error: string | null }> {
  const { data, error } = await supabase
    .from('follows')
    .select(`
      following_id,
      following:following_id (
        id, username, display_name, avatar_url, followers, vip_level
      )
    `)
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return { data: [], error: error.message };
  return { data: (data || []).map((d: any) => d.following).filter(Boolean), error: null };
}

export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const { data } = await supabase
    .from('user_profiles')
    .select('followers, following')
    .eq('id', userId)
    .single();
  return { followers: data?.followers || 0, following: data?.following || 0 };
}
