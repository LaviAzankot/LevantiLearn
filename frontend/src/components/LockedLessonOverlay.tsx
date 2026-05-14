/**
 * LockedLessonOverlay — semi-transparent overlay on locked lesson cards.
 * Tap → show paywall. Free users still see the lesson in the catalog.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

const C = {
  light: { overlay: 'rgba(255,255,255,0.55)', text: '#2e2f2d' },
  dark:  { overlay: 'rgba(0,0,0,0.55)',       text: '#f0ede8' },
};

interface Props {
  onPress: () => void;
}

export function LockedLessonOverlay({ onPress }: Props) {
  const scheme = useColorScheme();
  const c      = C[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <TouchableOpacity
      style={[StyleSheet.absoluteFill, s.overlay, { backgroundColor: c.overlay }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={s.badge}>
        <Ionicons name="lock-closed" size={16} color="#fff" />
        <Text style={s.badgeText}>Go Premium</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  overlay: { alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  badge:   { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#fe4d01', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 50, shadowColor: '#000', shadowOpacity: 0.18, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 6 },
  badgeText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
