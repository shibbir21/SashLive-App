// SashLive — Avatar Upload Service
import { getSupabaseClient } from '@/template';
import * as ImagePicker from 'expo-image-picker';

const supabase = getSupabaseClient();

// ── Pick image from library ──
export async function pickImageFromLibrary(): Promise<{
  uri: string | null;
  base64: string | null;
  mimeType: string;
  error: string | null;
}> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    return { uri: null, base64: null, mimeType: 'image/jpeg', error: 'Permission denied. Please allow photo access in settings.' };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
    base64: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { uri: null, base64: null, mimeType: 'image/jpeg', error: 'Cancelled' };
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    base64: asset.base64 || null,
    mimeType: asset.mimeType || 'image/jpeg',
    error: null,
  };
}

// ── Take photo with camera ──
export async function takePhoto(): Promise<{
  uri: string | null;
  base64: string | null;
  mimeType: string;
  error: string | null;
}> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    return { uri: null, base64: null, mimeType: 'image/jpeg', error: 'Camera permission denied.' };
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
    base64: true,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { uri: null, base64: null, mimeType: 'image/jpeg', error: 'Cancelled' };
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    base64: asset.base64 || null,
    mimeType: asset.mimeType || 'image/jpeg',
    error: null,
  };
}

// ── Upload avatar to Supabase Storage ──
export async function uploadAvatar(
  userId: string,
  base64: string,
  mimeType: string = 'image/jpeg'
): Promise<{ publicUrl: string | null; error: string | null }> {
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const filePath = `${userId}/avatar_${Date.now()}.${ext}`;

  // Convert base64 to ArrayBuffer
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(filePath, byteArray.buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) return { publicUrl: null, error: error.message };

  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return { publicUrl: urlData.publicUrl, error: null };
}

// ── Update user profile avatar in DB ──
export async function updateUserAvatar(
  userId: string,
  avatarUrl: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);

  return { error: error?.message || null };
}

// ── Full flow: pick + upload + update DB ──
export async function changeAvatar(
  userId: string,
  source: 'library' | 'camera' = 'library'
): Promise<{ publicUrl: string | null; error: string | null }> {
  const picked = source === 'camera' ? await takePhoto() : await pickImageFromLibrary();

  if (picked.error || !picked.base64) {
    return { publicUrl: null, error: picked.error || 'No image selected' };
  }

  const { publicUrl, error: uploadError } = await uploadAvatar(userId, picked.base64, picked.mimeType);
  if (uploadError || !publicUrl) {
    return { publicUrl: null, error: uploadError || 'Upload failed' };
  }

  const { error: updateError } = await updateUserAvatar(userId, publicUrl);
  if (updateError) {
    return { publicUrl, error: updateError };
  }

  return { publicUrl, error: null };
}
