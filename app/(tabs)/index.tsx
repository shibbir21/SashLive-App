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

const { width } = Dimensions.get('window');

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
