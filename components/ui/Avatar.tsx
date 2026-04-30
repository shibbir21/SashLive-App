// Powered by OnSpace.AI
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Colors, BorderRadius } from '@/constants/theme';

interface AvatarProps {
  uri: string;
  size?: number;
  isLive?: boolean;
  isOnline?: boolean;
  vipLevel?: number;
  style?: ViewStyle;
}

const VIP_COLORS: Record<number, string> = {
  1: '#CD7F32',
  2: '#C0C0C0',
  3: '#FFD700',
  4: '#00D4FF',
  5: '#E91E8C',
};

export function Avatar({ uri, size = 44, isLive, isOnline, vipLevel, style }: AvatarProps) {
  const borderColor = vipLevel ? VIP_COLORS[vipLevel] : Colors.cardBorder;

  return (
    <View style={[styles.container, style]}>
      <View style={[
        styles.ring,
        {
          width: size + 4,
          height: size + 4,
          borderRadius: (size + 4) / 2,
          borderColor,
          borderWidth: vipLevel ? 2 : 1,
        }
      ]}>
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
          transition={200}
        />
      </View>
      {isLive ? (
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
        </View>
      ) : isOnline ? (
        <View style={styles.onlineDot} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadge: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    transform: [{ translateX: -12 }],
    backgroundColor: Colors.live,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.bg,
  },
});
