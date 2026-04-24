/**
 * LevantiLearn — Learn / Home tab
 * Practice-style redesign: topic filter pills + horizontal lesson cards with avatars
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { getAvatar } from '../../src/assets/avatars';

type Lesson = {
  id: string; topic: string; topic_ar: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  free: boolean; locked: boolean; order: number;
  xp_reward?: number; estimated_minutes?: number; completed?: boolean;
};

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  light: {
    bg:      '#fff8eb',
    card:    '#ffffff',
    primary: '#fe4d01',
    text:    '#2d2416',
    label:   '#8b6914',
    border:  '#ffeaa7',
    surface: '#fff3db',
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

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ── Category definitions ───────────────────────────────────────────────────────
type Category = {
  id: string; title: string; description: string;
  icon: IoniconName; color: string; cardLight: string; cardDark: string;
};

const CATEGORIES: Category[] = [
  { id: 'greetings',  title: 'Greetings',    description: 'Start every conversation the Arabic way',              icon: 'hand-right',        color: '#FF9500', cardLight: '#ffe8cc', cardDark: '#2e2010' },
  { id: 'food',       title: 'Food & Eating', description: 'Order like a local at any restaurant or market',      icon: 'pizza',             color: '#FF6B35', cardLight: '#ffdeb8', cardDark: '#2c1e0a' },
  { id: 'directions', title: 'Directions',   description: 'Find your way and ask for help in the streets',       icon: 'location',          color: '#E87A2F', cardLight: '#ffeedd', cardDark: '#2e2210' },
  { id: 'shopping',   title: 'Shopping',     description: 'Bargain and buy with confidence at the souk',        icon: 'bag',               color: '#E67E22', cardLight: '#ffe4c4', cardDark: '#2d1f0c' },
  { id: 'family',     title: 'Family',       description: 'Talk about relatives and build real connections',     icon: 'people',            color: '#D4A017', cardLight: '#ffecb3', cardDark: '#2e240a' },
  { id: 'travel',     title: 'Travel',       description: 'Navigate airports, hotels and new cities',           icon: 'airplane',          color: '#FF9500', cardLight: '#fff4dd', cardDark: '#30260e' },
  { id: 'numbers',    title: 'Numbers',      description: 'Count, tell time and handle money',                  icon: 'calculator',        color: '#E8A020', cardLight: '#ffe9c2', cardDark: '#2e230c' },
  { id: 'colors',     title: 'Colors',       description: 'Describe the world around you in Arabic',            icon: 'color-palette',     color: '#CC8800', cardLight: '#fff0d4', cardDark: '#302610' },
  { id: 'emergency',  title: 'Emergency',    description: 'Stay safe with essential phrases for urgent moments', icon: 'medkit',            color: '#D4541A', cardLight: '#fff6e0', cardDark: '#322811' },
  { id: 'culture',    title: 'Culture',      description: 'Understand Arab traditions and expressions',           icon: 'school',            color: '#C97432', cardLight: '#ffe7c7', cardDark: '#2d1f0e' },
];

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function HomeTab() {
  const router   = useRouter();
  const scheme   = useColorScheme();
  const c        = C[scheme === 'dark' ? 'dark' : 'light'];
  const profile  = useAuthStore(s => s.profile);

  const [lessons,    setLessons]    = useState<Lesson[]>([]);
  const [dueCount,   setDueCount]   = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');
  const [filter,     setFilter]     = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const isPremium = profile?.is_premium ?? false;
      const userId    = profile?.id ?? 'guest';
      const [catalogData, due] = await Promise.all([
        api.lessons.getCatalog(isPremium),
        api.progress.getDueCards(userId),
      ]);
      setLessons(catalogData.lessons ?? []);
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

  const lessonsForCat = (catId: string) =>
    lessons.filter(l => l.id.startsWith(catId));

  const visibleCategories = CATEGORIES.filter(cat => lessonsForCat(cat.id).length > 0);
  const displayCategories = filter
    ? visibleCategories.filter(cat => cat.id === filter)
    : visibleCategories;

  const nextLesson = lessons.find(l => !l.locked && !l.completed) ?? lessons[0];

  // ── Loading ──────────────────────────────────────────────────────────────────
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

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: c.bg }]}>
        <View style={s.loadingWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color={c.label} />
          <Text style={[s.errorTitle, { color: c.text }]}>No connection</Text>
          <Text style={[s.errorSub,   { color: c.label }]}>{error}</Text>
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

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
        }
      >
        {/* ── Top bar: greeting + logo + profile btn ───────────────────────── */}
        <View style={s.header}>
          <View>
            <Text style={[s.greeting, { color: c.label }]}>{getGreeting()} 👋</Text>
            <Text style={[s.logo,     { color: c.text  }]}>LevantiLearn</Text>
          </View>
          <TouchableOpacity style={[s.avatarBtn, { backgroundColor: c.primary + '18' }]} activeOpacity={0.8}>
            <Ionicons name="person" size={18} color={c.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Page title + subtitle ────────────────────────────────────────── */}
        <View style={s.titleSection}>
          <Text style={[s.pageTitle,    { color: c.text  }]}>Choose Your Lesson</Text>
          <Text style={[s.pageSubtitle, { color: c.label }]}>
            Pick a topic, listen and speak, build real confidence
          </Text>
        </View>

        {/* ── SRS Review banner (only when words are due) ──────────────────── */}
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
              <Text style={[s.reviewBannerTitle, { color: c.text  }]}>{dueCount} words due for review</Text>
              <Text style={[s.reviewBannerSub,   { color: c.label }]}>Keep your streak — quick review in 5 min</Text>
            </View>
            <View style={[s.reviewBannerArrow, { backgroundColor: c.primary }]}>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        )}

        {/* ── Topic filter pills ───────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          <FilterPill
            label="All Topics" active={filter === null}
            color={c.primary} c={c}
            onPress={() => setFilter(null)}
          />
          {visibleCategories.map(cat => (
            <FilterPill
              key={cat.id}
              label={cat.title} icon={cat.icon}
              active={filter === cat.id} color={cat.color} c={c}
              onPress={() => setFilter(cat.id)}
            />
          ))}
        </ScrollView>

        {/* ── Topic sections ───────────────────────────────────────────────── */}
        {displayCategories.map(cat => (
          <View key={cat.id} style={s.topicSection}>
            <View style={s.sectionIntro}>
              <Text style={[s.sectionTitle, { color: c.text  }]}>{cat.title}</Text>
              <Text style={[s.sectionDesc,  { color: c.label }]}>{cat.description}</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.lessonRow}
            >
              {lessonsForCat(cat.id).map(lesson => {
                const avatarIdx = ((lesson.order - 1) % 23) + 1;
                const isLocked  = lesson.locked;
                const isDone    = lesson.completed;
                const isCurrent = lesson.id === nextLesson?.id;
                const cardBg    = scheme === 'dark' ? cat.cardDark : cat.cardLight;

                return (
                  <TouchableOpacity
                    key={lesson.id}
                    style={[s.lessonCard, { backgroundColor: cardBg, opacity: isLocked ? 0.55 : 1 }]}
                    onPress={() => !isLocked && router.push(`/lesson/${lesson.id}`)}
                    disabled={isLocked}
                    activeOpacity={0.88}
                  >
                    {/* Status badge top-right */}
                    {isDone ? (
                      <View style={[s.statusBadge, { backgroundColor: c.right }]}>
                        <Ionicons name="checkmark" size={13} color="#fff" />
                      </View>
                    ) : isCurrent ? (
                      <View style={[s.statusBadge, { backgroundColor: c.primary }]}>
                        <Ionicons name="play" size={13} color="#fff" />
                      </View>
                    ) : isLocked ? (
                      <View style={[s.statusBadge, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                        <Ionicons name="lock-closed" size={13} color="#fff" />
                      </View>
                    ) : null}

                    {/* Text content */}
                    <Text style={s.cardTopic} numberOfLines={2}>{lesson.topic}</Text>
                    <Text style={s.cardTopicAr}>{lesson.topic_ar ?? ''}</Text>

                    {/* Tags */}
                    <View style={s.cardTagRow}>
                      <View style={s.cardTag}>
                        <Text style={s.cardTagText}>{LEVEL_LABEL[lesson.level] ?? lesson.level}</Text>
                      </View>
                      {lesson.xp_reward != null && (
                        <View style={s.cardTag}>
                          <Ionicons name="flash" size={11} color={cat.color} />
                          <Text style={[s.cardTagText, { color: cat.color }]}>{lesson.xp_reward} XP</Text>
                        </View>
                      )}
                    </View>

                    {/* Avatar peeking from bottom */}
                    <View style={s.cardAvatarWrap}>
                      <Image
                        source={getAvatar(avatarIdx)}
                        style={s.cardAvatar}
                        resizeMode="contain"
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── FilterPill ─────────────────────────────────────────────────────────────────
function FilterPill({
  label, icon, active, color, onPress, c,
}: {
  label: string; icon?: IoniconName;
  active: boolean; color: string;
  onPress: () => void; c: typeof C.light;
}) {
  return (
    <TouchableOpacity
      style={[s.pill, {
        backgroundColor: active ? color : c.card,
        borderColor:     active ? color : c.border,
      }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon && (
        <View style={[s.pillIcon, {
          backgroundColor: active ? 'rgba(255,255,255,0.25)' : color + '22',
        }]}>
          <Ionicons name={icon} size={14} color={active ? '#fff' : color} />
        </View>
      )}
      <Text style={[s.pillText, { color: active ? '#fff' : c.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingBottom: 32 },

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
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8,
  },
  greeting:  { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  logo:      { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  avatarBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },

  // Title section
  titleSection: {
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32, alignItems: 'center',
  },
  pageTitle: {
    fontSize: 34, fontWeight: '800', letterSpacing: -1,
    textAlign: 'center', marginBottom: 12,
  },
  pageSubtitle: {
    fontSize: 16, fontStyle: 'italic',
    textAlign: 'center', lineHeight: 24,
  },

  // Review banner
  reviewBanner: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 24, marginBottom: 28,
    borderRadius: 18, borderWidth: 1.5, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  reviewIconWrap:    { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reviewBannerTitle: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  reviewBannerSub:   { fontSize: 12, marginTop: 2, lineHeight: 16 },
  reviewBannerArrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  // Filter pills
  filterRow: { paddingHorizontal: 24, gap: 10, paddingBottom: 36 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 50, borderWidth: 2,
    shadowColor: '#f59e0b', shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2,
  },
  pillIcon: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontSize: 15, fontWeight: '600' },

  // Topic section
  topicSection: { marginBottom: 52 },
  sectionIntro: { paddingHorizontal: 24, marginBottom: 20, alignItems: 'center' },
  sectionTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.8, marginBottom: 6, textAlign: 'center' },
  sectionDesc:  { fontSize: 15, fontStyle: 'italic', lineHeight: 22, textAlign: 'center' },

  // Lesson cards row
  lessonRow: { paddingHorizontal: 24, gap: 16, paddingVertical: 8 },
  lessonCard: {
    width: 280, minHeight: 340, borderRadius: 24,
    padding: 24, paddingBottom: 156,
    overflow: 'hidden', position: 'relative',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#f59e0b', shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 5,
  },
  cardTopic:   { fontSize: 20, fontWeight: '800', color: '#2d2416', lineHeight: 28, marginBottom: 4 },
  cardTopicAr: { fontSize: 15, fontWeight: '500', color: '#6b5010', marginBottom: 18 },
  cardTagRow:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  cardTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 50, backgroundColor: 'rgba(0,0,0,0.1)',
  },
  cardTagText: { fontSize: 12, fontWeight: '700', color: '#2d2416' },

  // Avatar
  cardAvatarWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', pointerEvents: 'none' as any,
  },
  cardAvatar: { width: 148, height: 148 },

  // Status badge
  statusBadge: {
    position: 'absolute', top: 16, right: 16,
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
});
