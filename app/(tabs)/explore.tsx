// SashLive — Explore Screen (Poppo Live Inspired)
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, FlatList, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { MOCK_LIVE_ROOMS, MOCK_USERS } from '@/services/mockData';

const { width } = Dimensions.get('window');

type Category = 'All' | 'Live' | 'Party' | 'PK' | 'Audio' | 'Video' | 'Nearby';

const CATEGORIES: { key: Category; icon: string }[] = [
  { key: 'All',    icon: '🌐' },
  { key: 'Live',   icon: '🔴' },
  { key: 'Party',  icon: '🎉' },
  { key: 'PK',     icon: '⚔️' },
  { key: 'Audio',  icon: '🎙️' },
  { key: 'Video',  icon: '📹' },
  { key: 'Nearby', icon: '📍' },
];

const AUDIO_ROOMS = [
  { id: 'a1', title: 'Late Night Vibes 🎵', host: 'CosmicRider',   avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop', listeners: 892,  seats: 8, filled: 5, thumbnail: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=300&fit=crop' },
  { id: 'a2', title: 'Chill Lo-Fi Room 🎧',  host: 'Moonlight',    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', listeners: 1204, seats: 6, filled: 4, thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop' },
  { id: 'a3', title: 'Karaoke Night 🎤',     host: 'StarKing',     avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop', listeners: 567,  seats: 8, filled: 7, thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop' },
  { id: 'a4', title: 'Morning Mood ☀️',      host: 'RoseQueen',    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', listeners: 324,  seats: 6, filled: 2, thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=300&fit=crop' },
];

export default function ExploreScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [onlineCount, setOnlineCount] = useState(48200);

  useEffect(() => {
    const t = setInterval(() => setOnlineCount(c => c + Math.floor(Math.random() * 80 - 30)), 4000);
    return () => clearInterval(t);
  }, []);

  const filteredRooms = MOCK_LIVE_ROOMS.filter(room => {
    if (activeCategory === 'Live')  return !room.isParty && !room.isPK;
    if (activeCategory === 'Party') return room.isParty;
    if (activeCategory === 'PK')    return room.isPK;
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <Pressable style={styles.searchBtn} onPress={() => router.push('/search')}>
          <MaterialIcons name="search" size={22} color={Colors.textSecondary} />
        </Pressable>
        <View style={styles.onlinePill}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>{(onlineCount / 1000).toFixed(1)}K online</Text>
        </View>
      </View>

      {/* Category Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catContent} style={styles.catScroll}>
        {CATEGORIES.map(cat => (
          <Pressable
            key={cat.key}
            style={[styles.catChip, activeCategory === cat.key && styles.catChipActive]}
            onPress={() => setActiveCategory(cat.key)}
          >
            <Text style={styles.catEmoji}>{cat.icon}</Text>
            <Text style={[styles.catText, activeCategory === cat.key && styles.catTextActive]}>{cat.key}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Stats Banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: Colors.primary }]}>1,284</Text>
            <Text style={styles.statLabel}>Live Rooms</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: Colors.diamond }]}>{(onlineCount / 1000).toFixed(1)}K</Text>
            <Text style={styles.statLabel}>Watching</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: Colors.live }]}>312</Text>
            <Text style={styles.statLabel}>PK Battles</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: Colors.success }]}>847</Text>
            <Text style={styles.statLabel}>Audio Rooms</Text>
          </View>
        </View>

        {(activeCategory === 'All' || activeCategory === 'Audio') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🎙️ Audio Rooms</Text>
              <Pressable onPress={() => setActiveCategory('Audio')}><Text style={styles.seeAll}>See All</Text></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
              {AUDIO_ROOMS.map(room => (
                <Pressable key={room.id} style={styles.audioCard} onPress={() => router.push(`/audio-room/${room.id}`)}>
                  <Image source={{ uri: room.thumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                  <View style={styles.audioOverlay}>
                    <View style={styles.audioBadge}><MaterialIcons name="mic" size={10} color="#FFF" /><Text style={styles.audioBadgeText}>AUDIO</Text></View>
                    <View style={{ gap: 3 }}>
                      <Text style={styles.audioTitle} numberOfLines={1}>{room.title}</Text>
                      <View style={styles.audioHostRow}>
                        <Image source={{ uri: room.avatar }} style={styles.audioHostAv} contentFit="cover" />
                        <Text style={styles.audioHostName}>{room.host}</Text>
                      </View>
                      <View style={styles.audioStats}>
                        <Text style={styles.audioStat}>🎙️ {room.filled}/{room.seats}</Text>
                        <Text style={styles.audioStat}>👂 {room.listeners}</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {(activeCategory === 'All' || activeCategory === 'Live' || activeCategory === 'Party' || activeCategory === 'PK') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.livePulse} />
                <Text style={styles.sectionTitle}>
                  {activeCategory === 'PK' ? '⚔️ PK Battles' : activeCategory === 'Party' ? '🎉 Party Rooms' : '🔴 Live Now'}
                </Text>
              </View>
              <Text style={styles.countBadge}>{filteredRooms.length}</Text>
            </View>
            <View style={styles.roomGrid}>
              {filteredRooms.map(room => (
                <Pressable key={room.id} style={styles.roomCard} onPress={() => router.push(`/live/${room.id}`)}>
                  <Image source={{ uri: room.thumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                  <View style={styles.roomOverlay}>
                    <View style={styles.roomTopRow}>
                      <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveBadgeText}>LIVE</Text></View>
                      {room.isPK && <View style={[styles.liveBadge, { backgroundColor: Colors.live }]}><Text style={styles.liveBadgeText}>⚔️PK</Text></View>}
                      {room.isParty && <View style={[styles.liveBadge, { backgroundColor: Colors.secondary }]}><Text style={styles.liveBadgeText}>🎉</Text></View>}
                    </View>
                    <View style={styles.roomBottomRow}>
                      <Image source={{ uri: room.hostAvatar }} style={styles.roomHostAv} contentFit="cover" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.roomHostName} numberOfLines={1}>{room.hostName}</Text>
                        <Text style={styles.roomViewers}>👁 {(room.viewers / 1000).toFixed(1)}K</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {(activeCategory === 'All' || activeCategory === 'Video') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📹 Video Calls</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
              {MOCK_USERS.filter(u => u.isOnline).map(user => (
                <Pressable key={user.id} style={styles.vcCard} onPress={() => router.push(`/video-call/${user.id}`)}>
                  <Image source={{ uri: user.avatar }} style={styles.vcAvatar} contentFit="cover" />
                  <View style={styles.vcOnline} />
                  <Text style={styles.vcName} numberOfLines={1}>{user.displayName.split(' ')[0]}</Text>
                  <View style={styles.vcBtns}>
                    <View style={styles.vcBtn}><MaterialIcons name="videocam" size={14} color="#FFF" /></View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {(activeCategory === 'All' || activeCategory === 'Nearby') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✨ Browse Creators</Text>
            {MOCK_USERS.slice(0, 6).map(user => (
              <Pressable key={user.id} style={styles.creatorRow} onPress={() => router.push(`/user/${user.id}`)}>
                <View style={styles.creatorAvatarWrap}>
                  <Image source={{ uri: user.avatar }} style={styles.creatorAvatar} contentFit="cover" />
                  {user.isOnline && <View style={styles.creatorOnline} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.creatorName}>{user.displayName}</Text>
                  <Text style={styles.creatorHandle}>@{user.username} · {(user.followers / 1000).toFixed(1)}K followers</Text>
                </View>
                {user.isLive && <View style={styles.livePill}><Text style={styles.livePillText}>LIVE</Text></View>}
                <Pressable style={styles.followBtn} onPress={() => {}}>
                  <Text style={styles.followBtnText}>+ Follow</Text>
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 4, gap: Spacing.sm },
  title: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  searchBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  onlinePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.surface, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: Colors.cardBorder },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  onlineText: { color: Colors.success, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  catScroll: { maxHeight: 52, marginBottom: Spacing.xs },
  catContent: { paddingHorizontal: Spacing.md, gap: Spacing.sm, alignItems: 'center', paddingVertical: 6 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catEmoji: { fontSize: 13 },
  catText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  catTextActive: { color: '#FFF', fontWeight: FontWeight.semibold },
  content: { padding: Spacing.md, paddingTop: 0, paddingBottom: Spacing.xxl },
  statsBanner: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.cardBorder },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  statLabel: { color: Colors.textMuted, fontSize: 10 },
  statDiv: { width: 1, backgroundColor: Colors.cardBorder, marginVertical: 4 },
  section: { marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.live },
  countBadge: { color: Colors.textMuted, fontSize: FontSize.sm },
  seeAll: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  audioCard: { width: width * 0.7, height: 170, borderRadius: BorderRadius.lg, overflow: 'hidden', position: 'relative' },
  audioOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', padding: Spacing.md, justifyContent: 'space-between' },
  audioBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.secondary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  audioBadgeText: { color: '#FFF', fontSize: 10, fontWeight: FontWeight.bold },
  audioTitle: { color: '#FFF', fontSize: FontSize.md, fontWeight: FontWeight.bold },
  audioHostRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  audioHostAv: { width: 20, height: 20, borderRadius: 10 },
  audioHostName: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.xs },
  audioStats: { flexDirection: 'row', gap: Spacing.md },
  audioStat: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs },
  roomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  roomCard: { width: (width - Spacing.md * 2 - Spacing.sm) / 2, height: 200, borderRadius: BorderRadius.lg, overflow: 'hidden', position: 'relative', backgroundColor: Colors.surface },
  roomOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.38)', padding: Spacing.sm, justifyContent: 'space-between' },
  roomTopRow: { flexDirection: 'row', gap: 4 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.live, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFF' },
  liveBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  roomBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  roomHostAv: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary },
  roomHostName: { color: '#FFF', fontSize: 10, fontWeight: FontWeight.bold },
  roomViewers: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  vcCard: { width: 86, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.sm, alignItems: 'center', gap: 5, borderWidth: 1, borderColor: Colors.cardBorder, position: 'relative' },
  vcAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: Colors.primary },
  vcOnline: { position: 'absolute', top: 12, right: 12, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.surface },
  vcName: { color: Colors.textSecondary, fontSize: 11, fontWeight: FontWeight.medium },
  vcBtns: { flexDirection: 'row', gap: Spacing.xs },
  vcBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  creatorRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  creatorAvatarWrap: { position: 'relative' },
  creatorAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: Colors.primary },
  creatorOnline: { position: 'absolute', bottom: 2, right: 2, width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.bg },
  creatorName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  creatorHandle: { color: Colors.textMuted, fontSize: FontSize.xs },
  livePill: { backgroundColor: Colors.live, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  livePillText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  followBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.primary },
  followBtnText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
});
