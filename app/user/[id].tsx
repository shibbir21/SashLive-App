// SashLive — Real User Profile Viewer (fetches from Supabase user_profiles)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Dimensions, Animated, Modal, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { GIFTS } from '@/constants/config';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/template';
import { useAlert } from '@/template';
import { getSupabaseClient } from '@/template';
import { isFollowing as checkFollowing, followUser, unfollowUser } from '@/services/followService';
import { createPKInvite } from '@/services/pkService';

const { width } = Dimensions.get('window');

const PLACEHOLDER_POSTS = Array.from({ length: 9 }, (_, i) => ({
  id: `p${i}`,
  img: [
    'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&h=300&fit=crop',
  ][i],
}));

type ProfileTab = 'posts' | 'reels' | 'liked';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  display_name: string;
  avatar_url: string;
  cover_url: string;
  bio: string;
  followers: number;
  following: number;
  is_host: boolean;
  is_online: boolean;
  last_seen: string;
  vip_level: number;
  diamonds: number;
  total_gifts_received: number;
  total_likes: number;
  level: number;
  xp: number;
  location: string;
  website: string;
}

const VIP_COLORS = ['', '#CD7F32', '#C0C0C0', '#FFCC00', '#00DFFF', '#FF2E8B'];
const VIP_BADGES = ['', '🥉', '🥈', '⭐', '💎', '👑'];

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUser, updateDiamonds } = useApp();
  const { user: authUser } = useAuth();
  const { showAlert } = useAlert();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [recentGifts, setRecentGifts] = useState<any[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowingState, setIsFollowingState] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [pkLoading, setPkLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<ProfileTab>('posts');
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [sentGiftIcon, setSentGiftIcon] = useState('🎁');
  const giftAnim = useRef(new Animated.Value(0)).current;

  const isOwnProfile = authUser?.id === id;

  // ── Fetch user profile ────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    if (!id) return;
    const supabase = getSupabaseClient();
    const [profileRes, postsRes, giftsRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', id).single(),
      supabase.from('posts').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(9),
      supabase.from('live_gifts').select('*').eq('sender_id', id).order('created_at', { ascending: false }).limit(6),
    ]);
    if (profileRes.data) setProfile(profileRes.data);
    if (postsRes.data && postsRes.data.length > 0) setPosts(postsRes.data);
    else setPosts(PLACEHOLDER_POSTS);
    if (giftsRes.data) setRecentGifts(giftsRes.data);
    setLoadingProfile(false);

    // Check follow status
    if (authUser?.id && profileRes.data?.id) {
      const following = await checkFollowing(authUser.id, profileRes.data.id);
      setIsFollowingState(following || false);
    }
  }, [id, authUser?.id]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  const handleFollow = async () => {
    if (!authUser?.id || !profile?.id) return;
    setFollowLoading(true);
    const newState = !isFollowingState;
    setIsFollowingState(newState);
    // Optimistic: update follower count locally
    if (profile) {
      setProfile(p => p ? { ...p, followers: p.followers + (newState ? 1 : -1) } : p);
    }
    if (newState) {
      await followUser(authUser.id, profile.id);
    } else {
      await unfollowUser(authUser.id, profile.id);
    }
    setFollowLoading(false);
  };

  const handleChallengePK = async () => {
    if (!authUser?.id || !profile) return;
    if (!profile.is_host) {
      showAlert('Host Only', 'Only hosts can participate in PK battles.');
      return;
    }
    showAlert(
      `⚔️ Challenge ${profile.display_name || profile.username}?`,
      'Send a PK battle invite? The battle will last 5 minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '⚔️ Send Challenge!',
          onPress: async () => {
            setPkLoading(true);
            const { data, error } = await createPKInvite(authUser.id, profile.id);
            setPkLoading(false);
            if (error) { showAlert('Error', error); return; }
            showAlert('Challenge Sent! ⚔️', `${profile.display_name} has been notified!`);
            if (data) router.push(`/pk-invite/${data.id}`);
          },
        },
      ]
    );
  };

  const handleSendGift = (gift: typeof GIFTS[0]) => {
    if (currentUser.diamonds < gift.price) {
      setShowGiftModal(false);
      showAlert('Not Enough Diamonds', 'Recharge your diamonds to send gifts!', [
        { text: 'Recharge', onPress: () => router.push('/recharge') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    updateDiamonds(-gift.price);
    setSentGiftIcon(gift.icon);
    setShowGiftModal(false);
    giftAnim.setValue(0);
    Animated.sequence([
      Animated.spring(giftAnim, { toValue: 1, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(giftAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
    showAlert(`Gift Sent! ${gift.icon}`, `You sent ${gift.name} to ${profile?.display_name || 'this user'}!`);
  };

  const fmt = (n: number) =>
    !n ? '0' : n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  const giftScale = giftAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1.3, 1] });

  // ── Loading state ─────────────────────────────────────────────────────
  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Fallback values if profile missing
  const displayName = profile?.display_name || profile?.username || 'User';
  const username = profile?.username || 'user';
  const avatar = profile?.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop';
  const cover = profile?.cover_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=200&fit=crop';
  const bio = profile?.bio || '';
  const isOnline = profile?.is_online || false;
  const isHost = profile?.is_host || false;
  const vipLevel = profile?.vip_level || 0;
  const vipColor = vipLevel > 0 ? VIP_COLORS[Math.min(vipLevel, 5)] : Colors.primary;
  const followersCount = profile?.followers || 0;
  const followingCount = profile?.following || 0;
  const totalLikes = profile?.total_likes || 0;
  const totalGifts = profile?.total_gifts_received || 0;
  const level = profile?.level || 1;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>@{username}</Text>
        <Pressable style={styles.headerBtn} onPress={() => showAlert('Options', '', [
          { text: '📤 Share Profile', onPress: () => showAlert('Copied!', 'Profile link copied.') },
          { text: '🚫 Block', style: 'destructive', onPress: () => showAlert('Blocked', `${displayName} blocked.`) },
          { text: '🚨 Report', style: 'destructive', onPress: () => showAlert('Reported', 'Thank you.') },
          { text: 'Cancel', style: 'cancel' },
        ])}>
          <MaterialIcons name="more-vert" size={22} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Cover image */}
        <View style={styles.coverWrap}>
          <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={StyleSheet.absoluteFillObject} />
        </View>

        {/* Avatar + action buttons row */}
        <View style={styles.avatarRow}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: avatar }} style={[styles.avatar, { borderColor: vipColor }]} contentFit="cover" />
            {isOnline ? <View style={styles.onlineDot} /> : null}
            {vipLevel > 0 ? (
              <View style={[styles.vipRing, { borderColor: vipColor }]}>
                <Text style={{ fontSize: 10 }}>{VIP_BADGES[Math.min(vipLevel, 5)]}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.actionBtns}>
            {isOwnProfile ? (
              <Pressable style={[styles.actionBtn, { backgroundColor: Colors.primary }]} onPress={() => router.push('/edit-profile')}>
                <MaterialIcons name="edit" size={17} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: FontWeight.bold }}>Edit</Text>
              </Pressable>
            ) : (
              <>
                <Pressable style={styles.iconBtn} onPress={() => router.push(`/chat/${id}` as any)}>
                  <MaterialIcons name="chat-bubble-outline" size={20} color={Colors.primary} />
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => router.push(`/video-call/${id}` as any)}>
                  <MaterialIcons name="videocam" size={20} color={Colors.secondary} />
                </Pressable>
                {isHost ? (
                  <Pressable style={[styles.iconBtn, { borderColor: Colors.live + '50' }]} onPress={handleChallengePK} disabled={pkLoading}>
                    {pkLoading ? <ActivityIndicator size="small" color={Colors.live} /> : <Text style={{ fontSize: 18 }}>⚔️</Text>}
                  </Pressable>
                ) : null}
                <Pressable style={styles.iconBtn} onPress={() => setShowGiftModal(true)}>
                  <Text style={{ fontSize: 20 }}>🎁</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* Name + info */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{displayName}</Text>
            {isHost ? <MaterialIcons name="verified" size={18} color={Colors.primary} /> : null}
          </View>
          <Text style={styles.username}>@{username}</Text>
          {bio ? <Text style={styles.bio}>{bio}</Text> : null}

          {/* Online status */}
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? Colors.success : '#9CA3AF' }]} />
            <Text style={[styles.statusText, { color: isOnline ? Colors.success : '#9CA3AF' }]}>
              {isOnline ? 'Online now' : 'Offline'}
            </Text>
            {profile?.location ? (
              <>
                <Text style={styles.statusSep}>·</Text>
                <MaterialIcons name="place" size={12} color="#9CA3AF" />
                <Text style={styles.statusText}>{profile.location}</Text>
              </>
            ) : null}
          </View>

          {/* VIP badge */}
          {vipLevel > 0 ? (
            <Pressable style={[styles.vipBadge, { backgroundColor: vipColor + '20', borderColor: vipColor + '50' }]} onPress={() => router.push('/vip-store')}>
              <Text style={{ fontSize: 12 }}>{VIP_BADGES[Math.min(vipLevel, 5)]}</Text>
              <Text style={[styles.vipBadgeText, { color: vipColor }]}>VIP Level {vipLevel}</Text>
            </Pressable>
          ) : null}

          {/* Level XP bar */}
          <View style={styles.levelRow}>
            <View style={[styles.levelBadge]}>
              <Text style={styles.levelNum}>Lv.{level}</Text>
            </View>
            <View style={styles.xpBar}>
              <View style={[styles.xpFill, { width: `${Math.min(100, (profile?.xp || 0) % 100)}%` }]} />
            </View>
            <Text style={styles.xpLabel}>{(profile?.xp || 0) % 100}/100 XP</Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsRow}>
          {[
            { label: 'Followers', val: fmt(followersCount), onPress: () => router.push(`/followers/${id}` as any) },
            { label: 'Following', val: fmt(followingCount), onPress: () => router.push(`/followers/${id}` as any) },
            { label: 'Likes', val: fmt(totalLikes), onPress: () => {} },
            { label: 'Gifts', val: fmt(totalGifts), onPress: () => {} },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 ? <View style={styles.statDivider} /> : null}
              <Pressable style={styles.statItem} onPress={s.onPress}>
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </Pressable>
            </React.Fragment>
          ))}
        </View>

        {/* CTA Row */}
        {!isOwnProfile ? (
          <View style={styles.ctaRow}>
            {/* Watch live / Challenge PK */}
            {isHost ? (
              <Pressable style={styles.pkBtn} onPress={handleChallengePK} disabled={pkLoading}>
                {pkLoading ? <ActivityIndicator size="small" color={Colors.live} /> : <Text style={styles.pkBtnText}>⚔️ Challenge PK</Text>}
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.followBtn, isFollowingState && styles.followingBtn]}
              onPress={handleFollow}
              disabled={followLoading}
            >
              {followLoading
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={[styles.followBtnText, isFollowingState && styles.followingBtnText]}>
                    {isFollowingState ? '✓ Following' : '+ Follow'}
                  </Text>
              }
            </Pressable>
          </View>
        ) : null}

        {/* Quick gift strip */}
        {!isOwnProfile ? (
          <View style={styles.giftSection}>
            <View style={styles.giftSectionHeader}>
              <Text style={styles.sectionLabel}>🎁 Send a Gift</Text>
              <Pressable onPress={() => setShowGiftModal(true)}><Text style={styles.seeAll}>See All →</Text></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.sm }}>
              {GIFTS.slice(0, 8).map(gift => (
                <Pressable key={gift.id} style={styles.quickGift} onPress={() => handleSendGift(gift)}>
                  <Text style={{ fontSize: 30 }}>{gift.icon}</Text>
                  <Text style={styles.quickGiftPrice}>💎{gift.price}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Recent gift history */}
        {recentGifts.length > 0 ? (
          <View style={styles.giftHistorySection}>
            <Text style={styles.sectionLabel}>💝 Recent Gifts Sent</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.sm }}>
              {recentGifts.map(g => (
                <View key={g.id} style={styles.giftHistoryItem}>
                  <Text style={{ fontSize: 24 }}>{g.gift_icon || '🎁'}</Text>
                  <Text style={styles.giftHistoryName} numberOfLines={1}>{g.gift_name || 'Gift'}</Text>
                  <Text style={styles.giftHistoryPrice}>💎{g.gift_price || 0}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Post tabs */}
        <View style={styles.gridTabs}>
          {([
            { key: 'posts', icon: 'grid-on', label: 'Posts' },
            { key: 'reels', icon: 'videocam', label: 'Reels' },
            { key: 'liked', icon: 'favorite-border', label: 'Liked' },
          ] as const).map(tab => (
            <Pressable key={tab.key} style={[styles.gridTab, selectedTab === tab.key && styles.gridTabActive]} onPress={() => setSelectedTab(tab.key)}>
              <MaterialIcons name={tab.icon as any} size={20} color={selectedTab === tab.key ? Colors.primary : Colors.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* Grid */}
        <View style={styles.postGrid}>
          {posts.map((post, i) => {
            const imgSrc = post.media_url || post.img || '';
            return (
              <Pressable key={post.id || i} style={styles.gridCell} onPress={() => router.push('/reels')}>
                <Image source={{ uri: imgSrc }} style={styles.gridImg} contentFit="cover" />
                {selectedTab === 'reels' ? (
                  <View style={styles.reelOverlay}>
                    <MaterialIcons name="play-arrow" size={24} color="#FFF" />
                  </View>
                ) : null}
                {/* Likes overlay */}
                {post.likes > 0 ? (
                  <View style={styles.gridLikes}>
                    <MaterialIcons name="favorite" size={10} color="#FFF" />
                    <Text style={styles.gridLikesText}>{fmt(post.likes)}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {posts.length === 0 ? (
          <View style={styles.emptyPosts}>
            <Text style={{ fontSize: 40 }}>📭</Text>
            <Text style={styles.emptyPostsText}>No posts yet</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Gift sent overlay */}
      <Animated.View style={[styles.giftSentOverlay, { opacity: giftAnim, transform: [{ scale: giftScale }] }]} pointerEvents="none">
        <Text style={{ fontSize: 80 }}>{sentGiftIcon}</Text>
        <Text style={styles.giftSentText}>Gift Sent! 💝</Text>
      </Animated.View>

      {/* Gift modal */}
      <Modal visible={showGiftModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.giftModal}>
            <View style={styles.giftModalHeader}>
              <Image source={{ uri: avatar }} style={styles.giftModalAv} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.giftModalTitle}>Gift to {displayName}</Text>
                <Text style={styles.giftModalBalance}>Balance: 💎{currentUser.diamonds.toLocaleString()}</Text>
              </View>
              <Pressable onPress={() => setShowGiftModal(false)}>
                <MaterialIcons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.giftGrid} showsVerticalScrollIndicator={false}>
              {GIFTS.map(gift => (
                <Pressable key={gift.id} style={[styles.giftCard, currentUser.diamonds < gift.price && { opacity: 0.4 }]} onPress={() => handleSendGift(gift)}>
                  <Text style={{ fontSize: 36 }}>{gift.icon}</Text>
                  <Text style={styles.giftCardName}>{gift.name}</Text>
                  <Text style={styles.giftCardPrice}>💎{gift.price.toLocaleString()}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.rechargeHint} onPress={() => { setShowGiftModal(false); router.push('/recharge'); }}>
              <MaterialIcons name="add-circle-outline" size={16} color={Colors.primary} />
              <Text style={styles.rechargeHintText}>Need more diamonds? Recharge now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingText: { color: Colors.textMuted, fontSize: FontSize.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  coverWrap: { height: 140, position: 'relative', backgroundColor: Colors.bgSecondary },
  cover: { width: '100%', height: '100%' },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: Spacing.md, marginTop: -50, marginBottom: Spacing.sm },
  avatarWrap: { position: 'relative' },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: Colors.primary },
  onlineDot: { position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.success, borderWidth: 2.5, borderColor: Colors.bg },
  vipRing: { position: 'absolute', top: -4, right: -4, width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.bg, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  actionBtns: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: 'transparent' },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder, alignItems: 'center', justifyContent: 'center' },
  infoSection: { paddingHorizontal: Spacing.md, gap: 4, marginBottom: Spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  displayName: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  username: { color: Colors.textMuted, fontSize: FontSize.sm },
  bio: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: FontSize.xs },
  statusSep: { color: '#9CA3AF', fontSize: FontSize.xs },
  vipBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderWidth: 1 },
  vipBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  levelBadge: { backgroundColor: Colors.primary, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  levelNum: { color: '#FFF', fontSize: 10, fontWeight: FontWeight.black },
  xpBar: { flex: 1, height: 5, backgroundColor: Colors.bgSecondary, borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  xpLabel: { color: Colors.textMuted, fontSize: 9 },
  statsRow: { flexDirection: 'row', marginHorizontal: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: Spacing.sm },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statVal: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.black },
  statLabel: { color: Colors.textMuted, fontSize: 9 },
  statDivider: { width: 1, backgroundColor: Colors.cardBorder, marginVertical: Spacing.sm },
  ctaRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  pkBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: Colors.live, backgroundColor: Colors.live + '15' },
  pkBtnText: { color: Colors.live, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  followBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.primary, minHeight: 44 },
  followingBtn: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.cardBorder },
  followBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  followingBtnText: { color: Colors.textSecondary },
  giftSection: { marginBottom: Spacing.md },
  giftSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, marginBottom: Spacing.xs },
  sectionLabel: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  seeAll: { color: Colors.primary, fontSize: FontSize.sm },
  quickGift: { alignItems: 'center', gap: 3, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.sm, minWidth: 62, borderWidth: 1, borderColor: Colors.cardBorder },
  quickGiftPrice: { color: Colors.diamond, fontSize: 10, fontWeight: FontWeight.bold },
  giftHistorySection: { marginBottom: Spacing.md },
  giftHistoryItem: { alignItems: 'center', gap: 2, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.sm, minWidth: 66, borderWidth: 1, borderColor: Colors.cardBorder },
  giftHistoryName: { color: Colors.textSecondary, fontSize: 9, textAlign: 'center', maxWidth: 60 },
  giftHistoryPrice: { color: Colors.diamond, fontSize: 9, fontWeight: FontWeight.bold },
  gridTabs: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.cardBorder },
  gridTab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm },
  gridTabActive: { borderBottomWidth: 2.5, borderBottomColor: Colors.primary },
  postGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  gridCell: { width: (width - 4) / 3, height: (width - 4) / 3, position: 'relative', backgroundColor: Colors.bgSecondary },
  gridImg: { width: '100%', height: '100%' },
  reelOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)', alignItems: 'center', justifyContent: 'center' },
  gridLikes: { position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  gridLikesText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.bold },
  emptyPosts: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyPostsText: { color: Colors.textMuted, fontSize: FontSize.sm },
  giftSentOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  giftSentText: { color: Colors.gold, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  giftModal: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, paddingBottom: 40, maxHeight: '75%', borderTopWidth: 1, borderColor: Colors.primary + '30' },
  giftModalHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  giftModalAv: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: Colors.primary },
  giftModalTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  giftModalBalance: { color: Colors.diamond, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  giftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingBottom: Spacing.md },
  giftCard: { width: (width - Spacing.lg * 2 - Spacing.sm * 3) / 4, alignItems: 'center', backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.md, padding: Spacing.sm, gap: 4, borderWidth: 1, borderColor: Colors.cardBorder },
  giftCardName: { color: Colors.textSecondary, fontSize: 9, textAlign: 'center' },
  giftCardPrice: { color: Colors.diamond, fontSize: 9, fontWeight: FontWeight.bold },
  rechargeHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.cardBorder },
  rechargeHintText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
