/**
 * useHearts — persistent heart system with 4-hour auto-replenishment.
 * Accepts isPremium so hearts are always MAX for subscribers.
 * Called internally by useSubscription; can also be used standalone.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { MAX_HEARTS, HEART_REFILL_MS, HEARTS_STORAGE_KEY } from '../constants/subscriptions';

interface HeartsData {
  hearts:          number;
  lastReplenishAt: number; // unix ms
}

const DEFAULT: HeartsData = { hearts: MAX_HEARTS, lastReplenishAt: Date.now() };

function applyReplenishment(data: HeartsData): HeartsData {
  if (data.hearts >= MAX_HEARTS) return data;
  const elapsed = Date.now() - data.lastReplenishAt;
  const refills  = Math.floor(elapsed / HEART_REFILL_MS);
  if (refills === 0) return data;
  return {
    hearts:          Math.min(MAX_HEARTS, data.hearts + refills),
    lastReplenishAt: data.lastReplenishAt + refills * HEART_REFILL_MS,
  };
}

async function persist(data: HeartsData): Promise<void> {
  await AsyncStorage.setItem(HEARTS_STORAGE_KEY, JSON.stringify(data));
}

export function useHearts(isPremium: boolean) {
  const [data, setData]     = useState<HeartsData>(DEFAULT);
  const [loaded, setLoaded] = useState(false);
  const savingRef           = useRef(false);

  const load = useCallback(async () => {
    try {
      const raw     = await AsyncStorage.getItem(HEARTS_STORAGE_KEY);
      const stored: HeartsData = raw ? JSON.parse(raw) : DEFAULT;
      const updated = applyReplenishment(stored);
      setData(updated);
      if (
        updated.hearts          !== stored.hearts ||
        updated.lastReplenishAt !== stored.lastReplenishAt
      ) {
        await persist(updated);
      }
    } catch {
      setData(DEFAULT);
    } finally {
      setLoaded(true);
    }
  }, []);

  // Load on mount
  useEffect(() => { load(); }, [load]);

  // Replenish when app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => sub.remove();
  }, [load]);

  const deductHeart = useCallback(async () => {
    if (isPremium || savingRef.current) return;
    savingRef.current = true;
    setData(prev => {
      const next: HeartsData = {
        hearts:          Math.max(0, prev.hearts - 1),
        lastReplenishAt: prev.hearts < MAX_HEARTS
          ? prev.lastReplenishAt          // replenish timer already running
          : Date.now(),                   // start replenish timer now
      };
      persist(next).finally(() => { savingRef.current = false; });
      return next;
    });
  }, [isPremium]);

  const nextHeartAt: Date | null = (() => {
    if (isPremium || data.hearts >= MAX_HEARTS) return null;
    return new Date(data.lastReplenishAt + HEART_REFILL_MS);
  })();

  return {
    hearts:      isPremium ? MAX_HEARTS : data.hearts,
    maxHearts:   MAX_HEARTS,
    nextHeartAt,
    deductHeart,
    loaded,
  };
}
