// SashLive — Full TikTok-style Reels Feed with expo-video, Real Upload, Like/Comment
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Dimensions,
  ViewToken, Animated, Modal, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useAuth } from '@/template';
import { useAlert } from '@/template';
import { useApp } from '@/contexts/AppContext';
import {
  fetchReels, fetchLikedReelIds, toggleReelLike, incrementReelViews,
  fetchReelComments, postReelComment, pickAndUploadReel, createReel,
  type Reel, type ReelComment,
} from '@/services/reelService';

const { width, height } = Dimensions.get('window');

const MOCK_REELS_DATA: Reel[] = [
  {
    id: 'r1', user_id: 'u006', video_url: '', thumbnail_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=800&fit=crop',
    caption: 'Electric vibes tonight ⚡🔥 Follow for daily streams!', likes: 12400, comments: 567, shares: 234, views: 98000,
    created_at: '', user: { id: 'u006', username: 'NeonPulse', display_name: 'Neon Pulse', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', vip_level: 2, is_online: true },
  },
  {
    id: 'r2', user_id: 'u003', video_url: '', thumbnail_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=800&fit=crop',
    caption: 'Dance with me under the moonlight 🌙✨ Who is watching?', likes: 8900, comments: 234, shares: 120, views: 45000,
    created_at: '', user: { id: 'u003', username: 'Moonlight', display_name: 'Moonlight', avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', vip_level: 2, is_online: false },
  },
  {
    id: 'r3', user_id: 'u007', video_url: '', thumbnail_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=800&fit=crop',
    caption: 'Cosmic energy 🌌👑 PK battle champion 3 weeks in a row!', likes: 34100, comments: 1892, shares: 980, views: 210000,
    created_at: '', user: { id: 'u007', username: 'GalaxyGoddess', display_name: 'Galaxy Goddess', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop', vip_level: 5, is_online: true },
  },
  {
    id: 'r4', user_id: 'u005', video_url: '', thumbnail_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=800&fit=crop',
    caption: 'Riding through the cosmos 🚀 New stream tonight at 9PM!', likes: 21000, comments: 890, shares: 450, views: 120000,
    created_at: '', user: { id: 'u005', username: 'CosmicRider', display_name: 'Cosmic Rider', avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop', vip_level: 4, is_online: false },
  },
  {
    id: 'r5', user_id: 'u009', video_url: '', thumbnail_url: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&h=800&fit=crop',
    caption: 'VIP exclusive behind the scenes 🌹 Join my private room!', likes: 9100, comments: 432, shares: 210, views: 58000,
    created_at: '', user: { id: 'u009', username: 'RoseQueen', display_name: 'Rose Queen', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', vip_level: 5, is_online: true },
  },
];

// ── Video Player Item (uses expo-video useVideoPlayer per item) ──
function VideoReelItem({
  item, isActive, onLike, onCommentOpen, onFollowToggle, followedIds,
}: {
  item: Reel; isActive: boolean;
  onLike: (id: string) => void;
  onCommentOpen: (id: string) => void;
  onFollowToggle: (userId: string) => void;
  followedIds: Set<string>;
}) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartAnim = useRef(new Animated.Value(0)).current;
  const [showHeart, setShowHeart] = useState(false);
  const following = followedIds.has(item.user?.id || '');
  const hasVideo = !!item.video_url;

  // expo-video player instance
  const player = useVideoPlayer(item.video_url || null, p => {
    if (p && item.video_url) {
      p.loop = true;
      p.muted = false;
    }
  });

  useEffect(() => {
    if (!hasVideo || !player) return;
    if (isActive) {
      try { player.play(); } catch (_) {}
    } else {
      try { player.pause(); } catch (_) {}
    }
  }, [isActive, hasVideo, player]);

  const vipColors = ['', '#CD7F32', '#C0C0C0', '#FFCC00', '#00DFFF', '#FF2E8B'];
  const vipLevel = item.user?.vip_level || 0;

  const handleLike = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.4, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }),
    ]).start();
    onLike(item.id);
  };

  const handleDoubleTap = () => {
    setShowHeart(true);
    heartAnim.setValue(0);
    Animated.sequence([
      Animated.timing(heartAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(500),
      Animated.timing(heartAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowHeart(false));
    if (!item.is_liked) onLike(item.id);
  };

  const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n || 0);

  return (
    <Pressable style={S.reelItem} onPress={handleDoubleTap}>
      {/* Video or Thumbnail */}
      {hasVideo && isActive ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          nativeControls={false}
        />
      ) : (
        <Image source={{ uri: item.thumbnail_url || '' }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={200} />
      )}
      <View style={S.reelGrad} />

      {/* Double tap heart */}
      {showHeart ? (
        <Animated.View style={[S.heartOverlay, {
          opacity: heartAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] }),
          transform: [{ scale: heartAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.4, 1] }) }],
        }]}>
          <Text style={{ fontSize: 90 }}>❤️</Text>
        </Animated.View>
      ) : null}

      {/* View counter */}
      <View style={S.viewsTag}>
        <MaterialIcons name="visibility" size={11} color="rgba(255,255,255,0.7)" />
        <Text style={S.viewsText}>{fmt(item.views)}</Text>
      </View>

      {/* Play indicator (for image/thumbnail items) */}
      {!hasVideo && (
        <View style={S.playIndicator}>
          <MaterialIcons name="play-circle-outline" size={28} color="rgba(255,255,255,0.5)" />
        </View>
      )}

      {/* Right action column */}
      <View style={S.rightCol}>
        <Pressable style={S.creatorAvWrap} onPress={() => router.push(`/user/${item.user?.id}`)}>
          <Image source={{ uri: item.user?.avatar_url || '' }} style={[S.creatorAv, vipLevel > 0 && { borderColor: vipColors[Math.min(vipLevel, 5)] }]} contentFit="cover" />
          {item.user?.is_online && <View style={S.onlineDot} />}
          <Pressable style={S.followCircle} onPress={() => onFollowToggle(item.user?.id || '')}>
            <Text style={{ fontSize: 13, color: '#FFF', fontWeight: FontWeight.black }}>{following ? '✓' : '+'}</Text>
          </Pressable>
        </Pressable>

        <Pressable style={S.actionBtn} onPress={handleLike}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Text style={{ fontSize: 30 }}>{item.is_liked ? '❤️' : '🤍'}</Text>
          </Animated.View>
          <Text style={S.actionCount}>{fmt(item.likes)}</Text>
        </Pressable>

        <Pressable style={S.actionBtn} onPress={() => onCommentOpen(item.id)}>
          <MaterialIcons name="chat-bubble" size={28} color="#FFF" />
          <Text style={S.actionCount}>{fmt(item.comments)}</Text>
        </Pressable>

        <Pressable style={S.actionBtn} onPress={() => {}}>
          <MaterialIcons name="share" size={26} color="#FFF" />
          <Text style={S.actionCount}>{fmt(item.shares)}</Text>
        </Pressable>

        <Pressable style={S.actionBtn} onPress={() => router.push(`/user/${item.user?.id}`)}>
          <Text style={{ fontSize: 26 }}>🎁</Text>
          <Text style={S.actionCount}>Gift</Text>
        </Pressable>

        <Pressable style={S.actionBtn}>
          <MaterialIcons name="bookmark-border" size={26} color="#FFF" />
        </Pressable>

        <Pressable style={S.actionBtn}>
          <MaterialIcons name="more-vert" size={24} color="#FFF" />
        </Pressable>
      </View>

      {/* Bottom info */}
      <View style={S.bottomInfo}>
        <Pressable style={S.creatorRow} onPress={() => router.push(`/user/${item.user?.id}`)}>
          <Text style={S.creatorName}>@{item.user?.username}</Text>
          {vipLevel > 0 && (
            <View style={[S.vipTag, { backgroundColor: vipColors[Math.min(vipLevel, 5)] + '30' }]}>
              <Text style={[S.vipTagText, { color: vipColors[Math.min(vipLevel, 5)] }]}>VIP{vipLevel}</Text>
            </View>
          )}
          <Pressable style={[S.followBtn, following && S.followBtnActive]} onPress={() => onFollowToggle(item.user?.id || '')}>
            <Text style={[S.followBtnText, following && S.followBtnTextActive]}>{following ? '✓ Following' : '+ Follow'}</Text>
          </Pressable>
        </Pressable>
        {item.caption ? <Text style={S.caption} numberOfLines={2}>{item.caption}</Text> : null}
        <View style={S.musicRow}>
          <Text style={{ fontSize: 13 }}>🎵</Text>
          <Text style={S.musicText} numberOfLines={1}>Original Sound · @{item.user?.username}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ── Comment Panel ──
function CommentPanel({ reelId, visible, onClose, authUserId }: { reelId: string; visible: boolean; onClose: () => void; authUserId?: string }) {
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchReelComments(reelId).then(({ data }) => { setComments(data); setLoading(false); });
    }
  }, [visible, reelId]);

  const send = async () => {
    if (!text.trim() || !authUserId) return;
    setSending(true);
    const opt: ReelComment = {
      id: `opt_${Date.now()}`, user_id: authUserId, reel_id: reelId,
      text: text.trim(), created_at: new Date().toISOString(),
      user: { username: 'You', avatar_url: '' },
    };
    setComments(prev => [opt, ...prev]);
    setText('');
    await postReelComment(authUserId, reelId, opt.text);
    setSending(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={S.commentOverlay} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={S.commentSheet}>
        <View style={S.commentHandle} />
        <View style={S.commentHeader}>
          <Text style={S.commentTitle}>💬 Comments</Text>
          <Pressable onPress={onClose}><MaterialIcons name="close" size={22} color={Colors.textMuted} /></Pressable>
        </View>
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
        ) : comments.length === 0 ? (
          <View style={S.commentEmpty}>
            <Text style={{ fontSize: 40 }}>💬</Text>
            <Text style={S.commentEmptyText}>No comments yet. Be the first!</Text>
          </View>
        ) : (
          <ScrollView style={S.commentList} showsVerticalScrollIndicator={false}>
            {comments.map(c => (
              <View key={c.id} style={S.commentRow}>
                <Image source={{ uri: c.user?.avatar_url || '' }} style={S.commentAv} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={S.commentUser}>{c.user?.username || 'User'}</Text>
                  <Text style={S.commentText}>{c.text}</Text>
                  <Text style={S.commentTime}>{new Date(c.created_at).toLocaleDateString()}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
        <View style={S.commentInput}>
          <TextInput
            style={S.commentInputField}
            placeholder="Add a comment..."
            placeholderTextColor={Colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={200}
          />
          <Pressable style={[S.commentSend, (!text.trim() || sending) && { opacity: 0.4 }]} onPress={send} disabled={!text.trim() || sending}>
            <MaterialIcons name="send" size={18} color="#FFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Upload Modal ──
function UploadModal({ visible, onClose, onUploaded, authUserId }: { visible: boolean; onClose: () => void; onUploaded: (reel: Reel) => void; authUserId?: string }) {
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const { showAlert } = useAlert();

  const pickVideo = async () => {
    if (!authUserId) { showAlert('Login required'); return; }
    setUploading(true);
    const { videoUrl: url, error } = await pickAndUploadReel(authUserId);
    setUploading(false);
    if (error && error !== 'Cancelled') { showAlert('Upload Failed', error); return; }
    if (url) setVideoUrl(url);
  };

  const publish = async () => {
    if (!videoUrl || !authUserId) return;
    setUploading(true);
    const { data, error } = await createReel(authUserId, videoUrl, caption || undefined);
    setUploading(false);
    if (error || !data) { showAlert('Error', error || 'Failed to publish reel'); return; }
    showAlert('Published! 🎬', 'Your reel is live!');
    onUploaded(data);
    setVideoUrl(null);
    setCaption('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={S.uploadOverlay}>
        <View style={S.uploadSheet}>
          <View style={S.uploadHeader}>
            <Text style={S.uploadTitle}>🎬 Create Reel</Text>
            <Pressable onPress={onClose}><MaterialIcons name="close" size={22} color={Colors.textMuted} /></Pressable>
          </View>
          {uploading ? (
            <View style={S.uploadingCenter}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={S.uploadingText}>{videoUrl ? 'Publishing...' : 'Uploading video...'}</Text>
            </View>
          ) : videoUrl ? (
            <>
              <View style={S.videoPreviewBox}>
                <MaterialIcons name="check-circle" size={48} color={Colors.success} />
                <Text style={S.videoPreviewText}>Video ready to publish ✓</Text>
              </View>
              <TextInput
                style={S.uploadCaption}
                placeholder="Add a caption... #trending"
                placeholderTextColor={Colors.textMuted}
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={200}
              />
              <Pressable style={S.publishBtn} onPress={publish}>
                <Text style={S.publishBtnText}>🚀 Publish Reel</Text>
              </Pressable>
            </>
          ) : (
            <Pressable style={S.pickVideoBtn} onPress={pickVideo}>
              <MaterialIcons name="video-library" size={48} color={Colors.primary} />
              <Text style={S.pickVideoText}>Select Video from Gallery</Text>
              <Text style={S.pickVideoSub}>Max 60 seconds · MP4, MOV</Text>
            </Pressable>
          )}
          <View style={S.uploadTips}>
            <Text style={S.uploadTipTitle}>💡 Tips for more views:</Text>
            <Text style={S.uploadTip}>• Add trending hashtags in caption</Text>
            <Text style={S.uploadTip}>• Post during peak hours (7-10PM)</Text>
            <Text style={S.uploadTip}>• Use good lighting and clear sound</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ──
export default function ReelsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentUser, toggleFollow, followedUsers } = useApp();
  const { showAlert } = useAlert();

  const [reels, setReels] = useState<Reel[]>(MOCK_REELS_DATA);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set(followedUsers));
  const [commentReelId, setCommentReelId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'for_you' | 'following' | 'trending'>('for_you');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadReels(0, true);
  }, [activeFilter]);

  const loadReels = async (pageNum: number, reset = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);
    const { data } = await fetchReels(pageNum, 10);
    if (data.length > 0) {
      let likedIds = new Set<string>();
      if (user?.id) likedIds = await fetchLikedReelIds(user.id, data.map(r => r.id));
      const withLiked = data.map(r => ({ ...r, is_liked: likedIds.has(r.id) }));
      setReels(prev => reset ? [...MOCK_REELS_DATA, ...withLiked] : [...prev, ...withLiked]);
      setHasMore(data.length === 10);
    } else {
      setHasMore(false);
    }
    setLoading(false);
    setLoadingMore(false);
    setPage(pageNum);
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index ?? 0;
      setActiveIndex(idx);
      const reel = reels[idx];
      if (reel && !reel.id.startsWith('r')) incrementReelViews(reel.id);
    }
  }, [reels]);

  const handleLike = useCallback(async (reelId: string) => {
    setReels(prev => prev.map(r => {
      if (r.id !== reelId) return r;
      return { ...r, is_liked: !r.is_liked, likes: r.is_liked ? r.likes - 1 : r.likes + 1 };
    }));
    if (user?.id && !reelId.startsWith('r')) {
      const reel = reels.find(r => r.id === reelId);
      if (reel) await toggleReelLike(user.id, reelId, reel.is_liked || false);
    }
  }, [user?.id, reels]);

  const handleFollowToggle = useCallback(async (userId: string) => {
    if (!userId) return;
    setFollowedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
    await toggleFollow(userId);
  }, [toggleFollow]);

  const handleUploaded = useCallback((reel: Reel) => {
    setReels(prev => [reel, ...prev]);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  return (
    <View style={S.container}>
      {/* Header overlay */}
      <SafeAreaView style={S.headerOverlay} edges={['top']}>
        <Pressable onPress={() => router.back()} style={S.headerBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#FFF" />
        </Pressable>
        <Text style={S.headerTitle}>🎬 Reels</Text>
        <Pressable style={S.headerBtn} onPress={() => setShowUpload(true)}>
          <MaterialIcons name="add-circle-outline" size={22} color="#FFF" />
        </Pressable>
      </SafeAreaView>

      {/* Filter tabs */}
      <SafeAreaView style={S.filterOverlay} edges={['top']}>
        <View style={S.filterRow}>
          {(['for_you', 'following', 'trending'] as const).map(f => (
            <Pressable key={f} style={[S.filterBtn, activeFilter === f && S.filterBtnActive]} onPress={() => setActiveFilter(f)}>
              <Text style={[S.filterText, activeFilter === f && S.filterTextActive]}>
                {f === 'for_you' ? '✨ For You' : f === 'following' ? '👥 Following' : '🔥 Trending'}
              </Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>

      {loading && reels.length === 0 ? (
        <View style={S.loadingCenter}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={S.loadingText}>Loading reels...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={reels}
          keyExtractor={item => item.id}
          pagingEnabled
          snapToInterval={height}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onEndReached={() => hasMore && !loadingMore && loadReels(page + 1)}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primary} style={{ height, alignSelf: 'center' }} /> : null}
          renderItem={({ item, index }) => (
            <VideoReelItem
              item={item}
              isActive={index === activeIndex}
              onLike={handleLike}
              onCommentOpen={id => setCommentReelId(id)}
              onFollowToggle={handleFollowToggle}
              followedIds={followedIds}
            />
          )}
        />
      )}

      <CommentPanel reelId={commentReelId || ''} visible={!!commentReelId} onClose={() => setCommentReelId(null)} authUserId={user?.id} />
      <UploadModal visible={showUpload} onClose={() => setShowUpload(false)} onUploaded={handleUploaded} authUserId={user?.id} />
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 200, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs },
  filterOverlay: { position: 'absolute', top: 68, left: 0, right: 0, zIndex: 150 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 22 },
  headerTitle: { color: '#FFF', fontSize: FontSize.lg, fontWeight: FontWeight.bold, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  filterRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md },
  filterBtn: { paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: BorderRadius.pill, backgroundColor: 'rgba(0,0,0,0.4)' },
  filterBtnActive: { backgroundColor: Colors.primary },
  filterText: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  filterTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  loadingText: { color: Colors.textMuted, fontSize: FontSize.sm },
  reelItem: { width, height, position: 'relative', backgroundColor: '#000' },
  reelGrad: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  viewsTag: { position: 'absolute', top: 130, left: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  viewsText: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  playIndicator: { position: 'absolute', top: 130, right: Spacing.md },
  heartOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  rightCol: { position: 'absolute', right: Spacing.sm, bottom: 150, gap: 16, alignItems: 'center' },
  creatorAvWrap: { alignItems: 'center', marginBottom: 8, position: 'relative' },
  creatorAv: { width: 54, height: 54, borderRadius: 27, borderWidth: 2.5, borderColor: Colors.primary },
  onlineDot: { position: 'absolute', top: 2, right: 2, width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: '#000' },
  followCircle: { position: 'absolute', bottom: -10, width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  actionBtn: { alignItems: 'center', gap: 3, minHeight: 44, justifyContent: 'center' },
  actionCount: { color: '#FFF', fontSize: 12, fontWeight: FontWeight.semibold, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  bottomInfo: { position: 'absolute', bottom: 0, left: 0, right: 80, padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.xs },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
  creatorName: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  vipTag: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  vipTagText: { fontSize: 9, fontWeight: FontWeight.black },
  followBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)' },
  followBtnActive: { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.4)' },
  followBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  followBtnTextActive: { color: 'rgba(255,255,255,0.6)' },
  caption: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.sm, lineHeight: 20, textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  musicRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: BorderRadius.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  musicText: { color: 'rgba(255,255,255,0.85)', fontSize: 10, maxWidth: width * 0.45 },
  commentOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  commentSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: height * 0.72, borderTopWidth: 1, borderColor: Colors.primary + '30' },
  commentHandle: { width: 40, height: 4, backgroundColor: Colors.cardBorder, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  commentTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  commentEmpty: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.sm },
  commentEmptyText: { color: Colors.textMuted, fontSize: FontSize.sm },
  commentList: { maxHeight: height * 0.42, paddingHorizontal: Spacing.md },
  commentRow: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  commentAv: { width: 36, height: 36, borderRadius: 18 },
  commentUser: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  commentText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 18, marginTop: 2 },
  commentTime: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  commentInput: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.cardBorder },
  commentInputField: { flex: 1, backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: 8, color: Colors.textPrimary, fontSize: FontSize.sm, maxHeight: 80, borderWidth: 1, borderColor: Colors.cardBorder },
  commentSend: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  uploadOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  uploadSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, paddingBottom: 48, gap: Spacing.md, borderTopWidth: 1, borderColor: Colors.primary + '30' },
  uploadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  uploadTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  uploadingCenter: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  uploadingText: { color: Colors.textMuted, fontSize: FontSize.sm },
  videoPreviewBox: { alignItems: 'center', paddingVertical: Spacing.xl, backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.lg, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.success + '40' },
  videoPreviewText: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  uploadCaption: { backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.textPrimary, fontSize: FontSize.sm, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: Colors.cardBorder },
  publishBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, alignItems: 'center' },
  publishBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  pickVideoBtn: { alignItems: 'center', paddingVertical: Spacing.xxl, backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.xl, gap: Spacing.sm, borderWidth: 2, borderColor: Colors.primary + '40', borderStyle: 'dashed' },
  pickVideoText: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  pickVideoSub: { color: Colors.textMuted, fontSize: FontSize.xs },
  uploadTips: { backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.md, padding: Spacing.md, gap: 4, borderWidth: 1, borderColor: Colors.cardBorder },
  uploadTipTitle: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.bold, marginBottom: 4 },
  uploadTip: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 18 },
});
