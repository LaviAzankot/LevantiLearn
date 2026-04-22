/**
 * LevantiLearn — Daily Review (SRS Flashcard)
 * Design tokens aligned with lesson/index screens.
 * English UI, Arabic learning content.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    wrong:   '#b31b25',
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
    wrong:   '#F87171',
  },
};

const DEMO_CARDS = [
  { word_id: 'w1', arabic: 'مَرْحَبا',          pron: 'mar·ḥa·bā',      english: 'Hello / Hi',       strength: 0 },
  { word_id: 'w2', arabic: 'شُكْراً',            pron: 'shuk·ran',        english: 'Thank you',        strength: 1 },
  { word_id: 'w3', arabic: 'قَهْوَة',            pron: 'qah·weh',         english: 'Coffee',           strength: 2 },
  { word_id: 'w4', arabic: 'يَلَّا',             pron: 'yal·lā',          english: 'Let\'s go! / Come on', strength: 0 },
  { word_id: 'w5', arabic: 'مَعَ السَّلامَة',   pron: 'maʿ as·sa·lā·meh', english: 'Goodbye',         strength: 1 },
];

const STRENGTH_LABELS = ['Weak', 'Medium', 'Strong'];
const STRENGTH_COLORS = ['#EF4444', '#F59E0B', '#00675f'];

const EASE_BUTTONS = [
  { key: 'hard', icon: 'sad-outline',    label: 'Hard',  color: '#EF4444', next: '1d'  },
  { key: 'ok',   icon: 'remove-outline', label: 'OK',    color: '#F59E0B', next: '3d'  },
  { key: 'good', icon: 'happy-outline',  label: 'Good',  color: '#00675f', next: '7d'  },
  { key: 'easy', icon: 'sunny-outline',  label: 'Easy',  color: '#3B82F6', next: '14d' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
export default function ReviewTab() {
  const scheme = useColorScheme();
  const c      = C[scheme === 'dark' ? 'dark' : 'light'];

  const [index,    setIndex]   = useState(0);
  const [revealed, setReveal]  = useState(false);
  const [done,     setDone]    = useState(false);
  const [correct,  setCorrect] = useState(0);

  // Flip animation
  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(flipAnim, {
      toValue: revealed ? 1 : 0,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [revealed]);

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });
  const backRotate  = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] });

  const card     = DEMO_CARDS[index];
  const progress = (index + (revealed ? 0.5 : 0)) / DEMO_CARDS.length;
  const strength = card.strength;

  const handleEase = (key: string) => {
    if (key === 'good' || key === 'easy') setCorrect(n => n + 1);
    if (index < DEMO_CARDS.length - 1) {
      setIndex(i => i + 1);
      setReveal(false);
    } else {
      setDone(true);
    }
  };

  // ── Done screen ────────────────────────────────────────────────────────────
  if (done) {
    const pct = Math.round((correct / DEMO_CARDS.length) * 100);
    const isGood = pct >= 70;
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: c.bg }]}>
        <View style={s.doneWrap}>
          <View style={[s.doneIconWrap, { backgroundColor: isGood ? c.right + '18' : c.wrong + '12' }]}>
            <Ionicons name={isGood ? 'checkmark-circle' : 'star-outline'} size={64}
              color={isGood ? c.right : c.primary} />
          </View>

          <Text style={[s.doneTitle, { color: c.text }]}>Review Done!</Text>
          <Text style={[s.doneSub, { color: c.label }]}>
            {correct} of {DEMO_CARDS.length} correct
          </Text>

          <View style={[s.scoreRing, { borderColor: isGood ? c.right : c.primary }]}>
            <Text style={[s.scoreNum, { color: isGood ? c.right : c.primary }]}>{pct}%</Text>
            <Text style={[s.scoreLabel, { color: c.label }]}>accuracy</Text>
          </View>

          <View style={[s.xpPill, { backgroundColor: c.primary }]}>
            <Ionicons name="flash" size={16} color="#fff" />
            <Text style={s.xpText}>+{DEMO_CARDS.length * 5} XP</Text>
          </View>

          <TouchableOpacity
            style={[s.btn, { backgroundColor: c.primary, marginTop: 8 }]}
            onPress={() => { setIndex(0); setReveal(false); setDone(false); setCorrect(0); }}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={s.btnText}>Review again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main review screen ─────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.bg }]}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={[s.headerTitle, { color: c.text }]}>Daily Review</Text>
          <Text style={[s.headerSub, { color: c.label }]}>
            {index + 1} of {DEMO_CARDS.length} cards
          </Text>
        </View>
        <View style={[s.dueBadge, { backgroundColor: c.primary }]}>
          <Text style={s.dueBadgeText}>{DEMO_CARDS.length - index} left</Text>
        </View>
      </View>

      {/* ── Progress bar ── */}
      <View style={[s.progressTrack, { backgroundColor: c.border }]}>
        <View style={[s.progressFill, {
          width: `${progress * 100}%` as any,
          backgroundColor: c.primary,
          shadowColor: c.primary, shadowOpacity: 0.4,
          shadowOffset: { width: 0, height: 0 }, shadowRadius: 6,
        }]} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Strength legend ── */}
        <View style={s.legendRow}>
          {STRENGTH_LABELS.map((lbl, i) => (
            <View key={lbl} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: STRENGTH_COLORS[i] }]} />
              <Text style={[s.legendText, { color: c.label }]}>{lbl}</Text>
            </View>
          ))}
        </View>

        {/* ── Flashcard ── */}
        <View style={s.cardContainer}>
          {/* Front face */}
          <Animated.View style={[
            s.card, { backgroundColor: c.card, borderColor: c.border },
            { transform: [{ rotateY: frontRotate }] },
            revealed && { position: 'absolute', width: '100%' },
          ]}>
            {/* Strength tag */}
            <View style={[s.strengthTag, {
              backgroundColor: STRENGTH_COLORS[strength] + '20',
              borderColor:     STRENGTH_COLORS[strength],
            }]}>
              <Text style={[s.strengthTagText, { color: STRENGTH_COLORS[strength] }]}>
                {STRENGTH_LABELS[strength]}
              </Text>
            </View>

            <Text style={[s.arabicWord, { color: c.text }]}>{card.arabic}</Text>
            <Text style={[s.arabicHint, { color: c.label }]}>Levantine Arabic</Text>

            {!revealed && (
              <TouchableOpacity
                style={[s.revealBtn, { backgroundColor: c.primary + '18', borderColor: c.primary + '40' }]}
                onPress={() => setReveal(true)}
                activeOpacity={0.82}
              >
                <Ionicons name="eye-outline" size={18} color={c.primary} />
                <Text style={[s.revealBtnText, { color: c.primary }]}>Reveal</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Back face */}
          {revealed && (
            <Animated.View style={[
              s.card, { backgroundColor: c.card, borderColor: c.primary + '40' },
              { transform: [{ rotateY: backRotate }] },
            ]}>
              <View style={[s.strengthTag, {
                backgroundColor: STRENGTH_COLORS[strength] + '20',
                borderColor:     STRENGTH_COLORS[strength],
              }]}>
                <Text style={[s.strengthTagText, { color: STRENGTH_COLORS[strength] }]}>
                  {STRENGTH_LABELS[strength]}
                </Text>
              </View>

              <Text style={[s.arabicWord, { color: c.text }]}>{card.arabic}</Text>

              <View style={[s.separator, { backgroundColor: c.border }]} />

              <Text style={[s.pron, { color: c.primary }]}>[{card.pron}]</Text>
              <Text style={[s.english, { color: c.text }]}>{card.english}</Text>
            </Animated.View>
          )}
        </View>

        {/* ── Action buttons ── */}
        {revealed ? (
          <View style={s.easeSection}>
            <Text style={[s.easePrompt, { color: c.label }]}>How well did you know it?</Text>
            <View style={s.easeRow}>
              {EASE_BUTTONS.map(btn => (
                <TouchableOpacity
                  key={btn.key}
                  style={[s.easeBtn, {
                    backgroundColor: btn.color + '12',
                    borderColor:     btn.color,
                    shadowColor:     btn.color,
                  }]}
                  onPress={() => handleEase(btn.key)}
                  activeOpacity={0.82}
                >
                  <Ionicons name={btn.icon as any} size={22} color={btn.color} />
                  <Text style={[s.easeBtnLabel, { color: btn.color }]}>{btn.label}</Text>
                  <Text style={[s.easeBtnNext, { color: c.label }]}>{btn.next}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[s.btn, { backgroundColor: c.primary, marginHorizontal: 24 }]}
            onPress={() => setReveal(true)}
            activeOpacity={0.88}
          >
            <Text style={s.btnText}>Reveal answer</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:         { flex: 1 },
  scroll:       { paddingBottom: 36 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  headerSub:   { fontSize: 13, fontWeight: '500', marginTop: 2 },
  dueBadge: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50,
  },
  dueBadgeText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Progress bar
  progressTrack: { height: 4, marginHorizontal: 24, borderRadius: 2, overflow: 'hidden', marginBottom: 12 },
  progressFill:  { height: '100%', borderRadius: 2 },

  // Legend
  legendRow:  { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontWeight: '500' },

  // Card
  cardContainer: { marginHorizontal: 24, marginBottom: 20, minHeight: 280 },
  card: {
    borderRadius: 28, borderWidth: 1.5, padding: 36,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 }, shadowRadius: 20, elevation: 4,
    backfaceVisibility: 'hidden',
  },
  strengthTag: {
    position: 'absolute', top: 16, left: 16,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1,
  },
  strengthTagText: { fontSize: 11, fontWeight: '700' },
  arabicWord:  { fontSize: 56, fontWeight: '700', textAlign: 'center', lineHeight: 80 },
  arabicHint:  { fontSize: 13, marginTop: 6 },
  separator:   { height: 1.5, width: '60%', marginVertical: 18 },
  pron:        { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  english:     { fontSize: 26, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center' },

  revealBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 20, paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 50, borderWidth: 1.5,
  },
  revealBtnText: { fontSize: 15, fontWeight: '700' },

  // Ease buttons
  easeSection: { paddingHorizontal: 24, marginTop: 4 },
  easePrompt:  { textAlign: 'center', fontSize: 14, fontWeight: '600', marginBottom: 14 },
  easeRow:     { flexDirection: 'row', gap: 10 },
  easeBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 18, borderWidth: 1.5,
    shadowOpacity: 0.14, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 3,
  },
  easeBtnLabel: { fontSize: 12, fontWeight: '800', marginTop: 5 },
  easeBtnNext:  { fontSize: 11, marginTop: 2 },

  // Generic button
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 18,
    shadowOpacity: 0.2, shadowOffset: { width: 0, height: 5 }, shadowRadius: 14, elevation: 5,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Done screen
  doneWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 36, gap: 16,
  },
  doneIconWrap: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  doneTitle:    { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  doneSub:      { fontSize: 16, fontWeight: '500' },
  scoreRing: {
    width: 110, height: 110, borderRadius: 55, borderWidth: 5,
    alignItems: 'center', justifyContent: 'center', marginVertical: 4,
  },
  scoreNum:   { fontSize: 28, fontWeight: '800' },
  scoreLabel: { fontSize: 12, marginTop: 1 },
  xpPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 28, paddingVertical: 10, borderRadius: 50,
  },
  xpText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
