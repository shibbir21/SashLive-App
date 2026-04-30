// SashLive — Story Service (upload + fetch)
import { getSupabaseClient } from '@/template';
import * as ImagePicker from 'expo-image-picker';

const supabase = getSupabaseClient();

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption?: string;
  views: number;
  expires_at: string;
  created_at: string;
  user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    vip_level: number;
  };
}

export async function fetchActiveStories(): Promise<{ data: Story[]; error: string | null }> {
  const { data, error } = await supabase
    .from('stories')
    .select(`
      *,
      user:user_id (
        id, username, display_name, avatar_url, vip_level
      )
    `)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return { data: [], error: error.message };
  return { data: (data || []) as Story[], error: null };
}

export async function uploadStoryMedia(
  userId: string,
  base64: string,
  mimeType: string = 'image/jpeg'
): Promise<{ url: string | null; error: string | null }> {
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const filePath = `${userId}/story_${Date.now()}.${ext}`;

  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);

  const { error } = await supabase.storage
    .from('media')
    .upload(filePath, byteArray.buffer, { contentType: mimeType, upsert: false });

  if (error) return { url: null, error: error.message };

  const { data: urlData } = supabase.storage.from('media').getPublicUrl(filePath);
  return { url: urlData.publicUrl, error: null };
}

export async function createStory(
  userId: string,
  mediaUrl: string,
  caption?: string,
  mediaType: 'image' | 'video' = 'image'
): Promise<{ data: Story | null; error: string | null }> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('stories')
    .insert({
      user_id: userId,
      media_url: mediaUrl,
      media_type: mediaType,
      caption,
      views: 0,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Story, error: null };
}

export async function pickAndUploadStory(
  userId: string,
  source: 'library' | 'camera' = 'library'
): Promise<{ mediaUrl: string | null; caption: string | null; error: string | null }> {
  // Request permissions
  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return { mediaUrl: null, caption: null, error: 'Camera permission denied' };
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return { mediaUrl: null, caption: null, error: 'Photo library permission denied' };
  }

  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [9, 16], quality: 0.8, base64: true })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
        base64: true,
      });

  if (result.canceled || !result.assets?.[0]?.base64) {
    return { mediaUrl: null, caption: null, error: 'Cancelled' };
  }

  const asset = result.assets[0];
  const { url, error: uploadError } = await uploadStoryMedia(userId, asset.base64!, asset.mimeType || 'image/jpeg');

  if (uploadError || !url) {
    return { mediaUrl: null, caption: null, error: uploadError || 'Upload failed' };
  }

  return { mediaUrl: url, caption: null, error: null };
}

export async function incrementStoryViews(storyId: string): Promise<void> {
  await supabase
    .from('stories')
    .update({ views: supabase.rpc as any })
    .eq('id', storyId)
    .then(() => {});
  // Simpler approach:
  const { data } = await supabase.from('stories').select('views').eq('id', storyId).single();
  if (data) {
    await supabase.from('stories').update({ views: (data.views || 0) + 1 }).eq('id', storyId);
  }
}
