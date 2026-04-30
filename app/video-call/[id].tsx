// Powered by OnSpace.AI
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { MOCK_USERS } from '@/services/mockData';
import { useAlert } from '@/template';

const { width, height } = Dimensions.get('window');

type CallState = 'ringing' | 'connected' | 'ended';

export default function VideoCallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showAlert } = useAlert();
  const [callState, setCallState] = useState<CallState>('ringing');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const user = MOCK_USERS.find(u => u.id === id) || MOCK_USERS[0];

  useEffect(() => {
    // Auto-answer after 2 seconds
    const answerTimer = setTimeout(() => setCallState('connected'), 2000);
    return () => clearTimeout(answerTimer);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (callState === 'connected') {
      timer = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [callState]);

  useEffect(() => {
    if (callState === 'ringing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [callState]);

  const handleTap = () => {
    setShowControls(!showControls);
    Animated.timing(controlsOpacity, {
      toValue: showControls ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleEndCall = () => {
    setCallState('ended');
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    showAlert('Call Ended', `Duration: ${mins}:${secs.toString().padStart(2, '0')}`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (callState === 'ringing') {
    return (
      <View style={styles.container}>
        <Image source={{ uri: user.avatar }} style={StyleSheet.absoluteFillObject} contentFit="cover" blurRadius={20} />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
        <SafeAreaView style={styles.ringingContainer}>
          <Text style={styles.ringingLabel}>Incoming Video Call</Text>
          <Animated.View style={[styles.ringingAvatarRing, { transform: [{ scale: pulseAnim }] }]}>
            <Image source={{ uri: user.avatar }} style={styles.ringingAvatar} contentFit="cover" />
          </Animated.View>
          <Text style={styles.ringingName}>{user.displayName}</Text>
          <Text style={styles.ringingUsername}>@{user.username}</Text>

          <View style={styles.ringingActions}>
            <Pressable style={styles.declineBtn} onPress={() => router.back()}>
              <MaterialIcons name="call-end" size={30} color="#FFF" />
              <Text style={styles.callBtnLabel}>Decline</Text>
            </Pressable>
            <Pressable style={styles.acceptBtn} onPress={() => setCallState('connected')}>
              <MaterialIcons name="videocam" size={30} color="#FFF" />
              <Text style={styles.callBtnLabel}>Accept</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <Pressable style={styles.container} onPress={handleTap}>
      {/* Remote video (full screen) */}
      <Image
        source={{ uri: user.avatar }}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        transition={300}
      />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />

      {/* Local video (pip) */}
      <Pressable style={[styles.localVideo, isFlipped && styles.localVideoFlipped]} onPress={() => setIsFlipped(!isFlipped)}>
        {isCamOff ? (
          <View style={styles.camOffView}>
            <MaterialIcons name="videocam-off" size={24} color={Colors.textMuted} />
          </View>
        ) : (
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop' }}
            style={styles.localVideoImg}
            contentFit="cover"
          />
        )}
      </Pressable>

      <SafeAreaView style={styles.callUI}>
        {/* Top */}
        <Animated.View style={[styles.callTopBar, { opacity: controlsOpacity }]}>
          <View>
            <Text style={styles.callUserName}>{user.displayName}</Text>
            <Text style={styles.callTimer}>{formatTime(duration)}</Text>
          </View>
          <View style={styles.callTopActions}>
            <Pressable style={styles.topActionBtn} onPress={() => showAlert('Beauty Filter', 'Beauty mode activated! ✨')}>
              <MaterialIcons name="auto-fix-high" size={20} color="#FFF" />
            </Pressable>
            <Pressable style={styles.topActionBtn} onPress={() => setIsSpeaker(!isSpeaker)}>
              <MaterialIcons name={isSpeaker ? 'volume-up' : 'volume-off'} size={20} color="#FFF" />
            </Pressable>
          </View>
        </Animated.View>

        {/* Bottom Controls */}
        <Animated.View style={[styles.callControls, { opacity: controlsOpacity }]}>
          <Pressable style={[styles.controlBtn, isMuted && styles.controlBtnActive]} onPress={() => setIsMuted(!isMuted)}>
            <MaterialIcons name={isMuted ? 'mic-off' : 'mic'} size={24} color="#FFF" />
            <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </Pressable>

          <Pressable style={styles.endBtn} onPress={handleEndCall}>
            <MaterialIcons name="call-end" size={32} color="#FFF" />
          </Pressable>

          <Pressable style={[styles.controlBtn, isCamOff && styles.controlBtnActive]} onPress={() => setIsCamOff(!isCamOff)}>
            <MaterialIcons name={isCamOff ? 'videocam-off' : 'videocam'} size={24} color="#FFF" />
            <Text style={styles.controlLabel}>{isCamOff ? 'Cam On' : 'Cam Off'}</Text>
          </Pressable>
        </Animated.View>

        {/* More controls row */}
        <Animated.View style={[styles.extraControls, { opacity: controlsOpacity }]}>
          <Pressable style={styles.extraBtn} onPress={() => showAlert('Effects', 'AR effects coming soon! 🎭')}>
            <Text style={{ fontSize: 20 }}>✨</Text>
            <Text style={styles.extraLabel}>Effects</Text>
          </Pressable>
          <Pressable style={styles.extraBtn} onPress={() => showAlert('Games', 'Play a game together! 🎮')}>
            <Text style={{ fontSize: 20 }}>🎮</Text>
            <Text style={styles.extraLabel}>Games</Text>
          </Pressable>
          <Pressable style={styles.extraBtn} onPress={() => showAlert('Gift', 'Send a gift during call! 🎁')}>
            <Text style={{ fontSize: 20 }}>🎁</Text>
            <Text style={styles.extraLabel}>Gift</Text>
          </Pressable>
          <Pressable style={styles.extraBtn} onPress={() => showAlert('Screenshot', 'Screenshot saved! 📸')}>
            <Text style={{ fontSize: 20 }}>📸</Text>
            <Text style={styles.extraLabel}>Capture</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  ringingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  ringingLabel: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm, letterSpacing: 1, textTransform: 'uppercase' },
  ringingAvatarRing: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  ringingAvatar: { width: 128, height: 128, borderRadius: 64 },
  ringingName: { color: '#FFF', fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  ringingUsername: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.sm },
  ringingActions: { flexDirection: 'row', gap: 60, marginTop: Spacing.xl },
  declineBtn: { alignItems: 'center', gap: 8, width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.error, justifyContent: 'center' },
  acceptBtn: { alignItems: 'center', gap: 8, width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.success, justifyContent: 'center' },
  callBtnLabel: { color: '#FFF', fontSize: FontSize.xs, position: 'absolute', bottom: -20 },
  localVideo: { position: 'absolute', top: 100, right: 16, width: 110, height: 160, borderRadius: BorderRadius.md, overflow: 'hidden', borderWidth: 2, borderColor: Colors.primary, zIndex: 10 },
  localVideoFlipped: { top: 100, left: 16 },
  localVideoImg: { width: '100%', height: '100%' },
  camOffView: { width: '100%', height: '100%', backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  callUI: { flex: 1, justifyContent: 'space-between' },
  callTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: Spacing.md },
  callUserName: { color: '#FFF', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  callTimer: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm },
  callTopActions: { flexDirection: 'row', gap: Spacing.sm },
  topActionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  callControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xl, paddingBottom: Spacing.sm },
  controlBtn: { alignItems: 'center', gap: 6, width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  controlBtnActive: { backgroundColor: Colors.error },
  controlLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, position: 'absolute', bottom: -18 },
  endBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.error, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 10 },
  extraControls: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xl, paddingBottom: Spacing.lg },
  extraBtn: { alignItems: 'center', gap: 4 },
  extraLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
});
