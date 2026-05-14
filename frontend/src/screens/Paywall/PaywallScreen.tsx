/**
 * PaywallScreen — reusable subscription paywall.
 * Used post-onboarding, on locked lesson tap, on 0-hearts upsell,
 * and on any "Premium" badge tap.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useSubscription } from '../../hooks/useSubscription';
import { revenueCatService } from '../../services/RevenueCatService';
import { TRIAL_DAYS, TERMS_URL, PRIVACY_URL } from '../../constants/subscriptions';
import { supabase } from '../../lib/supabase';

// ── Analytics ─────────────────────────────────────────────────────────────────
async function logEvent(name: string, data?: Record<string, unknown>) {
  try {
    await supabase.from('analytics_events').insert({
      event_name: name, data,
      created_at: new Date().toISOString(),
    });
  } catch {}
}

export type PaywallSource =
  | 'onboarding'
  | 'locked_lesson'
  | 'no_hearts'
  | 'premium_badge';

interface Props {
  source:    PaywallSource;
  onDismiss: () => void;
  onSuccess: () => void;
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  light: { bg: '#f7f6f2', card: '#ffffff', primary: '#fe4d01', text: '#2e2f2d', label: '#5b5c59', border: '#e3e3de', right: '#00675f', surface: '#f1f1ed' },
  dark:  { bg: '#1a1814', card: '#242220', primary: '#ff6b2b', text: '#f0ede8', label: '#9a9690', border: '#3a3830', right: '#66BB6A', surface: '#2e2c28' },
};

const FEATURES = [
  { icon: 'book',           text: 'Unlock all 10 topic paths' },
  { icon: 'infinite',       text: 'Unlimited lessons & hearts' },
  { icon: 'mic',            text: 'AI pronunciation scoring' },
  { icon: 'headset',        text: 'Native Levantine speaker audio' },
  { icon: 'cloud-download', text: 'Offline mode' },
  { icon: 'trophy',         text: 'Advanced badges & streaks' },
];

// ═══════════════════════════════════════════════════════════════════════════════
export function PaywallScreen({ source, onDismiss, onSuccess }: Props) {
  const scheme = useColorScheme();
  const c      = C[scheme === 'dark' ? 'dark' : 'light'];
  const { purchaseMonthly, purchaseYearly, restorePurchases } = useSubscription();

  const [offerings,       setOfferings]       = useState<any>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [purchasing,       setPurchasing]       = useState(false);
  const [selectedPlan,     setSelectedPlan]     = useState<'monthly' | 'yearly'>('yearly');

  useEffect(() => {
    logEvent('upsell_shown', { source });
    if (source === 'onboarding') logEvent('free_trial_shown');
    (async () => {
      setLoadingOfferings(true);
      try {
        // Always fetch fresh from RevenueCat
        setOfferings(await revenueCatService.getOfferings());
      } finally {
        setLoadingOfferings(false);
      }
    })();
  }, [source]);

  // ── Price helpers ──────────────────────────────────────────────────────────
  const monthlyPkg = offerings?.current?.availablePackages?.find(
    (p: any) => p.packageType === 'MONTHLY',
  );
  const yearlyPkg = offerings?.current?.availablePackages?.find(
    (p: any) => p.packageType === 'ANNUAL',
  );
  const monthlyPrice   = monthlyPkg?.product?.localizedPriceString ?? '₪29.99';
  const yearlyPrice    = yearlyPkg?.product?.localizedPriceString  ?? '₪199.99';
  const yearlyPerMonth = yearlyPkg
    ? `${yearlyPkg.product?.currencyCode ?? ''}${((yearlyPkg.product?.price ?? 200) / 12).toFixed(2)}/mo`
    : '₪16.67/mo';

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      logEvent('free_trial_started', { plan: selectedPlan });
      const ok = selectedPlan === 'monthly'
        ? await purchaseMonthly()
        : await purchaseYearly();
      if (ok) {
        logEvent('subscription_purchased', { plan: selectedPlan });
        onSuccess();
      }
    } catch (e: any) {
      Alert.alert('Purchase failed', e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      const ok = await restorePurchases();
      logEvent('subscription_restored');
      if (ok) {
        onSuccess();
      } else {
        Alert.alert('Nothing to restore', 'No active subscription found for this account.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleDismiss = () => {
    logEvent('free_trial_dismissed', { source });
    onDismiss();
  };

  // ── Auto-renewal copy ──────────────────────────────────────────────────────
  const renewalCopy = selectedPlan === 'monthly'
    ? `${monthlyPrice}/month`
    : `${yearlyPrice}/year`;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.bg }]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <View style={s.heroSection}>
          <View style={[s.diamond, { backgroundColor: c.primary }]}>
            <Ionicons name="diamond" size={38} color="#fff" />
          </View>
          <Text style={[s.heroTitle, { color: c.text }]}>
            Start Your {TRIAL_DAYS}-Day Free Trial
          </Text>
          <Text style={[s.heroSub, { color: c.label }]}>
            Full access to every lesson. Cancel anytime.
          </Text>
        </View>

        {/* ── Plans ────────────────────────────────────────────────────────── */}
        {loadingOfferings ? (
          <ActivityIndicator color={c.primary} style={{ marginVertical: 28 }} />
        ) : (
          <View style={s.plans}>
            {/* Yearly */}
            <TouchableOpacity
              style={[s.planCard, {
                borderColor:     selectedPlan === 'yearly' ? c.primary : c.border,
                backgroundColor: selectedPlan === 'yearly' ? c.primary + '12' : c.card,
              }]}
              onPress={() => setSelectedPlan('yearly')}
              activeOpacity={0.85}
            >
              <View style={s.planRow}>
                <View style={[s.radio, {
                  borderColor: selectedPlan === 'yearly' ? c.primary : c.border,
                }]}>
                  {selectedPlan === 'yearly' && (
                    <View style={[s.radioDot, { backgroundColor: c.primary }]} />
                  )}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={s.planLabelRow}>
                    <Text style={[s.planName, { color: c.text }]}>Yearly</Text>
                    <View style={[s.bestBadge, { backgroundColor: c.primary }]}>
                      <Text style={s.bestBadgeText}>Best Value</Text>
                    </View>
                  </View>
                  <Text style={[s.planMonthly, { color: c.label }]}>{yearlyPerMonth}</Text>
                </View>
                <Text style={[s.planPrice, { color: c.primary }]}>
                  {yearlyPrice}
                  <Text style={[s.planPeriod, { color: c.label }]}> /yr</Text>
                </Text>
              </View>
            </TouchableOpacity>

            {/* Monthly */}
            <TouchableOpacity
              style={[s.planCard, {
                borderColor:     selectedPlan === 'monthly' ? c.primary : c.border,
                backgroundColor: selectedPlan === 'monthly' ? c.primary + '12' : c.card,
              }]}
              onPress={() => setSelectedPlan('monthly')}
              activeOpacity={0.85}
            >
              <View style={s.planRow}>
                <View style={[s.radio, {
                  borderColor: selectedPlan === 'monthly' ? c.primary : c.border,
                }]}>
                  {selectedPlan === 'monthly' && (
                    <View style={[s.radioDot, { backgroundColor: c.primary }]} />
                  )}
                </View>
                <Text style={[s.planName, { color: c.text, flex: 1 }]}>Monthly</Text>
                <Text style={[s.planPrice, { color: c.text }]}>
                  {monthlyPrice}
                  <Text style={[s.planPeriod, { color: c.label }]}> /mo</Text>
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <View style={[s.featuresCard, { backgroundColor: c.card, borderColor: c.border }]}>
          {FEATURES.map((f, i) => (
            <View
              key={i}
              style={[s.featureRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.border }]}
            >
              <View style={[s.featureIcon, { backgroundColor: c.primary + '18' }]}>
                <Ionicons name={f.icon as any} size={17} color={c.primary} />
              </View>
              <Text style={[s.featureText, { color: c.text }]}>{f.text}</Text>
              <Ionicons name="checkmark-circle" size={18} color={c.right} />
            </View>
          ))}
        </View>

        {/* ── CTA button ───────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.ctaBtn, { backgroundColor: c.primary, opacity: purchasing ? 0.7 : 1 }]}
          onPress={handlePurchase}
          disabled={purchasing || loadingOfferings}
          activeOpacity={0.88}
        >
          {purchasing
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.ctaBtnText}>Start {TRIAL_DAYS}-Day Free Trial</Text>
          }
        </TouchableOpacity>

        {/* Auto-renewal disclosure */}
        <Text style={[s.autoRenew, { color: c.label }]}>
          After your free trial ends you'll be charged {renewalCopy}. Subscription
          auto-renews unless cancelled at least 24 hours before the renewal date.
          Manage in your App Store / Google Play account settings.
        </Text>

        {/* Free plan link */}
        <TouchableOpacity style={s.freeLink} onPress={handleDismiss}>
          <Text style={[s.freeLinkText, { color: c.label }]}>Continue with Free Plan</Text>
        </TouchableOpacity>

        {/* Legal footer */}
        <View style={s.legalRow}>
          <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
            <Text style={[s.legalLink, { color: c.label }]}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={[s.legalSep, { color: c.label }]}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text style={[s.legalLink, { color: c.label }]}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={[s.legalSep, { color: c.label }]}>·</Text>
          <TouchableOpacity onPress={handleRestore} disabled={purchasing}>
            <Text style={[s.legalLink, { color: c.label }]}>Restore Purchases</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingBottom: 48 },

  heroSection: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 36, paddingBottom: 28, gap: 12 },
  diamond:     { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle:   { fontSize: 26, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5, lineHeight: 34 },
  heroSub:     { fontSize: 15, textAlign: 'center', lineHeight: 22 },

  plans:       { paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  planCard:    { borderRadius: 18, borderWidth: 2, padding: 18 },
  planRow:     { flexDirection: 'row', alignItems: 'center', gap: 14 },
  radio:       { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot:    { width: 10, height: 10, borderRadius: 5 },
  planLabelRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  planName:    { fontSize: 16, fontWeight: '700' },
  planMonthly: { fontSize: 13 },
  planPrice:   { fontSize: 18, fontWeight: '800' },
  planPeriod:  { fontSize: 13, fontWeight: '400' },
  bestBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 50 },
  bestBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

  featuresCard: { marginHorizontal: 20, borderRadius: 22, borderWidth: 1, overflow: 'hidden', marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 2 },
  featureRow:   { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 13 },
  featureIcon:  { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  featureText:  { flex: 1, fontSize: 14, fontWeight: '600' },

  ctaBtn:     { marginHorizontal: 20, height: 58, borderRadius: 17, alignItems: 'center', justifyContent: 'center', shadowColor: '#fe4d01', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 6 },
  ctaBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  autoRenew:  { marginHorizontal: 28, marginTop: 14, fontSize: 11, textAlign: 'center', lineHeight: 17 },
  freeLink:   { alignItems: 'center', paddingVertical: 18 },
  freeLinkText: { fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },

  legalRow:   { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 16, flexWrap: 'wrap' },
  legalLink:  { fontSize: 12 },
  legalSep:   { fontSize: 12 },
});
