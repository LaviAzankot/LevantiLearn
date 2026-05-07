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
  level: string;
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

// ── Level groups ───────────────────────────────────────────────────────────────
type LevelGroup = {
  id: string; title: string; description: string;
  icon: IoniconName; color: string; cardLight: string; cardDark: string;
};

const LEVEL_GROUPS: LevelGroup[] = [
  { id: 'A1', title: 'A1 — Survival',      description: 'Greetings, numbers, family, colors, directions and more',  icon: 'star',         color: '#FF9500', cardLight: '#ffe8cc', cardDark: '#2e2010' },
  { id: 'A2', title: 'A2 — Daily Life',    description: 'Verbs, shopping, body parts, transport, past and future',  icon: 'school',       color: '#4CAF50', cardLight: '#e6f4ea', cardDark: '#0d2212' },
  { id: 'B1', title: 'B1 — Conversations', description: 'Opinions, stories, work, travel, conditionals and more',   icon: 'chatbubbles',  color: '#2196F3', cardLight: '#e3f2fd', cardDark: '#071929' },
  { id: 'B2', title: 'B2 — Fluency',       description: 'Abstract ideas, passive voice, idioms, media discourse',   icon: 'trophy',       color: '#9C27B0', cardLight: '#f3e5f5', cardDark: '#180a1e' },
];

const LEVEL_LABEL: Record<string, string> = {
  A1: 'A1', A2: 'A2', B1: 'B1', B2: 'B2',
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

  const lessonsForLevel = (levelId: string) =>
    lessons.filter(l => l.level === levelId);

  const visibleGroups  = LEVEL_GROUPS.filter(g => lessonsForLevel(g.id).length > 0);
  const displayGroups  = filter
    ? visibleGroups.filter(g => g.id === filter)
    : visibleGroups;

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
            label="All Levels" active={filter === null}
            color={c.primary} c={c}
            onPress={() => setFilter(null)}
          />
          {visibleGroups.map(g => (
            <FilterPill
              key={g.id}
              label={g.title} icon={g.icon}
              active={filter === g.id} color={g.color} c={c}
              onPress={() => setFilter(g.id)}
            />
          ))}
        </ScrollView>

        {/* ── Level sections ───────────────────────────────────────────────── */}
        {displayGroups.map(grp => (
          <View key={grp.id} style={s.topicSection}>
            <View style={s.sectionIntro}>
              <Text style={[s.sectionTitle, { color: c.text  }]}>{grp.title}</Text>
              <Text style={[s.sectionDesc,  { color: c.label }]}>{grp.description}</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.lessonRow}
            >
              {lessonsForLevel(grp.id).map(lesson => {
                const avatarIdx = ((lesson.order - 1) % 23) + 1;
                const isLocked  = lesson.locked;
                const isDone    = lesson.completed;
                const isCurrent = lesson.id === nextLesson?.id;
                const cardBg    = scheme === 'dark' ? grp.cardDark : grp.cardLight;

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
                          <Ionicons name="flash" size={11} color={grp.color} />
                          <Text style={[s.cardTagText, { color: grp.color }]}>{lesson.xp_reward} XP</Text>
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
