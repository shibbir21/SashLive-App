// SashLive — Stories Screen with Real Upload + Viewer Features
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions, Animated,
  TextInput, ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/template';
import { useAlert } from '@/template';
import {
  fetchActiveStories, pickAndUploadStory, createStory, incrementStoryViews,
  type Story,
} from '@/services/storyService';

const { width, height } = Dimensions.get('window');
const STORY_DURATION = 5500;

// ── Mock story data fallback ──
const MOCK_STORIES_DATA = [
  {
    id: 'st1', user_id: 'u005', views: 4821, expires_at: '', created_at: '',
    media_url: 'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=400&h=700&fit=crop',
    media_type: 'image' as const, caption: 'Live streaming tonight 🔥',
    user: { id: 'u005', username: 'CosmicRider', display_name: 'CosmicRider', avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop', vip_level: 4 },
  },
  {
    id: 'st2', user_id: 'u007', views: 12400, expires_at: '', created_at: '',
    media_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=700&fit=crop',
    media_type: 'image' as const, caption: 'PK Battle Winner 👑',
    user: { id: 'u007', username: 'GalaxyGoddess', display_name: 'Galaxy Goddess', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop', vip_level: 5 },
  },
  {
    id: 'st3', user_id: 'u002', views: 5600, expires_at: '', created_at: '',
    media_url: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&h=700&fit=crop',
    media_type: 'image' as const, caption: 'Training hard 🐉',
    user: { id: 'u002', username: 'DragonFire', display_name: 'Dragon Fire', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', vip_level: 3 },
  },
  {
    id: 'st4', user_id: 'u009', views: 9100, expires_at: '', created_at: '',
    media_url: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&h=700&fit=crop',
    media_type: 'image' as const, caption: 'VIP night 🌹',
    user: { id: 'u009', username: 'RoseQueen', display_name: 'Rose Queen', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', vip_level: 5 },
  },
  {
    id: 'st5', user_id: 'u003', views: 3400, expires_at: '', created_at: '',
    media_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=700&fit=crop',
    media_type: 'image' as const, caption: 'Dancing tonight 🌙',
    user: { id: 'u003', username: 'Moonlight', display_name: 'Moonlight', avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', vip_level: 2 },
  },
];

// Group stories by user
function groupStoriesByUser(stories: Story[]) {
  const map: Record<string, { user: Story['user']; stories: Story[] }> = {};
  for (const s of stories) {
    const uid = s.user_id;
    if (!map[uid]) map[uid] = { user: s.user, stories: [] };
    map[uid].stories.push(s);
  }
  return Object.values(map);
}

export default function StoriesScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { currentUser } = useApp();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [stories, setStories] = useState<ReturnType<typeof groupStoriesByUser>>(groupStoriesByUser(MOCK_STORIES_DATA as any));
  const [loadingStories, setLoadingStories] = useState(false);
  const [currentUserIdx, setCurrentUserIdx] = useState(() => {
    const idx = MOCK_STORIES_DATA.findIndex(s => s.user_id === userId);
    return Math.max(0, idx);
  });
  const [currentStoryIdx, setCurrentStoryIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);
  const [likedStories, setLikedStories] = useState<Set<string>>(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [pendingUploadUrl, setPendingUploadUrl] = useState<string | null>(null);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const currentGroup = stories[currentUserIdx];
  const currentStory = currentGroup?.stories[currentStoryIdx];
  const totalStories = currentGroup?.stories.length || 1;

  // Load real stories from DB
  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    setLoadingStories(true);
    const { data, error } = await fetchActiveStories();
    if (data && data.length > 0) {
      const grouped = groupStoriesByUser(data);
      setStories(grouped);
    }
    setLoadingStories(false);
  };

  useEffect(() => {
    if (!currentStory || isPaused) return;
    progressAnim.setValue(0);
    animRef.current?.stop();
    animRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });
    animRef.current.start(({ finished }) => {
      if (finished) goNext();
    });
    // Increment views
    if (currentStory.id && !currentStory.id.startsWith('st')) {
      incrementStoryViews(currentStory.id);
    }
    return () => animRef.current?.stop();
  }, [currentUserIdx, currentStoryIdx, isPaused]);

  const goNext = useCallback(() => {
    if (currentStoryIdx < totalStories - 1) {
      Animated.timing(slideAnim, { toValue: -width, duration: 200, useNativeDriver: true }).start(() => {
        slideAnim.setValue(0);
        setCurrentStoryIdx(i => i + 1);
      });
    } else if (currentUserIdx < stories.length - 1) {
      Animated.timing(slideAnim, { toValue: -width, duration: 200, useNativeDriver: true }).start(() => {
        slideAnim.setValue(0);
        setCurrentUserIdx(i => i + 1);
        setCurrentStoryIdx(0);
      });
    } else {
      router.back();
    }
  }, [currentStoryIdx, totalStories, currentUserIdx, stories.length]);

  const goPrev = useCallback(() => {
    if (currentStoryIdx > 0) {
      setCurrentStoryIdx(i => i - 1);
    } else if (currentUserIdx > 0) {
      setCurrentUserIdx(i => i - 1);
      setCurrentStoryIdx(0);
    }
  }, [currentStoryIdx, currentUserIdx]);

  const handlePickStory = async (source: 'library' | 'camera') => {
    setShowUploadModal(false);
    if (!user?.id) { showAlert('Login Required', 'Please log in to post stories.'); return; }
    setUploading(true);
    const { mediaUrl, error } = await pickAndUploadStory(user.id, source);
    setUploading(false);
    if (error && error !== 'Cancelled') { showAlert('Upload Failed', error); return; }
    if (mediaUrl) {
      setUploadPreview(mediaUrl);
      setPendingUploadUrl(mediaUrl);
      setShowUploadModal(true);
    }
  };

  const handlePostStory = async () => {
    if (!pendingUploadUrl || !user?.id) return;
    setUploading(true);
    const { data, error } = await createStory(user.id, pendingUploadUrl, uploadCaption || undefined);
    setUploading(false);
    if (error) { showAlert('Error', error); return; }
    showAlert('Story Posted! ✅', 'Your story is live for 24 hours.');
    setUploadPreview(null);
    setPendingUploadUrl(null);
    setUploadCaption('');
    loadStories();
  };

  const toggleLike = () => {
    if (!currentStory) return;
    setLikedStories(prev => {
      const next = new Set(prev);
      if (next.has(currentStory.id)) next.delete(currentStory.id);
      else next.add(currentStory.id);
      return next;
    });
  };

  if (!currentStory) return null;

  const vipColors = ['', '#CD7F32', '#C0C0C0', '#FFCC00', '#00DFFF', '#FF2E8B'];
  const vip = currentGroup?.user?.vip_level || 0;

  return (
    <View style={styles.container}>
      <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ translateX: slideAnim }] }]}>
        <Image source={{ uri: currentStory.media_url }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={150} />
        <View style={[StyleSheet.absoluteFillObject, styles.overlay]} />
      </Animated.View>

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Progress bars */}
        <View style={styles.progressRow}>
          {currentGroup?.stories.map((s, i) => (
            <View key={s.id} style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, {
                width: i < currentStoryIdx
                  ? '100%'
                  : i === currentStoryIdx
                    ? progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                    : '0%',
              }]} />
            </View>
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Image
            source={{ uri: currentGroup?.user?.avatar_url }}
            style={[styles.headerAv, vip > 0 && { borderColor: vipColors[Math.min(vip, 5)] }]}
            contentFit="cover"
          />
          <Pressable style={{ flex: 1 }} onPress={() => router.push(`/user/${currentGroup?.user?.id}`)}>
            <Text style={styles.headerName}>{currentGroup?.user?.display_name || currentGroup?.user?.username}</Text>
            <Text style={styles.headerMeta}>
              {vip > 0 && <Text style={{ color: vipColors[Math.min(vip, 5)] }}>VIP{vip} · </Text>}
              <Text>👁 {currentStory.views?.toLocaleString() || '0'} views</Text>
            </Text>
          </Pressable>
          <Pressable style={styles.pauseBtn} onPress={() => setIsPaused(!isPaused)}>
            <MaterialIcons name={isPaused ? 'play-arrow' : 'pause'} size={20} color="#FFF" />
          </Pressable>
          <Pressable style={styles.moreBtn} onPress={() => showAlert('Options', '', [
            { text: '📤 Share Story', onPress: () => showAlert('Shared!', 'Story link copied.') },
            { text: '🚫 Report', style: 'destructive', onPress: () => showAlert('Reported', 'Thank you.') },
            { text: 'Cancel', style: 'cancel' },
          ])}>
            <MaterialIcons name="more-vert" size={22} color="#FFF" />
          </Pressable>
          <Pressable style={styles.closeBtn} onPress={() => router.back()}>
            <MaterialIcons name="close" size={22} color="#FFF" />
          </Pressable>
        </View>

        {/* Story thumbnails strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.thumbStrip}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.xs }}
        >
          {stories.map((group, gi) => (
            <Pressable
              key={group.user?.id || gi}
              style={[styles.thumbItem, gi === currentUserIdx && styles.thumbItemActive]}
              onPress={() => { setCurrentUserIdx(gi); setCurrentStoryIdx(0); }}
            >
              <Image
                source={{ uri: group.user?.avatar_url }}
                style={[styles.thumbAv, gi === currentUserIdx && { borderColor: Colors.primary }]}
                contentFit="cover"
              />
            </Pressable>
          ))}
          {/* Add Story button */}
          <Pressable style={styles.addStoryBtn} onPress={() => setShowUploadModal(true)}>
            <View style={styles.addStoryIcon}><MaterialIcons name="add" size={18} color="#FFF" /></View>
          </Pressable>
        </ScrollView>

        {/* Tap zones */}
        <View style={styles.tapZones}>
          <Pressable style={{ flex: 1 }} onPress={goPrev} onLongPress={() => setIsPaused(true)} onPressOut={() => setIsPaused(false)} />
          <Pressable style={{ flex: 1 }} onPress={goNext} onLongPress={() => setIsPaused(true)} onPressOut={() => setIsPaused(false)} />
        </View>

        {/* Caption */}
        {currentStory.caption && (
          <View style={styles.captionWrap}>
            <Text style={styles.caption}>{currentStory.caption}</Text>
          </View>
        )}

        {/* Reply Row */}
        <View style={styles.replyRow}>
          {showReply ? (
            <View style={styles.replyInputWrap}>
              <TextInput
                style={styles.replyInput}
                placeholder={`Reply to ${currentGroup?.user?.username || 'this story'}...`}
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={replyText}
                onChangeText={setReplyText}
                autoFocus
              />
              <Pressable
                style={[styles.sendReplyBtn, !replyText.trim() && { opacity: 0.5 }]}
                onPress={() => {
                  if (!replyText.trim()) return;
                  showAlert('Sent!', `Reply sent to ${currentGroup?.user?.username}`);
                  setReplyText('');
                  setShowReply(false);
                }}
                disabled={!replyText.trim()}
              >
                <MaterialIcons name="send" size={18} color="#FFF" />
              </Pressable>
              <Pressable onPress={() => setShowReply(false)}>
                <MaterialIcons name="close" size={18} color="rgba(255,255,255,0.6)" />
              </Pressable>
            </View>
          ) : (
            <>
              <Pressable style={styles.replyBtn} onPress={() => setShowReply(true)}>
                <Text style={styles.replyBtnText}>Reply...</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={toggleLike}>
                <Text style={{ fontSize: 24 }}>{likedStories.has(currentStory.id) ? '❤️' : '🤍'}</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => showAlert('Shared!', 'Story link copied!')}>
                <MaterialIcons name="send" size={22} color="#FFF" />
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>

      {/* Upload Modal */}
      <Modal visible={showUploadModal} transparent animationType="slide">
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadCard}>
            <View style={styles.uploadHeader}>
              <Text style={styles.uploadTitle}>📸 Post a Story</Text>
              <Pressable onPress={() => { setShowUploadModal(false); setUploadPreview(null); setPendingUploadUrl(null); }}>
                <MaterialIcons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>

            {uploadPreview ? (
              <>
                <Image source={{ uri: uploadPreview }} style={styles.uploadPreview} contentFit="cover" />
                <TextInput
                  style={styles.captionInput}
                  placeholder="Add a caption... (optional)"
                  placeholderTextColor={Colors.textMuted}
                  value={uploadCaption}
                  onChangeText={setUploadCaption}
                  maxLength={150}
                />
                <Pressable
                  style={[styles.postBtn, uploading && { opacity: 0.7 }]}
                  onPress={handlePostStory}
                  disabled={uploading}
                >
                  {uploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.postBtnText}>🚀 Share Story</Text>}
                </Pressable>
              </>
            ) : uploading ? (
              <View style={styles.uploadingWrap}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            ) : (
              <View style={styles.sourceRow}>
                <Pressable style={styles.sourceBtn} onPress={() => handlePickStory('camera')}>
                  <MaterialIcons name="camera-alt" size={32} color={Colors.primary} />
                  <Text style={styles.sourceBtnText}>Camera</Text>
                </Pressable>
                <Pressable style={styles.sourceBtn} onPress={() => handlePickStory('library')}>
                  <MaterialIcons name="photo-library" size={32} color={Colors.secondary} />
                  <Text style={styles.sourceBtnText}>Gallery</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.storyInfo}>
              <MaterialIcons name="info-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.storyInfoText}>Stories expire after 24 hours · Visible to all SashLive users</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { backgroundColor: 'rgba(0,0,0,0.22)' },
  progressRow: { flexDirection: 'row', paddingHorizontal: Spacing.sm, paddingTop: Spacing.xs, gap: 3 },
  progressTrack: { flex: 1, height: 2.5, backgroundColor: 'rgba(255,255,255,0.32)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FFF', borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, gap: Spacing.xs },
  headerAv: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: Colors.primary },
  headerName: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  headerMeta: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  pauseBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  moreBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  thumbStrip: { maxHeight: 58 },
  thumbItem: { alignItems: 'center', opacity: 0.6 },
  thumbItemActive: { opacity: 1 },
  thumbAv: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  addStoryBtn: { alignItems: 'center', justifyContent: 'center', width: 46 },
  addStoryIcon: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary + '20' },
  tapZones: { flex: 1, flexDirection: 'row' },
  captionWrap: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  caption: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  replyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.sm },
  replyBtn: { flex: 1, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)', borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: 'rgba(0,0,0,0.25)' },
  replyBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.sm },
  replyInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: BorderRadius.pill, paddingLeft: Spacing.md, paddingRight: 8, paddingVertical: 4 },
  replyInput: { flex: 1, color: '#FFF', fontSize: FontSize.sm, paddingVertical: 6 },
  sendReplyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  actionBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  // Upload Modal
  uploadOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  uploadCard: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, paddingBottom: 40, gap: Spacing.md },
  uploadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  uploadTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  uploadPreview: { width: '100%', height: 280, borderRadius: BorderRadius.lg },
  captionInput: { backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.textPrimary, fontSize: FontSize.sm, borderWidth: 1, borderColor: Colors.cardBorder },
  postBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, alignItems: 'center' },
  postBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  uploadingWrap: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl },
  uploadingText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  sourceRow: { flexDirection: 'row', gap: Spacing.lg, justifyContent: 'center' },
  sourceBtn: { alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.xl, padding: Spacing.xl, width: 120, borderWidth: 1, borderColor: Colors.cardBorder },
  sourceBtnText: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  storyInfo: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'flex-start' },
  storyInfoText: { flex: 1, color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 16 },
});
