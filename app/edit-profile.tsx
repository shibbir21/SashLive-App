// SashLive — Edit Profile Screen: update display_name, username, bio, cover photo, avatar
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  ActivityIndicator, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useAlert } from '@/template';
import { useAuth } from '@/template';
import { getSupabaseClient } from '@/template';
import { changeAvatar, uploadAvatar } from '@/services/avatarService';
import * as ImagePicker from 'expo-image-picker';

export default function EditProfileScreen() {
  const router = useRouter();
  const { currentUser, updateUser } = useApp();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [username, setUsername] = useState(currentUser.username || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUri, setAvatarUri] = useState(currentUser.avatar || '');
  const [coverUri, setCoverUri] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    // Load existing profile data
    if (user?.id) {
      supabase.from('user_profiles').select('website, location, cover_url').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          if (data.website) setWebsite(data.website);
          if (data.location) setLocation(data.location);
          if (data.cover_url) setCoverUri(data.cover_url);
        }
      });
    }
  }, []);

  const validateUsername = (val: string) => {
    const clean = val.replace(/[^a-z0-9_]/gi, '').toLowerCase();
    setUsername(clean);
    if (clean.length < 3) setUsernameError('At least 3 characters');
    else if (clean.length > 24) setUsernameError('Max 24 characters');
    else setUsernameError('');
    setHasChanges(true);
  };

  const handlePickAvatar = async (source: 'library' | 'camera') => {
    if (!user?.id) return;
    setUploadingAvatar(true);
    const { publicUrl, error } = await changeAvatar(user.id, source);
    setUploadingAvatar(false);
    if (error && error !== 'Cancelled') { showAlert('Upload Failed', error); return; }
    if (publicUrl) {
      setAvatarUri(publicUrl);
      setHasChanges(true);
    }
  };

  const handlePickCover = async () => {
    if (!user?.id) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showAlert('Permission needed', 'Allow photo access to change cover.'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 6],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setUploadingCover(true);
    const asset = result.assets[0];
    if (asset.base64) {
      const { publicUrl, error } = await uploadAvatar(user.id, asset.base64, asset.mimeType || 'image/jpeg');
      if (error) { showAlert('Upload Failed', error); }
      else if (publicUrl) {
        setCoverUri(publicUrl);
        setHasChanges(true);
      }
    }
    setUploadingCover(false);
  };

  const handleSave = async () => {
    if (!displayName.trim()) { showAlert('Required', 'Display name cannot be empty.'); return; }
    if (usernameError) { showAlert('Invalid Username', usernameError); return; }
    if (!user?.id) { showAlert('Not logged in'); return; }

    setSaving(true);

    // Check username uniqueness
    if (username !== currentUser.username) {
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .neq('id', user.id)
        .single();
      if (existing) {
        setSaving(false);
        showAlert('Username Taken', 'This username is already in use. Please choose another.');
        return;
      }
    }

    const updates: Record<string, any> = {
      display_name: displayName.trim(),
      username: username.toLowerCase(),
      bio: bio.trim(),
    };
    if (website.trim()) updates.website = website.trim();
    if (location.trim()) updates.location = location.trim();
    if (coverUri) updates.cover_url = coverUri;
    if (avatarUri !== currentUser.avatar) updates.avatar_url = avatarUri;

    const { error } = await supabase.from('user_profiles').update(updates).eq('id', user.id);

    setSaving(false);

    if (error) {
      showAlert('Save Failed', error.message);
      return;
    }

    // Update local state
    updateUser({
      displayName: displayName.trim(),
      username: username.toLowerCase(),
      bio: bio.trim(),
      avatar: avatarUri,
    });

    showAlert('✅ Profile Updated!', 'Your profile has been saved successfully.');
    setHasChanges(false);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => {
          if (hasChanges) {
            showAlert('Discard Changes?', 'You have unsaved changes.', [
              { text: 'Discard', style: 'destructive', onPress: () => router.back() },
              { text: 'Keep Editing', style: 'cancel' },
            ]);
          } else router.back();
        }} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Edit Profile</Text>
        <Pressable
          style={[styles.saveBtn, (saving || !hasChanges) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* Cover Photo */}
            <Pressable style={styles.coverSection} onPress={handlePickCover}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={styles.coverImg} contentFit="cover" />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <MaterialIcons name="add-photo-alternate" size={32} color={Colors.textMuted} />
                  <Text style={styles.coverPlaceholderText}>Add Cover Photo</Text>
                </View>
              )}
              {uploadingCover ? (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color="#FFF" />
                </View>
              ) : (
                <View style={styles.coverEditBadge}>
                  <MaterialIcons name="edit" size={14} color="#FFF" />
                </View>
              )}
            </Pressable>

            {/* Avatar */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarWrap}>
                <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
                {uploadingAvatar ? (
                  <View style={styles.avatarUploadOverlay}>
                    <ActivityIndicator color="#FFF" size="small" />
                  </View>
                ) : null}
              </View>
              <View style={styles.avatarActions}>
                <Pressable style={styles.avatarBtn} onPress={() => handlePickAvatar('library')}>
                  <MaterialIcons name="photo-library" size={18} color={Colors.primary} />
                  <Text style={styles.avatarBtnText}>Gallery</Text>
                </Pressable>
                <Pressable style={styles.avatarBtn} onPress={() => handlePickAvatar('camera')}>
                  <MaterialIcons name="camera-alt" size={18} color={Colors.secondary} />
                  <Text style={styles.avatarBtnText}>Camera</Text>
                </Pressable>
              </View>
            </View>

            {/* Form */}
            <View style={styles.form}>

              {/* Display Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Display Name *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={displayName}
                  onChangeText={v => { setDisplayName(v); setHasChanges(true); }}
                  placeholder="Your display name"
                  placeholderTextColor={Colors.textMuted}
                  maxLength={30}
                />
                <Text style={styles.charCount}>{displayName.length}/30</Text>
              </View>

              {/* Username */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Username *</Text>
                <View style={[styles.fieldInputWrap, usernameError ? styles.fieldInputError : null]}>
                  <Text style={styles.fieldPrefix}>@</Text>
                  <TextInput
                    style={[styles.fieldInput, { flex: 1, borderWidth: 0 }]}
                    value={username}
                    onChangeText={validateUsername}
                    placeholder="username"
                    placeholderTextColor={Colors.textMuted}
                    maxLength={24}
                    autoCapitalize="none"
                  />
                </View>
                {usernameError ? <Text style={styles.errorText}>{usernameError}</Text> : (
                  <Text style={styles.fieldHint}>Letters, numbers, and underscores only</Text>
                )}
              </View>

              {/* Bio */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Bio</Text>
                <TextInput
                  style={[styles.fieldInput, styles.bioInput]}
                  value={bio}
                  onChangeText={v => { setBio(v); setHasChanges(true); }}
                  placeholder="Tell the world about yourself..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  maxLength={150}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{bio.length}/150</Text>
              </View>

              {/* Website */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Website</Text>
                <View style={styles.fieldInputWrap}>
                  <MaterialIcons name="link" size={16} color={Colors.textMuted} style={{ marginRight: 6 }} />
                  <TextInput
                    style={[styles.fieldInput, { flex: 1, borderWidth: 0 }]}
                    value={website}
                    onChangeText={v => { setWebsite(v); setHasChanges(true); }}
                    placeholder="https://yourwebsite.com"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              </View>

              {/* Location */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Location</Text>
                <View style={styles.fieldInputWrap}>
                  <MaterialIcons name="location-on" size={16} color={Colors.textMuted} style={{ marginRight: 6 }} />
                  <TextInput
                    style={[styles.fieldInput, { flex: 1, borderWidth: 0 }]}
                    value={location}
                    onChangeText={v => { setLocation(v); setHasChanges(true); }}
                    placeholder="City, Country"
                    placeholderTextColor={Colors.textMuted}
                    maxLength={50}
                  />
                </View>
              </View>

              {/* Privacy Settings Quick */}
              <View style={styles.privacySection}>
                <Text style={styles.sectionTitle}>⚙️ Account Settings</Text>
                {[
                  { icon: 'lock', label: 'Change Password', onPress: () => showAlert('Password', 'Password change via email OTP.') },
                  { icon: 'notifications', label: 'Notification Settings', onPress: () => router.push('/settings' as any) },
                  { icon: 'security', label: 'Privacy Settings', onPress: () => showAlert('Privacy', 'Privacy settings coming soon.') },
                  { icon: 'delete', label: 'Delete Account', onPress: () => showAlert('Delete Account?', 'This cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => showAlert('Deleted', 'Account deletion requested.') },
                  ]) },
                ].map(item => (
                  <Pressable key={item.label} style={styles.settingRow} onPress={item.onPress}>
                    <MaterialIcons name={item.icon as any} size={20} color={item.label === 'Delete Account' ? Colors.error : Colors.textSecondary} />
                    <Text style={[styles.settingLabel, item.label === 'Delete Account' && { color: Colors.error }]}>{item.label}</Text>
                    <MaterialIcons name="chevron-right" size={18} color={Colors.textMuted} />
                  </Pressable>
                ))}
              </View>

              {/* Save Button (bottom) */}
              <Pressable
                style={[styles.saveBottomBtn, (!hasChanges || saving) && styles.saveBottomBtnDisabled]}
                onPress={handleSave}
                disabled={saving || !hasChanges}
              >
                {saving ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <MaterialIcons name="check" size={20} color="#FFF" />
                    <Text style={styles.saveBottomBtnText}>Save Changes</Text>
                  </>
                )}
              </Pressable>
              <View style={{ height: 40 }} />
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: 7, minWidth: 64, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: Colors.surfaceElevated },
  saveBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  // Cover
  coverSection: { height: 140, backgroundColor: Colors.surface, position: 'relative', marginBottom: 0 },
  coverImg: { ...StyleSheet.absoluteFillObject },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.bgSecondary },
  coverPlaceholderText: { color: Colors.textMuted, fontSize: FontSize.sm },
  coverEditBadge: { position: 'absolute', bottom: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  uploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  // Avatar
  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  avatarWrap: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: Colors.primary },
  avatarUploadOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  avatarActions: { flex: 1, flexDirection: 'row', gap: Spacing.sm },
  avatarBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: Colors.surface, borderRadius: BorderRadius.pill, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder },
  avatarBtnText: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  // Form
  form: { padding: Spacing.md, gap: Spacing.md },
  fieldGroup: { gap: 6 },
  fieldLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.textPrimary, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.cardBorder },
  fieldInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder },
  fieldInputError: { borderColor: Colors.error },
  fieldPrefix: { color: Colors.textMuted, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  fieldHint: { color: Colors.textMuted, fontSize: FontSize.xs },
  errorText: { color: Colors.error, fontSize: FontSize.xs },
  bioInput: { minHeight: 80, textAlignVertical: 'top', paddingTop: Spacing.sm },
  charCount: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'right' },
  privacySection: { gap: Spacing.sm, marginTop: Spacing.sm },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder },
  settingLabel: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.sm },
  saveBottomBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, marginTop: Spacing.sm, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  saveBottomBtnDisabled: { backgroundColor: Colors.surfaceElevated, shadowOpacity: 0 },
  saveBottomBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
});
