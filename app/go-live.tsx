// SashLive — Go Live Screen with Real DB
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ScrollView, Animated, Dimensions, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/template';
import { useAlert } from '@/template';
import { createLiveRoom, endLiveRoom } from '@/services/liveRoomService';
import { sendLiveNotification } from '@/hooks/usePushNotifications';

const { width } = Dimensions.get('window');

type StreamMode = 'video' | 'audio' | 'party' | 'pk';

const STREAM_MODES = [
  { id: 'video',  icon: '📹', label: 'Video Live',  desc: 'Full video streaming',  color: Colors.live,      popular: true },
  { id: 'audio',  icon: '🎙️', label: 'Audio Room',  desc: 'Voice-only broadcast',  color: Colors.secondary, popular: false },
  { id: 'party',  icon: '🎉', label: 'Party Room',  desc: 'Multi-host party',       color: Colors.accent,    popular: false },
  { id: 'pk',     icon: '⚔️', label: 'PK Battle',   desc: 'Battle another host',   color: Colors.primary,   popular: true },
];

const STREAM_CATEGORIES = ['Chatting', 'Music', 'Dance', 'Gaming', 'Talent', 'Cooking', 'Fitness', 'Study', 'Art', 'Q&A'];

const COVER_IMAGES = [
  'https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=300&h=300&fit=crop',
];

export default function GoLiveScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [streamMode, setStreamMode] = useState<StreamMode>('video');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Chatting');
  const [coverImg, setCoverImg] = useState(COVER_IMAGES[0]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [goingLive, setGoingLive] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [viewers, setViewers] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [showTips, setShowTips] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const viewerAnim = useRef(new Animated.Value(0)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Live button pulse
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.06, duration: 800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();

    // Ripple effect
    Animated.loop(
      Animated.timing(rippleAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
    ).start();

    // Glow
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
    ])).start();
  }, []);

  useEffect(() => {
    if (!isLive) return;
    const timer = setInterval(() => setLiveSeconds(s => s + 1), 1000);
    const vTimer = setInterval(() => setViewers(v => Math.max(0, v + Math.floor(Math.random() * 15 - 3))), 3000);
    const dTimer = setInterval(() => setDiamonds(d => d + Math.floor(Math.random() * 20)), 8000);
    return () => { clearInterval(timer); clearInterval(vTimer); clearInterval(dTimer); };
  }, [isLive]);

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`
      : `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
  };

  const handleGoLive = async () => {
    if (!title.trim()) {
      showAlert('Title Required', 'Please enter a stream title to continue.');
      return;
    }
    setGoingLive(true);
    try {
      if (user?.id) {
        const { data, error } = await createLiveRoom(
          user.id,
          title.trim(),
          streamMode,
          coverImg
        );
        if (error) {
          showAlert('Error', error);
          setGoingLive(false);
          return;
        }
        if (data) setCurrentRoomId(data.id);
        // Send notification to followers (local simulation)
        await sendLiveNotification(currentUser.displayName, user.id);
      }
    } catch (e) {
      console.log('Live room creation error:', e);
    }

    setTimeout(() => {
      setGoingLive(false);
      setIsLive(true);
      setViewers(1);
    }, 2000);
  };

  const handleEndLive = () => {
    showAlert('End Stream?', `You have been live for ${formatDuration(liveSeconds)} and earned ${diamonds}💎`, [
      {
        text: 'End Stream',
        style: 'destructive',
        onPress: async () => {
          if (currentRoomId) {
            await endLiveRoom(currentRoomId);
          }
          setIsLive(false);
          setLiveSeconds(0);
          setViewers(0);
          setDiamonds(0);
          router.back();
        },
      },
      { text: 'Continue', style: 'cancel' },
    ]);
  };

  const rippleScale = rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
  const rippleOpacity = rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const glowOpacity = glowAnim;

  // ── LIVE VIEW ──
  if (isLive) {
    return (
      <View style={styles.liveContainer}>
        {/* Camera Preview Simulation */}
        <Image source={{ uri: coverImg }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        <View style={styles.liveOverlay} />

        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Top Bar */}
          <View style={styles.liveTopBar}>
            {/* LIVE Badge */}
            <View style={styles.liveBadgeWrap}>
              <Animated.View style={[styles.ripple, { transform: [{ scale: rippleScale }], opacity: rippleOpacity }]} />
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
            </View>
            <Text style={styles.liveTimer}>{formatDuration(liveSeconds)}</Text>
            <Pressable style={styles.endBtn} onPress={handleEndLive}>
              <MaterialIcons name="close" size={16} color="#FFF" />
              <Text style={styles.endBtnText}>End</Text>
            </Pressable>
          </View>

          {/* Stats Row */}
          <View style={styles.liveStats}>
            <View style={styles.liveStat}>
              <MaterialIcons name="people" size={14} color={Colors.diamond} />
              <Text style={styles.liveStatText}>{viewers.toLocaleString()}</Text>
            </View>
            <View style={styles.liveStat}>
              <Text style={{ fontSize: 12 }}>💎</Text>
              <Text style={[styles.liveStatText, { color: Colors.gold }]}>{diamonds.toLocaleString()}</Text>
            </View>
            <View style={styles.liveStat}>
              <Text style={{ fontSize: 12 }}>❤️</Text>
              <Text style={styles.liveStatText}>{(viewers * 3.2).toFixed(0)}</Text>
            </View>
          </View>

          {/* Mode Badge */}
          <View style={styles.modeBadge}>
            <Text style={{ fontSize: 14 }}>{STREAM_MODES.find(m => m.id === streamMode)?.icon}</Text>
            <Text style={styles.modeBadgeText}>{STREAM_MODES.find(m => m.id === streamMode)?.label}</Text>
          </View>

          {/* Bottom controls */}
          <View style={styles.liveControls}>
            <View style={styles.liveChat}>
              <Text style={styles.liveChatMsg}>🔔 CosmicFan joined</Text>
              <Text style={styles.liveChatMsg}>💗 StarGazer: Amazing stream!</Text>
              <Text style={styles.liveChatMsg}>🌹 MoonLight sent a Rose</Text>
            </View>
            <View style={styles.liveActionBtns}>
              {[
                { icon: 'flip-camera-ios', label: 'Flip' },
                { icon: 'mic', label: 'Mic' },
                { icon: 'face-retouching-natural', label: 'Beauty' },
                { icon: 'card-giftcard', label: 'Gifts' },
                { icon: 'share', label: 'Share' },
              ].map(a => (
                <View key={a.label} style={styles.liveActionWrap}>
                  <Pressable style={styles.liveActionBtn}>
                    <MaterialIcons name={a.icon as any} size={22} color="#FFF" />
                  </Pressable>
                  <Text style={styles.liveActionLabel}>{a.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── SETUP VIEW ──
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Go Live 🔴</Text>
        <Pressable onPress={() => setShowTips(true)}>
          <MaterialIcons name="help-outline" size={22} color={Colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Preview / Cover */}
        <View style={styles.previewSection}>
          <Image source={{ uri: coverImg }} style={styles.previewCover} contentFit="cover" />
          <View style={styles.previewOverlay}>
            <View style={styles.previewAvWrap}>
              <Image source={{ uri: currentUser.avatar }} style={styles.previewAv} contentFit="cover" />
              <Animated.View style={[styles.previewGlow, { opacity: glowOpacity }]} />
            </View>
            <Text style={styles.previewName}>{currentUser.displayName}</Text>
            <Text style={styles.previewSub}>Ready to go live?</Text>
          </View>
        </View>

        {/* Cover selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Cover Image</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
            {COVER_IMAGES.map(img => (
              <Pressable key={img} onPress={() => setCoverImg(img)}>
                <Image
                  source={{ uri: img }}
                  style={[styles.coverThumb, coverImg === img && styles.coverThumbActive]}
                  contentFit="cover"
                />
                {coverImg === img && <View style={styles.coverCheck}><MaterialIcons name="check" size={14} color="#FFF" /></View>}
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Stream Title *</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="What are you streaming today?"
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={60}
          />
          <Text style={styles.charCount}>{title.length}/60</Text>
        </View>

        {/* Stream Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Stream Mode</Text>
          <View style={styles.modesGrid}>
            {STREAM_MODES.map(mode => (
              <Pressable
                key={mode.id}
                style={[styles.modeCard, streamMode === mode.id && { borderColor: mode.color, backgroundColor: mode.color + '15' }]}
                onPress={() => setStreamMode(mode.id as StreamMode)}
              >
                <Text style={{ fontSize: 28 }}>{mode.icon}</Text>
                <View>
                  <View style={styles.modeLabelRow}>
                    <Text style={[styles.modeLabel, streamMode === mode.id && { color: mode.color }]}>{mode.label}</Text>
                    {mode.popular && <View style={styles.popularBadge}><Text style={styles.popularBadgeText}>HOT</Text></View>}
                  </View>
                  <Text style={styles.modeDesc}>{mode.desc}</Text>
                </View>
                {streamMode === mode.id && (
                  <View style={[styles.modeCheck, { backgroundColor: mode.color }]}>
                    <MaterialIcons name="check" size={11} color="#FFF" />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.xs }}>
            {STREAM_CATEGORIES.map(c => (
              <Pressable
                key={c}
                style={[styles.catChip, category === c && styles.catChipActive]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <View style={styles.privacyRow}>
            <View>
              <Text style={styles.sectionLabel}>Private Stream</Text>
              <Text style={styles.privacyDesc}>Only invited users can watch</Text>
            </View>
            <Pressable
              style={[styles.toggle, isPrivate && styles.toggleActive]}
              onPress={() => setIsPrivate(!isPrivate)}
            >
              <View style={[styles.toggleThumb, isPrivate && styles.toggleThumbActive]} />
            </Pressable>
          </View>
        </View>

        {/* Checklist */}
        <View style={styles.checklistCard}>
          <Text style={styles.checklistTitle}>✅ Pre-Live Checklist</Text>
          {[
            { label: 'Good lighting', ok: true },
            { label: 'Quiet environment', ok: true },
            { label: 'Stream title set', ok: !!title.trim() },
            { label: 'Stable internet', ok: true },
          ].map(item => (
            <View key={item.label} style={styles.checkItem}>
              <MaterialIcons name={item.ok ? 'check-circle' : 'radio-button-unchecked'} size={16} color={item.ok ? Colors.success : Colors.textMuted} />
              <Text style={[styles.checkLabel, { color: item.ok ? Colors.textPrimary : Colors.textMuted }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Go Live Button */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Pressable
            style={[styles.goLiveBtn, goingLive && { opacity: 0.8 }]}
            onPress={handleGoLive}
            disabled={goingLive}
          >
            {goingLive ? (
              <>
                <Animated.View style={[styles.goLivePulse, { transform: [{ scale: rippleScale }], opacity: rippleOpacity }]} />
                <Text style={styles.goLiveBtnText}>🔴 Starting...</Text>
              </>
            ) : (
              <>
                <View style={styles.goLiveDot} />
                <Text style={styles.goLiveBtnText}>🔴 Go Live Now</Text>
              </>
            )}
          </Pressable>
        </Animated.View>

        <Text style={styles.tosNote}>By going live you agree to our Community Guidelines. Be respectful and follow our content policies.</Text>
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Tips Modal */}
      <Modal visible={showTips} transparent animationType="slide">
        <View style={styles.tipsOverlay}>
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Text style={styles.tipsTitle}>💡 Live Tips</Text>
              <Pressable onPress={() => setShowTips(false)}>
                <MaterialIcons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { icon: '💡', title: 'Engage Viewers', desc: 'Read and respond to chat messages — viewers love interaction!' },
                { icon: '🎁', title: 'Encourage Gifts', desc: 'Thank gift senders by name to motivate more gifting.' },
                { icon: '⏰', title: 'Stream Regularly', desc: 'Consistent schedule helps grow your loyal audience.' },
                { icon: '🎤', title: 'Check Audio', desc: 'Good audio quality matters more than video quality.' },
                { icon: '⚔️', title: 'PK Battles', desc: 'PK battles drive huge viewer spikes and diamond earnings.' },
                { icon: '📢', title: 'Promote', desc: 'Share your stream link on social media before going live.' },
              ].map(tip => (
                <View key={tip.title} style={styles.tipItem}>
                  <Text style={{ fontSize: 28 }}>{tip.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tipTitle}>{tip.title}</Text>
                    <Text style={styles.tipDesc}>{tip.desc}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  title: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  scroll: { padding: Spacing.md },
  previewSection: { height: 200, borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: Spacing.lg, position: 'relative' },
  previewCover: { ...StyleSheet.absoluteFillObject },
  previewOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  previewAvWrap: { position: 'relative' },
  previewAv: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: Colors.live },
  previewGlow: { position: 'absolute', top: -8, left: -8, right: -8, bottom: -8, borderRadius: 44, borderWidth: 3, borderColor: Colors.live },
  previewName: { color: '#FFF', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  previewSub: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.sm },
  section: { marginBottom: Spacing.lg },
  sectionLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm },
  coverThumb: { width: 72, height: 72, borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.cardBorder },
  coverThumbActive: { borderColor: Colors.primary, borderWidth: 3 },
  coverCheck: { position: 'absolute', top: 4, right: 4, backgroundColor: Colors.primary, borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  titleInput: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.textPrimary, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.cardBorder },
  charCount: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'right', marginTop: 4 },
  modesGrid: { gap: Spacing.sm },
  modeCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.cardBorder, position: 'relative' },
  modeLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modeLabel: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  modeDesc: { color: Colors.textMuted, fontSize: FontSize.xs },
  popularBadge: { backgroundColor: Colors.live, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  popularBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  modeCheck: { position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  catChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  catChipTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  privacyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  privacyDesc: { color: Colors.textMuted, fontSize: FontSize.xs },
  toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: Colors.cardBorder, padding: 3 },
  toggleActive: { backgroundColor: Colors.primary },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, elevation: 2 },
  toggleThumbActive: { transform: [{ translateX: 22 }] },
  checklistCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.cardBorder, gap: Spacing.sm },
  checklistTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: 4 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkLabel: { fontSize: FontSize.sm },
  goLiveBtn: { backgroundColor: Colors.live, borderRadius: BorderRadius.pill, paddingVertical: Spacing.md + 4, alignItems: 'center', marginBottom: Spacing.sm, flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, position: 'relative', overflow: 'hidden', shadowColor: Colors.live, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 12 },
  goLiveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFF' },
  goLivePulse: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF' },
  goLiveBtnText: { color: '#FFF', fontSize: FontSize.xl, fontWeight: FontWeight.black },
  tosNote: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center', lineHeight: 18 },
  // Live view
  liveContainer: { flex: 1, backgroundColor: '#000' },
  liveOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  liveTopBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, gap: Spacing.sm },
  liveBadgeWrap: { position: 'relative' },
  ripple: { position: 'absolute', top: -8, left: -8, width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.live },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.live, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFF' },
  liveBadgeText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.black, letterSpacing: 1 },
  liveTimer: { flex: 1, color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.bold, textAlign: 'center' },
  endBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,0,0,0.7)', borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 5 },
  endBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  liveStats: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, marginTop: Spacing.xs },
  liveStat: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  liveStatText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  modeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 3, marginHorizontal: Spacing.md, marginTop: 6 },
  modeBadgeText: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  liveControls: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.md, gap: Spacing.sm },
  liveChat: { gap: 4 },
  liveChatMsg: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.xs, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 3, alignSelf: 'flex-start' },
  liveActionBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md },
  liveActionWrap: { alignItems: 'center', gap: 4 },
  liveActionBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  liveActionLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9 },
  // Tips Modal
  tipsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  tipsCard: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, maxHeight: '70%' },
  tipsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  tipsTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.md },
  tipTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  tipDesc: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 16 },
});
