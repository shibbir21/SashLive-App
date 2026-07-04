// SashLive Theme — Poppo Live Inspired
export const Colors = {
  // === BACKGROUNDS ===
  bg: '#0D0014',
  bgSecondary: '#130019',
  surface: '#1A0025',
  surfaceElevated: '#220030',
  card: '#1E002C',
  cardBorder: '#3A1050',

  // === BRAND (Warm Magenta / Deep Purple — Poppo style) ===
  primary: '#FF2E8B',
  primaryLight: '#FF6BAC',
  primaryDark: '#C01566',
  secondary: '#9B30FF',
  secondaryLight: '#B965FF',
  accent: '#FF8C00',

  // === ECONOMY ===
  diamond: '#00DFFF',
  diamondDark: '#0099BB',
  gold: '#FFCC00',
  goldDark: '#CC9900',
  coin: '#FF8C00',

  // === SEMANTIC ===
  success: '#00E676',
  error: '#FF4444',
  warning: '#FFA726',
  live: '#FF1744',
  accent: '#FF8C00',

  // === TEXT ===
  textPrimary: '#FFFFFF',
  textSecondary: '#C0A0D0',
  textMuted: '#7A5A8A',
  textInverse: '#0D0014',

  // === GRADIENTS ===
  gradientPrimary: ['#FF2E8B', '#9B30FF'] as string[],
  gradientGold: ['#FFCC00', '#FF8C00'] as string[],
  gradientDiamond: ['#00DFFF', '#9B30FF'] as string[],
  gradientDark: ['#1A0025', '#0D0014'] as string[],
  gradientLive: ['#FF1744', '#FF2E8B'] as string[],
  gradientPK: ['#FF2E8B', '#FF8C00'] as string[],
  gradientWarm: ['#FF6B35', '#FF2E8B'] as string[],
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
    shadowColor: '#FF2E8B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#FF2E8B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  glow: {
    shadowColor: '#FF2E8B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
  },
  goldGlow: {
    shadowColor: '#FFCC00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  diamondGlow: {
    shadowColor: '#00DFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  purpleGlow: {
    shadowColor: '#9B30FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 9,
  },
};
