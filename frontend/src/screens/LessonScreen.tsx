/**
 * LessonScreen — Full 4-stage lesson flow
 * Stages: Vocab Intro → Exercises → Dialogue → Quiz
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Animated, Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { useLearningStore } from '../store/learningStore';
import { VocabStage } from '../components/lesson/VocabStage';
import { ExerciseStage } from '../components/lesson/ExerciseStage';
import { DialogueStage } from '../components/lesson/DialogueStage';
import { QuizStage } from '../components/lesson/QuizStage';
import { LessonComplete } from '../components/lesson/LessonComplete';
import { ProgressBar } from '../components/ProgressBar';
import { api } from '../services/api';
import type { RootStackParamList } from '../navigation/types';

type LessonRoute = RouteProp<RootStackParamList, 'Lesson'>;

const STAGE_LABELS = ['Vocabulary', 'Exercises', 'Dialogue', 'Quiz'];

export function LessonScreen() {
  const route = useRoute<LessonRoute>();
  const nav = useNavigation();
  const { colors } = useTheme();
  const { user, completeLesson } = useLearningStore();

  const { lessonId } = route.params;
  const [lesson, setLesson] = useState<any>(null);
  const [stageIndex, setStageIndex] = useState(0);     // 0–3
  const [totalScore, setTotalScore] = useState(0);
  const [maxScore, setMaxScore] = useState(100);
  const [wordsStudied, setWordsStudied] = useState<string[]>([]);
  const [startTime] = useState(Date.now());
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    api.lessons.getLesson(lessonId).then((data) => {
      setLesson(data);
      setLoading(false);
    });
  }, [lessonId]);

  useEffect(() => {
    if (!lesson) return;
    const pct = stageIndex / lesson.stages.length;
    Animated.timing(progressAnim, {
      toValue: pct,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [stageIndex, lesson]);

  const handleStageComplete = (stageScore: number, stageMax: number, words?: string[]) => {
    setTotalScore((s) => s + stageScore);
    setMaxScore((m) => m + stageMax);
    if (words) setWordsStudied((w) => [...w, ...words]);

    if (stageIndex < lesson.stages.length - 1) {
      setStageIndex((i) => i + 1);
    } else {
      finishLesson();
    }
  };

  const finishLesson = async () => {
    const timeSec = Math.round((Date.now() - startTime) / 1000);
    const pct = Math.round((totalScore / Math.max(maxScore, 1)) * 100);
    const xp = lesson.xp_reward;

    try {
      await api.lessons.completeLesson(lessonId, {
        user_id: user!.id,
        lesson_id: lessonId,
        score: pct,
        time_spent_sec: timeSec,
        xp_earned: xp,
        words_studied: wordsStudied,
      });
      completeLesson(lessonId, xp);
    } catch (e) {
      console.warn('Failed to sync lesson completion', e);
    }
    setIsComplete(true);
  };

  const handleExit = () => {
    Alert.alert(
      'Leave Lesson?',
      'Your progress will be lost.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => nav.goBack() },
      ]
    );
  };

  if (loading || !lesson) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={[styles.loading, { color: colors.textSecondary }]}>Loading lesson...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isComplete) {
    return (
      <LessonComplete
        lesson={lesson}
        score={Math.round((totalScore / Math.max(maxScore, 1)) * 100)}
        xpEarned={lesson.xp_reward}
        onContinue={() => nav.navigate('Review' as never)}
        onHome={() => nav.navigate('Home' as never)}
      />
    );
  }

  const currentStage = lesson.stages[stageIndex];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleExit} style={styles.exitBtn}>
          <Text style={[styles.exitText, { color: colors.textSecondary }]}>✕</Text>
        </TouchableOpacity>
        <View style={styles.progressWrap}>
          <ProgressBar
            progress={stageIndex / lesson.stages.length}
            color={colors.primary}
          />
        </View>
        <Text style={[styles.stageLabel, { color: colors.textSecondary }]}>
          {STAGE_LABELS[stageIndex]}
        </Text>
      </View>

      {/* Stage content */}
      <View style={styles.content}>
        {currentStage.type === 'vocabulary_intro' && (
          <VocabStage
            stage={currentStage}
            onComplete={(score, max, words) => handleStageComplete(score, max, words)}
          />
        )}
        {currentStage.type === 'exercises' && (
          <ExerciseStage
            stage={currentStage}
            onComplete={(score, max) => handleStageComplete(score, max)}
          />
        )}
        {currentStage.type === 'dialogue' && (
          <DialogueStage
            stage={currentStage}
            onComplete={(score, max) => handleStageComplete(score, max)}
          />
        )}
        {currentStage.type === 'quiz' && (
          <QuizStage
            stage={currentStage}
            onComplete={(score, max) => handleStageComplete(score, max)}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  exitBtn: { padding: 4 },
  exitText: { fontSize: 20, fontWeight: '700' },
  progressWrap: { flex: 1 },
  stageLabel: { fontSize: 12, minWidth: 60, textAlign: 'right' },
  content: { flex: 1, paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loading: { fontSize: 16 },
});
