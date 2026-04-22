/**
 * HomeScreen — Main dashboard
 * Shows streak, XP, lesson path, and due reviews
 */

import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { useLearningStore } from '../store/learningStore';
import { StreakBanner } from '../components/StreakBanner';
import { LessonCard } from '../components/LessonCard';
import { ReviewBadge } from '../components/ReviewBadge';
import { ProgressPath } from '../components/ProgressPath';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export function HomeScreen() {
  const nav = useNavigation<Nav>();
  const { colors } = useTheme();
  const {
    user, lessons, dueReviewCount,
    currentLesson, fetchCatalog,
  } = useLearningStore();

  useEffect(() => {
    fetchCatalog();
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.logo, { color: colors.primary }]}>LevantiLearn</Text>
          <TouchableOpacity onPress={() => nav.navigate('Profile')}>
            <Text style={styles.avatar}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* Streak + XP banner */}
        <StreakBanner
          streak={user?.streak_days ?? 0}
          xp={user?.xp_total ?? 0}
          dailyGoalPct={0.8}
        />

        {/* Continue lesson */}
        {currentLesson && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Continue Learning
            </Text>
            <LessonCard
              lesson={currentLesson}
              onPress={() => nav.navigate('Lesson', { lessonId: currentLesson.id })}
              variant="featured"
            />
          </View>
        )}

        {/* Review due */}
        {dueReviewCount > 0 && (
          <TouchableOpacity
            style={[styles.reviewBanner, { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}
            onPress={() => nav.navigate('Review')}
          >
            <Text style={{ fontSize: 20 }}>🔄</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.reviewTitle, { color: colors.text }]}>
                {dueReviewCount} words due for review
              </Text>
              <Text style={[styles.reviewSub, { color: colors.textSecondary }]}>
                Keep your streak — review now
              </Text>
            </View>
            <Text style={[styles.reviewCta, { color: colors.accent }]}>Start →</Text>
          </TouchableOpacity>
        )}

        {/* Learning path */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Your Learning Path
          </Text>
          <ProgressPath
            lessons={lessons}
            onLessonPress={(id) => nav.navigate('Lesson', { lessonId: id })}
          />
        </View>

        {/* All lessons grid */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>All Topics</Text>
          <View style={styles.grid}>
            {lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                onPress={() =>
                  lesson.locked
                    ? nav.navigate('Paywall')
                    : nav.navigate('Lesson', { lessonId: lesson.id })
                }
                variant="grid"
              />
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom nav */}
      <BottomNav active="home" nav={nav} />
    </SafeAreaView>
  );
}

function BottomNav({ active, nav }: { active: string; nav: Nav }) {
  const { colors } = useTheme();
  const tabs = [
    { key: 'home',    icon: '🏠', label: 'Home',    screen: 'Home' },
    { key: 'learn',   icon: '📖', label: 'Learn',   screen: 'Catalog' },
    { key: 'review',  icon: '🔄', label: 'Review',  screen: 'Review' },
    { key: 'profile', icon: '👤', label: 'Profile', screen: 'Profile' },
  ] as const;

  return (
    <View style={[styles.bottomNav, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={styles.navItem}
          onPress={() => nav.navigate(tab.screen as any)}
        >
          <Text style={styles.navIcon}>{tab.icon}</Text>
          <Text style={[
            styles.navLabel,
            { color: active === tab.key ? colors.primary : colors.textSecondary }
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  logo: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  avatar: { fontSize: 26 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  reviewTitle: { fontSize: 15, fontWeight: '600' },
  reviewSub: { fontSize: 13, marginTop: 2 },
  reviewCta: { fontSize: 15, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bottomNav: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    paddingBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  navItem: { flex: 1, alignItems: 'center' },
  navIcon: { fontSize: 22 },
  navLabel: { fontSize: 11, marginTop: 2 },
});
