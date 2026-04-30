// SashLive — Reel Service: upload, fetch, like, comment
import { getSupabaseClient } from '@/template';
import * as ImagePicker from 'expo-image-picker';

const supabase = getSupabaseClient();

export interface Reel {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url?: string;
  caption?: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  created_at: string;
  user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    vip_level: number;
    is_online?: boolean;
  };
  is_liked?: boolean;
}

export interface ReelComment {
  id: string;
  user_id: string;
  reel_id: string;
  text: string;
  created_at: string;
  user?: { username: string; avatar_url: string };
}

/** Fetch paginated reels with poster profile */
export async function fetchReels(page = 0, limit = 10): Promise<{ data: Reel[]; error: string | null }> {
  const { data, error } = await supabase
    .from('reels')
    .select(`
      *,
      user:user_id (
        id, username, display_name, avatar_url, vip_level, is_online
      )
    `)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) return { data: [], error: error.message };
  return { data: (data || []) as Reel[], error: null };
}

/** Check which reels the current user has liked */
export async function fetchLikedReelIds(userId: string, reelIds: string[]): Promise<Set<string>> {
  if (!reelIds.length) return new Set();
  const { data } = await supabase
    .from('reel_likes')
    .select('reel_id')
    .eq('user_id', userId)
    .in('reel_id', reelIds);
  return new Set((data || []).map((d: any) => d.reel_id));
}

/** Toggle like on a reel */
export async function toggleReelLike(userId: string, reelId: string, isLiked: boolean): Promise<{ newLikes: number | null; error: string | null }> {
  if (isLiked) {
    await supabase.from('reel_likes').delete().eq('user_id', userId).eq('reel_id', reelId);
    const { data } = await supabase.from('reels').select('likes').eq('id', reelId).single();
    const newCount = Math.max(0, (data?.likes || 1) - 1);
    await supabase.from('reels').update({ likes: newCount }).eq('id', reelId);
    return { newLikes: newCount, error: null };
  } else {
    const { error } = await supabase.from('reel_likes').insert({ user_id: userId, reel_id: reelId });
    if (error && error.code !== '23505') return { newLikes: null, error: error.message };
    const { data } = await supabase.from('reels').select('likes').eq('id', reelId).single();
    const newCount = (data?.likes || 0) + 1;
    await supabase.from('reels').update({ likes: newCount }).eq('id', reelId);
    return { newLikes: newCount, error: null };
  }
}

/** Increment view count */
export async function incrementReelViews(reelId: string): Promise<void> {
  const { data } = await supabase.from('reels').select('views').eq('id', reelId).single();
  if (data) await supabase.from('reels').update({ views: (data.views || 0) + 1 }).eq('id', reelId);
}

/** Fetch comments for a reel */
export async function fetchReelComments(reelId: string): Promise<{ data: ReelComment[]; error: string | null }> {
  const { data, error } = await supabase
    .from('reel_comments')
    .select(`*, user:user_id (username, avatar_url)`)
    .eq('reel_id', reelId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) return { data: [], error: error.message };
  return { data: (data || []) as ReelComment[], error: null };
}

/** Post a comment */
export async function postReelComment(userId: string, reelId: string, text: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('reel_comments').insert({ user_id: userId, reel_id: reelId, text });
  if (error) return { error: error.message };
  const { data } = await supabase.from('reels').select('comments').eq('id', reelId).single();
  await supabase.from('reels').update({ comments: (data?.comments || 0) + 1 }).eq('id', reelId);
  return { error: null };
}

/** Pick and upload a video reel */
export async function pickAndUploadReel(userId: string): Promise<{
  videoUrl: string | null;
  thumbnailUrl: string | null;
  error: string | null;
}> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return { videoUrl: null, thumbnailUrl: null, error: 'Media library permission denied' };

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    allowsEditing: true,
    videoMaxDuration: 60,
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { videoUrl: null, thumbnailUrl: null, error: 'Cancelled' };
  }

  const asset = result.assets[0];
  const videoUri = asset.uri;
  const videoPath = `${userId}/reel_${Date.now()}.mp4`;

  // Fetch and upload video
  const response = await fetch(videoUri);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(videoPath, arrayBuffer, { contentType: 'video/mp4', upsert: false });

  if (uploadError) return { videoUrl: null, thumbnailUrl: null, error: uploadError.message };

  const { data: urlData } = supabase.storage.from('media').getPublicUrl(videoPath);
  return { videoUrl: urlData.publicUrl, thumbnailUrl: null, error: null };
}

/** Insert reel record into DB */
export async function createReel(
  userId: string,
  videoUrl: string,
  caption?: string,
  thumbnailUrl?: string
): Promise<{ data: Reel | null; error: string | null }> {
  const { data, error } = await supabase
    .from('reels')
    .insert({ user_id: userId, video_url: videoUrl, thumbnail_url: thumbnailUrl, caption, likes: 0, comments: 0, shares: 0, views: 0 })
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as Reel, error: null };
}
