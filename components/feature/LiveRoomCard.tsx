// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Colors, FontSize, BorderRadius, Spacing, FontWeight } from '@/constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.md * 3) / 2;

interface LiveRoom {
  id: string;
  hostName: string;
  hostAvatar: string;
  title: string;
  thumbnail: string;
  viewers: number;
  duration: string;
  type: string;
  isParty: boolean;
  isPK: boolean;
  pkOpponent?: string;
  pkScoreHost?: number;
  pkScoreOpponent?: number;
  category: string;
  gifts: number;
}

interface LiveRoomCardProps {
  room: LiveRoom;
}

export function LiveRoomCard({ room }: LiveRoomCardProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/live/${room.id}`);
  };

  const formatViewers = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
      onPress={handlePress}
    >
      <View style={styles.thumbnailContainer}>
        <Image
          source={{ uri: room.thumbnail }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.overlay} />

        {/* Live badge */}
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>

        {/* Viewers */}
        <View style={styles.viewerBadge}>
          <Text style={styles.viewerText}>👁 {formatViewers(room.viewers)}</Text>
        </View>

        {/* Type badge */}
        {room.isPK ? (
          <View style={[styles.typeBadge, { backgroundColor: Colors.live }]}>
            <Text style={styles.typeBadgeText}>⚔️ PK</Text>
          </View>
        ) : room.isParty ? (
          <View style={[styles.typeBadge, { backgroundColor: Colors.secondary }]}>
            <Text style={styles.typeBadgeText}>🎉 PARTY</Text>
          </View>
        ) : null}

        {/* Private badge */}
        {room.type === 'private' ? (
          <View style={styles.privateBadge}>
            <Text style={styles.privateBadgeText}>🔒</Text>
          </View>
        ) : null}

        {/* PK scores */}
        {room.isPK && room.pkScoreHost ? (
          <View style={styles.pkBar}>
            <Text style={styles.pkScore}>{(room.pkScoreHost / 1000).toFixed(0)}K</Text>
            <Text style={styles.pkVs}>VS</Text>
            <Text style={styles.pkScore}>{room.pkScoreOpponent ? (room.pkScoreOpponent / 1000).toFixed(0) : 0}K</Text>
          </View>
        ) : null}

        {/* Host info at bottom */}
        <View style={styles.hostInfo}>
          <Image
            source={{ uri: room.hostAvatar }}
            style={styles.hostAvatar}
            contentFit="cover"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.hostName} numberOfLines={1}>{room.hostName}</Text>
            <Text style={styles.roomTitle} numberOfLines={1}>{room.title}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginBottom: Spacing.md,
  },
  thumbnailContainer: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    height: CARD_WIDTH * 1.4,
    backgroundColor: Colors.surface,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.live,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFF',
  },
  liveText: {
    color: '#FFF',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  viewerBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  viewerText: {
    color: '#FFF',
    fontSize: FontSize.xs,
  },
  typeBadge: {
    position: 'absolute',
    top: 36,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  privateBadge: {
    position: 'absolute',
    top: 36,
    right: 8,
  },
  privateBadgeText: {
    fontSize: 14,
  },
  pkBar: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 4,
  },
  pkScore: {
    color: Colors.gold,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  pkVs: {
    color: Colors.live,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.black,
  },
  hostInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  hostAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  hostName: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: FontWeight.semibold,
  },
  roomTitle: {
    color: Colors.textSecondary,
    fontSize: 10,
  },
});
