/**
 * ExerciseStage — Stage 2: Interactive exercises
 * Supports: match_word_to_translation, fill_in_blank,
 *           listen_and_select, pronunciation_repeat
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Alert,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAudio } from '../../hooks/useAudio';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { api } from '../../services/api';
import { shuffle } from '../../utils/array';

interface Exercise {
  id: string;
  type: string;
  question_word?: string;
  question_romanization?: string;
  correct_answer: string;
  correct_rom?: string;
  distractors: string[];
  prompt_en?: string;
  prompt_ar?: string;
  audio_prompt?: string;
  instruction?: string;
  target_phrase_ar?: string;
  target_phrase_rom?: string;
  target_phrase_en?: string;
  feedback_correct: string;
  feedback_wrong: string;
  scoring_threshold?: number;
}

interface Props {
  stage: { exercises: Exercise[] };
  onComplete: (score: number, max: number) => void;
}

export function ExerciseStage({ stage, onComplete }: Props) {
  const { colors } = useTheme();
  const [exIndex, setExIndex] = useState(0);
  const [answered, setAnswered] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const feedbackAnim = useRef(new Animated.Value(0)).current;

  const ex = stage.exercises[exIndex];
  const isLast = exIndex === stage.exercises.length - 1;

  const allOptions = shuffle([ex.correct_answer, ...ex.distractors]);

  const handleAnswer = (choice: string) => {
    if (answered !== null) return; // already answered
    const correct = choice === ex.correct_answer;
    setAnswered(choice);
    setIsCorrect(correct);
    if (correct) setScore((s) => s + 1);

    Animated.spring(feedbackAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const handleNext = () => {
    feedbackAnim.setValue(0);
    setAnswered(null);
    setIsCorrect(null);

    if (isLast) {
      onComplete(score, stage.exercises.length);
    } else {
      setExIndex((i) => i + 1);
    }
  };

  const getOptionStyle = (option: string) => {
    if (answered === null) return [styles.option, { backgroundColor: colors.card, borderColor: colors.border }];
    if (option === ex.correct_answer) return [styles.option, styles.optionCorrect];
    if (option === answered && !isCorrect) return [styles.option, styles.optionWrong];
    return [styles.option, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.5 }];
  };

  return (
    <View style={styles.container}>

      {/* Exercise counter */}
      <Text style={[styles.counter, { color: colors.textSecondary }]}>
        Exercise {exIndex + 1} of {stage.exercises.length}
      </Text>

      {/* Exercise card */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>

        {ex.type === 'match_word_to_translation' && (
          <MatchExercise ex={ex} colors={colors} />
        )}
        {ex.type === 'fill_in_blank' && (
          <FillBlankExercise ex={ex} colors={colors} />
        )}
        {ex.type === 'listen_and_select' && (
          <ListenSelectExercise ex={ex} colors={colors} />
        )}
        {ex.type === 'pronunciation_repeat' && (
          <PronunciationExercise
            ex={ex}
            colors={colors}
            onScore={(correct) => {
              setAnswered(correct ? ex.correct_answer : 'wrong');
              setIsCorrect(correct);
              if (correct) setScore((s) => s + 1);
            }}
            answered={answered}
          />
        )}
      </View>

      {/* Answer options (for non-pronunciation types) */}
      {ex.type !== 'pronunciation_repeat' && (
        <View style={styles.options}>
          {allOptions.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={getOptionStyle(opt)}
              onPress={() => handleAnswer(opt)}
              disabled={answered !== null}
            >
              <Text style={[
                styles.optionText,
                { color: colors.text },
                opt === ex.correct_answer && answered !== null && { color: '#2d8a4e', fontWeight: '700' },
                opt === answered && !isCorrect && { color: '#c0392b', fontWeight: '700' },
              ]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Feedback bar */}
      {answered !== null && (
        <Animated.View
          style={[
            styles.feedbackBar,
            isCorrect ? styles.feedbackCorrect : styles.feedbackWrong,
            { transform: [{ scale: feedbackAnim }] },
          ]}
        >
          <Text style={styles.feedbackIcon}>{isCorrect ? '✅' : '❌'}</Text>
          <Text style={styles.feedbackText}>
            {isCorrect ? ex.feedback_correct : ex.feedback_wrong}
          </Text>
        </Animated.View>
      )}

      {/* Continue button */}
      {answered !== null && (
        <TouchableOpacity
          style={[styles.continueBtn, { backgroundColor: isCorrect ? '#2d8a4e' : colors.primary }]}
          onPress={handleNext}
        >
          <Text style={styles.continueBtnText}>
            {isLast ? 'Finish Exercises' : 'Continue →'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function MatchExercise({ ex, colors }: { ex: Exercise; colors: any }) {
  return (
    <View style={styles.matchContent}>
      <Text style={[styles.questionArabic, { color: colors.text }]} writingDirection="rtl">
        {ex.question_word}
      </Text>
      {ex.question_romanization && (
        <Text style={[styles.questionRom, { color: colors.primary }]}>{ex.question_romanization}</Text>
      )}
      <Text style={[styles.questionPrompt, { color: colors.textSecondary }]}>
        Select the correct translation
      </Text>
    </View>
  );
}

function FillBlankExercise({ ex, colors }: { ex: Exercise; colors: any }) {
  return (
    <View style={styles.matchContent}>
      <Text style={[styles.questionPrompt, { color: colors.textSecondary }]}>{ex.prompt_en}</Text>
      {ex.prompt_ar && (
        <Text style={[styles.questionArabic, { color: colors.text }]} writingDirection="rtl">
          {ex.prompt_ar}
        </Text>
      )}
    </View>
  );
}

function ListenSelectExercise({ ex, colors }: { ex: Exercise; colors: any }) {
  const { playTTS } = useAudio();
  return (
    <View style={styles.matchContent}>
      <Text style={[styles.questionPrompt, { color: colors.textSecondary }]}>
        {ex.instruction ?? 'Listen and select what you heard'}
      </Text>
      <TouchableOpacity
        style={[styles.bigAudioBtn, { backgroundColor: colors.primary }]}
        onPress={() => playTTS(ex.audio_prompt ?? '')}
      >
        <Text style={styles.bigAudioIcon}>🔊</Text>
        <Text style={styles.bigAudioText}>Play Audio</Text>
      </TouchableOpacity>
    </View>
  );
}

function PronunciationExercise({
  ex, colors, onScore, answered,
}: {
  ex: Exercise;
  colors: any;
  onScore: (correct: boolean) => void;
  answered: string | null;
}) {
  const { playTTS } = useAudio();
  const { startRecording, stopRecording, isRecording } = useSpeechRecognition();
  const [scoreResult, setScoreResult] = useState<number | null>(null);

  const handleRecord = async () => {
    if (isRecording) {
      const audioBlob = await stopRecording();
      const result = await api.stt.scorePronunciation(
        audioBlob,
        ex.target_phrase_ar!,
        ex.target_phrase_rom!,
      );
      setScoreResult(Math.round(result.score * 100));
      onScore(result.score >= (ex.scoring_threshold ?? 0.7));
    } else {
      await startRecording();
    }
  };

  return (
    <View style={styles.matchContent}>
      <Text style={[styles.questionArabic, { color: colors.text }]} writingDirection="rtl">
        {ex.target_phrase_ar}
      </Text>
      <Text style={[styles.questionRom, { color: colors.primary }]}>{ex.target_phrase_rom}</Text>
      <Text style={[styles.questionPrompt, { color: colors.textSecondary }]}>{ex.target_phrase_en}</Text>

      <TouchableOpacity
        style={[styles.bigAudioBtn, { backgroundColor: colors.accent + '20' }]}
        onPress={() => playTTS(ex.target_phrase_rom ?? '')}
      >
        <Text style={styles.bigAudioIcon}>🔊</Text>
        <Text style={[styles.bigAudioText, { color: colors.accent }]}>Listen first</Text>
      </TouchableOpacity>

      {answered === null && (
        <TouchableOpacity
          style={[styles.micBtn, { backgroundColor: isRecording ? '#e74c3c' : colors.primary }]}
          onPress={handleRecord}
        >
          <Text style={styles.micBtnText}>{isRecording ? '⏹ Stop' : '🎤 Speak'}</Text>
        </TouchableOpacity>
      )}

      {scoreResult !== null && (
        <View style={styles.scoreWrap}>
          <Text style={[styles.scoreText, { color: colors.text }]}>
            Score: {scoreResult}% {scoreResult >= 70 ? '🌟' : '📢'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },
  counter: { textAlign: 'center', fontSize: 13, marginBottom: 12 },
  card: {
    borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 3,
    marginBottom: 16,
  },
  matchContent: { alignItems: 'center', gap: 8 },
  questionArabic: { fontSize: 42, fontWeight: '700', textAlign: 'center', lineHeight: 60 },
  questionRom: { fontSize: 20, fontWeight: '600' },
  questionPrompt: { fontSize: 15, textAlign: 'center' },
  bigAudioBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 24, gap: 8, marginTop: 8,
  },
  bigAudioIcon: { fontSize: 22 },
  bigAudioText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  micBtn: {
    paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 28, marginTop: 12,
  },
  micBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  scoreWrap: { marginTop: 12, alignItems: 'center' },
  scoreText: { fontSize: 18, fontWeight: '700' },
  options: { gap: 10 },
  option: {
    paddingVertical: 16, paddingHorizontal: 20,
    borderRadius: 14, borderWidth: 2,
  },
  optionCorrect: { backgroundColor: '#e8f5e9', borderColor: '#2d8a4e' },
  optionWrong: { backgroundColor: '#fde8e8', borderColor: '#c0392b' },
  optionText: { fontSize: 16, textAlign: 'center' },
  feedbackBar: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 14, borderRadius: 14, marginTop: 12, gap: 10,
  },
  feedbackCorrect: { backgroundColor: '#e8f5e9' },
  feedbackWrong: { backgroundColor: '#fde8e8' },
  feedbackIcon: { fontSize: 20 },
  feedbackText: { flex: 1, fontSize: 14, lineHeight: 20 },
  continueBtn: {
    marginTop: 16, paddingVertical: 16,
    borderRadius: 14, alignItems: 'center',
  },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
