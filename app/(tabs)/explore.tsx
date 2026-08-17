// SashLive — Discover: PoppoLive/QingShu-style grid, video feed, real filters, featured strip
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions,
  FlatList, ScrollView, Animated, ActivityIndicator,
  RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { getSupabaseClient } from '@/template';
import { fetchLiveRooms } from '@/services/liveRoomService';

const { width, height } = Dimensions.get('window');
const CARD_GAP = 8;
const CARD_W = (width - Spacing.md * 2 - CARD_GAP) / 2;

type FeedTab = 'following' | 'square' | 'video' | 'hot';
type Category = 'all' | 'chatting' | 'singing' | 'esports' | 'dancing' | 'friends' | 'pk';

const CATEGORIES: { key: Category; label: string; emoji: string; color: string }[] = [
  { key: 'all',      label: 'All',      emoji: '✨', color: '#6366F1' },
  { key: 'chatting', label: 'Chat',     emoji: '💬', color: '#FF6B9D' },
  { key: 'singing',  label: 'Singing',  emoji: '🎤', color: '#A78BFA' },
  { key: 'esports',  label: 'Esports',  emoji: '🎮', color: '#60A5FA' },
  { key: 'dancing',  label: 'Dance',    emoji: '💃', color: '#EC4899' },
  { key: 'friends',  label: 'Friends',  emoji: '💞', color: '#F97316' },
  { key: 'pk',       label: 'PK',       emoji: '⚔️', color: '#EF4444' },
];

const MOCK_VIDEOS = [
  { id: 'v1', thumbnail: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600&h=900&fit=crop', user: { name: '🌟 sweet poison', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop', vip: true }, likes: 12400, comments: 567, gifts: 89, shares: 234, caption: 'Electric vibes tonight ⚡🔥', fromFollowing: true },
  { id: 'v2', thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=900&fit=crop', user: { name: 'CosmicRider 🎤', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop', vip: false }, likes: 8900, comments: 234, gifts: 45, shares: 120, caption: 'Night vibes only 🌙✨', fromFollowing: false },
  { id: 'v3', thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=900&fit=crop', user: { name: 'StarKing 👑', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop', vip: true }, likes: 34100, comments: 1892, gifts: 320, shares: 980, caption: 'Dance challenge time! 💃🎶', fromFollowing: true },
  { id: 'v4', thumbnail: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=600&h=900&fit=crop', user: { name: 'RoseQueen 🌹', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop', vip: false }, likes: 21000, comments: 890, gifts: 167, shares: 450, caption: 'Good morning beautiful 🌸', fromFollowing: false },
  { id: 'v5', thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=900&fit=crop', user: { name: 'NightOwl 🦉', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop', vip: true }, likes: 9100, comments: 432, gifts: 78, shares: 210, caption: 'Party never stops 🎉🔥', fromFollowing: true },
];

const FALLBACK_ROOMS = [
  { id: 'room001', title: 'Good Morning 🌅 🇧🇩', hostName: 'Morning Star', thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=400&fit=crop', hostAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80', viewers: 144, isPK: false, isParty: false, category: 'chatting', isTop10: false, isFirstRecharge: false, regionBadge: '', diamonds_earned: 1240 },
  { id: 'room002', title: 'Singing Live 🎤', hostName: 'Voice Star', thumbnail: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=400&fit=crop', hostAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80', viewers: 87, isPK: false, isParty: false, category: 'singing', isTop10: false, isFirstRecharge: false, regionBadge: '', diamonds_earned: 560 },
  { id: 'room003', title: 'Win Big Tonight 💰 🇧🇩', hostName: 'Lucky Star', thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&h=400&fit=crop', hostAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80', viewers: 141, isPK: false, isParty: true, category: 'chatting', isTop10: false, isFirstRecharge: false, regionBadge: '', diamonds_earned: 890 },
  { id: 'room004', title: 'Sinthiya LIVE ✨', hostName: 'Sinthiya', thumbnail: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=300&h=400&fit=crop', hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80', viewers: 311, isPK: false, isParty: false, category: 'singing', isTop10: true, isFirstRecharge: false, regionBadge: 'Region No.1', diamonds_earned: 4200 },
  { id: 'room005', title: 'Make Friends 😊', hostName: 'FriendZone', thumbnail: 'https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=300&h=400&fit=crop', hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', viewers: 78, isPK: false, isParty: false, category: 'friends', isTop10: false, isFirstRecharge: true, regionBadge: '', diamonds_earned: 320 },
  { id: 'room006', title: '⚔️ PK Battle Now!', hostName: 'Gamer Pro', thumbnail: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=300&h=400&fit=crop', hostAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80', viewers: 432, isPK: true, isParty: false, category: 'esports', isTop10: false, isFirstRecharge: false, regionBadge: '', diamonds_earned: 7800 },
  { id: 'room007', title: 'Dance Party 💃🎶', hostName: 'Dance King', thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&h=400&fit=crop', hostAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80', viewers: 319, isPK: false, isParty: true, category: 'dancing', isTop10: false, isFirstRecharge: false, regionBadge: 'Top Dancer', diamonds_earned: 2340 },
  { id: 'room008', title: 'Esports Challenge 🎮', hostName: 'Pro Gamer', thumbnail: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=400&fit=crop', hostAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80', viewers: 220, isPK: true, isParty: false, category: 'esports', isTop10: true, isFirstRecharge: false, regionBadge: '', diamonds_earned: 5100 },
];

const MOCK_CREATORS = [
  { id: 'fc1', display_name: 'Galaxy Girl', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&fit=crop', vip_level: 5, is_online: true, followers: 45000, is_live: true },
  { id: 'fc2', display_name: 'Dragon Fire', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop', vip_level: 3, is_online: true, followers: 23000, is_live: false },
  { id: 'fc3', display_name: 'Rose Queen', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop', vip_level: 5, is_online: false, followers: 61000, is_live: false },
  { id: 'fc4', display_name: 'Cosmic Star', avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&fit=crop', vip_level: 4, is_online: true, followers: 18000, is_live: true },
  { id: 'fc5', display_name: 'Moonlight', avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&fit=crop', vip_level: 2, is_online: false, followers: 9000, is_live: false },
  { id: 'fc6', display_name: 'NeonPulse', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&fit=crop', vip_level: 3, is_online: true, followers: 34000, is_live: true },
];

const VIP_COLORS = ['', '#CD7F32', '#C0C0C0', '#FFCC00', '#00DFFF', '#FF2E8B'];

function fmtNum(n: number) {
  return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;
}

// ── Grid Room Card ──
function RoomCard({ room, onPress }: { room: any; onPress: () => void }) {
  const cat = CATEGORIES.find(c => c.key === room.category) || CATEGORIES[1];
  const pressAnim = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      style={[G.card, { width: CARD_W }]}
      onPress={onPress}
      onPressIn={() => Animated.spring(pressAnim, { toValue: 0.96, useNativeDriver: true, tension: 300 }).start()}
      onPressOut={() => Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true, tension: 300 }).start()}
    >
      <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
        <Image source={{ uri: room.thumbnail }} style={[G.img, { height: CARD_W * 1.3 }]} contentFit="cover" transition={150} />

        {/* Gradient overlay */}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={G.gradient} />

        {/* Top-left: category */}
        <View style={[G.catBadge, { backgroundColor: cat.color + 'CC' }]}>
          <Text style={{ fontSize: 9 }}>{cat.emoji}</Text>
          <Text style={G.catText}>{cat.label}</Text>
        </View>

        {/* TOP10 */}
        {room.isTop10 ? (
          <View style={G.top10Badge}>
            <Text style={G.top10Text}>🔥TOP</Text>
          </View>
        ) : null}

        {/* Region badge */}
        {room.regionBadge ? (
          <LinearGradient colors={['#F97316', '#EF4444']} style={G.regionBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={G.regionText}>🏅 {room.regionBadge}</Text>
          </LinearGradient>
        ) : null}

        {/* PK / Party badge */}
        {room.isPK ? (
          <View style={G.pkBadge}><Text style={G.pkText}>⚔️ PK</Text></View>
        ) : room.isParty ? (
          <View style={[G.pkBadge, { backgroundColor: Colors.secondary }]}><Text style={G.pkText}>🎉 Party</Text></View>
        ) : null}

        {/* First Recharge promo */}
        {room.isFirstRecharge ? (
          <View style={G.promoTag}><Text style={G.promoText}>First Recharge</Text></View>
        ) : null}

        {/* Bottom info */}
        <View style={G.bottom}>
          <Text style={G.hostName} numberOfLines={1}>{room.hostName || room.title}</Text>
          <View style={G.viewerRow}>
            <MaterialIcons name="signal-cellular-alt" size={10} color="rgba(255,255,255,0.8)" />
            <Text style={G.viewerCount}>{fmtNum(room.viewers)}</Text>
            {room.diamonds_earned > 0 && (
              <>
                <Text style={G.dot}>·</Text>
                <Text style={G.diamonds}>💎{fmtNum(room.diamonds_earned)}</Text>
              </>
            )}
          </View>
        </View>

        {/* LIVE button */}
        <View style={[G.liveBtn, room.isPK && { backgroundColor: Colors.live }]}>
          {room.isPK ? (
            <Text style={G.liveBtnText}>⚔️ PK</Text>
          ) : (
            <><View style={G.liveDot} /><Text style={G.liveBtnText}>LIVE</Text></>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ── Explore Video Item ──
function ExploreVideoItem({ item, isActive, onPress }: { item: any; isActive: boolean; onPress: () => void }) {
  const [liked, setLiked] = useState(false);
  const heartAnim = useRef(new Animated.Value(1)).current;
  const ITEM_H = height - 110;

  const triggerHeart = () => {
    setLiked(v => !v);
    Animated.sequence([
      Animated.spring(heartAnim, { toValue: 1.5, useNativeDriver: true, tension: 300 }),
      Animated.spring(heartAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Pressable style={{ width, height: ITEM_H, backgroundColor: '#000' }} onPress={onPress} onLongPress={() => {}}>
      <Image source={{ uri: item.thumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={100} />
      <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent']} style={VF.topGrad} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.88)']} style={VF.bottomGrad} />

      {item.fromFollowing ? (
        <View style={VF.followingTag}><Text style={VF.followingTagText}>From Following</Text></View>
      ) : null}

      {/* Actions right */}
      <View style={VF.actions}>
        <Pressable style={VF.actionItem} onPress={triggerHeart}>
          <Animated.View style={{ transform: [{ scale: heartAnim }] }}>
            <MaterialIcons name={liked ? 'favorite' : 'favorite-border'} size={32} color={liked ? '#FF4D6D' : '#FFF'} />
          </Animated.View>
          <Text style={VF.actionLabel}>{fmtNum(item.likes + (liked ? 1 : 0))}</Text>
        </Pressable>
        <Pressable style={VF.actionItem} onPress={onPress}>
          <MaterialIcons name="chat-bubble-outline" size={28} color="#FFF" />
          <Text style={VF.actionLabel}>{fmtNum(item.comments)}</Text>
        </Pressable>
        <Pressable style={VF.actionItem}>
          <Text style={{ fontSize: 28 }}>🎁</Text>
          <Text style={VF.actionLabel}>{fmtNum(item.gifts)}</Text>
        </Pressable>
        <Pressable style={VF.actionItem}>
          <MaterialIcons name="reply" size={28} color="#FFF" style={{ transform: [{ scaleX: -1 }] }} />
          <Text style={VF.actionLabel}>{fmtNum(item.shares)}</Text>
        </Pressable>
        <Pressable style={VF.actionItem}>
          <MaterialIcons name="bookmark-border" size={26} color="#FFF" />
        </Pressable>
      </View>

      {/* Bottom info */}
      <View style={VF.bottomInfo}>
        <View style={VF.userRow}>
          <View style={{ position: 'relative' }}>
            <Image source={{ uri: item.user.avatar }} style={VF.avatar} contentFit="cover" />
            {item.user.vip && (
              <View style={VF.vipBadge}><Text style={{ fontSize: 8, color: '#FFF' }}>⭐</Text></View>
            )}
          </View>
          <Text style={VF.userName}>{item.user.name}</Text>
          <Pressable style={VF.followBtn} onPress={onPress}>
            <Text style={VF.followBtnText}>+ Follow</Text>
          </Pressable>
        </View>
        <Text style={VF.caption} numberOfLines={2}>{item.caption}</Text>
        <View style={VF.musicRow}>
          <MaterialIcons name="music-note" size={12} color="rgba(255,255,255,0.8)" />
          <Text style={VF.musicText} numberOfLines={1}>Original Sound · @{item.user.name.split(' ')[0]}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ── Main Explore ──
export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const supabase = getSupabaseClient();

  const [activeTab, setActiveTab] = useState<FeedTab>('square');
  const [category, setCategory] = useState<Category>('all');
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const [rooms, setRooms] = useState<any[]>(FALLBACK_ROOMS);
  const [creators, setCreators] = useState<any[]>(MOCK_CREATORS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showChest, setShowChest] = useState(true);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const ITEM_H = height - 110;

  const TABS: { key: FeedTab; label: string }[] = [
    { key: 'following', label: 'Following' },
    { key: 'square', label: 'Square' },
    { key: 'video', label: 'Video' },
    { key: 'hot', label: 'Hot' },
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsRes, usersRes] = await Promise.all([
        fetchLiveRooms(),
        supabase.from('user_profiles').select('id, username, display_name, avatar_url, is_host, vip_level, followers, is_online').eq('is_host', true).order('followers', { ascending: false }).limit(10),
      ]);
      if (roomsRes.data && roomsRes.data.length > 0) {
        const mapped = roomsRes.data.map((r: any, i: number) => ({
          id: r.id, title: r.title,
          hostName: r.host?.display_name || r.host?.username || 'Host',
          thumbnail: r.thumbnail_url || FALLBACK_ROOMS[i % FALLBACK_ROOMS.length]?.thumbnail,
          hostAvatar: r.host?.avatar_url || '', viewers: r.viewers || 0,
          isPK: r.is_pk, isParty: r.is_party, category: r.stream_type || 'chatting',
          isTop10: i < 2, isFirstRecharge: false, regionBadge: i === 0 ? 'Region No.1' : '',
          diamonds_earned: r.diamonds_earned || 0,
        }));
        setRooms([...FALLBACK_ROOMS, ...mapped]);
      }
      if (usersRes.data && usersRes.data.length > 0) setCreators(usersRes.data as any[]);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'square' || activeTab === 'hot') loadData();
  }, [activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveVideoIdx(viewableItems[0].index ?? 0);
  }, []);

  const viewCfg = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const filteredRooms = (() => {
    let list = category === 'all' ? rooms : rooms.filter(r =>
      r.category?.includes(category) || (category === 'pk' && r.isPK)
    );
    if (search.trim()) list = list.filter(r =>
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.hostName?.toLowerCase().includes(search.toLowerCase())
    );
    return list;
  })();

  // ── Category Bar ──
  const CategoryBar = () => (
    <View style={{ height: 52, backgroundColor: '#FFF' }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={catS.container}>
        {CATEGORIES.map(cat => (
          <Pressable
            key={cat.key}
            style={[catS.chip, category === cat.key && { backgroundColor: cat.color, borderColor: cat.color }]}
            onPress={() => setCategory(cat.key)}
          >
            <Text style={{ fontSize: 13 }}>{cat.emoji}</Text>
            <Text style={[catS.chipText, category === cat.key && { color: '#FFF', fontWeight: FontWeight.bold }]}>{cat.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  // ── Honor + Activity banners ──
  const TopBanners = () => (
    <View style={bannerS.row}>
      <Pressable style={bannerS.card} onPress={() => router.push('/leaderboard')}>
        <LinearGradient colors={['#F97316', '#FBBF24']} style={bannerS.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={bannerS.newTag}><Text style={bannerS.newTagText}>NEW</Text></View>
          <Text style={bannerS.title}>Honor</Text>
          <Text style={bannerS.icon}>👑</Text>
        </LinearGradient>
      </Pressable>
      <Pressable style={bannerS.card} onPress={() => router.push('/activity-centre')}>
        <LinearGradient colors={['#3B82F6', '#8B5CF6']} style={bannerS.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={[bannerS.title, { fontSize: FontSize.sm }]}>Activity{'\n'}Centre</Text>
          <Text style={bannerS.icon}>⭐</Text>
        </LinearGradient>
      </Pressable>
      <Pressable style={bannerS.card} onPress={() => router.push('/daily-tasks')}>
        <LinearGradient colors={['#10B981', '#059669']} style={bannerS.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={bannerS.newTag}><Text style={bannerS.newTagText}>EARN</Text></View>
          <Text style={[bannerS.title, { fontSize: FontSize.sm }]}>Daily{'\n'}Tasks</Text>
          <Text style={bannerS.icon}>🎯</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  // ── Featured Creators ──
  const FeaturedCreators = () => (
    <View style={featS.section}>
      <View style={featS.header}>
        <Text style={featS.title}>✨ Featured Creators</Text>
        <Pressable onPress={() => router.push('/search')}><Text style={featS.seeAll}>See All</Text></Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, gap: 12, paddingBottom: 4 }}>
        {creators.map((c: any) => {
          const vip = Math.min(c.vip_level || 0, 5);
          return (
            <Pressable key={c.id} style={featS.card} onPress={() => router.push(`/user/${c.id}`)}>
              <View style={featS.avWrap}>
                <Image source={{ uri: c.avatar_url || '' }} style={[featS.av, vip > 0 && { borderColor: VIP_COLORS[vip] }]} contentFit="cover" />
                {c.is_online ? <View style={featS.onlineDot} /> : null}
                {c.is_live ? <View style={featS.liveBadge}><Text style={featS.liveBadgeText}>LIVE</Text></View> : null}
              </View>
              <Text style={featS.name} numberOfLines={1}>{c.display_name || c.username}</Text>
              <Text style={featS.fans}>{fmtNum(c.followers || 0)} fans</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  // ── Live Grid ──
  const LiveGrid = ({ showBanners }: { showBanners?: boolean }) => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {showBanners ? <TopBanners /> : null}
      <CategoryBar />
      {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} /> : null}
      <FeaturedCreators />

      <View style={{ paddingHorizontal: 16 }}>
        <View style={liveGridS.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.live }} />
            <Text style={liveGridS.headerTitle}>{filteredRooms.length} Live Rooms</Text>
          </View>
          <Pressable onPress={() => setShowSearch(v => !v)}>
            <MaterialIcons name="search" size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {showSearch ? (
          <View style={liveGridS.searchBar}>
            <MaterialIcons name="search" size={16} color={Colors.textMuted} />
            <TextInput
              style={liveGridS.searchInput}
              placeholder="Search rooms..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            {search ? <Pressable onPress={() => setSearch('')} hitSlop={8}><MaterialIcons name="close" size={16} color={Colors.textMuted} /></Pressable> : null}
          </View>
        ) : null}

        <View style={liveGridS.grid}>
          {filteredRooms.map(room => (
            <RoomCard key={room.id} room={room} onPress={() => router.push(`/live/${room.id}` as any)} />
          ))}
          {filteredRooms.length === 0 && !loading ? (
            <View style={liveGridS.empty}>
              <Text style={{ fontSize: 48 }}>📡</Text>
              <Text style={liveGridS.emptyText}>No {category !== 'all' ? category : ''} rooms right now</Text>
              <Pressable style={liveGridS.goLiveBtn} onPress={() => router.push('/go-live')}>
                <Text style={liveGridS.goLiveBtnText}>🔴 Start Live</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: activeTab === 'video' ? '#000' : '#F9FAFB' }}>
      {/* Header */}
      <SafeAreaView
        edges={['top']}
        style={[
          hdrS.safeArea,
          activeTab === 'video' && { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
        ]}
      >
        <View style={[hdrS.bar, activeTab === 'video' && hdrS.barTransparent]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={hdrS.tabsContainer}>
            {TABS.map(tab => (
              <Pressable key={tab.key} style={hdrS.tabItem} onPress={() => setActiveTab(tab.key)}>
                <Text style={[hdrS.tabText, activeTab === tab.key && (activeTab === 'video' ? hdrS.tabActiveWhite : hdrS.tabActive)]}>
                  {tab.label}
                </Text>
                {activeTab === tab.key ? (
                  <View style={[hdrS.tabLine, activeTab === 'video' && { backgroundColor: '#FFF' }]} />
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
          <View style={hdrS.actions}>
            <Pressable onPress={() => router.push('/search')} style={hdrS.actionBtn}>
              <MaterialIcons name="search" size={22} color={activeTab === 'video' ? '#FFF' : '#374151'} />
            </Pressable>
            <Pressable onPress={() => router.push('/go-live')} style={hdrS.actionBtn}>
              <MaterialIcons name={activeTab === 'video' ? 'photo-camera' : 'live-tv'} size={22} color={activeTab === 'video' ? '#FFF' : '#374151'} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* Video Tab */}
      {activeTab === 'video' ? (
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatRef}
            data={MOCK_VIDEOS}
            keyExtractor={v => v.id}
            renderItem={({ item, index }) => (
              <ExploreVideoItem item={item} isActive={index === activeVideoIdx} onPress={() => router.push('/reels')} />
            )}
            pagingEnabled
            snapToInterval={ITEM_H}
            snapToAlignment="start"
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewCfg}
            getItemLayout={(_, i) => ({ length: ITEM_H, offset: ITEM_H * i, index: i })}
          />
          {showChest ? (
            <View style={{ position: 'absolute', top: 80, right: 14, zIndex: 30 }}>
              <View style={{ position: 'relative' }}>
                <Pressable style={chestS.closeBtn} onPress={() => setShowChest(false)} hitSlop={6}>
                  <Text style={{ fontSize: 10, color: '#FFF' }}>✕</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/daily-tasks')}>
                  <Text style={{ fontSize: 44 }}>🎁</Text>
                  <View style={chestS.badge}><Text style={chestS.badgeText}>FREE</Text></View>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Square / Hot Tab */}
      {(activeTab === 'square' || activeTab === 'hot') ? (
        <LiveGrid showBanners={activeTab === 'square'} />
      ) : null}

      {/* Following Tab */}
      {activeTab === 'following' ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={followS.emptyCard}>
            <Text style={{ fontSize: 52 }}>🎬</Text>
            <Text style={followS.emptyTitle}>No content from following</Text>
            <Text style={followS.emptySub}>Follow creators to see their streams here</Text>
            <Pressable style={followS.discoverBtn} onPress={() => router.push('/search')}>
              <Text style={followS.discoverBtnText}>Discover Creators</Text>
            </Pressable>
          </View>
          <FeaturedCreators />
          <CategoryBar />
          <View style={{ paddingHorizontal: 16 }}>
            <View style={liveGridS.grid}>
              {FALLBACK_ROOMS.map(room => (
                <RoomCard key={room.id} room={room} onPress={() => router.push(`/live/${room.id}` as any)} />
              ))}
            </View>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

// ── Styles ──
const G = StyleSheet.create({
  card: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#E5E7EB', position: 'relative', marginBottom: CARD_GAP },
  img: { width: '100%' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },
  catBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  catText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.bold },
  top10Badge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(249,115,22,0.92)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 3 },
  top10Text: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  regionBadge: { position: 'absolute', top: 32, right: 8, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  regionText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.black },
  pkBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.live, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  pkText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  promoTag: { position: 'absolute', bottom: 36, left: 6, backgroundColor: '#F97316', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  promoText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.bold },
  bottom: { position: 'absolute', bottom: 30, left: 8, right: 56 },
  hostName: { color: '#FFF', fontSize: 11, fontWeight: FontWeight.bold, marginBottom: 2 },
  viewerRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewerCount: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: FontWeight.semibold },
  dot: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
  diamonds: { color: '#FFD700', fontSize: 10, fontWeight: FontWeight.semibold },
  liveBtn: { position: 'absolute', bottom: 30, right: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 7, paddingVertical: 4 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFF' },
  liveBtnText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
});

const VF = StyleSheet.create({
  topGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 130 },
  bottomGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 300 },
  followingTag: { position: 'absolute', top: 120, left: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  followingTagText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '500' },
  actions: { position: 'absolute', right: 12, bottom: 110, gap: 20, alignItems: 'center' },
  actionItem: { alignItems: 'center', gap: 4 },
  actionLabel: { color: '#FFF', fontSize: 12, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  bottomInfo: { position: 'absolute', bottom: 12, left: 14, right: 72 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#FFF' },
  vipBadge: { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFB800', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFF' },
  userName: { color: '#FFF', fontSize: 14, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3, flex: 1 },
  followBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  followBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  caption: { color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 18, marginBottom: 6 },
  musicRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  musicText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, maxWidth: width * 0.5 },
});

const hdrS = StyleSheet.create({
  safeArea: { backgroundColor: '#FFF' },
  bar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', height: 48 },
  barTransparent: { backgroundColor: 'transparent', borderBottomWidth: 0 },
  tabsContainer: { paddingLeft: 8, gap: 4, alignItems: 'center' },
  tabItem: { paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', position: 'relative' },
  tabText: { fontSize: 15, color: '#9CA3AF', fontWeight: '500' },
  tabActive: { color: '#111827', fontWeight: '700', fontSize: 16 },
  tabActiveWhite: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  tabLine: { position: 'absolute', bottom: 0, width: '80%', height: 2.5, backgroundColor: '#111827', borderRadius: 2 },
  actions: { flexDirection: 'row', paddingRight: 4 },
  actionBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});

const catS = StyleSheet.create({
  container: { paddingHorizontal: 16, gap: 8, alignItems: 'center', height: 52 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  chipText: { color: '#6B7280', fontSize: 12, fontWeight: '500' },
});

const bannerS = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: 10, marginBottom: 6 },
  card: { flex: 1, height: 76, borderRadius: 12, overflow: 'hidden' },
  grad: { flex: 1, padding: 12, position: 'relative', justifyContent: 'center' },
  newTag: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, alignSelf: 'flex-start', marginBottom: 3 },
  newTagText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.black, letterSpacing: 1 },
  title: { color: '#FFF', fontSize: FontSize.lg, fontWeight: FontWeight.black, lineHeight: 22 },
  icon: { fontSize: 28, position: 'absolute', right: 8, bottom: 6 },
});

const featS = StyleSheet.create({
  section: { paddingBottom: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  title: { color: '#111827', fontSize: 15, fontWeight: FontWeight.bold },
  seeAll: { color: Colors.primary, fontSize: 13, fontWeight: FontWeight.medium },
  card: { width: 80, alignItems: 'center', gap: 5 },
  avWrap: { position: 'relative' },
  av: { width: 60, height: 60, borderRadius: 30, borderWidth: 2.5, borderColor: Colors.primary },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 13, height: 13, borderRadius: 7, backgroundColor: Colors.success, borderWidth: 2, borderColor: '#FFF' },
  liveBadge: { position: 'absolute', bottom: -5, left: '50%', transform: [{ translateX: -15 }], backgroundColor: Colors.live, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  liveBadgeText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.black },
  name: { color: '#111827', fontSize: 10, fontWeight: FontWeight.semibold, textAlign: 'center' },
  fans: { color: '#9CA3AF', fontSize: 9, textAlign: 'center' },
});

const liveGridS = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  headerTitle: { color: '#111827', fontSize: 14, fontWeight: FontWeight.bold },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, gap: 8, marginBottom: 10 },
  searchInput: { flex: 1, color: '#111827', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },
  empty: { width: '100%', alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { color: '#9CA3AF', fontSize: 15, fontWeight: '500', textAlign: 'center' },
  goLiveBtn: { backgroundColor: Colors.live, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 10 },
  goLiveBtnText: { color: '#FFF', fontSize: 14, fontWeight: FontWeight.bold },
});

const followS = StyleSheet.create({
  emptyCard: { alignItems: 'center', padding: 32, gap: 8, backgroundColor: '#FFF', margin: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  emptyTitle: { color: '#1F2937', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptySub: { color: '#6B7280', fontSize: 13, textAlign: 'center' },
  discoverBtn: { backgroundColor: Colors.primary, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 10, marginTop: 8 },
  discoverBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});

const chestS = StyleSheet.create({
  closeBtn: { position: 'absolute', top: -4, right: -4, zIndex: 5, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', bottom: -4, left: '50%', transform: [{ translateX: -18 }], backgroundColor: Colors.live, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.black },
});
