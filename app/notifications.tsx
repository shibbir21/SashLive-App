// SashLive — Notifications Screen
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';

const NOTIFICATIONS = [
  { id:'n1', type:'gift',   user:'CosmicRider',   avatar:'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop', text:'sent you a Crown gift',            extra:'+50 💎',      time:'2m',  route:'/wallet',          read:false, isOnline:true },
  { id:'n2', type:'follow', user:'GalaxyGoddess',  avatar:'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop', text:'started following you',              extra:'',            time:'5m',  route:'/user/u007',       read:false, isOnline:true },
  { id:'n3', type:'like',   user:'DragonFire',    avatar:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', text:'liked your reel',                  extra:'',            time:'12m', route:'/reels',           read:true,  isOnline:false },
  { id:'n4', type:'pk',     user:'NeonPulse',     avatar:'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', text:'challenged you to a PK battle',    extra:'Accept now!', time:'25m', route:'/pk-invite/preview',read:false, isOnline:true },
  { id:'n5', type:'gift',   user:'StarKing',      avatar:'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop', text:'sent you a Galaxy gift',           extra:'+1,000 💎',   time:'1h',  route:'/wallet',          read:true,  isOnline:false },
  { id:'n6', type:'live',   user:'RoseQueen',     avatar:'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', text:'went live — join now!',            extra:'Live now',    time:'2h',  route:'/live/room004',    read:true,  isOnline:true },
  { id:'n7', type:'task',   user:'SashLive',      avatar:'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=100&h=100&fit=crop', text:'Daily tasks are ready to claim!', extra:'Earn pts',    time:'now', route:'/daily-tasks',     read:false, isOnline:false },
  { id:'n8', type:'system', user:'SashLive',      avatar:'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=100&h=100&fit=crop', text:'Welcome to SashLive! Start earning.', extra:'',         time:'1d',  route:'/(tabs)',           read:true,  isOnline:false },
];

const NOTIF_CONFIG: Record<string, { emoji: string; color: string; label: string }> = {
  gift:   { emoji: '🎁', color: Colors.primary,   label: 'Gift' },
  follow: { emoji: '👥', color: Colors.secondary,  label: 'Follow' },
  like:   { emoji: '❤️', color: '#EF4444',         label: 'Like' },
  pk:     { emoji: '⚔️', color: Colors.gold,       label: 'PK Battle' },
  live:   { emoji: '🔴', color: Colors.live,       label: 'Live' },
  task:   { emoji: '🎯', color: Colors.success,    label: 'Task' },
  system: { emoji: '🔔', color: '#6366F1',         label: 'System' },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const displayed = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 ? (
          <Pressable onPress={markAllRead} style={styles.markAllBtn} hitSlop={8}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        ) : <View style={{ width: 80 }} />}
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        {(['all', 'unread'] as const).map(f => (
          <Pressable
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={displayed}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        renderItem={({ item }) => {
          const cfg = NOTIF_CONFIG[item.type] || NOTIF_CONFIG.system;
          return (
            <Pressable
              style={[styles.notifRow, !item.read && styles.notifRowUnread]}
              onPress={() => { markRead(item.id); router.push(item.route as any); }}
            >
              {!item.read ? <View style={styles.unreadIndicator} /> : null}
              <View style={[styles.avatarWrap, { backgroundColor: cfg.color + '15' }]}>
                <Image source={{ uri: item.avatar }} style={styles.avatar} contentFit="cover" />
                <View style={[styles.typeBadge, { backgroundColor: cfg.color }]}>
                  <Text style={{ fontSize: 9 }}>{cfg.emoji}</Text>
                </View>
                {item.isOnline ? <View style={styles.onlineDot} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifText}>
                  <Text style={[styles.notifUser, { color: cfg.color }]}>{item.user}</Text>
                  {' '}{item.text}
                </Text>
                {item.extra ? <Text style={[styles.notifExtra, { color: cfg.color }]}>{item.extra}</Text> : null}
                <Text style={styles.notifTime}>{item.time} ago</Text>
              </View>
              {['live', 'pk', 'task'].includes(item.type) ? (
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: cfg.color }]}
                  onPress={() => { markRead(item.id); router.push(item.route as any); }}
                  hitSlop={8}
                >
                  <Text style={styles.actionBtnText}>
                    {item.type === 'task' ? 'Claim' : item.type === 'pk' ? 'Accept' : 'Watch'}
                  </Text>
                </Pressable>
              ) : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyDesc}>You are all caught up!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  markAllBtn: { paddingHorizontal: Spacing.sm },
  markAllText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  filterRow: { flexDirection: 'row', backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  filterBtn: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: BorderRadius.pill, backgroundColor: Colors.bgSecondary },
  filterBtnActive: { backgroundColor: Colors.primary },
  filterText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  filterTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  notifRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12, gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, backgroundColor: Colors.surface, position: 'relative' },
  notifRowUnread: { backgroundColor: Colors.primary + '05' },
  unreadIndicator: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: Colors.primary, borderRadius: 2 },
  avatarWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  typeBadge: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.surface },
  onlineDot: { position: 'absolute', top: 0, left: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success, borderWidth: 1.5, borderColor: Colors.surface },
  notifText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 18 },
  notifUser: { fontWeight: FontWeight.bold },
  notifExtra: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, marginTop: 2 },
  notifTime: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.pill, minWidth: 54, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  empty: { alignItems: 'center', paddingVertical: 80, gap: Spacing.sm },
  emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  emptyDesc: { color: Colors.textMuted, fontSize: FontSize.sm },
});
