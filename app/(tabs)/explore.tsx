// SashLive — Discover/Video Feed with Complete Explore Grid + Real Filters + Live Data
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions,
  FlatList, ScrollView, Animated, ActivityIndicator, RefreshControl,
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

type FeedTab = 'following' | 'square' | 'video' | 'hot';
type CategoryFilter = 'all' | 'chatting' | 'singing' | 'esports' | 'dancing' | 'makefriendes' | 'pk';

const CATEGORIES: { key: CategoryFilter; label: string; emoji: string; color: string }[] = [
  { key: 'all',         label: 'All',         emoji: '✨', color: '#6366F1' },
  { key: 'chatting',    label: 'Chatting',    emoji: '😎', color: '#FF6B9D' },
  { key: 'esports',     label: 'Esports',     emoji: '🎮', color: '#60A5FA' },
  { key: 'singing',     label: 'Singing',     emoji: '🎤', color: '#A78BFA' },
  { key: 'dancing',     label: 'Dancing',     emoji: '💃', color: '#EC4899' },
  { key: 'makefriendes',label: 'Friends',     emoji: '💞', color: '#F97316' },
  { key: 'pk',          label: 'PK',          emoji: '⚔️', color: '#EF4444' },
];

// ── Mock Video data ──
const MOCK_VIDEOS = [
  { id: 'v1', thumbnail: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600&h=900&fit=crop', user: { name: '🌟 sweet poison🔥', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop', isVip: true }, likes: 1, comments: 0, gifts: 0, shares: 0, caption: 'তাহলে আপনি আমার কি হবেন', fromFollowing: true },
  { id: 'v2', thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=900&fit=crop', user: { name: 'CosmicRider 🎤', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop', isVip: false }, likes: 48, comments: 5, gifts: 3, shares: 2, caption: 'Night vibes only 🌙✨', fromFollowing: false },
  { id: 'v3', thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=900&fit=crop', user: { name: 'StarKing 👑', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop', isVip: true }, likes: 234, comments: 19, gifts: 12, shares: 8, caption: 'Dance challenge time! 💃🎶', fromFollowing: true },
  { id: 'v4', thumbnail: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=600&h=900&fit=crop', user: { name: 'RoseQueen 🌹', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop', isVip: false }, likes: 567, comments: 44, gifts: 28, shares: 15, caption: 'Good morning everyone 🌸', fromFollowing: false },
  { id: 'v5', thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=900&fit=crop', user: { name: 'NightOwl 🦉', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop', isVip: true }, likes: 1203, comments: 88, gifts: 55, shares: 32, caption: 'Party never stops 🎉🔥', fromFollowing: true },
];

const FALLBACK_ROOMS = [
  { id: 'room001', title: 'Good Morning💯 🇧🇩', hostName: 'Morning Star', thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=400&fit=crop', hostAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&fit=crop', viewers: 144, isPK: false, category: 'esports', isTop10: false, isFirstRecharge: false, regionBadge: '' },
  { id: 'room002', title: '+♥——A N... 🇧🇩', hostName: 'A N', thumbnail: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=300&h=400&fit=crop', hostAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&fit=crop', viewers: 87, isPK: false, category: 'chatting', isTop10: false, isFirstRecharge: false, regionBadge: '' },
  { id: 'room003', title: 'উইন 1650 টাকা 🇧🇩', hostName: 'Win 1650', thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&h=400&fit=crop', hostAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&fit=crop', viewers: 141, isPK: false, category: 'chatting', isTop10: false, isFirstRecharge: false, regionBadge: '' },
  { id: 'room004', title: 'Sinthiya Parvin 🇧🇩', hostName: 'Sinthiya', thumbnail: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=300&h=400&fit=crop', hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop', viewers: 11, isPK: false, category: 'singing', isTop10: true, isFirstRecharge: false, regionBadge: '' },
  { id: 'room005', title: 'Make Friends 😊', hostName: 'Friends', thumbnail: 'https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=300&h=400&fit=crop', hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop', viewers: 78, isPK: false, category: 'makefriendes', isTop10: false, isFirstRecharge: false, regionBadge: '' },
  { id: 'room006', title: 'Esports Challenge 🎮', hostName: 'Gamer Pro', thumbnail: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=300&h=400&fit=crop', hostAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&fit=crop', viewers: 432, isPK: true, category: 'esports', isTop10: false, isFirstRecharge: true, regionBadge: '' },
  { id: 'room007', title: 'Dance Party 💃', hostName: 'Dance King', thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&h=400&fit=crop', hostAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&fit=crop', viewers: 319, isPK: false, category: 'dancing', isTop10: false, isFirstRecharge: false, regionBadge: 'Region No.1' },
  { id: 'room008', title: 'Singing Battle 🎤', hostName: 'Voice Star', thumbnail: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=400&fit=crop', hostAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&fit=crop', viewers: 220, isPK: true, category: 'singing', isTop10: true, isFirstRecharge: false, regionBadge: '' },
];

// ── Video Item ──
function VideoItem({ item, isActive, onPress }: { item: typeof MOCK_VIDEOS[0]; isActive: boolean; onPress: () => void }) {
  const [liked, setLiked] = useState(false);
  const heartAnim = useRef(new Animated.Value(1)).current;
  const ITEM_H = height - 120;

  const triggerHeart = () => {
    setLiked(v => !v);
    Animated.sequence([
      Animated.spring(heartAnim, { toValue: 1.4, useNativeDriver: true }),
      Animated.spring(heartAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

  return (
    <View style={{ width, height: ITEM_H, backgroundColor: '#000', position: 'relative' }}>
      <Image source={{ uri: item.thumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={100} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={vidS.bottomGrad} />
      <LinearGradient colors={['rgba(0,0,0,0.45)', 'transparent']} style={vidS.topGrad} />

      {item.fromFollowing ? (
        <View style={vidS.fromLabel}><Text style={vidS.fromText}>From following</Text></View>
      ) : null}

      <Pressable style={vidS.fullScreenBtn} onPress={onPress}>
        <MaterialIcons name="crop-free" size={16} color="#FFF" />
        <Text style={vidS.fullScreenText}>Full Screen</Text>
      </Pressable>

      <View style={vidS.actions}>
        <Pressable style={vidS.actionItem} onPress={triggerHeart}>
          <Animated.View style={{ transform: [{ scale: heartAnim }] }}>
            <MaterialIcons name={liked ? 'favorite' : 'favorite-border'} size={32} color={liked ? '#FF4D6D' : '#FFF'} />
          </Animated.View>
          <Text style={vidS.actionCount}>{fmtNum(item.likes + (liked ? 1 : 0))}</Text>
        </Pressable>
        <Pressable style={vidS.actionItem}>
          <MaterialIcons name="chat-bubble" size={28} color="#FFF" />
          <Text style={vidS.actionCount}>{fmtNum(item.comments)}</Text>
        </Pressable>
        <Pressable style={vidS.actionItem}>
          <Text style={{ fontSize: 28 }}>🎁</Text>
          <Text style={vidS.actionCount}>{fmtNum(item.gifts)}</Text>
        </Pressable>
        <Pressable style={vidS.actionItem}>
          <MaterialIcons name="reply" size={30} color="#FFF" style={{ transform: [{ scaleX: -1 }] }} />
          <Text style={vidS.actionCount}>{fmtNum(item.shares)}</Text>
        </Pressable>
      </View>

      <View style={vidS.bottomInfo}>
        <View style={vidS.userRow}>
          <View style={vidS.avatarWrap}>
            <Image source={{ uri: item.user.avatar }} style={vidS.avatar} contentFit="cover" />
            {item.user.isVip ? <View style={vidS.vipDot}><Text style={{ fontSize: 7, color: '#FFF' }}>⭐</Text></View> : null}
          </View>
          <Text style={vidS.userName}>{item.user.name}</Text>
        </View>
        <Text style={vidS.caption} numberOfLines={2}>{item.caption}</Text>
      </View>
    </View>
  );
}

const vidS = StyleSheet.create({
  bottomGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 280 },
  topGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  fromLabel: { position: 'absolute', bottom: 100, left: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  fromText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500' },
  fullScreenBtn: { position: 'absolute', bottom: 155, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  fullScreenText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  actions: { position: 'absolute', right: 12, bottom: 100, gap: 18, alignItems: 'center' },
  actionItem: { alignItems: 'center', gap: 4 },
  actionCount: { color: '#FFF', fontSize: 12, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  bottomInfo: { position: 'absolute', bottom: 16, left: 16, right: 70 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: '#FFF' },
  vipDot: { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFB800', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFF' },
  userName: { color: '#FFF', fontSize: 14, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  caption: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 18 },
});

// ── Grid Room Card ──
function GridRoomCard({ room, onPress }: { room: any; onPress: () => void }) {
  const CARD_W = (width - Spacing.md * 2 - Spacing.sm) / 2;
  const cat = CATEGORIES.find(c => c.key === room.category?.toLowerCase()) || CATEGORIES[1];

  return (
    <Pressable style={[gridS.card, { width: CARD_W }]} onPress={onPress}>
      <Image source={{ uri: room.thumbnail }} style={[gridS.img, { height: CARD_W * 1.25 }]} contentFit="cover" transition={150} />
      {/* Category overlay */}
      <View style={[gridS.catBadge, { backgroundColor: cat.color + '99' }]}>
        <Text style={{ fontSize: 9 }}>{cat.emoji}</Text>
        <Text style={gridS.catBadgeText}>{cat.label}</Text>
      </View>
      {/* Region badge */}
      {room.regionBadge ? (
        <LinearGradient colors={['#F97316', '#EF4444']} style={gridS.regionBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text style={gridS.regionText}>🏅 {room.regionBadge}</Text>
        </LinearGradient>
      ) : null}
      {/* TOP10 badge */}
      {room.isTop10 ? (
        <View style={gridS.top10Badge}>
          <Text style={gridS.top10Text}>🔥 TOP10</Text>
          <Text style={gridS.top10Sub}>⏰ Hourly</Text>
        </View>
      ) : null}
      {/* PK badge */}
      {room.isPK ? <View style={gridS.pkBadge}><Text style={gridS.pkText}>⚔️ PK</Text></View> : null}
      {/* Bottom overlay */}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={gridS.bottomGrad}>
        <Text style={gridS.hostName} numberOfLines={1}>{room.hostName || room.title}</Text>
        <View style={gridS.bottomRow}>
          <MaterialIcons name="signal-cellular-alt" size={10} color="rgba(255,255,255,0.75)" />
          <Text style={gridS.viewCount}>{room.viewers}</Text>
        </View>
      </LinearGradient>
      {/* First Recharge */}
      {room.isFirstRecharge ? (
        <View style={gridS.firstRecharge}><Text style={gridS.firstRechargeText}>First Recharge</Text></View>
      ) : null}
      {/* LIVE/PK button */}
      <View style={[gridS.liveCta, room.isPK && { backgroundColor: Colors.live }]}>
        {room.isPK ? <Text style={gridS.liveCtaText}>⚔️ PK</Text> : (
          <><View style={gridS.liveDot} /><Text style={gridS.liveCtaText}>LIVE</Text></>
        )}
      </View>
    </Pressable>
  );
}

const gridS = StyleSheet.create({
  card: { borderRadius: BorderRadius.lg, overflow: 'hidden', backgroundColor: '#F3F4F6', position: 'relative', marginBottom: Spacing.sm },
  img: { width: '100%' },
  catBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  catBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.bold },
  regionBadge: { position: 'absolute', top: 8, right: 8, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  regionText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.black },
  top10Badge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(249,115,22,0.9)', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 3, alignItems: 'center' },
  top10Text: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  top10Sub: { color: 'rgba(255,255,255,0.85)', fontSize: 7 },
  pkBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.live, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  pkText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  bottomGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8, paddingTop: 24 },
  hostName: { color: '#FFF', fontSize: 11, fontWeight: FontWeight.bold, marginBottom: 2 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewCount: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: FontWeight.semibold },
  firstRecharge: { position: 'absolute', bottom: 34, right: 6, backgroundColor: '#F97316', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  firstRechargeText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.bold },
  liveCta: { position: 'absolute', bottom: 34, right: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FF2E8B', borderRadius: 12, paddingHorizontal: 7, paddingVertical: 4 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFF' },
  liveCtaText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
});

// ── Main Explore Screen ──
export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const supabase = getSupabaseClient();

  const [activeTab, setActiveTab] = useState<FeedTab>('video');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const [showChest, setShowChest] = useState(true);
  const [liveRooms, setLiveRooms] = useState<any[]>(FALLBACK_ROOMS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [featuredCreators, setFeaturedCreators] = useState<any[]>([]);
  const flatRef = useRef<FlatList>(null);

  const ITEM_H = height - 120;

  const TABS: { key: FeedTab; label: string }[] = [
    { key: 'following', label: 'Following' },
    { key: 'square',    label: 'Square' },
    { key: 'video',     label: 'Video' },
    { key: 'hot',       label: 'Hot' },
  ];

  useEffect(() => {
    if (activeTab === 'square' || activeTab === 'hot') loadLiveData();
  }, [activeTab, activeCategory]);

  const loadLiveData = async () => {
    setLoading(true);
    const [roomsRes, usersRes] = await Promise.all([
      fetchLiveRooms(),
      supabase.from('user_profiles').select('id, username, display_name, avatar_url, is_host, vip_level, followers, is_online').eq('is_host', true).order('followers', { ascending: false }).limit(10),
    ]);
    if (roomsRes.data && roomsRes.data.length > 0) {
      const mapped = roomsRes.data.map((r: any, i: number) => ({
        id: r.id,
        title: r.title,
        hostName: r.host?.display_name || r.host?.username || 'Host',
        thumbnail: r.thumbnail_url || FALLBACK_ROOMS[i % FALLBACK_ROOMS.length]?.thumbnail,
        hostAvatar: r.host?.avatar_url || '',
        viewers: r.viewers || 0,
        isPK: r.is_pk,
        category: r.stream_type || 'chatting',
        isTop10: i < 2,
        isFirstRecharge: false,
        regionBadge: i === 0 ? 'Region No.1' : '',
      }));
      setLiveRooms([...FALLBACK_ROOMS, ...mapped]);
    }
    if (usersRes.data) setFeaturedCreators(usersRes.data);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLiveData();
    setRefreshing(false);
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveVideoIdx(viewableItems[0].index ?? 0);
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const filteredRooms = activeCategory === 'all'
    ? liveRooms
    : liveRooms.filter(r => r.category?.toLowerCase().includes(activeCategory) || (activeCategory === 'pk' && r.isPK));

  // ── Category Chips ──
  const CategoryBar = () => (
    <View style={{ height: 48 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.xs, alignItems: 'center', height: 48 }}
      >
        {CATEGORIES.map(cat => (
          <Pressable
            key={cat.key}
            style={[chipS.chip, activeCategory === cat.key && { backgroundColor: cat.color, borderColor: cat.color }]}
            onPress={() => setActiveCategory(cat.key)}
          >
            <Text style={{ fontSize: 12 }}>{cat.emoji}</Text>
            <Text style={[chipS.chipText, activeCategory === cat.key && { color: '#FFF', fontWeight: FontWeight.bold }]}>{cat.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  // ── Honor + Activity Centre banners ──
  const TopBanners = () => (
    <View style={featS.bannerRow}>
      <Pressable style={featS.honorCard} onPress={() => router.push('/leaderboard')}>
        <LinearGradient colors={['#F97316', '#FBBF24']} style={featS.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={featS.newBadge}><Text style={featS.newBadgeText}>NEW</Text></View>
          <Text style={featS.honorTitle}>Honor</Text>
          <Text style={{ fontSize: 32, position: 'absolute', right: 8, bottom: 6 }}>👑</Text>
        </LinearGradient>
      </Pressable>
      <Pressable style={featS.honorCard} onPress={() => router.push('/activity-centre')}>
        <LinearGradient colors={['#3B82F6', '#8B5CF6']} style={featS.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={featS.actTitle}>Activity{'\n'}Centre</Text>
          <Text style={{ fontSize: 30, position: 'absolute', right: 8, bottom: 6 }}>⭐</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  // ── Featured Creators strip ──
  const FeaturedCreators = () => {
    const creators = featuredCreators.length > 0 ? featuredCreators : [
      { id: 'fc1', display_name: 'Galaxy Girl', username: 'galaxygirl', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&fit=crop', vip_level: 5, is_online: true, followers: 45000 },
      { id: 'fc2', display_name: 'Dragon Fire', username: 'dragonfire', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop', vip_level: 3, is_online: true, followers: 23000 },
      { id: 'fc3', display_name: 'Rose Queen', username: 'rosequeen', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop', vip_level: 5, is_online: false, followers: 61000 },
      { id: 'fc4', display_name: 'Cosmic Star', username: 'cosmicstar', avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&fit=crop', vip_level: 4, is_online: true, followers: 18000 },
      { id: 'fc5', display_name: 'Moonlight', username: 'moonlight', avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&fit=crop', vip_level: 2, is_online: false, followers: 9000 },
    ];
    const vipColors = ['', '#CD7F32', '#C0C0C0', '#FFCC00', '#00DFFF', '#FF2E8B'];
    return (
      <View style={featS.creatorSection}>
        <View style={featS.sectionHeader}>
          <Text style={featS.sectionTitle}>✨ Featured Creators</Text>
          <Pressable onPress={() => router.push('/search')}><Text style={featS.seeAll}>See All</Text></Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xs }}>
          {creators.map((c: any) => (
            <Pressable key={c.id} style={featS.creatorCard} onPress={() => router.push(`/user/${c.id}`)}>
              <View style={featS.creatorAvWrap}>
                <Image source={{ uri: c.avatar_url || '' }} style={[featS.creatorAv, c.vip_level > 0 && { borderColor: vipColors[Math.min(c.vip_level, 5)] }]} contentFit="cover" />
                {c.is_online ? <View style={featS.onlineDot} /> : null}
              </View>
              <Text style={featS.creatorName} numberOfLines={1}>{c.display_name || c.username}</Text>
              <Text style={featS.creatorFollowers}>{c.followers >= 1000 ? `${(c.followers / 1000).toFixed(1)}K` : c.followers} fans</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  // ── Grid/Square content ──
  const SquareContent = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <TopBanners />
      <CategoryBar />
      {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} /> : null}
      {/* Featured creators */}
      <FeaturedCreators />
      {/* Live rooms grid */}
      <View style={{ paddingHorizontal: Spacing.md }}>
        <View style={featS.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.live }} />
            <Text style={featS.sectionTitle}>{filteredRooms.length} Live Rooms</Text>
          </View>
        </View>
        <View style={gridLayoutS.grid}>
          {filteredRooms.map(room => (
            <GridRoomCard key={room.id} room={room} onPress={() => router.push(`/live/${room.id}` as any)} />
          ))}
          {filteredRooms.length === 0 && !loading && (
            <View style={gridLayoutS.empty}>
              <Text style={{ fontSize: 40 }}>📡</Text>
              <Text style={gridLayoutS.emptyText}>No {activeCategory !== 'all' ? activeCategory : ''} rooms right now</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: activeTab === 'video' ? '#000' : '#F9FAFB' }}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: activeTab === 'video' ? 'transparent' : '#FFF', zIndex: 10, position: activeTab === 'video' ? 'absolute' : 'relative', top: 0, left: 0, right: 0 }}>
        <View style={[hdrS.bar, activeTab === 'video' && hdrS.barDark]}>
          <View style={hdrS.tabs}>
            {TABS.map(tab => (
              <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={hdrS.tabItem}>
                <Text style={[hdrS.tabText, activeTab === tab.key && (activeTab === 'video' ? hdrS.tabTextActiveWhite : hdrS.tabTextActive)]}>
                  {tab.label}
                </Text>
                {activeTab === tab.key ? <View style={[hdrS.tabLine, activeTab === 'video' && { backgroundColor: '#FFF' }]} /> : null}
              </Pressable>
            ))}
          </View>
          <View style={hdrS.right}>
            <Pressable onPress={() => router.push('/search')} style={hdrS.iconBtn}>
              <MaterialIcons name="search" size={24} color={activeTab === 'video' ? '#FFF' : '#374151'} />
            </Pressable>
            {activeTab === 'video' ? (
              <Pressable onPress={() => router.push('/go-live')} style={hdrS.iconBtn}>
                <MaterialIcons name="photo-camera" size={24} color="#FFF" />
              </Pressable>
            ) : (
              <Pressable onPress={() => router.push('/go-live')} style={hdrS.iconBtn}>
                <MaterialIcons name="live-tv" size={24} color="#374151" />
              </Pressable>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Content */}
      {activeTab === 'video' && (
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatRef}
            data={MOCK_VIDEOS}
            keyExtractor={v => v.id}
            renderItem={({ item, index }) => (
              <VideoItem
                item={item}
                isActive={index === activeVideoIdx}
                onPress={() => router.push('/reels')}
              />
            )}
            pagingEnabled
            snapToInterval={ITEM_H}
            snapToAlignment="start"
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(_, index) => ({ length: ITEM_H, offset: ITEM_H * index, index })}
            style={{ flex: 1 }}
          />
          {showChest ? (
            <View style={{ position: 'absolute', top: 70, right: 14, zIndex: 30 }}>
              <View style={{ alignItems: 'center', position: 'relative' }}>
                <Pressable style={{ position: 'absolute', top: -4, right: -4, zIndex: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowChest(false)} hitSlop={6}>
                  <Text style={{ fontSize: 10, color: '#FFF' }}>✕</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/daily-tasks')}>
                  <Text style={{ fontSize: 42 }}>🎁</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      )}

      {(activeTab === 'square' || activeTab === 'hot') && <SquareContent />}

      {activeTab === 'following' && (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={folS.emptyWrap}>
            <Text style={{ fontSize: 52 }}>🎬</Text>
            <Text style={folS.emptyTitle}>No videos from following yet</Text>
            <Text style={folS.emptySub}>Follow creators to see their latest videos here</Text>
            <Pressable style={folS.discBtn} onPress={() => router.push('/search')}>
              <Text style={folS.discBtnText}>Discover Creators</Text>
            </Pressable>
          </View>
          <FeaturedCreators />
          <CategoryBar />
          <View style={{ paddingHorizontal: Spacing.md }}>
            <View style={gridLayoutS.grid}>
              {FALLBACK_ROOMS.map(room => (
                <GridRoomCard key={room.id} room={room} onPress={() => router.push(`/live/${room.id}` as any)} />
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const hdrS = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', height: 48 },
  barDark: { backgroundColor: 'transparent', borderBottomWidth: 0 },
  tabs: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  tabItem: { paddingHorizontal: 12, paddingVertical: 8, position: 'relative', alignItems: 'center' },
  tabText: { fontSize: 15, color: 'rgba(150,150,150,0.9)', fontWeight: '500' },
  tabTextActive: { color: '#1F2937', fontWeight: '700', fontSize: 16 },
  tabTextActiveWhite: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  tabLine: { position: 'absolute', bottom: 0, width: '80%', height: 2.5, backgroundColor: '#1F2937', borderRadius: 2 },
  right: { flexDirection: 'row', alignItems: 'center', paddingRight: 4 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});

const chipS = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  chipText: { color: '#6B7280', fontSize: 12, fontWeight: '500' },
});

const featS = StyleSheet.create({
  bannerRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  honorCard: { flex: 1, height: 78, borderRadius: BorderRadius.lg, overflow: 'hidden', position: 'relative' },
  grad: { flex: 1, padding: Spacing.md, position: 'relative' },
  newBadge: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 3 },
  newBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 1 },
  honorTitle: { color: '#FFF', fontSize: FontSize.xl, fontWeight: FontWeight.black },
  actTitle: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold, lineHeight: 20 },
  creatorSection: { paddingBottom: Spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  sectionTitle: { color: '#111827', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  seeAll: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  creatorCard: { width: 76, alignItems: 'center', gap: 4 },
  creatorAvWrap: { position: 'relative' },
  creatorAv: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: Colors.primary },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: '#FFF' },
  creatorName: { color: '#111827', fontSize: 10, fontWeight: FontWeight.semibold, textAlign: 'center' },
  creatorFollowers: { color: '#9CA3AF', fontSize: 9, textAlign: 'center' },
});

const gridLayoutS = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  empty: { width: '100%', alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { color: '#9CA3AF', fontSize: FontSize.sm, textAlign: 'center' },
});

const folS = StyleSheet.create({
  emptyWrap: { alignItems: 'center', padding: 32, gap: 8, backgroundColor: '#FFF', margin: Spacing.md, borderRadius: BorderRadius.lg },
  emptyTitle: { color: '#1F2937', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptySub: { color: '#6B7280', fontSize: 13, textAlign: 'center' },
  discBtn: { backgroundColor: Colors.primary, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 10, marginTop: 8 },
  discBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
