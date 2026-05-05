// SashLive — Leaderboard with Real Supabase Data + Animated Rank Indicators
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, FlatList,
  Animated, ActivityIndicator, Dimensions, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/template';
import {
  fetchTopGifters, fetchTopHosts, fetchTopAgencies,
  pointsToUSD, POINTS_PER_DOLLAR,
} from '@/services/earningService';
import { formatLastSeen } from '@/services/presenceService';

const { width } = Dimensions.get('window');

type Period = 'day' | 'week' | 'month';
type BoardType = 'gifters' | 'hosts' | 'agencies';

// ── Mock fallback data ──
const MOCK_GIFTERS = [
  { rank:1, user_id:'u005', username:'CosmicRider',   display_name:'Cosmic Rider',    avatar_url:'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop', vip_level:4, total_diamonds:128400 },
  { rank:2, user_id:'u007', username:'GalaxyGoddess', display_name:'Galaxy Goddess',  avatar_url:'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop', vip_level:5, total_diamonds:98200  },
  { rank:3, user_id:'u009', username:'RoseQueen',     display_name:'Rose Queen',      avatar_url:'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', vip_level:5, total_diamonds:76800  },
  { rank:4, user_id:'u002', username:'DragonFire',    display_name:'Dragon Fire',     avatar_url:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', vip_level:3, total_diamonds:54300  },
  { rank:5, user_id:'u006', username:'NeonPulse',     display_name:'Neon Pulse',      avatar_url:'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', vip_level:2, total_diamonds:42100  },
  { rank:6, user_id:'u003', username:'Moonlight',     display_name:'Moonlight',       avatar_url:'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', vip_level:2, total_diamonds:31200  },
  { rank:7, user_id:'u008', username:'StarKing',      display_name:'Star King',       avatar_url:'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop', vip_level:3, total_diamonds:22900  },
];
const MOCK_HOSTS = [
  { rank:1, host_id:'u007', username:'GalaxyGoddess', display_name:'Galaxy Goddess', avatar_url:'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop', vip_level:5, total_diamonds:340200, total_viewers:18900 },
  { rank:2, host_id:'u009', username:'RoseQueen',     display_name:'Rose Queen',     avatar_url:'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', vip_level:5, total_diamonds:278100, total_viewers:12300 },
  { rank:3, host_id:'u005', username:'CosmicRider',   display_name:'Cosmic Rider',   avatar_url:'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop', vip_level:4, total_diamonds:210600, total_viewers:9800  },
  { rank:4, host_id:'u006', username:'NeonPulse',     display_name:'Neon Pulse',     avatar_url:'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', vip_level:2, total_diamonds:143000, total_viewers:7200  },
  { rank:5, host_id:'u002', username:'DragonFire',    display_name:'Dragon Fire',    avatar_url:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', vip_level:3, total_diamonds:98500,  total_viewers:4500  },
];
const MOCK_AGENCIES = [
  { rank:1, agent_id:'a1', agency_name:'StarLight Agency', avatar_url:'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=100&h=100&fit=crop', host_count:24, total_earned:890000 },
  { rank:2, agent_id:'a2', agency_name:'Diamond Circle',   avatar_url:'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=100&h=100&fit=crop', host_count:18, total_earned:620000 },
  { rank:3, agent_id:'a3', agency_name:'Golden Network',   avatar_url:'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=100&h=100&fit=crop', host_count:12, total_earned:430000 },
];

// ── Animated rank row ──
function RankRow({
  rank, avatar, name, sub, value, index, onPress, isMe,
}: {
  rank: number; avatar: string; name: string; sub: string;
  value: string; index: number; onPress?: () => void; isMe?: boolean;
}) {
  const slideAnim = useRef(new Animated.Value(80)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const rankColors: Record<number, string> = { 1: Colors.gold, 2: '#C0C0C0', 3: '#CD7F32' };
  const rankIcons: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
      <Pressable
        style={[S.rankRow, isMe && S.rankRowMe, { borderLeftWidth: rank <= 3 ? 3 : 0, borderLeftColor: rankColors[rank] || 'transparent' }]}
        onPress={onPress}
      >
        <View style={S.rankNumWrap}>
          {rank <= 3 ? (
            <Text style={{ fontSize: 20 }}>{rankIcons[rank]}</Text>
          ) : (
            <Text style={[S.rankNum, rank <= 10 && { color: Colors.primary }]}>#{rank}</Text>
          )}
        </View>
        <Image source={{ uri: avatar }} style={[S.rankAv, rank === 1 && { borderColor: Colors.gold, borderWidth: 2.5 }, rank === 2 && { borderColor: '#C0C0C0', borderWidth: 2 }]} contentFit="cover" />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={[S.rankName, isMe && { color: Colors.primary }]} numberOfLines={1}>{name}</Text>
            {isMe && <View style={S.meBadge}><Text style={S.meBadgeText}>YOU</Text></View>}
          </View>
          <Text style={S.rankSub} numberOfLines={1}>{sub}</Text>
        </View>
        <Text style={[S.rankVal, rank === 1 && { color: Colors.gold }, rank === 2 && { color: '#C0C0C0' }, rank === 3 && { color: '#CD7F32' }]}>
          {value}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ── Podium (top 3) ──
function Podium({ top3, type }: { top3: any[]; type: BoardType }) {
  const scaleAnims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  const order = [1, 0, 2]; // 2nd, 1st, 3rd

  useEffect(() => {
    order.forEach((i, idx) => {
      Animated.spring(scaleAnims[i], {
        toValue: 1,
        delay: idx * 150,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }).start();
    });
  }, [top3]);

  const getVal = (item: any) => {
    if (!item) return '0';
    if (type === 'gifters') return `💎${fmtNum(item.total_diamonds)}`;
    if (type === 'hosts') return `💎${fmtNum(item.total_diamonds)}`;
    return `${fmtNum(item.host_count)} hosts`;
  };

  const getName = (item: any) => {
    if (!item) return '---';
    return item.display_name || item.username || item.agency_name || '---';
  };

  const getAvatar = (item: any) => item?.avatar_url || '';

  const HEIGHTS = [100, 130, 80];
  const SIZES = [62, 80, 56];
  const BORDER_COLORS = ['#C0C0C0', Colors.gold, '#CD7F32'];
  const CROWNS = ['🥈', '👑', '🥉'];
  const BG_COLORS = ['#C0C0C0', Colors.gold, '#CD7F32'];

  const DISPLAY_ORDER = [1, 0, 2];

  return (
    <View style={S.podiumWrap}>
      {DISPLAY_ORDER.map((rankIdx) => {
        const item = top3[rankIdx];
        const displayRank = rankIdx + 1;
        return (
          <Animated.View key={rankIdx} style={[S.podiumCol, { transform: [{ scale: scaleAnims[rankIdx] }] }]}>
            {displayRank === 1 && <Text style={S.podiumCrownFloat}>👑</Text>}
            <Image source={{ uri: getAvatar(item) }} style={[S.podiumAv, {
              width: SIZES[rankIdx], height: SIZES[rankIdx], borderRadius: SIZES[rankIdx] / 2,
              borderWidth: displayRank === 1 ? 3 : 2, borderColor: BORDER_COLORS[rankIdx],
            }]} contentFit="cover" />
            <Text style={{ fontSize: displayRank === 1 ? 22 : 18 }}>{CROWNS[rankIdx]}</Text>
            <Text style={[S.podiumName, displayRank === 1 && { color: Colors.gold }]} numberOfLines={1}>
              {getName(item)}
            </Text>
            <Text style={[S.podiumVal, { color: BG_COLORS[rankIdx] }]}>{getVal(item)}</Text>
            <View style={[S.podiumBase, { height: HEIGHTS[rankIdx], backgroundColor: BG_COLORS[rankIdx] + '25' }]}>
              <Text style={[S.podiumRankNum, { color: BG_COLORS[rankIdx] }]}>{displayRank}</Text>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

function fmtNum(n: number): string {
  if (!n) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const { user } = useAuth();

  const [period, setPeriod] = useState<Period>('week');
  const [boardType, setBoardType] = useState<BoardType>('gifters');
  const [gifters, setGifters] = useState<any[]>(MOCK_GIFTERS);
  const [hosts, setHosts] = useState<any[]>(MOCK_HOSTS);
  const [agencies, setAgencies] = useState<any[]>(MOCK_AGENCIES);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const tabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(tabAnim, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }),
    ]).start();
    loadData();
  }, [period, boardType]);

  const loadData = async () => {
    setLoading(true);
    const [gifterRes, hostRes, agencyRes] = await Promise.all([
      fetchTopGifters(period),
      fetchTopHosts(period),
      fetchTopAgencies(period),
    ]);
    if (gifterRes.data.length > 0) setGifters(gifterRes.data);
    if (hostRes.data.length > 0) setHosts(hostRes.data);
    if (agencyRes.data.length > 0) setAgencies(agencyRes.data);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getActiveData = () => {
    if (boardType === 'gifters') return gifters;
    if (boardType === 'hosts') return hosts;
    return agencies;
  };

  const data = getActiveData();
  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  const getRowName = (item: any) =>
    item.display_name || item.username || item.agency_name || 'User';

  const getRowSub = (item: any) => {
    if (boardType === 'gifters') return `VIP ${item.vip_level || 0} · Top gifter`;
    if (boardType === 'hosts') return `👁 ${fmtNum(item.total_viewers)} viewers`;
    return `${item.host_count} active hosts`;
  };

  const getRowValue = (item: any) => {
    if (boardType === 'gifters') return `💎 ${fmtNum(item.total_diamonds)}`;
    if (boardType === 'hosts') return `💎 ${fmtNum(item.total_diamonds)}`;
    return `${fmtNum(item.total_earned)} pts`;
  };

  const getRowAvatar = (item: any) => item.avatar_url || '';
  const getRowId = (item: any) => item.user_id || item.host_id || item.agent_id || '';
  const getRowRank = (item: any) => item.rank || 0;

  // Determine current user's rank
  const myId = user?.id;
  const myRank = data.findIndex(d => getRowId(d) === myId);
  const myPoints = currentUser.points;

  // Board type configs
  const BOARD_TABS = [
    { key: 'gifters',  label: '🎁 Gifters',  desc: 'Top diamond senders' },
    { key: 'hosts',    label: '🎤 Hosts',    desc: 'Top earners this period' },
    { key: 'agencies', label: '🏢 Agencies', desc: 'Top agencies by commission' },
  ] as const;

  const PERIOD_LABELS: Record<Period, string> = { day: 'Today', week: 'This Week', month: 'This Month' };

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      {/* Header */}
      <Animated.View style={[S.header, { opacity: headerAnim }]}>
        <Pressable onPress={() => router.back()} style={S.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <View>
          <Text style={S.title}>🏆 Leaderboard</Text>
          <Text style={S.subtitle}>{PERIOD_LABELS[period]}</Text>
        </View>
        <Pressable style={S.headerBtn} onPress={() => router.push('/daily-tasks')}>
          <Text style={{ fontSize: 22 }}>🎯</Text>
        </Pressable>
      </Animated.View>

      {/* Board type tabs */}
      <Animated.View style={[S.boardTabs, { opacity: tabAnim, transform: [{ translateY: tabAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
        {BOARD_TABS.map(t => (
          <Pressable key={t.key} style={[S.boardTab, boardType === t.key && S.boardTabActive]} onPress={() => setBoardType(t.key)}>
            <Text style={[S.boardTabText, boardType === t.key && S.boardTabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </Animated.View>

      {/* Period selector */}
      <View style={S.periodRow}>
        {(['day', 'week', 'month'] as Period[]).map(p => (
          <Pressable key={p} style={[S.periodBtn, period === p && S.periodBtnActive]} onPress={() => setPeriod(p)}>
            <Text style={[S.periodBtnText, period === p && S.periodBtnTextActive]}>
              {p === 'day' ? '📅 Today' : p === 'week' ? '📆 Week' : '🗓 Month'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading && !refreshing ? (
          <View style={S.loadingWrap}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={S.loadingText}>Loading rankings...</Text>
          </View>
        ) : (
          <>
            {/* Podium top 3 */}
            {top3.length >= 3 && (
              <View style={S.podiumSection}>
                <Podium top3={top3} type={boardType} />
              </View>
            )}

            {/* Stats banner */}
            <View style={S.statsBanner}>
              <View style={S.statsBannerItem}>
                <Text style={[S.statsBannerVal, { color: Colors.gold }]}>{myPoints.toLocaleString()}</Text>
                <Text style={S.statsBannerLabel}>Your Points</Text>
              </View>
              <View style={S.statsBannerDiv} />
              <View style={S.statsBannerItem}>
                <Text style={[S.statsBannerVal, { color: Colors.primary }]}>
                  {myRank >= 0 ? `#${myRank + 1}` : '--'}
                </Text>
                <Text style={S.statsBannerLabel}>Your Rank</Text>
              </View>
              <View style={S.statsBannerDiv} />
              <View style={S.statsBannerItem}>
                <Text style={[S.statsBannerVal, { color: Colors.success }]}>
                  ${pointsToUSD(myPoints).toFixed(2)}
                </Text>
                <Text style={S.statsBannerLabel}>USD Value</Text>
              </View>
            </View>

            {/* Earn CTA */}
            <View style={S.earnRow}>
              <Pressable style={S.earnBtn} onPress={() => router.push('/daily-tasks')}>
                <Text style={{ fontSize: 20 }}>🎯</Text>
                <Text style={S.earnBtnText}>Earn Points</Text>
              </Pressable>
              <Pressable style={[S.earnBtn, { borderColor: Colors.secondary + '50', backgroundColor: Colors.secondary + '15' }]} onPress={() => router.push('/go-live')}>
                <Text style={{ fontSize: 20 }}>🎤</Text>
                <Text style={[S.earnBtnText, { color: Colors.secondary }]}>Go Live</Text>
              </Pressable>
              <Pressable style={[S.earnBtn, { borderColor: Colors.gold + '50', backgroundColor: Colors.gold + '15' }]} onPress={() => router.push('/withdrawal')}>
                <Text style={{ fontSize: 20 }}>💵</Text>
                <Text style={[S.earnBtnText, { color: Colors.gold }]}>Withdraw</Text>
              </Pressable>
            </View>

            {/* Rankings list (4th onward) */}
            {rest.length > 0 && (
              <View style={S.listSection}>
                <Text style={S.listTitle}>Rankings</Text>
                {rest.map((item, i) => (
                  <RankRow
                    key={getRowId(item) || i}
                    rank={getRowRank(item)}
                    avatar={getRowAvatar(item)}
                    name={getRowName(item)}
                    sub={getRowSub(item)}
                    value={getRowValue(item)}
                    index={i}
                    onPress={() => { if (boardType !== 'agencies') router.push(`/user/${getRowId(item)}`); }}
                    isMe={getRowId(item) === myId}
                  />
                ))}
              </View>
            )}

            {data.length === 0 && (
              <View style={S.emptyWrap}>
                <Text style={{ fontSize: 48 }}>🏆</Text>
                <Text style={S.emptyTitle}>No data yet</Text>
                <Text style={S.emptySub}>Be the first to earn points for this period!</Text>
                <Pressable style={S.emptyBtn} onPress={() => router.push('/go-live')}>
                  <Text style={S.emptyBtnText}>🎤 Go Live Now</Text>
                </Pressable>
              </View>
            )}

            {/* Earning Guide */}
            <View style={S.earningGuide}>
              <Text style={S.guideTitle}>💡 Earning Guide</Text>
              <View style={S.guideGrid}>
                {[
                  { icon: '🎤', label: 'Stream 1hr', pts: '+2,000 pts' },
                  { icon: '🎁', label: 'Receive Gift', pts: '+70% value' },
                  { icon: '⚔️', label: 'Win PK', pts: '+5,000 pts' },
                  { icon: '📹', label: 'Video Call', pts: '+800/min' },
                  { icon: '🎯', label: 'Daily Tasks', pts: 'Up to +20K' },
                  { icon: '🏢', label: 'Agency', pts: '4–50% comm.' },
                ].map(g => (
                  <View key={g.label} style={S.guideItem}>
                    <Text style={{ fontSize: 22 }}>{g.icon}</Text>
                    <Text style={S.guideLabel}>{g.label}</Text>
                    <Text style={S.guidePoints}>{g.pts}</Text>
                  </View>
                ))}
              </View>
              <View style={S.convInfo}>
                <MaterialIcons name="info-outline" size={13} color={Colors.textMuted} />
                <Text style={S.convText}>10,000 points = $1 USD · Min withdrawal: $10 (100,000 pts)</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  subtitle: { color: Colors.textMuted, fontSize: FontSize.xs },
  boardTabs: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  boardTab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  boardTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 5 },
  boardTabText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  boardTabTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  periodRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
  periodBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xs, borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: Colors.cardBorder },
  periodBtnActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '20' },
  periodBtnText: { color: Colors.textMuted, fontSize: FontSize.xs },
  periodBtnTextActive: { color: Colors.gold, fontWeight: FontWeight.bold },
  loadingWrap: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.md },
  loadingText: { color: Colors.textMuted, fontSize: FontSize.sm },
  // Podium
  podiumSection: { marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  podiumWrap: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 0, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder, paddingTop: Spacing.lg },
  podiumCol: { flex: 1, alignItems: 'center', gap: 3 },
  podiumCrownFloat: { fontSize: 28, marginBottom: -6 },
  podiumAv: { marginBottom: 2 },
  podiumName: { color: Colors.textPrimary, fontSize: 10, fontWeight: FontWeight.bold, maxWidth: 80, textAlign: 'center' },
  podiumVal: { fontSize: 10, fontWeight: FontWeight.bold },
  podiumBase: { width: '90%', borderTopLeftRadius: 8, borderTopRightRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 4, minHeight: 50 },
  podiumRankNum: { fontSize: FontSize.xl, fontWeight: FontWeight.black },
  // Stats banner
  statsBanner: { flexDirection: 'row', marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '30' },
  statsBannerItem: { flex: 1, alignItems: 'center' },
  statsBannerVal: { fontSize: FontSize.lg, fontWeight: FontWeight.black },
  statsBannerLabel: { color: Colors.textMuted, fontSize: 10 },
  statsBannerDiv: { width: 1, backgroundColor: Colors.cardBorder, marginVertical: 4 },
  earnRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.lg },
  earnBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.primary + '15', borderWidth: 1.5, borderColor: Colors.primary + '50' },
  earnBtnText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  // List
  listSection: { paddingHorizontal: Spacing.md },
  listTitle: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.black, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: Spacing.sm },
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, gap: Spacing.sm, paddingLeft: 6 },
  rankRowMe: { backgroundColor: Colors.primary + '10', borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.xs },
  rankNumWrap: { width: 32, alignItems: 'center' },
  rankNum: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  rankAv: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: Colors.cardBorder },
  rankName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  rankSub: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 1 },
  rankVal: { color: Colors.diamond, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  meBadge: { backgroundColor: Colors.primary, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  meBadgeText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.black },
  // Empty
  emptyWrap: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  emptySub: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center' },
  emptyBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
  emptyBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  // Earning Guide
  earningGuide: { margin: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.cardBorder, gap: Spacing.md },
  guideTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  guideGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  guideItem: { width: (width - Spacing.md * 2 - Spacing.lg * 2 - Spacing.sm * 2) / 3, backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', gap: 3, borderWidth: 1, borderColor: Colors.cardBorder },
  guideLabel: { color: Colors.textSecondary, fontSize: 9, fontWeight: FontWeight.semibold, textAlign: 'center' },
  guidePoints: { color: Colors.gold, fontSize: 9, fontWeight: FontWeight.black, textAlign: 'center' },
  convInfo: { flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.sm, padding: Spacing.sm },
  convText: { color: Colors.textMuted, fontSize: FontSize.xs, flex: 1 },
});
