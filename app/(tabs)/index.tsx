// SashLive — Home Feed (PoppoLive Style)
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Dimensions, Animated, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { fetchLiveRooms } from '@/services/liveRoomService';
import { getSupabaseClient } from '@/template';
import { useAuth } from '@/template';

const { width } = Dimensions.get('window');

type HomeTab = 'following' | 'popular' | 'party' | 'explore';

// ── Stories Ring ──
const MOCK_STORIES = [
  { id: 'my', userId: 'me', username: 'Your Story', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&fit=crop', isOwn: true, hasStory: false, isLive: false },
  { id: 'st1', userId: 'u007', username: 'GalaxyGirl', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&fit=crop', isOwn: false, hasStory: true, isLive: true },
  { id: 'st2', userId: 'u002', username: 'DragonFire', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&fit=crop', isOwn: false, hasStory: true, isLive: false },
  { id: 'st3', userId: 'u009', username: 'RoseQueen', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&fit=crop', isOwn: false, hasStory: true, isLive: false },
  { id: 'st4', userId: 'u005', username: 'CosmicRider', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&fit=crop', isOwn: false, hasStory: false, isLive: true },
  { id: 'st5', userId: 'u003', username: 'Moonlight', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&fit=crop', isOwn: false, hasStory: true, isLive: false },
  { id: 'st6', userId: 'u006', username: 'NeonPulse', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&fit=crop', isOwn: false, hasStory: true, isLive: false },
  { id: 'st7', userId: 'u008', username: 'StarKing', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&fit=crop', isOwn: false, hasStory: false, isLive: false },
];

function StoriesRing({ onCreateStory, onViewStory }: { onCreateStory: () => void; onViewStory: (userId: string) => void }) {
  const ringAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(ringAnim, { toValue: 1, duration: 2400, useNativeDriver: true })
    ).start();
  }, []);

  return (
    <View style={storyS.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={storyS.row}
      >
        {MOCK_STORIES.map((story) => (
          <Pressable
            key={story.id}
            style={storyS.item}
            onPress={() => story.isOwn ? onCreateStory() : onViewStory(story.userId)}
          >
            <View style={storyS.avatarWrap}>
              {/* Gradient ring for stories */}
              {(story.hasStory || story.isLive) ? (
                <LinearGradient
                  colors={story.isLive ? [Colors.live, '#FF8C00'] : [Colors.primary, Colors.secondary, '#FF8C00']}
                  style={storyS.gradientRing}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Image source={{ uri: story.avatar }} style={storyS.avatar} contentFit="cover" />
                </LinearGradient>
              ) : (
                <View style={storyS.plainRing}>
                  <Image source={{ uri: story.avatar }} style={storyS.avatar} contentFit="cover" />
                </View>
              )}

              {/* Own story: add button */}
              {story.isOwn ? (
                <View style={storyS.addBtn}>
                  <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '900', lineHeight: 16 }}>+</Text>
                </View>
              ) : null}

              {/* Live badge */}
              {story.isLive ? (
                <View style={storyS.liveBadge}>
                  <Text style={storyS.liveBadgeText}>LIVE</Text>
                </View>
              ) : null}
            </View>
            <Text style={storyS.name} numberOfLines={1}>
              {story.isOwn ? 'Add Story' : story.username.split(' ')[0]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const storyS = StyleSheet.create({
  container: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  row: { paddingHorizontal: 12, paddingVertical: 10, gap: 14 },
  item: { alignItems: 'center', gap: 5, width: 62 },
  avatarWrap: { position: 'relative' },
  gradientRing: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', padding: 2.5 },
  plainRing: { width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', padding: 2 },
  avatar: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: '#FFF' },
  addBtn: { position: 'absolute', bottom: -1, right: -1, width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  liveBadge: { position: 'absolute', bottom: -5, left: '50%', transform: [{ translateX: -14 }], backgroundColor: Colors.live, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  liveBadgeText: { color: '#FFF', fontSize: 8, fontWeight: '900' },
  name: { color: '#374151', fontSize: 10, fontWeight: '500', textAlign: 'center', width: 62 },
});

const CATEGORIES = [
  { key: 'chatting',   label: 'Chatting',     emoji: '😎', color: '#FF6B9D' },
  { key: 'singing',    label: 'Singing',      emoji: '🎤', color: '#A78BFA' },
  { key: 'esports',    label: 'Esports',      emoji: '🎮', color: '#60A5FA' },
  { key: 'friends',    label: 'Make Friends', emoji: '💞', color: '#F97316' },
  { key: 'dancing',    label: 'Dancing',      emoji: '💃', color: '#EC4899' },
  { key: 'talent',     label: 'Talent',       emoji: '✨', color: '#FBBF24' },
];

const FALLBACK_ROOMS = [
  {
    id: 'room001', title: 'yemeGnu ኮኝን ገኖሩ ቅጹ🇪🇹', hostName: 'yemeGnu',
    hostAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    viewers: 10, isPK: false, isParty: true, category: 'Chatting',
    viewerAvatars: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop','https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop','https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop'],
    extraViewers: 0, isFirstRecharge: false, regionBadge: '',
  },
  {
    id: 'room002', title: '➡➡🔥•munni•🔥°🌀☆🇧🇩', hostName: 'munni',
    hostAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
    viewers: 349, isPK: false, isParty: false, category: 'Chatting',
    viewerAvatars: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?w=40&h=40&fit=crop','https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop'],
    extraViewers: 16, isFirstRecharge: false, regionBadge: '',
  },
  {
    id: 'room003', title: 'রিচাজ দেওয়া হয়🇧🇩', hostName: 'Recharge Girl',
    hostAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
    viewers: 47, isPK: false, isParty: false, category: 'Chatting',
    viewerAvatars: ['https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop'],
    extraViewers: 0, isFirstRecharge: false, regionBadge: 'Region No.1',
  },
  {
    id: 'room004', title: 'Hi come my bord😋🇧🇩', hostName: 'Come My',
    hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    viewers: 515, isPK: false, isParty: false, category: 'Chatting',
    viewerAvatars: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop','https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop','https://images.unsplash.com/photo-1517841905240-472988babdf9?w=40&h=40&fit=crop'],
    extraViewers: 12, isFirstRecharge: false, regionBadge: '',
  },
  {
    id: 'room005', title: 'Big Win Try ❤️🔥🇧🇩', hostName: 'Big Win',
    hostAvatar: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&h=400&fit=crop',
    viewers: 94, isPK: false, isParty: false, category: 'Chatting',
    viewerAvatars: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=40&h=40&fit=crop','https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop','https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop'],
    extraViewers: 14, isFirstRecharge: true, regionBadge: '',
  },
  {
    id: 'room006', title: 'Play now 🇧🇩', hostName: 'Play Now',
    hostAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=400&fit=crop',
    viewers: 213, isPK: true, isParty: false, category: 'Esports',
    viewerAvatars: [], extraViewers: 0, isFirstRecharge: false, regionBadge: '',
  },
  {
    id: 'room007', title: 'Good Morning💯 🇧🇩', hostName: 'Morning Star',
    hostAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop',
    viewers: 144, isPK: false, isParty: false, category: 'Esports',
    viewerAvatars: [], extraViewers: 0, isFirstRecharge: false, regionBadge: '',
  },
  {
    id: 'room008', title: '+♥——A N... 🇧🇩', hostName: 'A N',
    hostAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&h=400&fit=crop',
    viewers: 87, isPK: false, isParty: false, category: 'Chatting',
    viewerAvatars: [], extraViewers: 0, isFirstRecharge: false, regionBadge: '',
  },
  {
    id: 'room009', title: 'উইন 1650 টাকা 🇧🇩', hostName: 'Win 1650',
    hostAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop',
    viewers: 141, isPK: false, isParty: false, category: 'Chatting',
    viewerAvatars: [], extraViewers: 0, isFirstRecharge: false, regionBadge: '',
  },
  {
    id: 'room010', title: 'Sinthiya Parvin 🇧🇩', hostName: 'Sinthiya',
    hostAvatar: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&h=400&fit=crop',
    viewers: 11, isPK: false, isParty: false, category: 'Chatting',
    viewerAvatars: [], extraViewers: 0, isFirstRecharge: false, regionBadge: 'TOP10 Hourly',
  },
  {
    id: 'room011', title: 'Make Friends 😊 🇧🇩', hostName: 'Friends',
    hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=400&h=400&fit=crop',
    viewers: 78, isPK: false, isParty: false, category: 'Make Friends',
    viewerAvatars: [], extraViewers: 0, isFirstRecharge: false, regionBadge: '',
  },
  {
    id: 'room012', title: 'Esports Challenge 🎮', hostName: 'Gamer Pro',
    hostAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&h=400&fit=crop',
    viewers: 432, isPK: true, isParty: false, category: 'Esports',
    viewerAvatars: [], extraViewers: 0, isFirstRecharge: true, regionBadge: '',
  },
];

// ── Invite Friends Banner ──
function InviteFriendsBanner() {
  const router = useRouter();
  return (
    <Pressable style={bannerS.wrap} onPress={() => router.push('/wallet')}>
      <LinearGradient colors={['#D32F5A', '#E84C30']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={bannerS.grad}>
        <View style={bannerS.left}>
          <Text style={bannerS.title}>Invite Friends</Text>
          <View style={bannerS.coinsRow}>
            <Text style={{ fontSize: 15 }}>🪙</Text>
            <Text style={bannerS.coinsText}>Up to  10,500 /invite</Text>
          </View>
          <View style={bannerS.dotsRow}>
            {[0,1,2,3,4,5,6,7,8].map(i => (
              <View key={i} style={[bannerS.dot, i === 0 && bannerS.dotActive]} />
            ))}
          </View>
        </View>
        <View style={bannerS.right}>
          <Text style={{ fontSize: 60 }}>🎁</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
const bannerS = StyleSheet.create({
  wrap: { marginHorizontal: Spacing.md, marginVertical: Spacing.xs, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  grad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, minHeight: 96 },
  left: { flex: 1, gap: 4 },
  title: { color: '#FFF', fontSize: 22, fontWeight: FontWeight.black },
  coinsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coinsText: { color: '#FFE566', fontSize: 15, fontWeight: FontWeight.black },
  dotsRow: { flexDirection: 'row', gap: 4, marginTop: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { backgroundColor: '#FFF', width: 14 },
  right: { paddingLeft: 8 },
});

// ── Event Banner (A Day in My Life, etc.) ──
function EventBanner() {
  const router = useRouter();
  return (
    <Pressable style={evtS.wrap} onPress={() => router.push('/daily-tasks')}>
      <LinearGradient colors={['#F59E0B', '#F97316', '#EF4444']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={evtS.grad}>
        <View style={{ flex: 1 }}>
          <Text style={evtS.title}>A Day in My Life 🎬</Text>
          <Text style={evtS.sub}>15/06/2026 - 29/06/2026 (UTC+8)</Text>
          <View style={evtS.poolRow}>
            <Text style={evtS.poolText}>A 🪙 2,000,000 pool to split!</Text>
          </View>
          <Text style={evtS.claimText}>Share now to claim your reward!</Text>
          <View style={evtS.dotsRow}>
            {[0,1,2,3,4,5,6,7,8].map(i => (
              <View key={i} style={[evtS.dot, i === 3 && evtS.dotActive]} />
            ))}
          </View>
        </View>
        <View style={evtS.rightIllus}>
          <Text style={{ fontSize: 38 }}>📺</Text>
          <Text style={{ fontSize: 26, marginLeft: -8 }}>🎭</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
const evtS = StyleSheet.create({
  wrap: { marginHorizontal: Spacing.md, marginVertical: Spacing.xs, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  grad: { flexDirection: 'row', padding: 16, alignItems: 'center', minHeight: 100 },
  title: { color: '#FFF', fontSize: 16, fontWeight: FontWeight.black, marginBottom: 2 },
  sub: { color: 'rgba(255,255,255,0.75)', fontSize: 10, marginBottom: 4 },
  poolRow: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 3 },
  poolText: { color: '#FFE566', fontSize: 11, fontWeight: FontWeight.bold },
  claimText: { color: 'rgba(255,255,255,0.9)', fontSize: 11 },
  dotsRow: { flexDirection: 'row', gap: 4, marginTop: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { backgroundColor: '#FFF', width: 14 },
  rightIllus: { flexDirection: 'row', alignItems: 'flex-end', marginLeft: 8 },
});

// ── Honor & Activity Centre banners ──
function TopFeatureBanners() {
  const router = useRouter();
  return (
    <View style={featS.row}>
      <Pressable style={featS.honorCard} onPress={() => router.push('/leaderboard')}>
        <LinearGradient colors={['#F97316', '#FBBF24']} style={featS.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={featS.newBadge}><Text style={featS.newBadgeText}>NEW</Text></View>
          <Text style={featS.honorTitle}>Honor</Text>
          <Text style={{ fontSize: 34, position: 'absolute', right: 10, bottom: 6 }}>👑</Text>
        </LinearGradient>
      </Pressable>
      <Pressable style={featS.honorCard} onPress={() => router.push('/daily-tasks')}>
        <LinearGradient colors={['#3B82F6', '#60A5FA']} style={featS.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={featS.actTitle}>Activity{'\n'}Centre</Text>
          <Text style={{ fontSize: 32, position: 'absolute', right: 8, bottom: 6 }}>⭐</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}
const featS = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  honorCard: { flex: 1, height: 78, borderRadius: BorderRadius.lg, overflow: 'hidden', position: 'relative' },
  grad: { flex: 1, padding: Spacing.md, position: 'relative' },
  newBadge: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 3 },
  newBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 1 },
  honorTitle: { color: '#FFF', fontSize: FontSize.xl, fontWeight: FontWeight.black },
  actTitle: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold, lineHeight: 20 },
});

// ── Floating PARTY Button ──
function FloatingPartyBtn({ onPress }: { onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.06, duration: 700, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={[partyS.wrap, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable style={partyS.btn} onPress={onPress}>
        <Text style={{ fontSize: 17 }}>📹</Text>
        <Text style={partyS.text}>PARTY</Text>
      </Pressable>
    </Animated.View>
  );
}
const partyS = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 88, right: 14, zIndex: 50 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F97316', borderRadius: 28, paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 8 },
  text: { color: '#FFF', fontSize: 14, fontWeight: FontWeight.black },
});

// ── First Recharge Floating Badge (shown on top-right of a room card) ──
// ── List Room Card ──
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
          {room.isPK ? <View style={listS.pkTag}><Text style={listS.pkTagText}>PK</Text></View> : null}
        </View>

        {/* Info */}
        <View style={listS.info}>
          {/* Region badge top-right */}
          {room.regionBadge ? (
            <View style={listS.regionAbsolute}>
              {room.regionBadge.includes('No.1') ? (
                <LinearGradient colors={['#F97316', '#EF4444']} style={listS.regionGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={{ fontSize: 9 }}>🏅</Text>
                  <Text style={listS.regionText}>{room.regionBadge}</Text>
                </LinearGradient>
              ) : (
                <LinearGradient colors={['#F97316', '#FBBF24']} style={listS.regionGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={{ fontSize: 9 }}>🔥</Text>
                  <Text style={listS.regionText}>{room.regionBadge}</Text>
                </LinearGradient>
              )}
            </View>
          ) : null}

          <Text style={listS.title} numberOfLines={1}>{room.title}</Text>

          {/* Category tag */}
          <View style={[listS.catTag, { backgroundColor: categoryInfo.color + '20' }]}>
            <Text style={{ fontSize: 13 }}>{categoryInfo.emoji}</Text>
            <Text style={[listS.catText, { color: categoryInfo.color }]}>{room.category || 'Chatting'}</Text>
            {room.isParty ? <Text style={[listS.catText, { color: '#0284C7', marginLeft: 4 }]}>👥 Following's Party is on</Text> : null}
          </View>

          {/* Viewer avatars + count */}
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
              <MaterialIcons name="signal-cellular-alt" size={13} color="#9CA3AF" />
              <Text style={listS.viewerCount}>{room.viewers}</Text>
            </View>
          </View>
        </View>

        {/* First Recharge badge absolute top-right on whole card */}
        {room.isFirstRecharge ? (
          <View style={listS.firstRechargeBadge}>
            <Text style={listS.firstRechargeText}>First Recharge</Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}
const listS = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: BorderRadius.lg, marginHorizontal: Spacing.md, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  inner: { flexDirection: 'row', padding: Spacing.sm, gap: Spacing.sm, alignItems: 'center', position: 'relative' },
  thumbWrap: { width: 100, height: 100, borderRadius: BorderRadius.md, overflow: 'hidden', backgroundColor: '#F3F4F6' },
  thumb: { width: '100%', height: '100%' },
  pkTag: { position: 'absolute', bottom: 5, left: 5, backgroundColor: Colors.live, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  pkTagText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  info: { flex: 1, gap: 5, position: 'relative' },
  title: { color: '#1F2937', fontSize: FontSize.md, fontWeight: FontWeight.bold, lineHeight: 20, paddingRight: 70 },
  catTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.pill },
  catText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  viewerRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  viewerAv: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#FFF' },
  extraCount: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#6B7280', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFF' },
  extraCountText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.bold },
  signalRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto' },
  viewerCount: { color: '#6B7280', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  regionAbsolute: { position: 'absolute', top: 0, right: 0, borderRadius: 6, overflow: 'hidden', zIndex: 2 },
  regionGrad: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3 },
  regionText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.bold },
  firstRechargeBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: '#F97316', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  firstRechargeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.bold },
});

// ── Grid Room Card ──
function GridRoomCard({ room, onPress }: { room: any; onPress: () => void }) {
  const CARD_W = (width - Spacing.md * 2 - Spacing.sm) / 2;

  return (
    <Pressable style={[gridS.card, { width: CARD_W }]} onPress={onPress}>
      <Image source={{ uri: room.thumbnail }} style={[gridS.img, { height: CARD_W * 1.2 }]} contentFit="cover" transition={150} />
      {/* Category badge top-left */}
      <View style={gridS.catBadge}>
        <Text style={gridS.catBadgeText}>{room.category || 'Chatting'}</Text>
      </View>
      {/* TOP10 / Region badge */}
      {room.regionBadge === 'TOP10 Hourly' ? (
        <View style={gridS.top10Badge}>
          <Text style={{ fontSize: 8 }}>🔥</Text>
          <Text style={gridS.top10Text}>TOP10</Text>
          <Text style={gridS.top10Sub}>⏰ Hourly</Text>
        </View>
      ) : null}
      {room.isPK ? <View style={gridS.pkBadge}><Text style={gridS.pkText}>PK</Text></View> : null}
      {/* Bottom info overlay */}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.72)']} style={gridS.bottomGrad}>
        <Text style={gridS.name} numberOfLines={1}>{room.title}</Text>
        <View style={gridS.bottomRow}>
          <MaterialIcons name="signal-cellular-alt" size={11} color="rgba(255,255,255,0.7)" />
          <Text style={gridS.viewCount}>{room.viewers}</Text>
        </View>
      </LinearGradient>
      {/* First Recharge badge */}
      {room.isFirstRecharge ? (
        <View style={gridS.firstRecharge}><Text style={gridS.firstRechargeText}>First Recharge</Text></View>
      ) : null}
      {/* LIVE / PARTY CTA */}
      {room.isParty ? (
        <View style={gridS.liveCta}>
          <Text style={{ fontSize: 11 }}>📹</Text>
          <Text style={gridS.liveCtaText}>PARTY</Text>
        </View>
      ) : (
        <View style={[gridS.liveCta, { backgroundColor: '#FF2E8B' }]}>
          <View style={gridS.liveDot} />
          <Text style={gridS.liveCtaText}>LIVE</Text>
        </View>
      )}
    </Pressable>
  );
}
const gridS = StyleSheet.create({
  card: { borderRadius: BorderRadius.lg, overflow: 'hidden', backgroundColor: '#F3F4F6', position: 'relative' },
  img: { width: '100%' },
  catBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  catBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.bold },
  top10Badge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(249,115,22,0.88)', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 3, alignItems: 'center' },
  top10Text: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  top10Sub: { color: 'rgba(255,255,255,0.85)', fontSize: 7 },
  pkBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.live, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  pkText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  bottomGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8, paddingTop: 20 },
  name: { color: '#FFF', fontSize: 11, fontWeight: FontWeight.bold, marginBottom: 2 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewCount: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: FontWeight.semibold },
  firstRecharge: { position: 'absolute', bottom: 36, right: 6, backgroundColor: '#F97316', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  firstRechargeText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.bold },
  liveCta: { position: 'absolute', bottom: 36, right: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FF2E8B', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveCtaText: { color: '#FFF', fontSize: 10, fontWeight: FontWeight.black },
});

// ── Main Home Screen ──────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<HomeTab>('popular');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [rooms, setRooms] = useState<any[]>(FALLBACK_ROOMS);
  const [refreshing, setRefreshing] = useState(false);
  const tabScrollRef = useRef<ScrollView>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const TAB_DATA: { key: HomeTab; label: string }[] = [
    { key: 'following', label: 'Following' },
    { key: 'popular',   label: 'Popular' },
    { key: 'party',     label: 'Party' },
    { key: 'explore',   label: 'Explore' },
  ];

  useEffect(() => {
    loadRooms();
    pollRef.current = setInterval(loadRooms, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const loadRooms = useCallback(async () => {
    const { data } = await fetchLiveRooms();
    if (data && data.length > 0) {
      const mapped = data.map((r: any, i: number) => ({
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
      case 'party':     return rooms.filter(r => r.isParty || r.isPK);
      case 'following': return rooms.slice(0, 4);
      case 'explore':   return [...rooms].sort((a, b) => b.viewers - a.viewers);
      default:          return rooms;
    }
  };

  const filtered = getFilteredRooms();

  // Build list items with banners injected
  const renderListItems = () => {
    const items: JSX.Element[] = [];
    filtered.forEach((room, i) => {
      if (i === 4) items.push(<InviteFriendsBanner key="invite-banner" />);
      if (i === 7) items.push(<EventBanner key="event-banner" />);
      items.push(
        <ListRoomCard key={room.id} room={room} onPress={() => router.push(`/live/${room.id}` as any)} />
      );
    });
    return items;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Floating PARTY button */}
      {activeTab === 'popular' || activeTab === 'party' ? (
        <FloatingPartyBtn onPress={() => router.push('/go-live')} />
      ) : null}

      {/* ── Top Nav ── */}
      <View style={styles.topNav}>
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
          style={styles.tabsScroll}
        >
          {TAB_DATA.map(tab => (
            <Pressable key={tab.key} style={styles.tabItem} onPress={() => setActiveTab(tab.key)}>
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {activeTab === tab.key ? <View style={styles.tabLine} /> : null}
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.topNavRight}>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/search')}>
            <MaterialIcons name="search" size={24} color="#374151" />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/leaderboard')}>
            <Text style={{ fontSize: 22 }}>🏆</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Feed ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Stories Ring — shown on popular/following tabs */}
        {(activeTab === 'popular' || activeTab === 'following') ? (
          <StoriesRing
            onCreateStory={() => router.push('/go-live')}
            onViewStory={(uid) => router.push(`/stories` as any)}
          />
        ) : null}

        {(activeTab === 'popular' || activeTab === 'explore') ? (
          <>
            <TopFeatureBanners />
            <View style={styles.viewToggleRow}>
              <View style={styles.liveCountRow}>
                <View style={styles.liveDot} />
                <Text style={styles.roomCountText}>{filtered.length} Live Rooms</Text>
              </View>
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
              <>
                <View style={styles.gridContainer}>
                  {filtered.slice(0, 4).map(room => (
                    <GridRoomCard key={room.id} room={room} onPress={() => router.push(`/live/${room.id}` as any)} />
                  ))}
                </View>
                <EventBanner />
                <View style={styles.gridContainer}>
                  {filtered.slice(4).map(room => (
                    <GridRoomCard key={room.id} room={room} onPress={() => router.push(`/live/${room.id}` as any)} />
                  ))}
                </View>
              </>
            ) : (
              <View>{renderListItems()}</View>
            )}
          </>
        ) : activeTab === 'following' ? (
          <>
            <View style={styles.followingEmpty}>
              <Text style={{ fontSize: 36 }}>👥</Text>
              <Text style={styles.followingTitle}>Follow people to see their streams</Text>
              <Text style={styles.followingSub}>Discover new hosts and follow them!</Text>
              <Pressable style={styles.discoverBtn} onPress={() => router.push('/search')}>
                <Text style={styles.discoverBtnText}>Discover People</Text>
              </Pressable>
            </View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Suggested for You</Text>
            </View>
            {FALLBACK_ROOMS.slice(0, 5).map(room => (
              <ListRoomCard key={room.id} room={room} onPress={() => router.push(`/live/${room.id}` as any)} />
            ))}
          </>
        ) : (
          // Party tab
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.liveDotRow}><View style={styles.liveDot} /><Text style={styles.sectionTitle}>Party Rooms 🎉</Text></View>
            </View>
            {rooms.filter(r => r.isParty || r.isPK).length === 0 ? (
              <View style={styles.followingEmpty}>
                <Text style={{ fontSize: 40 }}>🎉</Text>
                <Text style={styles.followingTitle}>No party rooms right now</Text>
                <Pressable style={styles.discoverBtn} onPress={() => router.push('/go-live')}>
                  <Text style={styles.discoverBtnText}>Start a Party</Text>
                </Pressable>
              </View>
            ) : null}
            {rooms.map(room => (
              <ListRoomCard key={room.id} room={room} onPress={() => router.push(`/live/${room.id}` as any)} />
            ))}
          </>
        )}

        {/* Quick Nav */}
        <View style={styles.quickNavRow}>
          {[
            { icon: '⚔️', label: 'PK Battle',  color: Colors.live,    route: '/pk-invite/preview' },
            { icon: '🎮', label: 'Games',       color: Colors.gold,    route: '/games' },
            { icon: '🎯', label: 'Daily Tasks', color: Colors.success, route: '/daily-tasks' },
            { icon: '💸', label: 'Withdraw',    color: Colors.diamond, route: '/withdrawal' },
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
  topNav: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingRight: Spacing.xs },
  tabsScroll: { flex: 1 },
  tabsContent: { paddingHorizontal: Spacing.sm, paddingTop: Spacing.xs, alignItems: 'center' },
  tabItem: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, alignItems: 'center', position: 'relative' },
  tabText: { fontSize: FontSize.md, color: '#9CA3AF', fontWeight: FontWeight.medium },
  tabTextActive: { color: '#111827', fontWeight: FontWeight.bold, fontSize: FontSize.lg },
  tabLine: { position: 'absolute', bottom: 0, left: Spacing.md, right: Spacing.md, height: 3, backgroundColor: Colors.primary, borderRadius: 2 },
  topNavRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 24 },
  viewToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: '#FFF', marginBottom: Spacing.xs, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  liveCountRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.live },
  roomCountText: { color: '#6B7280', fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  viewToggle: { flexDirection: 'row', gap: 2, backgroundColor: '#F3F4F6', borderRadius: BorderRadius.sm, padding: 2 },
  viewToggleBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 5 },
  viewToggleBtnActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.md, gap: Spacing.sm, paddingTop: Spacing.sm },
  followingEmpty: { alignItems: 'center', paddingVertical: Spacing.xl, paddingHorizontal: Spacing.xl, gap: Spacing.sm, backgroundColor: '#FFF', marginHorizontal: Spacing.md, marginBottom: Spacing.md, borderRadius: BorderRadius.lg },
  followingTitle: { color: '#111827', fontSize: FontSize.md, fontWeight: FontWeight.bold, textAlign: 'center' },
  followingSub: { color: '#6B7280', fontSize: FontSize.xs, textAlign: 'center' },
  discoverBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, marginTop: Spacing.sm },
  discoverBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  sectionHeader: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs, paddingTop: Spacing.sm },
  sectionTitle: { color: '#111827', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  liveDotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quickNavRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginTop: Spacing.md, marginBottom: Spacing.sm },
  qNavCard: { flex: 1, backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: Spacing.sm, alignItems: 'center', gap: 4, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  qNavLabel: { fontSize: 9, fontWeight: FontWeight.bold, textAlign: 'center' },
});
