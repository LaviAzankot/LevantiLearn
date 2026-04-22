/**
 * LevantiLearn — Home / Dashboard
 *
 * Design system: Stitch Material You tokens
 *   background  #f7f6f2   card    #ffffff
 *   primary     #fe4d01   label   #5b5c59
 *   text        #2e2f2d   border  #e3e3de
 *   right       #00675f   surface #f1f1ed
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';

type Lesson = {
  id: string; topic: string; topic_ar: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  free: boolean; locked: boolean; order: number;
  xp_reward?: number; estimated_minutes?: number; completed?: boolean;
};
type UserStats = { xp_total: number; streak_days: number; lessons_completed: number; words_learned: number; topic_progress: Record<string, number> };

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  light: {
    bg:      '#f7f6f2',
    card:    '#ffffff',
    primary: '#fe4d01',
    text:    '#2e2f2d',
    label:   '#5b5c59',
    border:  '#e3e3de',
    surface: '#f1f1ed',
    right:   '#00675f',
  },
  dark: {
    bg:      '#1a1814',
    card:    '#242220',
    primary: '#ff6b2b',
    text:    '#f0ede8',
    label:   '#9a9690',
    border:  '#3a3830',
    surface: '#2e2c28',
    right:   '#66BB6A',
  },
};

// ── Lesson icon map (Ionicons) ────────────────────────────────────────────────
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
const ICONS: Record<string, { icon: IoniconName; color: string }> = {
  greetings_001:  { icon: 'hand-right',        color: '#FF9500' },
  greetings_002:  { icon: 'person-circle',     color: '#34C759' },
  food_001:       { icon: 'pizza',             color: '#FF6B35' },
  food_002:       { icon: 'cart',              color: '#5856D6' },
  directions_001: { icon: 'location',          color: '#007AFF' },
  shopping_001:   { icon: 'bag',               color: '#FF2D55' },
  family_001:     { icon: 'people',            color: '#AF52DE' },
  travel_001:     { icon: 'airplane',          color: '#FF9500' },
  numbers_001:    { icon: 'calculator',        color: '#34C759' },
  culture_001:    { icon: 'school',            color: '#FF3B30' },
};
const DEFAULT_META: { icon: IoniconName; color: string } = { icon: 'book', color: '#8E8E93' };

function lessonMeta(id: string) { return ICONS[id] ?? DEFAULT_META; }

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

const LEVEL_LABEL: Record<string, string> = {
  beginner:     'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
};

// ═════════════════════════════════════════════════════════════════════════════
export default function HomeTab() {
  const router   = useRouter();
  const scheme   = useColorScheme();
  const c        = C[scheme === 'dark' ? 'dark' : 'light'];
  const profile  = useAuthStore(s => s.profile);

  const [lessons,      setLessons]      = useState<Lesson[]>([]);
  const [stats,        setStats]        = useState<UserStats | null>(null);
  const [dueCount,     setDueCount]     = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState('');

  const load = useCallback(async () => {
    try {
      const isPremium = profile?.is_premium ?? false;
      const userId    = profile?.id ?? 'guest';
      const [catalogData, userStats, due] = await Promise.all([
        api.lessons.getCatalog(isPremium),
        api.progress.getStats(userId),
        api.progress.getDueCards(userId),
      ]);
      setLessons(catalogData.lessons ?? []);
      setStats(userStats);
      setDueCount(due.cards?.length ?? 0);
      setError('');
    } catch {
      setError('Cannot connect to server. Is the backend running?');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  // Derived data
  const completedCount = lessons.filter(l => l.completed).length;
  const nextLesson     = lessons.find(l => !l.locked && !l.completed) ?? lessons[0];
  const streak         = stats?.streak_days ?? 0;
  const xp             = stats?.xp_total    ?? 0;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: c.bg }]}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color={c.primary} size="large" />
          <Text style={[s.loadingText, { color: c.label }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: c.bg }]}>
        <View style={s.loadingWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color={c.label} />
          <Text style={[s.errorTitle, { color: c.text }]}>No connection</Text>
          <Text style={[s.errorSub, { color: c.label }]}>{error}</Text>
          <TouchableOpacity
            style={[s.retryBtn, { backgroundColor: c.primary }]}
            onPress={() => { setLoading(true); load(); }}
          >
            <Text style={s.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
        }
      >
        <View style={s.centered}>

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <View style={s.header}>
            <View>
              <Text style={[s.greeting, { color: c.label }]}>{getGreeting()} 👋</Text>
              <Text style={[s.logo, { color: c.text }]}>LevantiLearn</Text>
            </View>
            <View style={s.headerRight}>
              {streak > 0 && (
                <View style={[s.streakPill, { backgroundColor: '#FF9500' + '18' }]}>
                  <Text style={s.streakEmoji}>🔥</Text>
                  <Text style={[s.streakCount, { color: '#FF9500' }]}>{streak}</Text>
                </View>
              )}
              <TouchableOpacity
                style={[s.avatarBtn, { backgroundColor: c.primary + '18' }]}
                activeOpacity={0.8}
              >
                <Ionicons name="person" size={18} color={c.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Stats strip ────────────────────────────────────────────────── */}
          <View style={s.statsStrip}>
            <StatChip c={c} label="Streak" value={String(streak)} color="#FF9500">
              <Text style={{ fontSize: 18 }}>🔥</Text>
            </StatChip>
            <View style={[s.statDivider, { backgroundColor: c.border }]} />
            <StatChip c={c} label="XP" value={String(xp)} color={c.primary}>
              <Ionicons name="flash" size={18} color={c.primary} />
            </StatChip>
            <View style={[s.statDivider, { backgroundColor: c.border }]} />
            <StatChip c={c} label="Lessons" value={String(completedCount)} color={c.right}>
              <Ionicons name="checkmark-circle" size={18} color={c.right} />
            </StatChip>
          </View>

          {/* ── SRS Review banner ──────────────────────────────────────────── */}
          {dueCount > 0 && (
            <TouchableOpacity
              style={[s.reviewBanner, { backgroundColor: c.card, borderColor: c.primary + '30' }]}
              onPress={() => router.push('/review')}
              activeOpacity={0.88}
            >
              <View style={[s.reviewIconWrap, { backgroundColor: c.primary + '15' }]}>
                <Ionicons name="refresh-circle" size={22} color={c.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[s.reviewBannerTitle, { color: c.text }]}>
                  {dueCount} words due for review
                </Text>
                <Text style={[s.reviewBannerSub, { color: c.label }]}>
                  Keep your streak — quick review in 5 min
                </Text>
              </View>
              <View style={[s.reviewBannerArrow, { backgroundColor: c.primary }]}>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          )}

          {/* ── Continue Learning hero card ────────────────────────────────── */}
          {nextLesson && (
            <View style={s.section}>
              <Text style={[s.sectionEyebrow, { color: c.label }]}>Continue Learning</Text>

              <TouchableOpacity
                style={[s.heroCard, { backgroundColor: c.card, shadowColor: c.primary }]}
                onPress={() => router.push(`/lesson/${nextLesson.id}`)}
                activeOpacity={0.92}
              >
                {/* Icon circle */}
                {(() => {
                  const meta = lessonMeta(nextLesson.id);
                  return (
                    <View style={[s.heroIconCircle, { backgroundColor: meta.color + '18' }]}>
                      <Ionicons name={meta.icon} size={54} color={meta.color} />
                    </View>
                  );
                })()}

                {/* Info */}
                <View style={s.heroContent}>
                  <Text style={[s.heroTopic,   { color: c.text  }]}>{nextLesson.topic}</Text>
                  <Text style={[s.heroTopicAr, { color: c.label }]}>
                    {nextLesson.topic_ar ?? ''}
                  </Text>

                  <View style={s.heroTagRow}>
                    <View style={[s.levelTag, { backgroundColor: c.surface }]}>
                      <Text style={[s.levelTagText, { color: c.label }]}>
                        {LEVEL_LABEL[nextLesson.level] ?? nextLesson.level}
                      </Text>
                    </View>
                    <View style={[s.xpTag, { backgroundColor: c.primary + '15' }]}>
                      <Ionicons name="flash" size={12} color={c.primary} />
                      <Text style={[s.xpTagText, { color: c.primary }]}>50 XP</Text>
                    </View>
                  </View>
                </View>

                {/* CTA */}
                <View style={[s.heroArrow, { backgroundColor: c.primary }]}>
                  <Ionicons name="play" size={18} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* ── All Topics grid ─────────────────────────────────────────────── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: c.text }]}>All Topics</Text>
              <Text style={[s.sectionCount, { color: c.label }]}>
                {completedCount} / {lessons.length} done
              </Text>
            </View>

            <View style={s.grid}>
              {lessons.map((lesson, idx) => {
                const meta       = lessonMeta(lesson.id);
                const isLocked   = lesson.locked;
                const isDone     = lesson.completed;
                const isCurrent  = lesson.id === nextLesson?.id;

                return (
                  <TouchableOpacity
                    key={lesson.id}
                    style={[
                      s.topicCard,
                      {
                        backgroundColor: c.card,
                        borderColor: isDone
                          ? c.right + '40'
                          : isCurrent
                          ? c.primary + '40'
                          : c.border,
                        borderWidth: isDone || isCurrent ? 2 : 1.5,
                        opacity: isLocked ? 0.5 : 1,
                      },
                    ]}
                    onPress={() => !isLocked && router.push(`/lesson/${lesson.id}`)}
                    activeOpacity={0.82}
                    disabled={isLocked}
                  >
                    {/* Order number */}
                    <Text style={[s.topicOrder, { color: c.label }]}>
                      {String(lesson.order ?? idx + 1).padStart(2, '0')}
                    </Text>

                    {/* Icon */}
                    <View style={[
                      s.topicIconCircle,
                      { backgroundColor: isLocked ? c.surface : meta.color + '18' },
                    ]}>
                      <Ionicons
                        name={isLocked ? 'lock-closed' : meta.icon}
                        size={30}
                        color={isLocked ? c.label : meta.color}
                      />
                    </View>

                    {/* Labels */}
                    <Text style={[s.topicName, { color: isLocked ? c.label : c.text }]}
                          numberOfLines={2}>
                      {lesson.topic}
                    </Text>
                    <Text style={[s.topicAr, { color: c.label }]}>
                      {lesson.topic_ar ?? ''}
                    </Text>

                    {/* Status badge */}
                    {isDone ? (
                      <View style={[s.doneBadge, { backgroundColor: c.right }]}>
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      </View>
                    ) : isCurrent ? (
                      <View style={[s.currentBadge, { backgroundColor: c.primary }]}>
                        <Ionicons name="play" size={10} color="#fff" />
                      </View>
                    ) : null}

                    {/* Level tag (unlocked only) */}
                    {!isLocked && !isDone && (
                      <Text style={[s.topicLevel, { color: c.label }]}>
                        {LEVEL_LABEL[lesson.level] ?? lesson.level}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Footer space ────────────────────────────────────────────────── */}
          <View style={{ height: 32 }} />

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({
  c, label, value, color, children,
}: {
  c: typeof C.light; label: string; value: string; color: string; children: React.ReactNode;
}) {
  return (
    <View style={s.statChip}>
      {children}
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={[s.statLabel, { color: c.label }]}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:        { flex: 1 },
  scroll:      { paddingBottom: 24 },
  centered:    { maxWidth: 640, alignSelf: 'center', width: '100%' },

  // Loading / error
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 15 },
  errorTitle:  { fontSize: 18, fontWeight: '700', marginTop: 8 },
  errorSub:    { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn:    { marginTop: 8, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 50 },
  retryText:   { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16,
  },
  greeting:   { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  logo:       { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerRight:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 50,
  },
  streakEmoji: { fontSize: 16 },
  streakCount: { fontSize: 16, fontWeight: '800' },
  avatarBtn:  {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },

  // Stats strip
  statsStrip: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 24, marginBottom: 16,
    borderRadius: 20, overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  statChip: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  statValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  statLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  statDivider: { width: 1, height: 40 },

  // SRS Review banner
  reviewBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 24, marginBottom: 20,
    borderRadius: 18, borderWidth: 1.5,
    padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  reviewIconWrap:   { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reviewBannerTitle:{ fontSize: 15, fontWeight: '700', lineHeight: 20 },
  reviewBannerSub:  { fontSize: 12, marginTop: 2, lineHeight: 16 },
  reviewBannerArrow:{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  // Section
  section:      { paddingHorizontal: 24, marginBottom: 28 },
  sectionEyebrow:{ fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle:  { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  sectionCount:  { fontSize: 13, fontWeight: '500' },

  // Hero card
  heroCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 24, padding: 20, gap: 16,
    shadowOpacity: 0.12, shadowOffset: { width: 0, height: 4 }, shadowRadius: 20, elevation: 4,
  },
  heroIconCircle: {
    width: 80, height: 80, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  heroContent:  { flex: 1, gap: 6 },
  heroTopic:    { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  heroTopicAr:  { fontSize: 15, fontWeight: '500' },
  heroTagRow:   { flexDirection: 'row', gap: 8, marginTop: 4 },
  levelTag:     { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  levelTagText: { fontSize: 12, fontWeight: '600' },
  xpTag:        { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 3 },
  xpTagText:    { fontSize: 12, fontWeight: '700' },
  heroArrow:    { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  // Topic grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  topicCard: {
    width: '47.5%', borderRadius: 20, padding: 16,
    position: 'relative',
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  topicOrder:      { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12 },
  topicIconCircle: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  topicName:       { fontSize: 14, fontWeight: '700', lineHeight: 20, marginBottom: 4 },
  topicAr:         { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  topicLevel:      { fontSize: 11, marginTop: 8, fontWeight: '500' },
  doneBadge:       { position: 'absolute', top: 12, right: 12, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  currentBadge:    { position: 'absolute', top: 12, right: 12, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
