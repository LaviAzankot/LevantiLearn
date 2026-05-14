/**
 * /onboarding/goals route — post-signup goals selection.
 * On complete → navigates to /paywall (free trial prompt).
 */
import React from 'react';
import { useRouter } from 'expo-router';
import { GoalsScreen } from '../../src/screens/Onboarding/GoalsScreen';

export default function GoalsRoute() {
  const router = useRouter();

  return (
    <GoalsScreen
      onComplete={() => router.replace('/paywall')}
    />
  );
}
