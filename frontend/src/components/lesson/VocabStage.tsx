/**
 * VocabStage — Stage 1: Vocabulary introduction
 * Shows Arabic word + romanization + image + audio button
 * User swipes/taps through all words before continuing
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, Animated, PanResponder, Dimensions,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAudio } from '../../hooks/useAudio';
import { UnsplashImage } from '../UnsplashImage';

const { width: SCREEN_W } = Dimensions.get('window');

interface Word {
  id: string;
  arabic: string;
  romanization: string;
  english: string;
  audio_prompt: string;
  unsplash_query: string;
  notes?: string;
}

interface Props {
  stage: { words: Word[] };
  onComplete: (score: number, max: number, words: string[]) => void;
}

export function VocabStage({ stage, onComplete }: Props) {
  const { colors } = useTheme();
  const { playTTS } = useAudio();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const word = stage.words[currentIndex];
  const isLast = currentIndex === stage.words.length - 1;

  const animateToNext = (direction: 1 | -1, onDone: () => void) => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: direction * -SCREEN_W, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      translateX.setValue(direction * SCREEN_W);
      opacity.setValue(0);
      onDone();
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  const goNext = () => {
    if (isLast) {
      const wordIds = stage.words.map((w) => w.arabic);
      onComplete(5, 5, wordIds);
      return;
    }
    animateToNext(1, () => {
      setCurrentIndex((i) => i + 1);
      setRevealed(false);
    });
  };

  const goPrev = () => {
    if (currentIndex === 0) return;
    animateToNext(-1, () => {
      setCurrentIndex((i) => i - 1);
      setRevealed(false);
    });
  };

  const handleAudio = async () => {
    await playTTS(word.audio_prompt || word.arabic);
  };

  return (
    <View style={styles.container}>

      {/* Word counter */}
      <View style={styles.dots}>
        {stage.words.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === currentIndex ? colors.primary : colors.border },
              i < currentIndex && { backgroundColor: colors.primary + '60' },
            ]}
          />
        ))}
      </View>

      {/* Animated card */}
      <Animated.View style={[styles.card, { backgroundColor: colors.card, transform: [{ translateX }], opacity }]}>

        {/* Unsplash image */}
        <UnsplashImage
          query={word.unsplash_query}
          style={styles.image}
          fallbackEmoji="📖"
        />

        {/* Arabic word — large, RTL */}
        <Text style={[styles.arabic, { color: colors.text }]} writingDirection="rtl">
          {word.arabic}
        </Text>

        {/* Romanization */}
        <Text style={[styles.romanization, { color: colors.primary }]}>
          {word.romanization}
        </Text>

        {/* English translation */}
        <Text style={[styles.english, { color: colors.textSecondary }]}>
          {word.english}
        </Text>

        {/* Audio button */}
        <TouchableOpacity style={[styles.audioBtn, { backgroundColor: colors.primary + '15' }]} onPress={handleAudio}>
          <Text style={styles.audioIcon}>🔊</Text>
          <Text style={[styles.audioText, { color: colors.primary }]}>Hear it</Text>
        </TouchableOpacity>

        {/* Cultural/linguistic note */}
        {word.notes && (
          <View style={[styles.noteBox, { backgroundColor: colors.accent + '12' }]}>
            <Text style={[styles.noteText, { color: colors.textSecondary }]}>
              💡 {word.notes}
            </Text>
          </View>
        )}
      </Animated.View>

      {/* Navigation buttons */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navBtn, { opacity: currentIndex === 0 ? 0.3 : 1 }]}
          onPress={goPrev}
          disabled={currentIndex === 0}
        >
          <Text style={[styles.navBtnText, { color: colors.textSecondary }]}>← Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.primary }]}
          onPress={goNext}
        >
          <Text style={styles.nextBtnText}>
            {isLast ? 'Got it! →' : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress indicator */}
      <Text style={[styles.progressText, { color: colors.textSecondary }]}>
        {currentIndex + 1} / {stage.words.length} words
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  card: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
    minHeight: 380,
  },
  image: { width: '100%', height: 160, borderRadius: 12, marginBottom: 20 },
  arabic: {
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
    lineHeight: 72,
  },
  romanization: { fontSize: 22, fontWeight: '600', marginTop: 4 },
  english: { fontSize: 18, marginTop: 6, marginBottom: 16 },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    marginBottom: 12,
  },
  audioIcon: { fontSize: 20 },
  audioText: { fontSize: 15, fontWeight: '600' },
  noteBox: { borderRadius: 10, padding: 12, marginTop: 4, width: '100%' },
  noteText: { fontSize: 13, lineHeight: 18 },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  navBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  navBtnText: { fontSize: 15 },
  nextBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  progressText: { textAlign: 'center', fontSize: 13, marginTop: 12 },
});
