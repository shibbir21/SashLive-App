// SashLive — Search & Discovery
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  FlatList, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { MOCK_USERS, MOCK_LIVE_ROOMS } from '@/services/mockData';

const { width } = Dimensions.get('window');

const TRENDING_TAGS = ['#PK_Battle', '#Dance', '#Music', '#Gaming', '#Karaoke', '#Comedy', '#Talent', '#Fitness'];
const RECENT_SEARCHES = ['Galaxy Goddess', 'Dragon Fire', 'Audio Room'];

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'users' | 'rooms'>('all');

  const filteredUsers = MOCK_USERS.filter(u =>
    u.displayName.toLowerCase().includes(query.toLowerCase()) ||
    u.username.toLowerCase().includes(query.toLowerCase())
  );

  const filteredRooms = MOCK_LIVE_ROOMS.filter(r =>
    r.title.toLowerCase().includes(query.toLowerCase()) ||
    r.hostName.toLowerCase().includes(query.toLowerCase())
  );

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Pressable onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.searchInputWrap}>
          <MaterialIcons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users, rooms, tags..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <MaterialIcons name="close" size={16} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filters (only when searching) */}
      {query.length > 0 && (
        <View style={styles.filterRow}>
          {(['all', 'users', 'rooms'] as const).map(f => (
            <Pressable key={f} style={[styles.filterChip, activeFilter === f && styles.filterChipActive]} onPress={() => setActiveFilter(f)}>
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                {f === 'all' ? 'All' : f === 'users' ? 'Users' : 'Live Rooms'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
        {query.length === 0 ? (
          <>
            {/* Recent */}
            {RECENT_SEARCHES.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>🕐 Recent</Text>
                  <Pressable><Text style={styles.clearBtn}>Clear All</Text></Pressable>
                </View>
                {RECENT_SEARCHES.map((s, i) => (
                  <Pressable key={i} style={styles.recentItem} onPress={() => setQuery(s)}>
                    <MaterialIcons name="history" size={18} color={Colors.textMuted} />
                    <Text style={styles.recentText}>{s}</Text>
                    <MaterialIcons name="north-west" size={14} color={Colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            )}

            {/* Trending Tags */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔥 Trending</Text>
              <View style={styles.tagsWrap}>
                {TRENDING_TAGS.map((tag, i) => (
                  <Pressable key={i} style={styles.tag} onPress={() => setQuery(tag.replace('#', ''))}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Suggested Users */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✨ Suggested Users</Text>
              {MOCK_USERS.slice(0, 5).map(u => (
                <Pressable key={u.id} style={styles.userRow} onPress={() => router.push(`/user/${u.id}`)}>
                  <View style={styles.userAvatarWrap}>
                    <Image source={{ uri: u.avatar }} style={styles.userAv} contentFit="cover" />
                    {u.isOnline && <View style={styles.onlineDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{u.displayName}</Text>
                    <Text style={styles.userHandle}>@{u.username} · {fmt(u.followers)} followers</Text>
                  </View>
                  {u.isLive && <View style={styles.livePill}><Text style={styles.livePillText}>LIVE</Text></View>}
                  <MaterialIcons name="chevron-right" size={18} color={Colors.textMuted} />
                </Pressable>
              ))}
            </View>

            {/* Live Now */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔴 Live Now</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
                {MOCK_LIVE_ROOMS.map(r => (
                  <Pressable key={r.id} style={styles.roomCard} onPress={() => router.push(`/live/${r.id}`)}>
                    <Image source={{ uri: r.thumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                    <View style={styles.roomOverlay}>
                      <View style={styles.roomLiveBadge}><Text style={styles.roomLiveBadgeText}>LIVE</Text></View>
                      <Text style={styles.roomHost} numberOfLines={1}>{r.hostName}</Text>
                      <Text style={styles.roomViewers}>👁 {(r.viewers / 1000).toFixed(1)}K</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </>
        ) : (
          <>
            {(activeFilter === 'all' || activeFilter === 'users') && filteredUsers.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>👥 Users ({filteredUsers.length})</Text>
                {filteredUsers.map(u => (
                  <Pressable key={u.id} style={styles.userRow} onPress={() => router.push(`/user/${u.id}`)}>
                    <View style={styles.userAvatarWrap}>
                      <Image source={{ uri: u.avatar }} style={styles.userAv} contentFit="cover" />
                      {u.isOnline && <View style={styles.onlineDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>{u.displayName}</Text>
                      <Text style={styles.userHandle}>@{u.username} · {fmt(u.followers)} followers</Text>
                    </View>
                    {u.isLive && <View style={styles.livePill}><Text style={styles.livePillText}>LIVE</Text></View>}
                    <MaterialIcons name="chevron-right" size={18} color={Colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            )}

            {(activeFilter === 'all' || activeFilter === 'rooms') && filteredRooms.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔴 Live Rooms ({filteredRooms.length})</Text>
                {filteredRooms.map(r => (
                  <Pressable key={r.id} style={styles.roomRow} onPress={() => router.push(`/live/${r.id}`)}>
                    <Image source={{ uri: r.thumbnail }} style={styles.roomRowThumb} contentFit="cover" />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.roomRowTitle} numberOfLines={1}>{r.title}</Text>
                      <Text style={styles.roomRowHost}>{r.hostName}</Text>
                      <Text style={styles.roomRowViewers}>👁 {(r.viewers / 1000).toFixed(1)}K viewers</Text>
                    </View>
                    <View style={styles.roomLivePill}><Text style={styles.roomLivePillText}>LIVE</Text></View>
                  </Pressable>
                ))}
              </View>
            )}

            {filteredUsers.length === 0 && filteredRooms.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 48 }}>🔍</Text>
                <Text style={styles.emptyTitle}>No results for "{query}"</Text>
                <Text style={styles.emptyDesc}>Try different keywords or check spelling</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.xs, borderWidth: 1, borderColor: Colors.cardBorder },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.md },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  filterTextActive: { color: '#FFF', fontWeight: FontWeight.semibold },
  section: { paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
  clearBtn: { color: Colors.primary, fontSize: FontSize.sm },
  recentItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  recentText: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: { backgroundColor: Colors.surface, borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: Colors.primary + '50' },
  tagText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  userAvatarWrap: { position: 'relative' },
  userAv: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: Colors.primary },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.bg },
  userName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  userHandle: { color: Colors.textMuted, fontSize: FontSize.xs },
  livePill: { backgroundColor: Colors.live, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  livePillText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  roomCard: { width: 140, height: 190, borderRadius: BorderRadius.lg, overflow: 'hidden', position: 'relative' },
  roomOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', padding: Spacing.sm, justifyContent: 'space-between' },
  roomLiveBadge: { backgroundColor: Colors.live, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  roomLiveBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  roomHost: { color: '#FFF', fontSize: 11, fontWeight: FontWeight.bold },
  roomViewers: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  roomRowThumb: { width: 72, height: 52, borderRadius: BorderRadius.sm },
  roomRowTitle: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  roomRowHost: { color: Colors.textSecondary, fontSize: FontSize.xs },
  roomRowViewers: { color: Colors.textMuted, fontSize: FontSize.xs },
  roomLivePill: { backgroundColor: Colors.live, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  roomLivePillText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  emptyDesc: { color: Colors.textMuted, fontSize: FontSize.sm },
});
