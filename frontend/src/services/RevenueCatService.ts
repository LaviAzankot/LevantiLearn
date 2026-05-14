/**
 * RevenueCatService — wraps react-native-purchases with graceful degradation.
 * Falls back silently on web builds or when native module is not compiled yet
 * (i.e. before running `expo prebuild`).
 */
import { Platform } from 'react-native';
import { RC_API_KEY_IOS, RC_API_KEY_ANDROID, ENTITLEMENT_ID } from '../constants/subscriptions';

// Dynamic require so Metro doesn't crash on web or Expo Go without native build
let Purchases: any = null;
let LOG_LEVEL: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rc = require('react-native-purchases');
  Purchases = rc.default ?? rc.Purchases ?? rc;
  LOG_LEVEL  = rc.LOG_LEVEL;
} catch {
  // react-native-purchases not compiled — subscription features disabled
}

class RevenueCatService {
  private configured = false;

  configure(userId?: string): void {
    if (!Purchases || this.configured) return;
    const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
    if (!apiKey) {
      console.warn('[RevenueCat] API key missing — set EXPO_PUBLIC_RC_API_KEY_IOS / ANDROID in .env');
      return;
    }
    try {
      if (LOG_LEVEL) Purchases.setLogLevel(LOG_LEVEL.WARN);
      Purchases.configure({ apiKey, appUserID: userId ?? undefined });
      this.configured = true;
    } catch (e) {
      console.warn('[RevenueCat] configure error:', e);
    }
  }

  async logIn(userId: string): Promise<void> {
    if (!Purchases || !this.configured) return;
    try { await Purchases.logIn(userId); } catch {}
  }

  async logOut(): Promise<void> {
    if (!Purchases || !this.configured) return;
    try { await Purchases.logOut(); } catch {}
  }

  async getCustomerInfo(): Promise<any | null> {
    if (!Purchases || !this.configured) return null;
    try { return await Purchases.getCustomerInfo(); } catch { return null; }
  }

  async isPremium(): Promise<boolean> {
    const info = await this.getCustomerInfo();
    return !!info?.entitlements?.active?.[ENTITLEMENT_ID];
  }

  async getOfferings(): Promise<any | null> {
    if (!Purchases || !this.configured) return null;
    try { return await Purchases.getOfferings(); } catch { return null; }
  }

  async purchasePackage(pkg: any): Promise<{ customerInfo: any }> {
    if (!Purchases || !this.configured) throw new Error('RevenueCat not configured');
    return await Purchases.purchasePackage(pkg);
  }

  async restorePurchases(): Promise<any | null> {
    if (!Purchases || !this.configured) return null;
    try { return await Purchases.restorePurchases(); } catch { return null; }
  }
}

export const revenueCatService = new RevenueCatService();
