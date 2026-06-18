// SashLive — Host Panel (real-time earnings, stream history, apply flow, analytics)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Dimensions, Animated, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/template';
import { useAlert } from '@/template';
import { getSupabaseClient } from '@/template';
import { EARNING_RATES, pointsToUSD } from '@/services/earningService';

const { width } = Dimensions.get('window');

type HostTab = 'dashboard' | 'earnings' | 'schedule' | 'apply';

const SCHEDULE_ITEMS = [
  { day: 'Today',     time: '8:00 PM',  title: 'Chill Night Stream',  status: 'live'      },
  { day: 'Tomorrow',  time: '9:00 PM',  title: 'PK Battle Night',     status: 'scheduled' },
  { day: 'Thursday',  time: '7:30 PM',  title: 'Q&A + Gifts',         status: 'scheduled' },
  { day: 'Friday',    time: '10:00 PM', title: 'Party Room 🎉',       status: 'scheduled' },
];

const HOST_BENEFITS = [
  { icon: '🪙', title: 'Earn S-Coins',        desc: 'Earn coins from gifts received during live streams' },
  { icon: '💎', title: 'Diamond Bonuses',     desc: 'Hit streaming targets for bonus diamond rewards' },
  { icon: '👑', title: 'VIP Priority',         desc: 'Get featured placement in the Explore page' },
  { icon: '🏆', title: 'Weekly Leaderboard',  desc: 'Top hosts earn special prizes weekly' },
  { icon: '📊', title: 'Analytics Dashboard', desc: 'Track your performance and audience growth' },
  { icon: '🏢', title: 'Agency Support',      desc: 'Join an agency for mentoring and support' },
];

// ─── Real-Time Session Ticker ─────────────────────────────────────────────
function SessionTicker({ isLive }: { isLive: boolean }) {
  const [secs, setSecs] = useState(0);
  const [sessionPts, setSessionPts] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isLive) { setSecs(0); setSessionPts(0); return; }
    timerRef.current = setInterval(() => {
      setSecs(s => {
        const next = s + 1;
        if (next % 60 === 0) {
          setSessionPts(p => p + Math.floor(EARNING_RATES.stream_per_hour / 60));
          Animated.sequence([
            Animated.timing(tickAnim, { toValue: 1.25, duration: 200, useNativeDriver: true }),
            Animated.spring(tickAnim, { toValue: 1, useNativeDriver: true }),
          ]).start();
        }
        return next;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isLive]);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  if (!isLive) return null;

  return (
    <View style={tickS.wrap}>
      <View style={tickS.pulseWrap}>
        <View style={tickS.pulse} />
        <View style={tickS.liveDot} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={tickS.label}>Session Duration</Text>
        <Text style={tickS.timer}>{fmt(secs)}</Text>
      </View>
      <Animated.View style={[tickS.ptsWrap, { transform: [{ scale: tickAnim }] }]}>
        <Text style={tickS.ptsLabel}>Earned</Text>
        <Text style={tickS.pts}>+{sessionPts.toLocaleString()} pts</Text>
      </Animated.View>
    </View>
  );
}
const tickS = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.live + '15', borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1.5, borderColor: Colors.live + '40', gap: Spacing.sm },
  pulseWrap: { position: 'relative', width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.live, opacity: 0.3 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.live },
  label: { color: Colors.textMuted, fontSize: 9, fontWeight: FontWeight.semibold },
  timer: { color: Colors.live, fontSize: FontSize.lg, fontWeight: FontWeight.black },
  ptsWrap: { alignItems: 'flex-end' },
  ptsLabel: { color: Colors.textMuted, fontSize: 9 },
  pts: { color: Colors.gold, fontSize: FontSize.md, fontWeight: FontWeight.black },
});

// ─── Analytics sparkline (simple bar chart) ──────────────────────────────
function SparkBars({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 36 }}>
      {data.map((v, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: color + '30', borderRadius: 3, overflow: 'hidden', height: 36 }}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: color, borderRadius: 3, height: `${(v / max) * 100}%` }} />
        </View>
      ))}
    </View>
  );
}

export default function HostPanelScreen() {
  const router = useRouter();
  const { currentUser, updatePoints } = useApp();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [activeTab, setActiveTab] = useState<HostTab>(currentUser.isHost ? 'dashboard' : 'apply');
  const [streamHistory, setStreamHistory] = useState<any[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalViewers, setTotalViewers] = useState(0);
  const [totalStreams, setTotalStreams] = useState(0);
  const [isCurrentlyLive, setIsCurrentlyLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [weeklyData] = useState([1200, 2400, 1800, 3200, 900, 4100, 2700]);
  const [viewersData] = useState([45, 112, 87, 245, 33, 180, 96]);
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    if (currentUser.isHost) loadData();
  }, [currentUser.isHost]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const supabase = getSupabaseClient();
    const [historyRes, liveRes] = await Promise.all([
      supabase.from('live_rooms').select('*').eq('host_id', user.id).order('started_at', { ascending: false }).limit(20),
      supabase.from('live_rooms').select('*').eq('host_id', user.id).eq('is_live', true).single(),
    ]);
    if (historyRes.data) {
      setStreamHistory(historyRes.data);
      const total = historyRes.data.reduce((s: number, r: any) => s + (r.diamonds_earned || 0), 0);
      const viewers = historyRes.data.reduce((s: number, r: any) => s + (r.viewers || 0), 0);
      setTotalEarnings(total);
      setTotalViewers(viewers);
      setTotalStreams(historyRes.data.length);
    }
    if (liveRes.data) setIsCurrentlyLive(true);
    setLoading(false);
  }, [user?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleApply = async () => {
    setApplying(true);
    await new Promise(r => setTimeout(r, 1200));
    setApplying(false);
    showAlert('Application Submitted! 🎤', 'Your host application is under review. You will be notified within 24-48 hours.');
  };

  const fmtDuration = (started: string, ended: string | null) => {
    if (!started) return '--';
    const start = new Date(started).getTime();
    const end = ended ? new Date(ended).getTime() : Date.now();
    const mins = Math.floor((end - start) / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const fmtDate = (d: string) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const TABS_HOST = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'earnings',  label: '💰 Earnings'  },
    { key: 'schedule',  label: '📅 Schedule'  },
  ] as const;

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      {/* Header */}
      <Animated.View style={[S.header, { opacity: headerAnim }]}>
        <Pressable onPress={() => router.back()} style={S.headerBtn}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View>
          <Text style={S.title}>Host Panel</Text>
          {currentUser.isHost ? <Text style={S.subtitle}>Manage your streams & earnings</Text> : null}
        </View>
        <Pressable style={S.goLiveChip} onPress={() => router.push('/go-live')}>
          <View style={S.goLiveDot} />
          <Text style={S.goLiveChipText}>Go Live</Text>
        </Pressable>
      </Animated.View>

      {/* Tabs */}
      {currentUser.isHost ? (
        <View style={S.tabs}>
          {TABS_HOST.map(tab => (
            <Pressable key={tab.key} style={[S.tab, activeTab === tab.key && S.tabActive]} onPress={() => setActiveTab(tab.key as HostTab)}>
              <Text style={[S.tabText, activeTab === tab.key && S.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={S.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* ── APPLY TAB / Non-host view ────────────────────────────── */}
        {!currentUser.isHost ? (
          <>
            <LinearGradient colors={[Colors.primary, Colors.secondary]} style={S.applyHero}>
              <Text style={{ fontSize: 56 }}>🎤</Text>
              <View>
                <Text style={S.applyHeroTitle}>Become a SashLive Host</Text>
                <Text style={S.applyHeroSub}>Start earning from gifts, streams, and more</Text>
              </View>
            </LinearGradient>

            {/* Benefits */}
            <Text style={S.sectionTitle}>💰 Host Benefits</Text>
            {HOST_BENEFITS.map((b, i) => (
              <View key={i} style={S.benefitRow}>
                <View style={S.benefitIcon}><Text style={{ fontSize: 20 }}>{b.icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={S.benefitTitle}>{b.title}</Text>
                  <Text style={S.benefitDesc}>{b.desc}</Text>
                </View>
              </View>
            ))}

            {/* Earnings preview */}
            <View style={S.earningsPreview}>
              <Text style={S.sectionTitle}>📈 Potential Earnings</Text>
              <View style={S.earningsGrid}>
                {[
                  { label: '1hr stream', val: '2,000 pts', icon: '⏱' },
                  { label: 'Gift share',  val: '70% value', icon: '🎁' },
                  { label: 'PK win',      val: '5,000 pts', icon: '⚔️' },
                  { label: 'Daily task',  val: '20,000 pts', icon: '🎯' },
                ].map(e => (
                  <View key={e.label} style={S.earningsItem}>
                    <Text style={{ fontSize: 22 }}>{e.icon}</Text>
                    <Text style={S.earningsItemVal}>{e.val}</Text>
                    <Text style={S.earningsItemLabel}>{e.label}</Text>
                  </View>
                ))}
              </View>
              <View style={S.convNote}>
                <MaterialIcons name="info-outline" size={13} color={Colors.textMuted} />
                <Text style={S.convNoteText}>10,000 points = $1 USD · Min withdrawal: $10</Text>
              </View>
            </View>

            {/* Requirements */}
            <Text style={S.sectionTitle}>📋 Requirements</Text>
            <View style={S.reqCard}>
              {[
                '✓ Account at least 7 days old',
                '✓ Complete your profile with photo',
                '✓ Agree to Community Guidelines',
                '✓ Minimum age: 18 years',
              ].map((r, i) => <Text key={i} style={S.reqItem}>{r}</Text>)}
            </View>

            <Pressable style={[S.applyBtn, applying && { opacity: 0.7 }]} onPress={handleApply} disabled={applying}>
              {applying ? <ActivityIndicator color="#FFF" /> : <Text style={S.applyBtnText}>🎤 Apply to Become Host</Text>}
            </Pressable>
          </>
        ) : activeTab === 'dashboard' ? (
          <>
            {/* Host card */}
            <View style={S.hostCard}>
              <Image source={{ uri: currentUser.avatar || '' }} style={S.hostAv} contentFit="cover" />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={S.hostName}>{currentUser.displayName}</Text>
                <View style={S.hostStatusRow}>
                  {isCurrentlyLive ? (
                    <View style={S.liveBadge}><View style={S.liveDot} /><Text style={S.liveBadgeText}>LIVE NOW</Text></View>
                  ) : (
                    <View style={S.offlineBadge}><Text style={S.offlineBadgeText}>Offline</Text></View>
                  )}
                  <View style={S.agencyBadge}><Text style={S.agencyBadgeText}>Active Host ✓</Text></View>
                </View>
              </View>
              <Pressable style={S.goLiveBtn} onPress={() => router.push('/go-live')}>
                <View style={S.goLiveDot2} />
                <Text style={S.goLiveBtnText}>Go Live</Text>
              </Pressable>
            </View>

            {/* Real-time session ticker */}
            <SessionTicker isLive={isCurrentlyLive} />

            {/* Stats grid */}
            {loading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.lg }} />
            ) : (
              <View style={S.statsGrid}>
                {[
                  { label: 'Total Streams', value: totalStreams > 0 ? totalStreams : '--', icon: '🎥', color: Colors.primary },
                  { label: 'Diamonds Earned', value: totalEarnings > 0 ? `${(totalEarnings / 1000).toFixed(1)}K` : '--', icon: '💎', color: Colors.diamond },
                  { label: 'Total Viewers', value: totalViewers > 0 ? `${(totalViewers / 1000).toFixed(1)}K` : '--', icon: '👁', color: Colors.secondary },
                  { label: 'Points Balance', value: currentUser.points.toLocaleString(), icon: '🪙', color: Colors.gold },
                ].map(s => (
                  <View key={s.label} style={[S.statCard, { borderColor: s.color + '35' }]}>
                    <Text style={{ fontSize: 24 }}>{s.icon}</Text>
                    <Text style={[S.statVal, { color: s.color }]}>{s.value}</Text>
                    <Text style={S.statLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* USD balance row */}
            <View style={S.usdRow}>
              <View>
                <Text style={S.usdLabel}>Available to Withdraw</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={S.usdAmount}>${pointsToUSD(currentUser.points).toFixed(2)}</Text>
                  <Text style={S.usdPts}>({currentUser.points.toLocaleString()} pts)</Text>
                </View>
              </View>
              <Pressable style={S.withdrawChip} onPress={() => router.push('/withdrawal')}>
                <Text style={S.withdrawChipText}>Withdraw</Text>
                <MaterialIcons name="chevron-right" size={16} color="#FFF" />
              </Pressable>
            </View>

            {/* Weekly earnings sparkline */}
            <View style={S.sparkCard}>
              <View style={S.sparkHeader}>
                <Text style={S.sparkTitle}>This Week</Text>
                <Text style={S.sparkSub}>Diamonds earned daily</Text>
              </View>
              <SparkBars data={weeklyData} color={Colors.diamond} />
              <View style={S.sparkFooter}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <Text key={i} style={S.sparkDay}>{d}</Text>
                ))}
              </View>
            </View>

            {/* Viewer chart */}
            <View style={S.sparkCard}>
              <View style={S.sparkHeader}>
                <Text style={S.sparkTitle}>Viewer Trend</Text>
                <Text style={S.sparkSub}>Daily peak viewers</Text>
              </View>
              <SparkBars data={viewersData} color={Colors.primary} />
              <View style={S.sparkFooter}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <Text key={i} style={S.sparkDay}>{d}</Text>
                ))}
              </View>
            </View>

            {/* Tips */}
            <Text style={S.sectionTitle}>📊 Performance Tips</Text>
            {[
              { tip: 'Stream at peak hours (8–10 PM local time)', icon: '⏰' },
              { tip: 'Announce streams in advance on your profile', icon: '📢' },
              { tip: 'Engage with chat and call viewers by name', icon: '💬' },
              { tip: 'Use PK battles to boost visibility', icon: '⚔️' },
              { tip: 'Set weekly streaming goals for bonus points', icon: '🎯' },
            ].map((t, i) => (
              <View key={i} style={S.tipRow}>
                <Text style={{ fontSize: 18 }}>{t.icon}</Text>
                <Text style={S.tipText}>{t.tip}</Text>
              </View>
            ))}
          </>
        ) : activeTab === 'earnings' ? (
          <>
            {/* Total earnings card */}
            <LinearGradient colors={['#5C6BC0', '#9C27B0']} style={S.totalCard}>
              <Text style={S.totalCardLabel}>Total Points Earned</Text>
              <Text style={S.totalCardAmount}>{currentUser.points.toLocaleString()}</Text>
              <Text style={S.totalCardUsd}>≈ ${pointsToUSD(currentUser.points).toFixed(2)} USD</Text>
              <Pressable style={S.totalCardBtn} onPress={() => router.push('/withdrawal')}>
                <Text style={S.totalCardBtnText}>💸 Withdraw Earnings</Text>
              </Pressable>
            </LinearGradient>

            {/* Commission info if in agency */}
            <View style={S.commissionCard}>
              <Text style={S.commissionTitle}>💼 Agency Commission</Text>
              <Text style={S.commissionDesc}>Join an agency to earn extra commission (4–50%) on every stream you do!</Text>
              <Pressable style={S.commissionBtn} onPress={() => router.push('/agency')}>
                <Text style={S.commissionBtnText}>View Agency →</Text>
              </Pressable>
            </View>

            {/* Stream history */}
            <Text style={S.sectionTitle}>📺 Stream History</Text>
            {streamHistory.length === 0 && !loading ? (
              <View style={S.emptyState}>
                <Text style={{ fontSize: 40 }}>📺</Text>
                <Text style={S.emptyText}>No streams yet</Text>
                <Pressable style={S.emptyBtn} onPress={() => router.push('/go-live')}>
                  <Text style={S.emptyBtnText}>Start Your First Stream</Text>
                </Pressable>
              </View>
            ) : null}
            {streamHistory.map((s, i) => (
              <View key={s.id || i} style={S.streamRow}>
                <View style={S.streamIconWrap}><Text style={{ fontSize: 20 }}>📺</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={S.streamTitle} numberOfLines={1}>{s.title || 'Live Stream'}</Text>
                  <Text style={S.streamMeta}>
                    {fmtDate(s.started_at)} · {fmtDuration(s.started_at, s.ended_at)} · {s.viewers || 0} viewers
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={S.streamDiamonds}>💎 {s.diamonds_earned || 0}</Text>
                  {s.is_live ? <View style={S.liveSmallBadge}><Text style={S.liveSmallText}>LIVE</Text></View> : null}
                </View>
              </View>
            ))}
            {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.lg }} /> : null}
          </>
        ) : (
          // Schedule tab
          <>
            <View style={S.scheduleTop}>
              <Text style={S.sectionTitle}>📅 Upcoming Streams</Text>
              <Pressable style={S.addBtn} onPress={() => showAlert('Schedule Stream', 'Stream scheduling coming soon! Set your go-live time and title to auto-notify your followers.')}>
                <MaterialIcons name="add" size={18} color="#FFF" />
              </Pressable>
            </View>
            {SCHEDULE_ITEMS.map((item, i) => (
              <View key={i} style={[S.scheduleCard, item.status === 'live' && S.scheduleCardLive]}>
                <View style={S.scheduleTime}>
                  <Text style={[S.scheduleDay, item.status === 'live' && { color: Colors.live }]}>{item.day}</Text>
                  <Text style={S.scheduleTimeText}>{item.time}</Text>
                </View>
                <View style={S.scheduleDivider} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={S.scheduleTitle}>{item.title}</Text>
                  <View style={[S.scheduleBadge,
                    item.status === 'live' ? { backgroundColor: Colors.live + '25' } : { backgroundColor: Colors.success + '20' }
                  ]}>
                    <Text style={[S.scheduleBadgeText, { color: item.status === 'live' ? Colors.live : Colors.success }]}>
                      {item.status === 'live' ? '🔴 Live Now' : '✓ Scheduled'}
                    </Text>
                  </View>
                </View>
                {item.status === 'live' ? (
                  <Pressable style={S.viewLiveBtn} onPress={() => router.push('/go-live')}>
                    <Text style={S.viewLiveBtnText}>View</Text>
                  </Pressable>
                ) : (
                  <Pressable style={S.editBtn} onPress={() => showAlert('Edit Schedule', 'Editing stream schedule coming soon!')}>
                    <MaterialIcons name="edit" size={16} color={Colors.textMuted} />
                  </Pressable>
                )}
              </View>
            ))}
            <View style={S.scheduleNote}>
              <MaterialIcons name="notifications-none" size={16} color={Colors.textMuted} />
              <Text style={S.scheduleNoteText}>Followers are notified 30min before scheduled streams</Text>
            </View>
          </>
        )}

        <View style={{ height: Spacing.xxl }} />
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
  goLiveChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.live, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  goLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFF' },
  goLiveChipText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.xs, marginBottom: Spacing.sm },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: 11, fontWeight: FontWeight.medium },
  tabTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },

  // Apply view
  applyHero: { borderRadius: BorderRadius.xl, padding: Spacing.xl, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  applyHeroTitle: { color: '#FFF', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  applyHeroSub: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.xs, marginTop: 2 },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  benefitRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', marginBottom: Spacing.sm, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  benefitIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.cardBorder },
  benefitTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  benefitDesc: { color: Colors.textMuted, fontSize: FontSize.xs },
  earningsPreview: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder },
  earningsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  earningsItem: { width: (width - Spacing.md * 2 - Spacing.md * 2 - Spacing.sm) / 2, backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.lg, padding: Spacing.sm, alignItems: 'center', gap: 3, borderWidth: 1, borderColor: Colors.cardBorder },
  earningsItemVal: { color: Colors.gold, fontSize: FontSize.sm, fontWeight: FontWeight.black },
  earningsItemLabel: { color: Colors.textMuted, fontSize: 9, textAlign: 'center' },
  convNote: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  convNoteText: { color: Colors.textMuted, fontSize: 10, flex: 1 },
  reqCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.cardBorder, gap: Spacing.sm },
  reqItem: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 22 },
  applyBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  applyBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },

  // Dashboard
  hostCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.sm, gap: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder },
  hostAv: { width: 58, height: 58, borderRadius: 29, borderWidth: 2.5, borderColor: Colors.primary },
  hostName: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  hostStatusRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.live + '20', borderRadius: BorderRadius.pill, paddingHorizontal: 7, paddingVertical: 3 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.live },
  liveBadgeText: { color: Colors.live, fontSize: FontSize.xs, fontWeight: FontWeight.black },
  offlineBadge: { backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.pill, paddingHorizontal: 7, paddingVertical: 3 },
  offlineBadgeText: { color: Colors.textMuted, fontSize: FontSize.xs },
  agencyBadge: { backgroundColor: Colors.success + '20', borderRadius: BorderRadius.pill, paddingHorizontal: 7, paddingVertical: 3 },
  agencyBadgeText: { color: Colors.success, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  goLiveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  goLiveDot2: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  goLiveBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  statCard: { width: (width - Spacing.md * 2 - Spacing.sm) / 2, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: 4, borderWidth: 1 },
  statVal: { fontSize: FontSize.xl, fontWeight: FontWeight.black },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  usdRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1.5, borderColor: Colors.gold + '40' },
  usdLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  usdAmount: { color: Colors.gold, fontSize: FontSize.xl, fontWeight: FontWeight.black },
  usdPts: { color: Colors.textMuted, fontSize: FontSize.xs },
  withdrawChip: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  withdrawChipText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  sparkCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder },
  sparkHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: Spacing.sm },
  sparkTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  sparkSub: { color: Colors.textMuted, fontSize: FontSize.xs },
  sparkFooter: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  sparkDay: { color: Colors.textMuted, fontSize: 9 },
  tipRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm, alignItems: 'flex-start' },
  tipText: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },

  // Earnings tab
  totalCard: { borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.md, gap: 4 },
  totalCardLabel: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.sm },
  totalCardAmount: { color: '#FFE566', fontSize: 46, fontWeight: FontWeight.black },
  totalCardUsd: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm },
  totalCardBtn: { marginTop: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.pill, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl },
  totalCardBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  commissionCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.primary + '35', gap: 6 },
  commissionTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  commissionDesc: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 16 },
  commissionBtn: { alignSelf: 'flex-start', backgroundColor: Colors.primary + '15', borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: 5 },
  commissionBtnText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  streamRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  streamIconWrap: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.cardBorder },
  streamTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  streamMeta: { color: Colors.textMuted, fontSize: FontSize.xs },
  streamDiamonds: { color: Colors.diamond, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  liveSmallBadge: { backgroundColor: Colors.live, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  liveSmallText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.black },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm },
  emptyBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
  emptyBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  // Schedule tab
  scheduleTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  scheduleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder, gap: Spacing.sm },
  scheduleCardLive: { borderColor: Colors.live + '50', backgroundColor: Colors.live + '08' },
  scheduleTime: { alignItems: 'center', width: 70 },
  scheduleDay: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  scheduleTimeText: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.black },
  scheduleDivider: { width: 1, height: 44, backgroundColor: Colors.cardBorder },
  scheduleTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  scheduleBadge: { borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  scheduleBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  viewLiveBtn: { backgroundColor: Colors.live, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 5 },
  viewLiveBtnText: { color: '#FFF', fontSize: 11, fontWeight: FontWeight.bold },
  editBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  scheduleNote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder, marginTop: Spacing.sm },
  scheduleNoteText: { color: Colors.textMuted, fontSize: FontSize.xs, flex: 1 },
});
