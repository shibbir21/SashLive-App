// Powered by OnSpace.AI
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, BorderRadius, Spacing } from '@/constants/theme';

interface DiamondBadgeProps {
  amount: number;
  type?: 'diamond' | 'coin' | 'gold';
  size?: 'sm' | 'md' | 'lg';
}

export function DiamondBadge({ amount, type = 'diamond', size = 'md' }: DiamondBadgeProps) {
  const config = {
    diamond: { icon: '💎', color: Colors.diamond, bg: 'rgba(0,212,255,0.15)' },
    coin: { icon: '🪙', color: Colors.coin, bg: 'rgba(255,140,0,0.15)' },
    gold: { icon: '⭐', color: Colors.gold, bg: 'rgba(255,215,0,0.15)' },
  }[type];

  const textSize = size === 'sm' ? FontSize.xs : size === 'lg' ? FontSize.md : FontSize.sm;

  return (
    <View style={[styles.container, { backgroundColor: config.bg }]}>
      <Text style={{ fontSize: size === 'sm' ? 10 : 14 }}>{config.icon}</Text>
      <Text style={[styles.text, { color: config.color, fontSize: textSize }]}>
        {amount >= 1000 ? `${(amount / 1000).toFixed(1)}K` : amount.toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.pill,
  },
  text: {
    fontWeight: '600',
  },
});
