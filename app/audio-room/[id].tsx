// Powered by OnSpace.AI
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, TextInput, ScrollView, KeyboardAvoidingView, Platform, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { GIFTS } from '@/constants/config';
import { useAlert } from '@/template';

const { width } = Dimensions.get('window');

const AUDIO_SEATS = [
  { id: 1, user: 'CosmicRider', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop', role: 'host', isMuted: false, isSpeaking: true },
  { id: 2, user: 'MoonlightDancer', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', role: 'co-host', isMuted: false, isSpeaking: false },
  { id: 3, user: 'StarKing99', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop', role: 'guest', isMuted: true, isSpeaking: false },
  { id: 4, filled: false },
  { id: 5, user: 'NeonPulse', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', role: 'guest', isMuted: false, isSpeaking: true },
  { id: 6, filled: false },
  { id: 7, user: 'RoseQueen', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', role: 'guest', isMuted: false, isSpeaking: false },
  { id: 8, filled: false },
];

const MOCK_MESSAGES = [
  { id: '1', user: 'DragonFire', text: 'Amazing audio room! 🔥', type: 'chat' },
  { id: '2', user: 'GalaxyGod', text: 'Love the vibes here 💫', type: 'chat' },
  { id: 'n1', user: 'StarFan', text: 'joined the room', type: 'join' },
  { id: '3', user: 'NightOwl', text: 'Can I get a seat? 🙏', type: 'chat' },
  { id: 'g1', user: 'CosmicFan', text: '', giftIcon: '👑', giftName: 'Crown', type: 'gift' },
  { id: '4', user: 'MoonGirl', text: 'So soothing to listen to 🌙', type: 'chat' },
];

export default function AudioRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUser, updateDiamonds } = useApp();
  const { showAlert } = useAlert();
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isOnSeat, setIsOnSeat] = useState(false);
  const [viewers, setViewers] = useState(1284);
  const [duration, setDuration] = useState(0);
  const [showGifts, setShowGifts] = useState(false);
  const [seats, setSeats] = useState(AUDIO_SEATS);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => setDuration(d => d + 1), 1000);
    const viewerTimer = setInterval(() => setViewers(v => Math.max(100, v + Math.floor(Math.random() * 20 - 8))), 4000);
    const msgTimer = setInterval(() => {
      const users = ['CosmicFan', 'StarGazer', 'NightOwl', 'MoonRider'];
      const texts = ['Great room! 🎵', 'Love the music 🎶', 'Amazing vibes ✨', 'Best audio room! 🎤'];
      setMessages(prev => [...prev.slice(-40), {
        id: `auto_${Date.now()}`,
        user: users[Math.floor(Math.random() * users.length)],
        text: texts[Math.floor(Math.random() * texts.length)],
        type: 'chat',
      }]);
    }, 4000);

    // Speaking animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    return () => { clearInterval(timer); clearInterval(viewerTimer); clearInterval(msgTimer); };
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 3600).toString().padStart(2, '0')}:${Math.floor((s % 3600) / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const sendMessage = () => {
    if (!inputText.trim()) return;
    setMessages(prev => [...prev.slice(-40), { id: `u_${Date.now()}`, user: currentUser.displayName, text: inputText.trim(), type: 'chat' }]);
    setInputText('');
  };

  const handleSeatPress = (seat: any) => {
    if (seat.filled === false) {
      showAlert('Request Seat?', 'Send a seat request to the host?', [
        { text: 'Request', onPress: () => { setIsOnSeat(true); showAlert('Request Sent', 'Waiting for host approval...'); } },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else if (seat.user) {
      showAlert(seat.user, `Role: ${seat.role}\n${seat.isMuted ? '🔇 Muted' : '🎤 Speaking'}`, [
        { text: 'Gift', onPress: () => setShowGifts(true) },
        { text: 'Close', style: 'cancel' },
      ]);
    }
  };

  const handleGift = (gift: any) => {
    if (currentUser.diamonds < gift.price) {
      showAlert('Not Enough Diamonds', 'Recharge to send gifts!');
      return;
    }
    updateDiamonds(-gift.price);
    setMessages(prev => [...prev, { id: `g_${Date.now()}`, user: currentUser.displayName, text: '', giftIcon: gift.icon, giftName: gift.name, type: 'gift' }]);
    setShowGifts(false);
  };

  return (
    <View style={styles.container}>
      {/* Gradient BG */}
      <View style={styles.gradientBg} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={22} color="#FFF" />
            </Pressable>
            <View style={styles.headerCenter}>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>AUDIO ROOM</Text>
              </View>
              <Text style={styles.timerText}>{formatTime(duration)}</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.viewerBadge}>
                <MaterialIcons name="people" size={12} color={Colors.diamond} />
                <Text style={styles.viewerText}>{viewers.toLocaleString()}</Text>
              </View>
              <Pressable onPress={() => showAlert('Share', 'Share this audio room link!')}>
                <MaterialIcons name="share" size={22} color="rgba(255,255,255,0.8)" />
              </Pressable>
            </View>
          </View>

          {/* Room Title */}
          <View style={styles.roomTitle}>
            <Text style={styles.roomTitleText}>🎵 Late Night Vibes Audio Room</Text>
            <Text style={styles.roomSubTitle}>Hosted by CosmicRider · Public</Text>
          </View>

          {/* Seats Grid */}
          <View style={styles.seatsSection}>
            <View style={styles.seatsGrid}>
              {seats.map((seat: any) => (
                <Pressable key={seat.id} style={styles.seatWrapper} onPress={() => handleSeatPress(seat)}>
                  {seat.user ? (
                    <View style={styles.seatFilled}>
                      <Animated.View style={[
                        styles.speakingRing,
                        seat.isSpeaking && { transform: [{ scale: pulseAnim }], borderColor: Colors.success, opacity: 1 }
                      ]}>
                        <Image source={{ uri: seat.avatar }} style={styles.seatAvatar} contentFit="cover" />
                      </Animated.View>
                      {seat.role === 'host' ? <View style={styles.hostBadge}><Text style={styles.hostBadgeText}>HOST</Text></View> : null}
                      {seat.isMuted ? <View style={styles.muteBadge}><MaterialIcons name="mic-off" size={8} color="#FFF" /></View> : null}
                      {seat.isSpeaking && !seat.isMuted ? <View style={styles.speakingBadge}><MaterialIcons name="graphic-eq" size={8} color="#FFF" /></View> : null}
                      <Text style={styles.seatName} numberOfLines={1}>{seat.user.split('D')[0]}</Text>
                    </View>
                  ) : (
                    <View style={styles.emptySeat}>
                      <MaterialIcons name="add" size={20} color={Colors.textMuted} />
                      <Text style={styles.emptySeatText}>Seat {seat.id}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Chat Area */}
          <FlatList
            data={messages.slice(-15)}
            keyExtractor={item => item.id}
            style={styles.chatList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }: { item: any }) => (
              <View style={styles.chatMsg}>
                {item.type === 'join' ? (
                  <Text style={styles.joinText}>🔔 {item.user} joined the room</Text>
                ) : item.type === 'gift' ? (
                  <View style={styles.giftMsg}>
                    <Text style={styles.giftUser}>{item.user}</Text>
                    <Text style={styles.giftSent}> sent </Text>
                    <Text style={{ fontSize: 16 }}>{item.giftIcon}</Text>
                    <Text style={styles.giftName}> {item.giftName}</Text>
                  </View>
                ) : (
                  <View style={styles.chatRow}>
                    <Text style={styles.chatUser}>{item.user}: </Text>
                    <Text style={styles.chatText}>{item.text}</Text>
                  </View>
                )}
              </View>
            )}
          />

          {/* Gift Panel */}
          {showGifts && (
            <View style={styles.giftPanel}>
              <View style={styles.giftPanelHeader}>
                <Text style={styles.giftPanelTitle}>🎁 Send Gift</Text>
                <Pressable onPress={() => setShowGifts(false)}>
                  <MaterialIcons name="close" size={20} color={Colors.textMuted} />
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.giftRow}>
                {GIFTS.map(gift => (
                  <Pressable key={gift.id} style={styles.giftItem} onPress={() => handleGift(gift)}>
                    <Text style={styles.giftIcon}>{gift.icon}</Text>
                    <Text style={styles.giftItemName}>{gift.name}</Text>
                    <Text style={styles.giftItemPrice}>💎{gift.price}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Bottom Controls */}
          <View style={styles.bottomBar}>
            <TextInput
              style={styles.chatInput}
              placeholder="Say something..."
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={sendMessage}
            />
            <Pressable onPress={() => setShowGifts(!showGifts)}>
              <Text style={{ fontSize: 24 }}>🎁</Text>
            </Pressable>
            <Pressable
              style={[styles.micBtn, isMuted && styles.micBtnMuted]}
              onPress={() => setIsMuted(!isMuted)}
            >
              <MaterialIcons name={isMuted ? 'mic-off' : 'mic'} size={22} color="#FFF" />
            </Pressable>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0015' },
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0015',
    opacity: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center', gap: 2 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(233,30,140,0.3)', borderRadius: BorderRadius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  liveText: { color: Colors.primary, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1 },
  timerText: { color: Colors.gold, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  viewerBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  viewerText: { color: Colors.diamond, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  roomTitle: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  roomTitleText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  roomSubTitle: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.xs },
  seatsSection: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  seatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, justifyContent: 'center' },
  seatWrapper: { width: (width - Spacing.md * 2 - Spacing.md * 3) / 4, alignItems: 'center' },
  seatFilled: { alignItems: 'center', gap: 4 },
  speakingRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  seatAvatar: { width: 56, height: 56, borderRadius: 28 },
  hostBadge: { position: 'absolute', top: -4, left: '50%', transform: [{ translateX: -16 }], backgroundColor: Colors.gold, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  hostBadgeText: { color: '#000', fontSize: 7, fontWeight: FontWeight.black, letterSpacing: 0.5 },
  muteBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.error, borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  speakingBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.success, borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  seatName: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: FontWeight.medium, maxWidth: 70, textAlign: 'center' },
  emptySeat: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)', gap: 2 },
  emptySeatText: { color: 'rgba(255,255,255,0.3)', fontSize: 9 },
  chatList: { flex: 1, paddingHorizontal: Spacing.md },
  chatMsg: { marginBottom: 6 },
  joinText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  giftMsg: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(233,30,140,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  giftUser: { color: Colors.primary, fontSize: 12, fontWeight: FontWeight.bold },
  giftSent: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  giftName: { color: Colors.gold, fontSize: 12, fontWeight: FontWeight.semibold },
  chatRow: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  chatUser: { color: Colors.primary, fontSize: 12, fontWeight: FontWeight.semibold },
  chatText: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  giftPanel: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.md, borderTopWidth: 1, borderColor: Colors.cardBorder },
  giftPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  giftPanelTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  giftRow: { gap: Spacing.sm, paddingBottom: Spacing.sm },
  giftItem: { alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.md, padding: Spacing.sm, width: 72, gap: 3 },
  giftIcon: { fontSize: 28 },
  giftItemName: { color: Colors.textSecondary, fontSize: 10 },
  giftItemPrice: { color: Colors.diamond, fontSize: 10, fontWeight: FontWeight.bold },
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, paddingTop: Spacing.sm, gap: Spacing.sm },
  chatInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: '#FFF', fontSize: FontSize.sm },
  micBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  micBtnMuted: { backgroundColor: Colors.error },
});
