/**
 * SocialAuthButtons — Google + Apple sign-in buttons.
 * Used on both the login and signup screens.
 * Apple button is only rendered on iOS (Apple doesn't support Android).
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useAuthStore } from '../store/authStore';

const C = {
  light: { text: '#2e2f2d', label: '#5b5c59', border: '#e3e3de', card: '#ffffff', google: '#ffffff', googleBorder: '#e3e3de' },
  dark:  { text: '#f0ede8', label: '#9a9690', border: '#3a3830', card: '#242220', google: '#2a2825', googleBorder: '#3a3830' },
};

interface Props {
  onSuccess?: () => void; // called after a successful social sign-in
}

export function SocialAuthButtons({ onSuccess }: Props) {
  const scheme           = useColorScheme();
  const c                = C[scheme === 'dark' ? 'dark' : 'light'];
  const signInWithGoogle = useAuthStore(s => s.signInWithGoogle);
  const signInWithApple  = useAuthStore(s => s.signInWithApple);
  const isLoading        = useAuthStore(s => s.isLoading);

  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading,  setAppleLoading]  = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // Check Apple availability (iOS 13+)
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    (async () => {
      try {
        const AppleAuth = await import('expo-apple-authentication');
        const available = await AppleAuth.isAvailableAsync();
        setAppleAvailable(available);
      } catch {
        setAppleAvailable(false);
      }
    })();
  }, []);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch (e: any) {
      // User cancelled (dismissed browser) — no alert needed
      if (!e?.message?.toLowerCase().includes('cancel')) {
        Alert.alert('Google sign-in failed', e.message ?? 'Something went wrong.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleApple = async () => {
    setAppleLoading(true);
    try {
      await signInWithApple();
      onSuccess?.();
    } catch (e: any) {
      Alert.alert('Apple sign-in failed', e.message ?? 'Something went wrong.');
    } finally {
      setAppleLoading(false);
    }
  };

  const busy = isLoading || googleLoading || appleLoading;

  return (
    <View style={s.container}>
      {/* OR divider */}
      <View style={s.dividerRow}>
        <View style={[s.dividerLine, { backgroundColor: c.border }]} />
        <Text style={[s.dividerText, { color: c.label }]}>or</Text>
        <View style={[s.dividerLine, { backgroundColor: c.border }]} />
      </View>

      {/* Google */}
      <TouchableOpacity
        style={[s.btn, { backgroundColor: c.google, borderColor: c.googleBorder }]}
        onPress={handleGoogle}
        disabled={busy}
        activeOpacity={0.85}
      >
        {googleLoading ? (
          <ActivityIndicator size="small" color="#4285F4" />
        ) : (
          <Ionicons name="logo-google" size={20} color="#4285F4" />
        )}
        <Text style={[s.btnText, { color: c.text }]}>Continue with Google</Text>
      </TouchableOpacity>

      {/* Apple — iOS only */}
      {appleAvailable && (
        <TouchableOpacity
          style={[s.btn, s.appleBtn]}
          onPress={handleApple}
          disabled={busy}
          activeOpacity={0.85}
        >
          {appleLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="logo-apple" size={20} color="#ffffff" />
          )}
          <Text style={[s.btnText, s.appleBtnText]}>Continue with Apple</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 12 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontWeight: '500' },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    height: 52, borderRadius: 14, borderWidth: 1.5,
  },
  btnText: { fontSize: 15, fontWeight: '600' },

  appleBtn:     { backgroundColor: '#000000', borderColor: '#000000' },
  appleBtnText: { color: '#ffffff' },
});
