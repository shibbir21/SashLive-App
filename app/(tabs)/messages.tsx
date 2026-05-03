// SashLive — Messages Screen with Real DB conversations + Online Presence
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  FlatList, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { MOCK_CONVERSATIONS } from '@/services/mockData';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/template';
import { getSupabaseClient } from '@/template';
import { formatLastSeen } from '@/services/presenceService';

type TabType = 'messages' | 'calls' | 'notifications';

const MOCK_NOTIFICATIONS = [
  { id:'n1', type:'gift',   user:'CosmicRider',   avatar:'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop', text:'sent you a Crown gift 👑',            extra:'+50 💎',     time:'2m',  route:'/wallet', isOnline:true },
  { id:'n2', type:'follow', user:'GalaxyGoddess',  avatar:'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop', text:'started following you',                  extra:'',           time:'5m',  route:'/user/u007', isOnline:true },
  { id:'n3', type:'like',   user:'DragonFire',    avatar:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', text:'liked your post ❤️',                    extra:'',           time:'12m', route:'/(tabs)', isOnline:false },
  { id:'n4', type:'pk',     user:'NeonPulse',     avatar:'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', text:'challenged you to PK ⚔️',              extra:'Tap to view', time:'25m', route:'/pk-invite/preview', isOnline:true },
  { id:'n5', type:'gift',   user:'StarKing',      avatar:'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop', text:'sent you a Galaxy gift 🌌',            extra:'+1,000 💎',   time:'1h',  route:'/wallet', isOnline:false },
  { id:'n6', type:'live',   user:'RoseQueen',     avatar:'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', text:'went live — join now! 🔴',              extra:'Tap to watch',time:'3h', route:'/live/room004', isOnline:true },
  { id:'n7', type:'task',   user:'SashLive',      avatar:'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=100&h=100&fit=crop', text:'You have 5 daily tasks to complete!', extra:'Earn rewards', time:'now', route:'/daily-tasks', isOnline:false },
];

const MOCK_CALLS = [
  { id:'ca1', userId:'u007', username:'Galaxy Goddess', avatar:'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop', type:'video', missed:false, time:'10m ago',   duration:'4:32', isOnline:true },
  { id:'ca2', userId:'u002', username:'Dragon Fire',    avatar:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', type:'audio', missed:true,  time:'2h ago',    duration: undefined, isOnline:false },
  { id:'ca3', userId:'u009', username:'Rose Queen',     avatar:'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', type:'video', missed:false, time:'Yesterday', duration:'12:04', isOnline:true },
  { id:'ca4', userId:'u003', username:'Moonlight',      avatar:'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', type:'audio', missed:true,  time:'Yesterday', duration: undefined, isOnline:false },
];

const NOTIF_STYLES: Record<string, { emoji: string; color: string }> = {
  gift:   { emoji: '🎁', color: Colors.primary },
  follow: { emoji: '👥', color: Colors.secondary },
  like:   { emoji: '❤️', color: Colors.live },
  pk:     { emoji: '⚔️', color: Colors.gold },
  live:   { emoji: '🔴', color: Colors.live },
  task:   { emoji: '🎯', color: Colors.success },
};

interface Conversation {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  isOnline: boolean;
  last_seen?: string;
}

export default function MessagesScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const [activeTab, setActiveTab] = useState<TabType>('messages');
  const [search, setSearch] = useState('');
  const [convs, setConvs] = useState<Conversation[]>(MOCK_CONVERSATIONS as any);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id(id, username, display_name, avatar_url, is_online, last_seen),
        receiver:receiver_id(id, username, display_name, avatar_url, is_online, last_seen)
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!data || data.length === 0) return;

    // Group by conversation partner
    const seen = new Set<string>();
    const grouped: Conversation[] = [];
    for (const msg of data) {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!partnerId || seen.has(partnerId)) continue;
      seen.add(partnerId);
      const partner = msg.sender_id === user.id ? msg.receiver : msg.sender;
      if (!partner) continue;

      const unreadCount = data.filter(m =>
        m.sender_id === partnerId && m.receiver_id === user.id && !m.is_read
      ).length;

      grouped.push({
        id: partnerId,
        userId: partnerId,
        username: partner.display_name || partner.username || 'User',
        avatar: partner.avatar_url || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100',
        lastMessage: msg.type === 'gift' ? `🎁 ${msg.gift_name || 'Gift'}` : (msg.text || ''),
        time: formatTime(msg.created_at),
        unread: unreadCount,
        isOnline: partner.is_online || false,
        last_seen: partner.last_seen,
      });
    }

    if (grouped.length > 0) setConvs(grouped);
  }, [user?.id]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return d.toLocaleDateString();
  };

  useEffect(() => {
    loadConversations();
    pollRef.current = setInterval(loadConversations, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadConversations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const filtered = convs.filter(c => c.username.toLowerCase().includes(search.toLowerCase()));
  const unread = convs.reduce((s, c) => s + (c.unread || 0), 0);
  const missedCalls = MOCK_CALLS.filter(c => c.missed).length;
  const unreadNotifs = MOCK_NOTIFICATIONS.filter(n => n.type === 'gift' || n.type === 'pk' || n.type === 'task').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
        <View style={styles.headerActions}>
          <Pressable style={styles.headerBtn} onPress={() => router.push('/daily-tasks')}>
            <Text style={{ fontSize: 16 }}>🎯</Text>
          </Pressable>
          <Pressable style={styles.headerBtn} onPress={() => router.push('/notifications')}>
            <MaterialIcons name="notifications" size={20} color={Colors.textSecondary} />
            {unreadNotifs > 0 && <View style={styles.headerBtnBadge}><Text style={styles.headerBtnBadgeText}>{unreadNotifs}</Text></View>}
          </Pressable>
          <Pressable style={styles.headerBtn} onPress={() => router.push('/search')}>
            <MaterialIcons name="person-add" size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {([
          { key: 'messages',      label: 'Messages',  badge: unread },
          { key: 'calls',         label: 'Calls',     badge: missedCalls },
          { key: 'notifications', label: 'Alerts',    badge: unreadNotifs },
        ] as const).map(tab => (
          <Pressable key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            {tab.badge > 0 && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{tab.badge}</Text></View>}
          </Pressable>
        ))}
      </View>

      {activeTab === 'messages' && (
        <>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search messages..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && <Pressable onPress={() => setSearch('')}><MaterialIcons name="close" size={16} color={Colors.textMuted} /></Pressable>}
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: Spacing.xxl }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          >
            {/* Quick Actions */}
            <View style={styles.quickActions}>
              {[
                { icon: '📞', label: 'Call',   onPress: () => router.push('/video-call/u002') },
                { icon: '🎙️', label: 'Audio',  onPress: () => router.push('/audio-room/a1') },
                { icon: '🎯', label: 'Tasks',  onPress: () => router.push('/daily-tasks') },
                { icon: '🎮', label: 'Games',  onPress: () => router.push('/games') },
              ].map(a => (
                <Pressable key={a.label} style={styles.qa} onPress={a.onPress}>
                  <Text style={styles.qaIcon}>{a.icon}</Text>
                  <Text style={styles.qaLabel}>{a.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* PK Pending */}
            <Pressable style={styles.pkInviteBanner} onPress={() => router.push('/pk-invite/preview')}>
              <Text style={{ fontSize: 20 }}>⚔️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.pkInviteTitle}>PK Battle Challenge!</Text>
                <Text style={styles.pkInviteSub}>NeonPulse challenged you · 25m ago</Text>
              </View>
              <View style={styles.pkInviteBadge}><Text style={styles.pkInviteBadgeText}>View</Text></View>
            </Pressable>

            <Pressable style={styles.systemNotif} onPress={() => router.push('/notifications')}>
              <View style={styles.systemNotifIcon}><Text style={{ fontSize: 22 }}>🔔</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.systemNotifTitle}>Notifications</Text>
                <Text style={styles.systemNotifSub}>Gifts, follows, PK battles & more</Text>
              </View>
              {unreadNotifs > 0 && <View style={styles.systemBadge}><Text style={styles.systemBadgeText}>{unreadNotifs}</Text></View>}
              <MaterialIcons name="chevron-right" size={18} color={Colors.textMuted} />
            </Pressable>

            <Text style={styles.sectionLabel}>DIRECT MESSAGES</Text>

            {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} /> : null}

            {filtered.map(conv => (
              <Pressable
                key={conv.id}
                style={({ pressed }) => [styles.convRow, pressed && { opacity: 0.75, backgroundColor: Colors.surfaceElevated }]}
                onPress={() => router.push(`/chat/${conv.id}`)}
              >
                <View style={styles.convAvatarWrap}>
                  <Image source={{ uri: conv.avatar }} style={styles.convAvatar} contentFit="cover" />
                  {conv.isOnline && <View style={styles.onlineDot} />}
                </View>
                <View style={styles.convInfo}>
                  <View style={styles.convHeader}>
                    <View style={styles.convNameRow}>
                      <Text style={[styles.convName, conv.unread > 0 && styles.convNameBold]}>{conv.username}</Text>
                      {conv.isOnline ? (
                        <View style={styles.onlinePill}><Text style={styles.onlinePillText}>Online</Text></View>
                      ) : conv.last_seen ? (
                        <Text style={styles.lastSeenText}>{formatLastSeen(conv.last_seen)}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.convTime}>{conv.time}</Text>
                  </View>
                  <View style={styles.convFooter}>
                    <Text style={[styles.convLastMsg, conv.unread > 0 && styles.convLastMsgBold]} numberOfLines={1}>
                      {conv.lastMessage}
                    </Text>
                    {conv.unread > 0 && <View style={styles.unreadBubble}><Text style={styles.unreadBubbleText}>{conv.unread}</Text></View>}
                  </View>
                </View>
              </Pressable>
            ))}

            {filtered.length === 0 && !loading && (
              <View style={styles.emptyConvs}>
                <Text style={{ fontSize: 40 }}>💬</Text>
                <Text style={styles.emptyConvsText}>No conversations yet</Text>
                <Text style={styles.emptyConvsSub}>Search for users to start chatting</Text>
                <Pressable style={styles.emptyConvsBtn} onPress={() => router.push('/search')}>
                  <Text style={styles.emptyConvsBtnText}>Find People</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </>
      )}

      {activeTab === 'calls' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
          <Text style={styles.sectionLabel}>RECENT CALLS</Text>
          {MOCK_CALLS.map(call => (
            <View key={call.id} style={styles.callRow}>
              <View style={styles.callAvWrap}>
                <Image source={{ uri: call.avatar }} style={styles.callAvatar} contentFit="cover" />
                {call.isOnline && <View style={styles.callOnlineDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.callName}>{call.username}</Text>
                <View style={styles.callMeta}>
                  <MaterialIcons name={call.type === 'video' ? 'videocam' : 'call'} size={14} color={call.missed ? Colors.error : Colors.success} />
                  <Text style={[styles.callType, { color: call.missed ? Colors.error : Colors.textMuted }]}>
                    {call.missed ? 'Missed' : call.duration} · {call.time}
                  </Text>
                  {call.isOnline && <View style={styles.onlinePill}><Text style={styles.onlinePillText}>Online</Text></View>}
                </View>
              </View>
              <Pressable style={styles.callBackBtn} onPress={() => router.push(`/video-call/${call.userId}`)}>
                <MaterialIcons name={call.type === 'video' ? 'videocam' : 'call'} size={20} color={Colors.primary} />
              </Pressable>
            </View>
          ))}

          <Pressable style={styles.newCallBtn} onPress={() => router.push('/search')}>
            <MaterialIcons name="add-call" size={20} color="#FFF" />
            <Text style={styles.newCallBtnText}>New Call</Text>
          </Pressable>
        </ScrollView>
      )}

      {activeTab === 'notifications' && (
        <FlatList
          data={MOCK_NOTIFICATIONS}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Spacing.xxl }}
          ListHeaderComponent={<Text style={styles.sectionLabel}>RECENT ALERTS</Text>}
          renderItem={({ item }) => {
            const ns = NOTIF_STYLES[item.type] || NOTIF_STYLES.gift;
            return (
              <Pressable
                style={({ pressed }) => [styles.notifRow, pressed && { opacity: 0.75, backgroundColor: Colors.surfaceElevated }]}
                onPress={() => router.push(item.route as any)}
              >
                <View style={[styles.notifIconWrap, { backgroundColor: ns.color + '20' }]}>
                  <Image source={{ uri: item.avatar }} style={styles.notifAvatar} contentFit="cover" />
                  <View style={[styles.notifTypeBadge, { backgroundColor: ns.color }]}><Text style={{ fontSize: 9 }}>{ns.emoji}</Text></View>
                  {item.isOnline && <View style={styles.notifOnlineDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifText}>
                    <Text style={[styles.notifUser, { color: ns.color }]}>{item.user}</Text>{' '}{item.text}
                  </Text>
                  {item.extra ? <Text style={styles.notifExtra}>{item.extra}</Text> : null}
                  <Text style={styles.notifTime}>{item.time}</Text>
                </View>
                {(item.type === 'live' || item.type === 'pk' || item.type === 'task') && (
                  <Pressable style={[styles.notifActionBtn, { backgroundColor: ns.color }]} onPress={() => router.push(item.route as any)}>
                    <Text style={styles.notifActionText}>{item.type === 'task' ? 'Go' : 'Watch'}</Text>
                  </Pressable>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  title: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  headerActions: { flexDirection: 'row', gap: Spacing.xs },
  headerBtn: { position: 'relative', width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: Colors.cardBorder },
  headerBtnBadge: { position: 'absolute', top: 4, right: 4, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.live, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.bg },
  headerBtnBadgeText: { color: '#FFF', fontSize: 7, fontWeight: FontWeight.black },
  tabBar: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  tabTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  tabBadge: { backgroundColor: Colors.live, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: 'center' },
  tabBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.bold },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.pill, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.sm },
  quickActions: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  qa: { flex: 1, alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder, gap: 3 },
  qaIcon: { fontSize: 22 },
  qaLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },
  pkInviteBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.live + '15', marginHorizontal: Spacing.md, borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.live + '40' },
  pkInviteTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  pkInviteSub: { color: Colors.textMuted, fontSize: FontSize.xs },
  pkInviteBadge: { backgroundColor: Colors.live, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  pkInviteBadgeText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  systemNotif: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: Spacing.md, borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder },
  systemNotifIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  systemNotifTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  systemNotifSub: { color: Colors.textMuted, fontSize: FontSize.xs },
  systemBadge: { backgroundColor: Colors.live, borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  systemBadgeText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  sectionLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.medium, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, marginTop: Spacing.xs },
  convRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  convAvatarWrap: { position: 'relative' },
  convAvatar: { width: 52, height: 52, borderRadius: 26 },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.bg },
  convInfo: { flex: 1, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, paddingBottom: Spacing.sm },
  convHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3, alignItems: 'center' },
  convNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  convName: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  convNameBold: { color: Colors.textPrimary, fontWeight: FontWeight.bold },
  onlinePill: { backgroundColor: Colors.success + '25', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  onlinePillText: { color: Colors.success, fontSize: 9, fontWeight: FontWeight.bold },
  lastSeenText: { color: Colors.textMuted, fontSize: 9 },
  convTime: { color: Colors.textMuted, fontSize: FontSize.xs },
  convFooter: { flexDirection: 'row', alignItems: 'center' },
  convLastMsg: { flex: 1, color: Colors.textMuted, fontSize: FontSize.xs },
  convLastMsgBold: { color: Colors.textSecondary, fontWeight: FontWeight.medium },
  unreadBubble: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  unreadBubbleText: { color: '#FFF', fontSize: 10, fontWeight: FontWeight.bold },
  emptyConvs: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyConvsText: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  emptyConvsSub: { color: Colors.textMuted, fontSize: FontSize.sm },
  emptyConvsBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, marginTop: Spacing.sm },
  emptyConvsBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  // Calls
  callRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  callAvWrap: { position: 'relative' },
  callAvatar: { width: 50, height: 50, borderRadius: 25 },
  callOnlineDot: { position: 'absolute', bottom: 2, right: 2, width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.bg },
  callName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  callMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, flexWrap: 'wrap' },
  callType: { fontSize: FontSize.xs },
  callBackBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.cardBorder },
  newCallBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, margin: Spacing.md, paddingVertical: Spacing.md },
  newCallBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  // Notifications
  notifRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  notifIconWrap: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notifAvatar: { width: 44, height: 44, borderRadius: 22 },
  notifTypeBadge: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.bg },
  notifOnlineDot: { position: 'absolute', top: 0, left: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success, borderWidth: 1.5, borderColor: Colors.bg },
  notifText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 18 },
  notifUser: { fontWeight: FontWeight.bold },
  notifExtra: { color: Colors.diamond, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  notifTime: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  notifActionBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.pill },
  notifActionText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
});
