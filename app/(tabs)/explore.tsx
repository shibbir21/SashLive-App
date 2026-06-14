// SashLive — Discover/Video Feed (PoppoLive "Discover" tab — TikTok-style vertical video + Square feed)
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions,
  FlatList, ScrollView, TextInput, Animated, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

type FeedTab = 'following' | 'square' | 'video' | 'hot';

// ─── Mock Video/Reel Data ───────────────────────────────────────────────
const MOCK_VIDEOS = [
  {
    id: 'v1',
    thumbnail: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600&h=900&fit=crop',
    user: { name: '🌟 sweet poison🔥', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop', isVip: true },
    likes: 1, comments: 0, gifts: 0, shares: 0, caption: 'তাহলে আপনি আমার কি হবেন',
    fromFollowing: true,
  },
  {
    id: 'v2',
    thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=900&fit=crop',
    user: { name: 'CosmicRider 🎤', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop', isVip: false },
    likes: 48, comments: 5, gifts: 3, shares: 2, caption: 'Night vibes only 🌙✨',
    fromFollowing: false,
  },
  {
    id: 'v3',
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=900&fit=crop',
    user: { name: 'StarKing 👑', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop', isVip: true },
    likes: 234, comments: 19, gifts: 12, shares: 8, caption: 'Dance challenge time! 💃🎶',
    fromFollowing: true,
  },
  {
    id: 'v4',
    thumbnail: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=600&h=900&fit=crop',
    user: { name: 'RoseQueen 🌹', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop', isVip: false },
    likes: 567, comments: 44, gifts: 28, shares: 15, caption: 'Good morning everyone 🌸',
    fromFollowing: false,
  },
  {
    id: 'v5',
    thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&h=900&fit=crop',
    user: { name: 'NightOwl 🦉', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop', isVip: true },
    likes: 1203, comments: 88, gifts: 55, shares: 32, caption: 'Party never stops 🎉🔥',
    fromFollowing: true,
  },
];

// ─── Square post grid data ───────────────────────────────────────────────
const SQUARE_POSTS = [
  { id: 's1', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop', likes: 203, user: 'Luna' },
  { id: 's2', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&h=300&fit=crop', likes: 87,  user: 'Max' },
  { id: 's3', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop', likes: 451, user: 'Mia' },
  { id: 's4', img: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=300&h=300&fit=crop', likes: 678, user: 'Kai' },
  { id: 's5', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop', likes: 129, user: 'Zara' },
  { id: 's6', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop', likes: 342, user: 'Leo' },
  { id: 's7', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop', likes: 895, user: 'Nova' },
  { id: 's8', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop', likes: 227, user: 'Eli' },
  { id: 's9', img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop', likes: 543, user: 'Ivy' },
];

// ─── Floating treasure chest ───────────────────────────────────────────
function TreasureChest({ onPress }: { onPress: () => void }) {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(bounceAnim, { toValue: -8, duration: 600, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <Animated.View style={[tchS.wrap, { transform: [{ translateY: bounceAnim }] }]}>
      <Pressable onPress={onPress} hitSlop={8}>
        <Text style={{ fontSize: 36 }}>🎁</Text>
      </Pressable>
    </Animated.View>
  );
}
const tchS = StyleSheet.create({ wrap: { position: 'absolute', top: 160, right: 16, zIndex: 20 } });

// ─── Single Video Item ───────────────────────────────────────────────────
function VideoItem({ item, isActive, onUserPress }: { item: typeof MOCK_VIDEOS[0]; isActive: boolean; onUserPress: () => void }) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const heartAnim = useRef(new Animated.Value(0)).current;
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
      {/* Thumbnail / Video */}
      <Image source={{ uri: item.thumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={100} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={vidS.bottomGrad} />
      <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent']} style={vidS.topGrad} />

      {/* From following label */}
      {item.fromFollowing ? (
        <View style={vidS.fromLabel}>
          <Text style={vidS.fromText}>From following</Text>
        </View>
      ) : null}

      {/* Full Screen button */}
      <Pressable style={vidS.fullScreenBtn} onPress={() => router.push(`/reels` as any)}>
        <MaterialIcons name="crop-free" size={16} color="#FFF" />
        <Text style={vidS.fullScreenText}>Full Screen</Text>
      </Pressable>

      {/* Right action buttons */}
      <View style={vidS.actions}>
        {/* Like */}
        <Pressable style={vidS.actionItem} onPress={triggerHeart}>
          <Animated.View style={{ transform: [{ scale: heartAnim.interpolate({ inputRange: [0, 1, 1.4], outputRange: [1, 1, 1.4] }) }] }}>
            <MaterialIcons name={liked ? 'favorite' : 'favorite-border'} size={32} color={liked ? '#FF4D6D' : '#FFF'} />
          </Animated.View>
          <Text style={vidS.actionCount}>{fmtNum(item.likes + (liked ? 1 : 0))}</Text>
        </Pressable>

        {/* Comment */}
        <Pressable style={vidS.actionItem} onPress={() => {}}>
          <View style={vidS.commentIcon}>
            <MaterialIcons name="chat-bubble" size={28} color="#FFF" />
          </View>
          <Text style={vidS.actionCount}>{fmtNum(item.comments)}</Text>
        </Pressable>

        {/* Gift */}
        <Pressable style={vidS.actionItem} onPress={() => {}}>
          <View style={vidS.giftIconWrap}>
            <Text style={{ fontSize: 28 }}>🎁</Text>
          </View>
          <Text style={vidS.actionCount}>{fmtNum(item.gifts)}</Text>
        </Pressable>

        {/* Share */}
        <Pressable style={vidS.actionItem} onPress={() => {}}>
          <MaterialIcons name="reply" size={30} color="#FFF" style={{ transform: [{ scaleX: -1 }] }} />
          <Text style={vidS.actionCount}>{fmtNum(item.shares)}</Text>
        </Pressable>
      </View>

      {/* Bottom user info */}
      <View style={vidS.bottomInfo}>
        <Pressable style={vidS.userRow} onPress={onUserPress}>
          <View style={vidS.avatarWrap}>
            <Image source={{ uri: item.user.avatar }} style={vidS.avatar} contentFit="cover" />
            {item.user.isVip ? <View style={vidS.vipDot}><Text style={{ fontSize: 6, color: '#FFF' }}>⭐</Text></View> : null}
          </View>
          <Text style={vidS.userName}>{item.user.name}</Text>
        </Pressable>
        <Text style={vidS.caption} numberOfLines={2}>{item.caption}</Text>
      </View>
    </View>
  );
}

const vidS = StyleSheet.create({
  bottomGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 300 },
  topGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  fromLabel: { position: 'absolute', bottom: 100, left: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  fromText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500' },
  fullScreenBtn: { position: 'absolute', bottom: 155, left: '50%', transform: [{ translateX: -60 }], flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  fullScreenText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  actions: { position: 'absolute', right: 12, bottom: 100, gap: 18, alignItems: 'center' },
  actionItem: { alignItems: 'center', gap: 4 },
  actionCount: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  commentIcon: {},
  giftIconWrap: {},
  bottomInfo: { position: 'absolute', bottom: 16, left: 16, right: 70 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: '#FFF' },
  vipDot: { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFB800', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFF' },
  userName: { color: '#FFF', fontSize: 14, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  caption: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 18 },
});

// ─── Hot / Trending Feed ─────────────────────────────────────────────────
function HotFeed({ onVideoPress }: { onVideoPress: (id: string) => void }) {
  const CARD_W = (width - 48) / 2;
  const hotItems = [...MOCK_VIDEOS].sort((a, b) => b.likes - a.likes);
  return (
    <ScrollView contentContainerStyle={hotS.grid} showsVerticalScrollIndicator={false}>
      <Text style={hotS.sectionTitle}>🔥 Trending Now</Text>
      <View style={hotS.row}>
        {hotItems.map(v => (
          <Pressable key={v.id} style={[hotS.card, { width: CARD_W }]} onPress={() => onVideoPress(v.id)}>
            <Image source={{ uri: v.thumbnail }} style={[hotS.img, { height: CARD_W * 1.4 }]} contentFit="cover" />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={StyleSheet.absoluteFillObject} />
            <View style={hotS.cardBottom}>
              <Text style={hotS.cardUser} numberOfLines={1}>{v.user.name}</Text>
              <View style={hotS.cardLikes}>
                <MaterialIcons name="favorite" size={10} color="#FF4D6D" />
                <Text style={hotS.cardLikesText}>{v.likes >= 1000 ? `${(v.likes / 1000).toFixed(1)}K` : v.likes}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
const hotS = StyleSheet.create({
  grid: { padding: 16, paddingBottom: 80 },
  sectionTitle: { color: '#1F2937', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { borderRadius: 12, overflow: 'hidden', position: 'relative', backgroundColor: '#F3F4F6' },
  img: { width: '100%' },
  cardBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8 },
  cardUser: { color: '#FFF', fontSize: 11, fontWeight: '600', marginBottom: 3 },
  cardLikes: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardLikesText: { color: 'rgba(255,255,255,0.8)', fontSize: 10 },
});

// ─── Square / Following Grid ─────────────────────────────────────────────
function SquareFeed({ onPostPress }: { onPostPress: (id: string) => void }) {
  const TILE = (width - 4) / 3;
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
        {SQUARE_POSTS.map(post => (
          <Pressable key={post.id} onPress={() => onPostPress(post.id)}>
            <Image source={{ uri: post.img }} style={{ width: TILE, height: TILE }} contentFit="cover" />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Main Explore Screen ─────────────────────────────────────────────────
export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<FeedTab>('video');
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const [showChest, setShowChest] = useState(true);
  const flatRef = useRef<FlatList>(null);

  const ITEM_H = height - 120;

  const TABS: { key: FeedTab; label: string }[] = [
    { key: 'following', label: 'Following' },
    { key: 'square',    label: 'Square' },
    { key: 'video',     label: 'Video' },
    { key: 'hot',       label: 'Hot' },
  ];

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveVideoIdx(viewableItems[0].index ?? 0);
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  // ── Video tab ──────────────────────────────────────────────────────────
  const renderVideoFeed = () => (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <FlatList
        ref={flatRef}
        data={MOCK_VIDEOS}
        keyExtractor={v => v.id}
        renderItem={({ item, index }) => (
          <VideoItem
            item={item}
            isActive={index === activeVideoIdx}
            onUserPress={() => router.push(`/user/${item.id}` as any)}
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

      {/* Floating treasure chest */}
      {showChest ? (
        <View style={{ position: 'absolute', top: 60, right: 14, zIndex: 30 }}>
          <View style={chestS.wrap}>
            <Pressable onPress={() => { setShowChest(false); }} style={chestS.closeBtn} hitSlop={6}>
              <Text style={{ fontSize: 10, color: '#FFF' }}>✕</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/daily-tasks')}>
              <Text style={{ fontSize: 42 }}>🎁</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: activeTab === 'video' ? '#000' : '#F9FAFB' }}>
      {/* ── Header / Tab bar ── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: activeTab === 'video' ? 'transparent' : '#FFF', zIndex: 10 }}>
        <View style={[
          hdrS.bar,
          activeTab === 'video' && hdrS.barDark,
        ]}>
          {/* Tabs */}
          <View style={hdrS.tabs}>
            {TABS.map(tab => (
              <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={hdrS.tabItem}>
                <Text style={[hdrS.tabText, activeTab === tab.key && hdrS.tabTextActive]}>
                  {tab.label}
                </Text>
                {activeTab === tab.key ? <View style={hdrS.tabLine} /> : null}
              </Pressable>
            ))}
          </View>

          {/* Right icons */}
          <View style={hdrS.right}>
            <Pressable onPress={() => router.push('/search')} style={hdrS.iconBtn}>
              <MaterialIcons name="search" size={24} color={activeTab === 'video' ? '#FFF' : '#374151'} />
            </Pressable>
            {activeTab === 'video' ? (
              <Pressable onPress={() => router.push('/go-live')} style={hdrS.iconBtn}>
                <MaterialIcons name="photo-camera" size={24} color="#FFF" />
              </Pressable>
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      {/* ── Content ── */}
      {activeTab === 'video' && renderVideoFeed()}
      {activeTab === 'hot' && (
        <HotFeed onVideoPress={(id) => {
          setActiveTab('video');
          const idx = MOCK_VIDEOS.findIndex(v => v.id === id);
          if (idx >= 0) {
            setActiveVideoIdx(idx);
            setTimeout(() => flatRef.current?.scrollToIndex({ index: idx, animated: false }), 50);
          }
        }} />
      )}
      {activeTab === 'square' && <SquareFeed onPostPress={() => {}} />}
      {activeTab === 'following' && (
        <View style={folS.container}>
          <View style={folS.emptyWrap}>
            <Text style={{ fontSize: 52 }}>🎬</Text>
            <Text style={folS.emptyTitle}>No videos from following yet</Text>
            <Text style={folS.emptySub}>Follow creators to see their latest videos here</Text>
            <Pressable style={folS.discBtn} onPress={() => router.push('/search')}>
              <Text style={folS.discBtnText}>Discover Creators</Text>
            </Pressable>
          </View>
          <Text style={folS.suggTitle}>Suggested for You</Text>
          <SquareFeed onPostPress={() => setActiveTab('video')} />
        </View>
      )}
    </View>
  );
}

const hdrS = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', height: 46 },
  barDark: { backgroundColor: 'transparent', borderBottomWidth: 0 },
  tabs: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  tabItem: { paddingHorizontal: 12, paddingVertical: 8, position: 'relative', alignItems: 'center' },
  tabText: { fontSize: 15, color: 'rgba(150,150,150,0.9)', fontWeight: '500' },
  tabTextActive: { color: '#1F2937', fontWeight: '700', fontSize: 16 },
  tabLine: { position: 'absolute', bottom: 0, width: '80%', height: 2.5, backgroundColor: '#1F2937', borderRadius: 2 },
  right: { flexDirection: 'row', alignItems: 'center', paddingRight: 4 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});

const chestS = StyleSheet.create({
  wrap: { alignItems: 'center', position: 'relative' },
  closeBtn: { position: 'absolute', top: -4, right: -4, zIndex: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
});

const folS = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  emptyWrap: { alignItems: 'center', padding: 32, gap: 8 },
  emptyTitle: { color: '#1F2937', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptySub: { color: '#6B7280', fontSize: 13, textAlign: 'center' },
  discBtn: { backgroundColor: '#FF2E8B', borderRadius: 24, paddingHorizontal: 24, paddingVertical: 10, marginTop: 8 },
  discBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  suggTitle: { color: '#1F2937', fontSize: 16, fontWeight: '700', paddingHorizontal: 16, paddingBottom: 8 },
});
