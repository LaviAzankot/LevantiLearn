/**
 * useSubscription — single source of truth for premium status + hearts.
 *
 * Exposes (per spec):
 *   isPremium, currentHearts, nextHeartAt,
 *   purchaseMonthly, purchaseYearly, restorePurchases
 *
 * Initialise once at app startup via initSubscription(userId).
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { revenueCatService } from '../services/RevenueCatService';
import { supabase } from '../lib/supabase';
import { ENTITLEMENT_ID } from '../constants/subscriptions';
import { useHearts } from './useHearts';

// ── Internal Zustand store ─────────────────────────────────────────────────────

interface SubscriptionStore {
  isPremium:   boolean;
  isLoading:   boolean;

  _configure:  (userId?: string) => Promise<void>;
  _refresh:    () => Promise<void>;
  _syncSupabase: (userId: string, premium: boolean) => Promise<void>;
  purchaseMonthly:   () => Promise<boolean>;
  purchaseYearly:    () => Promise<boolean>;
  restorePurchases:  () => Promise<boolean>;
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  isPremium: false,
  isLoading: false,

  _configure: async (userId) => {
    revenueCatService.configure(userId);
    if (userId) await revenueCatService.logIn(userId);
    await get()._refresh();
  },

  _refresh: async () => {
    set({ isLoading: true });
    try {
      const premium = await revenueCatService.isPremium();
      set({ isPremium: premium });
    } catch {
      // keep existing value
    } finally {
      set({ isLoading: false });
    }
  },

  _syncSupabase: async (userId, premium) => {
    try {
      await supabase.from('profiles').update({ is_premium: premium }).eq('id', userId);
    } catch {}
  },

  purchaseMonthly: async () => {
    try {
      const offerings = await revenueCatService.getOfferings();
      const pkg = offerings?.current?.availablePackages?.find(
        (p: any) => p.packageType === 'MONTHLY',
      );
      if (!pkg) throw new Error('Monthly plan not available');
      const { customerInfo } = await revenueCatService.purchasePackage(pkg);
      const premium = !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
      set({ isPremium: premium });
      return premium;
    } catch (e: any) {
      if (e?.userCancelled) return false;
      throw e;
    }
  },

  purchaseYearly: async () => {
    try {
      const offerings = await revenueCatService.getOfferings();
      const pkg = offerings?.current?.availablePackages?.find(
        (p: any) => p.packageType === 'ANNUAL',
      );
      if (!pkg) throw new Error('Yearly plan not available');
      const { customerInfo } = await revenueCatService.purchasePackage(pkg);
      const premium = !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
      set({ isPremium: premium });
      return premium;
    } catch (e: any) {
      if (e?.userCancelled) return false;
      throw e;
    }
  },

  restorePurchases: async () => {
    const info = await revenueCatService.restorePurchases();
    const premium = !!info?.entitlements?.active?.[ENTITLEMENT_ID];
    set({ isPremium: premium });
    return premium;
  },
}));

// ── Public initialiser — call once from _layout.tsx ───────────────────────────

export async function initSubscription(userId?: string): Promise<void> {
  await useSubscriptionStore.getState()._configure(userId);
}

// ── Combined hook (spec interface) ────────────────────────────────────────────

export function useSubscription() {
  const store   = useSubscriptionStore();
  const hearts  = useHearts(store.isPremium);

  // Refresh on app foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') store._refresh();
    });
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isPremium:         store.isPremium,
    isLoading:         store.isLoading,
    currentHearts:     hearts.hearts,
    nextHeartAt:       hearts.nextHeartAt,
    deductHeart:       hearts.deductHeart,
    purchaseMonthly:   store.purchaseMonthly,
    purchaseYearly:    store.purchaseYearly,
    restorePurchases:  store.restorePurchases,
    refresh:           store._refresh,
  };
}
