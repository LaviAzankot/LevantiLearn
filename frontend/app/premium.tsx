/**
 * Premium upgrade screen — PayPal checkout with 17% Israeli VAT breakdown.
 * Flow:
 *   1. Screen loads → fetches pricing from backend
 *   2. User taps "Pay with PayPal" → backend creates PayPal order
 *   3. WebView opens PayPal approval URL
 *   4. On approval → backend captures payment → user upgraded
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { api } from '../src/services/api';
import { useAuthStore } from '../src/store/authStore';

const C = {
  light: { bg: '#f7f6f2', card: '#ffffff', primary: '#fe4d01', text: '#2e2f2d', label: '#5b5c59', border: '#e3e3de', right: '#00675f' },
  dark:  { bg: '#1a1814', card: '#242220', primary: '#ff6b2b', text: '#f0ede8', label: '#9a9690', border: '#3a3830', right: '#66BB6A' },
};

const FEATURES = [
  { icon: 'book',           text: 'All 10 topic paths unlocked' },
  { icon: 'mic',            text: 'AI pronunciation scoring' },
  { icon: 'infinite',       text: 'Unlimited lessons & reviews' },
  { icon: 'trophy',         text: 'Advanced badges & streaks' },
  { icon: 'cloud-download', text: 'Offline mode' },
  { icon: 'headset',        text: 'Native speaker audio' },
];

export default function PremiumScreen() {
  const scheme  = useColorScheme();
  const c       = C[scheme === 'dark' ? 'dark' : 'light'];
  const router  = useRouter();
  const refreshProfile = useAuthStore(s => s.refreshProfile);

  const [pricing,    setPricing]    = useState<any>(null);
  const [loading,    setLoading]    = useState(true);
  const [paying,     setPaying]     = useState(false);
  const [approvalUrl, setApprovalUrl] = useState<string | null>(null);
  const [orderId,    setOrderId]    = useState<string | null>(null);
  const [webVisible, setWebVisible] = useState(false);

  useEffect(() => {
    api.payments.getPricing()
      .then(setPricing)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePay = async () => {
    setPaying(true);
    try {
      const order = await api.payments.createOrder();
      setOrderId(order.order_id);

      // In production integrate react-native-paypal or WebView approval flow.
      // For now we show a simplified confirmation since PayPal sandbox
      // requires a redirect URL that varies per environment.
      Alert.alert(
        'PayPal Sandbox',
        `Order created: ${order.order_id}\n\nIn production this opens the PayPal sheet. Tap OK to simulate approval.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Approve (sandbox)',
            onPress: async () => {
              try {
                const result = await api.payments.captureOrder(order.order_id);
                if (result.success) {
                  await refreshProfile();
                  Alert.alert('Welcome to Premium! 🎉', result.message, [
                    { text: 'Start learning', onPress: () => router.replace('/(tabs)') },
                  ]);
                }
              } catch (e: any) {
                Alert.alert('Payment failed', e.message);
              }
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not start payment');
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: c.text }]}>Go Premium</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Hero */}
        <View style={[s.hero, { backgroundColor: '#0d2240' }]}>
          <Ionicons name="diamond" size={48} color="#FFD700" />
          <Text style={s.heroTitle}>LevantiLearn Premium</Text>
          <Text style={s.heroSub}>Speak Arabic like a local</Text>
        </View>

        {/* Features */}
        <View style={[s.card, { backgroundColor: c.card }]}>
          {FEATURES.map((f, i) => (
            <View key={i} style={[s.featureRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.border }]}>
              <View style={[s.featureIcon, { backgroundColor: c.primary + '18' }]}>
                <Ionicons name={f.icon as any} size={18} color={c.primary} />
              </View>
              <Text style={[s.featureText, { color: c.text }]}>{f.text}</Text>
              <Ionicons name="checkmark-circle" size={18} color={c.right} />
            </View>
          ))}
        </View>

        {/* Pricing card */}
        <View style={[s.card, { backgroundColor: c.card }]}>
          <Text style={[s.pricingTitle, { color: c.text }]}>One-time payment</Text>
          {loading ? (
            <ActivityIndicator color={c.primary} style={{ marginVertical: 16 }} />
          ) : pricing ? (
            <>
              <View style={s.priceRow}>
                <Text style={[s.priceMain, { color: c.primary }]}>₪{pricing.total.toFixed(2)}</Text>
                <Text style={[s.priceLabel, { color: c.label }]}>/ lifetime</Text>
              </View>
              <View style={[s.vatBox, { backgroundColor: c.surface ?? '#f1f1ed', borderColor: c.border }]}>
                <View style={s.vatRow}>
                  <Text style={[s.vatLabel, { color: c.label }]}>Base price</Text>
                  <Text style={[s.vatValue, { color: c.text }]}>₪{pricing.base_price.toFixed(2)}</Text>
                </View>
                <View style={s.vatRow}>
                  <Text style={[s.vatLabel, { color: c.label }]}>VAT ({Math.round(pricing.vat_rate * 100)}%)</Text>
                  <Text style={[s.vatValue, { color: c.text }]}>₪{pricing.vat_amount.toFixed(2)}</Text>
                </View>
                <View style={[s.vatRow, s.vatTotal]}>
                  <Text style={[s.vatLabel, { color: c.text, fontWeight: '700' }]}>Total</Text>
                  <Text style={[s.vatValue, { color: c.text, fontWeight: '800' }]}>₪{pricing.total.toFixed(2)}</Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={[{ color: c.label, textAlign: 'center', marginVertical: 8 }]}>
              ₪34.99 (incl. 17% VAT)
            </Text>
          )}
        </View>

        {/* PayPal button */}
        <TouchableOpacity
          style={[s.payBtn, { opacity: paying ? 0.7 : 1 }]}
          onPress={handlePay}
          disabled={paying}
          activeOpacity={0.88}
        >
          {paying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={s.payBtnText}>Pay with</Text>
              <Text style={s.payBtnPayPal}>PayPal</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[s.disclaimer, { color: c.label }]}>
          Secure payment via PayPal. Price includes 17% Israeli VAT (מע"מ).
          One-time purchase — no subscription.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:      { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 17, fontWeight: '700' },
  hero:         { margin: 16, borderRadius: 24, padding: 32, alignItems: 'center', gap: 10 },
  heroTitle:    { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  heroSub:      { color: 'rgba(255,255,255,0.7)', fontSize: 15 },
  card:         { marginHorizontal: 16, marginTop: 12, borderRadius: 22, padding: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 2 },
  featureRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  featureIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  featureText:  { flex: 1, fontSize: 14, fontWeight: '600' },
  pricingTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  priceRow:     { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 16 },
  priceMain:    { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  priceLabel:   { fontSize: 15 },
  vatBox:       { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  vatRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  vatTotal:     { borderTopWidth: 1, paddingTop: 8, marginTop: 4 },
  vatLabel:     { fontSize: 14 },
  vatValue:     { fontSize: 14 },
  payBtn:       { marginHorizontal: 16, marginTop: 20, height: 56, borderRadius: 16, backgroundColor: '#003087', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, shadowColor: '#003087', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 6 },
  payBtnText:   { color: '#fff', fontSize: 17, fontWeight: '600' },
  payBtnPayPal: { color: '#009CDE', fontSize: 20, fontWeight: '800', fontStyle: 'italic' },
  disclaimer:   { marginHorizontal: 24, marginTop: 14, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
