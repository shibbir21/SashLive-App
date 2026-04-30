// SashLive — PK Invite Screen: accept/decline with synced live score polling
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useAlert } from '@/template';
import { useAuth } from '@/template';
import { acceptPKInvite, declinePKInvite, fetchBattleScores, type PKBattle } from '@/services/pkService';
import { MOCK_USERS } from '@/services/mockData';

const { width } = Dimensions.get('window');
const POLL_INTERVAL = 2000;

export default function PKInviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { user } = useAuth();

  const [status, setStatus] = useState<'pending' | 'accepted' | 'declined' | 'live'>('pending');
  const [battle, setBattle] = useState<PKBattle | null>(null);
  const [hostScore, setHostScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideInAnim = useRef(new Animated.Value(300)).current;
  const barAnim = useRef(new Animated.Value(0.5)).current;

  // Mock challenger (in real app, would fetch from pk_battles table using id)
  const challenger = MOCK_USERS[1];
  const me = MOCK_USERS[0];

  useEffect(() => {
    // Slide in animation
    Animated.spring(slideInAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
    // Pulse animation for live indicator
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ])).start();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const startPolling = (battleId: string) => {
    pollRef.current = setInterval(async () => {
      const data = await fetchBattleScores(battleId);
      if (!data) return;
      setHostScore(data.host_score);
      setOpponentScore(data.opponent_score);
      const total = data.host_score + data.opponent_score;
      const pct = total > 0 ? data.host_score / total : 0.5;
      Animated.spring(barAnim, { toValue: pct, useNativeDriver: false, tension: 60 }).start();
      if (data.status === 'finished') {
        if (pollRef.current) clearInterval(pollRef.current);
        showAlert(data.winner_id === user?.id ? '🏆 You Won!' : '💔 Battle Ended', `Final Score: ${data.host_score} — ${data.opponent_score}`);
        router.back();
      }
    }, POLL_INTERVAL);
  };

  const startTimer = () => {
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 0) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const handleAccept = async () => {
    setLoading(true);
    if (id && id !== 'preview') {
      const { error } = await acceptPKInvite(id);
      if (error) { showAlert('Error', error); setLoading(false); return; }
    }
    setStatus('accepted');
    setLoading(false);
    // Simulate going live after 2s
    setTimeout(() => {
      setStatus('live');
      startTimer();
      if (id && id !== 'preview') startPolling(id);
      // Simulate score updates for demo
      const scoreInterval = setInterval(() => {
        setHostScore(s => s + Math.floor(Math.random() * 50));
        setOpponentScore(s => s + Math.floor(Math.random() * 40));
      }, 3000);
      setTimeout(() => clearInterval(scoreInterval), 300000);
    }, 2000);
  };

  const handleDecline = async () => {
    setLoading(true);
    if (id && id !== 'preview') await declinePKInvite(id);
    setStatus('declined');
    setLoading(false);
    setTimeout(() => router.back(), 1500);
  };

  const pkTotal = hostScore + opponentScore;
  const myPercent = pkTotal > 0 ? opponentScore / pkTotal : 0.5;
  const pkMins = Math.floor(timeLeft / 60);
  const pkSecs = timeLeft % 60;

  if (status === 'declined') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={{ fontSize: 64 }}>🚫</Text>
          <Text style={styles.declinedText}>Challenge Declined</Text>
          <Text style={styles.declinedSub}>You declined the PK battle</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'accepted') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Text style={{ fontSize: 64 }}>⚔️</Text>
          </Animated.View>
          <Text style={styles.acceptedText}>Battle Starting!</Text>
          <Text style={styles.acceptedSub}>Launching your live room...</Text>
          <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.md }} />
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'live') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Live PK arena */}
        <View style={styles.liveHeader}>
          <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.liveText}>PK BATTLE LIVE</Text>
          <Text style={[styles.timer, timeLeft <= 60 && { color: Colors.live }]}>
            {pkMins}:{pkSecs.toString().padStart(2, '0')}
          </Text>
        </View>

        {/* Score display */}
        <View style={styles.scoreSection}>
          <View style={styles.scorePlayer}>
            <Image source={{ uri: challenger.avatar }} style={[styles.scoreAv, { borderColor: Colors.primary }]} contentFit="cover" />
            <Text style={styles.scorePlayerName}>{challenger.username}</Text>
            <Text style={[styles.scoreVal, { color: Colors.primary }]}>{hostScore.toLocaleString()}</Text>
          </View>
          <View style={styles.vsCircle}><Text style={styles.vsText}>VS</Text></View>
          <View style={[styles.scorePlayer, { alignItems: 'flex-end' }]}>
            <Image source={{ uri: me.avatar }} style={[styles.scoreAv, { borderColor: Colors.secondary }]} contentFit="cover" />
            <Text style={styles.scorePlayerName}>{me.username}</Text>
            <Text style={[styles.scoreVal, { color: Colors.secondary }]}>{opponentScore.toLocaleString()}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.pkBarWrap}>
          <Animated.View style={[styles.pkBarLeft, { flex: barAnim }]} />
          <View style={styles.pkBarCenter}><Text style={styles.pkBarCenterText}>⚔</Text></View>
          <Animated.View style={[styles.pkBarRight, { flex: Animated.subtract(new Animated.Value(1), barAnim) as any }]} />
        </View>

        {/* Status label */}
        <Text style={styles.pkStatusLabel}>
          {myPercent > 0.55 ? '🔥 You are dominating!' : myPercent < 0.45 ? '💪 Keep sending gifts!' : '⚖️ It is a tie!'}
        </Text>

        {/* Gift prompts */}
        <Text style={styles.giftPrompt}>Ask your viewers to send gifts! 🎁</Text>
        <Pressable style={styles.viewLiveBtn} onPress={() => router.push('/live/room001')}>
          <View style={styles.liveDotSmall} />
          <Text style={styles.viewLiveBtnText}>View Live Room</Text>
        </Pressable>

        {/* End battle */}
        <Pressable style={styles.endBattleBtn} onPress={() => {
          showAlert('End Battle?', 'Are you sure you want to end this PK battle?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'End Battle', style: 'destructive', onPress: () => { if (pollRef.current) clearInterval(pollRef.current); router.back(); } },
          ]);
        }}>
          <Text style={styles.endBattleBtnText}>🏳 End Battle</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // Status: pending — show invite card
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.bgGrad} />
      <Animated.View style={[styles.card, { transform: [{ translateY: slideInAnim }] }]}>
        {/* Challenge icon */}
        <Animated.View style={[styles.pkIconWrap, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={{ fontSize: 56 }}>⚔️</Text>
        </Animated.View>

        <Text style={styles.title}>PK Battle Challenge!</Text>
        <Text style={styles.subtitle}>You have been challenged to a live battle</Text>

        {/* Challenger card */}
        <View style={styles.challengers}>
          <View style={styles.challenger}>
            <Image source={{ uri: challenger.avatar }} style={[styles.challAv, { borderColor: Colors.primary }]} contentFit="cover" />
            <Text style={styles.challName}>{challenger.displayName}</Text>
            <Text style={styles.challSub}>@{challenger.username}</Text>
            <View style={[styles.challBadge, { backgroundColor: Colors.primary }]}>
              <Text style={styles.challBadgeText}>CHALLENGER</Text>
            </View>
          </View>

          <View style={styles.vsWrap}>
            <Text style={styles.vsLarge}>VS</Text>
            <Text style={styles.vsSub}>5 min battle</Text>
          </View>

          <View style={styles.challenger}>
            <Image source={{ uri: me.avatar }} style={[styles.challAv, { borderColor: Colors.secondary }]} contentFit="cover" />
            <Text style={styles.challName}>{me.displayName}</Text>
            <Text style={styles.challSub}>@{me.username}</Text>
            <View style={[styles.challBadge, { backgroundColor: Colors.secondary }]}>
              <Text style={styles.challBadgeText}>YOU</Text>
            </View>
          </View>
        </View>

        {/* Rules */}
        <View style={styles.rules}>
          <Text style={styles.rulesTitle}>⚔️ PK Battle Rules</Text>
          {[
            '🎁 Your fans send gifts during battle',
            '💎 Each gift adds to your score',
            '🏆 Highest score wins the battle',
            '⏱ Battle lasts 5 minutes',
          ].map((rule, i) => (
            <Text key={i} style={styles.ruleItem}>{rule}</Text>
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.declineBtn, loading && { opacity: 0.5 }]}
            onPress={handleDecline}
            disabled={loading}
          >
            <MaterialIcons name="close" size={20} color={Colors.error} />
            <Text style={styles.declineBtnText}>Decline</Text>
          </Pressable>
          <Pressable
            style={[styles.acceptBtn, loading && { opacity: 0.5 }]}
            onPress={handleAccept}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Text style={{ fontSize: 20 }}>⚔️</Text>
                <Text style={styles.acceptBtnText}>Accept Battle!</Text>
              </>
            )}
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  bgGrad: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.primary + '08' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  declinedText: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  declinedSub: { color: Colors.textMuted, fontSize: FontSize.md },
  acceptedText: { color: Colors.primary, fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  acceptedSub: { color: Colors.textMuted, fontSize: FontSize.md },
  // Invite card
  card: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.md },
  pkIconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.primary + '50' },
  title: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: FontWeight.black, textAlign: 'center' },
  subtitle: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center' },
  challengers: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.cardBorder, width: '100%' },
  challenger: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  challAv: { width: 70, height: 70, borderRadius: 35, borderWidth: 3 },
  challName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold, textAlign: 'center' },
  challSub: { color: Colors.textMuted, fontSize: FontSize.xs },
  challBadge: { borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  challBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 1 },
  vsWrap: { alignItems: 'center', gap: Spacing.xs },
  vsLarge: { color: Colors.primary, fontSize: FontSize.xxl, fontWeight: FontWeight.black },
  vsSub: { color: Colors.textMuted, fontSize: FontSize.xs },
  rules: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.cardBorder, width: '100%', gap: 6 },
  rulesTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginBottom: 4 },
  ruleItem: { color: Colors.textSecondary, fontSize: FontSize.xs, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: Spacing.md, width: '100%', marginTop: Spacing.sm },
  declineBtn: { flex: 0.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: BorderRadius.pill, backgroundColor: Colors.error + '15', borderWidth: 1.5, borderColor: Colors.error },
  declineBtnText: { color: Colors.error, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  acceptBtn: { flex: 0.6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: BorderRadius.pill, backgroundColor: Colors.primary },
  acceptBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  // Live battle view
  liveHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.md, backgroundColor: Colors.live + '15', borderBottomWidth: 1, borderBottomColor: Colors.live + '30' },
  liveDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.live },
  liveDotSmall: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.live },
  liveText: { color: Colors.live, fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 2 },
  timer: { color: Colors.gold, fontSize: FontSize.lg, fontWeight: FontWeight.black },
  scoreSection: { flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
  scorePlayer: { flex: 1, alignItems: 'flex-start', gap: Spacing.xs },
  scoreAv: { width: 72, height: 72, borderRadius: 36, borderWidth: 3 },
  scorePlayerName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  scoreVal: { fontSize: FontSize.xxl, fontWeight: FontWeight.black },
  vsCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.primary },
  vsText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.black },
  pkBarWrap: { flexDirection: 'row', height: 20, marginHorizontal: Spacing.md, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.2)', position: 'relative' },
  pkBarLeft: { height: '100%', backgroundColor: Colors.primary },
  pkBarCenter: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 24, transform: [{ translateX: -12 }], alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg, zIndex: 10 },
  pkBarCenterText: { fontSize: 12 },
  pkBarRight: { height: '100%', backgroundColor: Colors.secondary },
  pkStatusLabel: { color: Colors.gold, fontSize: FontSize.md, fontWeight: FontWeight.bold, textAlign: 'center', paddingHorizontal: Spacing.md },
  giftPrompt: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center' },
  viewLiveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, backgroundColor: Colors.live, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, marginHorizontal: Spacing.md },
  viewLiveBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  endBattleBtn: { borderWidth: 1, borderColor: Colors.error, borderRadius: BorderRadius.pill, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl, alignSelf: 'center', marginTop: Spacing.sm },
  endBattleBtnText: { color: Colors.error, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
