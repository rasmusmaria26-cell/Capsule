/**
 * Chowa StyleBot — Design Tokens
 * Rules: 0px radius, Manrope font, warm neutrals, no divider lines
 */

export const Colors = {
  // Warm neutrals
  bg: '#F5F2EE',           // page background — warm off-white
  surface: '#EDEBE6',      // card surface
  surfaceElevated: '#FFFFFF',

  // Text hierarchy
  textPrimary: '#1C1A17',
  textSecondary: '#6B6560',
  textTertiary: '#A39D97',
  textInverse: '#FFFFFF',

  // Brand
  accent: '#C4956A',       // warm caramel — primary CTA
  accentDark: '#A07046',
  accentLight: '#F0DEC8',

  // Semantic
  success: '#4A7C59',
  warning: '#C4963A',
  error: '#B84040',

  // Score bands (OKLCH-informed)
  score90: '#4A7C59',      // 90+ — excellent harmony
  score75: '#7A9B5C',      // 75–89 — good
  score60: '#C4963A',      // 60–74 — okay
  scoreLow: '#B84040',     // <60 — clash detected

  // OKLCH swatch backgrounds
  swatchBorder: '#D4CEC8',
};

export const Typography = {
  fontFamily: 'Manrope',
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 30,
    '3xl': 38,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
};

export const Radius = {
  none: 0,     // Primary rule — 0px radius
  sm: 2,       // Only for small badges/chips
  pill: 999,   // Score badges only
};

export const Shadow = {
  card: {
    shadowColor: '#1C1A17',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  modal: {
    shadowColor: '#1C1A17',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const Layout = {
  screenPadding: Spacing.base,
  maxContentWidth: 420,
};
