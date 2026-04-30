// Powered by OnSpace.AI
import React from 'react';
import { Text, TextStyle } from 'react-native';
import { Colors } from '@/constants/theme';

interface GradientTextProps {
  children: string;
  style?: TextStyle;
}

// Simulated gradient text using primary color
export function GradientText({ children, style }: GradientTextProps) {
  return (
    <Text style={[{ color: Colors.primary, fontWeight: '700' }, style]}>
      {children}
    </Text>
  );
}
