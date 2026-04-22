/**
 * API client — typed wrappers for all backend endpoints
 */

import { supabase } from '../lib/supabase';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // Attach current Supabase JWT to every request
  const { data: { session } } = await supabase.auth.getSession();
  const authHeader = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${path} failed (${res.status}): ${err}`);
  }
  return res.json() as Promise<T>;
}

// ─── Lessons ──────────────────────────────────────────────────────────────────

export const lessons = {
  getCatalog: (isPremium: boolean) =>
    request<{ lessons: any[]; total: number }>(`/lessons/catalog?is_premium=${isPremium}`),

  getLesson: (lessonId: string) =>
    request<any>(`/lessons/${lessonId}`),

  completeLesson: (lessonId: string, payload: {
    user_id: string;
    lesson_id: string;
    score: number;
    time_spent_sec: number;
    xp_earned: number;
    words_studied: string[];
  }) =>
    request<any>(`/lessons/${lessonId}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// ─── Progress / SRS ───────────────────────────────────────────────────────────

export const progress = {
  getDueCards: (userId: string) =>
    request<{ cards: any[] }>(`/progress/srs/due?user_id=${userId}`),

  reviewCard: (userId: string, wordId: string, button: string) =>
    request<any>(`/progress/srs/review`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, word_id: wordId, button }),
    }),

  getStats: (userId: string) =>
    request<any>(`/progress/stats?user_id=${userId}`),
};

// ─── TTS ──────────────────────────────────────────────────────────────────────

export const tts = {
  getAudioUrl: (text: string, voice: 'female' | 'male' = 'female') =>
    `${BASE_URL}/tts/synthesize?text=${encodeURIComponent(text)}&voice=${voice}`,

  preloadLesson: (lessonId: string) =>
    request<any>(`/tts/preload/${lessonId}`),
};

// ─── STT ──────────────────────────────────────────────────────────────────────

export const stt = {
  scorePronunciation: async (
    audioBlob: Blob,
    expectedArabic: string,
    expectedRom: string,
  ) => {
    const form = new FormData();
    form.append('audio', audioBlob, 'recording.wav');
    form.append('expected_arabic', expectedArabic);
    form.append('expected_romanization', expectedRom);

    const res = await fetch(`${BASE_URL}/stt/score`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) throw new Error(`STT error: ${res.status}`);
    return res.json() as Promise<{
      transcribed_text: string;
      score: number;
      grade: string;
      feedback: string;
      phoneme_tips: string[];
    }>;
  },
};

// ─── Vocabulary ───────────────────────────────────────────────────────────────

export const vocab = {
  search: (q: string, limit = 20) =>
    request<any[]>(`/vocab/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  getTopic: (topic: string) =>
    request<any[]>(`/vocab/topic/${topic}`),
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  login: (firebaseToken: string) =>
    request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ firebase_token: firebaseToken }),
    }),

  getProfile: (userId: string) =>
    request<any>(`/auth/profile/${userId}`),
};

// ─── Payments ─────────────────────────────────────────────────────────────────

export const payments = {
  getPricing: () =>
    request<{ currency: string; base_price: number; vat_rate: number; vat_amount: number; total: number; label: string }>('/payments/pricing'),

  createOrder: () =>
    request<{ order_id: string; amount_usd: number }>('/payments/create-order', { method: 'POST' }),

  captureOrder: (orderId: string) =>
    request<{ success: boolean; is_premium: boolean; message: string }>('/payments/capture-order', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId }),
    }),

  getStatus: () =>
    request<{ is_premium: boolean }>('/payments/status'),
};

export const api = { lessons, progress, tts, stt, vocab, auth, payments };
