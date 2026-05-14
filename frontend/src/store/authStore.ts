/**
 * Auth store — manages Supabase session + user profile.
 * Single source of truth for authentication state across the app.
 * Supports email/password, Google OAuth, and Apple Sign-In.
 */
import { create } from 'zustand';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Required to properly close the browser session on Android after OAuth redirect
WebBrowser.maybeCompleteAuthSession();

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
  session:       Session | null;
  user:          User | null;
  profile:       UserProfile | null;
  isLoading:     boolean;
  isInitialized: boolean;

  // Actions
  initialize:        () => Promise<void>;
  signUp:            (email: string, password: string, displayName: string) => Promise<void>;
  signIn:            (email: string, password: string) => Promise<void>;
  signInWithGoogle:  () => Promise<void>;
  signInWithApple:   () => Promise<void>;
  signOut:           () => Promise<void>;
  refreshProfile:    () => Promise<void>;
  setSession:        (session: Session | null) => void;
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

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
      if (session) get().refreshProfile();
      else set({ profile: null });
    });
  },

  setSession: (session) => {
    set({ session, user: session?.user ?? null });
  },

  // ── Email / password sign up ───────────────────────────────────────────────
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

  // ── Email / password sign in ───────────────────────────────────────────────
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

  // ── Google OAuth (iOS + Android) ───────────────────────────────────────────
  signInWithGoogle: async () => {
    set({ isLoading: true });
    try {
      // The redirect URI that the OAuth provider will return to after auth.
      // In production builds: levantilearn://auth/callback
      // In Expo Go: exp://…/--/auth/callback
      const redirectUri = Linking.createURL('auth/callback');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true, // We open the browser manually below
        },
      });

      if (error || !data.url) throw error ?? new Error('Google auth URL unavailable');

      // Open the browser for Google sign-in
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      if (result.type === 'success' && result.url) {
        // PKCE: exchange the authorization code for a session
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
        if (sessionError) throw sessionError;
        await get().refreshProfile();
      }
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Apple Sign-In (iOS only) ───────────────────────────────────────────────
  signInWithApple: async () => {
    if (Platform.OS !== 'ios') return;
    set({ isLoading: true });
    try {
      // Dynamic import so Android bundle doesn't include Apple auth native module
      const AppleAuthentication = await import('expo-apple-authentication');
      const Crypto = await import('expo-crypto');

      // Apple requires a nonce: we hash a random string and pass both to Supabase
      const rawNonce    = Math.random().toString(36).substring(2);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) throw new Error('Apple did not return an identity token');

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token:    credential.identityToken,
        nonce:    rawNonce,
      });

      if (error) throw error;
      if (data.session) {
        set({ session: data.session, user: data.user });
        await get().refreshProfile();
      }
    } catch (e: any) {
      // ERR_CANCELED = user dismissed the Apple sheet — treat as silent cancel
      if (e?.code !== 'ERR_CANCELED') throw e;
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
          id:                  user.id,
          email:               user.email ?? '',
          display_name:        data.display_name ?? user.user_metadata?.full_name ?? '',
          is_premium:          data.is_premium ?? false,
          xp_total:            data.xp_total ?? 0,
          streak_days:         data.streak_days ?? 0,
          daily_goal_minutes:  data.daily_goal_minutes ?? 10,
        },
      });
    }
  },
}));
