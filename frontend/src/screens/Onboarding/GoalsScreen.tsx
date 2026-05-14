/**
 * GoalsScreen — post-signup onboarding: dialect, daily goal, motivation.
 * On "Continue" → saves preferences to AsyncStorage + Supabase → shows paywall.
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { ONBOARDED_KEY } from '../../constants/subscriptions';

// ── Tokens ────────────────────────────────────────────────────────────────────
const C = {
  light: { bg: '#f7f6f2', card: '#ffffff', primary: '#fe4d01', text: '#2e2f2d', label: '#5b5c59', border: '#e3e3de' },
  dark:  { bg: '#1a1814', card: '#242220', primary: '#ff6b2b', text: '#f0ede8', label: '#9a9690', border: '#3a3830' },
};

// ── Option sets ───────────────────────────────────────────────────────────────
const DIALECTS = [
  { id: 'levantine', label: 'Levantine', sub: 'Syria · Lebanon · Palestine · Jordan', icon: '🫒' },
  { id: 'egyptian',  label: 'Egyptian',  sub: 'Most widely understood',              icon: '🏺' },
  { id: 'gulf',      label: 'Gulf',      sub: 'Saudi Arabia · UAE · Kuwait',         icon: '🌴' },
  { id: 'msa',       label: 'MSA',       sub: 'Formal / classical Arabic',           icon: '📖' },
];

const GOALS = [
  { id: '5',  label: '5 min',  sub: 'Casual — just exploring' },
  { id: '10', label: '10 min', sub: 'Steady progress' },
  { id: '15', label: '15 min', sub: 'Serious learner' },
  { id: '20', label: '20 min', sub: 'Fully committed' },
];

const MOTIVATIONS = [
  { id: 'travel',    label: 'Travel',    icon: '✈️' },
  { id: 'heritage',  label: 'Heritage',  icon: '🫂' },
  { id: 'culture',   label: 'Culture',   icon: '🎭' },
  { id: 'work',      label: 'Work',      icon: '💼' },
  { id: 'romance',   label: 'Romance',   icon: '❤️' },
  { id: 'fun',       label: 'Just fun',  icon: '🎉' },
];

interface Props {
  onComplete: () => void; // called after save — parent navigates to paywall
}

// ═══════════════════════════════════════════════════════════════════════════════
export function GoalsScreen({ onComplete }: Props) {
  const scheme = useColorScheme();
  const c      = C[scheme === 'dark' ? 'dark' : 'light'];

  const [dialect,    setDialect]    = useState('levantine');
  const [goal,       setGoal]       = useState('10');
  const [motivation, setMotivation] = useState('travel');
  const [saving,     setSaving]     = useState(false);

  const handleContinue = async () => {
    setSaving(true);
    try {
      const prefs = { dialect, goal_minutes: Number(goal), motivation };

      // Save locally
      await AsyncStorage.setItem('@levantilearn_goals', JSON.stringify(prefs));

      // Sync to Supabase profile (best-effort)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles')
          .update({ daily_goal_minutes: Number(goal) })
          .eq('id', user.id);
      }

      // Mark onboarding started (completed after paywall)
      await AsyncStorage.setItem(ONBOARDED_KEY, 'pending');

      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const canContinue = !!dialect && !!goal && !!motivation;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.bg }]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={[s.title,    { color: c.text  }]}>Set Your Goals</Text>
          <Text style={[s.subtitle, { color: c.label }]}>
            Personalise your learning path — takes 30 seconds
          </Text>
        </View>

        {/* ── Dialect ──────────────────────────────────────────────────────── */}
        <Section label="Which dialect?" c={c}>
          {DIALECTS.map(d => (
            <OptionCard
              key={d.id}
              selected={dialect === d.id}
              onPress={() => setDialect(d.id)}
              c={c}
            >
              <Text style={s.optIcon}>{d.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.optLabel, { color: c.text }]}>{d.label}</Text>
                <Text style={[s.optSub,   { color: c.label }]}>{d.sub}</Text>
              </View>
              {dialect === d.id && <Ionicons name="checkmark-circle" size={20} color={c.primary} />}
            </OptionCard>
          ))}
        </Section>

        {/* ── Daily goal ────────────────────────────────────────────────────── */}
        <Section label="Daily learning goal" c={c}>
          <View style={s.row}>
            {GOALS.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[s.goalChip, {
                  borderColor:     goal === g.id ? c.primary : c.border,
                  backgroundColor: goal === g.id ? c.primary + '12' : c.card,
                }]}
                onPress={() => setGoal(g.id)}
                activeOpacity={0.8}
              >
                <Text style={[s.goalLabel, { color: goal === g.id ? c.primary : c.text }]}>{g.label}</Text>
                <Text style={[s.goalSub,   { color: c.label }]}>{g.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* ── Motivation ────────────────────────────────────────────────────── */}
        <Section label="Why are you learning?" c={c}>
          <View style={s.row}>
            {MOTIVATIONS.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[s.motivChip, {
                  borderColor:     motivation === m.id ? c.primary : c.border,
                  backgroundColor: motivation === m.id ? c.primary + '12' : c.card,
                }]}
                onPress={() => setMotivation(m.id)}
                activeOpacity={0.8}
              >
                <Text style={s.motivIcon}>{m.icon}</Text>
                <Text style={[s.motivLabel, { color: motivation === m.id ? c.primary : c.text }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* CTA */}
        <TouchableOpacity
          style={[s.btn, { backgroundColor: c.primary, opacity: canContinue && !saving ? 1 : 0.5 }]}
          onPress={handleContinue}
          disabled={!canContinue || saving}
          activeOpacity={0.88}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Continue</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function Section({ label, children, c }: { label: string; children: React.ReactNode; c: typeof C.light }) {
  return (
    <View style={s.section}>
      <Text style={[s.sectionLabel, { color: c.text }]}>{label}</Text>
      {children}
    </View>
  );
}

function OptionCard({ selected, onPress, children, c }: { selected: boolean; onPress: () => void; children: React.ReactNode; c: typeof C.light }) {
  return (
    <TouchableOpacity
      style={[s.optCard, {
        borderColor:     selected ? c.primary : c.border,
        backgroundColor: selected ? c.primary + '10' : c.card,
      }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {children}
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingBottom: 48 },

  header:   { alignItems: 'center', paddingTop: 40, paddingBottom: 28, paddingHorizontal: 28, gap: 10 },
  title:    { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },

  section:      { paddingHorizontal: 20, marginBottom: 28, gap: 10 },
  sectionLabel: { fontSize: 17, fontWeight: '700', marginBottom: 4 },

  optCard:  { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, borderWidth: 1.5, padding: 16 },
  optIcon:  { fontSize: 22 },
  optLabel: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  optSub:   { fontSize: 12 },

  row:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goalChip:   { borderRadius: 14, borderWidth: 1.5, padding: 14, width: '47%', gap: 4 },
  goalLabel:  { fontSize: 16, fontWeight: '700' },
  goalSub:    { fontSize: 12 },

  motivChip:  { borderRadius: 14, borderWidth: 1.5, padding: 12, width: '30%', alignItems: 'center', gap: 6 },
  motivIcon:  { fontSize: 22 },
  motivLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  btn:     { marginHorizontal: 20, height: 58, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
