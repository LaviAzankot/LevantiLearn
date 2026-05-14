/**
 * OutOfHeartsModal — shown when a free user reaches 0 hearts.
 * "Go Premium" → opens paywall. "Wait for hearts" → dismisses.
 * Practice mode (previously completed lessons) is always accessible.
 */
import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { HEART_REFILL_MS } from '../constants/subscriptions';

const C = {
  light: { bg: '#f7f6f2', card: '#ffffff', primary: '#fe4d01', text: '#2e2f2d', label: '#5b5c59', border: '#e3e3de', overlay: 'rgba(0,0,0,0.5)' },
  dark:  { bg: '#1a1814', card: '#242220', primary: '#ff6b2b', text: '#f0ede8', label: '#9a9690', border: '#3a3830', overlay: 'rgba(0,0,0,0.7)' },
};

function formatCountdown(target: Date): string {
  const diff = Math.max(0, target.getTime() - Date.now());
  const h    = Math.floor(diff / 3_600_000);
  const m    = Math.floor((diff % 3_600_000) / 60_000);
  const s    = Math.floor((diff % 60_000) / 1_000);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

interface Props {
  visible:     boolean;
  nextHeartAt: Date | null;
  onGoPremiun: () => void;
  onWait:      () => void;
}

export function OutOfHeartsModal({ visible, nextHeartAt, onGoPremiun, onWait }: Props) {
  const scheme = useColorScheme();
  const c      = C[scheme === 'dark' ? 'dark' : 'light'];
  const [tick, setTick] = useState(0);

  // Pulse animation for hearts icon
  const pulse = React.useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!visible) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 500, useNativeDriver: true, easing: Easing.ease }),
        Animated.timing(pulse, { toValue: 1,    duration: 500, useNativeDriver: true, easing: Easing.ease }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [visible]);

  // Countdown ticker
  useEffect(() => {
    if (!visible || !nextHeartAt) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [visible, nextHeartAt]);

  const nextFreeHeart = nextHeartAt ?? new Date(Date.now() + HEART_REFILL_MS);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={[s.overlay, { backgroundColor: c.overlay }]}>
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>

          {/* Animated hearts */}
          <Animated.View style={[s.iconWrap, { transform: [{ scale: pulse }] }]}>
            <Ionicons name="heart-dislike" size={52} color={c.primary} />
          </Animated.View>

          <Text style={[s.title,    { color: c.text  }]}>Out of Hearts</Text>
          <Text style={[s.subtitle, { color: c.label }]}>
            Take a break — your next heart refills in:
          </Text>

          {/* Countdown */}
          <View style={[s.timerBox, { backgroundColor: c.primary + '12', borderColor: c.primary + '30' }]}>
            <Ionicons name="time-outline" size={18} color={c.primary} />
            <Text style={[s.timerText, { color: c.primary }]}>
              {formatCountdown(nextFreeHeart)}
            </Text>
          </View>

          {/* Go Premium */}
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: c.primary }]}
            onPress={onGoPremiun}
            activeOpacity={0.88}
          >
            <Ionicons name="diamond" size={18} color="#fff" />
            <Text style={s.primaryBtnText}>Unlock Unlimited Hearts</Text>
          </TouchableOpacity>

          {/* Wait */}
          <TouchableOpacity style={s.secondaryBtn} onPress={onWait} activeOpacity={0.75}>
            <Text style={[s.secondaryBtnText, { color: c.label }]}>Wait for hearts</Text>
          </TouchableOpacity>

          {/* Practice mode hint */}
          <Text style={[s.practiceHint, { color: c.label }]}>
            💡 You can still practise any completed lesson for free.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card:         { width: '100%', maxWidth: 360, borderRadius: 28, borderWidth: 1.5, padding: 28, alignItems: 'center', gap: 14 },
  iconWrap:     { marginBottom: 4 },
  title:        { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  subtitle:     { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  timerBox:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 50, borderWidth: 1.5 },
  timerText:    { fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  primaryBtn:   { width: '100%', height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryBtn: { paddingVertical: 10 },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  practiceHint: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 4 },
});
