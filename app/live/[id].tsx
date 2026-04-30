// SashLive — Enhanced Live Room with Earnings Overlay + Treasure Box + PK Gift Rain
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, FlatList, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Dimensions,
  Animated, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useLiveRoom } from '@/hooks/useLiveRoom';
import { useRoomChat } from '@/hooks/useRoomChat';
import { useApp } from '@/contexts/AppContext';
import { MOCK_LIVE_ROOMS } from '@/services/mockData';
import { GIFTS } from '@/constants/config';
import { useAlert } from '@/template';
import { useAuth } from '@/template';
import { sendRoomGift, fetchRoomGiftLeaderboard } from '@/services/roomChatService';
import { updatePKScore, addDiamondsEarned } from '@/services/liveRoomService';
import { claimTreasureBox, calcGiftPoints, EARNING_RATES } from '@/services/earningService';
import { sendGiftNotification } from '@/hooks/usePushNotifications';

const { width, height } = Dimensions.get('window');

const PARTY_SEATS = [
  { id: 1, user: 'CosmicRider', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop', filled: true, isMuted: false, isSpeaking: true, role: 'CO-HOST' },
  { id: 2, user: 'Moonlight',   avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', filled: true, isMuted: false, isSpeaking: false, role: null },
  { id: 3, filled: false, role: null },
  { id: 4, user: 'NeonPulse',   avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', filled: true, isMuted: true, isSpeaking: false, role: null },
  { id: 5, filled: false, role: null },
  { id: 6, user: 'StarKing',    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop', filled: true, isMuted: false, isSpeaking: false, role: null },
  { id: 7, filled: false, role: null },
  { id: 8, filled: false, role: null },
];

const REACTIONS = ['❤️', '🔥', '😍', '👑', '💯', '🎉', '🚀', '🌹', '💎', '⭐'];
const STICKER_ROW = ['😄', '🥰', '😂', '🤩', '😎', '🥳', '👏', '🙌'];

interface RainParticle {
  id: string; icon: string; x: number;
  anim: Animated.Value; scale: Animated.Value; opacity: Animated.Value;
  side: 'left' | 'right'; color: string;
}

function PKGiftRain({ particles }: { particles: RainParticle[] }) {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles.map(p => (
        <Animated.View key={p.id} style={[styles.rainParticle, {
          left: p.x, opacity: p.opacity,
          transform: [
            { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [-60, height * 0.65] }) },
            { scale: p.scale },
            { rotate: p.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', p.side === 'left' ? '-25deg' : '25deg', '0deg'] }) },
          ],
        }]}>
          <Text style={[styles.rainIcon, { textShadowColor: p.color }]}>{p.icon}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

function NumberGuessGame({ onWin, onClose }: { onWin: (a: number) => void; onClose: () => void }) {
  const [guess, setGuess] = useState('');
  const [secret] = useState(Math.floor(Math.random() * 10) + 1);
  const [hint, setHint] = useState('Pick a number 1–10 to win 50💎');
  const [attempts, setAttempts] = useState(3);
  const [done, setDone] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };
  const handleGuess = (n: number) => {
    if (done) return;
    const left = attempts - 1;
    setAttempts(left);
    if (n === secret) { setHint('🎉 Correct! +50💎'); setDone(true); onWin(50); }
    else if (left <= 0) { setHint(`❌ It was ${secret}!`); setDone(true); shake(); }
    else { setHint(n < secret ? `📈 Too low! ${left} left` : `📉 Too high! ${left} left`); shake(); }
    setGuess(String(n));
  };
  return (
    <View style={gS.wrap}>
      <Pressable style={gS.close} onPress={onClose}><MaterialIcons name="close" size={18} color={Colors.textMuted} /></Pressable>
      <Text style={gS.title}>🔢 Number Guess</Text>
      <Animated.Text style={[gS.hint, { transform: [{ translateX: shakeAnim }] }]}>{hint}</Animated.Text>
      <View style={gS.attRow}>{[1,2,3].map(i => <View key={i} style={[gS.att, i > attempts && gS.attUsed]} />)}</View>
      <View style={gS.numGrid}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <Pressable key={n} style={[gS.numBtn, guess === String(n) && gS.numBtnSel, done && n === secret && gS.numBtnWin]} onPress={() => handleGuess(n)} disabled={done}>
            <Text style={[gS.numText, done && n === secret ? { color: '#FFF' } : {}]}>{n}</Text>
          </Pressable>
        ))}
      </View>
      {done ? <Pressable style={gS.actionBtn} onPress={onClose}><Text style={gS.actionBtnText}>Close</Text></Pressable> : null}
    </View>
  );
}

function PollGame({ onClose }: { onClose: () => void }) {
  const [voted, setVoted] = useState<number | null>(null);
  const [votes, setVotes] = useState([1284, 987]);
  const total = votes.reduce((s, v) => s + v, 0);
  const vote = (i: number) => { if (voted !== null) return; setVoted(i); setVotes(v => v.map((x, j) => j === i ? x + 1 : x)); };
  const labels = ['Team Host 🎤', 'Team Opponent ⚔️'];
  return (
    <View style={gS.wrap}>
      <Pressable style={gS.close} onPress={onClose}><MaterialIcons name="close" size={18} color={Colors.textMuted} /></Pressable>
      <Text style={gS.title}>📊 Live Poll</Text>
      <Text style={gS.hint}>Who are you supporting?</Text>
      {labels.map((label, i) => {
        const pct = Math.round((votes[i] / (total + 1)) * 100);
        return (
          <Pressable key={i} style={[gS.pollOpt, voted === i && { borderColor: i === 0 ? Colors.primary : Colors.secondary }]} onPress={() => vote(i)}>
            <View style={[gS.pollFill, { width: `${pct}%` as any, backgroundColor: (i === 0 ? Colors.primary : Colors.secondary) + '35' }]} />
            <Text style={{ fontSize: 16 }}>{i === 0 ? '🔴' : '🔵'}</Text>
            <Text style={gS.pollLabel}>{label}</Text>
            <Text style={[gS.pollPct, { color: i === 0 ? Colors.primary : Colors.secondary }]}>{pct}%</Text>
            {voted === i ? <MaterialIcons name="check-circle" size={16} color={i === 0 ? Colors.primary : Colors.secondary} /> : null}
          </Pressable>
        );
      })}
      <Text style={gS.pollTotal}>{(total + (voted !== null ? 1 : 0)).toLocaleString()} votes</Text>
    </View>
  );
}

function TriviaGame({ onWin, onClose }: { onWin: (a: number) => void; onClose: () => void }) {
  const QUESTIONS = [
    { q: 'Which country has the most live streaming users?', opts: ['USA', 'China', 'India', 'Brazil'], ans: 1 },
    { q: 'What does "PK" stand for in live streaming?', opts: ['Player Kill', 'Point King', 'Peak Karma', 'Pro King'], ans: 0 },
    { q: 'How many diamonds = 1 USD approx on most platforms?', opts: ['100', '50', '10', '1'], ans: 0 },
  ];
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const q = QUESTIONS[qi];
  const choose = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    if (i === q.ans) setScore(s => s + 1);
    setTimeout(() => {
      if (qi < QUESTIONS.length - 1) { setQi(j => j + 1); setSelected(null); }
      else { setDone(true); if (score + (i === q.ans ? 1 : 0) >= 2) onWin(100); }
    }, 900);
  };
  return (
    <View style={gS.wrap}>
      <Pressable style={gS.close} onPress={onClose}><MaterialIcons name="close" size={18} color={Colors.textMuted} /></Pressable>
      <Text style={gS.title}>🧠 Trivia ({qi + 1}/{QUESTIONS.length})</Text>
      {done ? (
        <>
          <Text style={gS.hint}>{score >= 2 ? `🎉 ${score}/3 Correct! +100💎` : `😔 ${score}/3 — Try again!`}</Text>
          <Pressable style={gS.actionBtn} onPress={onClose}><Text style={gS.actionBtnText}>Done</Text></Pressable>
        </>
      ) : (
        <>
          <Text style={[gS.hint, { fontSize: FontSize.sm, lineHeight: 18 }]}>{q.q}</Text>
          {q.opts.map((opt, i) => (
            <Pressable key={i} style={[gS.pollOpt,
              selected !== null && i === q.ans ? { borderColor: Colors.success, backgroundColor: Colors.success + '20' } : null,
              selected === i && i !== q.ans ? { borderColor: Colors.error, backgroundColor: Colors.error + '20' } : null,
            ]} onPress={() => choose(i)} disabled={selected !== null}>
              <Text style={gS.pollLabel}>{String.fromCharCode(65 + i)}. {opt}</Text>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}

export default function LiveRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { currentUser, updateDiamonds, toggleFollow } = useApp();
  const { user } = useAuth();
  const room = MOCK_LIVE_ROOMS.find(r => r.id === id) || MOCK_LIVE_ROOMS[0];
  const roomIdStr = id || 'room001';

  const { messages: dbMessages, loading: chatLoading, sending, sendMsg } = useRoomChat(roomIdStr, user?.id);
  const { messages: mockMessages, viewers, duration, inputText, setInputText,
    showGiftPanel, setShowGiftPanel,
    pkHostScore, setPkHostScore, pkOpponentScore, setPkOpponentScore,
  } = useLiveRoom(roomIdStr);

  const allMessages = dbMessages.length > 0 ? dbMessages : mockMessages;

  const [showReactions, setShowReactions] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; x: number; anim: Animated.Value }[]>([]);
  const [activeGame, setActiveGame] = useState<'guess' | 'poll' | 'trivia' | null>(null);
  const [showMultiStream, setShowMultiStream] = useState(false);
  const [pkTimeLeft, setPkTimeLeft] = useState(600);
  const [activeTab, setActiveTab] = useState<'chat' | 'gifts' | 'rank'>('chat');
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [giftLeaderboard, setGiftLeaderboard] = useState<any[]>([]);
  const [inputFocused, setInputFocused] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [giftTarget, setGiftTarget] = useState<'host' | 'opponent'>('host');

  // ── Earnings overlay ──
  const [sessionStartTime] = useState(Date.now());
  const [sessionPoints, setSessionPoints] = useState(0);
  const [giftPointsTotal, setGiftPointsTotal] = useState(0);
  const [showEarningsOverlay, setShowEarningsOverlay] = useState(false);
  const [sessionDurationMin, setSessionDurationMin] = useState(0);
  const earningBarAnim = useRef(new Animated.Value(0)).current;

  // ── Treasure box ──
  const [treasureVisible, setTreasureVisible] = useState(false);
  const [treasureDailyCount, setTreasureDailyCount] = useState(0);
  const [showTreasureAnim, setShowTreasureAnim] = useState(false);
  const [treasureClaimed, setTreasureClaimed] = useState(0);
  const treasurePulse = useRef(new Animated.Value(1)).current;
  const treasureChestOpen = useRef(new Animated.Value(0)).current;
  const treasureCoinsAnim = useRef(new Animated.Value(0)).current;

  const flatListRef = useRef<FlatList>(null);
  const announcementAnim = useRef(new Animated.Value(1)).current;
  const pkBarAnim = useRef(new Animated.Value(0.5)).current;
  const pkPulseAnim = useRef(new Animated.Value(1)).current;
  const pkLeaderFlash = useRef(new Animated.Value(0)).current;
  const [rainParticles, setRainParticles] = useState<RainParticle[]>([]);
  const [pkBurstActive, setPkBurstActive] = useState(false);
  const speakingAnim = useRef(new Animated.Value(1)).current;

  // Speaking animation
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(speakingAnim, { toValue: 1.18, duration: 400, useNativeDriver: true }),
      Animated.timing(speakingAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ])).start();
  }, []);

  // Session earnings ticker
  useEffect(() => {
    const t = setInterval(() => {
      const mins = Math.floor((Date.now() - sessionStartTime) / 60000);
      setSessionDurationMin(mins);
      const pts = Math.floor((mins / 60) * EARNING_RATES.stream_per_hour);
      setSessionPoints(pts);
      const pct = Math.min(pts / 20000, 1);
      Animated.timing(earningBarAnim, { toValue: pct, duration: 800, useNativeDriver: false }).start();
    }, 30000);
    return () => clearInterval(t);
  }, [sessionStartTime]);

  // Treasure box timer
  useEffect(() => {
    const showTreasure = () => {
      if (treasureDailyCount < EARNING_RATES.treasure_box_max_daily) {
        setTreasureVisible(true);
        Animated.loop(Animated.sequence([
          Animated.timing(treasurePulse, { toValue: 1.18, duration: 500, useNativeDriver: true }),
          Animated.timing(treasurePulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])).start();
        setTimeout(() => setTreasureVisible(false), 30000);
      }
    };
    const interval = setInterval(showTreasure, 5 * 60 * 1000);
    const demo = setTimeout(showTreasure, 8000);
    return () => { clearInterval(interval); clearTimeout(demo); };
  }, [treasureDailyCount]);

  const handleClaimTreasure = async () => {
    if (showTreasureAnim) return;
    setTreasureVisible(false);
    setShowTreasureAnim(true);
    treasureChestOpen.setValue(0);
    treasureCoinsAnim.setValue(0);
    Animated.sequence([
      Animated.spring(treasureChestOpen, { toValue: 1, useNativeDriver: true, tension: 80 }),
      Animated.timing(treasureCoinsAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();
    let coins = EARNING_RATES.treasure_box_coins;
    if (user?.id) {
      const result = await claimTreasureBox(user.id);
      if (result.error) { showAlert('Max Reached', result.error); setShowTreasureAnim(false); return; }
      coins = result.coins;
      setTreasureDailyCount(result.dailyCount);
    } else {
      setTreasureDailyCount(d => d + 1);
    }
    setTreasureClaimed(c => c + coins);
    setTimeout(() => {
      setShowTreasureAnim(false);
      showAlert('📦 Treasure Claimed!', `+${coins} S-Coins!`);
    }, 1400);
  };

  useEffect(() => {
    if (!room.isPK) return;
    const t = setInterval(() => setPkTimeLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [room.isPK]);

  useEffect(() => {
    if (!room.isPK) return;
    const t = setInterval(() => {
      if (Math.random() > 0.55) triggerGiftRain('💎', 'left');
      if (Math.random() > 0.65) triggerGiftRain('🌌', 'right');
    }, 3200);
    return () => clearInterval(t);
  }, [room.isPK]);

  useEffect(() => {
    if (!showAnnouncement) return;
    const t = setTimeout(() => {
      Animated.timing(announcementAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => setShowAnnouncement(false));
    }, 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(pkPulseAnim, { toValue: 1.08, duration: 200, useNativeDriver: true }),
      Animated.timing(pkPulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    const total = pkHostScore + pkOpponentScore;
    const pct = total > 0 ? pkHostScore / total : 0.5;
    Animated.spring(pkBarAnim, { toValue: pct, useNativeDriver: false, tension: 60, friction: 10 }).start();
  }, [pkHostScore, pkOpponentScore]);

  useEffect(() => {
    if (allMessages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [allMessages.length]);

  useEffect(() => {
    if (activeTab === 'rank') {
      fetchRoomGiftLeaderboard(roomIdStr).then(({ data }) => {
        if (data.length > 0) setGiftLeaderboard(data);
      });
    }
  }, [activeTab]);

  const triggerGiftRain = useCallback((icon: string, side: 'left' | 'right', count = 8) => {
    const COLORS: Record<string, string> = {
      '💎': Colors.diamond, '🌌': Colors.secondary, '🔥': Colors.live,
      '👑': Colors.gold, '🚀': Colors.primary, '🌹': '#FF4088', '⭐': Colors.gold,
    };
    const particles: RainParticle[] = [];
    const baseX = side === 'left' ? 16 : width * 0.5;
    for (let i = 0; i < count; i++) {
      const anim = new Animated.Value(0);
      const scale = new Animated.Value(0.3 + Math.random() * 0.7);
      const opacity = new Animated.Value(1);
      const pid = `rp_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`;
      particles.push({ id: pid, icon, x: baseX + Math.random() * (width * 0.42), anim, scale, opacity, side, color: COLORS[icon] || Colors.primary });
      const delay = i * 55;
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(anim, { toValue: 1, duration: 1500 + Math.random() * 700, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(scale, { toValue: 1.2 + Math.random() * 0.5, duration: 350, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 0.2, duration: 900, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(1000),
            Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
          ]),
        ]),
      ]).start();
      setTimeout(() => setRainParticles(p => p.filter(x => x.id !== pid)), delay + 2400);
    }
    setRainParticles(prev => [...prev, ...particles]);
    setPkBurstActive(true);
    Animated.sequence([
      Animated.timing(pkLeaderFlash, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(pkLeaderFlash, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setPkBurstActive(false), 700);
  }, []);

  const sendReaction = (emoji: string) => {
    setShowReactions(false);
    const rid = `r_${Date.now()}`;
    const anim = new Animated.Value(0);
    setFloatingReactions(prev => [...prev, { id: rid, emoji, x: 40 + Math.random() * (width - 120), anim }]);
    Animated.timing(anim, { toValue: 1, duration: 2200, useNativeDriver: true }).start(() =>
      setFloatingReactions(prev => prev.filter(r => r.id !== rid))
    );
  };

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    await sendMsg(text, 'text');
  };

  const handleSendGift = async (giftId: string, price: number, giftIcon: string, giftName: string) => {
    if (currentUser.diamonds < price) {
      showAlert('Not Enough Diamonds', 'Recharge to send gifts!', [
        { text: 'Recharge', onPress: () => router.push('/recharge') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    updateDiamonds(-price);
    setShowGiftPanel(false);

    const pts = calcGiftPoints(price);
    if (pts > 0) setGiftPointsTotal(g => g + pts);
    if (price >= 100) sendGiftNotification(currentUser.username, giftName, giftIcon, price).catch(() => {});

    const count = price >= 5000 ? 24 : price >= 1000 ? 16 : price >= 100 ? 12 : 7;
    triggerGiftRain(giftIcon, 'left', Math.ceil(count / 2));
    triggerGiftRain(giftIcon, 'right', Math.floor(count / 2));

    if (room.isPK && price > 0) {
      if (giftTarget === 'host') {
        const newScore = pkHostScore + price;
        setPkHostScore?.(newScore);
        await updatePKScore(roomIdStr, newScore, pkOpponentScore);
      } else {
        const newScore = pkOpponentScore + price;
        setPkOpponentScore?.(newScore);
        await updatePKScore(roomIdStr, pkHostScore, newScore);
      }
    }
    await addDiamondsEarned(roomIdStr, price);
    if (user?.id) await sendRoomGift(user.id, roomIdStr, giftId, giftName, giftIcon, price, giftTarget);
    await sendMsg(`Sent ${giftIcon} ${giftName}!`, 'gift', { id: giftId, icon: giftIcon, name: giftName });
  };

  const pkTotal = pkHostScore + pkOpponentScore;
  const pkPercent = pkTotal > 0 ? pkHostScore / pkTotal : 0.5;
  const pkMins = Math.floor(pkTimeLeft / 60);
  const pkSecs = pkTimeLeft % 60;
  const multiStreamRooms = MOCK_LIVE_ROOMS.slice(0, 4);

  const renderMessage = ({ item }: { item: any }) => {
    const senderName = item.sender?.display_name || item.sender?.username || item.username || 'User';
    const senderAvatar = item.sender?.avatar_url || item.avatar;
    const vipLevel = item.sender?.vip_level || 0;
    const vipColors = ['', '#CD7F32', '#C0C0C0', '#FFCC00', '#00DFFF', '#FF2E8B'];
    if (item.type === 'system' || item.type === 'notification' || item.type === 'join') {
      return <View style={styles.systemMsg}><Text style={styles.systemMsgText}>🔔 {senderName} {item.text}</Text></View>;
    }
    if (item.type === 'gift') {
      return (
        <View style={styles.giftMsg}>
          {senderAvatar ? <Image source={{ uri: senderAvatar }} style={styles.msgAv} contentFit="cover" /> : null}
          <View style={styles.giftMsgBubble}>
            <Text style={[styles.giftMsgUser, vipLevel > 0 ? { color: vipColors[vipLevel] } : null]}>{senderName}</Text>
            <Text style={styles.giftMsgText}> sent </Text>
            <Text style={{ fontSize: 14 }}>{item.gift_icon || item.giftIcon || '🎁'}</Text>
            <Text style={styles.giftMsgName}> {item.gift_name || item.giftName}</Text>
            <View style={styles.giftPriceTag}><Text style={styles.giftPriceTagText}>💎{item.gift_price || item.giftPrice || 0}</Text></View>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.chatMsg}>
        {senderAvatar ? <Image source={{ uri: senderAvatar }} style={styles.msgAv} contentFit="cover" /> : null}
        <View style={styles.chatBubble}>
          {vipLevel > 0 ? (
            <View style={[styles.vipMsgTag, { backgroundColor: vipColors[vipLevel] + '30', borderColor: vipColors[vipLevel] + '60' }]}>
              <Text style={[styles.vipMsgText, { color: vipColors[vipLevel] }]}>VIP{vipLevel}</Text>
            </View>
          ) : null}
          <Text style={[styles.msgUser, vipLevel > 0 ? { color: vipColors[Math.min(vipLevel, 5)] } : null]}>{senderName}: </Text>
          <Text style={styles.msgText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri: room.thumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={200} />
      <View style={[StyleSheet.absoluteFillObject, styles.bgOverlay]} />
      <PKGiftRain particles={rainParticles} />

      {/* Floating Reactions */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {floatingReactions.map(r => (
          <Animated.View key={r.id} style={[styles.floatReaction, {
            left: r.x, bottom: 220,
            opacity: r.anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
            transform: [{ translateY: r.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -280] }) }],
          }]}>
            <Text style={{ fontSize: 30 }}>{r.emoji}</Text>
          </Animated.View>
        ))}
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>

          {/* ── TOP BAR ── */}
          <View style={styles.topBar}>
            <View style={styles.hostInfo}>
              <Pressable onPress={() => router.push(`/user/${room.hostId || 'u001'}`)}>
                <Image source={{ uri: room.hostAvatar }} style={styles.hostAv} contentFit="cover" />
              </Pressable>
              <View style={{ flex: 1 }}>
                <View style={styles.hostNameRow}>
                  <Text style={styles.hostName} numberOfLines={1}>{room.hostName}</Text>
                  <View style={styles.vipBadge}><Text style={styles.vipBadgeText}>👑V5</Text></View>
                  {room.isPK ? <View style={styles.pkTag}><Text style={styles.pkTagText}>⚔️PK</Text></View> : null}
                  {room.isParty ? <View style={[styles.pkTag, { backgroundColor: Colors.secondary }]}><Text style={styles.pkTagText}>🎉 Party</Text></View> : null}
                </View>
                <Text style={styles.roomTitle} numberOfLines={1}>{room.title}</Text>
              </View>
              <Pressable
                style={[styles.followBtn, isFollowing ? styles.followBtnActive : null]}
                onPress={() => { setIsFollowing(!isFollowing); toggleFollow(room.hostId || 'u001'); }}
              >
                <Text style={styles.followBtnText}>{isFollowing ? '✓ Following' : '+ Follow'}</Text>
              </Pressable>
            </View>
            <View style={styles.topRight}>
              <View style={styles.viewerBadge}>
                <View style={styles.viewerDot} />
                <Text style={styles.viewerText}>{Math.max(0, viewers).toLocaleString()}</Text>
              </View>
              <View style={styles.timerBadge}><Text style={styles.timerText}>{duration}</Text></View>
              <Pressable style={styles.iconBtn} onPress={() => setShowMultiStream(true)}>
                <MaterialIcons name="grid-view" size={16} color="#FFF" />
              </Pressable>
              <Pressable style={styles.iconBtn} onPress={() => showAlert('Share', 'Share link copied!')}>
                <MaterialIcons name="share" size={16} color="#FFF" />
              </Pressable>
              <Pressable style={styles.iconBtn} onPress={() => router.back()}>
                <MaterialIcons name="close" size={16} color="#FFF" />
              </Pressable>
            </View>
          </View>

          {/* ── Mini Earnings Bar ── */}
          {currentUser.isHost && sessionPoints > 0 ? (
            <Pressable style={styles.earningsBar} onPress={() => setShowEarningsOverlay(true)}>
              <Text style={styles.earningBarIcon}>💰</Text>
              <View style={styles.earningBarTrack}>
                <Animated.View style={[styles.earningBarFill, {
                  width: earningBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                }]} />
              </View>
              <Text style={styles.earningBarText}>+{sessionPoints.toLocaleString()}pts</Text>
            </Pressable>
          ) : null}

          {/* Announcement */}
          {showAnnouncement ? (
            <Animated.View style={[styles.announcement, { opacity: announcementAnim }]}>
              <MaterialIcons name="campaign" size={13} color={Colors.gold} />
              <Text style={styles.announcementText} numberOfLines={1}>
                {'🎉 Welcome! Send gifts to support '}{room.hostName}{' — PK battle is LIVE!'}
              </Text>
              <Pressable onPress={() => setShowAnnouncement(false)}>
                <MaterialIcons name="close" size={13} color={Colors.gold} />
              </Pressable>
            </Animated.View>
          ) : null}

          {/* ── ENHANCED PK BAR ── */}
          {room.isPK ? (
            <Animated.View style={[styles.pkBar,
              pkBurstActive ? { borderColor: Colors.live + '80', shadowOpacity: 0.9, shadowRadius: 20 } : null,
            ]}>
              <View style={styles.pkSide}>
                <Animated.View style={{ transform: [{ scale: pkBurstActive ? pkPulseAnim : new Animated.Value(1) }] }}>
                  <Image source={{ uri: room.hostAvatar }} style={[styles.pkAv, { borderColor: Colors.primary }]} contentFit="cover" />
                  {pkPercent >= 0.5 ? <View style={styles.pkLeadBadge}><Text style={styles.pkLeadText}>👑</Text></View> : null}
                </Animated.View>
                <Text style={styles.pkName} numberOfLines={1}>{room.hostName.split(' ')[0]}</Text>
                <Animated.Text style={[styles.pkScore, {
                  opacity: pkLeaderFlash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] }),
                }]}>{pkHostScore.toLocaleString()}</Animated.Text>
              </View>
              <View style={styles.pkCenter}>
                <View style={styles.pkTimerRow}>
                  <View style={styles.pkLiveDot} />
                  <Text style={[styles.pkTimerText, pkTimeLeft <= 60 ? { color: Colors.live } : null]}>
                    {pkMins}:{pkSecs.toString().padStart(2, '0')}
                  </Text>
                  {pkBurstActive ? <Text style={styles.pkFireText}>🔥</Text> : null}
                </View>
                <View style={styles.pkBarOuter}>
                  <Animated.View style={[styles.pkBarFillLeft, { flex: pkBarAnim }]} />
                  <View style={styles.pkVsCircle}><Text style={styles.pkVsText}>VS</Text></View>
                  <Animated.View style={[styles.pkBarFillRight, {
                    flex: pkBarAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                  }]} />
                </View>
                {pkBurstActive ? <View style={styles.pkRainLabel}><Text style={styles.pkRainLabelText}>🌧 GIFT RAIN!</Text></View> : null}
                <Text style={styles.pkStatusText}>
                  {pkPercent > 0.6 ? '🏆 Dominating!' : pkPercent > 0.5 ? '📈 Leading' : pkPercent < 0.4 ? '📉 Behind' : '⚖️ Tied'}
                </Text>
              </View>
              <View style={[styles.pkSide, { alignItems: 'flex-end' }]}>
                <Animated.View style={{ transform: [{ scale: pkBurstActive ? pkPulseAnim : new Animated.Value(1) }] }}>
                  <Image source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop' }} style={[styles.pkAv, { borderColor: Colors.secondary }]} contentFit="cover" />
                  {pkPercent < 0.5 ? <View style={[styles.pkLeadBadge, { right: 0, left: undefined }]}><Text style={styles.pkLeadText}>👑</Text></View> : null}
                </Animated.View>
                <Text style={styles.pkName} numberOfLines={1}>{room.pkOpponent?.split(' ')[0] || 'Opponent'}</Text>
                <Text style={[styles.pkScore, { color: Colors.secondary }]}>{pkOpponentScore.toLocaleString()}</Text>
              </View>
            </Animated.View>
          ) : null}

          {/* ── PARTY SEATS ── */}
          {room.isParty ? (
            <View style={styles.seatsRow}>
              {PARTY_SEATS.map((seat: any) => (
                <Pressable key={seat.id} style={styles.seat}
                  onPress={() => showAlert(
                    seat.user || 'Empty Seat',
                    seat.user ? `${seat.role || ''} ${seat.isMuted ? '🔇 Muted' : '🎤 Active'}` : 'Request this mic seat?',
                    seat.user
                      ? [{ text: '🎁 Gift', onPress: () => setShowGiftPanel(true) }, { text: 'View', onPress: () => router.push(`/user/${seat.id}`) }, { text: 'Close', style: 'cancel' }]
                      : [{ text: 'Request Seat', onPress: () => showAlert('Requested!', 'Seat request sent.') }, { text: 'Cancel', style: 'cancel' }]
                  )}
                >
                  {seat.filled && seat.avatar ? (
                    <View style={styles.seatFilled}>
                      <Animated.View style={[styles.seatRing, seat.isSpeaking ? { transform: [{ scale: speakingAnim }], borderColor: Colors.success } : null]}>
                        <Image source={{ uri: seat.avatar }} style={styles.seatAv} contentFit="cover" />
                      </Animated.View>
                      {seat.role === 'CO-HOST' ? <View style={styles.coHostBadge}><Text style={styles.coHostText}>CO</Text></View> : null}
                      <View style={[styles.micBadge, seat.isMuted ? styles.micMuted : styles.micOn]}>
                        <MaterialIcons name={seat.isMuted ? 'mic-off' : 'graphic-eq'} size={8} color="#FFF" />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.emptySeat}>
                      <MaterialIcons name="add" size={18} color={Colors.textMuted} />
                      <Text style={styles.emptyText}>{seat.id}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* ── BOTTOM AREA ── */}
          <View style={styles.bottomArea}>
            <View style={styles.tabRow}>
              {(['chat', 'gifts', 'rank'] as const).map(tab => (
                <Pressable key={tab} style={[styles.tabBtn, activeTab === tab ? styles.tabBtnActive : null]} onPress={() => setActiveTab(tab)}>
                  <Text style={[styles.tabText, activeTab === tab ? styles.tabTextActive : null]}>
                    {tab === 'chat' ? '💬 Chat' : tab === 'gifts' ? '🎁 Gifts' : '🏆 Rank'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {activeTab === 'chat' ? (
              <FlatList
                ref={flatListRef}
                data={allMessages.slice(-25)}
                keyExtractor={(item, i) => item.id || String(i)}
                style={styles.chatList}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                renderItem={renderMessage}
                ListEmptyComponent={
                  chatLoading ? (
                    <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 20 }} />
                  ) : (
                    <Text style={styles.noMsgsText}>Be the first to say hello! 👋</Text>
                  )
                }
              />
            ) : null}

            {activeTab === 'gifts' ? (
              <View style={styles.giftsTabWrap}>
                {room.isPK ? (
                  <View style={styles.giftTargetRow}>
                    <Text style={styles.giftTargetLabel}>Gift target:</Text>
                    {(['host', 'opponent'] as const).map(t => (
                      <Pressable key={t} style={[styles.giftTargetBtn, giftTarget === t ? styles.giftTargetBtnActive : null]} onPress={() => setGiftTarget(t)}>
                        <Text style={[styles.giftTargetText, giftTarget === t ? styles.giftTargetTextActive : null]}>
                          {t === 'host' ? `🔴 ${room.hostName.split(' ')[0]}` : `🔵 ${room.pkOpponent?.split(' ')[0] || 'Opp'}`}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <View style={styles.giftGrid}>
                  {GIFTS.map(gift => (
                    <Pressable key={gift.id}
                      style={({ pressed }) => [styles.giftCell, pressed ? { opacity: 0.75, transform: [{ scale: 0.92 }] } : null, currentUser.diamonds < gift.price ? { opacity: 0.5 } : null]}
                      onPress={() => handleSendGift(gift.id, gift.price, gift.icon, gift.name)}
                    >
                      <Text style={styles.giftCellIcon}>{gift.icon}</Text>
                      <Text style={styles.giftCellName}>{gift.name}</Text>
                      <View style={styles.giftCellPrice}><Text style={styles.giftCellPriceText}>💎{gift.price}</Text></View>
                    </Pressable>
                  ))}
                </View>
                {room.isPK ? (
                  <Pressable style={styles.rainDemoBtn} onPress={() => { triggerGiftRain('🌌', 'left', 14); triggerGiftRain('🔥', 'right', 14); }}>
                    <Text style={styles.rainDemoBtnText}>🌧 Trigger Gift Rain Demo</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {activeTab === 'rank' ? (
              <ScrollView style={styles.rankList} showsVerticalScrollIndicator={false}>
                {(giftLeaderboard.length > 0 ? giftLeaderboard : [
                  { username: 'CosmicFan', avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80', total: 5000 },
                  { username: 'StarGifter', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80', total: 2000 },
                  { username: 'NightFan', avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80', total: 1500 },
                ]).map((r: any, i: number) => (
                  <View key={i} style={styles.rankItem}>
                    <Text style={styles.rankPos}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</Text>
                    <Image source={{ uri: r.avatar_url }} style={styles.rankAv} contentFit="cover" />
                    <Text style={styles.rankName}>{r.username}</Text>
                    <Text style={styles.rankDiamonds}>💎 {(r.total || 0).toLocaleString()}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {showReactions ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stickerStrip} contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.xs }}>
                {REACTIONS.map(e => (
                  <Pressable key={e} style={styles.stickerBtn} onPress={() => sendReaction(e)}>
                    <Text style={{ fontSize: 24 }}>{e}</Text>
                  </Pressable>
                ))}
                {STICKER_ROW.map(e => (
                  <Pressable key={`s_${e}`} style={styles.stickerBtn} onPress={() => { sendMsg(e); setShowReactions(false); }}>
                    <Text style={{ fontSize: 24 }}>{e}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            <View style={styles.inputRow}>
              <Pressable style={styles.inputBtn} onPress={() => setShowReactions(!showReactions)}>
                <Text style={{ fontSize: 22 }}>😊</Text>
              </Pressable>
              <TextInput
                style={styles.chatInput}
                placeholder="Say something..."
                placeholderTextColor="rgba(255,255,255,0.38)"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSendMessage}
                returnKeyType="send"
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
              />
              <Pressable style={styles.inputBtn} onPress={() => setActiveGame('guess')}>
                <Text style={{ fontSize: 22 }}>🎮</Text>
              </Pressable>
              <Pressable style={styles.inputBtn} onPress={() => { setActiveTab('gifts'); setShowGiftPanel(!showGiftPanel); }}>
                <Text style={{ fontSize: 22 }}>🎁</Text>
              </Pressable>
              <Pressable
                style={[styles.sendBtn, (!inputText.trim() || sending) ? styles.sendBtnOff : null]}
                onPress={handleSendMessage}
                disabled={!inputText.trim() || sending}
              >
                <MaterialIcons name="send" size={16} color="#FFF" />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ── TREASURE BOX ── */}
      {treasureVisible && !showTreasureAnim ? (
        <Animated.View style={[styles.treasureWrap, { transform: [{ scale: treasurePulse }] }]}>
          <Pressable style={styles.treasureBtn} onPress={handleClaimTreasure}>
            <Text style={{ fontSize: 32 }}>📦</Text>
            <View style={styles.treasureBadge}><Text style={styles.treasureBadgeText}>FREE</Text></View>
          </Pressable>
          <Text style={styles.treasureLabel}>{EARNING_RATES.treasure_box_max_daily - treasureDailyCount} left</Text>
        </Animated.View>
      ) : null}

      {/* ── TREASURE CLAIM ANIMATION ── */}
      {showTreasureAnim ? (
        <View style={styles.treasureAnimOverlay} pointerEvents="none">
          <Animated.View style={[styles.treasureAnimBox, { transform: [{ scale: treasureChestOpen }] }]}>
            <Text style={{ fontSize: 64 }}>📦</Text>
          </Animated.View>
          <Animated.View style={[styles.treasureCoinsWrap, {
            opacity: treasureCoinsAnim,
            transform: [{ translateY: treasureCoinsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, -60] }) }],
          }]}>
            <Text style={styles.treasureCoinsBig}>+{EARNING_RATES.treasure_box_coins}🪙</Text>
            <Text style={styles.treasureCoinsLabel}>S-Coins Earned!</Text>
          </Animated.View>
        </View>
      ) : null}

      {/* ── EARNINGS OVERLAY ── */}
      {showEarningsOverlay ? (
        <View style={styles.earningsOverlay}>
          <View style={styles.earningsCard}>
            <View style={styles.earningsCardHeader}>
              <Text style={styles.earningsCardTitle}>💰 Session Earnings</Text>
              <Pressable onPress={() => setShowEarningsOverlay(false)} style={styles.earningsClose}>
                <MaterialIcons name="close" size={20} color={Colors.textPrimary} />
              </Pressable>
            </View>
            {[
              { icon: '⏱', label: 'Stream Duration', val: `${sessionDurationMin} minutes`, color: Colors.textPrimary },
              { icon: '🎤', label: 'Stream Points', val: `+${sessionPoints.toLocaleString()} pts`, color: Colors.gold },
              { icon: '🎁', label: 'Gift Points (70%)', val: `+${giftPointsTotal.toLocaleString()} pts`, color: Colors.primary },
              { icon: '📦', label: 'Treasure Coins', val: `+${treasureClaimed} 🪙`, color: Colors.success },
            ].map(row => (
              <View key={row.label} style={styles.earningsRow}>
                <Text style={{ fontSize: 28 }}>{row.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.earningsRowLabel}>{row.label}</Text>
                  <Text style={[styles.earningsRowVal, { color: row.color }]}>{row.val}</Text>
                </View>
              </View>
            ))}
            <View style={styles.earningsDivider} />
            <View style={styles.earningsTotalRow}>
              <Text style={styles.earningsTotalLabel}>Total This Session</Text>
              <Text style={styles.earningsTotalVal}>{(sessionPoints + giftPointsTotal).toLocaleString()} pts</Text>
            </View>
            <Text style={styles.earningsConvRate}>10,000 pts = $1 USD</Text>
            <View style={styles.earningsCardBtns}>
              <Pressable style={styles.earningsClaimBtn} onPress={() => {
                setShowEarningsOverlay(false);
                showAlert('🎉 Rewards Saved!', `+${(sessionPoints + giftPointsTotal).toLocaleString()} pts added to your account.`);
              }}>
                <Text style={styles.earningsClaimBtnText}>✅ Claim Rewards</Text>
              </Pressable>
              <Pressable style={styles.earningsViewBtn} onPress={() => { setShowEarningsOverlay(false); router.push('/daily-tasks'); }}>
                <Text style={styles.earningsViewBtnText}>📊 View Tasks</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {/* ── GAME MODAL ── */}
      <Modal visible={activeGame !== null} transparent animationType="slide">
        <Pressable style={styles.modalBg} onPress={() => setActiveGame(null)}>
          <View style={styles.gameCard}>
            <View style={styles.gameTabs}>
              {([{ key: 'guess', label: '🔢 Number' }, { key: 'poll', label: '📊 Poll' }, { key: 'trivia', label: '🧠 Trivia' }] as const).map(g => (
                <Pressable key={g.key} style={[styles.gameTab, activeGame === g.key ? styles.gameTabActive : null]} onPress={() => setActiveGame(g.key)}>
                  <Text style={[styles.gameTabText, activeGame === g.key ? styles.gameTabTextActive : null]}>{g.label}</Text>
                </Pressable>
              ))}
            </View>
            {activeGame === 'guess' ? <NumberGuessGame onWin={(a) => { updateDiamonds(a); }} onClose={() => setActiveGame(null)} /> : null}
            {activeGame === 'poll' ? <PollGame onClose={() => setActiveGame(null)} /> : null}
            {activeGame === 'trivia' ? <TriviaGame onWin={(a) => { updateDiamonds(a); }} onClose={() => setActiveGame(null)} /> : null}
          </View>
        </Pressable>
      </Modal>

      {/* ── MULTI-STREAM MODAL ── */}
      <Modal visible={showMultiStream} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.multiCard}>
            <View style={styles.multiHeader}>
              <Text style={styles.multiTitle}>📺 Multi-Stream View</Text>
              <Pressable onPress={() => setShowMultiStream(false)}>
                <MaterialIcons name="close" size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <View style={styles.multiGrid}>
              {multiStreamRooms.map(r => (
                <Pressable key={r.id} style={styles.multiCell} onPress={() => { setShowMultiStream(false); router.push(`/live/${r.id}`); }}>
                  <Image source={{ uri: r.thumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                  <View style={styles.multiOverlay}>
                    <View style={styles.multiLiveDot}><Text style={styles.multiLiveText}>LIVE</Text></View>
                    <Text style={styles.multiHost} numberOfLines={1}>{r.hostName}</Text>
                    <Text style={styles.multiViewers}>👁 {(r.viewers / 1000).toFixed(1)}K</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const gS = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  close: { position: 'absolute', top: -4, right: -4, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold, textAlign: 'center' },
  hint: { color: Colors.gold, fontSize: FontSize.md, textAlign: 'center', fontWeight: FontWeight.semibold },
  attRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  att: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.success },
  attUsed: { backgroundColor: Colors.error },
  numGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' },
  numBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.cardBorder },
  numBtnSel: { backgroundColor: Colors.primary + '30', borderColor: Colors.primary },
  numBtnWin: { backgroundColor: Colors.success, borderColor: Colors.success },
  numText: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  pollOpt: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.sm, gap: Spacing.sm, overflow: 'hidden', position: 'relative', borderWidth: 1.5, borderColor: Colors.cardBorder },
  pollFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: BorderRadius.md },
  pollLabel: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  pollPct: { fontWeight: FontWeight.black, fontSize: FontSize.sm },
  pollTotal: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },
  actionBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, padding: Spacing.sm, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  bgOverlay: { backgroundColor: 'rgba(0,0,0,0.42)' },
  rainParticle: { position: 'absolute', zIndex: 200 },
  rainIcon: { fontSize: 26, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  floatReaction: { position: 'absolute', zIndex: 999 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.sm, gap: Spacing.xs },
  hostInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flex: 1 },
  hostAv: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: Colors.primary },
  hostNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hostName: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold, maxWidth: 80 },
  vipBadge: { backgroundColor: Colors.gold + '30', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  vipBadgeText: { color: Colors.gold, fontSize: 8, fontWeight: FontWeight.black },
  pkTag: { backgroundColor: Colors.live, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  pkTagText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.black },
  roomTitle: { color: 'rgba(255,255,255,0.65)', fontSize: 9 },
  followBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.pill },
  followBtnActive: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  followBtnText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.bold },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewerBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: BorderRadius.pill },
  viewerDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.live },
  viewerText: { color: '#FFF', fontSize: 10 },
  timerBadge: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: BorderRadius.pill },
  timerText: { color: Colors.gold, fontSize: 10, fontWeight: FontWeight.bold },
  iconBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  earningsBar: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 4, marginHorizontal: Spacing.md, marginBottom: 4, borderWidth: 1, borderColor: Colors.gold + '40' },
  earningBarIcon: { fontSize: 12 },
  earningBarTrack: { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  earningBarFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 3 },
  earningBarText: { color: Colors.gold, fontSize: 10, fontWeight: FontWeight.bold },
  announcement: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,215,0,0.12)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.28)', marginHorizontal: Spacing.md, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4, marginBottom: 4 },
  announcementText: { flex: 1, color: Colors.gold, fontSize: 10 },
  pkBar: { flexDirection: 'row', marginHorizontal: Spacing.sm, borderRadius: BorderRadius.lg, padding: Spacing.sm, backgroundColor: 'rgba(0,0,0,0.7)', marginBottom: Spacing.xs, borderWidth: 1, borderColor: 'rgba(233,30,140,0.35)', shadowColor: Colors.live, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  pkSide: { width: 80, alignItems: 'flex-start', gap: 2, position: 'relative' },
  pkAv: { width: 36, height: 36, borderRadius: 18, borderWidth: 2 },
  pkLeadBadge: { position: 'absolute', top: -6, left: -4, backgroundColor: Colors.gold + '30', borderRadius: 8, paddingHorizontal: 3, paddingVertical: 1 },
  pkLeadText: { fontSize: 9 },
  pkName: { color: 'rgba(255,255,255,0.85)', fontSize: 9, fontWeight: FontWeight.semibold },
  pkScore: { color: Colors.gold, fontSize: FontSize.sm, fontWeight: FontWeight.black },
  pkCenter: { flex: 1, alignItems: 'center', gap: 3 },
  pkTimerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pkLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.live },
  pkTimerText: { color: Colors.live, fontSize: FontSize.sm, fontWeight: FontWeight.black },
  pkFireText: { fontSize: 14 },
  pkBarOuter: { width: '100%', height: 16, flexDirection: 'row', borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.35)' },
  pkBarFillLeft: { height: '100%', backgroundColor: Colors.primary, shadowColor: Colors.primary, elevation: 3 },
  pkBarFillRight: { height: '100%', backgroundColor: Colors.secondary, shadowColor: Colors.secondary, elevation: 3 },
  pkVsCircle: { position: 'absolute', alignSelf: 'center', left: '50%', transform: [{ translateX: -11 }], backgroundColor: '#000', borderRadius: 11, width: 22, height: 22, alignItems: 'center', justifyContent: 'center', zIndex: 10, borderWidth: 1.5, borderColor: Colors.live },
  pkVsText: { color: Colors.live, fontSize: 7, fontWeight: FontWeight.black },
  pkRainLabel: { backgroundColor: Colors.live + '25', borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  pkRainLabelText: { color: Colors.live, fontSize: 9, fontWeight: FontWeight.black, letterSpacing: 1 },
  pkStatusText: { color: 'rgba(255,255,255,0.6)', fontSize: 8 },
  seatsRow: { flexDirection: 'row', paddingHorizontal: Spacing.sm, gap: 6, marginBottom: 6 },
  seat: { alignItems: 'center' },
  seatFilled: { position: 'relative' },
  seatRing: { borderWidth: 2, borderColor: Colors.primary, borderRadius: 24, padding: 1 },
  seatAv: { width: 42, height: 42, borderRadius: 21 },
  coHostBadge: { position: 'absolute', top: -6, left: '50%', transform: [{ translateX: -10 }], backgroundColor: Colors.gold, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  coHostText: { color: '#000', fontSize: 7, fontWeight: FontWeight.black },
  micBadge: { position: 'absolute', bottom: 0, right: 0, width: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.5)' },
  micOn: { backgroundColor: Colors.success },
  micMuted: { backgroundColor: Colors.error },
  emptySeat: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: Colors.cardBorder, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', gap: 0 },
  emptyText: { color: Colors.textMuted, fontSize: 8 },
  bottomArea: { flex: 1, justifyContent: 'flex-end' },
  tabRow: { flexDirection: 'row', paddingHorizontal: Spacing.sm, gap: 5, marginBottom: 5 },
  tabBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.pill, backgroundColor: 'rgba(0,0,0,0.45)' },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabText: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: FontWeight.medium },
  tabTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  chatList: { maxHeight: 185, paddingHorizontal: Spacing.sm },
  noMsgsText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', paddingVertical: 20 },
  systemMsg: { marginBottom: 4 },
  systemMsgText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  giftMsg: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 5 },
  msgAv: { width: 20, height: 20, borderRadius: 10 },
  giftMsgBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(233,30,140,0.18)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, gap: 2 },
  giftMsgUser: { color: Colors.primary, fontSize: 11, fontWeight: FontWeight.bold },
  giftMsgText: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  giftMsgName: { color: Colors.gold, fontSize: 11, fontWeight: FontWeight.semibold },
  giftPriceTag: { backgroundColor: 'rgba(0,212,255,0.2)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  giftPriceTagText: { color: Colors.diamond, fontSize: 9, fontWeight: FontWeight.bold },
  chatMsg: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4, gap: 5 },
  chatBubble: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.38)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, gap: 2, flex: 1 },
  vipMsgTag: { borderRadius: 3, paddingHorizontal: 3, paddingVertical: 0, borderWidth: 0.5 },
  vipMsgText: { fontSize: 8, fontWeight: FontWeight.black },
  msgUser: { color: Colors.primary, fontSize: 11, fontWeight: FontWeight.bold },
  msgText: { color: 'rgba(255,255,255,0.88)', fontSize: 11 },
  giftsTabWrap: { paddingHorizontal: Spacing.sm, maxHeight: 230 },
  giftTargetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  giftTargetLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  giftTargetBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.pill, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  giftTargetBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  giftTargetText: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  giftTargetTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  giftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  giftCell: { width: (width - Spacing.sm * 2 - 6 * 4) / 5, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: BorderRadius.sm, padding: 6, gap: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  giftCellIcon: { fontSize: 24 },
  giftCellName: { color: 'rgba(255,255,255,0.7)', fontSize: 8, textAlign: 'center' },
  giftCellPrice: { backgroundColor: 'rgba(0,212,255,0.2)', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  giftCellPriceText: { color: Colors.diamond, fontSize: 8, fontWeight: FontWeight.bold },
  rainDemoBtn: { marginTop: Spacing.xs, alignItems: 'center', paddingVertical: 6, backgroundColor: Colors.live + '20', borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.live + '50' },
  rainDemoBtnText: { color: Colors.live, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  rankList: { maxHeight: 185, paddingHorizontal: Spacing.sm },
  rankItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)', gap: 8 },
  rankPos: { width: 26, fontSize: 14, textAlign: 'center' },
  rankAv: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primary },
  rankName: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: FontWeight.semibold },
  rankDiamonds: { color: Colors.diamond, fontSize: 11, fontWeight: FontWeight.bold },
  stickerStrip: { maxHeight: 52, backgroundColor: 'rgba(0,0,0,0.55)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  stickerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingBottom: Spacing.md, paddingTop: 6, gap: 6 },
  inputBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  chatInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: 8, color: '#FFF', fontSize: FontSize.sm },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: 'rgba(255,255,255,0.15)' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  gameCard: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, gap: Spacing.md, minHeight: 340, borderTopWidth: 1, borderColor: Colors.primary + '40' },
  gameTabs: { flexDirection: 'row', gap: Spacing.xs },
  gameTab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.cardBorder },
  gameTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  gameTabText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  gameTabTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  multiCard: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg },
  multiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  multiTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  multiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  multiCell: { width: (width - Spacing.lg * 2 - Spacing.sm) / 2, height: 130, borderRadius: BorderRadius.md, overflow: 'hidden', position: 'relative', backgroundColor: Colors.surface },
  multiOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.42)', padding: Spacing.sm, justifyContent: 'space-between' },
  multiLiveDot: { backgroundColor: Colors.live, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1, alignSelf: 'flex-start' },
  multiLiveText: { color: '#FFF', fontSize: 8, fontWeight: FontWeight.black },
  multiHost: { color: '#FFF', fontSize: 11, fontWeight: FontWeight.bold },
  multiViewers: { color: 'rgba(255,255,255,0.75)', fontSize: 9 },
  // Treasure box
  treasureWrap: { position: 'absolute', right: 12, top: height * 0.28, alignItems: 'center', zIndex: 500 },
  treasureBtn: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.gold, shadowColor: Colors.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 12, elevation: 10, position: 'relative' },
  treasureBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: Colors.success, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  treasureBadgeText: { color: '#FFF', fontSize: 7, fontWeight: FontWeight.black },
  treasureLabel: { color: Colors.gold, fontSize: 9, fontWeight: FontWeight.bold, marginTop: 3 },
  treasureAnimOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 600, backgroundColor: 'rgba(0,0,0,0.5)' },
  treasureAnimBox: { alignItems: 'center', justifyContent: 'center' },
  treasureCoinsWrap: { alignItems: 'center', gap: 6, marginTop: 16 },
  treasureCoinsBig: { fontSize: 32, fontWeight: FontWeight.black, color: Colors.gold },
  treasureCoinsLabel: { color: Colors.gold, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  // Earnings overlay
  earningsOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.78)', zIndex: 800, alignItems: 'center', justifyContent: 'center', padding: Spacing.md },
  earningsCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, width: '100%', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.gold + '40' },
  earningsCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  earningsCardTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  earningsClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bgSecondary, alignItems: 'center', justifyContent: 'center' },
  earningsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bgSecondary, borderRadius: BorderRadius.md, padding: Spacing.sm },
  earningsRowLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  earningsRowVal: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  earningsDivider: { height: 1, backgroundColor: Colors.cardBorder },
  earningsTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earningsTotalLabel: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  earningsTotalVal: { color: Colors.gold, fontSize: FontSize.xxl, fontWeight: FontWeight.black },
  earningsConvRate: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },
  earningsCardBtns: { flexDirection: 'row', gap: Spacing.sm },
  earningsClaimBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, alignItems: 'center' },
  earningsClaimBtnText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  earningsViewBtn: { flex: 1, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md, alignItems: 'center' },
  earningsViewBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
