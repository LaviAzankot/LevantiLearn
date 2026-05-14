/**
 * HeartsBar — shows ❤️ × N in the lesson/home header.
 * Hidden for premium users. Shows countdown when hearts < MAX.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { MAX_HEARTS } from '../constants/subscriptions';

const C = {
  light: { text: '#2e2f2d', label: '#5b5c59', heartFull: '#fe4d01', heartEmpty: '#e3e3de', bg: '#fff0eb', border: '#ffd0ba' },
  dark:  { text: '#f0ede8', label: '#9a9690', heartFull: '#ff6b2b', heartEmpty: '#3a3830', bg: '#2e1a10', border: '#5a2e18' },
};

interface Props {
  hearts:      number;
  nextHeartAt: Date | null;
  isPremium:   boolean;
}

function formatCountdown(target: Date): string {
  const diff = Math.max(0, target.getTime() - Date.now());
  const h    = Math.floor(diff / 3_600_000);
  const m    = Math.floor((diff % 3_600_000) / 60_000);
  const s    = Math.floor((diff % 60_000) / 1_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
}

export function HeartsBar({ hearts, nextHeartAt, isPremium }: Props) {
  const scheme = useColorScheme();
  const c      = C[scheme === 'dark' ? 'dark' : 'light'];
  const [tick, setTick] = useState(0);

  // Tick every second to update countdown
  useEffect(() => {
    if (!nextHeartAt) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [nextHeartAt]);

  if (isPremium) return null;

  return (
    <View style={[s.container, { backgroundColor: c.bg, borderColor: c.border }]}>
      {/* Heart icons */}
      <View style={s.heartsRow}>
        {Array.from({ length: MAX_HEARTS }).map((_, i) => (
          <Ionicons
            key={i}
            name={i < hearts ? 'heart' : 'heart-outline'}
            size={16}
            color={i < hearts ? c.heartFull : c.heartEmpty}
          />
        ))}
      </View>

      {/* Countdown */}
      {nextHeartAt && hearts < MAX_HEARTS && (
        <Text style={[s.countdown, { color: c.label }]}>
          +1 in {formatCountdown(nextHeartAt)}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 50, borderWidth: 1.5 },
  heartsRow:  { flexDirection: 'row', gap: 3 },
  countdown:  { fontSize: 11, fontWeight: '600' },
});
