// SashLive Theme — PoppoLive Inspired (Light White Theme with Brand Colors)
export const Colors = {
  // === BACKGROUNDS (Light theme like PoppoLive) ===
  bg: '#F9FAFB',
  bgSecondary: '#F3F4F6',
  surface: '#FFFFFF',
  surfaceElevated: '#F9FAFB',
  card: '#FFFFFF',
  cardBorder: '#E5E7EB',

  // === BRAND ===
  primary: '#FF2E8B',
  primaryLight: '#FF6BAC',
  primaryDark: '#C01566',
  secondary: '#7C3AED',
  secondaryLight: '#A78BFA',
  accent: '#FF8C00',

  // === ECONOMY ===
  diamond: '#0099CC',
  diamondDark: '#007299',
  gold: '#D97706',
  goldDark: '#B45309',
  coin: '#FF8C00',

  // === SEMANTIC ===
  success: '#059669',
  error: '#EF4444',
  warning: '#F59E0B',
  live: '#EF4444',
  accent: '#FF8C00',

  // === TEXT ===
  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  // === GRADIENTS ===
  gradientPrimary: ['#FF2E8B', '#7C3AED'] as string[],
  gradientGold: ['#F59E0B', '#D97706'] as string[],
  gradientDiamond: ['#0099CC', '#7C3AED'] as string[],
  gradientDark: ['#1F2937', '#111827'] as string[],
  gradientLive: ['#EF4444', '#FF2E8B'] as string[],
  gradientPK: ['#FF2E8B', '#FF8C00'] as string[],
  gradientWarm: ['#F97316', '#FF2E8B'] as string[],
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 36,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  glow: {
    shadowColor: '#FF2E8B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  goldGlow: {
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  diamondGlow: {
    shadowColor: '#0099CC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  purpleGlow: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
};
