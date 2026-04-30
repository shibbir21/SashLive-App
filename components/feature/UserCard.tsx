// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';
import { useApp } from '@/contexts/AppContext';

interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  isOnline: boolean;
  isLive: boolean;
  followers: number;
  vipLevel: number;
}

interface UserCardProps {
  user: User;
  onMessage?: () => void;
}

const VIP_BADGES = ['', '🥉', '🥈', '🥇', '💎', '👑'];

export function UserCard({ user, onMessage }: UserCardProps) {
  const { followedUsers, toggleFollow } = useApp();
  const router = useRouter();
  const isFollowing = followedUsers.includes(user.id);

  const formatFollowers = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

  return (
    <View style={styles.card}>
      <Pressable onPress={() => user.isLive && router.push(`/live/room001`)}>
        <Avatar
          uri={user.avatar}
          size={54}
          isLive={user.isLive}
          isOnline={user.isOnline}
          vipLevel={user.vipLevel}
        />
      </Pressable>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.displayName}>{user.displayName}</Text>
          {user.vipLevel > 0 ? (
            <Text style={{ fontSize: 14 }}>{VIP_BADGES[user.vipLevel]}</Text>
          ) : null}
        </View>
        <Text style={styles.username}>@{user.username}</Text>
        <Text style={styles.followers}>{formatFollowers(user.followers)} followers</Text>
      </View>

      <View style={styles.actions}>
        {user.isLive ? (
          <Pressable
            style={styles.liveBtn}
            onPress={() => router.push(`/live/room001`)}
          >
            <Text style={styles.liveBtnText}>LIVE</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.followBtn, isFollowing && styles.followingBtn]}
          onPress={() => toggleFollow(user.id)}
        >
          <Text style={[styles.followText, isFollowing && { color: '#FFF' }]}>
            {isFollowing ? '✓' : '+'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: Spacing.sm,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  displayName: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  username: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
  followers: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  liveBtn: {
    backgroundColor: Colors.live,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  liveBtnText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  followBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingBtn: {
    backgroundColor: Colors.primary,
  },
  followText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
