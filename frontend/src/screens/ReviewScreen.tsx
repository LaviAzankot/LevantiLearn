/**
 * ReviewScreen — Spaced Repetition daily review
 * Shows flashcards for due words, 4-button ease rating (SM-2)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Animated, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { useLearningStore } from '../store/learningStore';
import { useAudio } from '../hooks/useAudio';
import { api } from '../services/api';

const { height: SCREEN_H } = Dimensions.get('window');

type EaseButton = 'hard' | 'ok' | 'good' | 'easy';

const EASE_BUTTONS: { key: EaseButton; label: string; emoji: string; color: string }[] = [
  { key: 'hard',  label: 'Hard',  emoji: '😰', color: '#e74c3c' },
  { key: 'ok',    label: 'OK',    emoji: '😐', color: '#e67e22' },
  { key: 'good',  label: 'Good',  emoji: '🙂', color: '#27ae60' },
  { key: 'easy',  label: 'Easy',  emoji: '😄', color: '#2980b9' },
];

interface SRSCard {
  word_id: string;
  arabic: string;
  romanization: string;
  english: string;
  interval_days: number;
}

export function ReviewScreen() {
  const nav = useNavigation();
  const { colors } = useTheme();
  const { user, srsCards, updateSRSCard, decrementDueCount } = useLearningStore();
  const { playTTS } = useAudio();

  const [cards, setCards] = useState<SRSCard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const flipAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Load due SRS cards
    api.progress.getDueCards(user!.id).then((data) => {
      setCards(data.cards ?? []);
    });
  }, []);

  const flipCard = () => {
    if (revealed) return;
    Animated.spring(flipAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    setRevealed(true);
    playTTS(cards[index]?.romanization ?? '');
  };

  const handleEase = async (ease: EaseButton) => {
    const card = cards[index];
    const isGood = ease === 'good' || ease === 'easy';
    if (isGood) setCorrectCount((c) => c + 1);

    try {
      const result = await api.progress.reviewCard(user!.id, card.word_id, ease);
      updateSRSCard(card.word_id, result);
      decrementDueCount();
    } catch (e) {
      console.warn('Failed to sync SRS review', e);
    }

    // Animate to next card
    Animated.timing(slideAnim, { toValue: -SCREEN_H, duration: 250, useNativeDriver: true }).start(() => {
      slideAnim.setValue(SCREEN_H);
      flipAnim.setValue(0);
      setRevealed(false);

      if (index < cards.length - 1) {
        setIndex((i) => i + 1);
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      } else {
        setSessionDone(true);
      }
    });
  };

  if (!cards.length || sessionDone) {
    return <ReviewComplete correct={correctCount} total={cards.length} onHome={() => nav.goBack()} />;
  }

  const card = cards[index];

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const frontOpacity = flipAnim.interpolate({ inputRange: [0.4, 0.5], outputRange: [1, 0] });
  const backOpacity = flipAnim.interpolate({ inputRange: [0.4, 0.5], outputRange: [0, 1] });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>← Done</Text>
        </TouchableOpacity>
        <Text style={[styles.progress, { color: colors.textSecondary }]}>
          {index + 1} / {cards.length}
        </Text>
      </View>

      {/* Card */}
      <Animated.View style={[styles.cardWrap, { transform: [{ translateY: slideAnim }] }]}>

        {/* Front: Arabic only */}
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: colors.card },
            { opacity: frontOpacity, transform: [{ rotateX: frontRotate }] },
          ]}
        >
          <TouchableOpacity style={styles.cardInner} onPress={flipCard} activeOpacity={0.9}>
            <Text style={[styles.cardArabic, { color: colors.text }]} writingDirection="rtl">
              {card.arabic}
            </Text>
            <Text style={[styles.tapHint, { color: colors.textSecondary }]}>
              Tap to reveal
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Back: Arabic + translation + audio */}
        <Animated.View
          style={[
            styles.card, styles.cardBack,
            { backgroundColor: colors.card },
            { opacity: backOpacity, transform: [{ rotateX: backRotate }] },
          ]}
        >
          <Text style={[styles.cardArabic, { color: colors.text }]} writingDirection="rtl">
            {card.arabic}
          </Text>
          <Text style={[styles.cardRom, { color: colors.primary }]}>{card.romanization}</Text>
          <Text style={[styles.cardEnglish, { color: colors.textSecondary }]}>{card.english}</Text>
          <TouchableOpacity
            style={[styles.audioBtn, { backgroundColor: colors.primary + '15' }]}
            onPress={() => playTTS(card.romanization)}
          >
            <Text style={{ fontSize: 20 }}>🔊</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Ease buttons — only show after reveal */}
      {revealed && (
        <View style={styles.easeRow}>
          <Text style={[styles.easeLabel, { color: colors.textSecondary }]}>
            How well did you know this?
          </Text>
          <View style={styles.easeButtons}>
            {EASE_BUTTONS.map((btn) => (
              <TouchableOpacity
                key={btn.key}
                style={[styles.easeBtn, { backgroundColor: btn.color + '18', borderColor: btn.color }]}
                onPress={() => handleEase(btn.key)}
              >
                <Text style={styles.easeEmoji}>{btn.emoji}</Text>
                <Text style={[styles.easeBtnText, { color: btn.color }]}>{btn.label}</Text>
                <Text style={[styles.easeInterval, { color: colors.textSecondary }]}>
                  {btn.key === 'hard' ? '1d' : btn.key === 'ok' ? '3d' : btn.key === 'good' ? '7d' : '14d'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {!revealed && (
        <TouchableOpacity
          style={[styles.revealBtn, { backgroundColor: colors.primary }]}
          onPress={flipCard}
        >
          <Text style={styles.revealBtnText}>Reveal Answer</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

function ReviewComplete({
  correct, total, onHome,
}: { correct: number; total: number; onHome: () => void }) {
  const { colors } = useTheme();
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.completeWrap}>
        <Text style={styles.completeEmoji}>🎉</Text>
        <Text style={[styles.completeTitle, { color: colors.text }]}>Review Complete!</Text>
        <Text style={[styles.completeSub, { color: colors.textSecondary }]}>
          {correct} / {total} correct ({pct}%)
        </Text>
        <View style={[styles.xpBadge, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.xpText, { color: colors.primary }]}>+{total * 5} XP earned</Text>
        </View>
        <TouchableOpacity
          style={[styles.revealBtn, { backgroundColor: colors.primary, marginTop: 32 }]}
          onPress={onHome}
        >
          <Text style={styles.revealBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  backText: { fontSize: 16 },
  progress: { fontSize: 14 },
  cardWrap: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  card: {
    borderRadius: 24, minHeight: 280,
    shadowColor: '#000', shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 6,
    backfaceVisibility: 'hidden',
  },
  cardBack: { position: 'absolute', top: 0, left: 0, right: 0 },
  cardInner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  cardArabic: { fontSize: 52, fontWeight: '700', textAlign: 'center', lineHeight: 72 },
  cardRom: { fontSize: 24, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  cardEnglish: { fontSize: 20, marginTop: 6, textAlign: 'center' },
  tapHint: { fontSize: 14, marginTop: 20 },
  audioBtn: { marginTop: 16, padding: 12, borderRadius: 24 },
  easeRow: { paddingHorizontal: 20, paddingBottom: 32 },
  easeLabel: { textAlign: 'center', fontSize: 14, marginBottom: 12 },
  easeButtons: { flexDirection: 'row', gap: 10 },
  easeBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1.5 },
  easeEmoji: { fontSize: 22 },
  easeBtnText: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  easeInterval: { fontSize: 11, marginTop: 2 },
  revealBtn: { marginHorizontal: 20, marginBottom: 32, paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  revealBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  completeWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  completeEmoji: { fontSize: 64 },
  completeTitle: { fontSize: 28, fontWeight: '800', marginTop: 16 },
  completeSub: { fontSize: 18, marginTop: 8 },
  xpBadge: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24 },
  xpText: { fontSize: 18, fontWeight: '700' },
});
