import React, { useEffect, useRef, useState } from 'react';
import { Image, Text, TouchableOpacity, View, StyleSheet, ImageSourcePropType } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MascotState } from '../constants/mascotConfig';

interface Props {
  mascotState:  MascotState;
  mascotImage:  ImageSourcePropType;
  bubbleText:   string;
  streakCount:  number;
  /** Pass true while lesson complete screen is showing — renders large centered variant */
  isComplete?:  boolean;
}

const MASCOT_SIZE        = 64;
const MASCOT_SIZE_LARGE  = 120;
const SPRING_CONFIG      = { damping: 12, stiffness: 200 };

export function MascotDisplay({ mascotState, mascotImage, bubbleText, streakCount, isComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [bubbleVisible, setBubbleVisible] = useState(true);

  // ── Shared values ─────────────────────────────────────────────────────────
  const translateY = useSharedValue(-120);
  const scale      = useSharedValue(1);
  const translateX = useSharedValue(0);
  const floatY     = useSharedValue(0);

  // ── Entrance animation on mount ───────────────────────────────────────────
  useEffect(() => {
    translateY.value = withSpring(0, SPRING_CONFIG);
    // Idle breathe loop
    floatY.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0,  { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);

  // ── Show bubble whenever text/state changes ────────────────────────────────
  const prevState = useRef<MascotState | null>(null);
  useEffect(() => {
    if (prevState.current === mascotState) return;
    prevState.current = mascotState;
    setBubbleVisible(true);
  }, [mascotState, bubbleText]);

  // ── State-driven animations ───────────────────────────────────────────────
  useEffect(() => {
    if (mascotState === 'wrong') {
      // Head shake
      translateX.value = withSequence(
        withTiming(-10, { duration: 60 }),
        withTiming(10,  { duration: 60 }),
        withTiming(-10, { duration: 60 }),
        withTiming(10,  { duration: 60 }),
        withTiming(0,   { duration: 60 }),
      );
    } else if (mascotState === 'streak3' || mascotState === 'streak5' || mascotState === 'streak10') {
      // Wiggle
      translateX.value = withSequence(
        withTiming(-8, { duration: 80 }),
        withTiming(8,  { duration: 80 }),
        withTiming(-8, { duration: 80 }),
        withTiming(0,  { duration: 80 }),
      );
      scale.value = withSequence(
        withSpring(1.25, SPRING_CONFIG),
        withSpring(1,    SPRING_CONFIG),
      );
    } else if (mascotState === 'complete' || mascotState === 'perfect') {
      // Bounce in + float
      scale.value = withSequence(
        withSpring(1.3, SPRING_CONFIG),
        withSpring(1,   SPRING_CONFIG),
      );
    } else if (mascotState !== 'idle') {
      // Generic bounce on every state change
      scale.value = withSequence(
        withSpring(1.2, SPRING_CONFIG),
        withSpring(1,   SPRING_CONFIG),
      );
    }
  }, [mascotState]);

  // ── Animated styles ───────────────────────────────────────────────────────
  const mascotStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value + floatY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  // ── Complete variant ──────────────────────────────────────────────────────
  if (isComplete) {
    return (
      <View style={s.completeContainer}>
        <Animated.View style={mascotStyle}>
          <Image source={mascotImage} style={s.mascotLarge} resizeMode="contain" />
        </Animated.View>
        {bubbleVisible && (
          <View style={s.completeBubble}>
            <Text style={s.completeBubbleText}>{bubbleText}</Text>
          </View>
        )}
      </View>
    );
  }

  // ── Corner variant ────────────────────────────────────────────────────────
  return (
    <View
      style={[s.cornerContainer, { top: insets.top + 8, left: 12 }]}
      pointerEvents="box-none"
    >
      <View style={s.row} pointerEvents="box-none">
        {/* Mascot */}
        <TouchableOpacity
          onPress={() => setBubbleVisible(v => !v)}
          activeOpacity={0.9}
        >
          <Animated.View style={mascotStyle}>
            <Image source={mascotImage} style={s.mascot} resizeMode="contain" />
          </Animated.View>
        </TouchableOpacity>

        {/* Bubble — snaps on/off with no animation */}
        {bubbleVisible && (
          <View style={s.bubbleWrapper} pointerEvents="none">
            <View style={s.bubbleTail} />
            <View style={s.bubble}>
              <Text style={s.bubbleText} numberOfLines={2}>{bubbleText}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // ── Corner layout ──────────────────────────────────────────────────────────
  cornerContainer: {
    position: 'absolute',
    zIndex: 90,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  mascot: {
    width:  MASCOT_SIZE,
    height: MASCOT_SIZE,
  },

  // ── Bubble ─────────────────────────────────────────────────────────────────
  bubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -2,
  },
  bubbleTail: {
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderRightWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#ffffff',
    // Shadow on tail is not possible in RN — handled on bubble
  },
  bubble: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  bubbleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2e2f2d',
    lineHeight: 18,
  },

  // ── Complete layout ────────────────────────────────────────────────────────
  completeContainer: {
    alignItems: 'center',
    gap: 12,
  },
  mascotLarge: {
    width:  MASCOT_SIZE_LARGE,
    height: MASCOT_SIZE_LARGE,
  },
  completeBubble: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  completeBubbleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2e2f2d',
    textAlign: 'center',
  },
});
