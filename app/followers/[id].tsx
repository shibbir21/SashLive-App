// SashLive — Followers / Following Screen with Real DB
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { MOCK_USERS } from '@/services/mockData';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/template';
import { fetchFollowers, fetchFollowing } from '@/services/followService';

export default function FollowersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { followedUsers, toggleFollow, currentUser } = useApp();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');
  const [search, setSearch] = useState('');
  const [dbFollowers, setDbFollowers] = useState<any[]>([]);
  const [dbFollowing, setDbFollowing] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const isOwnProfile = !id || id === currentUser.id || id === user?.id;

  useEffect(() => {
    if (user?.id) {
      loadRealData(user.id);
    }
  }, [user?.id, activeTab]);

  const loadRealData = async (uid: string) => {
    setLoading(true);
    if (activeTab === 'followers') {
      const { data } = await fetchFollowers(uid);
      if (data.length > 0) setDbFollowers(data);
    } else {
      const { data } = await fetchFollowing(uid);
      if (data.length > 0) setDbFollowing(data);
    }
    setLoading(false);
  };

  // Use DB data if available, fallback to mock
  const rawList = activeTab === 'followers'
    ? (dbFollowers.length > 0 ? dbFollowers : MOCK_USERS)
    : (dbFollowing.length > 0 ? dbFollowing : MOCK_USERS.slice(0, 5));

  const displayList = rawList.filter(u => {
    const name = (u.display_name || u.displayName || '').toLowerCase();
    const uname = (u.username || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || uname.includes(q);
  });

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n || 0);

  const getAvatar = (u: any) => u.avatar_url || u.avatar || '';
  const getName = (u: any) => u.display_name || u.displayName || u.username || 'User';
  const getUsername = (u: any) => u.username || '';
  const getFollowers = (u: any) => u.followers || 0;
  const getUserId = (u: any) => u.id || '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.tabGroup}>
          {(['followers', 'following'] as const).map(tab => (
            <Pressable key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'followers' ? 'Followers' : 'Following'}
              </Text>
              <View style={styles.tabCount}>
                <Text style={styles.tabCountText}>
                  {tab === 'followers' ? fmt(currentUser.followers) : fmt(currentUser.following)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
        {isOwnProfile && (
          <Pressable style={styles.searchIconBtn} onPress={() => router.push('/search')}>
            <MaterialIcons name="person-add" size={22} color={Colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <MaterialIcons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search people..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <MaterialIcons name="close" size={16} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={(item, i) => getUserId(item) || String(i)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 48 }}>{activeTab === 'followers' ? '👥' : '👤'}</Text>
              <Text style={styles.emptyTitle}>{search ? 'No results found' : `No ${activeTab} yet`}</Text>
              <Text style={styles.emptySub}>{activeTab === 'followers' ? 'Go live to grow your audience!' : 'Follow others to see them here'}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const uid = getUserId(item);
            const isF = followedUsers.includes(uid);
            const isLive = item.isLive || false;
            const vipLevel = item.vip_level || item.vipLevel || 0;
            const vipColors = ['', '#CD7F32', '#C0C0C0', '#FFCC00', '#00DFFF', '#FF2E8B'];
            return (
              <Pressable
                style={({ pressed }) => [styles.userRow, pressed && { opacity: 0.8 }]}
                onPress={() => router.push(`/user/${uid}`)}
              >
                {/* Avatar */}
                <View style={styles.avWrap}>
                  <Image source={{ uri: getAvatar(item) }} style={[styles.av, vipLevel > 0 && { borderColor: vipColors[Math.min(vipLevel, 5)] }]} contentFit="cover" />
                  {item.isOnline && <View style={styles.onlineDot} />}
                  {isLive && (
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{getName(item)}</Text>
                    {vipLevel > 0 && (
                      <View style={[styles.vipTag, { backgroundColor: vipColors[Math.min(vipLevel, 5)] + '25' }]}>
                        <Text style={[styles.vipTagText, { color: vipColors[Math.min(vipLevel, 5)] }]}>VIP{vipLevel}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.handle}>@{getUsername(item)} · {fmt(getFollowers(item))} followers</Text>
                </View>

                {/* Follow Button */}
                {uid !== user?.id && uid !== currentUser.id && (
                  <Pressable
                    style={[styles.followBtn, isF && styles.followingBtn]}
                    onPress={() => toggleFollow(uid)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.followBtnText, isF && styles.followingBtnText]}>
                      {isF ? '✓ Following' : 'Follow'}
                    </Text>
                  </Pressable>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  tabGroup: { flex: 1, flexDirection: 'row', gap: Spacing.xs },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  tabTextActive: { color: '#FFF', fontWeight: FontWeight.bold },
  tabCount: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.pill, paddingHorizontal: 6, paddingVertical: 1 },
  tabCountText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  searchIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: BorderRadius.pill, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.sm },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  loadingText: { color: Colors.textMuted, fontSize: FontSize.sm },
  list: { paddingBottom: 80 },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  avWrap: { position: 'relative' },
  av: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: Colors.primary },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.bg },
  liveBadge: { position: 'absolute', bottom: -6, left: '50%', transform: [{ translateX: -16 }], flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.live, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  liveDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF' },
  liveText: { color: '#FFF', fontSize: 7, fontWeight: FontWeight.black },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  vipTag: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  vipTagText: { fontSize: 9, fontWeight: FontWeight.black },
  handle: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  followBtn: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: BorderRadius.pill, backgroundColor: Colors.primary, minWidth: 80, alignItems: 'center' },
  followingBtn: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  followBtnText: { color: '#FFF', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  followingBtnText: { color: Colors.textSecondary },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  emptySub: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center' },
});
