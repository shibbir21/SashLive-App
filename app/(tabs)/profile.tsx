// SashLive — Profile Screen (PoppoLive Production Style) with Parallax Cover
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Dimensions, Modal, ActivityIndicator, Animated,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
const COVER_H = 160;

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

export default function ProfileScreen() {
  const router = useRouter();
  const { currentUser, updateUser, toggleFollow, followedUsers } = useApp();
  const { user: authUser, logout } = useAuth();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();
  const insets = useSafeAreaInsets();

  const scrollY = useRef(new Animated.Value(0)).current;

  // Parallax animations
  const coverTranslateY = scrollY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [50, 0, -30],
    extrapolate: 'clamp',
  });
  const coverScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.4, 1],
    extrapolate: 'clamp',
  });
  // Sticky header fade-in on scroll
  const stickyHeaderOpacity = scrollY.interpolate({
    inputRange: [80, 130],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const [postTab, setPostTab] = useState<'posts' | 'liked' | 'reels'>('posts');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [streamHistory, setStreamHistory] = useState<any[]>([]);
  const [coverUrl, setCoverUrl] = useState('https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=800&h=300&fit=crop');
  const [totalLikes, setTotalLikes] = useState(currentUser.followers * 3);

  const vipInfo = VIP_LEVELS.find(v => v.level === currentUser.vipLevel) || VIP_LEVELS[0];
  const nextVip = VIP_LEVELS.find(v => v.level === (currentUser.vipLevel || 0) + 1);
  const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n || 0);

  const level = Math.min(currentUser.coins > 0 ? Math.floor(Math.log(currentUser.coins + 1) * 3) + 1 : 1, 10);
  const levelProgress = (currentUser.coins % 1000) / 10; // 0-100

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
    if (publicUrl) { updateUser({ avatar: publicUrl }); showAlert('Avatar Updated!'); }
  };

  const handleLogout = () => {
    showAlert('Sign Out', 'Are you sure?', [
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const QUICK_ACTIONS = [
    { icon: '💎', label: 'Recharge', color: Colors.diamond, onPress: () => router.push('/recharge') },
    { icon: '💸', label: 'Withdraw', color: Colors.success, onPress: () => router.push('/withdrawal') },
    { icon: '🔴', label: 'Go Live',  color: Colors.live,    onPress: () => router.push('/go-live') },
    { icon: '🎮', label: 'Games',    color: Colors.gold,    onPress: () => router.push('/games') },
    { icon: '🎯', label: 'Tasks',    color: Colors.secondary, onPress: () => router.push('/daily-tasks') },
    { icon: '🏆', label: 'Ranking',  color: Colors.primary, onPress: () => router.push('/leaderboard') },
    { icon: '🏢', label: 'Agency',   color: '#FF8C00',      onPress: () => router.push('/agency') },
    { icon: '👑', label: 'VIP',      color: Colors.gold,    onPress: () => router.push('/vip-store') },
  ];

  const menuItems = [
    { icon: '💎', label: 'Diamond Wallet',   sub: `${currentUser.diamonds.toLocaleString()} 💎`, onPress: () => router.push('/wallet'), color: Colors.diamond },
    { icon: '🪙', label: 'Coin Balance',     sub: `${currentUser.coins.toLocaleString()} 🪙`,    onPress: () => router.push('/wallet'), color: Colors.gold },
    { icon: '🏆', label: 'Points & Earnings',sub: `${(currentUser.points || 0).toLocaleString()} pts`, onPress: () => router.push('/withdrawal'), color: Colors.success },
    { icon: '🎤', label: 'Host Panel',       sub: currentUser.isHost ? 'Active Host ✓' : 'Become a Host', onPress: () => router.push('/host-panel'), color: Colors.live },
    { icon: '🏢', label: 'Agency',           sub: 'Manage your agency', onPress: () => router.push('/agency'), color: Colors.secondary },
    { icon: '🎁', label: 'Referral Code',    sub: currentUser.referralCode || 'Share & Earn', onPress: () => showAlert('Referral', `Code: ${currentUser.referralCode || 'N/A'}\nShare to earn 50💎 per referral!`), color: Colors.primary },
    { icon: '📊', label: 'Stream Analytics', sub: `${streamHistory.length} sessions`, onPress: () => showAlert('Analytics', 'Detailed analytics coming soon!'), color: Colors.primary },
    { icon: '✏️', label: 'Edit Profile',     sub: '', onPress: () => router.push('/edit-profile' as any), color: Colors.primary },
    { icon: '🛡️', label: 'Admin Panel',      sub: '', onPress: () => router.push('/admin' as any), color: Colors.gold },
    { icon: '⚙️', label: 'Settings',         sub: '', onPress: () => router.push('/settings'), color: Colors.textMuted },
    { icon: '🚪', label: 'Sign Out',          sub: '', onPress: handleLogout, color: Colors.error },
  ];

  return (
    <View style={styles.container}>
      {/* Sticky header that appears on scroll */}
      <Animated.View style={[styles.stickyHeader, { paddingTop: insets.top, opacity: stickyHeaderOpacity }]}>
        <View style={styles.stickyHeaderInner}>
          <Image source={{ uri: currentUser.avatar }} style={styles.stickyAvatar} contentFit="cover" />
          <Text style={styles.stickyName} numberOfLines={1}>{currentUser.displayName}</Text>
          <Pressable style={styles.stickyLiveBtn} onPress={() => router.push('/go-live')}>
            <View style={styles.stickyLiveDot} />
            <Text style={styles.stickyLiveText}>LIVE</Text>
          </Pressable>
        </View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* Parallax Cover Photo */}
        <View style={styles.coverContainer}>
          <Animated.View style={[styles.coverImageWrap, { transform: [{ translateY: coverTranslateY }, { scale: coverScale }] }]}>
            <Image source={{ uri: coverUrl }} style={styles.coverImg} contentFit="cover" />
          </Animated.View>
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={styles.coverGrad} />
          {/* Top nav overlay on cover */}
          <View style={[styles.coverTopRow, { paddingTop: insets.top + 8 }]}>
            <View style={{ flex: 1 }} />
            <Pressable style={styles.coverIconBtn} onPress={() => router.push('/notifications')}>
              <MaterialIcons name="notifications-none" size={22} color="#FFF" />
            </Pressable>
            <Pressable style={styles.coverIconBtn} onPress={() => router.push('/settings')}>
              <MaterialIcons name="settings" size={22} color="#FFF" />
            </Pressable>
          </View>
          <Pressable style={styles.editCoverBtn} onPress={() => router.push('/edit-profile' as any)}>
            <MaterialIcons name="camera-alt" size={13} color="#FFF" />
            <Text style={styles.editCoverText}>Edit Cover</Text>
          </Pressable>
        </View>

        {/* Avatar + Name Row */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRow}>
            <Pressable style={styles.avatarWrap} onPress={() => setShowAvatarModal(true)}>
              <Image source={{ uri: currentUser.avatar }} style={[styles.avatar, { borderColor: vipInfo.color || Colors.primary }]} contentFit="cover" />
              {uploadingAvatar ? (
                <View style={styles.avatarUploadOverlay}><ActivityIndicator color="#FFF" size="small" /></View>
              ) : null}
              <View style={[styles.editAvatarBtn, { backgroundColor: vipInfo.color || Colors.primary }]}>
                <MaterialIcons name="camera-alt" size={12} color="#FFF" />
              </View>
              {vipInfo.level > 0 ? <View style={[styles.vipRing, { borderColor: vipInfo.color }]} /> : null}
            </Pressable>

            <View style={{ flex: 1, gap: 3 }}>
              <View style={styles.nameRow}>
                <Text style={styles.displayName} numberOfLines={1}>{currentUser.displayName}</Text>
                {currentUser.isHost ? <MaterialIcons name="verified" size={16} color={Colors.primary} /> : null}
              </View>
              <Text style={styles.username}>@{currentUser.username}</Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online Now</Text>
              </View>
            </View>

            <View style={styles.heroActionBtns}>
              <Pressable style={styles.heroActionBtn} onPress={() => router.push('/go-live')}>
                <View style={styles.liveDotWhite} />
                <Text style={styles.heroActionBtnText}>LIVE</Text>
              </Pressable>
              <Pressable style={styles.heroActionBtnOutline} onPress={() => router.push('/edit-profile' as any)}>
                <MaterialIcons name="edit" size={13} color={Colors.textPrimary} />
                <Text style={styles.heroActionBtnOutlineText}>Edit</Text>
              </Pressable>
            </View>
          </View>

          {/* VIP + Level Badges */}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: vipInfo.color + '20', borderColor: vipInfo.color + '50' }]}>
              <Text style={{ fontSize: 13 }}>{vipInfo.badge}</Text>
              <Text style={[styles.badgeText, { color: vipInfo.color }]}>{vipInfo.name}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={{ fontSize: 13 }}>⭐</Text>
              <Text style={styles.badgeText}>Lv.{level}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={{ fontSize: 13 }}>🔥</Text>
              <Text style={styles.badgeText}>{(currentUser.points || 0).toLocaleString()} pts</Text>
            </View>
          </View>

          {/* VIP Progress bar */}
          <View style={styles.progressWrap}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>{vipInfo.name} → {nextVip ? nextVip.name : 'MAX'}</Text>
              <Text style={[styles.progressVal, { color: vipInfo.color || Colors.primary }]}>{Math.round(levelProgress)}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${levelProgress}%`, backgroundColor: vipInfo.color || Colors.primary }]} />
            </View>
          </View>
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          {[
            { label: 'Followers', value: fmt(currentUser.followers), onPress: () => router.push(`/followers/${currentUser.id}`) },
            { label: 'Following', value: fmt(currentUser.following), onPress: () => router.push(`/followers/${currentUser.id}`) },
            { label: 'Likes',     value: fmt(totalLikes),            onPress: () => setPostTab('liked') },
            { label: 'Diamonds',  value: fmt(currentUser.totalGiftsReceived), onPress: () => router.push('/wallet') },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 ? <View style={styles.statDiv} /> : null}
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

        {/* Wallet Strip */}
        <View style={styles.walletStrip}>
          <Pressable style={styles.walletItem} onPress={() => router.push('/wallet')}>
            <Text style={{ fontSize: 20 }}>💎</Text>
            <View>
              <Text style={styles.walletItemVal}>{fmt(currentUser.diamonds)}</Text>
              <Text style={styles.walletItemLabel}>Diamonds</Text>
            </View>
          </Pressable>
          <View style={styles.walletDiv} />
          <Pressable style={styles.walletItem} onPress={() => router.push('/wallet')}>
            <Text style={{ fontSize: 20 }}>🪙</Text>
            <View>
              <Text style={[styles.walletItemVal, { color: Colors.gold }]}>{fmt(currentUser.coins)}</Text>
              <Text style={styles.walletItemLabel}>S-Coins</Text>
            </View>
          </Pressable>
          <View style={styles.walletDiv} />
          <Pressable style={styles.walletItem} onPress={() => router.push('/withdrawal')}>
            <Text style={{ fontSize: 20 }}>💰</Text>
            <View>
              <Text style={[styles.walletItemVal, { color: Colors.success }]}>{fmt(currentUser.points || 0)}</Text>
              <Text style={styles.walletItemLabel}>Points</Text>
            </View>
          </Pressable>
          <Pressable style={styles.rechargeBtn} onPress={() => router.push('/recharge')}>
            <MaterialIcons name="add" size={14} color="#FFF" />
            <Text style={styles.rechargeBtnText}>Top Up</Text>
          </Pressable>
        </View>

        {/* Quick Actions */}
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, gap: 12, paddingBottom: 4 }}>
            {MOCK_USERS.slice(0, 8).map(u => (
              <Pressable key={u.id} style={styles.sugCard} onPress={() => router.push(`/user/${u.id}`)}>
                <Image source={{ uri: u.avatar }} style={styles.sugAv} contentFit="cover" />
                {u.isLive ? <View style={styles.sugLive}><Text style={styles.sugLiveText}>LIVE</Text></View> : null}
                {u.isOnline && !u.isLive ? <View style={styles.sugOnlineDot} /> : null}
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
              {postTab === 'reels' ? <View style={styles.reelPlay}><MaterialIcons name="play-arrow" size={18} color="#FFF" /></View> : null}
              {postTab === 'liked' ? <View style={styles.heartOverlay}><Text style={{ fontSize: 16 }}>❤️</Text></View> : null}
            </Pressable>
          ))}
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>⚡ Account</Text>
          <View style={styles.menuCard}>
            {menuItems.map((item, index) => (
              <Pressable
                key={index}
                style={[
                  styles.menuItem,
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

        <View style={{ height: 40 }} />
      </Animated.ScrollView>

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
              <View style={[styles.modalOptionIcon, { backgroundColor: '#F3F4F6' }]}>
                <MaterialIcons name="close" size={24} color={Colors.textMuted} />
              </View>
              <Text style={[styles.modalOptionText, { color: Colors.textMuted }]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // Sticky header
  stickyHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  stickyHeaderInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  stickyAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: Colors.primary },
  stickyName: { flex: 1, color: '#111827', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  stickyLiveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  stickyLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  stickyLiveText: { color: '#FFF', fontSize: 11, fontWeight: FontWeight.black },

  // Parallax cover
  coverContainer: { height: COVER_H + 20, overflow: 'hidden', backgroundColor: '#1a1a2e', position: 'relative' },
  coverImageWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  coverImg: { width: '100%', height: '100%' },
  coverGrad: { ...StyleSheet.absoluteFillObject },
  coverTopRow: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  coverIconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 19, margin: 4 },
  editCoverBtn: { position: 'absolute', bottom: 10, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  editCoverText: { color: '#FFF', fontSize: 10, fontWeight: FontWeight.semibold },

  // Avatar section
  avatarSection: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingBottom: 14, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: -38, gap: 10, marginBottom: 12 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 86, height: 86, borderRadius: 43, borderWidth: 3.5, borderColor: Colors.primary, backgroundColor: '#F3F4F6' },
  avatarUploadOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 43, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  editAvatarBtn: { position: 'absolute', bottom: 3, right: 3, width: 25, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#FFF' },
  vipRing: { position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderRadius: 47, borderWidth: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  displayName: { color: '#111827', fontSize: FontSize.md, fontWeight: FontWeight.bold, flex: 1 },
  username: { color: '#6B7280', fontSize: FontSize.xs },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  onlineText: { color: Colors.success, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  heroActionBtns: { gap: 6, paddingBottom: 2, alignItems: 'flex-end' },
  heroActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  liveDotWhite: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  heroActionBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.black },
  heroActionBtnOutline: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: BorderRadius.pill, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#D1D5DB' },
  heroActionBtnOutlineText: { color: '#374151', fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F9FAFB', borderRadius: BorderRadius.pill, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#E5E7EB' },
  badgeText: { color: '#374151', fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  progressWrap: { gap: 4 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { color: '#6B7280', fontSize: FontSize.xs },
  progressVal: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  progressTrack: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  // Stats
  statsBar: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 6 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statVal: { color: '#111827', fontSize: FontSize.md, fontWeight: FontWeight.black },
  statLabel: { color: '#9CA3AF', fontSize: 10 },
  statDiv: { width: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },

  // Bio
  bioSection: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 6 },
  bio: { color: '#374151', fontSize: FontSize.sm, lineHeight: 20 },

  // Wallet Strip
  walletStrip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 10, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 8 },
  walletItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  walletDiv: { width: 1, height: 28, backgroundColor: '#F3F4F6', marginHorizontal: 4 },
  walletItemVal: { color: Colors.diamond, fontSize: FontSize.sm, fontWeight: FontWeight.black },
  walletItemLabel: { color: '#9CA3AF', fontSize: 9 },
  rechargeBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingHorizontal: 10, paddingVertical: 5, marginLeft: 'auto' },
  rechargeBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  // Quick Actions
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 8, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  qaItem: { width: '25%', alignItems: 'center', paddingVertical: 10, gap: 5 },
  qaIconWrap: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  qaLabel: { color: '#374151', fontSize: 10, fontWeight: FontWeight.medium, textAlign: 'center' },

  // Suggested
  suggestedSection: { backgroundColor: '#FFF', paddingBottom: 12, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  suggestedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  sectionTitle: { color: '#111827', fontSize: FontSize.md, fontWeight: FontWeight.bold, paddingHorizontal: 16, paddingTop: 12, marginBottom: 8 },
  seeAll: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  sugCard: { width: 80, backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: 6, alignItems: 'center', gap: 3, borderWidth: 1, borderColor: '#F3F4F6', position: 'relative' },
  sugAv: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: Colors.primary },
  sugLive: { position: 'absolute', top: 6, right: 6, backgroundColor: Colors.live, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  sugLiveText: { color: '#FFF', fontSize: 7, fontWeight: FontWeight.black },
  sugOnlineDot: { position: 'absolute', top: 6, right: 6, width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: '#FFF' },
  sugName: { color: '#111827', fontSize: 10, fontWeight: FontWeight.semibold, textAlign: 'center' },
  sugFollowers: { color: '#9CA3AF', fontSize: 9 },
  sugFollowBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sugFollowBtnActive: { backgroundColor: '#F9FAFB', borderColor: '#D1D5DB' },
  sugFollowText: { color: Colors.primary, fontSize: 16, fontWeight: FontWeight.black },
  sugFollowTextActive: { color: '#9CA3AF' },

  // Grid
  gridTabs: { flexDirection: 'row', backgroundColor: '#FFF', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  gridTab: { flex: 1, alignItems: 'center', paddingVertical: 10, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  gridTabActive: { borderBottomWidth: 2.5, borderBottomColor: Colors.primary },
  gridTabLabel: { color: '#9CA3AF', fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  gridTabLabelActive: { color: Colors.primary, fontWeight: FontWeight.bold },
  postGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, backgroundColor: '#FFF' },
  gridCell: { width: GRID_CELL, height: GRID_CELL, position: 'relative', overflow: 'hidden' },
  gridImg: { width: '100%', height: '100%' },
  reelPlay: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 11, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  heartOverlay: { position: 'absolute', bottom: 6, right: 6 },

  // Menu
  menuSection: { paddingVertical: 8 },
  menuCard: { marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: '#F3F4F6', overflow: 'hidden', marginTop: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  menuItemLast: { borderBottomWidth: 0 },
  menuItemDanger: { backgroundColor: '#FEF2F2' },
  menuIconBg: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  menuIcon: { fontSize: 18 },
  menuLabel: { color: '#111827', fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  menuSub: { color: '#9CA3AF', fontSize: FontSize.xs, marginTop: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFF', borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: 24, paddingBottom: 40 },
  modalTitle: { color: '#111827', fontSize: FontSize.lg, fontWeight: FontWeight.bold, textAlign: 'center', marginBottom: 16 },
  modalOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalOptionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  modalOptionText: { color: '#111827', fontSize: FontSize.md, fontWeight: FontWeight.medium },
});
