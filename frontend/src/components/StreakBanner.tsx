import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface Props {
  streak: number;
  xp: number;
  dailyGoalPct: number;
}

export function StreakBanner({ streak, xp, dailyGoalPct }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Streak */}
      <View style={styles.stat}>
        <Text style={styles.statIcon}>🔥</Text>
        <Text style={[styles.statValue, { color: colors.text }]}>{streak}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Day Streak</Text>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Daily goal progress */}
      <View style={styles.goalWrap}>
        <View style={styles.goalHeader}>
          <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>Daily Goal</Text>
          <Text style={[styles.goalPct, { color: colors.primary }]}>
            {Math.round(dailyGoalPct * 100)}%
          </Text>
        </View>
        <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.primary, width: `${dailyGoalPct * 100}%` as any },
            ]}
          />
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* XP */}
      <View style={styles.stat}>
        <Text style={styles.statIcon}>⭐</Text>
        <Text style={[styles.statValue, { color: colors.text }]}>{xp.toLocaleString()}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>XP Total</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  stat: { alignItems: 'center', flex: 1 },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  statLabel: { fontSize: 11, marginTop: 2 },
  divider: { width: 1, height: 40, marginHorizontal: 8 },
  goalWrap: { flex: 2, paddingHorizontal: 8 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  goalLabel: { fontSize: 12 },
  goalPct: { fontSize: 12, fontWeight: '700' },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
});
