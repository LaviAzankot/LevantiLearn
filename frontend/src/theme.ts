/** LevantiLearn Design System — Babbel-inspired */

export const THEME = {
  light: {
    // Backgrounds
    background:  '#f6f4ef',   // Babbel warm cream
    card:        '#FFFFFF',
    cardAlt:     '#FFF3E0',

    // Brand
    primary:     '#fe4d01',   // Babbel orange
    primaryDark: '#d93e00',

    // Typography hierarchy
    label:       '#68665f',   // mini labels, sub text
    blue:        '#3B82F6',
    blueDark:    '#2563EB',
    green:       '#4CAF50',   // success
    greenDark:   '#388E3C',
    purple:      '#8B5CF6',

    // Text
    text:        '#151515',
    textSub:     '#68665f',
    textMuted:   '#9CA3AF',

    // UI
    border:      '#E5E7EB',
    wrong:       '#EF4444',
    right:       '#4CAF50',

    shadowColor: '#000',
  },
  dark: {
    background:  '#111827',
    card:        '#1F2937',
    cardAlt:     '#2D2416',

    primary:     '#FF8C42',
    primaryDark: '#FF6B00',
    blue:        '#60A5FA',
    blueDark:    '#3B82F6',
    green:       '#66BB6A',
    greenDark:   '#4CAF50',
    purple:      '#A78BFA',

    text:        '#F9FAFB',
    textSub:     '#9CA3AF',
    textMuted:   '#6B7280',

    border:      '#374151',
    wrong:       '#F87171',
    right:       '#66BB6A',

    shadowColor: '#000',
  },
};

// Warm gradient backgrounds for topic cards
export const CARD_GRADIENTS = [
  ['#FFE8CC', '#FFD699'],
  ['#FFDDB3', '#FFCC80'],
  ['#FFE0B2', '#FFCA80'],
  ['#FFF3CD', '#FFE082'],
  ['#FFE0CC', '#FFBA8C'],
  ['#FFDDD6', '#FFB3A0'],
  ['#E8F5E9', '#A5D6A7'],
  ['#E3F2FD', '#90CAF9'],
  ['#F3E5F5', '#CE93D8'],
  ['#E0F2F1', '#80CBC4'],
];

export type Theme = typeof THEME.light;
