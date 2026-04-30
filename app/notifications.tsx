// SashLive — Enhanced Notifications Screen with Local Push
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  ScrollView, Animated, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import {
  sendGiftNotification,
  sendFollowNotification,
  sendPKChallengeNotification,
  sendLiveNotification,
} from '@/hooks/usePushNotifications';
import { useAlert } from '@/template';

type NotifType = 'gift' | 'follow' | 'like' | 'pk' | 'live' | 'system' | 'comment';

interface Notification {
  id: string;
  type: NotifType;
  user: string;
  userId: string;
  avatar: string;
  text: string;
  extra?: string;
  time: string;
  isRead: boolean;
  route?: string;
}

const NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'gift',    user: 'CosmicRider',   userId: 'u005', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop', text: 'sent you a Dragon Gift 🐉', extra: '+5,000 💎', time: '1m', isRead: false, route: '/wallet' },
  { id: 'n2', type: 'follow',  user: 'GalaxyGoddess', userId: 'u007', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop', text: 'started following you', extra: '', time: '5m', isRead: false, route: '/user/u007' },
  { id: 'n3', type: 'pk',      user: 'NeonPulse',     userId: 'u006', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', text: 'challenged you to PK Battle! ⚔️', extra: 'Tap to accept', time: '8m', isRead: false, route: '/live/room002' },
  { id: 'n4', type: 'gift',    user: 'StarKing',      userId: 'u004', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop', text: 'sent you a Galaxy gift 🌌', extra: '+1,000 💎', time: '15m', isRead: true, route: '/wallet' },
  { id: 'n5', type: 'live',    user: 'RoseQueen',     userId: 'u009', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', text: 'went live — join now! 🔴', extra: 'Watch live', time: '22m', isRead: true, route: '/live/room004' },
  { id: 'n6', type: 'comment', user: 'DragonFire',    userId: 'u002', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', text: 'commented on your post: "Amazing! 🔥"', extra: '', time: '45m', isRead: true },
  { id: 'n7', type: 'like',    user: 'Moonlight',     userId: 'u003', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', text: 'and 234 others liked your post ❤️', extra: '', time: '1h', isRead: true },
  { id: 'n8', type: 'gift',    user: 'ThunderBolt',   userId: 'u008', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop', text: 'sent you a Crown gift 👑', extra: '+50 💎', time: '2h', isRead: true, route: '/wallet' },
  { id: 'n9', type: 'follow',  user: 'MoonlightDancer', userId: 'u003', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', text: 'followed you back', extra: '', time: '3h', isRead: true, route: '/user/u003' },
  { id: 'n10', type: 'system', user: 'SashLive',      userId: 'system', avatar: 'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=100&h=100&fit=crop', text: '🎉 Congratulations! You reached VIP Level 4!', extra: 'View rewards', time: '1d', isRead: true },
  { id: 'n11', type: 'pk',     user: 'CosmicRider',   userId: 'u005', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop', text: 'won the PK battle against you yesterday', extra: 'View recap', time: '1d', isRead: true, route: '/live/room001' },
];

const NOTIF_CONFIG: Record<NotifType, { emoji: string; color: string; bgColor: string }> = {
  gift:    { emoji: '🎁', color: Colors.primary,   bgColor: Colors.primary + '20' },
  follow:  { emoji: '👥', color: Colors.secondary,  bgColor: Colors.secondary + '20' },
  like:    { emoji: '❤️', color: Colors.live,        bgColor: Colors.live + '20' },
  pk:      { emoji: '⚔️', color: Colors.accent,     bgColor: Colors.accent + '20' },
  live:    { emoji: '🔴', color: Colors.live,        bgColor: Colors.live + '20' },
  system:  { emoji: '🔔', color: Colors.diamond,    bgColor: Colors.diamond + '20' },
  comment: { emoji: '💬', color: Colors.success,    bgColor: Colors.success + '20' },
};

const NOTIF_PREFS = [
  { key: 'gifts',    label: 'Gift Alerts',     icon: '🎁', desc: 'When someone sends you a gift' },
  { key: 'follows',  label: 'New Followers',   icon: '👥', desc: 'When someone follows you' },
  { key: 'pk',       label: 'PK Challenges',   icon: '⚔️', desc: 'Battle invitations' },
  { key: 'live',     label: 'Live Alerts',     icon: '🔴', desc: 'When followed users go live' },
  { key: 'messages', label: 'Messages',        icon: '💬', desc: 'New direct messages' },
  { key: 'likes',    label: 'Likes & Comments',icon: '❤️', desc: 'Post engagement notifications' },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [notifs, setNotifs] = useState(NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'settings'>('all');
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    gifts: true, follows: true, pk: true, live: true, messages: true, likes: false,
  });
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
  const markRead = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  const deleteNotif = (id: string) => setNotifs(prev => prev.filter(n => n.id !== id));

  const unreadCount = notifs.filter(n => !n.isRead).length;
  const displayed = activeTab === 'unread' ? notifs.filter(n => !n.isRead) : notifs;

  // Test notification buttons
  const testPushNotifications = async (type: string) => {
    switch (type) {
      case 'gift':   await sendGiftNotification('CosmicRider', 'Dragon', '🐉', 5000); break;
      case 'follow': await sendFollowNotification('GalaxyGoddess', 'u007'); break;
      case 'pk':     await sendPKChallengeNotification('NeonPulse'); break;
      case 'live':   await sendLiveNotification('RoseQueen', 'u009'); break;
    }
    showAlert('✅ Test Sent!', 'Check your notification tray.');
  };

  const renderNotif = ({ item }: { item: Notification }) => {
    const config = NOTIF_CONFIG[item.type];
    return (
      <Pressable
        style={({ pressed }) => [
          styles.notifRow,
          !item.isRead && styles.notifRowUnread,
          pressed && { opacity: 0.8 },
        ]}
        onPress={() => {
          markRead(item.id);
          if (item.route) router.push(item.route as any);
        }}
        onLongPress={() => showAlert('Options', '', [
          { text: 'Mark as Read', onPress: () => markRead(item.id) },
          { text: 'Delete', style: 'destructive', onPress: () => deleteNotif(item.id) },
          { text: 'Cancel', style: 'cancel' },
        ])}
      >
        {/* Unread indicator */}
        {!item.isRead && <View style={styles.unreadDot} />}

        {/* Avatar with type badge */}
        <View style={styles.notifAvatarWrap}>
          <Image source={{ uri: item.avatar }} style={styles.notifAv} contentFit="cover" />
          <View style={[styles.notifTypeBadge, { backgroundColor: config.color }]}>
            <Text style={{ fontSize: 9 }}>{config.emoji}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <Text style={styles.notifText} numberOfLines={2}>
            <Text style={[styles.notifUser, { color: config.color }]}>{item.user}</Text>
            {' '}{item.text}
          </Text>
          {item.extra ? (
            <View style={[styles.extraBadge, { backgroundColor: config.bgColor }]}>
              <Text style={[styles.extraText, { color: config.color }]}>{item.extra}</Text>
            </View>
          ) : null}
          <Text style={styles.notifTime}>{item.time} ago</Text>
        </View>

        {/* Action buttons for actionable notifications */}
        {(item.type === 'live' || item.type === 'pk') && !item.isRead && (
          <Pressable
            style={[styles.notifAction, { backgroundColor: config.color }]}
            onPress={() => { markRead(item.id); if (item.route) router.push(item.route as any); }}
          >
            <Text style={styles.notifActionText}>{item.type === 'live' ? 'Watch' : 'Accept'}</Text>
          </Pressable>
        )}
        {item.type === 'follow' && !item.isRead && (
          <Pressable style={styles.followBackBtn}>
            <Text style={styles.followBackText}>Follow</Text>
          </Pressable>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerAnim }]}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{unreadCount}</Text></View>}
        </View>
        {unreadCount > 0 && (
          <Pressable onPress={markAllRead}>
            <Text style={styles.markAllBtn}>Mark all read</Text>
          </Pressable>
        )}
      </Animated.View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {[
          { key: 'all',      label: 'All',      count: notifs.length },
          { key: 'unread',   label: 'Unread',   count: unreadCount },
          { key: 'settings', label: 'Settings', count: 0 },
        ].map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            {tab.count > 0 && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{tab.count}</Text></View>}
          </Pressable>
        ))}
      </View>

      {activeTab === 'settings' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xxl }}>
          <Text style={styles.sectionTitle}>🔔 Notification Preferences</Text>
          <View style={styles.prefCard}>
            {NOTIF_PREFS.map((pref, idx) => (
              <View key={pref.key} style={[styles.prefRow, idx === NOTIF_PREFS.length - 1 && styles.prefRowLast]}>
                <Text style={{ fontSize: 22, width: 32 }}>{pref.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prefLabel}>{pref.label}</Text>
                  <Text style={styles.prefDesc}>{pref.desc}</Text>
                </View>
                <Switch
                  value={prefs[pref.key]}
                  onValueChange={v => setPrefs(p => ({ ...p, [pref.key]: v }))}
                  trackColor={{ false: Colors.cardBorder, true: Colors.primary }}
                  thumbColor={prefs[pref.key] ? '#FFF' : Colors.textMuted}
                  ios_backgroundColor={Colors.cardBorder}
                />
              </View>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>🧪 Test Push Notifications</Text>
          <Text style={styles.testNote}>Test how push notifications look on your device:</Text>
          <View style={styles.testGrid}>
            {[
              { type: 'gift',   label: '🎁 Gift Alert',    color: Colors.primary },
              { type: 'follow', label: '👥 New Follower',  color: Colors.secondary },
              { type: 'pk',     label: '⚔️ PK Challenge',  color: Colors.accent },
              { type: 'live',   label: '🔴 Live Alert',    color: Colors.live },
            ].map(t => (
              <Pressable
                key={t.type}
                style={[styles.testBtn, { borderColor: t.color + '60' }]}
                onPress={() => testPushNotifications(t.type)}
              >
                <Text style={[styles.testBtnText, { color: t.color }]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.infoBox}>
            <MaterialIcons name="info-outline" size={16} color={Colors.diamond} />
            <Text style={styles.infoText}>Push notifications require a physical device. On simulators, local notifications will appear in the app only.</Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={item => item.id}
          renderItem={renderNotif}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Spacing.xxl }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 64 }}>🔔</Text>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptyDesc}>You have no {activeTab === 'unread' ? 'unread' : ''} notifications</Text>
            </View>
          }
          ListHeaderComponent={
            displayed.filter(n => !n.isRead).length > 0 ? (
              <View style={styles.sectionHeader}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionHeaderText}>New</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  title: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  unreadBadge: { backgroundColor: Colors.live, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  unreadBadgeText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  markAllBtn: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  tabBar: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  tabTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  tabBadge: { backgroundColor: Colors.live, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  tabBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.bold },
  notifRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, gap: Spacing.sm, position: 'relative' },
  notifRowUnread: { backgroundColor: Colors.primary + '08' },
  unreadDot: { position: 'absolute', left: 6, top: '50%', width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.primary },
  notifAvatarWrap: { position: 'relative', width: 50, height: 50 },
  notifAv: { width: 46, height: 46, borderRadius: 23 },
  notifTypeBadge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.bg },
  notifText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 18 },
  notifUser: { fontWeight: FontWeight.bold },
  extraBadge: { alignSelf: 'flex-start', borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 2, marginTop: 3 },
  extraText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  notifTime: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  notifAction: { paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: BorderRadius.pill },
  notifActionText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  followBackBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: Colors.primary },
  followBackText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.live },
  sectionHeaderText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.bold, textTransform: 'uppercase', letterSpacing: 1 },
  empty: { alignItems: 'center', paddingVertical: 80, gap: Spacing.md },
  emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  emptyDesc: { color: Colors.textMuted, fontSize: FontSize.sm },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  prefCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder, overflow: 'hidden' },
  prefRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, gap: Spacing.sm },
  prefRowLast: { borderBottomWidth: 0 },
  prefLabel: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  prefDesc: { color: Colors.textMuted, fontSize: FontSize.xs },
  testNote: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: Spacing.sm },
  testGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  testBtn: { width: '47%', paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.surface, borderWidth: 1.5 },
  testBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  infoBox: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.diamond + '30' },
  infoText: { flex: 1, color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 16 },
});
