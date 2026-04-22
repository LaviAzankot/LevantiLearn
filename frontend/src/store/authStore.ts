/**
 * Auth store — manages Supabase session + user profile.
 * Single source of truth for authentication state across the app.
 */
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  is_premium: boolean;
  xp_total: number;
  streak_days: number;
  daily_goal_minutes: number;
}

interface AuthStore {
  session:     Session | null;
  user:        User | null;
  profile:     UserProfile | null;
  isLoading:   boolean;
  isInitialized: boolean;

  // Actions
  initialize:   () => Promise<void>;
  signUp:       (email: string, password: string, displayName: string) => Promise<void>;
  signIn:       (email: string, password: string) => Promise<void>;
  signOut:      () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setSession:   (session: Session | null) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  session:       null,
  user:          null,
  profile:       null,
  isLoading:     false,
  isInitialized: false,

  // ── Called once at app startup ─────────────────────────────────────────────
  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      set({ session, user: session.user });
      await get().refreshProfile();
    }
    set({ isInitialized: true });

    // Listen for auth state changes (token refresh, sign-out from another tab)
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
      if (session) get().refreshProfile();
      else set({ profile: null });
    });
  },

  setSession: (session) => {
    set({ session, user: session?.user ?? null });
  },

  // ── Sign up ────────────────────────────────────────────────────────────────
  signUp: async (email, password, displayName) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (error) throw new Error(error.message);
      if (data.session) {
        set({ session: data.session, user: data.session.user });
        await get().refreshProfile();
      }
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Sign in ────────────────────────────────────────────────────────────────
  signIn: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      set({ session: data.session, user: data.user });
      await get().refreshProfile();
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Sign out ───────────────────────────────────────────────────────────────
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },

  // ── Fetch profile from Supabase ────────────────────────────────────────────
  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) {
      set({
        profile: {
          id: user.id,
          email: user.email ?? '',
          display_name: data.display_name ?? '',
          is_premium: data.is_premium ?? false,
          xp_total: data.xp_total ?? 0,
          streak_days: data.streak_days ?? 0,
          daily_goal_minutes: data.daily_goal_minutes ?? 10,
        },
      });
    }
  },
}));
