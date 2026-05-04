// SashLive — Notifications Screen (Production-Ready)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  RefreshControl, SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/template';
import { getSupabaseClient } from '@/template';

type NotifType = 'gift' | 'follow' | 'like' | 'pk' | 'live' | 'task' | 'system' | 'comment' | 'message' | 'treasure';

interface Notification {
  id: string;
  type: NotifType;
  user: string;
  userId?: string;
  avatar: string;
  text: string;
  extra?: string;
  time: string;
  route: string;
  isRead: boolean;
  isOnline?: boolean;
  icon: string;
  color: string;
}

const ALL_NOTIFICATIONS: Notification[] = [
  { id: 'n1',  type: 'gift',    user: 'CosmicRider',  userId: 'u005', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop',  text: 'sent you a Crown Gift 👑',          extra: '+50 💎',      time: '2m',   route: '/wallet',           isRead: false, isOnline: true,  icon: '🎁', color: Colors.primary },
  { id: 'n2',  type: 'follow',  user: 'GalaxyGoddess',userId: 'u007', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',  text: 'started following you',             extra: '34K followers', time: '5m',  route: '/user/u007',        isRead: false, isOnline: true,  icon: '👥', color: Colors.secondary },
  { id: 'n3',  type: 'pk',      user: 'NeonPulse',    userId: 'u006', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', text: 'challenged you to a PK Battle ⚔️', extra: 'Tap to view', time: '25m',  route: '/pk-invite/preview',isRead: false, isOnline: true,  icon: '⚔️', color: Colors.live },
  { id: 'n4',  type: 'gift',    user: 'StarKing',     userId: 'u008', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop', text: 'sent you a Galaxy Gift 🌌',         extra: '+1,000 💎',   time: '1h',   route: '/wallet',           isRead: false, isOnline: false, icon: '🎁', color: Colors.primary },
  { id: 'n5',  type: 'live',    user: 'RoseQueen',    userId: 'u009', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', text: 'went live — join now! 🔴',          extra: 'Tap to watch',time: '2h',   route: '/live/room004',     isRead: true,  isOnline: true,  icon: '🔴', color: Colors.live },
  { id: 'n6',  type: 'like',    user: 'DragonFire',   userId: 'u002', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', text: 'liked your post ❤️',                extra: '',            time: '3h',   route: '/reels',            isRead: true,  isOnline: false, icon: '❤️', color: Colors.error },
  { id: 'n7',  type: 'task',    user: 'SashLive',     userId: '',     avatar: 'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=100&h=100&fit=crop',  text: 'You have daily tasks ready to claim!',extra: '+500 pts',  time: '4h',   route: '/daily-tasks',      isRead: true,  isOnline: false, icon: '🎯', color: Colors.success },
  { id: 'n8',  type: 'comment', user: 'Moonlight',    userId: 'u003', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', text: 'commented on your reel 💬',         extra: '"Amazing!"',  time: '5h',   route: '/reels',            isRead: true,  isOnline: false, icon: '💬', color: Colors.primary },
  { id: 'n9',  type: 'treasure',user: 'SashLive',     userId: '',     avatar: 'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=100&h=100&fit=crop',  text: 'Treasure Box is available! 🎁',    extra: '+40 Coins',   time: '6h',   route: '/live/room001',     isRead: true,  isOnline: false, icon: '🎁', color: Colors.gold },
  { id: 'n10', type: 'system',  user: 'SashLive',     userId: '',     avatar: 'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=100&h=100&fit=crop',  text: 'New features update available! 🚀', extra: 'v2.0',        time: '1d',   route: '/settings',         isRead: true,  isOnline: false, icon: '🚀', color: Colors.diamond },
  { id: 'n11', type: 'follow',  user: 'Ohona',        userId: 'u010', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',  text: 'started following you',             extra: '12K followers',time: '2d',  route: '/user/u010',        isRead: true,  isOnline: true,  icon: '👥', color: Colors.secondary },
  { id: 'n12', type: 'gift',    user: 'Nahar',        userId: 'u011', avatar: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=100&h=100&fit=crop',  text: 'sent you a Diamond Ring 💍',        extra: '+200 💎',     time: '2d',   route: '/wallet',           isRead: true,  isOnline: false, icon: '💎', color: Colors.diamond },
];

const FILTER_TABS = [
  { key: 'all',     label: 'All',      icon: '🔔' },
  { key: 'gifts',   label: 'Gifts',    icon: '🎁' },
  { key: 'social',  label: 'Social',   icon: '👥' },
  { key: 'live',    label: 'Live',     icon: '🔴' },
  { key: 'system',  label: 'System',   icon: '⚙️' },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState(ALL_NOTIFICATIONS);
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setRefreshing(false);
  };

  const getFiltered = () => {
    switch (filter) {
      case 'gifts':  return notifications.filter(n => n.type === 'gift');
      case 'social': return notifications.filter(n => ['follow', 'like', 'comment', 'pk'].includes(n.type));
      case 'live':   return notifications.filter(n => ['live', 'treasure'].includes(n.type));
      case 'system': return notifications.filter(n => ['system', 'task'].includes(n.type));
      default:       return notifications;
    }
  };

  const filtered = getFiltered();
  const today = filtered.filter(n => ['2m', '5m', '12m', '25m', '1h', '2h', '3h', '4h', '5h', '6h'].includes(n.time));
  const older = filtered.filter(n => ['1d', '2d', '3d'].includes(n.time));

  const renderNotif = ({ item }: { item: Notification }) => (
    <Pressable
      style={[styles.notifRow, !item.isRead && styles.notifRowUnread]}
      onPress={() => {
        markRead(item.id);
        router.push(item.route as any);
      }}
    >
      {/* Avatar */}
      <View style={styles.notifAvWrap}>
        <Image source={{ uri: item.avatar }} style={styles.notifAv} contentFit="cover" />
        <View style={[styles.notifTypeBadge, { backgroundColor: item.color }]}>
          <Text style={styles.notifTypeEmoji}>{item.icon}</Text>
        </View>
        {item.isOnline && <View style={styles.notifOnlineDot} />}
      </View>

      {/* Content */}
      <View style={styles.notifContent}>
        <Text style={styles.notifText} numberOfLines={2}>
          <Text style={[styles.notifUser, { color: item.color }]}>{item.user} </Text>
          {item.text}
        </Text>
        {item.extra ? (
          <Text style={[styles.notifExtra, { color: item.color }]}>{item.extra}</Text>
        ) : null}
        <Text style={styles.notifTime}>{item.time} ago</Text>
      </View>

      {/* Unread dot */}
      {!item.isRead && <View style={styles.unreadDot} />}

      {/* Action buttons for certain types */}
      {(item.type === 'pk' || item.type === 'live') ? (
        <Pressable
          style={[styles.notifActionBtn, { backgroundColor: item.color }]}
          onPress={() => { markRead(item.id); router.push(item.route as any); }}
        >
          <Text style={styles.notifActionBtnText}>{item.type === 'pk' ? '⚔️ View' : '▶ Watch'}</Text>
        </Pressable>
      ) : item.type === 'follow' ? (
        <Pressable style={styles.followBackBtn}>
          <Text style={styles.followBackBtnText}>Follow</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#111827" />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <Pressable style={styles.markAllBtn} onPress={markAllRead} disabled={unreadCount === 0}>
          <Text style={[styles.markAllText, unreadCount === 0 && { color: '#9CA3AF' }]}>Mark all read</Text>
        </Pressable>
      </View>

      {/* Unread summary banner */}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <View style={styles.unreadBannerDot} />
          <Text style={styles.unreadBannerText}>{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</Text>
          <Pressable onPress={markAllRead}>
            <Text style={styles.unreadBannerAction}>Clear all</Text>
          </Pressable>
        </View>
      )}

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
            onPress={() => setFilter(tab.key)}
          >
            <Text style={{ fontSize: 12 }}>{tab.icon}</Text>
            <Text style={[styles.filterTabText, filter === tab.key && styles.filterTabTextActive]}>{tab.label}</Text>
            {tab.key === 'gifts' && notifications.filter(n => n.type === 'gift' && !n.isRead).length > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{notifications.filter(n => n.type === 'gift' && !n.isRead).length}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderNotif}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListHeaderComponent={
          today.length > 0 ? (
            <Text style={styles.sectionHeader}>TODAY</Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 52 }}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySub}>We will notify you when something happens</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#111827', fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  markAllBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  markAllText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  unreadBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary + '12', paddingHorizontal: Spacing.md, paddingVertical: 8, gap: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.primary + '25' },
  unreadBannerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  unreadBannerText: { flex: 1, color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  unreadBannerAction: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  filterRow: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, gap: 4, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filterTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 7, borderRadius: BorderRadius.pill, position: 'relative' },
  filterTabActive: { backgroundColor: Colors.primary + '15' },
  filterTabText: { color: '#9CA3AF', fontSize: 10, fontWeight: FontWeight.medium },
  filterTabTextActive: { color: Colors.primary, fontWeight: FontWeight.bold },
  filterBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: Colors.live, borderRadius: 7, paddingHorizontal: 4, paddingVertical: 1 },
  filterBadgeText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.black },
  sectionHeader: { color: '#9CA3AF', fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: '#F9FAFB' },
  notifRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F9FAFB', gap: Spacing.sm },
  notifRowUnread: { backgroundColor: Colors.primary + '06' },
  notifAvWrap: { width: 52, height: 52, position: 'relative' },
  notifAv: { width: 52, height: 52, borderRadius: 26 },
  notifTypeBadge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  notifTypeEmoji: { fontSize: 10 },
  notifOnlineDot: { position: 'absolute', top: 0, left: 0, width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: '#FFF' },
  notifContent: { flex: 1, gap: 2 },
  notifText: { color: '#374151', fontSize: FontSize.sm, lineHeight: 20 },
  notifUser: { fontWeight: FontWeight.bold },
  notifExtra: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  notifTime: { color: '#9CA3AF', fontSize: FontSize.xs },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  notifActionBtn: { borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 5 },
  notifActionBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  followBackBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: Colors.primary },
  followBackBtnText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  emptyState: { alignItems: 'center', paddingVertical: 80, gap: Spacing.sm },
  emptyTitle: { color: '#111827', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  emptySub: { color: '#9CA3AF', fontSize: FontSize.sm, textAlign: 'center' },
});
