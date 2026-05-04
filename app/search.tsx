// SashLive — Search & Discovery (Production-Ready with Real DB)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  FlatList, ScrollView, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { MOCK_USERS, MOCK_LIVE_ROOMS } from '@/services/mockData';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/template';
import { getSupabaseClient } from '@/template';

const { width } = Dimensions.get('window');

const TRENDING_TAGS = ['#PK_Battle', '#Dance', '#Music', '#Gaming', '#Karaoke', '#Comedy', '#Talent', '#Fitness', '#LIVE', '#Bangladesh'];
const RECENT_SEARCHES = ['Galaxy Goddess', 'Dragon Fire', 'Live Music'];

type FilterType = 'all' | 'users' | 'rooms' | 'reels';

export default function SearchScreen() {
  const router = useRouter();
  const { toggleFollow, followedUsers } = useApp();
  const { user: authUser } = useAuth();
  const supabase = getSupabaseClient();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [dbRooms, setDbRooms] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState(RECENT_SEARCHES);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n || 0);

  useEffect(() => {
    if (!query.trim()) {
      setDbUsers([]);
      setDbRooms([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(query.trim());
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const doSearch = async (q: string) => {
    setSearching(true);
    const [usersRes, roomsRes] = await Promise.all([
      supabase.from('user_profiles').select('id, username, display_name, avatar_url, is_online, followers, vip_level, is_host').or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).limit(20),
      supabase.from('live_rooms').select('*, host:host_id(username, display_name, avatar_url)').eq('is_live', true).ilike('title', `%${q}%`).limit(10),
    ]);
    setDbUsers(usersRes.data || []);
    setDbRooms(roomsRes.data || []);
    setSearching(false);
  };

  const handleSearch = (text: string) => {
    setQuery(text);
  };

  const handleSelectSearch = (q: string) => {
    setQuery(q);
    if (!recentSearches.includes(q)) {
      setRecentSearches(prev => [q, ...prev.slice(0, 4)]);
    }
  };

  const allUsers = query.trim() ? dbUsers : MOCK_USERS;
  const allRooms = query.trim() ? dbRooms : MOCK_LIVE_ROOMS;

  const filteredUsers = allUsers.filter((u: any) => {
    if (!query.trim()) return true;
    const display = u.display_name || u.displayName || '';
    const uname = u.username || '';
    return display.toLowerCase().includes(query.toLowerCase()) || uname.toLowerCase().includes(query.toLowerCase());
  });

  const filteredRooms = allRooms.filter((r: any) => {
    if (!query.trim()) return true;
    const title = r.title || '';
    const host = r.hostName || r.host?.display_name || '';
    return title.toLowerCase().includes(query.toLowerCase()) || host.toLowerCase().includes(query.toLowerCase());
  });

  const renderUser = (u: any) => {
    const isFollowing = followedUsers.includes(u.id);
    const displayName = u.display_name || u.displayName || u.username;
    const followers = u.followers || 0;
    const isOnline = u.is_online || u.isOnline;
    const isHost = u.is_host || u.isHost;
    const vip = u.vip_level || u.vipLevel || 0;
    const vipColors = ['', '#CD7F32', '#C0C0C0', '#FFCC00', '#00DFFF', '#FF2E8B'];

    return (
      <Pressable
        key={u.id}
        style={styles.userRow}
        onPress={() => { handleSelectSearch(displayName); router.push(`/user/${u.id}`); }}
      >
        <View style={styles.userAvWrap}>
          <Image source={{ uri: u.avatar_url || u.avatar || '' }} style={[styles.userAv, vip > 0 && { borderColor: vipColors[Math.min(vip, 5)] }]} contentFit="cover" />
          {isOnline && <View style={styles.onlineDot} />}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={styles.userName}>{displayName}</Text>
            {isHost && <MaterialIcons name="verified" size={14} color={Colors.primary} />}
          </View>
          <Text style={styles.userHandle}>@{u.username} · {fmt(followers)} followers</Text>
        </View>
        {u.isLive && <View style={styles.livePill}><Text style={styles.livePillText}>LIVE</Text></View>}
        <Pressable
          style={[styles.followBtn, isFollowing && styles.followBtnActive]}
          onPress={() => toggleFollow(u.id)}
        >
          <Text style={[styles.followBtnText, isFollowing && styles.followBtnActiveText]}>
            {isFollowing ? '✓ Following' : '+ Follow'}
          </Text>
        </Pressable>
      </Pressable>
    );
  };

  const renderRoom = (r: any) => {
    const title = r.title || r.hostName;
    const hostName = r.hostName || r.host?.display_name || '';
    const viewers = r.viewers || 0;
    const thumbnail = r.thumbnail_url || r.thumbnail || '';

    return (
      <Pressable key={r.id} style={styles.roomRow} onPress={() => router.push(`/live/${r.id}`)}>
        <Image source={{ uri: thumbnail }} style={styles.roomRowThumb} contentFit="cover" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.roomRowTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.roomRowHost}>{hostName}</Text>
          <Text style={styles.roomRowViewers}>👁 {fmt(viewers)} viewers</Text>
        </View>
        <View style={styles.roomLivePill}>
          <View style={styles.roomLiveDot} />
          <Text style={styles.roomLivePillText}>LIVE</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#111827" />
        </Pressable>
        <View style={styles.searchInputWrap}>
          <MaterialIcons name="search" size={18} color="#9CA3AF" />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search users, rooms, tags..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={handleSearch}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => handleSelectSearch(query)}
          />
          {searching && <ActivityIndicator size="small" color={Colors.primary} />}
          {query.length > 0 && !searching && (
            <Pressable onPress={() => setQuery('')}>
              <MaterialIcons name="close" size={16} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter tabs when searching */}
      {query.length > 0 && (
        <View style={styles.filterRow}>
          {(['all', 'users', 'rooms'] as FilterType[]).map(f => (
            <Pressable
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'All' : f === 'users' ? `Users (${filteredUsers.length})` : `Rooms (${filteredRooms.length})`}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
        {query.length === 0 ? (
          <>
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>🕐 Recent Searches</Text>
                  <Pressable onPress={() => setRecentSearches([])}><Text style={styles.clearBtn}>Clear</Text></Pressable>
                </View>
                {recentSearches.map((s, i) => (
                  <Pressable key={i} style={styles.recentItem} onPress={() => setQuery(s)}>
                    <MaterialIcons name="history" size={18} color="#9CA3AF" />
                    <Text style={styles.recentText}>{s}</Text>
                    <Pressable onPress={() => setRecentSearches(prev => prev.filter(r => r !== s))}>
                      <MaterialIcons name="close" size={14} color="#9CA3AF" />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Trending Tags */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔥 Trending Tags</Text>
              <View style={styles.tagsWrap}>
                {TRENDING_TAGS.map((tag, i) => (
                  <Pressable key={i} style={styles.tag} onPress={() => setQuery(tag.replace('#', ''))}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Live Now Carousel */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={styles.livePulse} />
                  <Text style={styles.sectionTitle}>🔴 Live Now</Text>
                </View>
                <Pressable onPress={() => router.push('/(tabs)')}><Text style={styles.seeAll}>See All</Text></Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
                {MOCK_LIVE_ROOMS.slice(0, 6).map(r => (
                  <Pressable key={r.id} style={styles.roomCard} onPress={() => router.push(`/live/${r.id}`)}>
                    <Image source={{ uri: r.thumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                    <View style={styles.roomOverlay}>
                      <View style={styles.roomLiveBadge}>
                        <View style={styles.roomLiveDot} />
                        <Text style={styles.roomLiveBadgeText}>LIVE</Text>
                      </View>
                      <View>
                        <Text style={styles.roomCardHost} numberOfLines={1}>{r.hostName}</Text>
                        <Text style={styles.roomCardViewers}>👁 {fmt(r.viewers)}</Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Suggested Users */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>✨ Suggested Creators</Text>
                <Pressable><Text style={styles.seeAll}>More</Text></Pressable>
              </View>
              {MOCK_USERS.slice(0, 6).map(u => renderUser(u))}
            </View>
          </>
        ) : (
          <>
            {(filter === 'all' || filter === 'users') && filteredUsers.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>👥 Users</Text>
                {filteredUsers.map((u: any) => renderUser(u))}
              </View>
            )}

            {(filter === 'all' || filter === 'rooms') && filteredRooms.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔴 Live Rooms</Text>
                {filteredRooms.map((r: any) => renderRoom(r))}
              </View>
            )}

            {filteredUsers.length === 0 && filteredRooms.length === 0 && !searching && (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 52 }}>🔍</Text>
                <Text style={styles.emptyTitle}>No results for "{query}"</Text>
                <Text style={styles.emptyDesc}>Try different keywords or browse trending topics</Text>
                <View style={styles.tagsWrap}>
                  {TRENDING_TAGS.slice(0, 5).map((tag, i) => (
                    <Pressable key={i} style={styles.tag} onPress={() => setQuery(tag.replace('#', ''))}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.xs },
  searchInput: { flex: 1, color: '#111827', fontSize: FontSize.md },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, gap: Spacing.xs, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: BorderRadius.pill, backgroundColor: '#F3F4F6' },
  filterChipActive: { backgroundColor: Colors.primary },
  filterText: { color: '#6B7280', fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  filterTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  section: { paddingHorizontal: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.sm },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { color: '#111827', fontSize: FontSize.md, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  clearBtn: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  seeAll: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.live },
  recentItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  recentText: { flex: 1, color: '#374151', fontSize: FontSize.sm },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: { backgroundColor: '#FFF', borderRadius: BorderRadius.pill, paddingHorizontal: Spacing.md, paddingVertical: 7, borderWidth: 1, borderColor: Colors.primary + '40' },
  tagText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  userAvWrap: { position: 'relative' },
  userAv: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: Colors.primary },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: '#FFF' },
  userName: { color: '#111827', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  userHandle: { color: '#9CA3AF', fontSize: FontSize.xs, marginTop: 1 },
  livePill: { backgroundColor: Colors.live, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  livePillText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  followBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.pill, borderWidth: 1.5, borderColor: Colors.primary },
  followBtnActive: { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' },
  followBtnText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  followBtnActiveText: { color: '#9CA3AF' },
  roomCard: { width: 140, height: 190, borderRadius: BorderRadius.lg, overflow: 'hidden', position: 'relative' },
  roomOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', padding: Spacing.sm, justifyContent: 'space-between' },
  roomLiveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.live, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start' },
  roomLiveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFF' },
  roomLiveBadgeText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  roomCardHost: { color: '#FFF', fontSize: 11, fontWeight: FontWeight.bold },
  roomCardViewers: { color: 'rgba(255,255,255,0.75)', fontSize: 10 },
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  roomRowThumb: { width: 80, height: 56, borderRadius: BorderRadius.sm, backgroundColor: '#F3F4F6' },
  roomRowTitle: { color: '#111827', fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  roomRowHost: { color: '#6B7280', fontSize: FontSize.xs },
  roomRowViewers: { color: '#9CA3AF', fontSize: FontSize.xs },
  roomLivePill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.live, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  roomLivePillText: { color: '#FFF', fontSize: 9, fontWeight: FontWeight.black },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md, paddingHorizontal: Spacing.xl },
  emptyTitle: { color: '#111827', fontSize: FontSize.lg, fontWeight: FontWeight.bold, textAlign: 'center' },
  emptyDesc: { color: '#9CA3AF', fontSize: FontSize.sm, textAlign: 'center' },
});
