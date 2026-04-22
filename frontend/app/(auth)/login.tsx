/**
 * Login screen — Supabase email/password auth
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';

const C = {
  light: { bg: '#f7f6f2', card: '#ffffff', primary: '#fe4d01', text: '#2e2f2d', label: '#5b5c59', border: '#e3e3de' },
  dark:  { bg: '#1a1814', card: '#242220', primary: '#ff6b2b', text: '#f0ede8', label: '#9a9690', border: '#3a3830' },
};

export default function LoginScreen() {
  const scheme   = useColorScheme();
  const c        = C[scheme === 'dark' ? 'dark' : 'light'];
  const router   = useRouter();
  const signIn   = useAuthStore(s => s.signIn);
  const isLoading = useAuthStore(s => s.isLoading);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    try {
      await signIn(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Login failed', e.message ?? 'Invalid email or password.');
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={s.inner}>

          {/* Logo */}
          <View style={s.logoWrap}>
            <Text style={[s.logoText, { color: c.primary }]}>LevantiLearn</Text>
            <Text style={[s.logoSub, { color: c.label }]}>Learn Palestinian Arabic</Text>
          </View>

          {/* Card */}
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.title, { color: c.text }]}>Welcome back</Text>

            {/* Email */}
            <View style={[s.inputWrap, { borderColor: c.border, backgroundColor: c.bg }]}>
              <Ionicons name="mail-outline" size={18} color={c.label} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: c.text }]}
                placeholder="Email"
                placeholderTextColor={c.label}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>

            {/* Password */}
            <View style={[s.inputWrap, { borderColor: c.border, backgroundColor: c.bg }]}>
              <Ionicons name="lock-closed-outline" size={18} color={c.label} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: c.text }]}
                placeholder="Password"
                placeholderTextColor={c.label}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPass(v => !v)} style={s.eyeBtn}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={c.label} />
              </TouchableOpacity>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[s.btn, { backgroundColor: c.primary, opacity: isLoading ? 0.7 : 1 }]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Sign in</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <Text style={[s.footerText, { color: c.label }]}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text style={[s.footerLink, { color: c.primary }]}>Sign up</Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1 },
  inner:     { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 24 },
  logoWrap:  { alignItems: 'center', gap: 6 },
  logoText:  { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  logoSub:   { fontSize: 15 },
  card:      { borderRadius: 24, padding: 24, borderWidth: 1, gap: 14 },
  title:     { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input:     { flex: 1, fontSize: 15 },
  eyeBtn:    { padding: 4 },
  btn:       { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnText:   { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer:    { flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: '700' },
});
