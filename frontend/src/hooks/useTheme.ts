/**
 * Theme hook — light/dark mode with Palestinian-inspired palette
 */

import { useColorScheme } from 'react-native';
import { useMemo } from 'react';

export interface ThemeColors {
  background: string;
  card: string;
  primary: string;
  accent: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  error: string;
}

const LIGHT: ThemeColors = {
  background:    '#F5F3EF',   // Warm off-white (like old Jerusalem stone)
  card:          '#FFFFFF',
  primary:       '#2D6A4F',   // Deep olive green (Palestinian olive trees)
  accent:        '#E07A2F',   // Warm orange (sunset over the Levant)
  text:          '#1A1A1A',
  textSecondary: '#6B6B6B',
  border:        '#E8E4DC',
  success:       '#27AE60',
  error:         '#C0392B',
};

const DARK: ThemeColors = {
  background:    '#121212',
  card:          '#1E1E1E',
  primary:       '#4CAF82',   // Lighter green for dark bg
  accent:        '#F4A261',   // Softer orange
  text:          '#F5F3EF',
  textSecondary: '#9A9A9A',
  border:        '#2A2A2A',
  success:       '#4CAF82',
  error:         '#E74C3C',
};

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = useMemo(() => (isDark ? DARK : LIGHT), [isDark]);
  return { colors, isDark };
}
