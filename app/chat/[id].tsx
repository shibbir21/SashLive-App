// SashLive — Chat Screen: Image Sharing, Gifts, Stickers, Calls, Real-Time Polling
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable,
  KeyboardAvoidingView, Platform, Modal, ScrollView, Animated,
  ActivityIndicator, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { MOCK_CONVERSATIONS } from '@/services/mockData';
import { GIFTS } from '@/constants/config';
import { useApp } from '@/contexts/AppContext';
import { useAlert } from '@/template';
import { useAuth } from '@/template';
import { useRealTimeChat } from '@/hooks/useRealTimeChat';
import { notifyNewMessage } from '@/services/pushService';
import { getSupabaseClient } from '@/template';

const { width, height } = Dimensions.get('window');

const STICKER_ROWS = [
  ['😍','🔥','💗','👑','🌹','🎁','💎','🚀'],
  ['😂','🥰','💪','🎉','🌟','❤️','🫶','🙏'],
  ['🤩','😎','🤗','💋','🥳','🎊','✨','🌈'],
  ['🦋','🌸','🎵','🎶','🌙','⭐','💫','🪄'],
];

const QUICK_REPLIES = [
  'Hey! 👋', 'Love your stream 💗', 'Amazing! 🔥',
  'See you live 🔴', 'Thanks! 🙏', 'Send me a gift 🎁', 'Join my room 📺',
];

type InputMode = 'text' | 'stickers' | 'gifts' | 'none';

// ── Floating gift animation ──
function GiftFloatAnim({ icon, onDone }: { icon: string; onDone: () => void }) {
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(y, { toValue: -height * 0.35, duration: 1800, useNativeDriver: true }),
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.3, useNativeDriver: true, tension: 200, friction: 6 }),
        Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    ]).start(onDone);
  }, []);
  return (
    <Animated.View
      style={{ position: 'absolute', bottom: 120, right: 20, zIndex: 999, transform: [{ translateY: y }, { scale }], opacity }}
      pointerEvents="none"
    >
      <Text style={{ fontSize: 48 }}>{icon}</Text>
    </Animated.View>
  );
}

// ── Image Message Bubble ──
function ImageMessageBubble({ uri, isMine }: { uri: string; isMine: boolean }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <>
      <Pressable onPress={() => setZoomed(true)}>
        <Image
          source={{ uri }}
          style={[S.imgBubble, isMine && S.imgBubbleMine]}
          contentFit="cover"
          transition={200}
        />
        <View style={[S.imgBubbleOverlay, isMine && S.imgBubbleOverlayMine]}>
          <MaterialIcons name="zoom-in" size={14} color="rgba(255,255,255,0.8)" />
        </View>
      </Pressable>
      <Modal visible={zoomed} transparent animationType="fade" onRequestClose={() => setZoomed(false)}>
        <Pressable style={S.imgZoomOverlay} onPress={() => setZoomed(false)}>
          <Image source={{ uri }} style={S.imgZoomView} contentFit="contain" />
          <View style={S.imgZoomClose}>
            <MaterialIcons name="close" size={24} color="#FFF" />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUser, updateDiamonds } = useApp();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const listRef = useRef<FlatList>(null);
  const supabase = getSupabaseClient();

  const conv = MOCK_CONVERSATIONS.find(c => c.id === id) || MOCK_CONVERSATIONS[0];
  const otherId = conv.userId;
  const myId = user?.id;

  const { messages, loading, sending, sendMessage } = useRealTimeChat(myId, otherId);

  const [inputText, setInputText] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('none');
  const [showCallModal, setShowCallModal] = useState(false);
  const [activeCallType, setActiveCallType] = useState<'audio' | 'video' | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);
  const [callMuted, setCallMuted] = useState(false);
  const [callSpeaker, setCallSpeaker] = useState(false);
  const [callCameraOff, setCallCameraOff] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [floatingGifts, setFloatingGifts] = useState<Array<{ id: string; icon: string }>>([]);
  const [selectedGift, setSelectedGift] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const typingAnim = useRef(new Animated.Value(0)).current;
  const callPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(typingAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(typingAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (activeCallType) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(callPulse, { toValue: 1.3, duration: 900, useNativeDriver: true }),
          Animated.timing(callPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [activeCallType]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeCallType) {
      interval = setInterval(() => setCallSeconds(s => s + 1), 1000);
      setTimeout(() => setIsTyping(true), 3000);
      setTimeout(() => setIsTyping(false), 6500);
    } else {
      setCallSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeCallType]);

  // ── Image Sharing ──
  const handlePickImage = async (source: 'camera' | 'gallery') => {
    if (!myId) { showAlert('Login Required', 'Please log in to send images.'); return; }

    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { showAlert('Permission Required', 'Camera access is needed to take photos.'); return; }
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true, allowsEditing: true, aspect: [4, 3] });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { showAlert('Permission Required', 'Photo library access is needed.'); return; }
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true, allowsEditing: true, aspect: [4, 3] });
    }

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) { showAlert('Error', 'Could not read image data.'); return; }

    setUploadingImage(true);
    setInputMode('none');

    try {
      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const fileName = `${myId}/chat_${Date.now()}.${ext}`;

      // Convert base64 to ArrayBuffer
      const base64Data = asset.base64;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, byteArray.buffer, { contentType: mimeType, upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
      await sendMessage(publicUrl, 'image');
    } catch (err: any) {
      showAlert('Upload Failed', err.message || 'Could not upload image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageShare = () => {
    showAlert('Share Image', 'Choose a source', [
      { text: '📷 Camera', onPress: () => handlePickImage('camera') },
      { text: '🖼 Gallery', onPress: () => handlePickImage('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const toggleMode = (mode: InputMode) => {
    setInputMode(prev => prev === mode ? 'none' : mode);
  };

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    setReplyTo(null);
    await sendMessage(text, 'text');
    // Notify recipient via server push
    notifyNewMessage(otherId, currentUser.username || 'Someone', text.slice(0, 60), id || '').catch(() => {});
  }, [inputText, sendMessage, otherId, currentUser.username, id]);

  const handleSendGift = useCallback(async (gift: typeof GIFTS[0]) => {
    if (currentUser.diamonds < gift.price) {
      showAlert('Not Enough Diamonds', 'Top up to send gifts!', [
        { text: '💎 Recharge', onPress: () => router.push('/recharge') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    updateDiamonds(-gift.price);
    setSelectedGift(gift.icon);
    const gId = `fg_${Date.now()}`;
    setFloatingGifts(prev => [...prev, { id: gId, icon: gift.icon }]);
    await sendMessage(
      `${gift.icon} Sent you a ${gift.name}! (${gift.price}💎)`,
      'gift',
      { id: gift.id, icon: gift.icon, name: gift.name }
    );
    setInputMode('none');
    setTimeout(() => setSelectedGift(null), 200);
  }, [currentUser.diamonds, updateDiamonds, sendMessage]);

  const handleSendSticker = useCallback(async (s: string) => {
    setInputMode('none');
    await sendMessage(s, 'text');
  }, [sendMessage]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatCallTimer = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const renderMessage = useCallback(({ item, index }: { item: any; index: number }) => {
    const isMine = item.sender_id === myId;
    const isGift = item.type === 'gift';
    const isImage = item.type === 'image';
    const prevMsg = messages[index - 1];
    const nextMsg = messages[index + 1];
    const isFirst = !prevMsg || prevMsg.sender_id !== item.sender_id;
    const isLast = !nextMsg || nextMsg.sender_id !== item.sender_id;
    const showTime = isLast || (nextMsg && new Date(nextMsg.created_at).getTime() - new Date(item.created_at).getTime() > 300000);

    const bubbleRadius = isMine
      ? { borderBottomRightRadius: isLast ? 4 : 18 }
      : { borderBottomLeftRadius: isLast ? 4 : 18 };

    return (
      <View style={{ marginBottom: isLast ? 6 : 2 }}>
        {isFirst && index === 0 && (
          <View style={S.dateSeparator}>
            <Text style={S.dateSeparatorText}>Today</Text>
          </View>
        )}

        <Pressable
          style={[S.msgRow, isMine && S.msgRowMine]}
          onLongPress={() => showAlert('Message Options', '', [
            { text: '↩️ Reply', onPress: () => setReplyTo(item) },
            { text: '📋 Copy', onPress: () => {} },
            { text: 'Cancel', style: 'cancel' },
          ])}
        >
          {!isMine ? (
            isFirst
              ? <Image source={{ uri: conv.avatar }} style={S.msgAv} contentFit="cover" />
              : <View style={S.msgAvSpacer} />
          ) : null}

          <View style={{ maxWidth: width * 0.68 }}>
            {isFirst && !isMine && (
              <Text style={S.msgSenderName}>{conv.username}</Text>
            )}

            {item.reply_to ? (
              <View style={[S.replyPreview, isMine && S.replyPreviewMine]}>
                <Text style={S.replyPreviewText} numberOfLines={1}>{item.reply_to}</Text>
              </View>
            ) : null}

            {isImage ? (
              <ImageMessageBubble uri={item.text} isMine={isMine} />
            ) : isGift ? (
              <View style={[S.giftBubble, isMine && S.giftBubbleMine]}>
                <Text style={{ fontSize: 32 }}>{item.gift_icon || '🎁'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[S.giftBubbleTitle, isMine && { color: '#FFF' }]}>{item.gift_name || 'Gift'}</Text>
                  <Text style={S.giftBubbleSub}>{isMine ? 'You sent' : `${conv.username} sent`}</Text>
                </View>
                <View style={S.giftBubblePriceBadge}>
                  <Text style={S.giftBubblePriceText}>💎 {item.text?.match(/\((\d+)💎\)/)?.[1] || ''}</Text>
                </View>
              </View>
            ) : (
              <View style={[S.bubble, isMine ? S.bubbleMine : S.bubbleTheirs, bubbleRadius]}>
                <Text style={[S.bubbleText, isMine && S.bubbleTextMine]}>{item.text}</Text>
              </View>
            )}

            {showTime && (
              <Text style={[S.msgTime, isMine && S.msgTimeMine]}>
                {item.created_at ? formatTime(item.created_at) : ''}
                {isMine ? (item.is_read ? '  ✓✓' : '  ✓') : ''}
              </Text>
            )}
          </View>
        </Pressable>
      </View>
    );
  }, [messages, myId, conv]);

  // ── Sticker Panel ──
  const StickerPanel = () => (
    <View style={S.panel}>
      <View style={S.panelHandle} />
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 220 }}>
        {STICKER_ROWS.map((row, ri) => (
          <View key={ri} style={S.stickerRow}>
            {row.map(s => (
              <Pressable key={s} style={S.stickerItem} onPress={() => handleSendSticker(s)}>
                <Text style={{ fontSize: 32 }}>{s}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  // ── Gift Panel ──
  const GiftPanel = () => (
    <View style={S.panel}>
      <View style={S.panelHandle} />
      <View style={S.giftPanelHeader}>
        <Text style={S.giftPanelTitle}>🎁 Send a Gift</Text>
        <View style={S.balancePill}>
          <Text style={{ fontSize: 12 }}>💎</Text>
          <Text style={S.balanceText}>{currentUser.diamonds.toLocaleString()}</Text>
        </View>
        <Pressable onPress={() => router.push('/recharge')} style={S.topUpBtn}>
          <MaterialIcons name="add" size={12} color={Colors.primary} />
          <Text style={S.topUpText}>Top Up</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.giftScroll}>
        {GIFTS.map(gift => (
          <Pressable
            key={gift.id}
            style={[S.giftItem, selectedGift === gift.icon && S.giftItemSelected, currentUser.diamonds < gift.price && S.giftItemDisabled]}
            onPress={() => handleSendGift(gift)}
            disabled={currentUser.diamonds < gift.price}
          >
            <Text style={{ fontSize: 36 }}>{gift.icon}</Text>
            <Text style={S.giftItemName}>{gift.name}</Text>
            <View style={[S.giftItemPrice, currentUser.diamonds < gift.price && { backgroundColor: '#EEE' }]}>
              <Text style={[S.giftItemPriceText, currentUser.diamonds < gift.price && { color: '#999' }]}>💎{gift.price}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={S.container} edges={['top', 'bottom']}>
      {/* Header */}
      <LinearGradient colors={['#FFFFFF', '#FAFAFA']} style={S.header}>
        <Pressable onPress={() => router.back()} style={S.backBtn} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>

        <Pressable style={S.headerUser} onPress={() => router.push(`/user/${conv.userId}`)}>
          <View style={S.headerAvWrap}>
            <Image source={{ uri: conv.avatar }} style={S.headerAv} contentFit="cover" />
            {conv.isOnline ? <View style={S.onlineDot} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.headerName}>{conv.username}</Text>
            <Text style={[S.headerStatus, { color: conv.isOnline ? Colors.success : Colors.textMuted }]}>
              {isTyping
                ? <Animated.Text style={{ opacity: typingAnim }}>typing...</Animated.Text>
                : conv.isOnline ? '● Online' : '○ Offline'}
            </Text>
          </View>
        </Pressable>

        <View style={S.headerActions}>
          <Pressable style={S.headerBtn} onPress={() => { setActiveCallType('audio'); setShowCallModal(true); }} hitSlop={8}>
            <MaterialIcons name="call" size={20} color={Colors.success} />
          </Pressable>
          <Pressable style={S.headerBtn} onPress={() => { setActiveCallType('video'); setShowCallModal(true); }} hitSlop={8}>
            <MaterialIcons name="videocam" size={20} color={Colors.primary} />
          </Pressable>
          <Pressable style={S.headerBtn} onPress={() => showAlert('Chat Options', '', [
            { text: '👤 View Profile', onPress: () => router.push(`/user/${conv.userId}`) },
            { text: '🎁 Send Gift', onPress: () => setInputMode('gifts') },
            { text: '🔕 Mute Chat', onPress: () => showAlert('Muted', 'Chat notifications muted.') },
            { text: '🚫 Block User', style: 'destructive', onPress: () => showAlert('Blocked', `${conv.username} has been blocked.`) },
            { text: 'Cancel', style: 'cancel' },
          ])} hitSlop={8}>
            <MaterialIcons name="more-vert" size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        {/* Messages List */}
        {loading ? (
          <View style={S.loadingCenter}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={S.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item, i) => item.id || String(i)}
            renderItem={renderMessage}
            contentContainerStyle={S.msgList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={S.emptyChatWrap}>
                <Pressable onPress={() => router.push(`/user/${conv.userId}`)}>
                  <View style={S.emptyChatAvWrap}>
                    <Image source={{ uri: conv.avatar }} style={S.emptyChatAv} contentFit="cover" />
                    {conv.isOnline && <View style={S.emptyChatOnline} />}
                  </View>
                </Pressable>
                <Text style={S.emptyChatName}>{conv.username}</Text>
                <Text style={S.emptyChatSub}>{conv.isOnline ? '🟢 Online now' : '⚫ Last seen recently'}</Text>
                <View style={S.emptyChatBtns}>
                  <Pressable style={S.emptyChatBtn} onPress={() => { setActiveCallType('audio'); setShowCallModal(true); }}>
                    <MaterialIcons name="call" size={18} color={Colors.success} />
                    <Text style={[S.emptyChatBtnText, { color: Colors.success }]}>Call</Text>
                  </Pressable>
                  <Pressable style={S.emptyChatBtn} onPress={() => { setActiveCallType('video'); setShowCallModal(true); }}>
                    <MaterialIcons name="videocam" size={18} color={Colors.primary} />
                    <Text style={[S.emptyChatBtnText, { color: Colors.primary }]}>Video</Text>
                  </Pressable>
                  <Pressable style={S.emptyChatBtn} onPress={() => setInputMode('gifts')}>
                    <Text style={{ fontSize: 18 }}>🎁</Text>
                    <Text style={[S.emptyChatBtnText, { color: Colors.gold }]}>Gift</Text>
                  </Pressable>
                  <Pressable style={S.emptyChatBtn} onPress={handleImageShare}>
                    <MaterialIcons name="image" size={18} color={Colors.secondary} />
                    <Text style={[S.emptyChatBtnText, { color: Colors.secondary }]}>Photo</Text>
                  </Pressable>
                </View>
                <Text style={S.sayHello}>Say hello! 👋</Text>
              </View>
            }
          />
        )}

        {/* Upload progress */}
        {uploadingImage ? (
          <View style={S.uploadingBar}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={S.uploadingText}>Uploading image...</Text>
          </View>
        ) : null}

        {/* Reply preview bar */}
        {replyTo ? (
          <View style={S.replyBar}>
            <MaterialIcons name="reply" size={16} color={Colors.primary} />
            <Text style={S.replyBarText} numberOfLines={1}>{replyTo.text}</Text>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
              <MaterialIcons name="close" size={16} color={Colors.textMuted} />
            </Pressable>
          </View>
        ) : null}

        {/* Quick Replies */}
        {inputMode === 'none' && (
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            style={S.quickRow}
            contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.xs, alignItems: 'center', height: 40 }}
          >
            {QUICK_REPLIES.map(r => (
              <Pressable key={r} style={S.quickChip} onPress={() => sendMessage(r)}>
                <Text style={S.quickChipText}>{r}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Sticker Panel */}
        {inputMode === 'stickers' && <StickerPanel />}

        {/* Gift Panel */}
        {inputMode === 'gifts' && <GiftPanel />}

        {/* Input Bar */}
        <View style={S.inputBar}>
          <Pressable style={S.inputModeBtn} onPress={() => toggleMode('stickers')}>
            <Text style={{ fontSize: 22, opacity: inputMode === 'stickers' ? 1 : 0.7 }}>😊</Text>
          </Pressable>

          <View style={S.inputWrap}>
            <TextInput
              style={S.input}
              placeholder="Type a message..."
              placeholderTextColor={Colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              onFocus={() => setInputMode('none')}
            />
          </View>

          {inputText.trim() ? (
            <Pressable style={[S.sendBtn, sending && { opacity: 0.5 }]} onPress={handleSend} disabled={sending}>
              {sending
                ? <ActivityIndicator size="small" color="#FFF" />
                : <MaterialIcons name="send" size={18} color="#FFF" />}
            </Pressable>
          ) : (
            <>
              <Pressable style={S.inputModeBtn} onPress={() => toggleMode('gifts')}>
                <Text style={{ fontSize: 22, opacity: inputMode === 'gifts' ? 1 : 0.7 }}>🎁</Text>
              </Pressable>
              <Pressable
                style={[S.inputModeBtn, uploadingImage && { opacity: 0.5 }]}
                onPress={handleImageShare}
                disabled={uploadingImage}
              >
                {uploadingImage
                  ? <ActivityIndicator size="small" color={Colors.primary} />
                  : <MaterialIcons name="image" size={22} color={Colors.textSecondary} />}
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Floating gift animations */}
      {floatingGifts.map(fg => (
        <GiftFloatAnim key={fg.id} icon={fg.icon} onDone={() => setFloatingGifts(prev => prev.filter(g => g.id !== fg.id))} />
      ))}

      {/* ── CALL MODAL ── */}
      <Modal visible={showCallModal} transparent animationType="fade" onRequestClose={() => { setShowCallModal(false); setActiveCallType(null); }}>
        <View style={S.callOverlay}>
          <LinearGradient colors={activeCallType === 'video' ? ['#1a0533', '#0d1b3e', '#000'] : ['#0d1b1b', '#0a2020', '#000']} style={S.callBg}>
            {[1, 2, 3].map(i => (
              <Animated.View key={i} style={[S.callRing, {
                width: 130 + i * 50, height: 130 + i * 50, borderRadius: (130 + i * 50) / 2,
                transform: [{ scale: callPulse }],
                opacity: 0.12 / i,
                borderColor: activeCallType === 'video' ? Colors.primary : Colors.success,
              }]} />
            ))}

            <Animated.View style={[S.callAvWrap, { transform: [{ scale: callPulse.interpolate({ inputRange: [1, 1.3], outputRange: [1, 1.05] }) }] }]}>
              <Image source={{ uri: conv.avatar }} style={S.callAv} contentFit="cover" />
              {conv.isOnline && <View style={[S.callOnlineBadge, { backgroundColor: activeCallType === 'video' ? Colors.primary : Colors.success }]}>
                <Text style={S.callOnlineBadgeText}>{activeCallType === 'video' ? '📹' : '📞'}</Text>
              </View>}
            </Animated.View>

            <Text style={S.callName}>{conv.username}</Text>
            <Text style={S.callSubtitle}>{activeCallType === 'video' ? 'Video Call' : 'Voice Call'}</Text>
            <Text style={S.callTimer}>{formatCallTimer(callSeconds)}</Text>

            <View style={S.callControls}>
              <View style={S.callCtrlItem}>
                <Pressable style={[S.callCtrlBtn, callMuted && S.callCtrlBtnActive]} onPress={() => setCallMuted(v => !v)}>
                  <MaterialIcons name={callMuted ? 'mic-off' : 'mic'} size={24} color="#FFF" />
                </Pressable>
                <Text style={S.callCtrlLabel}>{callMuted ? 'Unmute' : 'Mute'}</Text>
              </View>

              <View style={S.callCtrlItem}>
                <Pressable style={S.endCallBtn} onPress={() => {
                  const m = Math.floor(callSeconds / 60);
                  const s = callSeconds % 60;
                  showAlert('Call Ended', `Duration: ${m}:${s.toString().padStart(2, '0')} min`);
                  setActiveCallType(null);
                  setShowCallModal(false);
                  setCallSeconds(0);
                }}>
                  <MaterialIcons name="call-end" size={28} color="#FFF" />
                </Pressable>
                <Text style={S.callCtrlLabel}>End</Text>
              </View>

              <View style={S.callCtrlItem}>
                <Pressable
                  style={[S.callCtrlBtn, (callSpeaker || callCameraOff) && S.callCtrlBtnActive]}
                  onPress={() => activeCallType === 'video' ? setCallCameraOff(v => !v) : setCallSpeaker(v => !v)}
                >
                  <MaterialIcons name={activeCallType === 'video' ? (callCameraOff ? 'videocam-off' : 'flip-camera-ios') : (callSpeaker ? 'volume-up' : 'volume-mute')} size={24} color="#FFF" />
                </Pressable>
                <Text style={S.callCtrlLabel}>{activeCallType === 'video' ? (callCameraOff ? 'Cam Off' : 'Flip') : (callSpeaker ? 'Speaker' : 'Earpiece')}</Text>
              </View>
            </View>

            <Pressable style={S.callGiftBtn} onPress={() => { setShowCallModal(false); setInputMode('gifts'); }}>
              <Text style={{ fontSize: 16 }}>🎁</Text>
              <Text style={S.callGiftText}>Send Gift</Text>
            </Pressable>
          </LinearGradient>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, gap: Spacing.xs },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvWrap: { position: 'relative' },
  headerAv: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: Colors.primary },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: '#FFF' },
  headerName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  headerStatus: { fontSize: 11, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#F3F4F6' },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textMuted, fontSize: FontSize.sm },
  msgList: { padding: Spacing.md, paddingBottom: Spacing.xl },
  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  dateSeparatorText: { color: Colors.textMuted, fontSize: 11, backgroundColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 3 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, maxWidth: '85%', alignSelf: 'flex-start' },
  msgRowMine: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgAv: { width: 30, height: 30, borderRadius: 15, marginBottom: 2 },
  msgAvSpacer: { width: 30 },
  msgSenderName: { color: Colors.primary, fontSize: 11, fontWeight: FontWeight.semibold, marginBottom: 2, marginLeft: 4 },
  replyPreview: { backgroundColor: '#E5E7EB', borderLeftWidth: 3, borderLeftColor: Colors.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 3 },
  replyPreviewMine: { backgroundColor: 'rgba(255,255,255,0.2)', borderLeftColor: 'rgba(255,255,255,0.7)' },
  replyPreviewText: { color: Colors.textSecondary, fontSize: 11 },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, maxWidth: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  bubbleMine: { backgroundColor: Colors.primary },
  bubbleTheirs: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  bubbleText: { color: Colors.textPrimary, fontSize: FontSize.sm, lineHeight: 20 },
  bubbleTextMine: { color: '#FFF' },
  // Image bubbles
  imgBubble: { width: width * 0.52, height: width * 0.42, borderRadius: 14, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  imgBubbleMine: { borderRadius: 14 },
  imgBubbleOverlay: { position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  imgBubbleOverlayMine: { left: undefined, right: 6 },
  imgZoomOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  imgZoomView: { width: '95%', height: '80%', borderRadius: 12 },
  imgZoomClose: { position: 'absolute', top: 52, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  msgTime: { color: Colors.textMuted, fontSize: 10, marginTop: 3, marginLeft: 4 },
  msgTimeMine: { textAlign: 'right', marginRight: 4, color: Colors.textMuted },
  giftBubble: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: Colors.gold + '15', borderWidth: 1.5, borderColor: Colors.gold + '40', maxWidth: width * 0.68 },
  giftBubbleMine: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary + '50' },
  giftBubbleTitle: { color: Colors.gold, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  giftBubbleSub: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  giftBubblePriceBadge: { backgroundColor: Colors.gold + '25', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  giftBubblePriceText: { color: Colors.gold, fontSize: 10, fontWeight: FontWeight.bold },
  // Upload progress
  uploadingBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.primary + '10', borderTopWidth: 1, borderTopColor: Colors.primary + '20' },
  uploadingText: { color: Colors.primary, fontSize: 12, fontWeight: FontWeight.medium },
  emptyChatWrap: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyChatAvWrap: { position: 'relative' },
  emptyChatAv: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: Colors.primary },
  emptyChatOnline: { position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.success, borderWidth: 2.5, borderColor: '#F8F9FA' },
  emptyChatName: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginTop: 8 },
  emptyChatSub: { color: Colors.textMuted, fontSize: FontSize.sm },
  emptyChatBtns: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  emptyChatBtn: { alignItems: 'center', gap: 4, backgroundColor: '#FFF', borderRadius: BorderRadius.lg, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  emptyChatBtnText: { fontSize: 12, fontWeight: FontWeight.semibold },
  sayHello: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 4 },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.primary + '10', borderTopWidth: 1, borderTopColor: Colors.primary + '30' },
  replyBarText: { flex: 1, color: Colors.primary, fontSize: 12 },
  quickRow: { backgroundColor: '#F8F9FA', borderTopWidth: 1, borderTopColor: '#F0F0F0', maxHeight: 40 },
  quickChip: { backgroundColor: '#FFF', borderRadius: BorderRadius.pill, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: '#E5E7EB' },
  quickChipText: { color: Colors.textSecondary, fontSize: 12 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingVertical: 8, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F0F0F0', gap: 4 },
  inputModeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  inputWrap: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 8, minHeight: 40, justifyContent: 'center' },
  input: { color: Colors.textPrimary, fontSize: FontSize.sm, maxHeight: 100, lineHeight: 20 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 4 },
  panel: { backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingBottom: 12 },
  panelHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginVertical: 8 },
  stickerRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8, marginBottom: 4 },
  stickerItem: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  giftPanelHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 8, gap: 8 },
  giftPanelTitle: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  balancePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.gold + '20', borderRadius: BorderRadius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  balanceText: { color: Colors.gold, fontSize: 12, fontWeight: FontWeight.bold },
  topUpBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: BorderRadius.pill, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: Colors.primary + '50' },
  topUpText: { color: Colors.primary, fontSize: 11, fontWeight: FontWeight.bold },
  giftScroll: { paddingHorizontal: 14, gap: 10, paddingBottom: 8 },
  giftItem: { alignItems: 'center', gap: 4, padding: 10, backgroundColor: '#F9FAFB', borderRadius: BorderRadius.lg, width: 80, borderWidth: 1.5, borderColor: '#E5E7EB' },
  giftItemSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  giftItemDisabled: { opacity: 0.4 },
  giftItemName: { color: Colors.textSecondary, fontSize: 10, textAlign: 'center' },
  giftItemPrice: { backgroundColor: Colors.gold + '20', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  giftItemPriceText: { color: Colors.gold, fontSize: 10, fontWeight: FontWeight.bold },
  callOverlay: { flex: 1 },
  callBg: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, position: 'relative' },
  callRing: { position: 'absolute', borderWidth: 2 },
  callAvWrap: { position: 'relative', marginBottom: 4 },
  callAv: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)' },
  callOnlineBadge: { position: 'absolute', bottom: 4, right: 4, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  callOnlineBadgeText: { fontSize: 14 },
  callName: { color: '#FFF', fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  callSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.sm },
  callTimer: { color: '#FFF', fontSize: 36, fontWeight: FontWeight.black, letterSpacing: 2 },
  callControls: { flexDirection: 'row', gap: 40, marginTop: 20 },
  callCtrlItem: { alignItems: 'center', gap: 8 },
  callCtrlBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  callCtrlBtnActive: { backgroundColor: 'rgba(255,255,255,0.35)' },
  endCallBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.error, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 12 },
  callCtrlLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  callGiftBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: BorderRadius.pill, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  callGiftText: { color: '#FFF', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
