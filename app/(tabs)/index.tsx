// SashLive — Home Feed (PoppoLive Style: Following/Popular/Party/Explore tabs)
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Dimensions, Animated, RefreshControl, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { MOCK_USERS } from '@/services/mockData';
import { fetchLiveRooms } from '@/services/liveRoomService';

// ── Stories row data ──
const STORIES_DATA = [
  { id: 'my', isMe: true, name: 'My Story', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', isLive: false, hasNew: false },
  { id: 'u007', isMe: false, name: 'Galaxy', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop', isLive: true, hasNew: true },
  { id: 'u005', isMe: false, name: 'Cosmic', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop', isLive: true, hasNew: true },
  { id: 'u009', isMe: false, name: 'RoseQ', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', isLive: false, hasNew: true },
  { id: 'u002', isMe: false, name: 'Dragon', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', isLive: false, hasNew: true },
  { id: 'u006', isMe: false, name: 'Neon', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', isLive: true, hasNew: true },
  { id: 'u003', isMe: false, name: 'Moon', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', isLive: false, hasNew: false },
  { id: 'u008', isMe: false, name: 'StarK', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop', isLive: false, hasNew: true },
];

function StoriesRow() {
  const router = useRouter();
  return (
    <View style={storyS.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={storyS.scroll}>
        {STORIES_DATA.map(story => (
          <Pressable
            key={story.id}
            style={storyS.item}
            onPress={() => {
              if (story.isMe) return;
              if (story.isLive) router.push(`/live/${story.id}` as any);
              else router.push(`/stories?userId=${story.id}` as any);
            }}
          >
            <View style={[storyS.ring, story.isLive ? storyS.ringLive : story.hasNew ? storyS.ringNew : storyS.ringEmpty]}>
              <View style={storyS.avatarWrap}>
                <Image source={{ uri: story.avatar }} style={storyS.avatar} contentFit="cover" />
                {story.isLive && (
                  <View style={storyS.liveBadge}>
                    <Text style={storyS.liveBadgeText}>LIVE</Text>
                  </View>
                )}
                {story.isMe && (
                  <View style={storyS.addBtn}>
                    <MaterialIcons name="add" size={10} color="#FFF" />
                  </View>
                )}
              </View>
            </View>
            <Text style={storyS.name} numberOfLines={1}>{story.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
const storyS = StyleSheet.create({
  wrap: { backgroundColor: '#FFF', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  scroll: { paddingHorizontal: Spacing.md, gap: Spacing.md },
  item: { alignItems: 'center', gap: 5, width: 64 },
  ring: { width: 62, height: 62, borderRadius: 31, padding: 2, alignItems: 'center', justifyContent: 'center' },
  ringLive: { borderWidth: 2.5, borderColor: Colors.live },
  ringNew: { borderWidth: 2.5, borderColor: Colors.primary },
  ringEmpty: { borderWidth: 2, borderColor: '#E5E7EB' },
  avatarWrap: { width: 54, height: 54, borderRadius: 27, overflow: 'hidden', backgroundColor: '#F3F4F6', position: 'relative' },
  avatar: { width: '100%', height: '100%' },
  liveBadge: { position: 'absolute', bottom: 0, alignSelf: 'center', backgroundColor: Colors.live, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  liveBadgeText: { color: '#FFF', fontSize: 7, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  addBtn: { position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFF' },
  name: { color: '#374151', fontSize: 10, fontWeight: FontWeight.medium, width: '100%', textAlign: 'center' },
});

// ── Short Videos Row data ──
const SHORT_VIDEOS = [
  { id: 'sv1', thumb: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=200&h=320&fit=crop', user: 'Nahar', avatar: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=60&h=60&fit=crop', likes: '12.4K', views: '48K' },
  { id: 'sv2', thumb: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=200&h=320&fit=crop', user: 'GalaxyG', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60&h=60&fit=crop', likes: '8.1K', views: '32K' },
  { id: 'sv3', thumb: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&h=320&fit=crop', user: 'DragonF', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop', likes: '5.6K', views: '21K' },
  { id: 'sv4', thumb: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=320&fit=crop', user: 'Cosmic', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=60&h=60&fit=crop', likes: '3.2K', views: '15K' },
  { id: 'sv5', thumb: 'https://images.unsplash.com/photo-1574155376612-bfa4ed8c7a9c?w=200&h=320&fit=crop', user: 'RoseQ', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&h=60&fit=crop', likes: '9.8K', views: '44K' },
];

function ShortVideosRow() {
  const router = useRouter();
  return (
    <View style={svS.wrap}>
      <View style={svS.header}>
        <View style={svS.headerLeft}>
          <MaterialIcons name="play-circle-filled" size={18} color={Colors.primary} />
          <Text style={svS.title}>Short Videos</Text>
        </View>
        <Pressable onPress={() => router.push('/reels' as any)} style={svS.seeAllBtn}>
          <Text style={svS.seeAll}>See All</Text>
          <MaterialIcons name="chevron-right" size={16} color={Colors.primary} />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={svS.scroll}>
        {SHORT_VIDEOS.map(v => (
          <Pressable key={v.id} style={svS.card} onPress={() => router.push('/reels' as any)}>
            <Image source={{ uri: v.thumb }} style={svS.thumb} contentFit="cover" />
            <View style={svS.overlay}>
              <View style={svS.playBtn}>
                <MaterialIcons name="play-arrow" size={18} color="#FFF" />
              </View>
              <View style={svS.statsRow}>
                <Text style={svS.stat}>❤️ {v.likes}</Text>
                <Text style={svS.stat}>👁 {v.views}</Text>
              </View>
            </View>
            <View style={svS.userRow}>
              <Image source={{ uri: v.avatar }} style={svS.userAv} contentFit="cover" />
              <Text style={svS.userName} numberOfLines={1}>{v.user}</Text>
            </View>
          </Pressable>
        ))}
        {/* See More card */}
        <Pressable style={[svS.card, svS.moreCard]} onPress={() => router.push('/reels' as any)}>
          <LinearGradient colors={[Colors.primary, Colors.secondary]} style={svS.moreGrad}>
            <MaterialIcons name="play-circle-outline" size={32} color="#FFF" />
            <Text style={svS.moreText}>More{'\n'}Videos</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </View>
  );
}
const svS = StyleSheet.create({
  wrap: { backgroundColor: '#FFF', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: Spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  title: { color: '#1F2937', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAll: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  scroll: { paddingHorizontal: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xs },
  card: { width: 100, height: 148, borderRadius: BorderRadius.md, overflow: 'hidden', position: 'relative', backgroundColor: '#F3F4F6' },
  thumb: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  playBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)' },
  statsRow: { flexDirection: 'column', gap: 2, alignItems: 'center' },
  stat: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.semibold },
  userRow: { position: 'absolute', bottom: 5, left: 4, right: 4, flexDirection: 'row', alignItems: 'center', gap: 3 },
  userAv: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#FFF' },
  userName: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.bold, flex: 1 },
  moreCard: { backgroundColor: 'transparent' },
  moreGrad: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  moreText: { color: '#FFF', fontSize: 11, fontWeight: FontWeight.bold, textAlign: 'center' },
});

// ── PK Battles live section ──
const PK_BATTLES = [
  {
    id: 'pk001', host1: 'GalaxyGoddess', host2: 'NeonPulse',
    av1: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop',
    av2: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop',
    score1: 68420, score2: 54100, viewers: 12340, roomId: 'room002',
  },
  {
    id: 'pk002', host1: 'CosmicRider', host2: 'StarKing',
    av1: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop',
    av2: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop',
    score1: 31200, score2: 42800, viewers: 7890, roomId: 'room008',
  },
  {
    id: 'pk003', host1: 'RoseQueen', host2: 'DragonFire',
    av1: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop',
    av2: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop',
    score1: 19500, score2: 17300, viewers: 4210, roomId: 'room006',
  },
];

function PKBattlesRow() {
  const router = useRouter();
  return (
    <View style={pkS.wrap}>
      <View style={pkS.header}>
        <View style={pkS.headerLeft}>
          <View style={pkS.liveDot} />
          <Text style={pkS.title}>⚔️ PK Battles Live</Text>
        </View>
        <Pressable onPress={() => router.push('/explore' as any)} style={pkS.seeAllBtn}>
          <Text style={pkS.seeAll}>See All</Text>
          <MaterialIcons name="chevron-right" size={16} color={Colors.live} />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pkS.scroll}>
        {PK_BATTLES.map(pk => {
          const total = pk.score1 + pk.score2 || 1;
          const pct = pk.score1 / total;
          return (
            <Pressable key={pk.id} style={pkS.card} onPress={() => router.push(`/live/${pk.roomId}` as any)}>
              <LinearGradient colors={['#1a0028', '#2d0040']} style={pkS.cardGrad}>
                <View style={pkS.vsRow}>
                  <View style={pkS.side}>
                    <Image source={{ uri: pk.av1 }} style={[pkS.av, { borderColor: Colors.primary }]} contentFit="cover" />
                    <Text style={pkS.name} numberOfLines={1}>{pk.host1.split(' ')[0]}</Text>
                    <Text style={[pkS.score, { color: Colors.primary }]}>{(pk.score1 / 1000).toFixed(1)}K</Text>
                  </View>
                  <View style={pkS.center}>
                    <Text style={pkS.vs}>VS</Text>
                    <View style={pkS.bar}>
                      <View style={[pkS.barLeft, { flex: pct }]} />
                      <View style={[pkS.barRight, { flex: 1 - pct }]} />
                    </View>
                    <Text style={pkS.viewers}>👁 {(pk.viewers / 1000).toFixed(1)}K</Text>
                  </View>
                  <View style={[pkS.side, { alignItems: 'flex-end' }]}>
                    <Image source={{ uri: pk.av2 }} style={[pkS.av, { borderColor: Colors.secondary }]} contentFit="cover" />
                    <Text style={pkS.name} numberOfLines={1}>{pk.host2.split(' ')[0]}</Text>
                    <Text style={[pkS.score, { color: Colors.secondary }]}>{(pk.score2 / 1000).toFixed(1)}K</Text>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
const pkS = StyleSheet.create({
  wrap: { backgroundColor: '#FFF', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: Spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.live },
  title: { color: '#1F2937', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAll: { color: Colors.live, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  scroll: { paddingHorizontal: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xs },
  card: { width: 240, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  cardGrad: { padding: Spacing.sm },
  vsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  side: { width: 68, alignItems: 'flex-start', gap: 3 },
  av: { width: 42, height: 42, borderRadius: 21, borderWidth: 2 },
  name: { color: '#FFF', fontSize: 10, fontWeight: FontWeight.semibold, maxWidth: 64 },
  score: { fontSize: 11, fontWeight: FontWeight.black },
  center: { flex: 1, alignItems: 'center', gap: 5 },
  vs: { color: Colors.live, fontSize: 14, fontWeight: FontWeight.black },
  bar: { width: '100%', height: 8, borderRadius: 4, flexDirection: 'row', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)' },
  barLeft: { height: '100%', backgroundColor: Colors.primary },
  barRight: { height: '100%', backgroundColor: Colors.secondary },
  viewers: { color: 'rgba(255,255,255,0.6)', fontSize: 9 },
});

// ── Online Streamers Row ──
function OnlineStreamersRow() {
  const router = useRouter();
  const online = MOCK_USERS.filter(u => u.isOnline);
  return (
    <View style={osS.wrap}>
      <View style={osS.header}>
        <View style={osS.headerLeft}>
          <View style={osS.onlineDot} />
          <Text style={osS.title}>Online Now</Text>
          <View style={osS.countBadge}><Text style={osS.countText}>{online.length}</Text></View>
        </View>
        <Pressable onPress={() => router.push('/search' as any)} style={osS.seeAllBtn}>
          <Text style={osS.seeAll}>Browse</Text>
          <MaterialIcons name="chevron-right" size={16} color={Colors.primary} />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={osS.scroll}>
        {online.map(u => (
          <Pressable key={u.id} style={osS.item} onPress={() => u.isLive ? router.push(`/live/${u.id}` as any) : router.push(`/user/${u.id}` as any)}>
            <View style={osS.avatarWrap}>
              <Image source={{ uri: u.avatar }} style={osS.avatar} contentFit="cover" />
              <View style={osS.onlineRing} />
              {u.isLive && (
                <View style={osS.livePill}><Text style={osS.liveText}>LIVE</Text></View>
              )}
            </View>
            <Text style={osS.name} numberOfLines={1}>{u.displayName.split(' ')[0]}</Text>
            <Text style={osS.followers}>{(u.followers / 1000).toFixed(0)}K</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
const osS = StyleSheet.create({
  wrap: { backgroundColor: '#FFF', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: Spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  title: { color: '#1F2937', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  countBadge: { backgroundColor: Colors.success + '22', borderRadius: BorderRadius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  countText: { color: Colors.success, fontSize: 11, fontWeight: FontWeight.bold },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAll: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  scroll: { paddingHorizontal: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xs },
  item: { alignItems: 'center', gap: 4, width: 60 },
  avatarWrap: { position: 'relative', width: 54, height: 54 },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  onlineRing: { position: 'absolute', bottom: 1, right: 1, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.success, borderWidth: 2, borderColor: '#FFF' },
  livePill: { position: 'absolute', bottom: -4, alignSelf: 'center', backgroundColor: Colors.live, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, borderWidth: 1.5, borderColor: '#FFF' },
  liveText: { color: '#FFF', fontSize: 7, fontWeight: FontWeight.black, letterSpacing: 0.4 },
  name: { color: '#374151', fontSize: 10, fontWeight: FontWeight.semibold, textAlign: 'center' },
  followers: { color: '#9CA3AF', fontSize: 9, textAlign: 'center' },
});

const { width } = Dimensions.get('window');

// ── Featured Live Hero Carousel ──
const FEATURED_STREAMS = [
  {
    id: 'room008', title: '🔥 hey love 🇧🇩', host: 'CosmicRider', viewers: 12340,
    cover: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&h=400&fit=crop',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    badge: '🔴 LIVE', isPK: false, diamonds: 8420,
  },
  {
    id: 'room006', title: '❤️ Ohona PK Battle ⚔️', host: 'Ohona', viewers: 8900,
    cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=400&fit=crop',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
    badge: '⚔️ PK', isPK: true, diamonds: 54200,
  },
  {
    id: 'room009', title: '🎵 नाहार महारानी 🎵', host: 'Nahar', viewers: 5630,
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=400&fit=crop',
    avatar: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=100&h=100&fit=crop',
    badge: '🎤 SINGING', isPK: false, diamonds: 21100,
  },
];

function FeaturedLiveHero() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const currentIndex = useRef(0);
  const [dotIndex, setDotIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      const next = (currentIndex.current + 1) % FEATURED_STREAMS.length;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      currentIndex.current = next;
      setDotIndex(next);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    currentIndex.current = idx;
    setDotIndex(idx);
  };

  return (
    <View style={heroS.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {FEATURED_STREAMS.map((stream, i) => (
          <Pressable
            key={stream.id}
            style={{ width }}
            onPress={() => router.push(`/live/${stream.id}` as any)}
          >
            <Image source={{ uri: stream.cover }} style={heroS.cover} contentFit="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0.82)']}
              style={heroS.grad}
            >
              {/* Top row */}
              <View style={heroS.topRow}>
                <View style={[heroS.liveBadge, stream.isPK ? heroS.pkBadge : heroS.redBadge]}>
                  <Text style={heroS.liveBadgeText}>{stream.badge}</Text>
                </View>
                <View style={heroS.viewerPill}>
                  <MaterialIcons name="visibility" size={12} color="#FFF" />
                  <Text style={heroS.viewerText}>{(stream.viewers / 1000).toFixed(1)}K</Text>
                </View>
              </View>

              {/* Bottom info */}
              <View style={heroS.bottom}>
                <View style={heroS.hostRow}>
                  <Image source={{ uri: stream.avatar }} style={heroS.hostAv} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={heroS.streamTitle} numberOfLines={1}>{stream.title}</Text>
                    <Text style={heroS.hostName}>@{stream.host}</Text>
                  </View>
                  <View style={heroS.diamondPill}>
                    <Text style={{ fontSize: 12 }}>💎</Text>
                    <Text style={heroS.diamondText}>{(stream.diamonds / 1000).toFixed(1)}K</Text>
                  </View>
                </View>
                <Pressable
                  style={heroS.watchBtn}
                  onPress={() => router.push(`/live/${stream.id}` as any)}
                >
                  <LinearGradient colors={[Colors.primary, Colors.secondary]} style={heroS.watchGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={heroS.watchText}>Watch Live</Text>
                    <MaterialIcons name="chevron-right" size={16} color="#FFF" />
                  </LinearGradient>
                </Pressable>
              </View>
            </LinearGradient>
          </Pressable>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      <View style={heroS.dots}>
        {FEATURED_STREAMS.map((_, i) => (
          <View key={i} style={[heroS.dot, i === dotIndex && heroS.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const heroS = StyleSheet.create({
  wrap: { position: 'relative', marginBottom: Spacing.xs },
  cover: { width, height: 200, backgroundColor: '#1a0028' },
  grad: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: Spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  liveBadge: { borderRadius: BorderRadius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  redBadge: { backgroundColor: Colors.live },
  pkBadge: { backgroundColor: Colors.primary },
  liveBadgeText: { color: '#FFF', fontSize: 11, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  viewerPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  viewerText: { color: '#FFF', fontSize: 11, fontWeight: FontWeight.bold },
  bottom: { gap: 10 },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hostAv: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: Colors.primary },
  streamTitle: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  hostName: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.xs },
  diamondPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  diamondText: { color: Colors.diamond, fontSize: 12, fontWeight: FontWeight.bold },
  watchBtn: { borderRadius: BorderRadius.pill, overflow: 'hidden', alignSelf: 'flex-start' },
  watchGrad: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 16, paddingVertical: 8 },
  watchText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.black },
  dots: { position: 'absolute', bottom: 8, alignSelf: 'center', flexDirection: 'row', gap: 5, left: '50%', transform: [{ translateX: -20 }] },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: '#FFF', width: 18, borderRadius: 3 },
});

type HomeTab = 'following' | 'popular' | 'party' | 'explore';

// ── Categories as seen in PoppoLive ──
const CATEGORIES = [
  { key: 'chatting',    label: 'Chatting',     emoji: '😎', color: '#FF6B9D' },
  { key: 'singing',     label: 'Singing',      emoji: '🎤', color: '#A78BFA' },
  { key: 'esports',     label: 'Esports',      emoji: '🎮', color: '#60A5FA' },
  { key: 'friends',     label: 'Make Friends', emoji: '💞', color: '#F97316' },
  { key: 'dancing',     label: 'Dancing',      emoji: '💃', color: '#EC4899' },
  { key: 'talent',      label: 'Talent',       emoji: '✨', color: '#FBBF24' },
];

// ── Fallback rooms ──
const FALLBACK_ROOMS = [
  {
    id: 'room001', title: 'Lucky broad🎉👍🇧🇩', hostName: 'Lucky Broad',
    hostAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    viewers: 58, isPK: false, isParty: false, category: 'Chatting',
    viewerAvatars: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop',
    ], extraViewers: 12, isFirstRecharge: false, regionBadge: '',
  },
  {
    id: 'room002', title: '🇧🇩 ZR JobayeR 👑🇧🇩', hostName: 'ZR JobayeR',
    hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    viewers: 68, isPK: false, isParty: false, category: 'Esports',
    viewerAvatars: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=40&h=40&fit=crop',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=40&h=40&fit=crop',
    ], extraViewers: 6, isFirstRecharge: false, regionBadge: '',
  },
  {
    id: 'room003', title: '❤️❤️mimu🍁🎄🇧🇩', hostName: 'Mimu',
    hostAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
    viewers: 23, isPK: false, isParty: false, category: 'Chatting',
    viewerAvatars: [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop',
    ], extraViewers: 6, isFirstRecharge: false, regionBadge: '',
  },
  {
    id: 'room004', title: 'Recharge dei 🇧🇩', hostName: 'Recharge Dei',
    hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
    viewers: 177, isPK: false, isParty: false, category: 'Chatting',
    viewerAvatars: ['https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop'],
    extraViewers: 0, isFirstRecharge: false, regionBadge: 'Region No.2',
  },
  {
    id: 'room005', title: 'Mahbuba🦋🇧🇩', hostName: 'Mahbuba',
    hostAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop',
    viewers: 94, isPK: false, isParty: true, category: 'Chatting',
    viewerAvatars: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=40&h=40&fit=crop',
    ], extraViewers: 9, isFirstRecharge: true, regionBadge: '',
  },
  {
    id: 'room006', title: '❤️Ohona ❤️🇧🇩', hostName: 'Ohona',
    hostAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop',
    viewers: 380, isPK: true, isParty: false, category: 'Make Friends',
    viewerAvatars: [], extraViewers: 0, isFirstRecharge: false, regionBadge: '',
  },
  {
    id: 'room007', title: 'New week 🤩🙌🤪🇧🇩', hostName: 'StarKing',
    hostAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=400&fit=crop',
    viewers: 370, isPK: false, isParty: false, category: 'Chatting',
    viewerAvatars: [], extraViewers: 0, isFirstRecharge: false, regionBadge: '',
  },
  {
    id: 'room008', title: 'hey love 🇧🇩', hostName: 'CosmicRider',
    hostAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop',
    viewers: 772, isPK: true, isParty: false, category: 'Make Friends',
    viewerAvatars: [], extraViewers: 0, isFirstRecharge: false, regionBadge: '',
  },
  {
    id: 'room009', title: '🎵 नाहार🎩महारानी🎵', hostName: 'Nahar',
    hostAvatar: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&h=400&fit=crop',
    viewers: 363, isPK: false, isParty: false, category: 'Singing',
    viewerAvatars: [], extraViewers: 0, isFirstRecharge: false, regionBadge: 'TOP10 Hourly',
  },
];

// ── Event Banner (inline ad) ──
function EventBanner() {
  return (
    <Pressable style={evtS.wrap}>
      <LinearGradient colors={['#9333EA', '#EC4899', '#F97316']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={evtS.gradient}>
        <View style={evtS.left}>
          <View style={evtS.eventTag}><Text style={evtS.eventTagText}>Event</Text></View>
          <Text style={evtS.eventSub}>Earn coins &{'\n'}event medal!</Text>
        </View>
        <View style={evtS.right}>
          <Text style={evtS.title}>Like, Coins in a{'\n'}Moment! 🪙</Text>
          <View style={evtS.pill}><Text style={evtS.pillText}>Like the post: Get 10 coins.</Text></View>
          <Text style={evtS.sub}>Engage & Win Official Rewards!</Text>
          <View style={evtS.thumbRow}>
            <Text style={{ fontSize: 22 }}>👍</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
const evtS = StyleSheet.create({
  wrap: { marginHorizontal: Spacing.md, marginVertical: Spacing.sm, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  gradient: { flexDirection: 'row', padding: Spacing.md, minHeight: 110 },
  left: { width: 90, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  eventTag: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  eventTagText: { color: '#FFF', fontSize: 12, fontWeight: FontWeight.bold },
  eventSub: { color: 'rgba(255,255,255,0.85)', fontSize: 10, textAlign: 'center', lineHeight: 14 },
  right: { flex: 1, paddingLeft: Spacing.sm },
  title: { color: '#FFF', fontSize: 15, fontWeight: FontWeight.black, marginBottom: 5, lineHeight: 20 },
  pill: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 4 },
  pillText: { color: '#FFF', fontSize: 11, fontWeight: FontWeight.semibold },
  sub: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: FontWeight.medium },
  thumbRow: { flexDirection: 'row', marginTop: 4 },
});

// ── Honor & Activity Centre banners ──
function TopFeatureBanners() {
  const router = useRouter();
  return (
    <View style={featS.row}>
      <Pressable style={featS.honorCard} onPress={() => router.push('/leaderboard')}>
        <LinearGradient colors={['#F97316', '#FBBF24']} style={featS.honorGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={featS.newBadge}><Text style={featS.newBadgeText}>NEW</Text></View>
          <Text style={featS.honorTitle}>Honor</Text>
          <Text style={{ fontSize: 32, position: 'absolute', right: 10, bottom: 8 }}>👑</Text>
        </LinearGradient>
      </Pressable>
      <Pressable style={featS.actCard} onPress={() => router.push('/daily-tasks')}>
        <LinearGradient colors={['#3B82F6', '#60A5FA']} style={featS.actGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={featS.actTitle}>Activity{'\n'}Centre</Text>
          <Text style={{ fontSize: 30, position: 'absolute', right: 10, bottom: 8 }}>⭐</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}
const featS = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  honorCard: { flex: 1, height: 80, borderRadius: BorderRadius.lg, overflow: 'hidden', position: 'relative' },
  honorGrad: { flex: 1, padding: Spacing.md, position: 'relative' },
  newBadge: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 3 },
  newBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 1 },
  honorTitle: { color: '#FFF', fontSize: FontSize.xl, fontWeight: FontWeight.black },
  actCard: { flex: 1, height: 80, borderRadius: BorderRadius.lg, overflow: 'hidden', position: 'relative' },
  actGrad: { flex: 1, padding: Spacing.md, position: 'relative' },
  actTitle: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold, lineHeight: 20 },
});

// ── List View Room Card (PoppoLive style) ──
function ListRoomCard({ room, onPress }: { room: any; onPress: () => void }) {
  const pressAnim = useRef(new Animated.Value(1)).current;
  const categoryInfo = CATEGORIES.find(c => c.label.toLowerCase() === room.category?.toLowerCase()) || CATEGORIES[0];

  return (
    <Pressable
      style={listS.card}
      onPress={onPress}
      onPressIn={() => Animated.timing(pressAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }).start()}
      onPressOut={() => Animated.timing(pressAnim, { toValue: 1, duration: 120, useNativeDriver: true }).start()}
    >
      <Animated.View style={[listS.inner, { transform: [{ scale: pressAnim }] }]}>
        {/* Thumbnail */}
        <View style={listS.thumbWrap}>
          <Image source={{ uri: room.thumbnail }} style={listS.thumb} contentFit="cover" transition={150} />
          {room.isParty ? (
            <View style={listS.partyOverlay}>
              <Text style={listS.partyText}>🎉 PARTY</Text>
            </View>
          ) : null}
          {room.isPK ? <View style={listS.pkTag}><Text style={listS.pkTagText}>PK</Text></View> : null}
        </View>

        {/* Info */}
        <View style={listS.info}>
          <Text style={listS.title} numberOfLines={1}>{room.title}</Text>

          {/* Category tag */}
          <View style={[listS.catTag, { backgroundColor: categoryInfo.color + '22' }]}>
            <Text style={{ fontSize: 13 }}>{categoryInfo.emoji}</Text>
            <Text style={[listS.catText, { color: categoryInfo.color }]}>{room.category || 'Chatting'}</Text>
          </View>

          {/* Viewer avatars row */}
          <View style={listS.viewerRow}>
            {room.viewerAvatars?.slice(0, 3).map((av: string, i: number) => (
              <Image key={i} source={{ uri: av }} style={[listS.viewerAv, { marginLeft: i === 0 ? 0 : -8, zIndex: 5 - i }]} contentFit="cover" />
            ))}
            {room.extraViewers > 0 ? (
              <View style={[listS.extraCount, { marginLeft: room.viewerAvatars?.length > 0 ? -8 : 0 }]}>
                <Text style={listS.extraCountText}>{room.extraViewers}</Text>
              </View>
            ) : null}
            <View style={listS.signalRow}>
              <MaterialIcons name="signal-cellular-alt" size={14} color={Colors.textMuted} />
              <Text style={listS.viewerCount}>{room.viewers}</Text>
            </View>
          </View>

          {/* Region badge */}
          {room.regionBadge ? (
            <View style={listS.regionBadge}>
              {room.regionBadge === 'TOP10 Hourly' ? (
                <LinearGradient colors={['#F97316', '#FBBF24']} style={listS.regionGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={{ fontSize: 10 }}>🔥</Text>
                  <Text style={listS.regionBadgeText}>{room.regionBadge}</Text>
                  <Text style={[listS.regionBadgeText, { fontSize: 9 }]}>⏰ Hourly</Text>
                </LinearGradient>
              ) : (
                <LinearGradient colors={['#EC4899', '#A855F7']} style={listS.regionGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={{ fontSize: 10 }}>👑</Text>
                  <Text style={listS.regionBadgeText}>{room.regionBadge}</Text>
                </LinearGradient>
              )}
            </View>
          ) : null}

          {/* First Recharge badge */}
          {room.isFirstRecharge ? (
            <View style={listS.firstRechargeBadge}>
              <Text style={listS.firstRechargeText}>💰 First Recharge</Text>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}
const listS = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: BorderRadius.lg, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  inner: { flexDirection: 'row', padding: Spacing.sm, gap: Spacing.sm, alignItems: 'center' },
  thumbWrap: { width: 100, height: 100, borderRadius: BorderRadius.md, overflow: 'hidden', position: 'relative', backgroundColor: '#F3F4F6' },
  thumb: { width: '100%', height: '100%' },
  partyOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(249,115,22,0.5)', alignItems: 'center', justifyContent: 'flex-end', padding: 5 },
  partyText: { color: '#FFF', fontSize: 11, fontWeight: FontWeight.black },
  pkTag: { position: 'absolute', bottom: 5, left: 5, backgroundColor: Colors.live, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  pkTagText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  info: { flex: 1, gap: 5 },
  title: { color: '#1F2937', fontSize: FontSize.md, fontWeight: FontWeight.bold, lineHeight: 20 },
  catTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.pill },
  catText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  viewerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  viewerAv: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#FFF' },
  extraCount: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#6B7280', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFF' },
  extraCountText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.bold },
  signalRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto' },
  viewerCount: { color: '#6B7280', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  regionBadge: { alignSelf: 'flex-start', borderRadius: 6, overflow: 'hidden', marginTop: 2 },
  regionGrad: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3 },
  regionBadgeText: { color: '#FFF', fontSize: 10, fontWeight: FontWeight.bold },
  firstRechargeBadge: { backgroundColor: '#F97316', alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, marginTop: 2 },
  firstRechargeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.bold },
});

// ── Grid View Room Card (PoppoLive 2-col style) ──
function GridRoomCard({ room, onPress }: { room: any; onPress: () => void }) {
  const CARD_W = (width - Spacing.md * 2 - Spacing.sm) / 2;
  const categoryInfo = CATEGORIES.find(c => c.label.toLowerCase() === room.category?.toLowerCase()) || CATEGORIES[0];

  return (
    <Pressable style={[gridS.card, { width: CARD_W }]} onPress={onPress}>
      <Image source={{ uri: room.thumbnail }} style={[gridS.img, { height: CARD_W * 1.18 }]} contentFit="cover" transition={150} />
      {/* Top badges */}
      <View style={gridS.topRow}>
        <View style={[gridS.catBadge, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
          <Text style={gridS.catBadgeText}>{room.category || 'Chatting'}</Text>
        </View>
        {room.isPK && <View style={gridS.pkBadge}><Text style={gridS.pkBadgeText}>PK</Text></View>}
        {room.regionBadge === 'TOP10 Hourly' && (
          <View style={gridS.top10Badge}>
            <Text style={gridS.top10Text}>🔥 TOP10</Text>
            <Text style={gridS.top10Sub}>⏰ Hourly</Text>
          </View>
        )}
      </View>
      {/* Bottom info */}
      <View style={gridS.bottom}>
        <Text style={gridS.name} numberOfLines={1}>{room.title}</Text>
        <View style={gridS.bottomRow}>
          <MaterialIcons name="signal-cellular-alt" size={12} color="rgba(255,255,255,0.7)" />
          <Text style={gridS.viewCount}>{room.viewers}</Text>
          {room.isFirstRecharge && (
            <View style={gridS.firstRecharge}><Text style={gridS.firstRechargeText}>First Recharge</Text></View>
          )}
        </View>
      </View>
      {/* LIVE CTA button */}
      {(room.isParty) ? (
        <View style={gridS.liveCta}>
          <Text style={{ fontSize: 11 }}>📹</Text>
          <Text style={gridS.liveCtaText}>PARTY</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
const gridS = StyleSheet.create({
  card: { borderRadius: BorderRadius.lg, overflow: 'hidden', backgroundColor: '#F3F4F6', position: 'relative' },
  img: { width: '100%' },
  topRow: { position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  catBadge: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  catBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.bold },
  pkBadge: { backgroundColor: Colors.live, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 3 },
  pkBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  top10Badge: { backgroundColor: 'rgba(249,115,22,0.85)', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  top10Text: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  top10Sub: { color: 'rgba(255,255,255,0.9)', fontSize: 8 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8, backgroundColor: 'rgba(0,0,0,0.42)' },
  name: { color: '#FFF', fontSize: 11, fontWeight: FontWeight.bold, marginBottom: 2 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewCount: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: FontWeight.semibold },
  firstRecharge: { backgroundColor: '#F97316', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 4 },
  firstRechargeText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.bold },
  liveCta: { position: 'absolute', bottom: 36, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F97316', borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  liveCtaText: { color: '#FFF', fontSize: 10, fontWeight: FontWeight.black },
});

// ── Main Home Screen ──
export default function HomeScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<HomeTab>('popular');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [rooms, setRooms] = useState<any[]>(FALLBACK_ROOMS);
  const [refreshing, setRefreshing] = useState(false);
  const [onlineCount, setOnlineCount] = useState(48362);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const tabScrollRef = useRef<ScrollView>(null);

  // Animate active tab indicator
  const TAB_DATA: { key: HomeTab; label: string }[] = [
    { key: 'following', label: 'Following' },
    { key: 'popular', label: 'Popular' },
    { key: 'party', label: 'Party' },
    { key: 'explore', label: 'Explore' },
  ];

  useEffect(() => {
    loadRooms();
    pollRef.current = setInterval(loadRooms, 30000);
    const onlineTimer = setInterval(() => setOnlineCount(c => c + Math.floor(Math.random() * 60 - 20)), 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      clearInterval(onlineTimer);
    };
  }, []);

  const loadRooms = useCallback(async () => {
    const { data } = await fetchLiveRooms();
    if (data && data.length > 0) {
      const mapped = data.map((r, i) => ({
        id: r.id,
        title: r.title,
        hostName: r.host?.display_name || r.host?.username || 'Host',
        hostAvatar: r.host?.avatar_url || FALLBACK_ROOMS[i % FALLBACK_ROOMS.length]?.hostAvatar,
        thumbnail: r.thumbnail_url || FALLBACK_ROOMS[i % FALLBACK_ROOMS.length]?.thumbnail,
        viewers: r.viewers || 0,
        isPK: r.is_pk,
        isParty: r.is_party,
        category: r.stream_type === 'audio' ? 'Singing' : 'Chatting',
        viewerAvatars: [],
        extraViewers: 0,
        isFirstRecharge: false,
        regionBadge: '',
      }));
      setRooms([...FALLBACK_ROOMS, ...mapped]);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRooms();
    setRefreshing(false);
  }, [loadRooms]);

  const getFilteredRooms = () => {
    switch (activeTab) {
      case 'party': return rooms.filter(r => r.isParty);
      case 'following': return rooms.slice(0, 3);
      case 'explore': return [...rooms].sort((a, b) => b.viewers - a.viewers);
      default: return rooms; // popular
    }
  };

  const filtered = getFilteredRooms();

  // Insert event banner at index 4
  const renderListItems = () => {
    const items: JSX.Element[] = [];
    filtered.forEach((room, i) => {
      if (i === 3) {
        items.push(<EventBanner key="event-banner" />);
      }
      items.push(
        <ListRoomCard
          key={room.id}
          room={room}
          onPress={() => router.push(`/live/${room.id}` as any)}
        />
      );
    });
    return items;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Top Navigation Bar (PoppoLive style) ── */}
      <View style={styles.topNav}>
        {/* Tab pills */}
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
          style={styles.tabsScroll}
        >
          {TAB_DATA.map((tab) => (
            <Pressable key={tab.key} style={styles.tabItem} onPress={() => setActiveTab(tab.key)}>
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}>
                {tab.label}
              </Text>
              {activeTab === tab.key && <View style={styles.tabUnderline} />}
            </Pressable>
          ))}
        </ScrollView>

        {/* Right icons */}
        <View style={styles.topNavRight}>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/search')}>
            <MaterialIcons name="search" size={24} color="#374151" />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/leaderboard')}>
            <Text style={{ fontSize: 22 }}>🏆</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Featured Live Hero Carousel */}
        <FeaturedLiveHero />

        {/* Stories Row — always visible */}
        <StoriesRow />

        {/* Short Videos Row — always visible */}
        <ShortVideosRow />

        {/* PK Battles Live — always visible */}
        <PKBattlesRow />

        {/* Online Streamers */}
        <OnlineStreamersRow />

        {/* Show TopFeatureBanners only on Popular / Explore */}
        {(activeTab === 'popular' || activeTab === 'explore') ? (
          <>
            <TopFeatureBanners />

            {/* View mode toggle */}
            <View style={styles.viewToggleRow}>
              <Text style={styles.roomCountText}>
                <View style={styles.liveDotInline} />
                {' '}{filtered.length} Live Rooms
              </Text>
              <View style={styles.viewToggle}>
                <Pressable
                  style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
                  onPress={() => setViewMode('list')}
                >
                  <MaterialIcons name="view-agenda" size={16} color={viewMode === 'list' ? Colors.primary : '#9CA3AF'} />
                </Pressable>
                <Pressable
                  style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
                  onPress={() => setViewMode('grid')}
                >
                  <MaterialIcons name="grid-view" size={16} color={viewMode === 'grid' ? Colors.primary : '#9CA3AF'} />
                </Pressable>
              </View>
            </View>

            {viewMode === 'grid' ? (
              <View style={styles.gridContainer}>
                {filtered.map((room, i) => {
                  // Insert event banner in grid after row 2
                  const items = [];
                  if (i === 4) {
                    items.push(<EventBanner key="grid-event" />);
                  }
                  items.push(
                    <GridRoomCard key={room.id} room={room} onPress={() => router.push(`/live/${room.id}` as any)} />
                  );
                  return items;
                })}
              </View>
            ) : (
              <View>{renderListItems()}</View>
            )}
          </>
        ) : activeTab === 'following' ? (
          <>
            {/* Following - show top 3 rooms + suggestion */}
            <View style={styles.followingEmpty}>
              <Text style={{ fontSize: 36 }}>👥</Text>
              <Text style={styles.followingTitle}>Follow people to see their streams</Text>
              <Text style={styles.followingSub}>Discover new hosts and follow them!</Text>
              <Pressable style={styles.discoverBtn} onPress={() => router.push('/search')}>
                <Text style={styles.discoverBtnText}>Discover People</Text>
              </Pressable>
            </View>
            {/* Show some rooms anyway */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Suggested for You</Text>
            </View>
            {FALLBACK_ROOMS.slice(0, 4).map(room => (
              <ListRoomCard key={room.id} room={room} onPress={() => router.push(`/live/${room.id}` as any)} />
            ))}
          </>
        ) : (
          // Party tab
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.liveDotRow}><View style={styles.liveDotInline} /><Text style={styles.sectionTitle}>Party Rooms 🎉</Text></View>
            </View>
            {FALLBACK_ROOMS.filter(r => r.isParty).length === 0 ? (
              <View style={styles.followingEmpty}>
                <Text style={{ fontSize: 40 }}>🎉</Text>
                <Text style={styles.followingTitle}>No party rooms right now</Text>
                <Pressable style={styles.discoverBtn} onPress={() => router.push('/go-live')}>
                  <Text style={styles.discoverBtnText}>Start a Party</Text>
                </Pressable>
              </View>
            ) : null}
            {rooms.filter(r => r.isParty).map(room => (
              <ListRoomCard key={room.id} room={room} onPress={() => router.push(`/live/${room.id}` as any)} />
            ))}
            {/* Show all rooms for party */}
            {rooms.filter(r => !r.isParty).slice(0, 4).map(room => (
              <ListRoomCard key={`p_${room.id}`} room={{ ...room, isParty: false }} onPress={() => router.push(`/live/${room.id}` as any)} />
            ))}
          </>
        )}

        {/* Bottom quick nav cards */}
        <View style={styles.quickNavRow}>
          {[
            { icon: '⚔️', label: 'PK Battle',   color: Colors.live,    route: '/pk-invite/preview' },
            { icon: '🎮', label: 'Games',        color: Colors.gold,    route: '/games' },
            { icon: '🎯', label: 'Daily Tasks',  color: Colors.success, route: '/daily-tasks' },
            { icon: '💸', label: 'Withdraw',     color: Colors.diamond, route: '/withdrawal' },
          ].map(a => (
            <Pressable key={a.label} style={[styles.qNavCard, { borderColor: a.color + '35' }]} onPress={() => router.push(a.route as any)}>
              <Text style={{ fontSize: 22 }}>{a.icon}</Text>
              <Text style={[styles.qNavLabel, { color: a.color }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // Top Nav
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingRight: Spacing.sm,
  },
  tabsScroll: { flex: 1 },
  tabsContent: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.xs,
    gap: 0,
    alignItems: 'center',
  },
  tabItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: FontSize.md,
    color: '#9CA3AF',
    fontWeight: FontWeight.medium,
  },
  tabTextActive: {
    color: '#111827',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.lg,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: Spacing.md,
    right: Spacing.md,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  topNavRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  scrollContent: { paddingBottom: 24 },

  // View toggle row
  viewToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#FFF',
    marginBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  liveDotInline: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.live,
    display: 'flex',
  },
  roomCountText: { color: '#6B7280', fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  viewToggle: { flexDirection: 'row', gap: 2, backgroundColor: '#F3F4F6', borderRadius: BorderRadius.sm, padding: 2 },
  viewToggleBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 5 },
  viewToggleBtnActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 },

  // Grid container
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.md, gap: Spacing.sm, paddingTop: Spacing.sm },

  // Following empty state
  followingEmpty: { alignItems: 'center', paddingVertical: Spacing.xl, paddingHorizontal: Spacing.xl, gap: Spacing.sm, backgroundColor: '#FFF', marginHorizontal: Spacing.md, marginBottom: Spacing.md, borderRadius: BorderRadius.lg },
  followingTitle: { color: '#111827', fontSize: FontSize.md, fontWeight: FontWeight.bold, textAlign: 'center' },
  followingSub: { color: '#6B7280', fontSize: FontSize.xs, textAlign: 'center' },
  discoverBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, marginTop: Spacing.sm },
  discoverBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  // Section headers
  sectionHeader: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs, paddingTop: Spacing.sm },
  sectionTitle: { color: '#111827', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  liveDotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // Bottom quick nav
  quickNavRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  qNavCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: Spacing.sm,
    alignItems: 'center', gap: 4, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  qNavLabel: { fontSize: 9, fontWeight: FontWeight.bold, textAlign: 'center' },
});
