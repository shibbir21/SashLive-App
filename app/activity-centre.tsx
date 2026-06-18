// SashLive — Activity Centre (PoppoLive-style: daily check-in, streaks, events, challenges)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Dimensions, Animated, Modal,
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

const { width } = Dimensions.get('window');

// ─── Daily check-in rewards by day ───────────────────────────────────────
const CHECKIN_REWARDS = [
  { day: 1, coins: 20,   diamonds: 0, label: 'Day 1' },
  { day: 2, coins: 30,   diamonds: 0, label: 'Day 2' },
  { day: 3, coins: 50,   diamonds: 1, label: 'Day 3' },
  { day: 4, coins: 70,   diamonds: 0, label: 'Day 4' },
  { day: 5, coins: 100,  diamonds: 2, label: 'Day 5' },
  { day: 6, coins: 150,  diamonds: 3, label: 'Day 6' },
  { day: 7, coins: 300,  diamonds: 10, label: 'Day 7 🎉' },
];

// ─── Weekly challenge milestones ─────────────────────────────────────────
const WEEKLY_CHALLENGES = [
  { id: 'wc1', title: 'Stream 5 Days', desc: 'Go live for 5 different days this week', target: 5, progress: 3, reward: 5000, icon: '🎤', type: 'pts' },
  { id: 'wc2', title: 'Send 50 Gifts', desc: 'Send gifts to hosts this week', target: 50, progress: 22, reward: 3000, icon: '🎁', type: 'pts' },
  { id: 'wc3', title: 'Invite 3 Friends', desc: 'Get 3 friends to register with your link', target: 3, progress: 1, reward: 10500, icon: '👥', type: 'coins' },
  { id: 'wc4', title: '10 PK Battles', desc: 'Participate in 10 PK battles this week', target: 10, progress: 4, reward: 8000, icon: '⚔️', type: 'pts' },
  { id: 'wc5', title: 'Watch 20 Streams', desc: 'Watch live streams for at least 5 minutes each', target: 20, progress: 14, reward: 2000, icon: '📺', type: 'pts' },
];

// ─── Active Events ────────────────────────────────────────────────────────
const EVENTS = [
  {
    id: 'ev1',
    title: 'A Day in My Life 🎬',
    dateRange: '15/06/2026 – 29/06/2026',
    poolDesc: '2,000,000 🪙 pool to split!',
    progress: 65,
    target: 100,
    progressLabel: '65 shares / 100 needed',
    colors: ['#F59E0B', '#EF4444'],
    reward: 20000,
    img: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=200&fit=crop',
    claimed: false,
    timeLeft: '11 days',
  },
  {
    id: 'ev2',
    title: 'First Recharge Bonus 💎',
    dateRange: 'Ongoing',
    poolDesc: 'Get 2x diamonds on first recharge!',
    progress: 0,
    target: 1,
    progressLabel: 'Complete your first recharge',
    colors: ['#7C3AED', '#5C6BC0'],
    reward: 500,
    img: 'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=400&h=200&fit=crop',
    claimed: false,
    timeLeft: '∞',
  },
  {
    id: 'ev3',
    title: 'Invite Friends Challenge 🎉',
    dateRange: 'Jun 2026',
    poolDesc: 'Earn up to 10,500 🪙 per invite',
    progress: 1,
    target: 5,
    progressLabel: '1 of 5 friends invited',
    colors: ['#EF4444', '#D32F5A'],
    reward: 52500,
    img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=200&fit=crop',
    claimed: false,
    timeLeft: '12 days',
  },
];

// ─── Coin Burst Animation ────────────────────────────────────────────────
function CoinBurst({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const anims = useRef(Array.from({ length: 12 }, () => ({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    op: new Animated.Value(0),
    scale: new Animated.Value(0),
  }))).current;

  useEffect(() => {
    if (!visible) return;
    const angles = Array.from({ length: 12 }, (_, i) => (i * 30 * Math.PI) / 180);
    const anis = anims.map((a, i) => {
      const angle = angles[i];
      const dist = 60 + Math.random() * 50;
      return Animated.parallel([
        Animated.timing(a.op, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(a.scale, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(a.x, { toValue: Math.cos(angle) * dist, duration: 500, useNativeDriver: true }),
        Animated.timing(a.y, { toValue: Math.sin(angle) * dist - 40, duration: 500, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(a.op, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ]);
    });
    Animated.parallel(anis).start(() => {
      anims.forEach(a => { a.x.setValue(0); a.y.setValue(0); a.op.setValue(0); a.scale.setValue(0); });
      onDone();
    });
  }, [visible]);

  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <View style={{ position: 'absolute', top: '50%', left: '50%' }}>
        {anims.map((a, i) => (
          <Animated.View key={i} style={{
            position: 'absolute', opacity: a.op,
            transform: [{ translateX: a.x }, { translateY: a.y }, { scale: a.scale }],
          }}>
            <Text style={{ fontSize: 16 }}>🪙</Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

export default function ActivityCentreScreen() {
  const router = useRouter();
  const { currentUser, updateCoins, updatePoints } = useApp();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [streakDay, setStreakDay] = useState(3); // current streak
  const [todayCheckedIn, setTodayCheckedIn] = useState(false);
  const [claimedEvents, setClaimedEvents] = useState<Set<string>>(new Set());
  const [claimedChallenges, setClaimedChallenges] = useState<Set<string>>(new Set());
  const [showBurst, setShowBurst] = useState(false);
  const [burstPos, setBurstPos] = useState({ x: 0, y: 0 });
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'checkin' | 'events' | 'challenges'>('checkin');

  const checkinScale = useRef(new Animated.Value(1)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  // Pulse the check-in button
  useEffect(() => {
    if (todayCheckedIn) return;
    Animated.loop(Animated.sequence([
      Animated.timing(checkinScale, { toValue: 1.04, duration: 800, useNativeDriver: true }),
      Animated.timing(checkinScale, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();
  }, [todayCheckedIn]);

  const handleCheckIn = async () => {
    if (todayCheckedIn) { showAlert('Already Checked In', 'Come back tomorrow for your next reward!'); return; }
    setCheckInLoading(true);
    const reward = CHECKIN_REWARDS[(streakDay - 1) % 7];
    // Try to record in DB
    if (user?.id) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('user_task_completions').insert({
          user_id: user.id, task_key: `daily_checkin_${new Date().toISOString().split('T')[0]}`,
        });
      } catch (_) {}
    }
    setTimeout(() => {
      setCheckInLoading(false);
      setTodayCheckedIn(true);
      updateCoins(reward.coins);
      if (reward.diamonds > 0) {} // updateDiamonds(reward.diamonds);
      setShowBurst(true);
      // Success flash
      Animated.sequence([
        Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(1000),
        Animated.timing(successOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
      showAlert('Checked In! 🎉', `+${reward.coins} Coins${reward.diamonds > 0 ? ` + ${reward.diamonds} 💎` : ''}\nStreak: ${streakDay} days!`);
    }, 800);
  };

  const claimChallenge = (ch: typeof WEEKLY_CHALLENGES[0]) => {
    if (claimedChallenges.has(ch.id)) { showAlert('Already Claimed', 'You have already claimed this reward.'); return; }
    if (ch.progress < ch.target) {
      showAlert('Not Complete', `${ch.progress}/${ch.target} — keep going!`);
      return;
    }
    setClaimedChallenges(prev => new Set([...prev, ch.id]));
    if (ch.type === 'pts') { updatePoints(ch.reward); showAlert('Reward Claimed! 🎉', `+${ch.reward.toLocaleString()} Points`); }
    else { updateCoins(ch.reward); showAlert('Reward Claimed! 🎉', `+${ch.reward.toLocaleString()} S-Coins`); }
    setShowBurst(true);
  };

  const claimEvent = (ev: typeof EVENTS[0]) => {
    if (claimedEvents.has(ev.id)) { showAlert('Already Claimed', 'Event reward already collected.'); return; }
    if (ev.progress < ev.target) {
      showAlert('Not Complete', `Complete the event task first: ${ev.progressLabel}`);
      return;
    }
    setClaimedEvents(prev => new Set([...prev, ev.id]));
    updateCoins(ev.reward);
    showAlert('Event Reward! 🎊', `+${ev.reward.toLocaleString()} S-Coins claimed!`);
    setShowBurst(true);
  };

  const TABS = [
    { key: 'checkin',    label: '📅 Check-in',   },
    { key: 'events',     label: '🎪 Events',      },
    { key: 'challenges', label: '⚡ Challenges',  },
  ] as const;

  return (
    <SafeAreaView style={S.container} edges={['top']}>
      <CoinBurst visible={showBurst} onDone={() => setShowBurst(false)} />

      {/* Header */}
      <View style={S.header}>
        <Pressable style={S.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={S.title}>Activity Centre</Text>
        <Pressable style={S.headerBtn} onPress={() => router.push('/daily-tasks')}>
          <Text style={{ fontSize: 20 }}>🎯</Text>
        </Pressable>
      </View>

      {/* Hero streak bar */}
      <LinearGradient colors={['#5C6BC0', '#9C27B0']} style={S.heroBanner}>
        <View style={S.heroBannerLeft}>
          <Text style={S.heroStreakNum}>{streakDay}</Text>
          <View>
            <Text style={S.heroStreakLabel}>Day Streak 🔥</Text>
            <Text style={S.heroStreakSub}>Keep checking in daily!</Text>
          </View>
        </View>
        <View style={S.heroBannerRight}>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>Bonus at day 7:</Text>
          <Text style={{ color: '#FFE566', fontSize: 13, fontWeight: FontWeight.black }}>🪙 300 + 💎 10</Text>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={S.tabsRow}>
        {TABS.map(tab => (
          <Pressable key={tab.key} style={[S.tab, activeTab === tab.key && S.tabActive]} onPress={() => setActiveTab(tab.key)}>
            <Text style={[S.tabText, activeTab === tab.key && S.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* ── CHECK-IN TAB ─────────────────────────────────────────── */}
        {activeTab === 'checkin' && (
          <>
            {/* 7-day calendar grid */}
            <View style={S.calSection}>
              <Text style={S.sectionTitle}>7-Day Login Reward</Text>
              <View style={S.calGrid}>
                {CHECKIN_REWARDS.map((reward, i) => {
                  const dayNum = i + 1;
                  const isPast = dayNum < streakDay;
                  const isCurrent = dayNum === streakDay && !todayCheckedIn;
                  const isDone = dayNum < streakDay || (dayNum === streakDay && todayCheckedIn);
                  const isFuture = dayNum > streakDay || (dayNum === streakDay && !todayCheckedIn && !isCurrent);
                  return (
                    <View key={dayNum} style={[S.calDay, isDone && S.calDayDone, isCurrent && S.calDayCurrent]}>
                      {isDone ? (
                        <View style={S.calDoneIcon}><MaterialIcons name="check" size={16} color="#FFF" /></View>
                      ) : (
                        <Text style={S.calDayCoins}>{reward.coins}🪙</Text>
                      )}
                      {reward.diamonds > 0 ? <Text style={S.calDiamonds}>+{reward.diamonds}💎</Text> : null}
                      <Text style={[S.calDayLabel, isDone && { color: 'rgba(255,255,255,0.8)' }, isCurrent && { color: '#FFE566', fontWeight: FontWeight.bold }]}>
                        {reward.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Check-in CTA */}
            <View style={S.checkInSection}>
              <Animated.View style={{ transform: [{ scale: todayCheckedIn ? 1 : checkinScale }] }}>
                <Pressable
                  style={[S.checkInBtn, todayCheckedIn && S.checkInBtnDone, checkInLoading && { opacity: 0.7 }]}
                  onPress={handleCheckIn}
                  disabled={checkInLoading || todayCheckedIn}
                >
                  {todayCheckedIn ? (
                    <>
                      <MaterialIcons name="check-circle" size={28} color="#FFF" />
                      <Text style={S.checkInBtnText}>Checked In Today ✓</Text>
                    </>
                  ) : (
                    <>
                      <Text style={{ fontSize: 24 }}>🎁</Text>
                      <Text style={S.checkInBtnText}>{checkInLoading ? 'Claiming...' : 'Check In for Daily Reward'}</Text>
                    </>
                  )}
                </Pressable>
              </Animated.View>
              <Text style={S.checkInSub}>
                {todayCheckedIn
                  ? `Streak: ${streakDay} days · Come back tomorrow!`
                  : `Today: +${CHECKIN_REWARDS[(streakDay - 1) % 7].coins} Coins${CHECKIN_REWARDS[(streakDay - 1) % 7].diamonds > 0 ? ` + ${CHECKIN_REWARDS[(streakDay - 1) % 7].diamonds} 💎` : ''}`}
              </Text>
            </View>

            {/* Streak bonus card */}
            <View style={S.streakBonusCard}>
              <LinearGradient colors={['#F97316', '#FBBF24']} style={S.streakBonusGrad}>
                <Text style={{ fontSize: 32 }}>🔥</Text>
                <View style={{ flex: 1 }}>
                  <Text style={S.streakBonusTitle}>7-Day Streak Bonus</Text>
                  <Text style={S.streakBonusSub}>Claim 300 🪙 + 10 💎 when you log in 7 days in a row!</Text>
                </View>
                <Text style={S.streakBonusDays}>{streakDay}/7</Text>
              </LinearGradient>
            </View>

            {/* Treasure Box preview */}
            <View style={S.treasureRow}>
              <View style={{ flex: 1 }}>
                <Text style={S.sectionTitle}>💰 Treasure Boxes</Text>
                <Text style={S.sectionSub}>Claim treasure boxes in live rooms for free S-Coins!</Text>
              </View>
              <Pressable style={S.treasureBtn} onPress={() => router.push('/(tabs)')}>
                <Text style={{ fontSize: 28 }}>🎁</Text>
                <Text style={S.treasureBtnText}>Watch Live</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* ── EVENTS TAB ─────────────────────────────────────────────── */}
        {activeTab === 'events' && (
          <View style={{ padding: Spacing.md, gap: Spacing.md }}>
            <Text style={S.sectionTitle}>🎪 Active Events</Text>
            {EVENTS.map(ev => {
              const isComplete = ev.progress >= ev.target;
              const isClaimed = claimedEvents.has(ev.id);
              const pct = Math.min(1, ev.progress / ev.target);
              return (
                <View key={ev.id} style={S.eventCard}>
                  <Image source={{ uri: ev.img }} style={S.eventImg} contentFit="cover" />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={S.eventImgGrad} />
                  {/* Time left badge */}
                  <View style={S.timeLeftBadge}>
                    <MaterialIcons name="timer" size={10} color="#FFF" />
                    <Text style={S.timeLeftText}>{ev.timeLeft}</Text>
                  </View>
                  <View style={S.eventBody}>
                    <Text style={S.eventTitle}>{ev.title}</Text>
                    <Text style={S.eventDate}>{ev.dateRange}</Text>
                    <View style={S.eventPoolRow}>
                      <Text style={S.eventPool}>{ev.poolDesc}</Text>
                    </View>
                    {/* Progress bar */}
                    <View style={S.progressWrap}>
                      <View style={S.progressBar}>
                        <Animated.View style={[S.progressFill, { width: `${pct * 100}%` }]} />
                      </View>
                      <Text style={S.progressLabel}>{ev.progressLabel}</Text>
                    </View>
                    <Pressable
                      style={[S.claimBtn, isClaimed && S.claimBtnDone, !isComplete && !isClaimed && S.claimBtnDisabled]}
                      onPress={() => claimEvent(ev)}
                    >
                      <Text style={S.claimBtnText}>
                        {isClaimed ? '✓ Claimed' : isComplete ? `🎊 Claim +${ev.reward.toLocaleString()} 🪙` : `${ev.progressLabel}`}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── CHALLENGES TAB ──────────────────────────────────────────── */}
        {activeTab === 'challenges' && (
          <View style={{ padding: Spacing.md, gap: Spacing.sm }}>
            <View style={S.challengeHeader}>
              <Text style={S.sectionTitle}>⚡ Weekly Challenges</Text>
              <Text style={S.sectionSub}>Resets every Monday at 00:00 UTC</Text>
            </View>
            {WEEKLY_CHALLENGES.map(ch => {
              const pct = Math.min(1, ch.progress / ch.target);
              const isComplete = ch.progress >= ch.target;
              const isClaimed = claimedChallenges.has(ch.id);
              return (
                <View key={ch.id} style={[S.challengeCard, isClaimed && S.challengeCardDone]}>
                  <View style={S.challengeIconWrap}>
                    <Text style={{ fontSize: 26 }}>{ch.icon}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={S.challengeTitle}>{ch.title}</Text>
                      <Text style={S.challengeReward}>
                        +{ch.reward.toLocaleString()} {ch.type === 'pts' ? 'pts' : '🪙'}
                      </Text>
                    </View>
                    <Text style={S.challengeDesc}>{ch.desc}</Text>
                    {/* Progress bar */}
                    <View style={S.progressWrap}>
                      <View style={S.progressBar}>
                        <View style={[S.progressFill, { width: `${pct * 100}%`, backgroundColor: isClaimed ? Colors.success : Colors.primary }]} />
                      </View>
                      <Text style={S.progressLabel}>{ch.progress}/{ch.target}</Text>
                    </View>
                    {/* Claim button */}
                    <Pressable
                      style={[S.challengeClaimBtn,
                        isClaimed && { backgroundColor: Colors.success + '20', borderColor: Colors.success },
                        isComplete && !isClaimed && { backgroundColor: Colors.primary, borderColor: Colors.primary },
                        !isComplete && !isClaimed && { opacity: 0.5 },
                      ]}
                      onPress={() => claimChallenge(ch)}
                      disabled={isClaimed}
                    >
                      <Text style={[S.challengeClaimText,
                        isClaimed && { color: Colors.success },
                        isComplete && !isClaimed && { color: '#FFF' },
                      ]}>
                        {isClaimed ? '✓ Claimed' : isComplete ? 'Claim Reward 🎉' : `${ch.progress}/${ch.target} Complete`}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
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

  // Hero banner
  heroBanner: { marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: BorderRadius.xl, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  heroStreakNum: { color: '#FFE566', fontSize: 44, fontWeight: FontWeight.black, lineHeight: 48 },
  heroStreakLabel: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  heroStreakSub: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs },
  heroBannerRight: { alignItems: 'flex-end', gap: 2 },

  // Tabs
  tabsRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  tabTextActive: { color: '#FFF', fontWeight: FontWeight.bold, fontSize: FontSize.xs },

  // Check-in calendar
  calSection: { padding: Spacing.md },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  sectionSub: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: -4, marginBottom: Spacing.sm },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  calDay: {
    width: (width - Spacing.md * 2 - Spacing.xs * 6) / 7,
    aspectRatio: 0.65,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 2,
  },
  calDayDone: { backgroundColor: Colors.success, borderColor: Colors.success },
  calDayCurrent: { borderColor: '#FFE566', borderWidth: 2, backgroundColor: Colors.primary + '30' },
  calDoneIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  calDayCoins: { color: Colors.gold, fontSize: 8, fontWeight: FontWeight.bold, textAlign: 'center' },
  calDiamonds: { color: Colors.diamond, fontSize: 7, fontWeight: FontWeight.bold },
  calDayLabel: { color: Colors.textMuted, fontSize: 7, textAlign: 'center' },

  // Check-in CTA
  checkInSection: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md, gap: Spacing.xs },
  checkInBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  checkInBtnDone: { backgroundColor: Colors.success, shadowColor: Colors.success },
  checkInBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  checkInSub: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },

  // Streak bonus
  streakBonusCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, borderRadius: BorderRadius.xl, overflow: 'hidden' },
  streakBonusGrad: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.sm },
  streakBonusTitle: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  streakBonusSub: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.xs, lineHeight: 16 },
  streakBonusDays: { color: '#FFF', fontSize: 24, fontWeight: FontWeight.black },

  // Treasure row
  treasureRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder, gap: Spacing.sm },
  treasureBtn: { alignItems: 'center', gap: 3, backgroundColor: Colors.primary + '15', borderRadius: BorderRadius.lg, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.primary + '40', minWidth: 68 },
  treasureBtnText: { color: Colors.primary, fontSize: 9, fontWeight: FontWeight.bold },

  // Events
  eventCard: { borderRadius: BorderRadius.xl, overflow: 'hidden', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  eventImg: { width: '100%', height: 120 },
  eventImgGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  timeLeftBadge: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  timeLeftText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.bold },
  eventBody: { padding: Spacing.md, gap: Spacing.xs },
  eventTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  eventDate: { color: Colors.textMuted, fontSize: FontSize.xs },
  eventPoolRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventPool: { color: Colors.gold, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  // Progress bar
  progressWrap: { gap: 3 },
  progressBar: { height: 6, backgroundColor: Colors.bgSecondary, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  progressLabel: { color: Colors.textMuted, fontSize: FontSize.xs },

  // Claim button
  claimBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.sm, alignItems: 'center', marginTop: Spacing.xs },
  claimBtnDone: { backgroundColor: Colors.success },
  claimBtnDisabled: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  claimBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  // Challenges
  challengeHeader: { marginBottom: Spacing.xs },
  challengeCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder },
  challengeCardDone: { borderColor: Colors.success + '60', backgroundColor: Colors.success + '08' },
  challengeIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.bgSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.cardBorder },
  challengeTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  challengeReward: { color: Colors.gold, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  challengeDesc: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 16 },
  challengeClaimBtn: { borderRadius: BorderRadius.pill, paddingVertical: 6, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.cardBorder, marginTop: 2 },
  challengeClaimText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
});
