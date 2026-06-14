// SashLive — Go Live (PoppoLive-style: Live/Party tabs, thumbnail, category pills, camera guide)
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ScrollView, Animated, Dimensions, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/template';
import { useAlert } from '@/template';
import { createLiveRoom, endLiveRoom } from '@/services/liveRoomService';
import { sendLiveNotification } from '@/hooks/usePushNotifications';
import { earnPointsFromStream as earnStream, EARNING_RATES } from '@/services/earningService';
import { getSupabaseClient } from '@/template';

const { width, height } = Dimensions.get('window');

type GoLiveMode = 'live' | 'party';
type PartyMediaType = 'video' | 'voice';
type StreamCategory = 'Chatting' | 'Singing' | 'Dancing' | 'Make Friends' | 'Esports' | 'Talent' | 'Q&A' | 'Cooking';

const CATEGORIES: StreamCategory[] = ['Chatting', 'Singing', 'Dancing', 'Make Friends', 'Esports', 'Talent', 'Q&A', 'Cooking'];

// Party layout options (grid slot configurations)
const PARTY_LAYOUTS = [
  { id: '2x2', slots: 4,  icon: [[1,1],[1,1]] },
  { id: '3x2', slots: 6,  icon: [[1,1,1],[1,1,1]] },
  { id: '1+3', slots: 4,  icon: [[0,1],[1,1],[0,1]] },
  { id: '3x3', slots: 9,  icon: [[1,1,1],[1,1,1],[1,1,1]] },
  { id: '1+5', slots: 6,  icon: [[0,1,1],[1,1,1]] },
];

const COVER_IMAGES = [
  'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=300&h=300&fit=crop',
];

// ─── Party Layout Grid Icon ──────────────────────────────────────────────
function LayoutIcon({ icon, active }: { icon: number[][]; active: boolean }) {
  const size = 10;
  const gap = 2;
  return (
    <View style={{ gap: gap }}>
      {icon.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: gap }}>
          {row.map((cell, ci) => (
            <View key={ci} style={{
              width: size, height: size, borderRadius: 2,
              backgroundColor: cell === 1 ? (active ? '#FFF' : 'rgba(255,255,255,0.5)') : 'transparent',
            }} />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function GoLiveScreen() {
  const router = useRouter();
  const { currentUser, updatePoints } = useApp();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  // Setup state
  const [mode, setMode] = useState<GoLiveMode>('live');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<StreamCategory>('Chatting');
  const [coverImg, setCoverImg] = useState(COVER_IMAGES[0]);
  const [partyMedia, setPartyMedia] = useState<PartyMediaType>('video');
  const [partyLayout, setPartyLayout] = useState('2x2');
  const [goingLive, setGoingLive] = useState(false);

  // Live state
  const [isLive, setIsLive] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [viewers, setViewers] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [liveMessages, setLiveMessages] = useState([
    '🔔 Your stream is now live!',
    '👥 Viewers are joining...',
  ]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const viewerPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const diaTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.timing(rippleAnim, { toValue: 1, duration: 1800, useNativeDriver: true })).start();
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      if (viewerPollRef.current) clearInterval(viewerPollRef.current);
      if (diaTimerRef.current) clearInterval(diaTimerRef.current);
      if (msgTimerRef.current) clearInterval(msgTimerRef.current);
    };
  }, []);

  const startLiveTimers = useCallback((roomId: string) => {
    sessionTimerRef.current = setInterval(() => {
      setLiveSeconds(s => {
        const next = s + 1;
        if (next % 60 === 0) {
          const ptsPerMin = Math.floor(EARNING_RATES.stream_per_hour / 60);
          setSessionPoints(p => p + ptsPerMin);
          updatePoints(ptsPerMin);
        }
        return next;
      });
    }, 1000);

    viewerPollRef.current = setInterval(async () => {
      const delta = Math.floor(Math.random() * 20 - 4);
      setViewers(v => {
        const next = Math.max(1, v + delta);
        if (roomId) {
          const supabase = getSupabaseClient();
          supabase.from('live_rooms').update({ viewers: next }).eq('id', roomId).catch(() => {});
        }
        return next;
      });
    }, 10000);

    diaTimerRef.current = setInterval(() => {
      setDiamonds(d => d + Math.floor(Math.random() * 30));
    }, 8000);

    const MSGS = ['🔥 Amazing!', '💗 Love your energy!', '👑 King/Queen!', '💎 Sending diamonds', '🎁 Gifting now', '🚀 Let\'s go!', '❤️ Following now', '🌹 So beautiful'];
    msgTimerRef.current = setInterval(() => {
      setLiveMessages(prev => [...prev.slice(-4), MSGS[Math.floor(Math.random() * MSGS.length)]]);
    }, 3500);
  }, [updatePoints]);

  const handleGoLive = async () => {
    if (!title.trim()) {
      showAlert('Title Required', 'Please enter a stream title.');
      return;
    }
    setGoingLive(true);
    let roomId: string | null = null;
    if (user?.id) {
      const { data, error } = await createLiveRoom(user.id, title.trim(), mode === 'party' ? 'audio' : 'video', coverImg);
      if (error) {
        showAlert('Could Not Start Stream', error);
        setGoingLive(false);
        return;
      }
      if (data) {
        roomId = data.id;
        setCurrentRoomId(data.id);
      }
      sendLiveNotification(currentUser.displayName, user.id).catch(() => {});
    }
    setTimeout(() => {
      setGoingLive(false);
      setIsLive(true);
      setViewers(1);
      startLiveTimers(roomId ?? 'local');
    }, 1600);
  };

  const handleEndLive = async () => {
    showAlert('End Stream?', `Duration: ${formatDuration(liveSeconds)}\nPoints earned: ${sessionPoints.toLocaleString()}pts`, [
      {
        text: 'End Stream', style: 'destructive', onPress: async () => {
          if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
          if (viewerPollRef.current) clearInterval(viewerPollRef.current);
          if (diaTimerRef.current) clearInterval(diaTimerRef.current);
          if (msgTimerRef.current) clearInterval(msgTimerRef.current);
          if (currentRoomId) await endLiveRoom(currentRoomId);
          const durationMins = Math.floor(liveSeconds / 60);
          if (durationMins > 0 && user?.id) await earnStream(user.id, durationMins);
          setIsLive(false);
          router.back();
        },
      },
      { text: 'Continue', style: 'cancel' },
    ]);
  };

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const rippleScale = rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
  const rippleOpacity = rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  // ── LIVE VIEW ──────────────────────────────────────────────────────────
  if (isLive) {
    return (
      <View style={lives.container}>
        <Image source={{ uri: coverImg }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        <View style={lives.overlay} />
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Top bar */}
          <View style={lives.topBar}>
            <View style={{ position: 'relative' }}>
              <Animated.View style={[lives.ripple, { transform: [{ scale: rippleScale }], opacity: rippleOpacity }]} />
              <View style={lives.liveBadge}>
                <View style={lives.liveDot} />
                <Text style={lives.liveBadgeText}>LIVE</Text>
              </View>
            </View>
            <Text style={lives.timer}>{formatDuration(liveSeconds)}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {currentRoomId ? (
                <Pressable style={lives.viewRoomBtn} onPress={() => router.push(`/live/${currentRoomId}` as any)}>
                  <MaterialIcons name="open-in-new" size={12} color="#FFF" />
                  <Text style={lives.viewRoomText}>View Room</Text>
                </Pressable>
              ) : null}
              <Pressable style={lives.endBtn} onPress={handleEndLive}>
                <Text style={lives.endBtnText}>End</Text>
              </Pressable>
            </View>
          </View>

          {/* Stats */}
          <View style={lives.stats}>
            {[
              { icon: '👥', val: viewers.toLocaleString() },
              { icon: '💎', val: diamonds.toLocaleString() },
              { icon: '💰', val: `+${sessionPoints.toLocaleString()}pts` },
            ].map((s, i) => (
              <View key={i} style={lives.statPill}>
                <Text style={{ fontSize: 11 }}>{s.icon}</Text>
                <Text style={lives.statText}>{s.val}</Text>
              </View>
            ))}
          </View>

          {/* Bottom controls */}
          <View style={lives.bottom}>
            <View style={lives.chatArea}>
              {liveMessages.slice(-3).map((msg, i) => (
                <Text key={i} style={lives.chatMsg}>{msg}</Text>
              ))}
            </View>
            <View style={lives.controlRow}>
              {[
                { icon: micMuted ? 'mic-off' : 'mic',        active: micMuted,   onPress: () => setMicMuted(v => !v) },
                { icon: cameraOff ? 'videocam-off' : 'videocam', active: cameraOff, onPress: () => setCameraOff(v => !v) },
                { icon: 'flip-camera-ios',                   active: false,      onPress: () => showAlert('Flip Camera', 'Camera flipped!') },
                { icon: 'auto-awesome',                      active: false,      onPress: () => showAlert('Beauty', 'Beauty filter on!') },
                { icon: 'card-giftcard',                     active: false,      onPress: () => showAlert('Gifts', 'Gift rain started!') },
                { icon: 'share',                             active: false,      onPress: () => showAlert('Share', 'Link copied!') },
              ].map(a => (
                <Pressable key={a.icon} style={[lives.ctrlBtn, a.active && lives.ctrlBtnActive]} onPress={a.onPress}>
                  <MaterialIcons name={a.icon as any} size={22} color="#FFF" />
                </Pressable>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── SETUP VIEW (PoppoLive style) ───────────────────────────────────────
  const CAMERA_H = height * 0.52;

  return (
    <View style={styles.root}>
      {/* Camera/Cover background preview */}
      <Image source={{ uri: coverImg }} style={[StyleSheet.absoluteFillObject, { height: CAMERA_H + 60 }]} contentFit="cover" />
      <View style={[StyleSheet.absoluteFillObject, { height: CAMERA_H + 60, backgroundColor: 'rgba(0,0,0,0.35)' }]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.closeBtn}>
            <MaterialIcons name="close" size={24} color="#FFF" />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable style={styles.topIconBtn} onPress={() => showAlert('Location', 'Location sharing is off')}>
            <Ionicons name="location-outline" size={22} color="rgba(255,255,255,0.5)" />
            <View style={styles.locationStrike} />
          </Pressable>
          <Pressable style={styles.topIconBtn} onPress={() => showAlert('Flip Camera', 'Camera flipped!')}>
            <Ionicons name="camera-reverse-outline" size={22} color="#FFF" />
          </Pressable>
        </View>

        {/* ── Thumbnail + Title + Categories ── */}
        <View style={styles.titleArea}>
          <Pressable onPress={() => {
            const next = COVER_IMAGES[(COVER_IMAGES.indexOf(coverImg) + 1) % COVER_IMAGES.length];
            setCoverImg(next);
          }} style={styles.thumbnailBtn}>
            <Image source={{ uri: coverImg }} style={styles.thumbnail} contentFit="cover" />
            <View style={styles.thumbnailOverlay}>
              <Text style={styles.thumbnailChange}>Change</Text>
            </View>
          </Pressable>

          {title.length === 0 ? (
            <Pressable style={styles.titlePrompt} onPress={() => {}}>
              <Text style={styles.titlePromptText}>Please enter the content</Text>
              <MaterialIcons name="edit" size={16} color="rgba(255,255,255,0.7)" />
            </Pressable>
          ) : (
            <Text style={styles.titleDisplay} numberOfLines={1}>{title}</Text>
          )}
        </View>

        {/* Category pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          {CATEGORIES.map(cat => (
            <Pressable
              key={cat}
              style={[styles.catPill, category === cat && styles.catPillActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.catPillText, category === cat && styles.catPillTextActive]}>{cat}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Camera frame guide ── */}
        <View style={styles.cameraGuide}>
          {/* Dashed border frame */}
          <View style={styles.dashedFrame}>
            {/* Corner indicators */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        {/* ── Title Input ── */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.titleInput}
            placeholder="Please enter the content ✏️"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={title}
            onChangeText={setTitle}
            maxLength={60}
          />
        </View>

        {/* ── Positioning tip ── */}
        <Text style={styles.positionTip}>Please keep centered and have your head and{'\n'}shoulders in the frame</Text>

        {/* ── Mode-specific options ── */}
        {mode === 'party' ? (
          <View style={styles.partyOptions}>
            {/* Video / Voice toggle */}
            <View style={styles.mediaToggleRow}>
              {(['video', 'voice'] as PartyMediaType[]).map(m => (
                <Pressable
                  key={m}
                  style={[styles.mediaToggleBtn, partyMedia === m && styles.mediaToggleBtnActive]}
                  onPress={() => setPartyMedia(m)}
                >
                  <Text style={[styles.mediaToggleText, partyMedia === m && styles.mediaToggleTextActive]}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Grid layout selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.layoutRow}>
              {PARTY_LAYOUTS.map(layout => (
                <Pressable
                  key={layout.id}
                  style={[styles.layoutBtn, partyLayout === layout.id && styles.layoutBtnActive]}
                  onPress={() => setPartyLayout(layout.id)}
                >
                  <LayoutIcon icon={layout.icon} active={partyLayout === layout.id} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* ── Bottom action row ── */}
        <View style={styles.bottomBar}>
          {/* Beauty / effects icon */}
          <Pressable style={styles.effectsBtn} onPress={() => showAlert('Beauty Effects', 'Beauty filters will be applied to your stream!')}>
            <View style={styles.effectsBtnInner}>
              <MaterialIcons name="auto-awesome" size={18} color="#FFF" />
            </View>
          </Pressable>

          {/* Main CTA */}
          <Pressable
            style={[styles.goLiveBtn, goingLive && { opacity: 0.75 }]}
            onPress={handleGoLive}
            disabled={goingLive}
          >
            <Text style={styles.goLiveBtnText}>
              {goingLive ? 'Starting...' : mode === 'party' ? 'Hold a party' : 'Go live'}
            </Text>
          </Pressable>

          {/* More options */}
          <Pressable style={styles.moreBtn} onPress={() => showAlert('More Options', 'Earnings info, cover image, and privacy settings')}>
            <MaterialIcons name="more-horiz" size={22} color="#FFF" />
          </Pressable>
        </View>

        {/* ── Live / Party tab switcher ── */}
        <View style={styles.modeTabs}>
          <Pressable style={styles.modeTabItem} onPress={() => setMode('live')}>
            <Text style={[styles.modeTabText, mode === 'live' && styles.modeTabTextActive]}>Live</Text>
            {mode === 'live' ? <View style={styles.modeTabLine} /> : null}
          </Pressable>
          <Pressable style={styles.modeTabItem} onPress={() => setMode('party')}>
            <Text style={[styles.modeTabText, mode === 'party' && styles.modeTabTextActive]}>Party</Text>
            {mode === 'party' ? <View style={styles.modeTabLine} /> : null}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Live View Styles ────────────────────────────────────────────────────
const lives = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  ripple: { position: 'absolute', top: -10, left: -10, width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.live },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.live, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFF' },
  liveBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  timer: { flex: 1, color: '#FFF', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  viewRoomBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  viewRoomText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  endBtn: { backgroundColor: 'rgba(255,30,30,0.8)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  endBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginTop: 6 },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  statText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, gap: 10 },
  chatArea: { gap: 4 },
  chatMsg: { color: 'rgba(255,255,255,0.85)', fontSize: 12, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  controlRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  ctrlBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  ctrlBtnActive: { backgroundColor: Colors.primary },
});

// ─── Setup View Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },

  // Top bar
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, height: 52 },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  locationStrike: { position: 'absolute', width: 2, height: 26, backgroundColor: 'rgba(255,255,255,0.5)', transform: [{ rotate: '45deg' }] },

  // Title + thumbnail area
  titleArea: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, marginBottom: 10 },
  thumbnailBtn: { width: 64, height: 64, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  thumbnail: { width: '100%', height: '100%' },
  thumbnailOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 3, alignItems: 'center' },
  thumbnailChange: { color: '#FFF', fontSize: 10, fontWeight: '600' },
  titlePrompt: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  titlePromptText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '500' },
  titleDisplay: { flex: 1, color: '#FFF', fontSize: 15, fontWeight: '600' },

  // Category pills
  catRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  catPill: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  catPillActive: { borderColor: '#FFF', backgroundColor: 'rgba(255,255,255,0.15)' },
  catPillText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500' },
  catPillTextActive: { color: '#FFF', fontWeight: '700' },

  // Camera guide
  cameraGuide: { marginHorizontal: 16, borderRadius: 12, overflow: 'hidden', height: height * 0.26, alignItems: 'center', justifyContent: 'center' },
  dashedFrame: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
    borderStyle: 'dashed', borderRadius: 12,
  },
  corner: { position: 'absolute', width: 20, height: 20, borderColor: '#FFF', borderWidth: 2.5 },
  cornerTL: { top: -1, left: -1, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 10 },
  cornerTR: { top: -1, right: -1, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 10 },
  cornerBL: { bottom: -1, left: -1, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 10 },
  cornerBR: { bottom: -1, right: -1, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 10 },

  // Title input
  inputArea: { paddingHorizontal: 16, paddingTop: 10 },
  titleInput: { color: '#FFF', fontSize: 14, borderBottomWidth: 0 },

  // Tip text
  positionTip: { color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18 },

  // Party options
  partyOptions: { marginTop: 10, paddingHorizontal: 16, gap: 12 },
  mediaToggleRow: { flexDirection: 'row', gap: 0, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24, padding: 3, alignSelf: 'center' },
  mediaToggleBtn: { paddingHorizontal: 24, paddingVertical: 7, borderRadius: 20 },
  mediaToggleBtnActive: { backgroundColor: '#5C6BC0' },
  mediaToggleText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
  mediaToggleTextActive: { color: '#FFF', fontWeight: '700' },
  layoutRow: { gap: 10, paddingVertical: 4 },
  layoutBtn: { width: 56, height: 48, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  layoutBtnActive: { backgroundColor: '#5C6BC0' },

  // Bottom action row
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, gap: 12 },
  effectsBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  effectsBtnInner: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  goLiveBtn: { flex: 1, backgroundColor: '#5C6BC0', borderRadius: 28, paddingVertical: 14, alignItems: 'center' },
  goLiveBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  moreBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  // Mode tabs (Live / Party)
  modeTabs: { flexDirection: 'row', justifyContent: 'center', gap: 36, paddingTop: 12, paddingBottom: 6 },
  modeTabItem: { alignItems: 'center', paddingVertical: 4, position: 'relative', minWidth: 60 },
  modeTabText: { color: 'rgba(255,255,255,0.45)', fontSize: 16, fontWeight: '600' },
  modeTabTextActive: { color: '#FFF', fontWeight: '700' },
  modeTabLine: { position: 'absolute', bottom: -2, width: '80%', height: 2.5, backgroundColor: '#FFF', borderRadius: 2 },
});
