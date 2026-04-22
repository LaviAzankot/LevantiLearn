/**
 * Signup screen — Supabase email/password registration
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';

const C = {
  light: { bg: '#f7f6f2', card: '#ffffff', primary: '#fe4d01', text: '#2e2f2d', label: '#5b5c59', border: '#e3e3de', right: '#00675f' },
  dark:  { bg: '#1a1814', card: '#242220', primary: '#ff6b2b', text: '#f0ede8', label: '#9a9690', border: '#3a3830', right: '#66BB6A' },
};

export default function SignupScreen() {
  const scheme    = useColorScheme();
  const c         = C[scheme === 'dark' ? 'dark' : 'light'];
  const router    = useRouter();
  const signUp    = useAuthStore(s => s.signUp);
  const isLoading = useAuthStore(s => s.isLoading);

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password || !confirm) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }
    try {
      await signUp(email.trim().toLowerCase(), password, name.trim());
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Sign up failed', e.message ?? 'Could not create account.');
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">

          {/* Back */}
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={c.text} />
          </TouchableOpacity>

          {/* Logo */}
          <View style={s.logoWrap}>
            <Text style={[s.logoText, { color: c.primary }]}>LevantiLearn</Text>
            <Text style={[s.logoSub, { color: c.label }]}>Create your free account</Text>
          </View>

          {/* Card */}
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.title, { color: c.text }]}>Get started</Text>

            {/* Name */}
            <View style={[s.inputWrap, { borderColor: c.border, backgroundColor: c.bg }]}>
              <Ionicons name="person-outline" size={18} color={c.label} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: c.text }]}
                placeholder="Your name"
                placeholderTextColor={c.label}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

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
                placeholder="Password (min 8 chars)"
                placeholderTextColor={c.label}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                returnKeyType="next"
              />
              <TouchableOpacity onPress={() => setShowPass(v => !v)} style={s.eyeBtn}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={c.label} />
              </TouchableOpacity>
            </View>

            {/* Confirm */}
            <View style={[s.inputWrap, { borderColor: c.border, backgroundColor: c.bg }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={c.label} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: c.text }]}
                placeholder="Confirm password"
                placeholderTextColor={c.label}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleSignup}
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[s.btn, { backgroundColor: c.primary, opacity: isLoading ? 0.7 : 1 }]}
              onPress={handleSignup}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Create account</Text>
              }
            </TouchableOpacity>

            {/* Terms */}
            <Text style={[s.terms, { color: c.label }]}>
              By signing up you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <Text style={[s.footerText, { color: c.label }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={[s.footerLink, { color: c.primary }]}>Sign in</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1 },
  inner:     { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32, gap: 24 },
  backBtn:   { position: 'absolute', top: 16, left: 0, padding: 8 },
  logoWrap:  { alignItems: 'center', gap: 6, marginTop: 32 },
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
  terms:     { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  footer:    { flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: '700' },
});
