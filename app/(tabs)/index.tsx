// SashLive — Home Feed with Real Supabase Live Rooms
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Dimensions, Animated, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { MOCK_FEED_POSTS, MOCK_USERS } from '@/services/mockData';
import { fetchLiveRooms, LiveRoom } from '@/services/liveRoomService';

const { width } = Dimensions.get('window');
type FeedTab = 'following' | 'trending' | 'video';

// ── Mock fallback rooms if DB is empty ──
const FALLBACK_ROOMS = [
  { id: 'room001', title: 'Dance with me 💃', hostName: 'GalaxyGoddess', hostAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100', thumbnail: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400', viewers: 12400, isPK: true,  isParty: false, gifts: 4800 },
  { id: 'room002', title: 'PK Battle ⚔️ Epic', hostName: 'CosmicRider',   hostAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100', thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400', viewers: 8900,  isPK: false, isParty: true,  gifts: 3100 },
  { id: 'room003', title: 'Party Night 🎉',   hostName: 'RoseQueen',     hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400', viewers: 6700,  isPK: false, isParty: false, gifts: 2200 },
  { id: 'room004', title: 'Music Stream 🎶',  hostName: 'DragonFire',    hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400', viewers: 4200,  isPK: true,  isParty: false, gifts: 1900 },
  { id: 'room005', title: 'Chill Vibes ☀️',  hostName: 'NeonPulse',     hostAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100', thumbnail: 'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=400', viewers: 3100,  isPK: false, isParty: true,  gifts: 1400 },
];

const STORY_USERS = [
  { id: 's0', isSelf: true,  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200', name: 'My Story', isLive: false, hasStory: false },
  ...MOCK_USERS.slice(0, 7).map(u => ({ id: u.id, isSelf: false, avatar: u.avatar, name: u.displayName.split(' ')[0], isLive: u.isLive, hasStory: true })),
];

const TOP_BANNERS = [
  { id: 'b1', img: 'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=800&h=300&fit=crop', title: 'Top Gifters Week!', sub: 'Win diamonds + VIP rewards' },
  { id: 'b2', img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=300&fit=crop', title: 'PK Season Live', sub: 'Join the battle now' },
  { id: 'b3', img: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=300&fit=crop', title: 'Party Every Night', sub: 'Find your crew' },
];

function BannerCarousel() {
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    const t = setInterval(() => {
      const next = (idx + 1) % TOP_BANNERS.length;
      setIdx(next);
      scrollRef.current?.scrollTo({ x: next * (width - Spacing.md * 2), animated: true });
    }, 3500);
    return () => clearInterval(t);
  }, [idx]);
  return (
    <View style={bS.container}>
      <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onScroll={e => setIdx(Math.round(e.nativeEvent.contentOffset.x / (width - Spacing.md * 2)))}
        scrollEventThrottle={16}
      >
        {TOP_BANNERS.map(b => (
          <View key={b.id} style={bS.slide}>
            <Image source={{ uri: b.img }} style={bS.img} contentFit="cover" />
            <View style={bS.overlay}>
              <View style={bS.badge}><View style={bS.dot} /><Text style={bS.badgeText}>LIVE EVENT</Text></View>
              <Text style={bS.title}>{b.title}</Text>
              <Text style={bS.sub}>{b.sub}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={bS.dots}>
        {TOP_BANNERS.map((_, i) => (
          <View key={i} style={[bS.dotItem, i === idx && bS.dotActive]} />
        ))}
      </View>
    </View>
  );
}
const bS = StyleSheet.create({
  container: { marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  slide: { width: width - Spacing.md * 2, height: 140, borderRadius: BorderRadius.xl, overflow: 'hidden', position: 'relative' },
  img: { ...StyleSheet.absoluteFillObject },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', padding: Spacing.md, justifyContent: 'flex-end', gap: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 4 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFF' },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 1 },
  title: { color: '#FFF', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: Spacing.xs },
  dotItem: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.cardBorder },
  dotActive: { backgroundColor: Colors.primary, width: 16 },
});

// ── Room card component ──
function LiveRoomCard({ room, onPress }: { room: any; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      style={styles.liveCard}
      onPress={onPress}
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200 }).start()}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }], flex: 1 }}>
        <Image
          source={{ uri: room.thumbnail || room.thumbnail_url || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400' }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.liveCardOverlay}>
          <View style={styles.liveCardTop}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
            {(room.isPK || room.is_pk) ? (
              <View style={[styles.liveBadge, { backgroundColor: Colors.live }]}><Text style={styles.liveBadgeText}>⚔️PK</Text></View>
            ) : null}
            {(room.isParty || room.is_party) ? (
              <View style={[styles.liveBadge, { backgroundColor: Colors.secondary }]}><Text style={styles.liveBadgeText}>🎉</Text></View>
            ) : null}
          </View>
          <View style={styles.liveCardBottom}>
            <Image
              source={{ uri: room.hostAvatar || room.host?.avatar_url || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100' }}
              style={styles.liveHostAv}
              contentFit="cover"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.liveHostName} numberOfLines={1}>
                {room.hostName || room.host?.display_name || room.host?.username || 'Host'}
              </Text>
              <Text style={styles.liveViewers}>👁 {((room.viewers || 0) / 1000 >= 1 ? ((room.viewers) / 1000).toFixed(1) + 'K' : room.viewers || 0)}</Text>
            </View>
            <View style={styles.giftTotal}>
              <Text style={styles.giftTotalText}>🎁 {((room.gifts || room.diamonds_earned || 0) / 1000 >= 1 ? ((room.gifts || room.diamonds_earned) / 1000).toFixed(1) + 'K' : (room.gifts || room.diamonds_earned || 0))}</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<FeedTab>('following');
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [liveRooms, setLiveRooms] = useState<any[]>(FALLBACK_ROOMS);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const notifAnim = useRef(new Animated.Value(1)).current;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(notifAnim, { toValue: 1.2, duration: 700, useNativeDriver: true }),
      Animated.timing(notifAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
    ])).start();
    loadRooms();
    // Poll for live rooms every 30 seconds
    pollRef.current = setInterval(loadRooms, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const loadRooms = useCallback(async () => {
    setLoadingRooms(true);
    const { data } = await fetchLiveRooms();
    if (data && data.length > 0) {
      // Map DB format to display format
      const mapped = data.map(r => ({
        id: r.id,
        title: r.title,
        hostName: r.host?.display_name || r.host?.username || 'Host',
        hostId: r.host_id,
        hostAvatar: r.host?.avatar_url || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100',
        thumbnail: r.thumbnail_url || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400',
        viewers: r.viewers || 0,
        isPK: r.is_pk,
        isParty: r.is_party,
        gifts: r.diamonds_earned || 0,
        streamType: r.stream_type,
      }));
      setLiveRooms(mapped);
    } else {
      // Keep fallback rooms if DB empty
      setLiveRooms(FALLBACK_ROOMS);
    }
    setLoadingRooms(false);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRooms();
    setRefreshing(false);
  }, [loadRooms]);

  const toggleLike = (id: string) =>
    setLikedPosts(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.push('/search')} style={styles.searchTrigger}>
          <MaterialIcons name="search" size={18} color={Colors.textMuted} />
          <Text style={styles.searchPlaceholder}>Search users, rooms...</Text>
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable onPress={() => router.push('/wallet')} style={styles.walletBtn}>
            <Text>💎</Text>
            <Text style={styles.walletText}>{currentUser.diamonds.toLocaleString()}</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/recharge')} style={styles.plusBtn}>
            <Text style={styles.plusText}>+</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/notifications')} style={styles.notifBtn}>
            <Animated.View style={{ transform: [{ scale: notifAnim }] }}>
              <MaterialIcons name="notifications" size={22} color={Colors.textSecondary} />
            </Animated.View>
            <View style={styles.notifDot} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Brand logo strip */}
        <View style={styles.logoStrip}>
          <Text style={styles.logo}>Sash<Text style={{ color: Colors.primary }}>Live</Text></Text>
          <View style={styles.onlineRow}>
            <View style={styles.onlinePulse} />
            <Text style={styles.onlineText}>{(liveRooms.length * 3847 + 12000).toLocaleString()} online now</Text>
          </View>
        </View>

        {/* Stories */}
        <View style={styles.storiesWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesContent}>
            {STORY_USERS.map(u => (
              <Pressable
                key={u.id}
                style={styles.storyItem}
                onPress={() => {
                  if (u.isSelf) router.push('/go-live');
                  else if (u.isLive) router.push('/live/room001');
                  else router.push(`/stories?userId=${u.id}` as any);
                }}
              >
                <View style={[styles.storyRing, u.isLive ? styles.liveRing : u.hasStory ? styles.storyRingActive : {}]}>
                  <Image source={{ uri: u.avatar }} style={styles.storyAvatar} contentFit="cover" />
                  {u.isSelf ? <View style={styles.addBtn}><Text style={styles.addBtnText}>+</Text></View> : null}
                  {u.isLive ? <View style={styles.liveTag}><Text style={styles.liveTagText}>LIVE</Text></View> : null}
                </View>
                <Text style={styles.storyName} numberOfLines={1}>{u.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {[
            { icon: '🔴', label: 'Go Live',  color: Colors.live,      route: '/go-live' },
            { icon: '🎙️', label: 'Audio',    color: Colors.secondary, route: '/audio-room/a1' },
            { icon: '⚔️', label: 'PK',       color: Colors.primary,   route: '/live/room002' },
            { icon: '🎉', label: 'Party',    color: Colors.accent,    route: '/live/room003' },
            { icon: '🎬', label: 'Reels',    color: Colors.success,   route: '/reels' },
            { icon: '🎮', label: 'Games',    color: Colors.gold,      route: '/games' },
          ].map(a => (
            <Pressable
              key={a.label}
              style={[styles.quickAction, { backgroundColor: a.color + '20', borderColor: a.color + '50' }]}
              onPress={() => router.push(a.route as any)}
            >
              <Text style={styles.qIcon}>{a.icon}</Text>
              <Text style={[styles.qLabel, { color: a.color }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Event Banner */}
        <BannerCarousel />

        {/* Live Rooms — Real Supabase data */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.livePulse} />
              <Text style={styles.sectionTitle}>Live Now</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{liveRooms.length}</Text>
              </View>
            </View>
            <Pressable onPress={() => router.push('/(tabs)/explore')}>
              <Text style={styles.seeAll}>See All →</Text>
            </Pressable>
          </View>

          {liveRooms.length === 0 ? (
            <View style={styles.noRoomsCard}>
              <Text style={{ fontSize: 32 }}>📡</Text>
              <Text style={styles.noRoomsText}>No live rooms right now</Text>
              <Pressable style={styles.goLiveSmBtn} onPress={() => router.push('/go-live')}>
                <Text style={styles.goLiveSmBtnText}>🔴 Be First to Go Live</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: Spacing.md, gap: Spacing.sm }}>
              {liveRooms.map(room => (
                <LiveRoomCard key={room.id} room={room} onPress={() => router.push(`/live/${room.id}` as any)} />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Top Gifters strip */}
        <Pressable style={styles.leaderStrip} onPress={() => router.push('/leaderboard')}>
          <View style={styles.leaderStripLeft}>
            <Text style={{ fontSize: 22 }}>🏆</Text>
            <View>
              <Text style={styles.leaderTitle}>Top Gifters Today</Text>
              <Text style={styles.leaderSub}>Tap to see full rankings</Text>
            </View>
          </View>
          <View style={styles.leaderAvatars}>
            {MOCK_USERS.slice(0, 3).map((u, i) => (
              <Image key={u.id} source={{ uri: u.avatar }} style={[styles.leaderAv, { marginLeft: i === 0 ? 0 : -12, zIndex: 3 - i }]} contentFit="cover" />
            ))}
          </View>
          <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
        </Pressable>

        {/* Stories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={{ fontSize: 16 }}>⭕</Text>
              <Text style={styles.sectionTitle}>Stories</Text>
            </View>
            <Pressable onPress={() => router.push('/stories')}><Text style={styles.seeAll}>View All →</Text></Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: Spacing.md, gap: Spacing.sm }}>
            {MOCK_USERS.slice(0, 5).map(u => (
              <Pressable key={u.id} style={styles.storyCard} onPress={() => router.push(`/stories?userId=${u.id}` as any)}>
                <Image source={{ uri: u.avatar }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                <View style={styles.storyCardOverlay} />
                <View style={[styles.storyCardBorder, u.isLive && { borderColor: Colors.live }]} />
                <View style={styles.storyCardBottom}>
                  <Image source={{ uri: u.avatar }} style={styles.storyCardAv} contentFit="cover" />
                  <Text style={styles.storyCardName} numberOfLines={1}>{u.displayName.split(' ')[0]}</Text>
                  {u.isLive ? <View style={styles.storyLiveBadge}><Text style={styles.storyLiveText}>LIVE</Text></View> : null}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Audio Rooms */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={{ fontSize: 16 }}>🎙️</Text>
              <Text style={styles.sectionTitle}>Audio Rooms</Text>
            </View>
            <Pressable onPress={() => router.push('/(tabs)/explore')}><Text style={styles.seeAll}>More →</Text></Pressable>
          </View>
          <View style={styles.audioRow}>
            {[
              { t: 'Late Night Vibes', n: 892,  e: '🌙', c: Colors.secondary },
              { t: 'Karaoke Night',    n: 1204, e: '🎤', c: Colors.primary },
              { t: 'Chill Lounge',     n: 567,  e: '☕', c: Colors.success },
            ].map((r, i) => (
              <Pressable key={i} style={[styles.audioCard, { borderColor: r.c + '50' }]} onPress={() => router.push('/audio-room/a1')}>
                <Text style={{ fontSize: 26 }}>{r.e}</Text>
                <Text style={styles.audioTitle} numberOfLines={1}>{r.t}</Text>
                <Text style={styles.audioListeners}>👂 {r.n}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Quick navigation cards */}
        <View style={styles.navCards}>
          {[
            { icon: '🎮', label: 'Games & Casino', sub: '9 games', color: Colors.gold, route: '/games' },
            { icon: '🎯', label: 'Daily Tasks', sub: 'Earn points', color: Colors.success, route: '/daily-tasks' },
            { icon: '🏆', label: 'Leaderboard', sub: 'Top players', color: Colors.primary, route: '/leaderboard' },
            { icon: '💸', label: 'Withdraw', sub: '10K pts = $1', color: Colors.diamond, route: '/withdrawal' },
          ].map(c => (
            <Pressable key={c.label} style={[styles.navCard, { borderColor: c.color + '40' }]} onPress={() => router.push(c.route as any)}>
              <Text style={{ fontSize: 24 }}>{c.icon}</Text>
              <Text style={styles.navCardLabel}>{c.label}</Text>
              <Text style={[styles.navCardSub, { color: c.color }]}>{c.sub}</Text>
            </Pressable>
          ))}
        </View>

        {/* Feed Tabs */}
        <View style={styles.feedTabs}>
          {(['following', 'trending', 'video'] as FeedTab[]).map(tab => (
            <Pressable key={tab} style={[styles.feedTab, activeTab === tab && styles.feedTabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.feedTabText, activeTab === tab && styles.feedTabTextActive]}>
                {tab === 'following' ? '👥 Following' : tab === 'trending' ? '🔥 Trending' : '🎬 Reels'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Feed Content */}
        {activeTab === 'video' ? (
          <Pressable style={styles.reelBanner} onPress={() => router.push('/reels')}>
            <Image source={{ uri: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=260&fit=crop' }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
            <View style={styles.reelBannerOverlay}>
              <Text style={{ fontSize: 52 }}>🎬</Text>
              <Text style={styles.reelBannerTitle}>Open Reels Feed</Text>
              <View style={styles.reelBannerBtn}><Text style={styles.reelBannerBtnText}>▶ Watch Now</Text></View>
            </View>
          </Pressable>
        ) : (
          <View style={{ paddingHorizontal: Spacing.md }}>
            {MOCK_FEED_POSTS.map(post => (
              <View key={post.id} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <Pressable onPress={() => router.push(`/user/${post.userId}`)}>
                    <View style={styles.postAvRing}>
                      <Image source={{ uri: post.avatar }} style={styles.postAv} contentFit="cover" />
                    </View>
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Pressable onPress={() => router.push(`/user/${post.userId}`)}>
                      <Text style={styles.postUser}>{post.username}</Text>
                    </Pressable>
                    <Text style={styles.postTime}>{post.timeAgo} ago</Text>
                  </View>
                  <Pressable style={[styles.followBtnSmall, post.isFollowing && styles.followBtnSmallActive]}>
                    <Text style={[styles.followBtnSmallText, post.isFollowing && styles.followBtnSmallTextActive]}>
                      {post.isFollowing ? '✓ Following' : '+ Follow'}
                    </Text>
                  </Pressable>
                </View>
                <Image source={{ uri: post.image }} style={styles.postImg} contentFit="cover" transition={200} />
                <View style={styles.postActions}>
                  <Pressable style={styles.postAction} onPress={() => toggleLike(post.id)}>
                    <Text style={{ fontSize: 22 }}>{likedPosts.includes(post.id) ? '❤️' : '🤍'}</Text>
                    <Text style={styles.postActionNum}>{(post.likes + (likedPosts.includes(post.id) ? 1 : 0)).toLocaleString()}</Text>
                  </Pressable>
                  <Pressable style={styles.postAction}>
                    <MaterialIcons name="chat-bubble-outline" size={22} color={Colors.textSecondary} />
                    <Text style={styles.postActionNum}>{post.comments}</Text>
                  </Pressable>
                  <Pressable style={styles.postAction}>
                    <MaterialIcons name="share" size={22} color={Colors.textSecondary} />
                  </Pressable>
                  <Pressable style={[styles.postAction, { marginLeft: 'auto' }]}>
                    <MaterialIcons name="bookmark-border" size={22} color={Colors.textSecondary} />
                  </Pressable>
                </View>
                <Text style={styles.postCaption}>{post.caption}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  searchTrigger: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.surface, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder },
  searchPlaceholder: { color: Colors.textMuted, fontSize: FontSize.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  walletBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surface, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 5, borderWidth: 1, borderColor: Colors.cardBorder },
  walletText: { color: Colors.diamond, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  plusBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  plusText: { color: '#FFF', fontSize: 20, fontWeight: FontWeight.black, lineHeight: 24 },
  notifBtn: { position: 'relative', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  notifDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.live, borderWidth: 1.5, borderColor: Colors.bg },
  logoStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingTop: Spacing.xs, paddingBottom: Spacing.sm },
  logo: { fontSize: FontSize.xl, fontWeight: FontWeight.black, color: Colors.textPrimary, letterSpacing: -0.5 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.surface, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: Colors.cardBorder },
  onlinePulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  onlineText: { color: Colors.success, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  storiesWrap: { height: 98 },
  storiesContent: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, gap: Spacing.md },
  storyItem: { alignItems: 'center', gap: 5, width: 66 },
  storyRing: { width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: Colors.cardBorder, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  storyRingActive: { borderColor: Colors.primary },
  liveRing: { borderColor: Colors.live, borderWidth: 2.5 },
  storyAvatar: { width: 54, height: 54, borderRadius: 27 },
  addBtn: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.bg },
  addBtnText: { color: '#FFF', fontSize: 12, fontWeight: FontWeight.black, lineHeight: 16 },
  liveTag: { position: 'absolute', bottom: -8, left: '50%', transform: [{ translateX: -12 }], backgroundColor: Colors.live, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  liveTagText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.black },
  storyName: { color: Colors.textSecondary, fontSize: 10, textAlign: 'center' },
  quickActions: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.xs, marginBottom: Spacing.md, flexWrap: 'wrap' },
  quickAction: { width: (width - Spacing.md * 2 - Spacing.xs * 5) / 6, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, gap: 2 },
  qIcon: { fontSize: 18 },
  qLabel: { fontSize: 9, fontWeight: FontWeight.semibold },
  section: { marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.live },
  badge: { backgroundColor: Colors.live, borderRadius: BorderRadius.pill, paddingHorizontal: 7, paddingVertical: 1 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: FontWeight.bold },
  seeAll: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  liveCard: { width: width * 0.55, height: width * 0.75, borderRadius: BorderRadius.lg, overflow: 'hidden', position: 'relative', backgroundColor: Colors.surface },
  liveCardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.38)', padding: Spacing.sm, justifyContent: 'space-between' },
  liveCardTop: { flexDirection: 'row', gap: 4 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.live, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFF' },
  liveBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  liveCardBottom: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveHostAv: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: Colors.primary },
  liveHostName: { color: '#FFF', fontSize: 11, fontWeight: FontWeight.bold },
  liveViewers: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  giftTotal: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: BorderRadius.pill, paddingHorizontal: 6, paddingVertical: 2 },
  giftTotalText: { color: Colors.gold, fontSize: 9, fontWeight: FontWeight.bold },
  noRoomsCard: { marginHorizontal: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder },
  noRoomsText: { color: Colors.textMuted, fontSize: FontSize.sm },
  goLiveSmBtn: { backgroundColor: Colors.live, borderRadius: BorderRadius.pill, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
  goLiveSmBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  leaderStrip: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.md, marginBottom: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder },
  leaderStripLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  leaderTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  leaderSub: { color: Colors.textMuted, fontSize: FontSize.xs },
  leaderAvatars: { flexDirection: 'row', marginRight: 4 },
  leaderAv: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: Colors.surface },
  storyCard: { width: 110, height: 162, borderRadius: BorderRadius.lg, overflow: 'hidden', position: 'relative', backgroundColor: Colors.surface },
  storyCardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  storyCardBorder: { ...StyleSheet.absoluteFillObject, borderRadius: BorderRadius.lg, borderWidth: 2.5, borderColor: Colors.primary },
  storyCardBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8, alignItems: 'center', gap: 3 },
  storyCardAv: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: Colors.primary },
  storyCardName: { color: '#FFF', fontSize: 10, fontWeight: FontWeight.bold },
  storyLiveBadge: { backgroundColor: Colors.live, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  storyLiveText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.black },
  audioRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm },
  audioCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', gap: 4, borderWidth: 1 },
  audioTitle: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textAlign: 'center' },
  audioListeners: { color: Colors.textMuted, fontSize: 10 },
  navCards: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.lg },
  navCard: { width: (width - Spacing.md * 2 - Spacing.sm) / 2, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: 4, borderWidth: 1 },
  navCardLabel: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.bold, textAlign: 'center' },
  navCardSub: { fontSize: 10, fontWeight: FontWeight.semibold },
  feedTabs: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  feedTab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  feedTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  feedTabText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  feedTabTextActive: { color: '#FFF', fontWeight: FontWeight.semibold },
  reelBanner: { marginHorizontal: Spacing.md, height: 180, borderRadius: BorderRadius.xl, overflow: 'hidden', position: 'relative', marginBottom: Spacing.md },
  reelBannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
  reelBannerTitle: { color: '#FFF', fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  reelBannerBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, marginTop: Spacing.sm },
  reelBannerBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  postCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.cardBorder },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, gap: Spacing.sm },
  postAvRing: { borderWidth: 2, borderColor: Colors.primary, borderRadius: 22, padding: 1 },
  postAv: { width: 38, height: 38, borderRadius: 19 },
  postUser: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  postTime: { color: Colors.textMuted, fontSize: FontSize.xs },
  followBtnSmall: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.primary },
  followBtnSmallActive: { backgroundColor: Colors.surface, borderColor: Colors.cardBorder },
  followBtnSmallText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  followBtnSmallTextActive: { color: Colors.textMuted },
  postImg: { width: '100%', height: width * 0.6 },
  postActions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  postAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.sm, paddingHorizontal: 4 },
  postActionNum: { color: Colors.textSecondary, fontSize: FontSize.sm },
  postCaption: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, paddingHorizontal: Spacing.sm, paddingBottom: Spacing.sm },
});
