/**
 * Global state — Zustand store
 * Manages user, lessons, SRS cards, streak, XP
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

interface UserState {
  id: string;
  display_name: string;
  xp_total: number;
  streak_days: number;
  is_premium: boolean;
  daily_goal_minutes: number;
}

interface LessonMeta {
  id: string;
  topic: string;
  topic_ar: string;
  level: string;
  xp_reward: number;
  locked: boolean;
  completed: boolean;
  score?: number;
  order: number;
}

interface SRSCardState {
  word_id: string;
  arabic: string;
  romanization: string;
  english: string;
  interval_days: number;
  next_review: string;
}

interface LearningStore {
  user: UserState | null;
  lessons: LessonMeta[];
  srsCards: SRSCardState[];
  dueReviewCount: number;
  currentLesson: LessonMeta | null;
  isLoading: boolean;

  // Actions
  setUser: (user: UserState) => void;
  fetchCatalog: () => Promise<void>;
  completeLesson: (lessonId: string, xpEarned: number) => void;
  updateSRSCard: (wordId: string, data: Partial<SRSCardState>) => void;
  decrementDueCount: () => void;
  addXP: (amount: number) => void;
  incrementStreak: () => void;
}

export const useLearningStore = create<LearningStore>()(
  persist(
    (set, get) => ({
      user: null,
      lessons: [],
      srsCards: [],
      dueReviewCount: 0,
      currentLesson: null,
      isLoading: false,

      setUser: (user) => set({ user }),

      fetchCatalog: async () => {
        const { user } = get();
        set({ isLoading: true });
        try {
          const data = await api.lessons.getCatalog(user?.is_premium ?? false);
          const lessons: LessonMeta[] = data.lessons.map((l: any) => ({
            ...l,
            completed: false,
          }));
          // Find current lesson: first incomplete, unlocked
          const current = lessons.find((l) => !l.locked && !l.completed) ?? lessons[0];
          set({ lessons, currentLesson: current });

          // Load due SRS count
          if (user) {
            const cards = await api.progress.getDueCards(user.id);
            set({ dueReviewCount: cards.cards?.length ?? 0 });
          }
        } catch (e) {
          console.error('fetchCatalog failed', e);
        } finally {
          set({ isLoading: false });
        }
      },

      completeLesson: (lessonId, xpEarned) => {
        set((state) => {
          const lessons = state.lessons.map((l) =>
            l.id === lessonId ? { ...l, completed: true } : l
          );
          const nextLesson = lessons.find((l) => !l.locked && !l.completed) ?? null;
          const user = state.user
            ? { ...state.user, xp_total: state.user.xp_total + xpEarned }
            : null;
          return { lessons, currentLesson: nextLesson, user };
        });
      },

      updateSRSCard: (wordId, data) => {
        set((state) => ({
          srsCards: state.srsCards.map((c) =>
            c.word_id === wordId ? { ...c, ...data } : c
          ),
        }));
      },

      decrementDueCount: () => {
        set((state) => ({
          dueReviewCount: Math.max(0, state.dueReviewCount - 1),
        }));
      },

      addXP: (amount) => {
        set((state) => ({
          user: state.user
            ? { ...state.user, xp_total: state.user.xp_total + amount }
            : null,
        }));
      },

      incrementStreak: () => {
        set((state) => ({
          user: state.user
            ? { ...state.user, streak_days: state.user.streak_days + 1 }
            : null,
        }));
      },
    }),
    {
      name: 'levantilearn-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        lessons: state.lessons,
        srsCards: state.srsCards,
        dueReviewCount: state.dueReviewCount,
      }),
    }
  )
);
