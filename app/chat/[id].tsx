// SashLive — Chat Screen with Real Supabase DB + Polling
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable,
  KeyboardAvoidingView, Platform, Modal, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { MOCK_CONVERSATIONS } from '@/services/mockData';
import { GIFTS } from '@/constants/config';
import { useApp } from '@/contexts/AppContext';
import { useAlert } from '@/template';
import { useAuth } from '@/template';
import { useRealTimeChat, type ChatMessage } from '@/hooks/useRealTimeChat';

const STICKERS = ['😍','🔥','💗','👑','🌹','🎁','💎','🚀','😂','🥰','💪','🎉','🌟','❤️','🫶','🙏'];
const QUICK_REPLIES = ['Hey! 👋', 'Love your stream 💗', 'Amazing! 🔥', 'See you live 🔴', 'Thanks! 🙏', 'Let\'s collab 🎬'];

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUser, updateDiamonds } = useApp();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const listRef = useRef<FlatList>(null);

  const conv = MOCK_CONVERSATIONS.find(c => c.id === id) || MOCK_CONVERSATIONS[0];
  const otherId = conv.userId;
  const myId = user?.id;

  const { messages, loading, sending, sendMessage } = useRealTimeChat(myId, otherId);

  const [inputText, setInputText] = useState('');
  const [showGiftSheet, setShowGiftSheet] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [activeCallType, setActiveCallType] = useState<'audio' | 'video' | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const typingAnim = useRef(new Animated.Value(0)).current;
  const giftSentAnim = useRef(new Animated.Value(0)).current;

  // Typing indicator animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(typingAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(typingAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
    }
  }, [messages]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeCallType) {
      interval = setInterval(() => setCallSeconds(s => s + 1), 1000);
      // Simulate typing after call starts
      setTimeout(() => setIsTyping(true), 3000);
      setTimeout(() => setIsTyping(false), 6000);
    } else {
      setCallSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeCallType]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    await sendMessage(text, 'text');
  };

  const handleSendGift = async (gift: typeof GIFTS[0]) => {
    if (currentUser.diamonds < gift.price) {
      showAlert('Not Enough Diamonds', 'Recharge to send gifts!', [
        { text: 'Recharge', onPress: () => router.push('/recharge') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    updateDiamonds(-gift.price);
    // Animate gift sent
    giftSentAnim.setValue(0);
    Animated.sequence([
      Animated.timing(giftSentAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(giftSentAnim, { toValue: 0, duration: 300, useNativeDriver: true, delay: 1000 }),
    ]).start();
    await sendMessage(`${gift.icon} Sent you a ${gift.name}! (${gift.price}💎)`, 'gift', {
      id: gift.id,
      icon: gift.icon,
      name: gift.name,
    });
    setShowGiftSheet(false);
  };

  const handleSendSticker = async (s: string) => {
    setShowStickers(false);
    await sendMessage(s, 'text');
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatCallTimer = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const renderMessage = ({ item, index }: { item: any; index: number }) => {
    const isMine = item.sender_id === myId;
    const isGift = item.type === 'gift';
    const isFirst = index === 0 || messages[index - 1]?.sender_id !== item.sender_id;
    const showAvatar = !isMine && isFirst;

    return (
      <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
        {showAvatar ? (
          <Image source={{ uri: conv.avatar }} style={styles.msgAv} contentFit="cover" />
        ) : !isMine ? <View style={styles.msgAvSpacer} /> : null}

        {isGift ? (
          <View style={[styles.giftBubble, isMine && styles.giftBubbleMine]}>
            <Text style={styles.giftIcon}>{item.gift_icon || '🎁'}</Text>
            <View>
              <Text style={styles.giftBubbleText}>{item.gift_name || 'Gift'}</Text>
              <Text style={styles.giftBubbleSub}>sent by {isMine ? 'You' : conv.username}</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.text}</Text>
            <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
              {item.created_at ? formatTime(item.created_at) : ''}
              {isMine && <Text> {item.is_read ? ' ✓✓' : ' ✓'}</Text>}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const giftScale = giftSentAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1.2, 1] });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Pressable style={styles.headerUser} onPress={() => router.push(`/user/${conv.userId}`)}>
          <View style={styles.headerAvWrap}>
            <Image source={{ uri: conv.avatar }} style={styles.headerAv} contentFit="cover" />
            {conv.isOnline && <View style={styles.onlineDot} />}
          </View>
          <View>
            <Text style={styles.headerName}>{conv.username}</Text>
            <Text style={[styles.headerStatus, { color: conv.isOnline ? Colors.success : Colors.textMuted }]}>
              {isTyping ? (
                <Animated.Text style={{ opacity: typingAnim }}>typing...</Animated.Text>
              ) : conv.isOnline ? '🟢 Online' : '⚫ Offline'}
            </Text>
          </View>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable style={styles.actionBtn} onPress={() => { setActiveCallType('audio'); setShowCallModal(true); }}>
            <MaterialIcons name="call" size={20} color={Colors.success} />
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => { setActiveCallType('video'); setShowCallModal(true); }}>
            <MaterialIcons name="videocam" size={20} color={Colors.primary} />
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => showAlert('Options', '', [
            { text: 'View Profile', onPress: () => router.push(`/user/${conv.userId}`) },
            { text: 'Send Gift', onPress: () => setShowGiftSheet(true) },
            { text: 'Block User', style: 'destructive', onPress: () => showAlert('Blocked', `${conv.username} has been blocked.`) },
            { text: 'Cancel', style: 'cancel' },
          ])}>
            <MaterialIcons name="more-vert" size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Messages */}
        {loading ? (
          <View style={styles.loadingCenter}>
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item, i) => item.id || String(i)}
            renderItem={renderMessage}
            contentContainerStyle={styles.msgList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Image source={{ uri: conv.avatar }} style={styles.emptyChatAv} contentFit="cover" />
                <Text style={styles.emptyChatName}>{conv.username}</Text>
                <Text style={styles.emptyChatSub}>Say hello! 👋</Text>
              </View>
            }
          />
        )}

        {/* Quick Replies */}
        {!showGiftSheet && !showStickers && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickRow}
            contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.xs, paddingVertical: 6 }}
          >
            {QUICK_REPLIES.map(r => (
              <Pressable key={r} style={styles.quickChip} onPress={() => sendMessage(r)}>
                <Text style={styles.quickChipText}>{r}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Stickers Panel */}
        {showStickers && (
          <View style={styles.stickerPanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>😊 Stickers</Text>
              <Pressable onPress={() => setShowStickers(false)}>
                <MaterialIcons name="close" size={20} color={Colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.stickerGrid}>
              {STICKERS.map(s => (
                <Pressable key={s} style={styles.stickerItem} onPress={() => handleSendSticker(s)}>
                  <Text style={{ fontSize: 30 }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Gift Panel */}
        {showGiftSheet && (
          <View style={styles.giftPanel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>🎁 Send a Gift</Text>
              <View style={styles.panelBalance}>
                <Text style={styles.panelBalanceText}>💎 {currentUser.diamonds}</Text>
              </View>
              <Pressable onPress={() => setShowGiftSheet(false)}>
                <MaterialIcons name="close" size={20} color={Colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.giftScroll}>
              {GIFTS.map(gift => (
                <Pressable
                  key={gift.id}
                  style={[styles.giftItem, currentUser.diamonds < gift.price && { opacity: 0.4 }]}
                  onPress={() => handleSendGift(gift)}
                >
                  <Text style={{ fontSize: 34 }}>{gift.icon}</Text>
                  <Text style={styles.giftName}>{gift.name}</Text>
                  <View style={styles.giftPriceBadge}>
                    <Text style={styles.giftPrice}>💎{gift.price}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <Pressable
            style={styles.inputBtn}
            onPress={() => { setShowStickers(!showStickers); setShowGiftSheet(false); }}
          >
            <Text style={{ fontSize: 22 }}>😊</Text>
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <Pressable
            style={styles.inputBtn}
            onPress={() => { setShowGiftSheet(!showGiftSheet); setShowStickers(false); }}
          >
            <Text style={{ fontSize: 22 }}>🎁</Text>
          </Pressable>
          <Pressable
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnOff]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <MaterialIcons name="send" size={18} color="#FFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Gift Sent Animation Overlay */}
      <Animated.View
        style={[styles.giftSentOverlay, { opacity: giftSentAnim, transform: [{ scale: giftScale }] }]}
        pointerEvents="none"
      >
        <Text style={{ fontSize: 72 }}>🎁</Text>
        <Text style={styles.giftSentText}>Gift Sent!</Text>
      </Animated.View>

      {/* Call Modal */}
      <Modal visible={showCallModal} transparent animationType="fade">
        <View style={styles.callOverlay}>
          <View style={styles.callCard}>
            {/* Animated rings */}
            {[1, 2, 3].map(i => (
              <Animated.View
                key={i}
                style={[styles.callRing, {
                  width: 120 + i * 40,
                  height: 120 + i * 40,
                  borderRadius: (120 + i * 40) / 2,
                  opacity: 0.15 / i,
                  borderColor: Colors.primary,
                }]}
              />
            ))}
            <Image source={{ uri: conv.avatar }} style={styles.callAv} contentFit="cover" />
            <Text style={styles.callName}>{conv.username}</Text>
            <Text style={styles.callType}>
              {activeCallType === 'video' ? '📹 Video Call' : '📞 Voice Call'}
            </Text>
            <Text style={styles.callTimer}>{formatCallTimer(callSeconds)}</Text>

            {/* Call action buttons */}
            <View style={styles.callActions}>
              {[
                { icon: 'mic-off', label: 'Mute', color: Colors.surfaceElevated },
                { icon: activeCallType === 'video' ? 'flip-camera-ios' : 'speaker', label: activeCallType === 'video' ? 'Flip' : 'Speaker', color: Colors.surfaceElevated },
                { icon: 'videocam-off', label: 'Camera', color: Colors.surfaceElevated, hidden: activeCallType !== 'video' },
              ].filter(a => !a.hidden).map(a => (
                <View key={a.label} style={styles.callActionWrap}>
                  <Pressable style={[styles.callActionBtn, { backgroundColor: a.color }]}>
                    <MaterialIcons name={a.icon as any} size={22} color="#FFF" />
                  </Pressable>
                  <Text style={styles.callActionLabel}>{a.label}</Text>
                </View>
              ))}
            </View>

            <Pressable
              style={styles.endCallBtn}
              onPress={() => {
                const m = Math.floor(callSeconds / 60);
                const s = callSeconds % 60;
                showAlert('Call Ended', `Duration: ${m}:${s.toString().padStart(2, '0')}`);
                setActiveCallType(null);
                setShowCallModal(false);
              }}
            >
              <MaterialIcons name="call-end" size={28} color="#FFF" />
              <Text style={styles.endCallText}>End</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, gap: Spacing.sm },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerAvWrap: { position: 'relative' },
  headerAv: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: Colors.primary },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.bg },
  headerName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  headerStatus: { fontSize: FontSize.xs },
  headerActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderRadius: 19, borderWidth: 1, borderColor: Colors.cardBorder },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.textMuted, fontSize: FontSize.sm },
  msgList: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.lg },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, maxWidth: '88%' },
  msgRowMine: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgAv: { width: 28, height: 28, borderRadius: 14 },
  msgAvSpacer: { width: 28 },
  bubble: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 18, maxWidth: '100%' },
  bubbleMine: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.cardBorder },
  bubbleText: { color: Colors.textPrimary, fontSize: FontSize.sm, lineHeight: 20 },
  bubbleTextMine: { color: '#FFF' },
  bubbleTime: { color: 'rgba(255,255,255,0.45)', fontSize: 9, marginTop: 2, textAlign: 'right' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.55)' },
  giftBubble: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(255,215,0,0.12)', borderWidth: 1, borderColor: Colors.gold + '50' },
  giftBubbleMine: { backgroundColor: 'rgba(233,30,140,0.12)', borderColor: Colors.primary + '50' },
  giftIcon: { fontSize: 28 },
  giftBubbleText: { color: Colors.gold, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  giftBubbleSub: { color: Colors.textMuted, fontSize: FontSize.xs },
  quickRow: { maxHeight: 44 },
  quickChip: { backgroundColor: Colors.surface, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderWidth: 1, borderColor: Colors.cardBorder },
  quickChipText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  stickerPanel: { backgroundColor: Colors.bgSecondary, borderTopWidth: 1, borderTopColor: Colors.cardBorder, padding: Spacing.md },
  giftPanel: { backgroundColor: Colors.bgSecondary, borderTopWidth: 1, borderTopColor: Colors.cardBorder, padding: Spacing.md },
  panelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm, gap: Spacing.sm },
  panelTitle: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  panelBalance: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  panelBalanceText: { color: Colors.diamond, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  stickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  stickerItem: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  giftScroll: { gap: Spacing.sm, paddingBottom: Spacing.sm },
  giftItem: { alignItems: 'center', gap: 4, padding: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, width: 76, borderWidth: 1, borderColor: Colors.cardBorder },
  giftName: { color: Colors.textSecondary, fontSize: 10, textAlign: 'center' },
  giftPriceBadge: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.pill, paddingHorizontal: 6, paddingVertical: 2 },
  giftPrice: { color: Colors.diamond, fontSize: 10, fontWeight: FontWeight.bold },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.cardBorder, gap: Spacing.xs, backgroundColor: Colors.bgSecondary },
  inputBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.textPrimary, fontSize: FontSize.sm, maxHeight: 100, borderWidth: 1, borderColor: Colors.cardBorder, lineHeight: 20 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: Colors.surfaceElevated },
  giftSentOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', pointerEvents: 'none' as any },
  giftSentText: { color: Colors.gold, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  emptyChat: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
  emptyChatAv: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: Colors.primary },
  emptyChatName: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  emptyChatSub: { color: Colors.textMuted, fontSize: FontSize.sm },
  callOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  callCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md, width: '85%', borderWidth: 1, borderColor: Colors.primary + '40', position: 'relative', overflow: 'hidden' },
  callRing: { position: 'absolute', borderWidth: 2 },
  callAv: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: Colors.primary, zIndex: 1 },
  callName: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold, zIndex: 1 },
  callType: { color: Colors.textSecondary, fontSize: FontSize.sm, zIndex: 1 },
  callTimer: { color: Colors.gold, fontSize: FontSize.xxl, fontWeight: FontWeight.black, zIndex: 1 },
  callActions: { flexDirection: 'row', gap: Spacing.xl, marginVertical: Spacing.sm, zIndex: 1 },
  callActionWrap: { alignItems: 'center', gap: 6 },
  callActionBtn: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  callActionLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  endCallBtn: { backgroundColor: Colors.error, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, zIndex: 1 },
  endCallText: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
});
