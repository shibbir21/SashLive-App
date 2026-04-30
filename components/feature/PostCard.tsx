// Powered by OnSpace.AI
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Colors, FontSize, Spacing, BorderRadius, FontWeight } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';
import { useApp } from '@/contexts/AppContext';

interface Post {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  image: string;
  caption: string;
  likes: number;
  comments: number;
  timeAgo: string;
  isFollowing: boolean;
}

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { followedUsers, toggleFollow } = useApp();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes);
  const isFollowing = followedUsers.includes(post.userId);

  const handleLike = () => {
    setLiked(prev => {
      setLikes(l => l + (prev ? -1 : 1));
      return !prev;
    });
  };

  const formatNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Avatar uri={post.avatar} size={40} />
        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <Text style={styles.username}>{post.username}</Text>
          <Text style={styles.timeAgo}>{post.timeAgo} ago</Text>
        </View>
        <Pressable
          style={[styles.followBtn, isFollowing && styles.followingBtn]}
          onPress={() => toggleFollow(post.userId)}
        >
          <Text style={[styles.followText, isFollowing && styles.followingText]}>
            {isFollowing ? 'Following' : '+ Follow'}
          </Text>
        </Pressable>
      </View>

      {/* Image */}
      <Image
        source={{ uri: post.image }}
        style={styles.postImage}
        contentFit="cover"
        transition={200}
      />

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={handleLike}>
          <Text style={[styles.actionIcon, liked && { color: Colors.primary }]}>
            {liked ? '❤️' : '🤍'}
          </Text>
          <Text style={[styles.actionText, liked && { color: Colors.primary }]}>
            {formatNum(likes)}
          </Text>
        </Pressable>
        <Pressable style={styles.action}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionText}>{formatNum(post.comments)}</Text>
        </Pressable>
        <Pressable style={styles.action}>
          <Text style={styles.actionIcon}>🎁</Text>
          <Text style={styles.actionText}>Gift</Text>
        </Pressable>
        <Pressable style={[styles.action, { marginLeft: 'auto' }]}>
          <Text style={styles.actionIcon}>↗️</Text>
          <Text style={styles.actionText}>Share</Text>
        </Pressable>
      </View>

      {/* Caption */}
      <View style={styles.captionContainer}>
        <Text style={styles.captionUser}>{post.username} </Text>
        <Text style={styles.caption}>{post.caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  username: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  timeAgo: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
  followBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  followingBtn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  followText: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  followingText: {
    color: Colors.textPrimary,
  },
  postImage: {
    width: '100%',
    height: 320,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  captionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  captionUser: {
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  caption: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
});
