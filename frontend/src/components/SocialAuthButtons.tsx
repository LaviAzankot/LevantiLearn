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
import { Svg, Path } from 'react-native-svg';
import { useColorScheme } from 'react-native';
import { useAuthStore } from '../store/authStore';

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <Path fill="none" d="M0 0h48v48H0z"/>
    </Svg>
  );
}

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
          <GoogleIcon size={20} />
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
