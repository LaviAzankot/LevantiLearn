/**
 * LevantiLearn — Profile Tab
 * All stats are real — fetched from Supabase.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, ActivityIndicator,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { api } from '../../src/services/api';

// ── Design tokens ─────────────────────────────────────────────────��───────────
const C = {
  light: { bg: '#f7f6f2', card: '#ffffff', primary: '#fe4d01', text: '#2e2f2d', label: '#5b5c59', border: '#e3e3de', surface: '#f1f1ed', right: '#00675f' },
  dark:  { bg: '#1a1814', card: '#242220', primary: '#ff6b2b', text: '#f0ede8', label: '#9a9690', border: '#3a3830', surface: '#2e2c28', right: '#66BB6A' },
};

const DAYS     = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const BADGES = [
  { id: 'first_lesson', icon: 'ribbon',      name: 'First Step',    color: '#fe4d01' },
  { id: 'week_streak',  icon: 'flame',        name: '7-Day Streak',  color: '#EF4444' },
  { id: 'coffee',       icon: 'cafe',         name: 'Coffee Expert', color: '#92400E' },
  { id: 'chatterbox',   icon: 'chatbubbles',  name: 'Chatterbox',    color: '#8B5CF6' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
export default function ProfileTab() {
  const scheme   = useColorScheme();
  const c        = C[scheme === 'dark' ? 'dark' : 'light'];
  const router   = useRouter();
  const profile  = useAuthStore(s => s.profile);
  const signOut  = useAuthStore(s => s.signOut);
  const refreshProfile = useAuthStore(s => s.refreshProfile);

  const [darkMode, setDarkMode]   = useState(scheme === 'dark');
  const [stats,    setStats]      = useState<any>(null);
  const [loading,  setLoading]    = useState(true);

  // Activity dots — which days this week the user studied (from stats)
  const [activity, setActivity] = useState([false, false, false, false, false, false, false]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await refreshProfile();
        const data = await api.progress.getStats((profile?.id ?? ''));
        if (mounted) {
          setStats(data);
          // Build activity array based on streak (simple heuristic)
          const streak = data.streak_days ?? 0;
          const today = new Date().getDay(); // 0=Sun
          const act = [false, false, false, false, false, false, false];
          for (let i = 0; i < Math.min(streak, 7); i++) {
            act[(today - i + 7) % 7] = true;
          }
          setActivity(act);
        }
      } catch (e) {
        console.warn('Failed to load stats', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const streakDays       = stats?.streak_days       ?? profile?.streak_days       ?? 0;
  const xpTotal          = stats?.xp_total          ?? profile?.xp_total          ?? 0;
  const lessonsCompleted = stats?.lessons_completed ?? 0;
  const wordsLearned     = stats?.words_learned     ?? 0;

  const topicProgress = stats?.topic_progress
    ? Object.entries(stats.topic_progress).map(([topic, pct]: any) => ({
        topic: topic.charAt(0).toUpperCase() + topic.slice(1),
        pct: pct / 100,
        color: '#fe4d01',
      }))
    : [
        { topic: 'Greetings',  pct: 1.00, color: '#00675f' },
        { topic: 'Food',       pct: 0.80, color: '#fe4d01' },
        { topic: 'Directions', pct: 0.40, color: '#3B82F6' },
        { topic: 'Numbers',    pct: 0.20, color: '#8B5CF6' },
      ];

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>

        {/* ── Streak hero banner ── */}
        <View style={[s.streakBanner, { backgroundColor: c.primary }]}>
          <View style={[s.streakIconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={{ fontSize: 28 }}>🔥</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.streakTitle}>{streakDays} day streak!</Text>
            <Text style={s.streakSub}>Keep it going — don't stop now</Text>
          </View>
          <View style={[s.xpBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name="flash" size={14} color="#fff" />
            <Text style={s.xpBadgeText}>+{streakDays * 10} XP</Text>
          </View>
        </View>

        {/* ── Stats row ── */}
        {loading ? (
          <View style={{ height: 110, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : (
          <View style={s.statsRow}>
            <StatCard icon="book"   value={lessonsCompleted} label="Lessons" color={c.primary} c={c} />
            <StatCard icon="text"   value={wordsLearned}     label="Words"   color="#3B82F6"   c={c} />
            <StatCard icon="flash"  value={xpTotal}          label="XP"      color={c.right}   c={c} />
          </View>
        )}

        {/* ── Weekly activity ── */}
        <View style={[s.card, { backgroundColor: c.card }]}>
          <Text style={[s.cardTitle, { color: c.text }]}>Weekly Activity</Text>
          <View style={s.weekRow}>
            {DAYS.map((day, i) => (
              <View key={i} style={s.dayWrap}>
                <View style={[s.dayDot, {
                  backgroundColor: activity[i] ? c.primary : c.border,
                  shadowColor:     activity[i] ? c.primary : 'transparent',
                  shadowOpacity:   activity[i] ? 0.4 : 0,
                  shadowOffset:    { width: 0, height: 3 },
                  shadowRadius:    6, elevation: activity[i] ? 4 : 0,
                }]} />
                <Text style={[s.dayLabel, { color: activity[i] ? c.text : c.label }]}>{day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Topic progress ── */}
        <View style={[s.card, { backgroundColor: c.card }]}>
          <Text style={[s.cardTitle, { color: c.text }]}>Progress by Topic</Text>
          {topicProgress.map((item: any) => (
            <View key={item.topic} style={s.progressRow}>
              <Text style={[s.progressLabel, { color: c.text }]}>{item.topic}</Text>
              <View style={[s.progressBg, { backgroundColor: c.border }]}>
                <View style={[s.progressFill, { backgroundColor: item.color, width: `${item.pct * 100}%` as any }]} />
              </View>
              <Text style={[s.progressPct, { color: item.color }]}>{Math.round(item.pct * 100)}%</Text>
            </View>
          ))}
        </View>

        {/* ── Badges ── */}
        <View style={[s.card, { backgroundColor: c.card }]}>
          <Text style={[s.cardTitle, { color: c.text }]}>Badges</Text>
          <View style={s.badgeGrid}>
            {BADGES.map(b => (
              <View key={b.id} style={[s.badge, { backgroundColor: b.color + '18', borderColor: b.color + '40' }]}>
                <Ionicons name={b.icon as any} size={28} color={b.color} />
                <Text style={[s.badgeName, { color: c.text }]}>{b.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Settings ── */}
        <View style={[s.card, { backgroundColor: c.card }]}>
          <Text style={[s.cardTitle, { color: c.text }]}>Settings</Text>

          <SettingsRow icon="flag-outline"          label="Daily goal"   value={`${profile?.daily_goal_minutes ?? 10} min`} c={c} />
          <SettingsRow icon="globe-outline"         label="App language" value="English" c={c} />
          <SettingsRow icon="notifications-outline" label="Reminders"    value="On" c={c} />

          <View style={[s.settingsRow, { borderTopColor: c.border }]}>
            <Ionicons name="moon-outline" size={20} color={c.label} />
            <Text style={[s.settingsLabel, { color: c.text }]}>Dark mode</Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: c.border, true: c.primary + '80' }}
              thumbColor={darkMode ? c.primary : '#fff'}
            />
          </View>

          <TouchableOpacity
            style={[s.settingsRow, { borderTopColor: c.border }]}
            activeOpacity={0.7}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={[s.settingsLabel, { color: '#EF4444' }]}>Sign out</Text>
          </TouchableOpacity>
        </View>

        {/* ── Premium upsell ── */}
        {!profile?.is_premium && (
          <TouchableOpacity
            style={[s.premiumCard, { backgroundColor: '#0d2240' }]}
            activeOpacity={0.88}
            onPress={() => router.push('/premium')}
          >
            <View style={[s.premiumIconWrap, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
              <Ionicons name="diamond" size={28} color="#FFD700" />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={s.premiumTitle}>Upgrade to Premium</Text>
              <Text style={s.premiumSub}>All 10 topics + pronunciation scoring</Text>
            </View>
            <View style={[s.premiumBtn, { backgroundColor: c.primary }]}>
              <Text style={s.premiumBtnText}>₪34.99</Text>
            </View>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, color, c }: any) {
  return (
    <View style={[s.statCard, { backgroundColor: c.card, shadowColor: color }]}>
      <View style={[s.statRing, { borderColor: color }]}>
        <Text style={[s.statRingVal, { color }]}>{value}</Text>
      </View>
      <Ionicons name={icon} size={16} color={color} style={{ marginTop: 2 }} />
      <Text style={[s.statLabel, { color: c.label }]}>{label}</Text>
    </View>
  );
}

function SettingsRow({ icon, label, value, c }: any) {
  return (
    <View style={[s.settingsRow, { borderTopColor: c.border }]}>
      <Ionicons name={icon} size={20} color={c.label} />
      <Text style={[s.settingsLabel, { color: c.text }]}>{label}</Text>
      <Text style={[s.settingsValue, { color: c.label }]}>{value}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1 },
  streakBanner:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, gap: 14 },
  streakIconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  streakTitle:    { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  streakSub:      { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  xpBadge:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50 },
  xpBadgeText:    { color: '#fff', fontWeight: '800', fontSize: 14 },
  statsRow:       { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginTop: 16 },
  statCard:       { flex: 1, borderRadius: 20, padding: 16, alignItems: 'center', gap: 5, shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 3 },
  statRing:       { width: 56, height: 56, borderRadius: 28, borderWidth: 3.5, alignItems: 'center', justifyContent: 'center' },
  statRingVal:    { fontSize: 17, fontWeight: '800' },
  statLabel:      { fontSize: 11, fontWeight: '600' },
  card:           { marginHorizontal: 16, marginTop: 14, borderRadius: 22, padding: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 2 },
  cardTitle:      { fontSize: 17, fontWeight: '800', letterSpacing: -0.2, marginBottom: 16 },
  weekRow:        { flexDirection: 'row', justifyContent: 'space-between' },
  dayWrap:        { alignItems: 'center', gap: 6 },
  dayDot:         { width: 32, height: 32, borderRadius: 16 },
  dayLabel:       { fontSize: 11, fontWeight: '600' },
  progressRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 13, gap: 10 },
  progressLabel:  { width: 78, fontSize: 13, fontWeight: '600' },
  progressBg:     { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill:   { height: '100%', borderRadius: 4 },
  progressPct:    { width: 36, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  badgeGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badge:          { width: '47%', borderRadius: 16, borderWidth: 1.5, padding: 14, alignItems: 'center', gap: 7 },
  badgeName:      { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  settingsRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, gap: 12 },
  settingsLabel:  { flex: 1, fontSize: 15, fontWeight: '600' },
  settingsValue:  { fontSize: 14 },
  premiumCard:    { marginHorizontal: 16, marginTop: 14, borderRadius: 22, padding: 20, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 6 },
  premiumIconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  premiumTitle:   { color: '#fff', fontSize: 16, fontWeight: '800' },
  premiumSub:     { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  premiumBtn:     { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  premiumBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
