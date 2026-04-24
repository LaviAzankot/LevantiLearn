import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Animated, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { pickAvatarsForLesson, getAvatar } from '../../src/assets/avatars';

// ── Design tokens ─────────────────────────────────────────────────────────────
const COLORS = {
  light: {
    background: '#f4f1eb',
    card:       '#fefcf7',
    primary:    '#fe4d01',
    text:       '#28261f',
    label:      '#7a7670',
    border:     '#e2ddd5',
    surface:    '#edeae3',
    wrong:      '#c0281e',
    right:      '#1a6b5a',
  },
  dark: {
    background: '#1c1914',
    card:       '#252118',
    primary:    '#ff6b2b',
    text:       '#f2ede6',
    label:      '#9e9890',
    border:     '#3c3830',
    surface:    '#2e2b23',
    wrong:      '#e07070',
    right:      '#5dbba6',
  },
};

const API              = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:8000';
const DEFAULT_ICON     = 'fluent:translate-24-filled';
const DEFAULT_COLOR    = '#8E8E93';
const PASS_THRESHOLD   = 65;
const PASS_AFTER_FAILS = 3;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Fluent → Ionicons mapping ─────────────────────────────────────────────────
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
const FLUENT_MAP: Record<string, IoniconName> = {
  'fluent:hand-wave-24-filled':              'hand-right',
  'fluent:person-arrow-right-24-filled':     'person-outline',
  'fluent:chat-bubbles-question-24-filled':  'chatbubbles-outline',
  'fluent:thumb-like-24-filled':             'thumbs-up',
  'fluent:door-arrow-right-24-filled':       'exit-outline',
  'fluent:translate-24-filled':              'language-outline',
  'fluent:food-pizza-24-filled':             'pizza',
  'fluent:cart-24-filled':                   'cart',
  'fluent:location-24-filled':               'location',
  'fluent:bag-24-filled':                    'bag',
  'fluent:people-24-filled':                 'people',
  'fluent:airplane-24-filled':               'airplane',
  'fluent:calculator-24-filled':             'calculator',
  'fluent:hat-graduation-24-filled':         'school',
  'fluent:book-24-filled':                   'book',
  'fluent:lock-closed-24-filled':            'lock-closed',
  'fluent:person-available-24-filled':       'person-circle',
};
function toIonicon(name?: string): IoniconName {
  if (!name) return 'book-outline';
  // Direct Ionicons name (no fluent: prefix) — use as-is
  if (!name.startsWith('fluent:')) return name as IoniconName;
  return FLUENT_MAP[name] ?? 'book-outline';
}

// ── Word Icon ─────────────────────────────────────────────────────────────────
function WordIcon({ icon, iconColor, size = 120 }: { icon?: string; iconColor?: string; size?: number }) {
  const col = iconColor ?? DEFAULT_COLOR;
  return (
    <View style={{
      width: size, height: size, borderRadius: size * 0.32,
      backgroundColor: col + '16',
      borderWidth: 1.5, borderColor: col + '28',
      alignItems: 'center', justifyContent: 'center',
      shadowColor: col, shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 6 }, shadowRadius: 18,
    }}>
      <Ionicons name={toIonicon(icon)} size={size * 0.52} color={col} />
    </View>
  );
}

// ── Audio Button with sonar ripple while playing ─────────────────────────────
function AudioProgressRing({
  progress, size = 60, ringColor, trackColor, onPress, children,
}: {
  progress: number; size?: number; ringColor: string;
  trackColor: string; onPress: () => void; children: React.ReactNode;
}) {
  const isPlaying  = progress > 0;
  const ripple1    = useRef(new Animated.Value(0)).current;
  const ripple2    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isPlaying) {
      const makeRipple = (val: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(val, { toValue: 1, duration: 1200, useNativeDriver: true }),
            Animated.timing(val, { toValue: 0, duration: 0,    useNativeDriver: true }),
          ])
        );
      const a1 = makeRipple(ripple1, 0);
      const a2 = makeRipple(ripple2, 600);
      a1.start(); a2.start();
      return () => { a1.stop(); a2.stop(); ripple1.setValue(0); ripple2.setValue(0); };
    }
  }, [isPlaying]);

  const rippleStyle = (val: Animated.Value) => ({
    position: 'absolute' as const,
    width: size, height: size, borderRadius: size / 2,
    borderWidth: 2,
    borderColor: ringColor,
    transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
    opacity:    val.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.5, 0] }),
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {isPlaying && <Animated.View style={rippleStyle(ripple1)} />}
      {isPlaying && <Animated.View style={rippleStyle(ripple2)} />}
      {children}
    </TouchableOpacity>
  );
}

// ── Stage label metadata ──────────────────────────────────────────────────────
const STAGE_LABELS: Record<string, { label: string; icon: IoniconName }> = {
  'listen_repeat':           { label: 'האזן וחזור',       icon: 'volume-medium' },
  'choose_translation':      { label: 'בחר תרגום',         icon: 'language-outline' },
  'write_translation':       { label: 'מה המילה בערבית?',  icon: 'create-outline' },
  'dialogue':                { label: 'דיאלוג',             icon: 'chatbubbles-outline' },
  'match_pairs':             { label: 'התאם זוגות',         icon: 'link-outline' },
  'listen_choose':           { label: 'האזן ובחר',          icon: 'ear-outline' },
  'sentence_build':          { label: 'בנה משפט',           icon: 'reorder-three-outline' },
  'sentence_complete':       { label: 'השלם משפט',          icon: 'text-outline' },
  'cultural_note':           { label: 'ידעת?',              icon: 'sparkles' },
  'shadowing':               { label: 'חקה את ההגייה',      icon: 'mic-outline' },
  'listening_comprehension': { label: 'האזן וענה',          icon: 'headset-outline' },
  'idiom_card':              { label: 'ביטוי חשוב',         icon: 'chatbubble-ellipses-outline' },
};

// ═════════════════════════════════════════════════════════════════════════════
export default function LessonScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const scheme   = useColorScheme();
  const c        = COLORS[scheme === 'dark' ? 'dark' : 'light'];
  const insets   = useSafeAreaInsets();

  // ── Core state ────────────────────────────────────────────────────────────
  const [lesson,    setLesson]    = useState<any>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [stage,     setStage]     = useState(0);
  const [completed, setCompleted] = useState(false);

  // ── Exercise state ────────────────────────────────────────────────────────
  const [lockedAnswer,    setLockedAnswer]    = useState<string | null>(null);
  const [wrongAnswers,    setWrongAnswers]    = useState<string[]>([]);
  const [placedSlots,     setPlacedSlots]    = useState<{ char: string; idx: number }[]>([]);
  const [writeCheckState, setWriteCheckState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [listenPhase,     setListenPhase]    = useState<'speak' | 'recording' | 'correct' | 'wrong'>('speak');
  const [dialogueStep,    setDialogueStep]   = useState(0);
  const [qIndex,          setQIndex]         = useState(0);
  const [speechResult,    setSpeechResult]   = useState<{ text: string; score: number } | null>(null);
  const [audioProgress,   setAudioProgress]  = useState(0);
  const [matchSelected,   setMatchSelected]  = useState<string | null>(null);
  const [matchedIds,      setMatchedIds]     = useState<string[]>([]);
  const [matchWrong,      setMatchWrong]     = useState<string | null>(null);
  const [dialogueMicState,  setDialogueMicState]  = useState<'idle' | 'recording' | 'scoring' | 'correct' | 'wrong'>('idle');
  const [dialogueFailCount, setDialogueFailCount] = useState(0);
  const [lastTranscript,    setLastTranscript]    = useState('');
  const [buildSlots,        setBuildSlots]        = useState<string[]>([]);
  const [buildAvailable,    setBuildAvailable]    = useState<boolean[]>([]);
  const [buildWrong,        setBuildWrong]        = useState(false);
  const [shadowPhase,       setShadowPhase]       = useState<'idle' | 'playing' | 'ready' | 'recording' | 'correct' | 'wrong'>('idle');

  // ── Audio / recording refs ────────────────────────────────────────────────
  const audioSoundRef     = useRef<Audio.Sound | null>(null);
  const recordingRef      = useRef<Audio.Recording | null>(null);
  const expectedArabicRef = useRef<string>('');
  const dialogueLineRef   = useRef<any>(null);
  const scrollRef         = useRef<any>(null);
  const stageOpacity      = useRef(new Animated.Value(1)).current;

  // ── Avatar selection (deterministic per lesson) ───────────────────────────
  const [npcAvatar, userAvatar] = useMemo(() => pickAvatarsForLesson(id ?? 'default'), [id]);

  // ── UI feedback sounds (correct / wrong / complete) ──────────────────────
  const playFeedbackSound = useCallback(async (type: 'correct' | 'wrong' | 'complete') => {
    try {
      const src = type === 'correct'
        ? require('../../assets/sounds/correct.mp3')
        : { uri: `${API}/api/audio/${type}` };
      const { sound } = await Audio.Sound.createAsync(src, { shouldPlay: true, volume: 0.85 });
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) sound.unloadAsync().catch(() => {});
      });
    } catch { /* non-critical */ }
  }, []);

  // ── Stop current playing sound ────────────────────────────────────────────
  const stopCurrentAudio = useCallback(async () => {
    const sound = audioSoundRef.current;
    if (sound) {
      audioSoundRef.current = null;
      await sound.stopAsync().catch(() => {});
      await sound.unloadAsync().catch(() => {});
    }
  }, []);

  // ── Play TTS audio via expo-av ────────────────────────────────────────────
  const playAudio = useCallback(async (text: string, onEnd?: () => void) => {
    await stopCurrentAudio();
    setAudioProgress(0.01);
    try {
      const url = `${API}/api/tts/synthesize?text=${encodeURIComponent(text)}`;
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (status: any) => {
          if (!status.isLoaded) return;
          const dur = status.durationMillis ?? 0;
          const pos = status.positionMillis ?? 0;
          if (dur > 0) setAudioProgress(Math.max(0.01, Math.min(pos / dur, 1)));
          if (status.didJustFinish) {
            audioSoundRef.current = null;
            sound.unloadAsync().catch(() => {});
            setAudioProgress(0);
            onEnd?.();
          }
        },
      );
      audioSoundRef.current = sound;
    } catch {
      onEnd?.();
    }
  }, [stopCurrentAudio]);

  // ── Score audio URI via STT ───────────────────────────────────────────────
  const scoreFromUri = async (uri: string | null, expected: string): Promise<{ text: string; score: number; passed: boolean; transcript: string }> => {
    if (!uri) return { text: '—', score: 0, passed: false, transcript: '' };
    const formData = new FormData();
    formData.append('audio', { uri, type: 'audio/m4a', name: 'speech.m4a' } as any);
    formData.append('expected', expected);
    try {
      const res = await fetch(`${API}/api/stt/score`, { method: 'POST', body: formData });
      if (!res.ok) return { text: '—', score: 0, passed: false, transcript: '' };
      const data = await res.json();
      return { text: data.transcript ?? '', score: data.score ?? 0, passed: data.passed ?? false, transcript: data.transcript ?? '' };
    } catch {
      return { text: '—', score: 0, passed: false, transcript: '' };
    }
  };

  // ── Finish listen_repeat recording ────────────────────────────────────────
  const finishListenRepeatRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) return;
    recordingRef.current = null;
    setListenPhase('speak');
    try { await recording.stopAndUnloadAsync(); } catch {}
    const result = await scoreFromUri(recording.getURI(), expectedArabicRef.current);
    setSpeechResult(result);
  }, []);

  // ── Start listen_repeat recording ─────────────────────────────────────────
  const startRecording = async (expectedArabic: string) => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Microphone permission required. Please allow access in Settings.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      expectedArabicRef.current = expectedArabic;
      setListenPhase('recording');
      setTimeout(() => finishListenRepeatRecording(), 6000);
    } catch {
      alert('Could not access microphone. Please allow access in Settings.');
    }
  };

  const stopRecording = () => { finishListenRepeatRecording(); };

  // ── Finish dialogue recording ─────────────────────────────────────────────
  const finishDialogueRecording = useCallback(async () => {
    const recording = recordingRef.current;
    const line      = dialogueLineRef.current;
    if (!recording) return;
    recordingRef.current = null;
    setDialogueMicState('scoring');
    try { await recording.stopAndUnloadAsync(); } catch {}
    const result = await scoreFromUri(recording.getURI(), line?.target_voweled ?? '');
    setLastTranscript(result.transcript ?? '');
    if (result.passed) {
      playFeedbackSound('correct');
      setDialogueMicState('correct');
      playAudio(line?.full_arabic ?? '', () => {
        setAudioProgress(0);
        setTimeout(() => {
          setDialogueStep(d => d + 1);
          setDialogueMicState('idle');
          setDialogueFailCount(0);
        }, 600);
      });
    } else {
      playFeedbackSound('wrong');
      setDialogueFailCount(f => f + 1);
      setDialogueMicState('wrong');
      setTimeout(() => setDialogueMicState('idle'), 1200);
    }
  }, [playAudio]);

  // ── Start dialogue recording ──────────────────────────────────────────────
  const startDialogueRecording = async (line: any) => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Microphone permission required. Please allow access in Settings.');
        setDialogueMicState('idle');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current  = recording;
      dialogueLineRef.current = line;
      setDialogueMicState('recording');
      setTimeout(() => finishDialogueRecording(), 7000);
    } catch {
      alert('Could not access microphone.');
      setDialogueMicState('idle');
    }
  };

  const stopDialogueRecording = () => { finishDialogueRecording(); };

  const passDialogueLine = (line: any) => {
    setDialogueMicState('idle'); setDialogueFailCount(0);
    playAudio(line.full_arabic, () => {
      setAudioProgress(0);
      setTimeout(() => setDialogueStep(d => d + 1), 600);
    });
  };

  // ── Expand lesson: merge words dict into stages ───────────────────────────
  const expandedLesson = useMemo(() => {
    if (!lesson) return null;
    const words = lesson.words ?? {};
    const expandedStages = (lesson.stages ?? []).map((stg: any) => {
      const word = stg.word_id ? words[stg.word_id] : null;

      if (stg.type === 'choose_translation') {
        const options = (stg.option_ids ?? stg.options ?? []).map((item: any) => {
          if (typeof item === 'string') return { ...words[item], id: item, correct: item === stg.word_id };
          return item;
        });
        return { ...word, ...stg, options };
      }

      if (stg.type === 'match_pairs' && stg.word_ids) {
        const pairs = stg.word_ids.map((wid: string) => ({
          id: wid, arabic: words[wid]?.arabic, hebrew: words[wid]?.hebrew,
        }));
        return { ...stg, pairs };
      }

      if (stg.type === 'listen_choose' && stg.items?.[0]?.word_id) {
        const items = stg.items.map((item: any) => {
          const w = words[item.word_id]; const d = words[item.distractor_id];
          return {
            arabic: w?.arabic, correct_hebrew: w?.hebrew,
            correct_icon: w?.icon, correct_icon_color: w?.icon_color,
            distractor_hebrew: d?.hebrew, distractor_icon: d?.icon, distractor_icon_color: d?.icon_color,
          };
        });
        return { ...stg, items };
      }

      if (word) return { ...word, ...stg, target_word: stg.target_word ?? word.arabic_plain };
      return stg;
    });
    return { ...lesson, stages: expandedStages };
  }, [lesson]);

  // ── Shuffle once per lesson load ──────────────────────────────────────────
  const shuffledMap = useMemo<Record<number, any>>(() => {
    if (!expandedLesson) return {};
    const map: Record<number, any> = {};
    const allWords = expandedLesson.words ?? {};
    (expandedLesson.stages ?? []).forEach((stg: any, idx: number) => {
      if (stg.type === 'choose_translation') map[idx] = shuffleArray([...(stg.options ?? [])]);
      if (stg.type === 'match_pairs')        map[idx] = shuffleArray([...(stg.pairs  ?? [])]);
      if (stg.type === 'listen_choose')
        map[idx] = (stg.items ?? []).map((item: any) => ({
          ...item,
          shuffled_options: shuffleArray([
            { hebrew: item.correct_hebrew,    icon: item.correct_icon,    icon_color: item.correct_icon_color,    correct: true  },
            { hebrew: item.distractor_hebrew, icon: item.distractor_icon, icon_color: item.distractor_icon_color, correct: false },
          ]),
        }));
      if (stg.type === 'write_translation' && stg.word_id) {
        const correctId = stg.word_id;
        const correctWord = allWords[correctId];
        if (correctWord) {
          const distractorIds = shuffleArray(
            Object.keys(allWords).filter((id: string) => id !== correctId)
          ).slice(0, 3);
          map[idx] = shuffleArray([
            { ...correctWord, id: correctId, correct: true },
            ...distractorIds.map((id: string) => ({ ...allWords[id], id, correct: false })),
          ]);
        }
      }
      if (stg.type === 'sentence_build' && stg.words?.length) {
        map[idx] = shuffleArray([...stg.words]);
      }
      if (stg.type === 'listening_comprehension' && stg.options?.length) {
        map[idx] = { options: shuffleArray([...(stg.options ?? [])]) };
      }
      // sentence_complete: word chips from lesson words
      if (stg.type === 'sentence_complete' && stg.gap_word_id) {
        const correctId = stg.gap_word_id;
        const correctWord = allWords[correctId];
        if (correctWord) {
          const distractorIds = shuffleArray(
            Object.keys(allWords).filter((id: string) => id !== correctId)
          ).slice(0, 3);
          map[idx] = shuffleArray([
            { ...correctWord, id: correctId, correct: true },
            ...distractorIds.map((id: string) => ({ ...allWords[id], id, correct: false })),
          ]);
        }
      }
    });
    return map;
  }, [expandedLesson]);

  // ── Load lesson ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/api/lessons/${id}`)
      .then(r => r.json())
      .then(data => { setLesson(data); setLoading(false); })
      .catch(() => { setError('Could not load lesson. Is the backend running on port 8000?'); setLoading(false); });
  }, [id]);

  // ── Auto-play TTS on entering any exercise that has audio ────────────────
  useEffect(() => {
    if (!expandedLesson) return;
    const stg = (expandedLesson.stages ?? [])[stage];
    let text: string | null = null;
    if (stg?.type === 'listen_repeat')           text = stg.arabic;
    else if (stg?.type === 'choose_translation') text = stg.arabic;
    else if (stg?.type === 'write_translation')  text = stg.arabic;
    else if (stg?.type === 'sentence_build')     text = stg.sentence_arabic;
    else if (stg?.type === 'shadowing')          { setShadowPhase('idle'); text = null; }
    else if (stg?.type === 'listening_comprehension') text = stg.audio_text;
    if (!text) return;
    playAudio(text);
  }, [stage, qIndex, expandedLesson, playAudio]);

  // ── STT result handler (listen_repeat + shadowing) ───────────────────────
  useEffect(() => {
    const stg = (expandedLesson?.stages ?? [])[stage];
    if (!speechResult) return;
    if (stg?.type === 'listen_repeat') {
      if (speechResult.score >= 50) {
        setListenPhase('correct');
        setTimeout(() => { goNextStage(); setListenPhase('speak'); setSpeechResult(null); }, 1400);
      } else {
        setListenPhase('wrong');
        setTimeout(() => { setListenPhase('speak'); setSpeechResult(null); }, 1200);
      }
    } else if (stg?.type === 'shadowing' && shadowPhase === 'recording') {
      if (speechResult.score >= 50) {
        setShadowPhase('correct');
        setTimeout(() => { goNextStage(); setShadowPhase('idle'); setSpeechResult(null); }, 1400);
      } else {
        setShadowPhase('wrong');
        setTimeout(() => { setShadowPhase('idle'); setSpeechResult(null); }, 1200);
      }
    }
  }, [speechResult]);

  // ── Dialogue: auto-advance NPC lines ─────────────────────────────────────
  useEffect(() => {
    if (!expandedLesson) return;
    const stg = (expandedLesson.stages ?? [])[stage];
    if (stg?.type !== 'dialogue') return;
    const lines = stg.lines ?? [];
    if (dialogueStep >= lines.length) return;
    const line = lines[dialogueStep];
    if (line.is_user_turn) return;

    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    playAudio(line.arabic, () => {
      if (cancelled) return;
      setAudioProgress(0);
      timer = setTimeout(() => setDialogueStep(d => d + 1), 600);
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      stopCurrentAudio();
    };
  }, [dialogueStep, stage, expandedLesson, playAudio, stopCurrentAudio]);

  // ── Dialogue: auto-scroll ─────────────────────────────────────────────────
  useEffect(() => {
    if (!expandedLesson) return;
    const stg = (expandedLesson.stages ?? [])[stage];
    if (stg?.type !== 'dialogue') return;
    const t = setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 200);
    return () => clearTimeout(t);
  }, [dialogueStep, stage, expandedLesson]);

  // ── Reset per-exercise state on stage change ──────────────────────────────
  const resetExerciseState = () => {
    setLockedAnswer(null); setWrongAnswers([]); setPlacedSlots([]);
    setWriteCheckState('idle'); setListenPhase('speak'); setSpeechResult(null);
    setMatchSelected(null); setMatchedIds([]); setMatchWrong(null);
    setQIndex(0); setDialogueStep(0); setAudioProgress(0);
    setDialogueMicState('idle'); setDialogueFailCount(0);
    setLastTranscript(''); setBuildSlots([]); setBuildAvailable([]); setBuildWrong(false);
    setShadowPhase('idle');
  };

  const goNextStage = useCallback(() => {
    const total = expandedLesson?.stages?.length ?? 0;
    Animated.timing(stageOpacity, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      if (stage < total - 1) { setStage(s => s + 1); resetExerciseState(); }
      else                   { setCompleted(true); playFeedbackSound('complete'); }
      Animated.timing(stageOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  }, [expandedLesson, stage, stageOpacity]);

  const goPrevStage = useCallback(() => {
    if (stage > 0) { setStage(s => s - 1); resetExerciseState(); }
  }, [stage]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading)                  return <LoadingScreen c={c} />;
  if (error || !expandedLesson) return <ErrorScreen c={c} error={error} onBack={() => router.back()} />;
  if (completed)                return <CompleteScreen c={c} lesson={expandedLesson} onHome={() => router.push('/')} />;

  const stages       = expandedLesson.stages ?? [];
  const totalStages  = stages.length;
  const currentStage = stages[stage];
  const progress     = (stage + 1) / totalStages;

  // ── Floating mic derivations ──────────────────────────────────────────────
  const currentLines       = currentStage?.type === 'dialogue' ? (currentStage.lines ?? []) : [];
  const currentDialogueLine = currentLines[dialogueStep];
  const isActiveUserTurn   = !!(currentDialogueLine?.is_user_turn && dialogueStep < currentLines.length);
  const isShadowingTurn    = currentStage?.type === 'shadowing' && (shadowPhase === 'recording' || shadowPhase === 'ready' || shadowPhase === 'correct' || shadowPhase === 'wrong');
  const showFloatingMic    = currentStage?.type === 'listen_repeat' || isActiveUserTurn || isShadowingTurn;

  const micIsRecording = (currentStage?.type === 'listen_repeat' && listenPhase === 'recording') ||
                         (isActiveUserTurn && dialogueMicState === 'recording') ||
                         (currentStage?.type === 'shadowing' && shadowPhase === 'recording');
  const micIsScoring   = (isActiveUserTurn && dialogueMicState === 'scoring');
  const micIsCorrect   = (currentStage?.type === 'listen_repeat' && listenPhase === 'correct') ||
                         (isActiveUserTurn && dialogueMicState === 'correct') ||
                         (currentStage?.type === 'shadowing' && shadowPhase === 'correct');
  const micIsWrong     = (currentStage?.type === 'listen_repeat' && listenPhase === 'wrong') ||
                         (isActiveUserTurn && dialogueMicState === 'wrong') ||
                         (currentStage?.type === 'shadowing' && shadowPhase === 'wrong');
  const micColor       = micIsWrong ? c.wrong : c.primary;
  const showPassLink   = isActiveUserTurn && dialogueFailCount >= PASS_AFTER_FAILS && !micIsRecording && !micIsScoring;

  const handleFloatingMicPress = () => {
    if (currentStage?.type === 'listen_repeat') {
      if (listenPhase === 'recording') stopRecording();
      else if (listenPhase === 'speak') startRecording(currentStage.arabic);
    } else if (currentStage?.type === 'shadowing') {
      if (shadowPhase === 'recording') {
        finishListenRepeatRecording();
        setShadowPhase('idle');
      } else if (shadowPhase === 'ready') {
        startRecording(currentStage.sentence_arabic);
        setShadowPhase('recording');
      }
    } else if (isActiveUserTurn) {
      if (dialogueMicState === 'recording') stopDialogueRecording();
      else if (dialogueMicState === 'idle') startDialogueRecording(currentDialogueLine);
    }
  };

  // ── Letter-block helpers ──────────────────────────────────────────────────
  const disabledIdxs    = new Set(placedSlots.map(s => s.idx));
  const constructedWord = placedSlots.map(s => s.char).join('');

  const tapBlock = (char: string, idx: number) => {
    if (disabledIdxs.has(idx) || writeCheckState === 'correct') return;
    setPlacedSlots(prev => [...prev, { char, idx }]);
  };

  const deleteBlock = () => {
    if (writeCheckState === 'correct') return;
    setPlacedSlots(prev => prev.slice(0, -1));
  };

  const checkWord = (target: string, onCorrect: () => void) => {
    if (constructedWord === target) {
      setWriteCheckState('correct'); onCorrect();
    } else {
      setWriteCheckState('wrong');
      setTimeout(() => { setWriteCheckState('idle'); setPlacedSlots([]); }, 700);
    }
  };

  const renderLetterBlocks = (blocks: string[]) => (
    <View style={s.blocksWrap}>
      {blocks.map((char, idx) => {
        const disabled = disabledIdxs.has(idx);
        return (
          <TouchableOpacity key={idx}
            style={[s.block, {
              backgroundColor: disabled ? c.surface : c.card,
              borderColor: c.border, opacity: disabled ? 0.4 : 1,
            }]}
            onPress={() => tapBlock(char, idx)}
            disabled={disabled || writeCheckState === 'correct'}
            activeOpacity={0.75}
          >
            <Text style={[s.blockChar, { color: c.text }]}>{char}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderBlockActions = (target: string, onCorrect: () => void) => (
    <View style={s.blockActions}>
      <TouchableOpacity style={[s.deleteBtn, { borderColor: c.border }]} onPress={deleteBlock}>
        <Ionicons name="backspace-outline" size={20} color={c.label} />
      </TouchableOpacity>
      {constructedWord.length > 0 && (
        <TouchableOpacity
          style={[s.doneBtn, { backgroundColor: writeCheckState === 'correct' ? c.right : c.primary }]}
          onPress={() => checkWord(target, onCorrect)}
          disabled={writeCheckState === 'correct'}
        >
          {writeCheckState === 'correct'
            ? <Ionicons name="checkmark" size={20} color="#fff" />
            : <Text style={s.doneBtnText}>Done</Text>}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderInputPill = () => (
    <View style={[s.inputPill, {
      borderColor: writeCheckState === 'correct' ? c.right : writeCheckState === 'wrong' ? c.wrong : c.primary,
      backgroundColor: writeCheckState === 'correct' ? c.right + '18' : writeCheckState === 'wrong' ? c.wrong + '12' : c.primary + '08',
    }]}>
      {constructedWord
        ? <Text style={[s.inputPillText, {
            color: writeCheckState === 'correct' ? c.right : writeCheckState === 'wrong' ? c.wrong : c.text,
          }]}>{constructedWord}</Text>
        : <Text style={[s.inputPillPlaceholder, { color: c.label }]}>_ _ _</Text>
      }
    </View>
  );

  // ── Arabic gap renderer ───────────────────────────────────────────────────
  const renderArabicGap = (fullArabic: string, targetVoweled: string) => {
    const idx = fullArabic.indexOf(targetVoweled);
    if (idx === -1) {
      return (
        <View style={[s.arabicGapPill, { backgroundColor: c.primary + '15', borderColor: c.primary + '40' }]}>
          <Text style={[s.dialogueArabic, { color: c.primary }]}>{fullArabic}</Text>
        </View>
      );
    }
    const before = fullArabic.slice(0, idx);
    const after  = fullArabic.slice(idx + targetVoweled.length);
    return (
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
        {before !== '' && <Text style={[s.dialogueArabic, { color: c.text }]}>{before}</Text>}
        <View style={[s.blankField, {
          borderTopColor:    c.primary + '55',
          borderLeftColor:   c.primary + '55',
          borderRightColor:  c.primary + '55',
          borderBottomColor: c.primary,
          backgroundColor:   c.surface,
        }]} />
        {after !== '' && <Text style={[s.dialogueArabic, { color: c.text }]}>{after}</Text>}
      </View>
    );
  };

  // ── Hebrew gap renderer ───────────────────────────────────────────────────
  const renderHebrewGap = (hebrew: string, gap: string) => {
    if (!gap || !hebrew.includes(gap))
      return <Text style={[s.dialogueHebrew, { color: c.label, fontStyle: 'italic' }]}>{hebrew}</Text>;
    const parts = hebrew.split(gap);
    return (
      <Text style={[s.dialogueHebrew, { color: c.label, fontStyle: 'italic' }]}>
        {parts[0]}
        <Text style={{ fontWeight: '800', color: c.primary, fontStyle: 'normal' }}>{gap}</Text>
        {parts.slice(1).join(gap)}
      </Text>
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // STAGE RENDERERS
  // ════════════════════════════════════════════════════════════════════════════

  // ── Listen & Repeat ───────────────────────────────────────────────────────
  const renderListenRepeat = () => {
    const stg = currentStage;
    return (
      <View style={s.stageWrap}>
        <TouchableOpacity
          onPress={() => playAudio(stg.arabic)}
          activeOpacity={0.92}
          style={{ alignSelf: 'center', marginBottom: 24 }}
        >
          <WordIcon icon={stg.icon} iconColor={stg.icon_color} size={160} />
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <AudioProgressRing
            progress={audioProgress} size={52}
            ringColor={c.primary} trackColor={c.border}
            onPress={() => playAudio(stg.arabic)}
          >
            <View style={[s.audioInner, { backgroundColor: c.card }]}>
              <Ionicons name="volume-high" size={20} color={c.primary} />
            </View>
          </AudioProgressRing>
        </View>

        <Text style={[s.arabicLarge,  { color: c.text  }]}>{stg.arabic}</Text>
        <Text style={[s.pronText,     { color: c.label }]}>[{stg.hebrew_pronunciation}]</Text>
        <Text style={[s.hebrewText,   { color: c.text  }]}>{stg.hebrew}</Text>
      </View>
    );
  };

  // ── Choose Translation ────────────────────────────────────────────────────
  const renderChooseTranslation = () => {
    const stg      = currentStage;
    const options  = shuffledMap[stage] ?? stg.options ?? [];
    const isLocked = lockedAnswer !== null;
    return (
      <View style={s.stageWrap}>
        <View style={s.audioRow}>
          <AudioProgressRing
            progress={audioProgress} size={52}
            ringColor={c.primary} trackColor={c.border}
            onPress={() => playAudio(stg.arabic)}
          >
            <View style={[s.audioInner, { backgroundColor: c.card }]}>
              <Ionicons name="volume-high" size={20} color={c.primary} />
            </View>
          </AudioProgressRing>
          <Text style={[s.arabicMedium, { color: c.text }]}>{stg.arabic}</Text>
        </View>
        <View style={s.choiceGrid}>
          {options.map((opt: any) => {
            const isWrong   = wrongAnswers.includes(opt.id);
            const isCorrect = isLocked && opt.correct;
            const ic        = opt.icon ?? DEFAULT_ICON;
            const col       = opt.icon_color ?? DEFAULT_COLOR;
            return (
              <TouchableOpacity key={opt.id}
                style={[s.choiceCard, {
                  backgroundColor: isCorrect ? c.primary + '18' : isWrong ? c.wrong + '10' : c.card,
                  borderColor: isCorrect ? c.primary : isWrong ? c.wrong : c.border,
                  borderWidth: 2,
                  shadowColor: isCorrect ? c.primary : isWrong ? c.wrong : '#a0846a',
                  shadowOpacity: isCorrect || isWrong ? 0.18 : 0.07,
                }]}
                onPress={() => {
                  if (isLocked || isWrong) return;
                  if (opt.correct) {
                    setLockedAnswer(opt.id);
                    playFeedbackSound('correct');
                    setTimeout(() => goNextStage(), 900);
                  } else {
                    playFeedbackSound('wrong');
                    setWrongAnswers(w => [...w, opt.id]);
                    setTimeout(() => setWrongAnswers(w => w.filter(id => id !== opt.id)), 650);
                  }
                }}
                disabled={isLocked || isWrong}
                activeOpacity={1}
              >
                <View style={[s.choiceCardIcon, { backgroundColor: col + '18' }]}>
                  <Ionicons name={toIonicon(ic)} size={52} color={col} />
                </View>
                <View style={s.choiceCardLabel}>
                  <Text style={[s.choiceCardText, {
                    color: isCorrect ? c.primary : isWrong ? c.wrong : c.text,
                  }]} numberOfLines={2}>{opt.hebrew}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // ── Write Translation → 2 word choices at bottom ─────────────────────────
  const renderWriteTranslation = () => {
    const stg      = currentStage;
    const allOpts  = shuffledMap[stage] ?? [];
    const isLocked = lockedAnswer !== null;

    // Pick exactly 2: one correct, one distractor — shuffled
    const correct    = allOpts.find((o: any) => o.correct);
    const distractor = allOpts.find((o: any) => !o.correct);
    const twoOptions: any[] = shuffleArray([correct, distractor].filter(Boolean));

    return (
      <View style={[s.stageWrap, { flex: 1 }]}>
        {/* Word display centred in available space */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <WordIcon icon={stg.icon} iconColor={stg.icon_color} size={148} />
          <Text style={[s.hebrewText, { color: c.text, textAlign: 'center', marginBottom: 0 }]}>
            {stg.hebrew}
          </Text>
          <Text style={[s.pronText, { color: c.label }]}>
            [{stg.hebrew_pronunciation}]
          </Text>
        </View>

        {/* Two options pinned to the bottom */}
        <View style={[s.wordChoiceGrid, { marginTop: 24, marginBottom: 8 }]}>
          {twoOptions.map((opt: any) => {
            const isWrong   = wrongAnswers.includes(opt.id);
            const isCorrect = isLocked && opt.correct;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[s.wordChip, {
                  backgroundColor: isCorrect ? c.primary + '15' : isWrong ? c.wrong + '10' : c.card,
                  borderColor:     isCorrect ? c.primary : isWrong ? c.wrong : c.border,
                  borderWidth:     isCorrect || isWrong ? 2.5 : 1.5,
                }]}
                onPress={() => {
                  playAudio(opt.arabic);
                  if (isLocked || isWrong) return;
                  if (opt.correct) {
                    setLockedAnswer(opt.id);
                    playFeedbackSound('correct');
                    setTimeout(() => goNextStage(), 900);
                  } else {
                    playFeedbackSound('wrong');
                    setWrongAnswers(w => [...w, opt.id]);
                    setTimeout(() => setWrongAnswers(w => w.filter(id => id !== opt.id)), 650);
                  }
                }}
                disabled={isLocked}
                activeOpacity={1}
              >
                <Text style={[s.wordChipText, {
                  color: isCorrect ? c.primary : isWrong ? c.wrong : c.text,
                }]}>{opt.arabic}</Text>
                {isCorrect && <Ionicons name="checkmark-circle" size={18} color={c.primary} style={{ marginTop: 4 }} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // ── Dialogue ──────────────────────────────────────────────────────────────
  const renderDialogue = () => {
    const stg       = currentStage;
    const lines     = stg.lines ?? [];
    const isAllDone = dialogueStep >= lines.length;

    return (
      <View style={s.stageWrap}>
        <View style={s.dialogueThread}>
          {lines.map((line: any, idx: number) => {
            if (idx > dialogueStep) return null;
            const isNPC  = !line.is_user_turn;
            const isDone = line.is_user_turn && idx < dialogueStep;

            // ── NPC bubble ────────────────────────────────────────────────
            if (isNPC) {
              return (
                <View key={idx} style={s.npcWrap}>
                  <View style={s.npcAvatarAnchor}>
                    <Image source={getAvatar(npcAvatar)} style={s.avatarImage} />
                  </View>
                  <TouchableOpacity
                    style={[s.npcBubble, {
                      backgroundColor: c.card,
                      borderColor: c.border,
                      shadowColor: '#000',
                    }]}
                    onPress={() => playAudio(line.arabic)}
                    activeOpacity={0.88}
                  >
                    <Text style={[s.dialogueName, { color: c.label }]}>{line.name}</Text>
                    <TouchableOpacity onPress={() => playAudio(line.arabic)} activeOpacity={0.75}>
                      <Text style={[s.dialogueArabic, { color: c.text }]}>{line.arabic}</Text>
                    </TouchableOpacity>
                    {line.hebrew_pronunciation ? (
                      <Text style={[s.dialoguePron, { color: c.label }]}>[{line.hebrew_pronunciation}]</Text>
                    ) : null}
                    <Text style={[s.dialogueHebrew, { color: c.label, fontStyle: 'italic' }]}>{line.hebrew}</Text>
                    <View style={s.replayRow}>
                      <Ionicons name="volume-low" size={12} color={c.label} />
                      <Text style={[s.tapHint, { color: c.label }]}>Tap word to hear</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            }

            // ── Completed user bubble ─────────────────────────────────────
            if (isDone) {
              return (
                <View key={idx} style={s.userWrap}>
                  <View style={s.userAvatarAnchor}>
                    <Image source={getAvatar(userAvatar)} style={s.avatarImage} />
                  </View>
                  <View style={[s.userBubble, {
                    backgroundColor: c.right + '0C',
                    borderColor: c.right + '30',
                  }]}>
                    <Text style={[s.dialogueArabic, { color: c.right, textAlign: 'right' }]}>
                      {line.full_arabic}
                    </Text>
                  </View>
                </View>
              );
            }

            // ── Active user turn ──────────────────────────────────────────
            const bubbleBg = dialogueMicState === 'correct'
              ? c.right + '0C'
              : dialogueMicState === 'wrong'
              ? c.wrong + '0A'
              : c.card;
            const bubbleBorder = dialogueMicState === 'correct'
              ? c.right + '35'
              : dialogueMicState === 'wrong'
              ? c.wrong + '35'
              : c.border;

            return (
              <View key={idx} style={s.userWrap}>
                <View style={s.userAvatarAnchor}>
                  <Image source={getAvatar(userAvatar)} style={s.avatarImage} />
                </View>
                <View style={[s.userBubble, {
                  backgroundColor: bubbleBg,
                  borderColor: bubbleBorder,
                }]}>
                  {renderHebrewGap(line.hebrew, line.hebrew_gap)}
                  <View style={{ marginTop: 10 }}>
                    {renderArabicGap(line.full_arabic, line.target_voweled)}
                  </View>
                  {dialogueMicState === 'wrong' && lastTranscript.length > 1 && (
                    <Text style={{ color: c.wrong, fontSize: 12, marginTop: 6 }}>
                      I heard: {lastTranscript}
                    </Text>
                  )}
                  {dialogueMicState === 'scoring' && (
                    <View style={{ alignItems: 'center', marginTop: 12 }}>
                      <ActivityIndicator color={c.primary} size="small" />
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {isAllDone && (
          <View style={s.dialogueCompleteWrap}>
            {stg.cultural_note && (
              <View style={[s.culturalNoteCard, { backgroundColor: c.card }]}>
                <Ionicons name="information-circle-outline" size={20} color={c.primary} style={{ marginBottom: 6 }} />
                <Text style={[s.culturalNote, { color: c.label }]}>{stg.cultural_note}</Text>
              </View>
            )}
            <TouchableOpacity style={[s.btn, { backgroundColor: c.primary }]} onPress={goNextStage}>
              <Text style={s.btnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ── Match Pairs ───────────────────────────────────────────────────────────
  const renderMatchPairs = () => {
    const pairs         = currentStage.pairs ?? [];
    const shuffledRight = shuffledMap[stage] ?? [...pairs];
    const allMatched    = matchedIds.length === pairs.length && pairs.length > 0;
    return (
      <View style={s.stageWrap}>
        <Text style={[s.matchCounter, { color: c.label }]}>{matchedIds.length} / {pairs.length} matched</Text>
        <View style={s.matchGrid}>
          <View style={s.matchCol}>
            {pairs.map((p: any) => {
              const isMatched  = matchedIds.includes(p.id);
              const isSelected = matchSelected === p.id;
              return (
                <TouchableOpacity key={p.id}
                  style={[s.matchChipLeft, {
                    backgroundColor: isMatched ? c.right + '20' : isSelected ? c.primary + '22' : c.card,
                    borderColor:     isMatched ? c.right         : isSelected ? c.primary        : c.border,
                    opacity: isMatched ? 0.6 : 1,
                  }]}
                  onPress={() => !isMatched && setMatchSelected(p.id)}
                  disabled={isMatched} activeOpacity={0.8}
                >
                  <Text style={[s.matchAr, { color: isMatched ? c.right : isSelected ? c.primary : c.text }]}>
                    {p.arabic}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={s.matchCol}>
            {shuffledRight.map((p: any) => {
              const isMatched = matchedIds.includes(p.id);
              const isWrong   = matchWrong === p.id;
              return (
                <TouchableOpacity key={p.id}
                  style={[s.matchChipRight, {
                    backgroundColor: isMatched ? c.right + '20' : isWrong ? c.wrong + '20' : c.card,
                    borderColor:     isMatched ? c.right         : isWrong ? c.wrong         : c.border,
                    opacity: isMatched ? 0.6 : 1,
                  }]}
                  onPress={() => {
                    if (isMatched || !matchSelected) return;
                    if (p.id === matchSelected) {
                      setMatchedIds(prev => [...prev, p.id]);
                      setMatchSelected(null);
                    } else {
                      setMatchWrong(p.id);
                      setTimeout(() => setMatchWrong(null), 500);
                      setMatchSelected(null);
                    }
                  }}
                  disabled={isMatched} activeOpacity={0.8}
                >
                  <Text style={[s.matchHe, { color: isMatched ? c.right : isWrong ? c.wrong : c.text }]}>
                    {p.hebrew}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        {allMatched && (
          <TouchableOpacity style={[s.btn, { backgroundColor: c.primary, marginTop: 24 }]} onPress={goNextStage}>
            <Text style={s.btnText}>Continue</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── Listen & Choose ───────────────────────────────────────────────────────
  const renderListenChoose = () => {
    const items    = shuffledMap[stage] ?? currentStage.items ?? [];
    const item     = items[qIndex];
    if (!item) return null;
    const isLocked = lockedAnswer !== null;
    return (
      <View style={s.stageWrap}>
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <AudioProgressRing
            progress={audioProgress} size={86}
            ringColor={c.primary} trackColor={c.border}
            onPress={() => playAudio(item.arabic)}
          >
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: c.primary,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: c.primary, shadowOpacity: 0.35,
              shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 8,
            }}>
              <Ionicons name="volume-high" size={30} color="#fff" />
            </View>
          </AudioProgressRing>
        </View>
        <View style={[s.choiceGrid, { marginTop: 8 }]}>
          {(item.shuffled_options ?? []).map((opt: any, idx: number) => {
            const isWrong   = wrongAnswers.includes(`lc_${idx}`);
            const isCorrect = isLocked && opt.correct;
            const ic        = opt.icon ?? DEFAULT_ICON;
            const col       = opt.icon_color ?? DEFAULT_COLOR;
            return (
              <TouchableOpacity key={idx}
                style={[s.choiceCard, {
                  backgroundColor: isCorrect ? c.primary + '18' : isWrong ? c.wrong + '10' : c.card,
                  borderColor: isCorrect ? c.primary : isWrong ? c.wrong : c.border,
                  borderWidth: 2,
                }]}
                onPress={() => {
                  if (isLocked || isWrong) return;
                  if (opt.correct) {
                    setLockedAnswer('ok');
                  } else {
                    playFeedbackSound('wrong');
                    setWrongAnswers(w => [...w, `lc_${idx}`]);
                    setTimeout(() => setWrongAnswers(w => w.filter(id => id !== `lc_${idx}`)), 600);
                  }
                }}
                disabled={isLocked || isWrong} activeOpacity={1}
              >
                <View style={[s.choiceCardIcon, { backgroundColor: col + '18' }]}>
                  <Ionicons name={toIonicon(ic)} size={52} color={col} />
                </View>
                <View style={s.choiceCardLabel}>
                  <Text style={[s.choiceCardText, {
                    color: isCorrect ? c.primary : isWrong ? c.wrong : c.text,
                  }]} numberOfLines={2}>{opt.hebrew}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        {isLocked && (
          <TouchableOpacity
            style={[s.doneBtn, { backgroundColor: c.primary, marginTop: 16 }]}
            onPress={() => {
              playFeedbackSound('correct');
              setTimeout(() => {
                if (qIndex < items.length - 1) {
                  setQIndex(i => i + 1); setLockedAnswer(null); setWrongAnswers([]);
                } else { goNextStage(); }
              }, 800);
            }}
          >
            <Text style={[s.doneBtnText, { color: '#fff' }]}>בדוק ✓</Text>
          </TouchableOpacity>
        )}
        <Text style={[s.matchCounter, { color: c.label, marginTop: 12 }]}>{qIndex + 1} / {items.length}</Text>
      </View>
    );
  };

  // ── Sentence Build ────────────────────────────────────────────────────────
  const renderSentenceBuild = () => {
    const stg = currentStage;
    const words: string[] = stg.words ?? [];
    const shuffled: string[] = shuffledMap[stage] ?? words;
    const isComplete = buildSlots.length === words.length;

    const handleAvailableTap = (displayIdx: number) => {
      if (buildAvailable[displayIdx]) return;
      const word = shuffled[displayIdx];
      playAudio(word);
      setBuildSlots(s => [...s, word]);
      setBuildAvailable(prev => {
        const next = [...prev];
        next[displayIdx] = true;
        return next;
      });
    };

    const handleSlotTap = (slotIdx: number) => {
      const word = buildSlots[slotIdx];
      const displayIdx = shuffled.indexOf(word, 0);
      setBuildSlots(s => s.filter((_, i) => i !== slotIdx));
      setBuildAvailable(prev => {
        const next = [...prev];
        const firstUsed = shuffled.findIndex((w, i) => w === word && next[i]);
        if (firstUsed !== -1) next[firstUsed] = false;
        return next;
      });
    };

    const handleCheck = () => {
      const built = buildSlots.join(' ').trim();
      const target = stg.sentence_arabic?.trim() ?? '';
      const stripDiacritics = (s: string) => s.replace(/[\u0610-\u061A\u064B-\u065F\u0670]/g, '').trim();
      if (stripDiacritics(built) === stripDiacritics(target)) {
        playFeedbackSound('correct');
        setTimeout(() => goNextStage(), 900);
      } else {
        playFeedbackSound('wrong');
        setBuildWrong(true);
        setTimeout(() => { setBuildWrong(false); setBuildSlots([]); setBuildAvailable([]); }, 700);
      }
    };

    return (
      <View style={s.stageWrap}>
        <Text style={[s.dialogueArabic, { color: c.text, textAlign: 'center', fontSize: 22, marginBottom: 16 }]}>
          {stg.sentence_hebrew}
        </Text>

        {/* Placed-word slot area — RTL so Arabic words flow right-to-left */}
        <View style={[s.sentenceCard, {
          backgroundColor: c.card,
          minHeight: 64,
          flexDirection: 'row-reverse',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 8,
          borderColor: buildWrong ? c.wrong : c.border,
          borderWidth: buildWrong ? 2 : 1.5,
        }]}>
          {buildSlots.length === 0 ? (
            <Text style={{ color: c.label, fontSize: 14 }}>Tap words to build…</Text>
          ) : buildSlots.map((word, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => handleSlotTap(i)}
              style={[s.wordChip, {
                backgroundColor: buildWrong ? c.wrong + '18' : c.primary + '15',
                borderColor: buildWrong ? c.wrong : c.primary,
                borderWidth: 1.5,
              }]}
              activeOpacity={0.75}
            >
              <Text style={[s.wordChipText, { color: buildWrong ? c.wrong : c.primary }]}>{word}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Available word blocks — RTL layout */}
        <View style={[s.wordChoiceGrid, { marginTop: 16, flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center' }]}>
          {shuffled.map((word, displayIdx) => {
            const used = buildAvailable[displayIdx] === true;
            return (
              <TouchableOpacity
                key={displayIdx}
                onPress={() => !used && handleAvailableTap(displayIdx)}
                style={[s.wordChip, {
                  backgroundColor: used ? c.surface : c.card,
                  opacity: used ? 0.32 : 1,
                }]}
                disabled={used}
                activeOpacity={0.8}
              >
                <Text style={[s.wordChipText, { color: c.text }]}>{word}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Check button */}
        <TouchableOpacity
          style={[s.btn, {
            backgroundColor: isComplete ? c.primary : c.border,
            marginTop: 24,
            opacity: isComplete ? 1 : 0.55,
          }]}
          onPress={handleCheck}
          disabled={!isComplete}
          activeOpacity={0.85}
        >
          <Text style={[s.btnText, { color: isComplete ? '#fff' : c.label }]}>Check</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Cultural Note ─────────────────────────────────────────────────────────
  const renderCulturalNote = () => {
    const stg = currentStage;
    return (
      <View style={[s.stageWrap, { flex: 1 }]}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 4 }}>
          {/* Icon */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <View style={[s.culturalNoteIcon, { backgroundColor: c.primary + '18' }]}>
              <Ionicons name="sparkles" size={40} color={c.primary} />
            </View>
          </View>

          {/* Title */}
          <Text style={[s.culturalNoteTitle, { color: c.text }]}>{stg.title}</Text>

          {/* Body */}
          <View style={[s.culturalNoteBody, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.culturalNoteText, { color: c.text }]}>{stg.body_hebrew}</Text>
          </View>

          {/* Audio button (optional) */}
          {stg.audio_text && (
            <TouchableOpacity
              style={[s.culturalNoteAudio, { borderColor: c.primary + '50', backgroundColor: c.primary + '10' }]}
              onPress={() => playAudio(stg.audio_text)}
              activeOpacity={0.8}
            >
              <Ionicons name="volume-high" size={18} color={c.primary} />
              <Text style={[s.culturalNoteAudioText, { color: c.primary }]}>שמע בערבית</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Continue button */}
        <TouchableOpacity
          style={[s.btn, { backgroundColor: c.primary, marginBottom: 8 }]}
          onPress={goNextStage}
          activeOpacity={0.85}
        >
          <Text style={s.btnText}>המשך</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Sentence Complete ─────────────────────────────────────────────────────
  const renderSentenceComplete = () => {
    const stg      = currentStage;
    const isLocked = lockedAnswer !== null;
    // Build word chips: correct word + distractors from shuffledMap
    const options  = shuffledMap[stage] ?? [];

    return (
      <View style={s.stageWrap}>
        {/* Arabic sentence with gap — tap any word to hear it */}
        <View style={[s.sentenceCard, { backgroundColor: c.card }]}>
          <TouchableOpacity onPress={() => playAudio(stg.arabic_context ?? '')} activeOpacity={0.8}>
            <Text style={[s.dialogueArabic, { color: c.text, marginBottom: 8 }]}>
              {stg.arabic_context}
              {' '}
              <Text style={{ color: c.primary }}>____</Text>
            </Text>
          </TouchableOpacity>
          {/* Hebrew translation below Arabic */}
          <Text style={[s.hebrewHint, { color: c.label }]}>{stg.sentence_translation}</Text>
        </View>

        {/* Word chips */}
        <View style={[s.wordChoiceGrid, { marginTop: 16 }]}>
          {options.length > 0 ? options.map((opt: any) => {
            const isWrong   = wrongAnswers.includes(opt.id);
            const isCorrect = isLocked && opt.correct;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[s.wordChip, {
                  backgroundColor: isCorrect ? c.primary + '15' : isWrong ? c.wrong + '10' : c.card,
                  borderColor: isCorrect ? c.primary : isWrong ? c.wrong : c.border,
                  borderWidth: isCorrect || isWrong ? 2.5 : 1.5,
                }]}
                onPress={() => {
                  if (isLocked || isWrong) return;
                  playAudio(opt.arabic);
                  if (opt.correct) {
                    setLockedAnswer(opt.id);
                    playFeedbackSound('correct');
                    setTimeout(() => goNextStage(), 900);
                  } else {
                    playFeedbackSound('wrong');
                    setWrongAnswers(w => [...w, opt.id]);
                    setTimeout(() => setWrongAnswers(w => w.filter(id => id !== opt.id)), 650);
                  }
                }}
                disabled={isLocked || isWrong}
                activeOpacity={1}
              >
                <Text style={[s.wordChipText, {
                  color: isCorrect ? c.primary : isWrong ? c.wrong : c.text,
                }]}>{opt.arabic}</Text>
                {isCorrect && <Ionicons name="checkmark-circle" size={18} color={c.primary} style={{ marginTop: 4 }} />}
              </TouchableOpacity>
            );
          }) : (
            // Fallback to letter blocks if no word chips available
            <>
              {renderLetterBlocks(stg.letter_blocks ?? [])}
              {renderBlockActions(stg.target_word, () => { setTimeout(() => goNextStage(), 1100); })}
            </>
          )}
        </View>
      </View>
    );
  };

  // ── Shadowing ─────────────────────────────────────────────────────────────
  const renderShadowing = () => {
    const stg = currentStage;
    const isPlaying = shadowPhase === 'playing';
    return (
      <View style={[s.stageWrap, { alignItems: 'center' }]}>
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <AudioProgressRing
            progress={isPlaying ? audioProgress : 0}
            size={72}
            ringColor={c.primary} trackColor={c.border}
            onPress={() => {
              if (shadowPhase !== 'playing') {
                setShadowPhase('playing');
                playAudio(stg.sentence_arabic, () => {
                  setShadowPhase('ready');
                  setTimeout(() => {
                    startRecording(stg.sentence_arabic);
                    setShadowPhase('recording');
                  }, 800);
                });
              }
            }}
          >
            <View style={[s.audioInner, { backgroundColor: isPlaying ? c.primary : c.card, width: 56, height: 56, borderRadius: 28 }]}>
              <Ionicons name={isPlaying ? 'volume-high' : 'play'} size={24} color={isPlaying ? '#fff' : c.primary} />
            </View>
          </AudioProgressRing>
        </View>

        <Text style={[s.arabicLarge, { color: c.text, fontSize: 34, lineHeight: 50 }]} adjustsFontSizeToFit>
          {stg.sentence_arabic}
        </Text>
        {stg.hebrew_pronunciation && (
          <Text style={[s.pronText, { color: c.label }]}>[{stg.hebrew_pronunciation}]</Text>
        )}
        <Text style={[s.hebrewText, { color: c.text }]}>{stg.sentence_hebrew}</Text>

        {shadowPhase === 'idle' && (
          <Text style={[s.micHint, { color: c.label, marginTop: 8 }]}>לחץ על הכפתור להאזנה</Text>
        )}
        {shadowPhase === 'ready' && (
          <Text style={[s.micHint, { color: c.primary, fontWeight: '700', marginTop: 8 }]}>עכשיו חזור אחרי!</Text>
        )}
        {shadowPhase === 'correct' && (
          <View style={{ alignItems: 'center', marginTop: 16, gap: 8 }}>
            <Ionicons name="checkmark-circle" size={48} color={c.right} />
            <Text style={{ color: c.right, fontSize: 18, fontWeight: '800' }}>מעולה!</Text>
          </View>
        )}
        {shadowPhase === 'wrong' && (
          <View style={{ alignItems: 'center', marginTop: 16, gap: 8 }}>
            <Ionicons name="close-circle" size={48} color={c.wrong} />
            <Text style={{ color: c.wrong, fontSize: 18, fontWeight: '700' }}>נסה שוב</Text>
          </View>
        )}
      </View>
    );
  };

  // ── Listening Comprehension ───────────────────────────────────────────────
  const renderListeningComprehension = () => {
    const stg      = currentStage;
    const shuffled = shuffledMap[stage];
    const options  = shuffled?.options ?? stg.options ?? [];
    const isLocked = lockedAnswer !== null;

    return (
      <View style={s.stageWrap}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <AudioProgressRing
            progress={audioProgress} size={86}
            ringColor={c.primary} trackColor={c.border}
            onPress={() => playAudio(stg.audio_text)}
          >
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: c.primary,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: c.primary, shadowOpacity: 0.35,
              shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 8,
            }}>
              <Ionicons name="headset" size={30} color="#fff" />
            </View>
          </AudioProgressRing>
        </View>

        <Text style={[s.lcQuestion, { color: c.text }]}>{stg.question_he}</Text>

        <View style={s.lcOptionsList}>
          {options.map((opt: any) => {
            const isWrong   = wrongAnswers.includes(opt.id);
            const isCorrect = isLocked && opt.correct;
            if (isWrong) return null;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[s.lcOption, {
                  backgroundColor: isCorrect ? c.right + '15' : c.card,
                  borderColor:     isCorrect ? c.right        : c.border,
                  borderWidth: isCorrect ? 2 : 1.5,
                }]}
                onPress={() => {
                  if (isLocked) return;
                  if (opt.correct) {
                    setLockedAnswer(opt.id);
                    playFeedbackSound('correct');
                    setTimeout(() => goNextStage(), 900);
                  } else {
                    playFeedbackSound('wrong');
                    setWrongAnswers(w => [...w, opt.id]);
                  }
                }}
                disabled={isLocked} activeOpacity={0.8}
              >
                {isCorrect && <Ionicons name="checkmark-circle" size={20} color={c.right} style={{ marginRight: 10 }} />}
                <Text style={[s.lcOptionText, {
                  color: isCorrect ? c.right : c.text,
                  fontWeight: isCorrect ? '700' : '500',
                }]}>{opt.hebrew}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // ── Idiom Card ────────────────────────────────────────────────────────────
  const renderIdiomCard = () => {
    const stg = currentStage;
    return (
      <View style={[s.stageWrap, { flex: 1 }]}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 4 }}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={[s.culturalNoteIcon, { backgroundColor: c.primary + '18' }]}>
              <Ionicons name="chatbubble-ellipses" size={40} color={c.primary} />
            </View>
          </View>

          <Text style={[s.idiomArabic, { color: c.text }]}>{stg.idiom_arabic}</Text>
          {stg.idiom_hebrew && (
            <Text style={[s.pronText, { color: c.label, fontStyle: 'italic', marginBottom: 20 }]}>
              {stg.idiom_hebrew}
            </Text>
          )}

          <View style={[s.idiomMeaningCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={s.idiomMeaningRow}>
              <Ionicons name="book-outline" size={16} color={c.label} />
              <View style={{ flex: 1 }}>
                <Text style={[s.idiomMeaningLabel, { color: c.label }]}>פשוטו כמשמעו</Text>
                <Text style={[s.idiomMeaningText, { color: c.text }]}>{stg.literal_meaning_he}</Text>
              </View>
            </View>
            <View style={[s.idiomDivider, { backgroundColor: c.border }]} />
            <View style={s.idiomMeaningRow}>
              <Ionicons name="bulb-outline" size={16} color={c.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[s.idiomMeaningLabel, { color: c.label }]}>בפועל</Text>
                <Text style={[s.idiomMeaningText, { color: c.text }]}>{stg.actual_meaning_he}</Text>
              </View>
            </View>
          </View>

          {stg.example_arabic && (
            <View style={{ marginTop: 16 }}>
              <Text style={[s.idiomMeaningLabel, { color: c.label, textAlign: 'center', marginBottom: 6 }]}>דוגמה</Text>
              <Text style={[s.dialogueArabic, { color: c.text, textAlign: 'center', fontSize: 20 }]}>
                {stg.example_arabic}
              </Text>
              <Text style={[s.pronText, { color: c.label }]}>{stg.example_hebrew}</Text>
            </View>
          )}

          {stg.audio_text && (
            <TouchableOpacity
              style={[s.culturalNoteAudio, { borderColor: c.primary + '50', backgroundColor: c.primary + '10', marginTop: 16 }]}
              onPress={() => playAudio(stg.audio_text)}
              activeOpacity={0.8}
            >
              <Ionicons name="volume-high" size={18} color={c.primary} />
              <Text style={[s.culturalNoteAudioText, { color: c.primary }]}>שמע דוגמה</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[s.btn, { backgroundColor: c.primary, marginBottom: 8 }]}
          onPress={goNextStage} activeOpacity={0.85}
        >
          <Text style={s.btnText}>המשך</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}>
      <View style={s.centeredWrapper}>

        {/* ── Header row: [✕]  [topic + stage]  [←][→] ── */}
        <View style={[s.header, { backgroundColor: c.background }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="close" size={22} color={c.primary} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={[s.headerTitle, { color: c.text }]} numberOfLines={1}>
              {expandedLesson?.topic ?? ''}
            </Text>
            <Text style={[s.headerSubtitle, { color: c.label }]}>
              שלב {stage + 1} מתוך {totalStages}
            </Text>
          </View>
          <View style={s.navGroup}>
            <TouchableOpacity
              onPress={goPrevStage}
              style={[s.headerBtn, { opacity: stage === 0 ? 0.28 : 1 }]}
              disabled={stage === 0}
            >
              <Ionicons name="arrow-back" size={22} color={c.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={goNextStage} style={s.headerBtn}>
              <Ionicons name="arrow-forward" size={22} color={c.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Progress bar with stage segments ── */}
        <View style={[s.progressTrack, { backgroundColor: c.border }]}>
          <View style={[s.progressFill, { width: `${progress * 100}%` as any, backgroundColor: c.primary }]} />
          {Array.from({ length: totalStages - 1 }).map((_, i) => (
            <View key={i} style={[s.progressSegment, {
              left: `${((i + 1) / totalStages) * 100}%` as any,
              backgroundColor: c.background,
            }]} />
          ))}
        </View>

        {/* ── Stage pill label ── */}
        {currentStage?.type && STAGE_LABELS[currentStage.type] && (
          <View style={s.stagePillRow}>
            <View style={[s.stagePill, { backgroundColor: c.primary + '18', borderColor: c.primary + '30' }]}>
              <Ionicons name={STAGE_LABELS[currentStage.type].icon} size={13} color={c.primary} />
              <Text style={[s.stagePillText, { color: c.primary }]}>
                {currentStage.type === 'dialogue' && currentStage.context_label
                  ? currentStage.context_label
                  : STAGE_LABELS[currentStage.type].label}
              </Text>
            </View>
          </View>
        )}

        {/* ── Exercise content ── */}
        <Animated.View style={{ flex: 1, opacity: stageOpacity }}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[s.content, { flexGrow: 1 }, showFloatingMic && { paddingBottom: 148 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          >
            {currentStage?.type === 'listen_repeat'      && renderListenRepeat()}
            {currentStage?.type === 'choose_translation' && renderChooseTranslation()}
            {currentStage?.type === 'write_translation'  && renderWriteTranslation()}
            {currentStage?.type === 'dialogue'           && renderDialogue()}
            {currentStage?.type === 'match_pairs'        && renderMatchPairs()}
            {currentStage?.type === 'listen_choose'      && renderListenChoose()}
            {currentStage?.type === 'sentence_build'     && renderSentenceBuild()}
            {currentStage?.type === 'sentence_complete'        && renderSentenceComplete()}
            {currentStage?.type === 'cultural_note'           && renderCulturalNote()}
            {currentStage?.type === 'shadowing'               && renderShadowing()}
            {currentStage?.type === 'listening_comprehension' && renderListeningComprehension()}
            {currentStage?.type === 'idiom_card'              && renderIdiomCard()}
          </ScrollView>
        </Animated.View>

        {/* ── Floating mic ── */}
        {showFloatingMic && (
          <View style={[s.floatingMicLayer, { paddingBottom: insets.bottom + 20 }]}>
            {currentStage?.type === 'listen_repeat' && (
              <Text style={[s.micHint, { color: c.label, marginBottom: 4 }]}>
                {listenPhase === 'recording' ? 'Recording… tap to stop' : 'Tap the mic and repeat'}
              </Text>
            )}
            {showPassLink && (
              <TouchableOpacity
                onPress={() => passDialogueLine(currentDialogueLine)}
                style={s.passLinkBtn}
              >
                <Text style={[s.passLinkText, { color: c.label }]}>Skip →</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.floatingMicBtn, {
                backgroundColor: micColor,
                borderColor: c.background,
                shadowColor: micColor,
              }]}
              onPress={handleFloatingMicPress}
              disabled={micIsScoring || micIsCorrect || micIsWrong}
              activeOpacity={0.88}
            >
              {micIsScoring ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : micIsCorrect ? (
                <Ionicons name="checkmark" size={44} color="#fff" />
              ) : micIsWrong ? (
                <Ionicons name="close" size={44} color="#fff" />
              ) : micIsRecording ? (
                <WaveAnimation />
              ) : (
                <Ionicons name="mic" size={44} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-screens
// ─────────────────────────────────────────────────────────────────────────────

function LoadingScreen({ c }: any) {
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={c.primary} />
      <Text style={{ color: c.label, marginTop: 16, fontWeight: '500' }}>Loading lesson…</Text>
    </SafeAreaView>
  );
}

function ErrorScreen({ c, error, onBack }: any) {
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background, justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
      <Ionicons name="warning-outline" size={52} color={c.wrong} />
      <Text style={{ color: c.text, fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
        {error || 'Lesson not available yet'}
      </Text>
      <TouchableOpacity style={[s.btn, { backgroundColor: c.primary, marginTop: 24 }]} onPress={onBack}>
        <Text style={s.btnText}>Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function CompleteScreen({ c, lesson, onHome }: any) {
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background, justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
      <View style={{
        width: 110, height: 110, borderRadius: 55,
        backgroundColor: c.primary + '15',
        borderWidth: 2, borderColor: c.primary + '25',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: c.primary, shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 6,
      }}>
        <Ionicons name="sparkles" size={54} color={c.primary} />
      </View>

      <Text style={{ color: c.text, fontSize: 38, fontWeight: '900', marginTop: 24, letterSpacing: -1, textAlign: 'center' }}>
        כל הכבוד!
      </Text>
      <Text style={{ color: c.label, fontSize: 17, marginTop: 8, textAlign: 'center' }}>
        סיימת את השיעור בהצלחה
      </Text>
      {lesson?.topic && (
        <Text style={{ color: c.label, fontSize: 14, marginTop: 4, fontStyle: 'italic', textAlign: 'center' }}>
          {lesson.topic}
        </Text>
      )}

      <View style={{
        borderRadius: 24, backgroundColor: c.primary + '12',
        borderWidth: 1.5, borderColor: c.primary + '28',
        paddingHorizontal: 44, paddingVertical: 22, marginTop: 36,
        alignItems: 'center',
        shadowColor: c.primary, shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 4 }, shadowRadius: 16, elevation: 4,
      }}>
        <Text style={{ color: c.primary, fontSize: 32, fontWeight: '900' }}>+{lesson?.xp_reward ?? 50} XP</Text>
        <Text style={{ color: c.primary + 'aa', fontSize: 13, fontWeight: '600', marginTop: 3 }}>ניקוד שנצבר</Text>
      </View>

      <TouchableOpacity
        style={[s.btn, { backgroundColor: c.primary, marginTop: 40, paddingHorizontal: 48, alignSelf: 'stretch' }]}
        onPress={onHome}
        activeOpacity={0.87}
      >
        <Ionicons name="home-outline" size={20} color="#fff" />
        <Text style={s.btnText}>חזרה לשיעורים</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Wave animation
// ─────────────────────────────────────────────────────────────────────────────
function WaveAnimation() {
  const bars = [
    useRef(new Animated.Value(0.4)).current,
    useRef(new Animated.Value(1.0)).current,
    useRef(new Animated.Value(0.4)).current,
    useRef(new Animated.Value(0.7)).current,
    useRef(new Animated.Value(0.4)).current,
  ];
  useEffect(() => {
    const anims = bars.map((val, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 90),
        Animated.timing(val, { toValue: 1.0, duration: 280, useNativeDriver: true }),
        Animated.timing(val, { toValue: 0.25, duration: 280, useNativeDriver: true }),
      ]))
    );
    Animated.parallel(anims).start();
    return () => anims.forEach(a => a.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, justifyContent: 'center' }}>
      {bars.map((val, i) => (
        <Animated.View key={i} style={{
          width: 4, height: 28, borderRadius: 4,
          backgroundColor: '#fff',
          transform: [{ scaleY: val }],
        }} />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:            { flex: 1 },
  centeredWrapper: { flex: 1, maxWidth: 640, alignSelf: 'center', width: '100%' },

  // ── Header ──
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 64 },
  headerBtn:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerCenter:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 15, fontWeight: '700', textAlign: 'center', letterSpacing: -0.2 },
  headerSubtitle:{ fontSize: 11, fontWeight: '500', textAlign: 'center', marginTop: 1 },
  navGroup:      { flexDirection: 'row', gap: 2 },

  // ── Progress bar ──
  progressTrack:   { height: 7, width: '100%', overflow: 'hidden', borderRadius: 4, position: 'relative' as any },
  progressFill:    { height: '100%', borderRadius: 4 },
  progressSegment: { position: 'absolute' as any, top: 0, bottom: 0, width: 1.5 },

  // ── Stage pill ──
  stagePillRow:  { alignItems: 'center', paddingTop: 14, paddingBottom: 2 },
  stagePill:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 50, paddingHorizontal: 14, paddingVertical: 6 },
  stagePillText: { fontSize: 13, fontWeight: '700' },

  // ── Scroll content ──
  content:   { paddingHorizontal: 24, paddingBottom: 64, paddingTop: 16 },
  stageWrap: { paddingTop: 4 },

  // ── Audio ──
  audioInner: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  audioRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 24 },

  // ── Typography ──
  arabicLarge:  { fontSize: 56, fontWeight: '800', textAlign: 'center', lineHeight: 76, marginBottom: 6 },
  arabicMedium: { fontSize: 30, fontWeight: '700', textAlign: 'center', lineHeight: 44 },
  pronText:     { fontSize: 15, textAlign: 'center', marginBottom: 6, letterSpacing: 0.3 },
  hebrewText:   { fontSize: 21, fontWeight: '600', textAlign: 'center', marginBottom: 36 },
  hebrewHint:   { fontSize: 15, textAlign: 'center', marginTop: 8, marginBottom: 18 },
  micHint:      { fontSize: 14, textAlign: 'center', marginTop: 24, marginBottom: 8, fontWeight: '500' },

  // ── Floating mic ──
  floatingMicLayer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', gap: 10,
    pointerEvents: 'box-none' as any,
  },
  floatingMicBtn: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 6,
    shadowOpacity: 0.38,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 14,
  },
  passLinkBtn:  { paddingVertical: 6, paddingHorizontal: 20 },
  passLinkText: { fontSize: 14, fontWeight: '500', textDecorationLine: 'underline' },

  // ── Choice grid ──
  choiceGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  choiceCard:     {
    width: '47.5%', borderRadius: 22, overflow: 'hidden', borderWidth: 1.5,
    shadowColor: '#a0846a',
    shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 3,
  },
  choiceCardIcon:  { width: '100%', height: 112, alignItems: 'center', justifyContent: 'center' },
  choiceCardLabel: { paddingHorizontal: 12, paddingVertical: 12, minHeight: 42, justifyContent: 'center' },
  choiceCardText:  { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  // ── Input pill ──
  inputPill:            { borderRadius: 50, borderWidth: 2, paddingHorizontal: 28, paddingVertical: 14, marginTop: 16, marginBottom: 6, alignItems: 'center', minWidth: 160, alignSelf: 'center' },
  inputPillText:        { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  inputPillPlaceholder: { fontSize: 20, letterSpacing: 8 },

  // ── Letter blocks ──
  blocksWrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 20, marginBottom: 10 },
  block:        { borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 18, paddingVertical: 14, minWidth: 50, alignItems: 'center', shadowColor: '#a0846a', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 3 }, shadowRadius: 6, elevation: 2 },
  blockChar:    { fontSize: 22, fontWeight: '700' },
  blockActions: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 16 },
  deleteBtn:    { borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 22, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  doneBtn:      { borderRadius: 16, paddingHorizontal: 36, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', minWidth: 120 },
  doneBtnText:  { color: '#fff', fontSize: 16, fontWeight: '700' },

  // ── Dialogue thread ──
  dialogueThread: { gap: 24 },

  // NPC bubble
  npcWrap:         { alignItems: 'flex-start' },
  npcAvatarAnchor: { marginLeft: 20, marginBottom: -22, zIndex: 1 },
  npcBubble:       {
    width: '90%', borderRadius: 22, borderTopLeftRadius: 6,
    borderWidth: 1, padding: 22, paddingTop: 32,
    shadowColor: '#a0846a', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 4 }, shadowRadius: 14, elevation: 3,
  },

  // User bubble
  userWrap:         { alignItems: 'flex-end' },
  userAvatarAnchor: { marginRight: 20, marginBottom: -22, zIndex: 1, alignSelf: 'flex-end' },
  userBubble:       {
    width: '90%', borderRadius: 22, borderTopRightRadius: 6,
    borderWidth: 1.5, padding: 22, paddingTop: 32,
    shadowColor: '#a0846a', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 2,
  },

  // Avatar
  avatarImage: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 3,
  },

  // Dialogue text
  dialogueName:   { fontSize: 10, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.2 },
  dialogueArabic: { fontSize: 22, fontWeight: '700', textAlign: 'right', lineHeight: 36, marginBottom: 4 },
  dialoguePron:   { fontSize: 13, marginBottom: 4 },
  dialogueHebrew: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
  replayRow:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
  tapHint:        { fontSize: 12 },

  // Blank field (inline gap in Arabic)
  blankField: {
    width: 72, height: 28,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 4,
    borderTopLeftRadius: 4, borderTopRightRadius: 4,
    marginHorizontal: 4,
  },

  // Arabic gap pill (non-contiguous)
  arabicGapPill: { borderRadius: 16, borderWidth: 1.5, padding: 16, alignItems: 'center' },

  // Dialogue complete
  dialogueCompleteWrap: { marginTop: 24 },
  culturalNoteCard: {
    borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 16,
    shadowColor: '#a0846a', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 2,
  },
  culturalNote: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 4 },

  // Match pairs
  matchCounter:   { fontSize: 13, textAlign: 'center', marginBottom: 16, fontWeight: '500' },
  matchGrid:      { flexDirection: 'row', gap: 12 },
  matchCol:       { flex: 1, gap: 10 },
  matchChipLeft:  { borderRadius: 16, borderTopLeftRadius: 28, borderBottomLeftRadius: 28, borderWidth: 1.5, padding: 16, alignItems: 'center', shadowColor: '#a0846a', shadowOpacity: 0.07, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
  matchChipRight: { borderRadius: 16, borderTopRightRadius: 28, borderBottomRightRadius: 28, borderWidth: 1.5, padding: 16, alignItems: 'center', shadowColor: '#a0846a', shadowOpacity: 0.07, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
  matchAr:        { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  matchHe:        { fontSize: 16, fontWeight: '600', textAlign: 'center' },

  // Word choice
  wordChoiceGrid: { gap: 12, marginTop: 4 },
  wordChip: {
    borderRadius: 22, borderWidth: 1.5, paddingVertical: 18, paddingHorizontal: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#a0846a', shadowOpacity: 0.09, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 2,
  },
  wordChipText: { fontSize: 26, fontWeight: '800', textAlign: 'center' },

  // Sentence card
  sentenceCard: { borderRadius: 22, borderWidth: 1.5, borderColor: '#e2ddd5', padding: 20, marginBottom: 8, shadowColor: '#a0846a', shadowOpacity: 0.07, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 2 },

  // Generic button
  btn:     { borderRadius: 20, paddingVertical: 17, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },

  // Cultural note
  culturalNoteIcon:      { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  culturalNoteTitle:     { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 20, letterSpacing: -0.3 },
  culturalNoteBody:      { borderRadius: 20, borderWidth: 1.5, padding: 20, marginBottom: 20, shadowColor: '#a0846a', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 2 },
  culturalNoteText:      { fontSize: 15, lineHeight: 24, textAlign: 'center' },
  culturalNoteAudio:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: 50, paddingHorizontal: 20, paddingVertical: 10, alignSelf: 'center' },
  culturalNoteAudioText: { fontSize: 14, fontWeight: '600' },

  // Listening comprehension
  lcQuestion:    { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 24, lineHeight: 30 },
  lcOptionsList: { gap: 12 },
  lcOption:      { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, shadowColor: '#a0846a', shadowOpacity: 0.07, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 },
  lcOptionText:  { fontSize: 17, flex: 1 },

  // Idiom card
  idiomArabic:      { fontSize: 36, fontWeight: '900', textAlign: 'center', marginBottom: 6, lineHeight: 52 },
  idiomMeaningCard: { borderRadius: 20, borderWidth: 1.5, padding: 20, gap: 12, shadowColor: '#a0846a', shadowOpacity: 0.07, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 2 },
  idiomMeaningRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  idiomMeaningLabel:{ fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  idiomMeaningText: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  idiomDivider:     { height: 1 },
});
