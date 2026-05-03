// SashLive — Profile with Real Avatar Upload
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Dimensions, ActionSheetIOS, Platform, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { DiamondBadge } from '@/components';
import { useApp } from '@/contexts/AppContext';
import { VIP_LEVELS } from '@/constants/config';
import { MOCK_USERS } from '@/services/mockData';
import { useAlert } from '@/template';
import { useAuth } from '@/template';
import { changeAvatar } from '@/services/avatarService';
import { sendLiveNotification } from '@/hooks/usePushNotifications';

const { width } = Dimensions.get('window');

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
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const [postTab, setPostTab] = useState<'posts' | 'liked' | 'reels'>('posts');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const vipInfo = VIP_LEVELS.find(v => v.level === currentUser.vipLevel) || VIP_LEVELS[0];
  const nextVip = VIP_LEVELS.find(v => v.level === currentUser.vipLevel + 1);
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

  const handleAvatarChange = async (source: 'library' | 'camera') => {
    setShowAvatarModal(false);
    if (!user?.id) {
      showAlert('Not logged in', 'Please sign in to change your avatar.');
      return;
    }
    setUploadingAvatar(true);
    const { publicUrl, error } = await changeAvatar(user.id, source);
    setUploadingAvatar(false);

    if (error && error !== 'Cancelled') {
      showAlert('Upload Failed', error);
      return;
    }
    if (publicUrl) {
      updateUser({ avatar: publicUrl });
      showAlert('✅ Avatar Updated!', 'Your new profile photo has been saved.');
    }
  };

  const menuItems = [
    { icon: '💎', label: 'Diamond Wallet',   badge: `${currentUser.diamonds.toLocaleString()} 💎`, onPress: () => router.push('/wallet'),      color: Colors.diamond },
    { icon: '👑', label: 'VIP Store',        badge: `VIP ${vipInfo.badge}`,                        onPress: () => router.push('/vip-store'),   color: Colors.gold },
    { icon: '🏆', label: 'Leaderboard',      badge: '',                                             onPress: () => router.push('/leaderboard'), color: Colors.primary },
    { icon: '💰', label: 'Recharge',         badge: '',                                             onPress: () => router.push('/recharge'),    color: Colors.success },
    { icon: '💸', label: 'Withdrawal',       badge: `${fmt(currentUser.coins)} 🪙`,                 onPress: () => router.push('/withdrawal'),  color: Colors.coin },
    { icon: '🎮', label: 'Games & Casino',   badge: '9 Games',                                      onPress: () => router.push('/games'),       color: Colors.secondary },
    { icon: '🎤', label: 'Host Panel',       badge: currentUser.isHost ? '✓ Active' : 'Apply',     onPress: () => router.push('/host-panel'),  color: Colors.live },
    { icon: '🏢', label: 'Agency Panel',     badge: 'Manage',                                       onPress: () => router.push('/agency'),      color: Colors.accent },
    { icon: '🎬', label: 'Reels',            badge: '',                                             onPress: () => router.push('/reels'),       color: Colors.primary },
    { icon: '📖', label: 'Stories',          badge: '',                                             onPress: () => router.push('/stories'),     color: Colors.secondary },
    { icon: '🎁', label: 'Referral',         badge: currentUser.referralCode,                       onPress: () => showAlert('Referral Code', `Your code: ${currentUser.referralCode}\nShare to earn 50💎 per referral!`), color: Colors.gold },
    { icon: '✏️', label: 'Edit Profile',     badge: '',                                             onPress: () => router.push('/edit-profile' as any), color: Colors.primary },
    { icon: '🛡️', label: 'Admin Panel',       badge: '',                                             onPress: () => router.push('/admin' as any),        color: Colors.gold },
    { icon: '⚙️', label: 'Settings',        badge: '',                                             onPress: () => router.push('/settings'),    color: Colors.textMuted },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Profile</Text>
          <View style={styles.headerRight}>
            <Pressable style={styles.headerBtn} onPress={() => router.push('/wallet')}>
              <Text>💎</Text>
              <Text style={styles.headerBtnText}>{currentUser.diamonds.toLocaleString()}</Text>
            </Pressable>
            <Pressable style={styles.headerIconBtn} onPress={() => router.push('/notifications')}>
              <MaterialIcons name="notifications-none" size={22} color={Colors.textSecondary} />
            </Pressable>
            <Pressable style={styles.headerIconBtn} onPress={() => router.push('/settings')}>
              <MaterialIcons name="settings" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Profile Hero */}
        <View style={styles.profileHero}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=800&h=200&fit=crop' }}
            style={styles.coverImg}
            contentFit="cover"
          />
          <View style={styles.coverOverlay} />
          <View style={styles.profileContent}>
            {/* Avatar with upload */}
            <Pressable style={styles.avatarSection} onPress={() => setShowAvatarModal(true)}>
              <View style={styles.avatarWrap}>
                <Image source={{ uri: currentUser.avatar }} style={styles.avatar} contentFit="cover" />
                {uploadingAvatar && (
                  <View style={styles.avatarUploadOverlay}>
                    <ActivityIndicator color="#FFF" size="small" />
                  </View>
                )}
                <View style={styles.editAvatarBtn}>
                  <MaterialIcons name="camera-alt" size={13} color="#FFF" />
                </View>
              </View>
              <View style={styles.vipBadge}>
                <Text style={{ fontSize: 14 }}>{vipInfo.badge}</Text>
              </View>
            </Pressable>

            <View style={styles.profileInfo}>
              <Text style={styles.displayName}>{currentUser.displayName}</Text>
              <Text style={styles.username}>@{currentUser.username}</Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online Now</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          {[
            { label: 'Followers', value: fmt(currentUser.followers),         onPress: () => router.push(`/followers/${currentUser.id}`) },
            { label: 'Following', value: fmt(currentUser.following),          onPress: () => router.push(`/followers/${currentUser.id}`) },
            { label: 'Gifts',     value: fmt(currentUser.totalGiftsReceived), onPress: () => {} },
            { label: 'Likes',     value: fmt(currentUser.followers * 3),      onPress: () => {} },
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

        {/* Bio & Wallet */}
        <View style={styles.bioSection}>
          <Text style={styles.bio}>{currentUser.bio}</Text>
          <View style={styles.walletRow}>
            <DiamondBadge amount={currentUser.diamonds} type="diamond" size="md" />
            <DiamondBadge amount={currentUser.coins} type="coin" size="md" />
          </View>

          {/* VIP Progress Bar */}
          <View style={styles.vipBar}>
            <View style={styles.vipBarHeader}>
              <Text style={[styles.vipName, { color: vipInfo.color }]}>{vipInfo.name} {vipInfo.badge}</Text>
              {nextVip ? (
                <Text style={styles.vipNext}>→ {nextVip.name} {nextVip.badge}</Text>
              ) : (
                <Text style={styles.vipNext}>Max Level 🏆</Text>
              )}
            </View>
            <View style={styles.vipTrack}>
              <View style={[styles.vipFill, { width: '68%', backgroundColor: vipInfo.color }]} />
            </View>
            <Text style={styles.vipXP}>68,000 / 100,000 XP</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionBtns}>
            <Pressable style={styles.editBtn} onPress={() => router.push('/edit-profile' as any)}>
              <MaterialIcons name="edit" size={15} color={Colors.textPrimary} />
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </Pressable>
            <Pressable style={styles.goLiveBtn} onPress={() => router.push('/go-live')}>
              <View style={styles.liveDot} />
              <Text style={styles.goLiveBtnText}>Go Live</Text>
            </Pressable>
            <Pressable style={styles.shareBtn} onPress={() => showAlert('Share', 'Profile link copied!')}>
              <MaterialIcons name="share" size={18} color={Colors.textPrimary} />
            </Pressable>
            <Pressable style={styles.shareBtn} onPress={() => showAlert('QR Code', 'QR code scanner coming soon!')}>
              <MaterialIcons name="qr-code" size={18} color={Colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        {/* Suggested */}
        <View style={styles.suggestedSection}>
          <View style={styles.suggestedHeader}>
            <Text style={styles.sectionTitle}>💫 People You May Know</Text>
            <Pressable onPress={() => router.push('/search')}><Text style={styles.seeAll}>See All</Text></Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: Spacing.md, gap: Spacing.sm }}>
            {MOCK_USERS.slice(0, 6).map(u => (
              <Pressable key={u.id} style={styles.sugCard} onPress={() => router.push(`/user/${u.id}`)}>
                <Image source={{ uri: u.avatar }} style={styles.sugAv} contentFit="cover" />
                {u.isLive && <View style={styles.sugLive}><Text style={styles.sugLiveText}>LIVE</Text></View>}
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
          {(['posts', 'liked', 'reels'] as const).map(t => (
            <Pressable key={t} style={[styles.gridTab, postTab === t && styles.gridTabActive]} onPress={() => setPostTab(t)}>
              <MaterialIcons
                name={t === 'posts' ? 'grid-on' : t === 'liked' ? 'favorite' : 'videocam'}
                size={22}
                color={postTab === t ? Colors.primary : Colors.textMuted}
              />
            </Pressable>
          ))}
        </View>

        {/* Post Grid */}
        <View style={styles.postGrid}>
          {POST_GRID.map((img, i) => (
            <Pressable key={i} style={styles.gridCell} onPress={() => {}}>
              <Image source={{ uri: img }} style={styles.gridImg} contentFit="cover" />
              {postTab === 'reels' && (
                <View style={styles.reelPlay}><MaterialIcons name="play-arrow" size={18} color="#FFF" /></View>
              )}
              {postTab === 'liked' && (
                <View style={styles.heartOverlay}><Text style={{ fontSize: 14 }}>❤️</Text></View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: Spacing.md }]}>⚡ Quick Access</Text>
          <View style={styles.menuCard}>
            {menuItems.map((item, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && { opacity: 0.7, backgroundColor: Colors.surfaceElevated },
                  index === menuItems.length - 1 && styles.menuItemLast,
                ]}
                onPress={item.onPress}
              >
                <View style={[styles.menuIconBg, { backgroundColor: (item.color || Colors.primary) + '20' }]}>
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <View style={styles.menuRight}>
                  {item.badge ? <Text style={styles.menuBadge} numberOfLines={1}>{item.badge}</Text> : null}
                  <MaterialIcons name="chevron-right" size={18} color={Colors.textMuted} />
                </View>
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
              <MaterialIcons name="camera-alt" size={24} color={Colors.primary} />
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </Pressable>
            <Pressable style={styles.modalOption} onPress={() => handleAvatarChange('library')}>
              <MaterialIcons name="photo-library" size={24} color={Colors.secondary} />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </Pressable>
            <Pressable style={[styles.modalOption, { borderBottomWidth: 0 }]} onPress={() => setShowAvatarModal(false)}>
              <MaterialIcons name="close" size={24} color={Colors.textMuted} />
              <Text style={[styles.modalOptionText, { color: Colors.textMuted }]}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.surface, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.cardBorder },
  headerBtnText: { color: Colors.diamond, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  headerIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  profileHero: { position: 'relative' },
  coverImg: { width: '100%', height: 110 },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,0,20,0.45)', height: 110 },
  profileContent: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.md, marginTop: -38, gap: Spacing.md, paddingBottom: Spacing.sm },
  avatarSection: { position: 'relative' },
  avatarWrap: { position: 'relative' },
  avatar: { width: 86, height: 86, borderRadius: 43, borderWidth: 3, borderColor: Colors.primary },
  avatarUploadOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 43, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.bg },
  vipBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: Colors.bg, borderRadius: 13, width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.gold },
  profileInfo: { flex: 1, paddingBottom: Spacing.xs, gap: 2 },
  displayName: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  username: { color: Colors.textSecondary, fontSize: FontSize.xs },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  onlineText: { color: Colors.success, fontSize: FontSize.xs },
  statsBar: { flexDirection: 'row', backgroundColor: Colors.surface, marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: Spacing.sm },
  stat: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statVal: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.black },
  statLabel: { color: Colors.textMuted, fontSize: 10 },
  statDiv: { width: 1, backgroundColor: Colors.cardBorder, marginVertical: Spacing.sm },
  bioSection: { paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  bio: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
  walletRow: { flexDirection: 'row', gap: Spacing.sm },
  vipBar: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder, gap: 6 },
  vipBarHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  vipName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  vipNext: { color: Colors.textMuted, fontSize: FontSize.xs },
  vipTrack: { height: 7, backgroundColor: Colors.surfaceElevated, borderRadius: 4, overflow: 'hidden' },
  vipFill: { height: '100%', borderRadius: 4 },
  vipXP: { color: Colors.textMuted, fontSize: FontSize.xs },
  actionBtns: { flexDirection: 'row', gap: Spacing.sm },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.cardBorder },
  editBtnText: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  goLiveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.primary },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  goLiveBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  shareBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.cardBorder },
  suggestedSection: { marginBottom: Spacing.md },
  suggestedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  seeAll: { color: Colors.primary, fontSize: FontSize.sm },
  sugCard: { width: 90, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.sm, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.cardBorder, position: 'relative' },
  sugAv: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: Colors.primary },
  sugLive: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.live, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  sugLiveText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.black },
  sugName: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textAlign: 'center' },
  sugFollowers: { color: Colors.textMuted, fontSize: 9 },
  sugFollowBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sugFollowBtnActive: { backgroundColor: Colors.surface, borderColor: Colors.cardBorder },
  sugFollowText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.black },
  sugFollowTextActive: { color: Colors.textMuted },
  gridTabs: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.cardBorder, marginBottom: 2 },
  gridTab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm },
  gridTabActive: { borderBottomWidth: 2.5, borderBottomColor: Colors.primary },
  postGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginBottom: Spacing.md },
  gridCell: { width: (width - 4) / 3, height: (width - 4) / 3, position: 'relative', overflow: 'hidden' },
  gridImg: { width: '100%', height: '100%' },
  reelPlay: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 11, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  heartOverlay: { position: 'absolute', bottom: 6, right: 6 },
  menuSection: { paddingBottom: Spacing.sm },
  menuCard: { marginHorizontal: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, gap: Spacing.sm },
  menuItemLast: { borderBottomWidth: 0 },
  menuIconBg: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  menuIcon: { fontSize: 18 },
  menuLabel: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.sm },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  menuBadge: { color: Colors.textMuted, fontSize: FontSize.xs, maxWidth: 130 },
  // Avatar Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, paddingBottom: 40 },
  modalTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold, textAlign: 'center', marginBottom: Spacing.md },
  modalOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  modalOptionText: { color: Colors.textPrimary, fontSize: FontSize.md },
});
