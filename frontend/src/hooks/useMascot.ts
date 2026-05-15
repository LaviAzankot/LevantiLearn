import { useState, useCallback } from 'react';
import {
  MASCOT_IMAGES,
  MascotKey,
  MascotState,
  resolveMascot,
} from '../constants/mascotConfig';

export interface MascotAPI {
  mascotState:      MascotState;
  mascotImage:      ReturnType<typeof require>;
  bubbleText:       string;
  streakCount:      number;
  onCorrectAnswer:  () => void;
  onWrongAnswer:    () => void;
  onLessonStart:    () => void;
  onLessonComplete: () => void;
}

function streakToState(streak: number): MascotState {
  if (streak >= 10) return 'streak10';
  if (streak >= 5)  return 'streak5';
  if (streak >= 3)  return 'streak3';
  return 'correct';
}

export function useMascot(): MascotAPI {
  const [mascotState, setMascotState]   = useState<MascotState>('idle');
  const [mascotKey,   setMascotKey]     = useState<MascotKey>('default');
  const [bubbleText,  setBubbleText]    = useState('Ready?');
  const [streakCount, setStreakCount]   = useState(0);
  const [wrongCount,  setWrongCount]    = useState(0);

  const apply = useCallback((state: MascotState) => {
    const { image, text } = resolveMascot(state);
    setMascotState(state);
    setMascotKey(image);
    setBubbleText(text);
  }, []);

  const onCorrectAnswer = useCallback(() => {
    setStreakCount(prev => {
      const next = prev + 1;
      apply(streakToState(next));
      return next;
    });
  }, [apply]);

  const onWrongAnswer = useCallback(() => {
    setStreakCount(0);
    setWrongCount(prev => prev + 1);
    apply('wrong');
  }, [apply]);

  const onLessonStart = useCallback(() => {
    setStreakCount(0);
    setWrongCount(0);
    apply('idle');
  }, [apply]);

  const onLessonComplete = useCallback(() => {
    apply(wrongCount === 0 ? 'perfect' : 'complete');
  }, [apply, wrongCount]);

  return {
    mascotState,
    mascotImage: MASCOT_IMAGES[mascotKey],
    bubbleText,
    streakCount,
    onCorrectAnswer,
    onWrongAnswer,
    onLessonStart,
    onLessonComplete,
  };
}
