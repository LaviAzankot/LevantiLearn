/**
 * /paywall route — full-screen paywall shown mid-app.
 * Can be navigated to from locked lessons, OutOfHeartsModal, and premium badges.
 */
import React from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDED_KEY } from '../src/constants/subscriptions';
import { PaywallScreen, PaywallSource } from '../src/screens/Paywall/PaywallScreen';

export default function PaywallRoute() {
  const router = useRouter();

  const markOnboarded = async () => {
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
  };

  const handleSuccess = async () => {
    await markOnboarded();
    router.replace('/(tabs)');
  };

  const handleDismiss = async () => {
    await markOnboarded();
    // If navigated from onboarding, go to tabs; otherwise go back
    try {
      router.back();
    } catch {
      router.replace('/(tabs)');
    }
  };

  return (
    <PaywallScreen
      source="locked_lesson"
      onSuccess={handleSuccess}
      onDismiss={handleDismiss}
    />
  );
}
