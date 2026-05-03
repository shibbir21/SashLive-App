// SashLive — PK Battle Screen: Full challenge flow, accept/decline, synced live scoring
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated, ActivityIndicator,
  Dimensions, ScrollView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useAlert } from '@/template';
import { useAuth } from '@/template';
import { useApp } from '@/contexts/AppContext';
import { acceptPKInvite, declinePKInvite, fetchBattleScores } from '@/services/pkService';
import { getSupabaseClient } from '@/template';
import { GIFTS } from '@/constants/config';
import { MOCK_USERS } from '@/services/mockData';

const { width, height } = Dimensions.get('window');
const POLL_INTERVAL = 2000;

type PKStatus = 'pending' | 'accepted' | 'live' | 'declined' | 'ended';

interface Particle {
  id: string;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  emoji: string;
}

function PKParticleExplosion({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const EMOJIS = ['💎', '🌟', '🔥', '⚡', '👑', '🎉', '✨', '💫'];

  useEffect(() => {
    if (!active) return;
    const newParticles: Particle[] = [];
    for (let i = 0; i < 12; i++) {
      const x = new Animated.Value(width / 2);
      const y = new Animated.Value(height / 2);
      const opacity = new Animated.Value(1);
      const scale = new Animated.Value(0);
      const id = `pk_${Date.now()}_${i}`;
      const angle = (i / 12) * Math.PI * 2;
      const dist = 80 + Math.random() * 120;
      newParticles.push({ id, x, y, opacity, scale, emoji: EMOJIS[i % EMOJIS.length] });
      Animated.parallel([
        Animated.timing(x, { toValue: width / 2 + Math.cos(angle) * dist, duration: 800, useNativeDriver: true }),
        Animated.timing(y, { toValue: height / 2 + Math.sin(angle) * dist, duration: 800, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.5, duration: 300, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      ]).start();
      setTimeout(() => setParticles(p => p.filter(pp => pp.id !== id)), 850);
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, [active]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles.map(p => (
        <Animated.View key={p.id} style={[styles.particle, {
          transform: [
            { translateX: p.x },
            { translateY: p.y },
            { scale: p.scale },
          ],
          opacity: p.opacity,
        }]}>
          <Text style={{ fontSize: 20 }}>{p.emoji}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

export default function PKBattleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const { currentUser, updateDiamonds } = useApp();
  const supabase = getSupabaseClient();

  const [status, setStatus] = useState<PKStatus>('pending');
  const [loading, setLoading] = useState(false);
  const [hostScore, setHostScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300);
  const [showGifts, setShowGifts] = useState(false);
  const [giftTarget, setGiftTarget] = useState<'host' | 'opponent'>('host');
  const [particleActive, setParticleActive] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [recentGifts, setRecentGifts] = useState<Array<{ id: string; icon: string; sender: string; target: string }>>([]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideInAnim = useRef(new Animated.Value(height * 0.4)).current;
  const barAnim = useRef(new Animated.Value(0.5)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const vsScaleAnim = useRef(new Animated.Value(1)).current;
  const countdownAnim = useRef(new Animated.Value(1)).current;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mock challenger data
  const challenger = MOCK_USERS[2];
  const me = MOCK_USERS[0];

  useEffect(() => {
    Animated.spring(slideInAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }).start();

    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ])).start();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (scoreTimerRef.current) clearInterval(scoreTimerRef.current);
    };
  }, []);

  const startLive = useCallback((battleId?: string) => {
    setStatus('live');

    // Countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setStatus('ended');
          return 0;
        }
        // Flash countdown at last 30s
        if (t <= 30) {
          Animated.sequence([
            Animated.timing(countdownAnim, { toValue: 1.3, duration: 100, useNativeDriver: true }),
            Animated.timing(countdownAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          ]).start();
        }
        return t - 1;
      });
    }, 1000);

    // Score simulation + DB polling
    scoreTimerRef.current = setInterval(() => {
      const hDelta = Math.floor(Math.random() * 100);
      const oDelta = Math.floor(Math.random() * 80);
      setHostScore(s => {
        const next = s + hDelta;
        const total = next + (opponentScore + oDelta);
        Animated.spring(barAnim, { toValue: total > 0 ? next / total : 0.5, useNativeDriver: false, tension: 60 }).start();
        return next;
      });
      setOpponentScore(s => s + oDelta);
    }, 4000);

    // Poll DB scores if we have a real battle
    if (battleId && battleId !== 'preview') {
      pollRef.current = setInterval(async () => {
        const data = await fetchBattleScores(battleId);
        if (!data) return;
        setHostScore(data.host_score || 0);
        setOpponentScore(data.opponent_score || 0);
        const total = (data.host_score || 0) + (data.opponent_score || 0);
        if (total > 0) {
          Animated.spring(barAnim, { toValue: (data.host_score || 0) / total, useNativeDriver: false, tension: 60 }).start();
        }
        if (data.status === 'finished') {
          if (pollRef.current) clearInterval(pollRef.current);
          setStatus('ended');
        }
      }, POLL_INTERVAL);
    }
  }, []);

  const handleAccept = async () => {
    setLoading(true);
    if (id && id !== 'preview') {
      const { error } = await acceptPKInvite(id);
      if (error) { showAlert('Error', error); setLoading(false); return; }
    }
    setStatus('accepted');
    setLoading(false);
    setTimeout(() => startLive(id), 2000);
  };

  const handleDecline = async () => {
    setLoading(true);
    if (id && id !== 'preview') await declinePKInvite(id);
    setStatus('declined');
    setLoading(false);
    setTimeout(() => router.back(), 1800);
  };

  const handleSendGift = async (gift: typeof GIFTS[0]) => {
    if (currentUser.diamonds < gift.price) {
      showAlert('Not Enough Diamonds', 'Recharge to send gifts!', [
        { text: '💎 Recharge', onPress: () => router.push('/recharge') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    updateDiamonds(-gift.price);
    setShowGifts(false);
    setParticleActive(true);
    setTimeout(() => setParticleActive(false), 100);

    const giftEntry = { id: `g_${Date.now()}`, icon: gift.icon, sender: 'You', target: giftTarget };
    setRecentGifts(prev => [giftEntry, ...prev.slice(0, 4)]);

    if (giftTarget === 'host') {
      setHostScore(s => {
        const next = s + gift.price;
        const total = next + opponentScore;
        if (total > 0) Animated.spring(barAnim, { toValue: next / total, useNativeDriver: false }).start();
        return next;
      });
    } else {
      setOpponentScore(s => s + gift.price);
    }

    // Update PK scores in DB
    if (id && id !== 'preview') {
      await supabase.from('pk_battles').update({
        [giftTarget === 'host' ? 'host_score' : 'opponent_score']:
          (giftTarget === 'host' ? hostScore : opponentScore) + gift.price,
      }).eq('id', id);
    }
  };

  const handleEndBattle = () => {
    showAlert('End PK Battle?', 'Are you sure?', [
      {
        text: 'End Battle',
        style: 'destructive',
        onPress: async () => {
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          if (scoreTimerRef.current) clearInterval(scoreTimerRef.current);
          if (id && id !== 'preview') {
            await supabase.from('pk_battles').update({ status: 'finished' }).eq('id', id);
          }
          setStatus('ended');
        },
      },
      { text: 'Continue', style: 'cancel' },
    ]);
  };

  const pkTotal = hostScore + opponentScore;
  const hostPct = pkTotal > 0 ? hostScore / pkTotal : 0.5;
  const pkMins = Math.floor(timeLeft / 60);
  const pkSecs = timeLeft % 60;

  // ── DECLINED ──
  if (status === 'declined') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <Text style={{ fontSize: 72 }}>🚫</Text>
          <Text style={styles.bigText}>Challenge Declined</Text>
          <Text style={styles.subText}>Better luck next time!</Text>
          <Pressable style={styles.backHomeBtn} onPress={() => router.back()}>
            <Text style={styles.backHomeBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── ACCEPTED ──
  if (status === 'accepted') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Text style={{ fontSize: 80 }}>⚔️</Text>
          </Animated.View>
          <Text style={[styles.bigText, { color: Colors.live }]}>Battle Starting!</Text>
          <Text style={styles.subText}>Launching live room...</Text>
          <View style={styles.loadingDots}>
            {[0, 1, 2].map(i => (
              <Animated.View key={i} style={[styles.loadingDot, { opacity: pulseAnim }]} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── ENDED ──
  if (status === 'ended') {
    const iWon = hostScore > opponentScore;
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <LinearGradient
          colors={iWon ? [Colors.gold + '20', Colors.bg] : [Colors.secondary + '10', Colors.bg]}
          style={styles.endedBg}
        >
          <View style={styles.centered}>
            <Text style={{ fontSize: 80 }}>{iWon ? '🏆' : '💪'}</Text>
            <Text style={[styles.bigText, { color: iWon ? Colors.gold : Colors.secondary }]}>
              {iWon ? 'Battle Won!' : 'Great Fight!'}
            </Text>
            <View style={styles.finalScoreCard}>
              <View style={styles.finalSide}>
                <Image source={{ uri: challenger.avatar }} style={styles.finalAv} contentFit="cover" />
                <Text style={styles.finalName}>{challenger.displayName.split(' ')[0]}</Text>
                <Text style={[styles.finalScore, { color: Colors.primary }]}>{hostScore.toLocaleString()}</Text>
              </View>
              <View style={styles.finalVs}><Text style={styles.finalVsText}>FINAL</Text></View>
              <View style={styles.finalSide}>
                <Image source={{ uri: me.avatar }} style={styles.finalAv} contentFit="cover" />
                <Text style={styles.finalName}>You</Text>
                <Text style={[styles.finalScore, { color: Colors.secondary }]}>{opponentScore.toLocaleString()}</Text>
              </View>
            </View>
            <Text style={styles.endedSub}>
              {iWon ? '🎉 Congratulations! You dominated!' : 'You fought bravely! Try again!'}
            </Text>
            <View style={styles.endedBtns}>
              <Pressable style={styles.endedBtn} onPress={() => router.back()}>
                <Text style={styles.endedBtnText}>🏠 Go Home</Text>
              </Pressable>
              <Pressable style={[styles.endedBtn, { backgroundColor: Colors.primary }]} onPress={() => router.push('/leaderboard')}>
                <Text style={[styles.endedBtnText, { color: '#FFF' }]}>🏆 Leaderboard</Text>
              </Pressable>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // ── LIVE VIEW ──
  if (status === 'live') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <PKParticleExplosion active={particleActive} />

        {/* Live header */}
        <LinearGradient colors={['rgba(233,30,140,0.15)', 'transparent']} style={styles.liveHeader}>
          <View style={styles.liveHeaderLeft}>
            <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.liveText}>PK BATTLE</Text>
          </View>
          <Animated.Text style={[styles.timerText, timeLeft <= 30 && styles.timerTextUrgent, { transform: [{ scale: countdownAnim }] }]}>
            {pkMins}:{pkSecs.toString().padStart(2, '0')}
          </Animated.Text>
          <Pressable style={styles.endBattleHeaderBtn} onPress={handleEndBattle}>
            <MaterialIcons name="stop" size={14} color="#FFF" />
            <Text style={styles.endBattleHeaderText}>End</Text>
          </Pressable>
        </LinearGradient>

        {/* Battle arena */}
        <View style={styles.battleArena}>
          {/* Host side */}
          <View style={styles.playerSide}>
            <Animated.View style={[styles.playerGlow, {
              opacity: glowAnim,
              backgroundColor: Colors.primary + '40',
              transform: [{ scale: hostPct > 0.5 ? pulseAnim : new Animated.Value(1) }],
            }]} />
            <Image source={{ uri: challenger.avatar }} style={[styles.playerAv, { borderColor: Colors.primary }]} contentFit="cover" />
            {hostPct > 0.5 && (
              <View style={[styles.leadBadge, { backgroundColor: Colors.primary }]}>
                <Text style={styles.leadBadgeText}>👑 LEADING</Text>
              </View>
            )}
            <Text style={styles.playerName}>{challenger.displayName.split(' ')[0]}</Text>
            <Text style={[styles.playerScore, { color: Colors.primary }]}>{hostScore.toLocaleString()}</Text>
            <Pressable
              style={[styles.supportBtn, { borderColor: Colors.primary, backgroundColor: giftTarget === 'host' ? Colors.primary + '30' : 'transparent' }]}
              onPress={() => { setGiftTarget('host'); setShowGifts(true); }}
            >
              <Text style={styles.supportBtnText}>🎁 Support</Text>
            </Pressable>
          </View>

          {/* Center VS */}
          <View style={styles.vsSection}>
            <Animated.View style={[styles.vsCircle, { transform: [{ scale: vsScaleAnim }] }]}>
              <Text style={styles.vsText}>VS</Text>
            </Animated.View>
            <Text style={styles.vsDivider}>⚔️</Text>
          </View>

          {/* Opponent side */}
          <View style={[styles.playerSide, { alignItems: 'flex-end' }]}>
            <Animated.View style={[styles.playerGlow, {
              opacity: glowAnim,
              backgroundColor: Colors.secondary + '40',
              right: 0, left: undefined,
              transform: [{ scale: hostPct < 0.5 ? pulseAnim : new Animated.Value(1) }],
            }]} />
            <Image source={{ uri: me.avatar }} style={[styles.playerAv, { borderColor: Colors.secondary }]} contentFit="cover" />
            {hostPct < 0.5 && (
              <View style={[styles.leadBadge, { backgroundColor: Colors.secondary }]}>
                <Text style={styles.leadBadgeText}>👑 LEADING</Text>
              </View>
            )}
            <Text style={styles.playerName}>You</Text>
            <Text style={[styles.playerScore, { color: Colors.secondary }]}>{opponentScore.toLocaleString()}</Text>
            <Pressable
              style={[styles.supportBtn, { borderColor: Colors.secondary, backgroundColor: giftTarget === 'opponent' ? Colors.secondary + '30' : 'transparent' }]}
              onPress={() => { setGiftTarget('opponent'); setShowGifts(true); }}
            >
              <Text style={styles.supportBtnText}>🎁 Support</Text>
            </Pressable>
          </View>
        </View>

        {/* Score Bar */}
        <View style={styles.scoreBarWrap}>
          <Text style={[styles.scorePct, { color: Colors.primary }]}>{Math.round(hostPct * 100)}%</Text>
          <View style={styles.scoreBar}>
            <Animated.View style={[styles.scoreBarLeft, { flex: barAnim }]} />
            <View style={styles.scoreBarCenter}>
              <Text style={styles.scoreBarCenterIcon}>⚔</Text>
            </View>
            <Animated.View style={[styles.scoreBarRight, {
              flex: barAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            }]} />
          </View>
          <Text style={[styles.scorePct, { color: Colors.secondary }]}>{Math.round((1 - hostPct) * 100)}%</Text>
        </View>

        {/* Status label */}
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>
            {hostPct > 0.65 ? '🔥 Dominating!' : hostPct > 0.5 ? '📈 Leading' : hostPct < 0.35 ? '💪 Fight Back!' : hostPct < 0.5 ? '📉 Behind' : '⚖️ Tied!'}
          </Text>
        </View>

        {/* Recent gifts feed */}
        {recentGifts.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.giftFeed} contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.sm }}>
            {recentGifts.map(g => (
              <View key={g.id} style={[styles.giftFeedItem, { borderColor: g.target === 'host' ? Colors.primary + '60' : Colors.secondary + '60' }]}>
                <Text style={{ fontSize: 18 }}>{g.icon}</Text>
                <Text style={styles.giftFeedText}>→ {g.target === 'host' ? challenger.displayName.split(' ')[0] : 'You'}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Action buttons */}
        <View style={styles.actionBtns}>
          <Pressable style={[styles.actionBtn, { backgroundColor: Colors.primary }]} onPress={() => { setGiftTarget('host'); setShowGifts(true); }}>
            <Text style={{ fontSize: 18 }}>🎁</Text>
            <Text style={styles.actionBtnText}>Gift Host</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, { backgroundColor: Colors.secondary }]} onPress={() => { setGiftTarget('opponent'); setShowGifts(true); }}>
            <Text style={{ fontSize: 18 }}>🎁</Text>
            <Text style={styles.actionBtnText}>Gift Me</Text>
          </Pressable>
          {currentRoomId ? (
            <Pressable style={[styles.actionBtn, { backgroundColor: Colors.live }]} onPress={() => router.push(`/live/${currentRoomId}` as any)}>
              <Text style={{ fontSize: 18 }}>📺</Text>
              <Text style={styles.actionBtnText}>View Live</Text>
            </Pressable>
          ) : null}
          <Pressable style={[styles.actionBtn, { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.error }]} onPress={handleEndBattle}>
            <MaterialIcons name="stop" size={18} color={Colors.error} />
            <Text style={[styles.actionBtnText, { color: Colors.error }]}>End</Text>
          </Pressable>
        </View>

        {/* Gift Panel */}
        <Modal visible={showGifts} transparent animationType="slide" onRequestClose={() => setShowGifts(false)}>
          <Pressable style={styles.giftModalBg} onPress={() => setShowGifts(false)} />
          <View style={styles.giftPanel}>
            <View style={styles.giftPanelHeader}>
              <Text style={styles.giftPanelTitle}>🎁 Send Gift to {giftTarget === 'host' ? challenger.displayName.split(' ')[0] : 'Yourself'}</Text>
              <Pressable onPress={() => setShowGifts(false)}>
                <MaterialIcons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.giftPanelBalance}>
              <Text style={styles.giftPanelBalanceText}>💎 {currentUser.diamonds.toLocaleString()} available</Text>
            </View>
            <ScrollView>
              <View style={styles.giftGrid}>
                {GIFTS.map(gift => (
                  <Pressable
                    key={gift.id}
                    style={[styles.giftItem, currentUser.diamonds < gift.price && { opacity: 0.4 }]}
                    onPress={() => handleSendGift(gift)}
                    disabled={currentUser.diamonds < gift.price}
                  >
                    <Text style={{ fontSize: 36 }}>{gift.icon}</Text>
                    <Text style={styles.giftItemName}>{gift.name}</Text>
                    <View style={styles.giftItemPrice}>
                      <Text style={styles.giftItemPriceText}>💎{gift.price}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ── PENDING / INVITE VIEW ──
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Background glow */}
      <Animated.View style={[styles.bgGlow, { opacity: glowAnim }]} />

      <Animated.View style={[styles.card, { transform: [{ translateY: slideInAnim }] }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cardScroll}>
          {/* PK Icon */}
          <Animated.View style={[styles.pkIconWrap, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient colors={[Colors.primary + '50', Colors.secondary + '50']} style={styles.pkIconGrad}>
              <Text style={{ fontSize: 56 }}>⚔️</Text>
            </LinearGradient>
          </Animated.View>

          <Text style={styles.challengeTitle}>PK Battle Challenge!</Text>
          <Text style={styles.challengeSub}>You have been challenged to a live battle</Text>

          {/* Challengers */}
          <LinearGradient colors={[Colors.surface, Colors.bgSecondary]} style={styles.challengersCard}>
            <View style={styles.challengerSide}>
              <View style={styles.challAvRing}>
                <Image source={{ uri: challenger.avatar }} style={styles.challAv} contentFit="cover" />
                <View style={[styles.challRoleBadge, { backgroundColor: Colors.primary }]}>
                  <Text style={styles.challRoleBadgeText}>CHALLENGER</Text>
                </View>
              </View>
              <Text style={styles.challName}>{challenger.displayName}</Text>
              <Text style={styles.challUsername}>@{challenger.username}</Text>
              <Text style={styles.challFollowers}>{(challenger.followers / 1000).toFixed(1)}K followers</Text>
            </View>

            <View style={styles.vsCenterSection}>
              <View style={styles.vsCenterCircle}>
                <Text style={styles.vsCenterText}>VS</Text>
              </View>
              <Text style={styles.vsSubText}>5 min</Text>
              <Text style={styles.vsSubText}>battle</Text>
            </View>

            <View style={[styles.challengerSide, { alignItems: 'flex-end' }]}>
              <View style={styles.challAvRing}>
                <Image source={{ uri: me.avatar }} style={styles.challAv} contentFit="cover" />
                <View style={[styles.challRoleBadge, { backgroundColor: Colors.secondary }]}>
                  <Text style={styles.challRoleBadgeText}>YOU</Text>
                </View>
              </View>
              <Text style={styles.challName}>{me.displayName}</Text>
              <Text style={styles.challUsername}>@{me.username}</Text>
              <Text style={styles.challFollowers}>{(me.followers / 1000).toFixed(1)}K followers</Text>
            </View>
          </LinearGradient>

          {/* PK Rules */}
          <View style={styles.rulesCard}>
            <Text style={styles.rulesTitle}>⚔️ Battle Rules</Text>
            {[
              { icon: '🎁', text: 'Fans send gifts to support their favorite host' },
              { icon: '💎', text: 'Each gift adds diamonds to the score' },
              { icon: '🏆', text: 'Highest score after 5 minutes wins' },
              { icon: '💰', text: 'Winner gets 1,000+ bonus points' },
              { icon: '👥', text: 'Both hosts go live simultaneously' },
            ].map((r, i) => (
              <View key={i} style={styles.ruleItem}>
                <Text style={{ fontSize: 18 }}>{r.icon}</Text>
                <Text style={styles.ruleText}>{r.text}</Text>
              </View>
            ))}
          </View>

          {/* Potential earnings */}
          <View style={styles.earningsPreview}>
            <Text style={styles.earningsPreviewTitle}>💰 Potential Earnings</Text>
            <View style={styles.earningsPreviewRow}>
              <Text style={styles.earningsPreviewLabel}>PK Battle Bonus</Text>
              <Text style={styles.earningsPreviewVal}>+1,000 pts/30min</Text>
            </View>
            <View style={styles.earningsPreviewRow}>
              <Text style={styles.earningsPreviewLabel}>Gift Income</Text>
              <Text style={styles.earningsPreviewVal}>70% of diamond value</Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.inviteActions}>
            <Pressable
              style={[styles.declineBtn, loading && { opacity: 0.5 }]}
              onPress={handleDecline}
              disabled={loading}
            >
              <MaterialIcons name="close" size={22} color={Colors.error} />
              <Text style={styles.declineBtnText}>Decline</Text>
            </Pressable>
            <Pressable
              style={[styles.acceptBtn, loading && { opacity: 0.5 }]}
              onPress={handleAccept}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={{ fontSize: 22 }}>⚔️</Text>
                  <Text style={styles.acceptBtnText}>Accept Battle!</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  bigText: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: FontWeight.black, textAlign: 'center' },
  subText: { color: Colors.textMuted, fontSize: FontSize.md, textAlign: 'center' },
  loadingDots: { flexDirection: 'row', gap: 8 },
  loadingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  backHomeBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  backHomeBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  // Pending card
  bgGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 300, backgroundColor: Colors.primary, borderBottomLeftRadius: 200, borderBottomRightRadius: 200, opacity: 0.05 },
  card: { flex: 1 },
  cardScroll: { padding: Spacing.lg, gap: Spacing.lg, alignItems: 'center', paddingBottom: 40 },
  pkIconWrap: { width: 110, height: 110, borderRadius: 55 },
  pkIconGrad: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.primary + '50' },
  challengeTitle: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: FontWeight.black, textAlign: 'center' },
  challengeSub: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center' },
  challengersCard: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.xl, padding: Spacing.lg, width: '100%', borderWidth: 1, borderColor: Colors.cardBorder, gap: Spacing.sm },
  challengerSide: { flex: 1, alignItems: 'flex-start', gap: 3 },
  challAvRing: { position: 'relative', marginBottom: 4 },
  challAv: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: Colors.primary },
  challRoleBadge: { position: 'absolute', bottom: -6, left: '50%', transform: [{ translateX: -28 }], borderRadius: BorderRadius.pill, paddingHorizontal: 6, paddingVertical: 2 },
  challRoleBadgeText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  challName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  challUsername: { color: Colors.textMuted, fontSize: FontSize.xs },
  challFollowers: { color: Colors.textSecondary, fontSize: FontSize.xs },
  vsCenterSection: { alignItems: 'center', gap: 4 },
  vsCenterCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.primary },
  vsCenterText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.black },
  vsSubText: { color: Colors.textMuted, fontSize: FontSize.xs },
  rulesCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, width: '100%', borderWidth: 1, borderColor: Colors.cardBorder, gap: Spacing.sm },
  rulesTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: 4 },
  ruleItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ruleText: { color: Colors.textSecondary, fontSize: FontSize.xs, flex: 1, lineHeight: 18 },
  earningsPreview: { backgroundColor: Colors.success + '10', borderRadius: BorderRadius.lg, padding: Spacing.md, width: '100%', borderWidth: 1, borderColor: Colors.success + '30', gap: 8 },
  earningsPreviewTitle: { color: Colors.success, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  earningsPreviewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  earningsPreviewLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  earningsPreviewVal: { color: Colors.success, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  inviteActions: { flexDirection: 'row', gap: Spacing.md, width: '100%' },
  declineBtn: { flex: 0.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.md, borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: Colors.error, backgroundColor: Colors.error + '10' },
  declineBtnText: { color: Colors.error, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  acceptBtn: { flex: 0.6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: BorderRadius.pill, backgroundColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
  acceptBtnText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  // Live battle view
  liveHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.primary + '30' },
  liveHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.live },
  liveText: { color: Colors.live, fontSize: FontSize.sm, fontWeight: FontWeight.black, letterSpacing: 2 },
  timerText: { color: Colors.gold, fontSize: FontSize.xl, fontWeight: FontWeight.black },
  timerTextUrgent: { color: Colors.live },
  endBattleHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.error, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  endBattleHeaderText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  battleArena: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingHorizontal: Spacing.md, paddingTop: Spacing.lg },
  playerSide: { flex: 1, alignItems: 'flex-start', gap: Spacing.sm, position: 'relative' },
  playerGlow: { position: 'absolute', top: -10, left: -10, width: 120, height: 120, borderRadius: 60, zIndex: -1 },
  playerAv: { width: 80, height: 80, borderRadius: 40, borderWidth: 3 },
  leadBadge: { borderRadius: BorderRadius.pill, paddingHorizontal: 7, paddingVertical: 3 },
  leadBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  playerName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  playerScore: { fontSize: FontSize.xxl, fontWeight: FontWeight.black },
  supportBtn: { borderWidth: 1.5, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 5 },
  supportBtnText: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  vsSection: { alignItems: 'center', gap: 8, paddingHorizontal: Spacing.sm },
  vsCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.primary, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 6 },
  vsText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.black },
  vsDivider: { fontSize: 22 },
  scoreBarWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, gap: Spacing.xs, marginBottom: Spacing.sm },
  scorePct: { fontSize: FontSize.xs, fontWeight: FontWeight.black, width: 32, textAlign: 'center' },
  scoreBar: { flex: 1, height: 18, flexDirection: 'row', borderRadius: 9, overflow: 'hidden', position: 'relative', backgroundColor: 'rgba(0,0,0,0.2)' },
  scoreBarLeft: { height: '100%', backgroundColor: Colors.primary },
  scoreBarCenter: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 22, transform: [{ translateX: -11 }], alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg, zIndex: 10 },
  scoreBarCenterIcon: { fontSize: 12 },
  scoreBarRight: { height: '100%', backgroundColor: Colors.secondary },
  statusRow: { alignItems: 'center', marginBottom: Spacing.sm },
  statusText: { color: Colors.gold, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  giftFeed: { maxHeight: 48, marginBottom: Spacing.sm },
  giftFeedItem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surface, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderWidth: 1 },
  giftFeedText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  actionBtns: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.lg },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill },
  actionBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  // Gift panel
  giftModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  giftPanel: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, maxHeight: height * 0.7, borderTopWidth: 1, borderTopColor: Colors.cardBorder },
  giftPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  giftPanelTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, flex: 1 },
  giftPanelBalance: { backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 4, marginBottom: Spacing.md, alignSelf: 'flex-start', borderWidth: 1, borderColor: Colors.cardBorder },
  giftPanelBalanceText: { color: Colors.diamond, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  giftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  giftItem: { width: (width - Spacing.lg * 2 - Spacing.sm * 3) / 4, alignItems: 'center', gap: 4, padding: Spacing.sm, backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.cardBorder },
  giftItemName: { color: Colors.textSecondary, fontSize: 9, textAlign: 'center' },
  giftItemPrice: { backgroundColor: Colors.diamond + '20', borderRadius: BorderRadius.pill, paddingHorizontal: 5, paddingVertical: 2 },
  giftItemPriceText: { color: Colors.diamond, fontSize: 9, fontWeight: FontWeight.bold },
  // Ended
  endedBg: { flex: 1 },
  finalScoreCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.cardBorder, gap: Spacing.md },
  finalSide: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  finalAv: { width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, borderColor: Colors.primary },
  finalName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  finalScore: { fontSize: FontSize.xxl, fontWeight: FontWeight.black },
  finalVs: { alignItems: 'center' },
  finalVsText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1 },
  endedSub: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center' },
  endedBtns: { flexDirection: 'row', gap: Spacing.md },
  endedBtn: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.cardBorder },
  endedBtnText: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  // Particle
  particle: { position: 'absolute', top: -20, left: -10 },
});
