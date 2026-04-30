// SashLive — User Profile with PK Challenge + Online Status + Real Follow DB
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Dimensions, Animated, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { MOCK_USERS } from '@/services/mockData';
import { GIFTS } from '@/constants/config';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/template';
import { useAlert } from '@/template';
import { isFollowing as checkFollowing } from '@/services/followService';
import { createPKInvite } from '@/services/pkService';
import { formatLastSeen } from '@/services/presenceService';
import { getSupabaseClient } from '@/template';

const { width } = Dimensions.get('window');

const POST_IMGS = [
  'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&h=300&fit=crop',
];

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { followedUsers, toggleFollow, currentUser, updateDiamonds } = useApp();
  const { user: authUser } = useAuth();
  const { showAlert } = useAlert();

  const profileUser = MOCK_USERS.find(u => u.id === id) || MOCK_USERS[0];
  const [isFollowingState, setIsFollowingState] = useState(followedUsers.includes(profileUser.id));
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'posts' | 'reels' | 'liked'>('posts');
  const [followLoading, setFollowLoading] = useState(false);
  const [pkLoading, setPkLoading] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState({ is_online: profileUser.isOnline || false, last_seen: '' });
  const [giftSentAnim] = useState(new Animated.Value(0));
  const [sentGiftIcon, setSentGiftIcon] = useState('🎁');

  const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n || 0);

  const vipLevel = profileUser.vipLevel || 0;
  const vipColors = ['', '#CD7F32', '#C0C0C0', '#FFCC00', '#00DFFF', '#FF2E8B'];
  const vipColor = vipLevel > 0 ? vipColors[Math.min(vipLevel, 5)] : Colors.primary;
  const vipBadges = ['', '🥉', '🥈', '⭐', '💎', '👑'];

  useEffect(() => {
    if (authUser?.id && profileUser.id) {
      checkFollowing(authUser.id, profileUser.id).then(v => setIsFollowingState(v || followedUsers.includes(profileUser.id)));
    }
    // Fetch online status from DB
    if (profileUser.id && !profileUser.id.startsWith('u00')) {
      const supabase = getSupabaseClient();
      supabase.from('user_profiles').select('is_online, last_seen').eq('id', profileUser.id).single().then(({ data }) => {
        if (data) setOnlineStatus({ is_online: data.is_online, last_seen: data.last_seen });
      });
    }
  }, [authUser?.id, profileUser.id]);

  const handleFollow = async () => {
    setFollowLoading(true);
    setIsFollowingState(!isFollowingState);
    await toggleFollow(profileUser.id);
    setFollowLoading(false);
  };

  const handleChallengePK = async () => {
    if (!authUser?.id) { showAlert('Login Required', 'Please login to challenge to PK.'); return; }
    if (!profileUser.isHost) {
      showAlert('Host Only', 'Only hosts can participate in PK battles. This user is not a host.');
      return;
    }
    showAlert(
      `⚔️ Challenge ${profileUser.displayName}?`,
      'Send a PK battle invite? The battle will last 5 minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '⚔️ Send Challenge!',
          onPress: async () => {
            setPkLoading(true);
            const { data, error } = await createPKInvite(authUser.id, profileUser.id);
            setPkLoading(false);
            if (error) { showAlert('Error', error); return; }
            showAlert('Challenge Sent! ⚔️', `${profileUser.displayName} has been notified of your PK challenge!`);
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
    giftSentAnim.setValue(0);
    Animated.sequence([
      Animated.timing(giftSentAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(giftSentAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
    showAlert(`Gift Sent! ${gift.icon}`, `You sent ${gift.name} to ${profileUser.displayName}!`);
  };

  const giftScale = giftSentAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1.3, 1] });
  const presenceText = formatLastSeen(onlineStatus.last_seen || null, onlineStatus.is_online || profileUser.isOnline);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>@{profileUser.username}</Text>
        <Pressable style={styles.headerBtn} onPress={() => showAlert('Options', '', [
          { text: '📤 Share Profile', onPress: () => showAlert('Copied!', 'Profile link copied.') },
          { text: '🚫 Block', style: 'destructive', onPress: () => showAlert('Blocked', `${profileUser.displayName} blocked.`) },
          { text: '🚨 Report', style: 'destructive', onPress: () => showAlert('Reported', 'Thank you.') },
          { text: 'Cancel', style: 'cancel' },
        ])}>
          <MaterialIcons name="more-vert" size={22} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Cover */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=180&fit=crop' }} style={styles.coverImg} contentFit="cover" />
          <View style={styles.coverGrad} />
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: profileUser.avatar }} style={[styles.avatar, { borderColor: vipColor }]} contentFit="cover" />
            {profileUser.isLive && (
              <View style={styles.liveTag}>
                <View style={styles.liveDot} />
                <Text style={styles.liveTagText}>LIVE</Text>
              </View>
            )}
            {!profileUser.isLive && (onlineStatus.is_online || profileUser.isOnline) && <View style={styles.onlineDot} />}
            {vipLevel > 0 && (
              <View style={[styles.vipCircle, { borderColor: vipColor }]}>
                <Text style={{ fontSize: 12 }}>{vipBadges[Math.min(vipLevel, 5)]}</Text>
              </View>
            )}
          </View>
          <View style={styles.heroActions}>
            <Pressable style={styles.smallActionBtn} onPress={() => router.push(`/chat/c1`)}>
              <MaterialIcons name="chat-bubble-outline" size={20} color={Colors.primary} />
            </Pressable>
            <Pressable style={styles.smallActionBtn} onPress={() => router.push(`/video-call/${profileUser.id}`)}>
              <MaterialIcons name="videocam" size={20} color={Colors.secondary} />
            </Pressable>
            {profileUser.isHost && (
              <Pressable style={[styles.smallActionBtn, { backgroundColor: Colors.live + '20', borderColor: Colors.live + '50' }]} onPress={handleChallengePK} disabled={pkLoading}>
                {pkLoading ? <ActivityIndicator size="small" color={Colors.live} /> : <Text style={{ fontSize: 18 }}>⚔️</Text>}
              </Pressable>
            )}
            <Pressable style={styles.smallActionBtn} onPress={() => setShowGiftModal(true)}>
              <Text style={{ fontSize: 20 }}>🎁</Text>
            </Pressable>
            <Pressable style={styles.smallActionBtn} onPress={() => showAlert('Shared!', 'Profile link copied.')}>
              <MaterialIcons name="share" size={20} color={Colors.textMuted} />
            </Pressable>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{profileUser.displayName}</Text>
            {profileUser.isHost && <View style={styles.hostBadge}><MaterialIcons name="verified" size={16} color={Colors.primary} /></View>}
          </View>
          <Text style={styles.usernameText}>@{profileUser.username}</Text>

          {/* Online status */}
          <View style={styles.onlineRow}>
            <View style={[styles.onlineIndicator, { backgroundColor: (onlineStatus.is_online || profileUser.isOnline) ? Colors.success : Colors.textMuted }]} />
            <Text style={[styles.onlineText, { color: (onlineStatus.is_online || profileUser.isOnline) ? Colors.success : Colors.textMuted }]}>
              {presenceText}
            </Text>
          </View>

          {vipLevel > 0 && (
            <View style={[styles.vipBadgeRow, { backgroundColor: vipColor + '20' }]}>
              <Text style={{ fontSize: 12 }}>{vipBadges[Math.min(vipLevel, 5)]}</Text>
              <Text style={[styles.vipBadgeText, { color: vipColor }]}>VIP Level {vipLevel}</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Followers', value: fmt(profileUser.followers), onPress: () => router.push(`/followers/${profileUser.id}`) },
            { label: 'Following', value: fmt(Math.floor(profileUser.followers * 0.3)), onPress: () => router.push(`/followers/${profileUser.id}`) },
            { label: 'Likes', value: fmt(profileUser.followers * 3), onPress: () => {} },
            { label: 'Gifts', value: fmt(profileUser.totalGiftsReceived || 0), onPress: () => {} },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={styles.statDiv} />}
              <Pressable style={styles.statItem} onPress={s.onPress}>
                <Text style={styles.statVal}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </Pressable>
            </React.Fragment>
          ))}
        </View>

        {/* CTA Row */}
        <View style={styles.ctaRow}>
          {profileUser.isLive && (
            <Pressable style={styles.watchBtn} onPress={() => router.push('/live/room001')}>
              <View style={styles.watchDot} />
              <Text style={styles.watchBtnText}>Watch Live</Text>
            </Pressable>
          )}
          {profileUser.isHost && !profileUser.isLive && (
            <Pressable style={[styles.pkChallengeBtn, pkLoading && { opacity: 0.7 }]} onPress={handleChallengePK} disabled={pkLoading}>
              {pkLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.pkChallengeBtnText}>⚔️ Challenge to PK</Text>}
            </Pressable>
          )}
          <Pressable
            style={[styles.followBtn, isFollowingState && styles.followingBtn, (profileUser.isLive || profileUser.isHost) && { flex: 0, minWidth: 110 }]}
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

        {/* Gift strip */}
        <View style={styles.giftSection}>
          <View style={styles.giftSectionHeader}>
            <Text style={styles.sectionTitle}>🎁 Send a Gift</Text>
            <Pressable onPress={() => setShowGiftModal(true)}>
              <Text style={styles.seeAllBtn}>See All →</Text>
            </Pressable>
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

        {/* Grid Tabs */}
        <View style={styles.gridTabs}>
          {([
            { key: 'posts', icon: 'grid-on' },
            { key: 'reels', icon: 'videocam' },
            { key: 'liked', icon: 'favorite-border' },
          ] as const).map(tab => (
            <Pressable key={tab.key} style={[styles.gridTab, selectedTab === tab.key && styles.gridTabActive]} onPress={() => setSelectedTab(tab.key)}>
              <MaterialIcons name={tab.icon as any} size={22} color={selectedTab === tab.key ? Colors.primary : Colors.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* Post Grid */}
        <View style={styles.postGrid}>
          {POST_IMGS.map((img, i) => (
            <Pressable key={i} style={styles.gridCell} onPress={() => router.push('/reels')}>
              <Image source={{ uri: img }} style={styles.gridImg} contentFit="cover" />
              {selectedTab === 'reels' && (
                <View style={styles.reelOverlay}>
                  <MaterialIcons name="play-arrow" size={20} color="#FFF" />
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Gift Sent overlay */}
      <Animated.View style={[styles.giftSentOverlay, { opacity: giftSentAnim, transform: [{ scale: giftScale }] }]} pointerEvents="none">
        <Text style={{ fontSize: 80 }}>{sentGiftIcon}</Text>
        <Text style={styles.giftSentText}>Gift Sent! 💝</Text>
      </Animated.View>

      {/* Gift Modal */}
      <Modal visible={showGiftModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.giftModal}>
            <View style={styles.giftModalHeader}>
              <Image source={{ uri: profileUser.avatar }} style={styles.giftModalAv} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.giftModalTitle}>Gift to {profileUser.displayName}</Text>
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
                  <View style={styles.giftCardPrice}>
                    <Text style={styles.giftCardPriceText}>💎{gift.price.toLocaleString()}</Text>
                  </View>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  heroWrap: { position: 'relative' },
  coverImg: { width: '100%', height: 130 },
  coverGrad: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,0,16,0.5)', height: 130 },
  avatarSection: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: Spacing.md, marginTop: -48, marginBottom: Spacing.sm },
  avatarWrap: { position: 'relative' },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: Colors.primary },
  liveTag: { position: 'absolute', bottom: -8, left: '50%', transform: [{ translateX: -22 }], flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.live, borderRadius: BorderRadius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFF' },
  liveTagText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.black },
  onlineDot: { position: 'absolute', bottom: 4, right: 4, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.success, borderWidth: 2.5, borderColor: Colors.bg },
  vipCircle: { position: 'absolute', top: -4, right: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.bg, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  heroActions: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', justifyContent: 'flex-end' },
  smallActionBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.cardBorder },
  infoSection: { paddingHorizontal: Spacing.md, gap: 4, marginBottom: Spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  displayName: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  hostBadge: { backgroundColor: Colors.primary + '20', borderRadius: 10, padding: 2 },
  usernameText: { color: Colors.textMuted, fontSize: FontSize.sm },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineIndicator: { width: 8, height: 8, borderRadius: 4 },
  onlineText: { fontSize: FontSize.xs },
  vipBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  vipBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  statsRow: { flexDirection: 'row', marginHorizontal: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: Spacing.sm },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statVal: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.black },
  statLabel: { color: Colors.textMuted, fontSize: 10 },
  statDiv: { width: 1, backgroundColor: Colors.cardBorder, marginVertical: Spacing.sm },
  ctaRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md, flexWrap: 'wrap' },
  watchBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.live },
  watchDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  watchBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  pkChallengeBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.live + '20', borderWidth: 1.5, borderColor: Colors.live, flexDirection: 'row', gap: 5 },
  pkChallengeBtnText: { color: Colors.live, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  followBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.primary, minHeight: 44 },
  followingBtn: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.cardBorder },
  followBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  followingBtnText: { color: Colors.textSecondary },
  giftSection: { marginBottom: Spacing.md },
  giftSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  seeAllBtn: { color: Colors.primary, fontSize: FontSize.sm },
  quickGift: { alignItems: 'center', gap: 3, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.sm, minWidth: 62, borderWidth: 1, borderColor: Colors.cardBorder },
  quickGiftPrice: { color: Colors.diamond, fontSize: 10, fontWeight: FontWeight.bold },
  gridTabs: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.cardBorder },
  gridTab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm },
  gridTabActive: { borderBottomWidth: 2.5, borderBottomColor: Colors.primary },
  postGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  gridCell: { width: (width - 4) / 3, height: (width - 4) / 3, position: 'relative' },
  gridImg: { width: '100%', height: '100%' },
  reelOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)', alignItems: 'center', justifyContent: 'center' },
  giftSentOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  giftSentText: { color: Colors.gold, fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginTop: Spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  giftModal: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, paddingBottom: 40, maxHeight: '75%', borderTopWidth: 1, borderColor: Colors.primary + '30' },
  giftModalHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  giftModalAv: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: Colors.primary },
  giftModalTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  giftModalBalance: { color: Colors.diamond, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  giftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingBottom: Spacing.md },
  giftCard: { width: (width - Spacing.lg * 2 - Spacing.sm * 3) / 4, alignItems: 'center', backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.md, padding: Spacing.sm, gap: 4, borderWidth: 1, borderColor: Colors.cardBorder },
  giftCardName: { color: Colors.textSecondary, fontSize: 9, textAlign: 'center' },
  giftCardPrice: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.pill, paddingHorizontal: 6, paddingVertical: 2 },
  giftCardPriceText: { color: Colors.diamond, fontSize: 9, fontWeight: FontWeight.bold },
  rechargeHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.cardBorder },
  rechargeHintText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
