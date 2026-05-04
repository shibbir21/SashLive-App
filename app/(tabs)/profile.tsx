// SashLive — Profile Screen (PoppoLive Production Style)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Dimensions, Modal, ActivityIndicator, Animated,
  FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { VIP_LEVELS } from '@/constants/config';
import { MOCK_USERS } from '@/services/mockData';
import { useAlert } from '@/template';
import { useAuth } from '@/template';
import { getSupabaseClient } from '@/template';
import { changeAvatar } from '@/services/avatarService';

const { width } = Dimensions.get('window');
const GRID_CELL = (width - 4) / 3;

const POST_GRID = [
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

// Level XP requirements
const LEVELS = [0, 500, 1500, 3500, 7000, 12000, 20000, 32000, 50000, 75000, 100000];

export default function ProfileScreen() {
  const router = useRouter();
  const { currentUser, updateUser, toggleFollow, followedUsers } = useApp();
  const { user: authUser, logout } = useAuth();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [postTab, setPostTab] = useState<'posts' | 'liked' | 'reels'>('posts');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [streamHistory, setStreamHistory] = useState<any[]>([]);
  const [coverUrl, setCoverUrl] = useState('https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=800&h=200&fit=crop');
  const [totalLikes, setTotalLikes] = useState(currentUser.followers * 3);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const vipInfo = VIP_LEVELS.find(v => v.level === currentUser.vipLevel) || VIP_LEVELS[0];
  const nextVip = VIP_LEVELS.find(v => v.level === currentUser.vipLevel + 1);
  const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n || 0);

  const level = Math.min(currentUser.coins > 0 ? Math.floor(Math.log(currentUser.coins + 1) * 3) + 1 : 1, 10);
  const levelXP = currentUser.coins % 1000;
  const levelProgress = (levelXP / 1000) * 100;

  // Load additional profile data
  useEffect(() => {
    if (authUser?.id) {
      supabase.from('user_profiles').select('cover_url, total_likes').eq('id', authUser.id).single().then(({ data }) => {
        if (data?.cover_url) setCoverUrl(data.cover_url);
        if (data?.total_likes) setTotalLikes(data.total_likes);
      });
      supabase.from('live_rooms').select('id, title, viewers, diamonds_earned, started_at').eq('host_id', authUser.id).order('started_at', { ascending: false }).limit(5).then(({ data }) => {
        if (data) setStreamHistory(data);
      });
    }
  }, [authUser?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (authUser?.id) {
      const { data } = await supabase.from('user_profiles').select('*').eq('id', authUser.id).single();
      if (data) {
        updateUser({
          displayName: data.display_name || currentUser.displayName,
          username: data.username || currentUser.username,
          avatar: data.avatar_url || currentUser.avatar,
          bio: data.bio || currentUser.bio,
          diamonds: data.diamonds ?? currentUser.diamonds,
          coins: data.coins ?? currentUser.coins,
          followers: data.followers ?? currentUser.followers,
          following: data.following ?? currentUser.following,
          points: data.points ?? currentUser.points,
          vipLevel: data.vip_level ?? currentUser.vipLevel,
        });
        if (data.cover_url) setCoverUrl(data.cover_url);
      }
    }
    setRefreshing(false);
  };

  const handleAvatarChange = async (source: 'library' | 'camera') => {
    setShowAvatarModal(false);
    if (!authUser?.id) { showAlert('Not logged in'); return; }
    setUploadingAvatar(true);
    const { publicUrl, error } = await changeAvatar(authUser.id, source);
    setUploadingAvatar(false);
    if (error && error !== 'Cancelled') { showAlert('Upload Failed', error); return; }
    if (publicUrl) {
      updateUser({ avatar: publicUrl });
      showAlert('✅ Avatar Updated!');
    }
  };

  const handleLogout = () => {
    showAlert('Sign Out', 'Are you sure?', [
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const QUICK_ACTIONS = [
    { icon: '💎', label: 'Recharge',    color: Colors.diamond,   onPress: () => router.push('/recharge') },
    { icon: '💸', label: 'Withdraw',    color: Colors.success,   onPress: () => router.push('/withdrawal') },
    { icon: '🔴', label: 'Go Live',     color: Colors.live,      onPress: () => router.push('/go-live') },
    { icon: '🎮', label: 'Games',       color: Colors.gold,      onPress: () => router.push('/games') },
    { icon: '🎯', label: 'Tasks',       color: Colors.secondary, onPress: () => router.push('/daily-tasks') },
    { icon: '🏆', label: 'Ranking',     color: Colors.primary,   onPress: () => router.push('/leaderboard') },
    { icon: '🏢', label: 'Agency',      color: Colors.accent,    onPress: () => router.push('/agency') },
    { icon: '👑', label: 'VIP',         color: Colors.gold,      onPress: () => router.push('/vip-store') },
  ];

  const menuItems = [
    { icon: '💎', label: 'Diamond Wallet',   sub: `${currentUser.diamonds.toLocaleString()} 💎`,    onPress: () => router.push('/wallet'),        color: Colors.diamond },
    { icon: '🪙', label: 'Coin Balance',     sub: `${currentUser.coins.toLocaleString()} 🪙`,        onPress: () => router.push('/wallet'),        color: Colors.gold },
    { icon: '🏆', label: 'Points & Earnings',sub: `${(currentUser.points || 0).toLocaleString()} pts`,onPress: () => router.push('/withdrawal'),   color: Colors.success },
    { icon: '🎤', label: 'Host Panel',       sub: currentUser.isHost ? 'Active Host ✓' : 'Become a Host', onPress: () => router.push('/host-panel'), color: Colors.live },
    { icon: '🏢', label: 'Agency',           sub: 'Manage your agency',  onPress: () => router.push('/agency'),         color: Colors.secondary },
    { icon: '🎁', label: 'Referral Code',    sub: currentUser.referralCode || 'Share & Earn',        onPress: () => showAlert('Referral', `Code: ${currentUser.referralCode || 'N/A'}\nShare to earn 50💎 per referral!`), color: Colors.primary },
    { icon: '📊', label: 'Stream Analytics', sub: `${streamHistory.length} sessions`,                onPress: () => showAlert('Analytics', 'Detailed analytics coming soon!'), color: Colors.primary },
    { icon: '✏️', label: 'Edit Profile',     sub: '',                    onPress: () => router.push('/edit-profile' as any), color: Colors.primary },
    { icon: '🛡️', label: 'Admin Panel',       sub: '',                    onPress: () => router.push('/admin' as any),        color: Colors.gold },
    { icon: '⚙️', label: 'Settings',        sub: '',                    onPress: () => router.push('/settings'),             color: Colors.textMuted },
    { icon: '🚪', label: 'Sign Out',         sub: '',                    onPress: handleLogout,                               color: Colors.error },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerRight}>
            <Pressable style={styles.headerBtn} onPress={() => router.push('/wallet')}>
              <Text style={{ fontSize: 14 }}>💎</Text>
              <Text style={styles.headerBtnText}>{fmt(currentUser.diamonds)}</Text>
            </Pressable>
            <Pressable style={styles.headerIconBtn} onPress={() => router.push('/notifications')}>
              <MaterialIcons name="notifications-none" size={22} color={Colors.textSecondary} />
            </Pressable>
            <Pressable style={styles.headerIconBtn} onPress={() => router.push('/settings')}>
              <MaterialIcons name="settings" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Cover + Avatar */}
        <View style={styles.heroSection}>
          <Pressable onPress={() => router.push('/edit-profile' as any)}>
            <Image source={{ uri: coverUrl }} style={styles.coverImg} contentFit="cover" />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.coverGrad} />
            <View style={styles.editCoverBtn}>
              <MaterialIcons name="camera-alt" size={14} color="#FFF" />
              <Text style={styles.editCoverText}>Edit Cover</Text>
            </View>
          </Pressable>

          <View style={styles.avatarRow}>
            {/* Avatar */}
            <Pressable style={styles.avatarSection} onPress={() => setShowAvatarModal(true)}>
              <View style={styles.avatarWrap}>
                <Image source={{ uri: currentUser.avatar }} style={[styles.avatar, { borderColor: vipInfo.color || Colors.primary }]} contentFit="cover" />
                {uploadingAvatar && (
                  <View style={styles.avatarUploadOverlay}>
                    <ActivityIndicator color="#FFF" size="small" />
                  </View>
                )}
                <View style={[styles.editAvatarBtn, { backgroundColor: vipInfo.color || Colors.primary }]}>
                  <MaterialIcons name="camera-alt" size={12} color="#FFF" />
                </View>
                {vipInfo.level > 0 && (
                  <View style={[styles.vipRing, { borderColor: vipInfo.color }]} />
                )}
              </View>
              {/* Live indicator */}
              {currentUser.isHost && (
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDotGreen} />
                  <Text style={styles.liveIndicatorText}>HOST</Text>
                </View>
              )}
            </Pressable>

            {/* Name & online status */}
            <View style={styles.profileNameSection}>
              <View style={styles.nameRow}>
                <Text style={styles.displayName} numberOfLines={1}>{currentUser.displayName}</Text>
                {currentUser.isHost && <MaterialIcons name="verified" size={16} color={Colors.primary} />}
              </View>
              <Text style={styles.username}>@{currentUser.username}</Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online Now</Text>
              </View>
            </View>

            {/* Action buttons top-right */}
            <View style={styles.heroActionBtns}>
              <Pressable style={[styles.heroActionBtn, { backgroundColor: Colors.primary }]} onPress={() => router.push('/go-live')}>
                <View style={styles.liveDotWhite} />
                <Text style={styles.heroActionBtnText}>LIVE</Text>
              </Pressable>
              <Pressable style={styles.heroActionBtnOutline} onPress={() => router.push('/edit-profile' as any)}>
                <MaterialIcons name="edit" size={14} color={Colors.textPrimary} />
                <Text style={styles.heroActionBtnOutlineText}>Edit</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Level & VIP progress */}
        <View style={styles.levelSection}>
          <View style={styles.levelRow}>
            <View style={[styles.levelBadge, { backgroundColor: vipInfo.color + '20', borderColor: vipInfo.color + '60' }]}>
              <Text style={{ fontSize: 14 }}>{vipInfo.badge}</Text>
              <Text style={[styles.levelBadgeText, { color: vipInfo.color }]}>{vipInfo.name}</Text>
            </View>
            <View style={styles.levelBadge}>
              <Text style={{ fontSize: 14 }}>⭐</Text>
              <Text style={styles.levelBadgeText}>Lv.{level}</Text>
            </View>
            <View style={styles.levelBadge}>
              <Text style={{ fontSize: 14 }}>🔥</Text>
              <Text style={styles.levelBadgeText}>{(currentUser.points || 0).toLocaleString()} pts</Text>
            </View>
          </View>

          {/* VIP Progress */}
          <View style={styles.progressWrap}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>{vipInfo.name} → {nextVip ? nextVip.name : 'MAX'}</Text>
              <Text style={styles.progressVal}>68%</Text>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: '68%', backgroundColor: vipInfo.color || Colors.primary }]} />
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsBar}>
          {[
            { label: 'Followers',  value: fmt(currentUser.followers),          onPress: () => router.push(`/followers/${currentUser.id}`) },
            { label: 'Following',  value: fmt(currentUser.following),           onPress: () => router.push(`/followers/${currentUser.id}`) },
            { label: 'Likes',      value: fmt(totalLikes),                     onPress: () => setPostTab('liked') },
            { label: 'Diamonds',   value: fmt(currentUser.totalGiftsReceived), onPress: () => router.push('/wallet') },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={styles.statDiv} />}
              <Pressable style={styles.stat} onPress={s.onPress}>
                <Text style={styles.statVal}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </Pressable>
            </React.Fragment>
          ))}
        </View>

        {/* Bio */}
        {currentUser.bio ? (
          <View style={styles.bioSection}>
            <Text style={styles.bio}>{currentUser.bio}</Text>
          </View>
        ) : null}

        {/* Wallet quick strip */}
        <View style={styles.walletStrip}>
          <Pressable style={styles.walletItem} onPress={() => router.push('/wallet')}>
            <Text style={{ fontSize: 22 }}>💎</Text>
            <View>
              <Text style={styles.walletItemVal}>{fmt(currentUser.diamonds)}</Text>
              <Text style={styles.walletItemLabel}>Diamonds</Text>
            </View>
          </Pressable>
          <View style={styles.walletDiv} />
          <Pressable style={styles.walletItem} onPress={() => router.push('/wallet')}>
            <Text style={{ fontSize: 22 }}>🪙</Text>
            <View>
              <Text style={[styles.walletItemVal, { color: Colors.gold }]}>{fmt(currentUser.coins)}</Text>
              <Text style={styles.walletItemLabel}>S-Coins</Text>
            </View>
          </Pressable>
          <View style={styles.walletDiv} />
          <Pressable style={styles.walletItem} onPress={() => router.push('/withdrawal')}>
            <Text style={{ fontSize: 22 }}>💰</Text>
            <View>
              <Text style={[styles.walletItemVal, { color: Colors.success }]}>{fmt(currentUser.points || 0)}</Text>
              <Text style={styles.walletItemLabel}>Points</Text>
            </View>
          </Pressable>
          <Pressable style={styles.rechargeBtn} onPress={() => router.push('/recharge')}>
            <MaterialIcons name="add" size={16} color="#FFF" />
            <Text style={styles.rechargeBtnText}>Top Up</Text>
          </Pressable>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsGrid}>
          {QUICK_ACTIONS.map(a => (
            <Pressable key={a.label} style={styles.qaItem} onPress={a.onPress}>
              <View style={[styles.qaIconWrap, { backgroundColor: a.color + '18' }]}>
                <Text style={{ fontSize: 22 }}>{a.icon}</Text>
              </View>
              <Text style={styles.qaLabel}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Suggested Users */}
        <View style={styles.suggestedSection}>
          <View style={styles.suggestedHeader}>
            <Text style={styles.sectionTitle}>💫 People You May Know</Text>
            <Pressable onPress={() => router.push('/search')}><Text style={styles.seeAll}>See All</Text></Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: Spacing.md, gap: Spacing.sm }}>
            {MOCK_USERS.slice(0, 8).map(u => (
              <Pressable key={u.id} style={styles.sugCard} onPress={() => router.push(`/user/${u.id}`)}>
                <Image source={{ uri: u.avatar }} style={styles.sugAv} contentFit="cover" />
                {u.isLive && <View style={styles.sugLive}><Text style={styles.sugLiveText}>LIVE</Text></View>}
                {u.isOnline && !u.isLive && <View style={styles.sugOnlineDot} />}
                <Text style={styles.sugName} numberOfLines={1}>{u.displayName.split(' ')[0]}</Text>
                <Text style={styles.sugFollowers}>{fmt(u.followers)}</Text>
                <Pressable
                  style={[styles.sugFollowBtn, followedUsers.includes(u.id) && styles.sugFollowBtnActive]}
                  onPress={() => toggleFollow(u.id)}
                >
                  <Text style={[styles.sugFollowText, followedUsers.includes(u.id) && styles.sugFollowTextActive]}>
                    {followedUsers.includes(u.id) ? '✓' : '+'}
                  </Text>
                </Pressable>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Grid Tabs */}
        <View style={styles.gridTabs}>
          {([
            { key: 'posts', icon: 'grid-on', label: 'Posts' },
            { key: 'reels', icon: 'videocam', label: 'Reels' },
            { key: 'liked', icon: 'favorite', label: 'Liked' },
          ] as const).map(t => (
            <Pressable
              key={t.key}
              style={[styles.gridTab, postTab === t.key && styles.gridTabActive]}
              onPress={() => setPostTab(t.key)}
            >
              <MaterialIcons name={t.icon as any} size={20} color={postTab === t.key ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.gridTabLabel, postTab === t.key && styles.gridTabLabelActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Post Grid */}
        <View style={styles.postGrid}>
          {POST_GRID.map((img, i) => (
            <Pressable key={i} style={styles.gridCell} onPress={() => router.push('/reels')}>
              <Image source={{ uri: img }} style={styles.gridImg} contentFit="cover" />
              {postTab === 'reels' && (
                <View style={styles.reelPlay}>
                  <MaterialIcons name="play-arrow" size={18} color="#FFF" />
                </View>
              )}
              {postTab === 'liked' && (
                <View style={styles.heartOverlay}><Text style={{ fontSize: 16 }}>❤️</Text></View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm }]}>⚡ Account</Text>
          <View style={styles.menuCard}>
            {menuItems.map((item, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && { opacity: 0.7, backgroundColor: Colors.surfaceElevated },
                  index === menuItems.length - 1 && styles.menuItemLast,
                  item.color === Colors.error && styles.menuItemDanger,
                ]}
                onPress={item.onPress}
              >
                <View style={[styles.menuIconBg, { backgroundColor: (item.color || Colors.primary) + '18' }]}>
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuLabel, item.color === Colors.error && { color: Colors.error }]}>{item.label}</Text>
                  {item.sub ? <Text style={styles.menuSub} numberOfLines={1}>{item.sub}</Text> : null}
                </View>
                <MaterialIcons name="chevron-right" size={18} color={item.color === Colors.error ? Colors.error : Colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Avatar Source Modal */}
      <Modal visible={showAvatarModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowAvatarModal(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Profile Photo</Text>
            <Pressable style={styles.modalOption} onPress={() => handleAvatarChange('camera')}>
              <View style={[styles.modalOptionIcon, { backgroundColor: Colors.primary + '20' }]}>
                <MaterialIcons name="camera-alt" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </Pressable>
            <Pressable style={styles.modalOption} onPress={() => handleAvatarChange('library')}>
              <View style={[styles.modalOptionIcon, { backgroundColor: Colors.secondary + '20' }]}>
                <MaterialIcons name="photo-library" size={24} color={Colors.secondary} />
              </View>
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </Pressable>
            <Pressable style={[styles.modalOption, { borderBottomWidth: 0 }]} onPress={() => setShowAvatarModal(false)}>
              <View style={[styles.modalOptionIcon, { backgroundColor: Colors.surfaceElevated }]}>
                <MaterialIcons name="close" size={24} color={Colors.textMuted} />
              </View>
              <Text style={[styles.modalOptionText, { color: Colors.textMuted }]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { color: '#111827', fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F9FAFB', paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: '#E5E7EB' },
  headerBtnText: { color: Colors.diamond, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  headerIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  // Hero
  heroSection: { backgroundColor: '#FFF', marginBottom: Spacing.xs },
  coverImg: { width: '100%', height: 120 },
  coverGrad: { ...StyleSheet.absoluteFillObject, height: 120 },
  editCoverBtn: { position: 'absolute', bottom: 8, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  editCoverText: { color: '#FFF', fontSize: 10, fontWeight: FontWeight.semibold },
  avatarRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, marginTop: -36, paddingBottom: Spacing.sm, gap: Spacing.sm },
  avatarSection: { position: 'relative' },
  avatarWrap: { position: 'relative' },
  avatar: { width: 82, height: 82, borderRadius: 41, borderWidth: 3, borderColor: Colors.primary, backgroundColor: '#F3F4F6' },
  avatarUploadOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 41, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  editAvatarBtn: { position: 'absolute', bottom: 2, right: 2, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  vipRing: { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: 45, borderWidth: 2.5 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.live, borderRadius: BorderRadius.pill, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'center', marginTop: 4 },
  liveDotGreen: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFF' },
  liveIndicatorText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  profileNameSection: { flex: 1, gap: 2, paddingTop: 36 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  displayName: { color: '#111827', fontSize: FontSize.md, fontWeight: FontWeight.bold, flex: 1 },
  username: { color: '#6B7280', fontSize: FontSize.xs },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  onlineText: { color: Colors.success, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  heroActionBtns: { gap: 6, paddingTop: 36, alignItems: 'flex-end' },
  heroActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  liveDotWhite: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  heroActionBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.black },
  heroActionBtnOutline: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 5, borderWidth: 1, borderColor: '#D1D5DB' },
  heroActionBtnOutlineText: { color: '#374151', fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  // Level Section
  levelSection: { backgroundColor: '#FFF', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  levelRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F9FAFB', borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 5, borderWidth: 1, borderColor: '#E5E7EB' },
  levelBadgeText: { color: '#374151', fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  progressWrap: { gap: 4 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { color: '#6B7280', fontSize: FontSize.xs },
  progressVal: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  progressTrack: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  // Stats
  statsBar: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: Spacing.xs },
  stat: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statVal: { color: '#111827', fontSize: FontSize.md, fontWeight: FontWeight.black },
  statLabel: { color: '#9CA3AF', fontSize: 10 },
  statDiv: { width: 1, backgroundColor: '#F3F4F6', marginVertical: Spacing.sm },
  // Bio
  bioSection: { backgroundColor: '#FFF', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: Spacing.xs },
  bio: { color: '#374151', fontSize: FontSize.sm, lineHeight: 20 },
  // Wallet Strip
  walletStrip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: Spacing.sm },
  walletItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  walletDiv: { width: 1, height: 28, backgroundColor: '#F3F4F6', marginHorizontal: Spacing.xs },
  walletItemVal: { color: Colors.diamond, fontSize: FontSize.sm, fontWeight: FontWeight.black },
  walletItemLabel: { color: '#9CA3AF', fontSize: 9 },
  rechargeBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 5, marginLeft: 'auto' },
  rechargeBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  // Quick Actions
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#FFF', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: 0, marginBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  qaItem: { width: '25%', alignItems: 'center', paddingVertical: Spacing.sm, gap: 5 },
  qaIconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { color: '#374151', fontSize: 10, fontWeight: FontWeight.medium, textAlign: 'center' },
  // Suggested
  suggestedSection: { backgroundColor: '#FFF', paddingBottom: Spacing.md, marginBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  suggestedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  sectionTitle: { color: '#111827', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  seeAll: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  sugCard: { width: 80, backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: Spacing.xs, alignItems: 'center', gap: 3, borderWidth: 1, borderColor: '#F3F4F6', position: 'relative' },
  sugAv: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: Colors.primary },
  sugLive: { position: 'absolute', top: 6, right: 6, backgroundColor: Colors.live, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  sugLiveText: { color: '#FFF', fontSize: 7, fontWeight: FontWeight.black },
  sugOnlineDot: { position: 'absolute', top: 6, right: 6, width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: '#FFF' },
  sugName: { color: '#111827', fontSize: 10, fontWeight: FontWeight.semibold, textAlign: 'center' },
  sugFollowers: { color: '#9CA3AF', fontSize: 9 },
  sugFollowBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sugFollowBtnActive: { backgroundColor: '#F9FAFB', borderColor: '#D1D5DB' },
  sugFollowText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.black },
  sugFollowTextActive: { color: '#9CA3AF' },
  // Grid
  gridTabs: { flexDirection: 'row', backgroundColor: '#FFF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  gridTab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  gridTabActive: { borderBottomWidth: 2.5, borderBottomColor: Colors.primary },
  gridTabLabel: { color: '#9CA3AF', fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  gridTabLabelActive: { color: Colors.primary, fontWeight: FontWeight.bold },
  postGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, backgroundColor: '#FFF' },
  gridCell: { width: GRID_CELL, height: GRID_CELL, position: 'relative', overflow: 'hidden' },
  gridImg: { width: '100%', height: '100%' },
  reelPlay: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 11, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  heartOverlay: { position: 'absolute', bottom: 6, right: 6 },
  // Menu
  menuSection: { paddingVertical: Spacing.sm },
  menuCard: { marginHorizontal: Spacing.md, backgroundColor: '#FFF', borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: '#F3F4F6', overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: Spacing.sm },
  menuItemLast: { borderBottomWidth: 0 },
  menuItemDanger: { backgroundColor: '#FEF2F2' },
  menuIconBg: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  menuIcon: { fontSize: 18 },
  menuLabel: { color: '#111827', fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  menuSub: { color: '#9CA3AF', fontSize: FontSize.xs, marginTop: 1 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFF', borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, paddingBottom: 40 },
  modalTitle: { color: '#111827', fontSize: FontSize.lg, fontWeight: FontWeight.bold, textAlign: 'center', marginBottom: Spacing.md },
  modalOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalOptionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  modalOptionText: { color: '#111827', fontSize: FontSize.md, fontWeight: FontWeight.medium },
});
