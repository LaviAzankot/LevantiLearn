import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  ReemKufi_400Regular,
  ReemKufi_500Medium,
  ReemKufi_600SemiBold,
  ReemKufi_700Bold,
} from '@expo-google-fonts/reem-kufi';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useAuthStore } from '../src/store/authStore';
import { audioService } from '../src/services/AudioService';

export default function RootLayout() {
  const scheme      = useColorScheme();
  const router      = useRouter();
  const segments    = useSegments();
  const initialize  = useAuthStore(s => s.initialize);
  const session     = useAuthStore(s => s.session);
  const isInitialized = useAuthStore(s => s.isInitialized);

  const [fontsLoaded] = useFonts({
    ReemKufi_400Regular,
    ReemKufi_500Medium,
    ReemKufi_600SemiBold,
    ReemKufi_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Initialize Supabase session and AudioService once on mount
  useEffect(() => {
    initialize();
    audioService.init().catch(e => console.warn('[AudioService] init failed:', e));
  }, []);

  // Route protection — redirect based on auth state
  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Not logged in — send to login
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Already logged in — send to app
      router.replace('/(tabs)');
    }
  }, [session, isInitialized, segments]);

  // Show spinner while fonts or auth are loading
  if (!isInitialized || !fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center',
          backgroundColor: scheme === 'dark' ? '#1a1814' : '#f7f6f2' }}>
          <ActivityIndicator size="large" color="#fe4d01" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="lesson/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="premium" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
