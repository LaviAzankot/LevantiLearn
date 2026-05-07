import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  Image,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { SvgXml } from "react-native-svg";
import * as FileSystem from "expo-file-system";
import { pickAvatarsForLesson, getAvatar } from "../../src/assets/avatars";

// ── Design tokens ─────────────────────────────────────────────────────────────
const COLORS = {
  light: {
    background: "#f4f1eb",
    card: "#fefcf7",
    primary: "#fe4d01",
    text: "#28261f",
    label: "#7a7670",
    border: "#e2ddd5",
    surface: "#edeae3",
    wrong: "#c0281e",
    right: "#1a6b5a",
  },
  dark: {
    background: "#1c1914",
    card: "#252118",
    primary: "#ff6b2b",
    text: "#f2ede6",
    label: "#9e9890",
    border: "#3c3830",
    surface: "#2e2b23",
    wrong: "#e07070",
    right: "#5dbba6",
  },
};

const API =
  process.env.EXPO_PUBLIC_API_URL?.replace("/api", "") ??
  "http://localhost:8000";
const DEFAULT_ICON = "language-outline";
const DEFAULT_COLOR = "#8E8E93";
const PASS_THRESHOLD = 50;

// Font family constants — loaded via useFonts in _layout.tsx
const FONT_AR = "ReemKufi_600SemiBold";
const FONT_UI = "PlusJakartaSans_600SemiBold";
const FONT_UI_BOLD = "PlusJakartaSans_700Bold";
const FONT_UI_EXTRABOLD = "PlusJakartaSans_800ExtraBold";

// Correct-reveal accent (Claude Design: cool blue for disclosed answers)
const REVEAL_CORRECT_BG = "rgba(115,140,230,0.10)";
const REVEAL_CORRECT_TEXT = "#3d57b8";

// Returns only the first translation when a field has "X / Y" alternatives
const firstHebrew = (h: string): string =>
  h?.split(" / ")[0]?.split("/")[0]?.trim() ?? h;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
const FLUENT_MAP: Record<string, IoniconName> = {
  "fluent:hand-wave-24-filled": "hand-right",
  "fluent:person-arrow-right-24-filled": "person-outline",
  "fluent:chat-bubbles-question-24-filled": "chatbubbles-outline",
  "fluent:thumb-like-24-filled": "thumbs-up",
  "fluent:door-arrow-right-24-filled": "exit-outline",
  "fluent:translate-24-filled": "language-outline",
  "fluent:food-pizza-24-filled": "pizza",
  "fluent:cart-24-filled": "cart",
  "fluent:location-24-filled": "location",
  "fluent:bag-24-filled": "bag",
  "fluent:people-24-filled": "people",
  "fluent:airplane-24-filled": "airplane",
  "fluent:calculator-24-filled": "calculator",
  "fluent:hat-graduation-24-filled": "school",
  "fluent:book-24-filled": "book",
};
function toIonicon(name?: string): IoniconName {
  if (!name) return "book-outline";
  if (!name.startsWith("fluent:")) return name as IoniconName;
  return FLUENT_MAP[name] ?? "book-outline";
}

// ── Phase labels ──────────────────────────────────────────────────────────────
const PHASE_LABELS: Record<string, { emoji: string; label: string }> = {
  micro_review: { emoji: "🔁", label: "Review" },
  word_card: { emoji: "👂", label: "Listen and Remember" },
  listen_repeat: { emoji: "🎤", label: "Listen and Repeat" },
  listen_choose: { emoji: "🎧", label: "Identify the Word" },
  choose_translation: { emoji: "🧠", label: "Choose the Translation" },
  match_pairs: { emoji: "🔗", label: "Match the Pairs" },
  write_translation: { emoji: "✍️", label: "What is the Word?" },
  sentence_build: { emoji: "🧩", label: "Build the Sentence" },
  sentence_complete: { emoji: "📝", label: "Complete the Sentence" },
  dialogue: { emoji: "🗣️", label: "Real Conversation" },
  cultural_note: { emoji: "💡", label: "Did You Know?" },
  shadowing: { emoji: "🎙️", label: "Mimic the Pronunciation" },
  listening_comprehension: { emoji: "🎧", label: "Listen and Answer" },
  idiom_card: { emoji: "💬", label: "Key Expression" },
  mastery_check: { emoji: "🎯", label: "Mastery Check" },
  speak_the_blank: { emoji: "🎤", label: "Speak to Fill the Blank" },
  subject: { emoji: "📖", label: "Arabic, the Basics" },
};

// ── IconifyIcon — cached SVG from api.iconify.design ─────────────────────────
const ICONIFY_BASE = "https://api.iconify.design";

function IconifyIcon({
  icon,
  color,
  size,
}: {
  icon: string;
  color: string;
  size: number;
}) {
  const [svgXml, setSvgXml] = useState<string | null>(null);

  useEffect(() => {
    if (!icon.includes(":")) return;
    const [set, name] = icon.split(":");
    const url = `${ICONIFY_BASE}/${set}/${name}.svg?color=${encodeURIComponent(color)}`;
    const cacheKey = `iconify_${set}_${name}_${color.replace("#", "")}.svg`;
    const cacheUri = FileSystem.cacheDirectory
      ? FileSystem.cacheDirectory + cacheKey
      : null;

    (async () => {
      try {
        if (cacheUri) {
          const info = await FileSystem.getInfoAsync(cacheUri);
          if (info.exists) {
            setSvgXml(await FileSystem.readAsStringAsync(cacheUri));
            return;
          }
        }
        const res = await fetch(url);
        if (!res.ok) return;
        const xml = await res.text();
        setSvgXml(xml);
        if (cacheUri) await FileSystem.writeAsStringAsync(cacheUri, xml);
      } catch {
        /* silent — container stays empty until network available */
      }
    })();
  }, [icon, color]);

  if (!svgXml) return null;
  return <SvgXml xml={svgXml} width={size} height={size} />;
}

// ── WordIcon ──────────────────────────────────────────────────────────────────
function WordIcon({
  icon,
  iconColor,
  size = 120,
}: {
  icon?: string;
  iconColor?: string;
  size?: number;
}) {
  const col = iconColor ?? DEFAULT_COLOR;
  const isIconify = icon?.includes(":") ?? false;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: col + "16",
        borderWidth: 1.5,
        borderColor: col + "28",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: col,
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 18,
      }}
    >
      {isIconify ? (
        <IconifyIcon icon={icon!} color={col} size={Math.round(size * 0.46)} />
      ) : (
        <Ionicons name={toIonicon(icon)} size={size * 0.5} color={col} />
      )}
    </View>
  );
}

// ── AudioProgressRing ─────────────────────────────────────────────────────────
function AudioProgressRing({
  progress,
  size = 60,
  ringColor,
  onPress,
  children,
}: {
  progress: number;
  size?: number;
  ringColor: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const isPlaying = progress > 0;
  const r1 = useRef(new Animated.Value(0)).current;
  const r2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isPlaying) {
      const mk = (v: Animated.Value, d: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(d),
            Animated.timing(v, {
              toValue: 1,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(v, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        );
      const a1 = mk(r1, 0);
      const a2 = mk(r2, 600);
      a1.start();
      a2.start();
      return () => {
        a1.stop();
        a2.stop();
        r1.setValue(0);
        r2.setValue(0);
      };
    }
  }, [isPlaying]);
  const rs = (v: Animated.Value) => ({
    position: "absolute" as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 2,
    borderColor: ringColor,
    transform: [
      { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) },
    ],
    opacity: v.interpolate({
      inputRange: [0, 0.2, 1],
      outputRange: [0, 0.5, 0],
    }),
  });
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {isPlaying && <Animated.View style={rs(r1)} />}
      {isPlaying && <Animated.View style={rs(r2)} />}
      {children}
    </TouchableOpacity>
  );
}

// ── WaveAnimation ─────────────────────────────────────────────────────────────
function WaveAnimation() {
  const bars = [
    useRef(new Animated.Value(0.4)).current,
    useRef(new Animated.Value(1.0)).current,
    useRef(new Animated.Value(0.4)).current,
    useRef(new Animated.Value(0.7)).current,
    useRef(new Animated.Value(0.4)).current,
  ];
  useEffect(() => {
    const anims = bars.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 90),
          Animated.timing(v, {
            toValue: 1.0,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.25,
            duration: 280,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    Animated.parallel(anims).start();
    return () => anims.forEach((a) => a.stop());
  }, []);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        height: 36,
        justifyContent: "center",
      }}
    >
      {bars.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            width: 4,
            height: 28,
            borderRadius: 4,
            backgroundColor: "#fff",
            transform: [{ scaleY: v }],
          }}
        />
      ))}
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ── Subject lesson static data ────────────────────────────────────────────────
const SUBJECT_LETTERS = [
  {
    id: "ق",
    label: "Qaf",
    msa: "qa",
    lev: "ʔa",
    note: "Classical 'q'",
    note2: "In Levantine, often a glottal stop.",
  },
  {
    id: "ج",
    label: "Jīm",
    msa: "ja",
    lev: "ja / ʒa",
    note: "Hard 'j' in MSA",
    note2: "Soft 'zh' in some Levantine cities.",
  },
  {
    id: "ث",
    label: "Thāʾ",
    msa: "tha",
    lev: "ta / sa",
    note: "English 'th' in MSA",
    note2: "Often becomes 't' or 's' in Levantine.",
  },
];
const SUBJECT_GREETINGS = [
  {
    id: "g1",
    arabic: "مَرْحَبا",
    translit: "marḥabā",
    meaning: "Hello",
    use: "Neutral, anytime, for anyone.",
    gendered: false,
  },
  {
    id: "g2",
    arabic: "أَهْلًا",
    translit: "ahlan",
    meaning: "Hi / Welcome",
    use: "Casual, friendly. Often pairs as 'ahlan wa sahlan'.",
    gendered: false,
  },
  {
    id: "g3",
    arabic: "صَبَاحُ الخَيْر",
    translit: "ṣabāḥ al-khayr",
    meaning: "Good morning",
    use: "Until ~noon. Reply: 'ṣabāḥ an-nūr' (morning of light).",
    gendered: false,
  },
  {
    id: "g4",
    arabic: "مَسَا الخَيْر",
    translit: "masā al-khayr",
    meaning: "Good evening",
    use: "Afternoon onward. Reply: 'masā an-nūr'.",
    gendered: false,
  },
  {
    id: "g5",
    meaning: "How are you?",
    gendered: true,
    masculine: {
      arabic: "كَيْفَ حَالَك؟",
      translit: "kīf ḥālak",
      note: "to a man",
    },
    feminine: {
      arabic: "كَيْفَ حَالِك؟",
      translit: "kīf ḥālik",
      note: "to a woman",
    },
    use: "The ending shifts: ‑ak for him, ‑ik for her.",
  },
  {
    id: "g6",
    meaning: "Nice to meet you",
    gendered: true,
    masculine: {
      arabic: "تَشَرَّفْتُ بِك",
      translit: "tsharrafit fīk",
      note: "to a man",
    },
    feminine: {
      arabic: "تَشَرَّفْتُ بِكِ",
      translit: "tsharrafit fīki",
      note: "to a woman",
    },
    use: "Literally 'I was honoured by you'.",
  },
  {
    id: "g7",
    arabic: "السَّلامُ عَلَيْكُم",
    translit: "as-salāmu ʿalaykum",
    meaning: "Peace be upon you",
    use: "Plural form — works for any audience. Reply: 'wa ʿalaykum as-salām'.",
    gendered: false,
  },
];
const SUBJECT_PRONOUNS = [
  {
    id: "p1",
    arabic: "أَنَا",
    translit: "ana",
    english: "I",
    person: "1st",
    number: "singular",
    gender: "any",
    note: "Same for men and women.",
  },
  {
    id: "p2",
    arabic: "أَنْتَ",
    translit: "anta",
    english: "You",
    person: "2nd",
    number: "singular",
    gender: "m",
    note: "Speaking to a man.",
  },
  {
    id: "p3",
    arabic: "أَنْتِ",
    translit: "anti",
    english: "You",
    person: "2nd",
    number: "singular",
    gender: "f",
    note: "Speaking to a woman.",
  },
  {
    id: "p4",
    arabic: "هُوَ",
    translit: "huwa",
    english: "He / it",
    person: "3rd",
    number: "singular",
    gender: "m",
    note: "Also used for masculine objects.",
  },
  {
    id: "p5",
    arabic: "هِيَ",
    translit: "hiya",
    english: "She / it",
    person: "3rd",
    number: "singular",
    gender: "f",
    note: "Also used for feminine objects.",
  },
  {
    id: "p6",
    arabic: "نَحْنُ",
    translit: "naḥnu",
    english: "We",
    person: "1st",
    number: "plural",
    gender: "any",
    note: "Mixed groups too.",
  },
  {
    id: "p7",
    arabic: "أَنْتُم",
    translit: "antum",
    english: "You all",
    person: "2nd",
    number: "plural",
    gender: "any",
    note: "Use for any group.",
  },
  {
    id: "p8",
    arabic: "هُم",
    translit: "hum",
    english: "They",
    person: "3rd",
    number: "plural",
    gender: "any",
    note: "Use for any group.",
  },
];

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const c = COLORS[scheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  // ── Core ───────────────────────────────────────────────────────────────────
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stage, setStage] = useState(0);
  const [completed, setCompleted] = useState(false);

  // ── Exercise state ─────────────────────────────────────────────────────────
  const [lockedAnswer, setLockedAnswer] = useState<string | null>(null);
  const [wrongAnswers, setWrongAnswers] = useState<string[]>([]);
  const [listenPhase, setListenPhase] = useState<
    "speak" | "recording" | "correct" | "wrong"
  >("speak");
  const [speechResult, setSpeechResult] = useState<any>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [dialogueStep, setDialogueStep] = useState(0);
  const [dialogueMicState, setDialogueMicState] = useState<
    "idle" | "recording" | "scoring" | "correct" | "wrong"
  >("idle");
  const [dialogueFailCount, setDialogueFailCount] = useState(0);
  const [lastTranscript, setLastTranscript] = useState("");
  const [qIndex, setQIndex] = useState(0);
  const [matchSelected, setMatchSelected] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [matchWrong, setMatchWrong] = useState<string | null>(null);
  const [buildSlots, setBuildSlots] = useState<string[]>([]);
  const [buildAvailable, setBuildAvailable] = useState<boolean[]>([]);
  const [buildWrong, setBuildWrong] = useState(false);
  const [buildPhase, setBuildPhase] = useState<"attempt" | "practice" | "done">(
    "attempt",
  );
  const [choosePendingAnswer, setChoosePendingAnswer] = useState<string | null>(
    null,
  );
  const [placedSlots, setPlacedSlots] = useState<
    { char: string; idx: number }[]
  >([]);
  const [writeCheckState, setWriteCheckState] = useState<
    "idle" | "correct" | "wrong"
  >("idle");
  const [shadowPhase, setShadowPhase] = useState<
    "idle" | "playing" | "ready" | "recording" | "correct" | "wrong"
  >("idle");

  // ── Speak the Blank state ──────────────────────────────────────────────────
  const [speakBlankRoundIdx, setSpeakBlankRoundIdx] = useState(0);
  const [speakBlankRevealed, setSpeakBlankRevealed] = useState(false);
  const [speakBlankPlayingLine, setSpeakBlankPlayingLine] = useState<
    number | null
  >(null);

  // ── Subject stage state ────────────────────────────────────────────────────
  const [subjectLetter, setSubjectLetter] = useState(0);
  const [subjectAudience, setSubjectAudience] = useState<"him" | "her">("him");
  const [subjectFilter, setSubjectFilter] = useState<"all" | "sing" | "plur">(
    "all",
  );
  const [subjectPlayingId, setSubjectPlayingId] = useState<string | null>(null);

  // ── Mastery check state ────────────────────────────────────────────────────
  const [masteryItemIndex, setMasteryItemIndex] = useState(0);
  const [masteryScore, setMasteryScore] = useState(0);
  const [masteryDone, setMasteryDone] = useState(false);

  // ── Feedback overlay ───────────────────────────────────────────────────────
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackCorrect, setFeedbackCorrect] = useState(false);
  const [feedbackCorrectForm, setFeedbackCorrectForm] = useState("");
  const feedbackAnim = useRef(new Animated.Value(80)).current;

  // ── Refs ───────────────────────────────────────────────────────────────────
  const audioSoundRef = useRef<Audio.Sound | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const expectedArabicRef = useRef<string>("");
  const dialogueLineRef = useRef<any>(null);
  const scrollRef = useRef<any>(null);
  const stageOpacity = useRef(new Animated.Value(1)).current;
  const micRing1 = useRef(new Animated.Value(0)).current;
  const micRing2 = useRef(new Animated.Value(0)).current;

  const [npcAvatar, userAvatar] = useMemo(
    () => pickAvatarsForLesson(id ?? "default"),
    [id],
  );

  // ── Mic permission helper ──────────────────────────────────────────────────
  const requestMicPermission = async (): Promise<boolean> => {
    const { status, canAskAgain } = await Audio.requestPermissionsAsync();
    if (status === 'granted') return true;
    if (!canAskAgain) {
      Alert.alert(
        'Microphone Access Required',
        'LevantiLearn needs microphone access for pronunciation practice. Please enable it in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    } else {
      Alert.alert(
        'Microphone Access Required',
        'Please allow microphone access when prompted to use pronunciation practice.',
      );
    }
    return false;
  };

  // ── Audio helpers ──────────────────────────────────────────────────────────
  const playFeedbackSound = useCallback(
    async (type: "correct" | "wrong" | "complete") => {
      try {
        const src =
          type === "correct"
            ? require("../../src/assets/sounds/correct.mp3")
            : { uri: `${API}/api/audio/${type}` };
        const { sound } = await Audio.Sound.createAsync(src, {
          shouldPlay: true,
          volume: 0.85,
        });
        sound.setOnPlaybackStatusUpdate((s: any) => {
          if (s.didJustFinish) sound.unloadAsync().catch(() => {});
        });
      } catch {}
    },
    [],
  );

  const stopCurrentAudio = useCallback(async () => {
    const s = audioSoundRef.current;
    if (s) {
      audioSoundRef.current = null;
      await s.stopAsync().catch(() => {});
      await s.unloadAsync().catch(() => {});
    }
  }, []);

  const playAudio = useCallback(
    async (text: string, onEnd?: () => void) => {
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
            if (dur > 0)
              setAudioProgress(Math.max(0.01, Math.min(pos / dur, 1)));
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
    },
    [stopCurrentAudio],
  );

  const scoreFromUri = async (uri: string | null, expected: string) => {
    if (!uri) return { text: "—", score: 0, passed: false, transcript: "" };
    const fd = new FormData();
    fd.append("audio", { uri, type: "audio/m4a", name: "speech.m4a" } as any);
    fd.append("expected", expected);
    try {
      const res = await fetch(`${API}/api/stt/score`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok)
        return { text: "—", score: 0, passed: false, transcript: "" };
      const d = await res.json();
      return {
        text: d.transcript ?? "",
        score: d.score ?? 0,
        passed: d.passed ?? false,
        transcript: d.transcript ?? "",
      };
    } catch {
      return { text: "—", score: 0, passed: false, transcript: "" };
    }
  };

  // ── Recording helpers ──────────────────────────────────────────────────────
  const finishListenRepeatRecording = useCallback(async () => {
    const rec = recordingRef.current;
    if (!rec) return;
    recordingRef.current = null;
    setListenPhase("speak");
    try {
      await rec.stopAndUnloadAsync();
    } catch {}
    const result = await scoreFromUri(rec.getURI(), expectedArabicRef.current);
    setSpeechResult(result);
  }, []);

  const startRecording = async (expectedArabic: string) => {
    const granted = await requestMicPermission();
    if (!granted) return;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      expectedArabicRef.current = expectedArabic;
      setListenPhase("recording");
      setTimeout(() => finishListenRepeatRecording(), 6000);
    } catch {
      Alert.alert('Recording Error', 'Could not start recording. Please try again.');
    }
  };

  const finishDialogueRecording = useCallback(async () => {
    const rec = recordingRef.current;
    const line = dialogueLineRef.current;
    if (!rec) return;
    recordingRef.current = null;
    setDialogueMicState("scoring");
    try {
      await rec.stopAndUnloadAsync();
    } catch {}
    const result = await scoreFromUri(rec.getURI(), line?.target_voweled ?? "");
    setLastTranscript(result.transcript ?? "");
    if (result.passed) {
      playFeedbackSound("correct");
      setDialogueMicState("correct");
      playAudio(line?.full_arabic ?? "", () => {
        setAudioProgress(0);
        setTimeout(() => {
          setDialogueStep((d) => d + 1);
          setDialogueMicState("idle");
          setDialogueFailCount(0);
        }, 600);
      });
    } else {
      playFeedbackSound("wrong");
      setDialogueFailCount((f) => f + 1);
      setDialogueMicState("wrong");
      setTimeout(() => setDialogueMicState("idle"), 1200);
    }
  }, [playAudio]);

  const startDialogueRecording = async (line: any) => {
    const granted = await requestMicPermission();
    if (!granted) { setDialogueMicState("idle"); return; }
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      dialogueLineRef.current = line;
      setDialogueMicState("recording");
      setTimeout(() => finishDialogueRecording(), 7000);
    } catch {
      alert("לא ניתן לגשת למיקרופון.");
      setDialogueMicState("idle");
    }
  };

  const passDialogueLine = (line: any) => {
    setDialogueMicState("idle");
    setDialogueFailCount(0);
    playAudio(line.full_arabic, () => {
      setAudioProgress(0);
      setTimeout(() => setDialogueStep((d) => d + 1), 600);
    });
  };

  // ── Lesson expansion ───────────────────────────────────────────────────────
  const expandedLesson = useMemo(() => {
    if (!lesson) return null;

    // ── Normalize new `cycles` format to legacy words+stages ─────────────────
    const src: any = lesson.cycles ? (() => {
      const words: Record<string, any> = {};
      const allVocab = lesson.cycles.flatMap((c: any) => c.vocab);
      const stages: any[] = [{ type: 'subject', topic: lesson.topic, allVocab }];
      for (const cycle of lesson.cycles) {
        // Build romanization lookup for this cycle's vocab
        const vocabRomanization: Record<string, string> = {};
        cycle.vocab.forEach((w: any) => { vocabRomanization[w.arabic] = w.romanization ?? w.transcription ?? ''; });

        // Vocab → words dict + listen_repeat stages (words only, no phrases)
        cycle.vocab.forEach((w: any, i: number) => {
          const wid = `c${cycle.cycle}_w${i + 1}`;
          words[wid] = { arabic: w.arabic, arabic_plain: w.arabic, translit: w.romanization, english: w.english, icon: w.icon, icon_color: w.icon_color };
          stages.push({ type: 'listen_repeat', word_id: wid });
        });
        // Quiz → choose_translation (one per vocab word)
        for (const q of cycle.quiz) {
          const options = q.options.map((opt: string, i: number) => ({ id: `q_${cycle.cycle}_${i}`, english: opt, correct: i === q.answer, arabic: q.arabic, translit: q.romanization }));
          stages.push({ type: 'choose_translation', arabic: q.arabic, english: q.options[q.answer], translit: q.romanization, options });
        }
        // Build → sentence_build array (romanization on bank items)
        const builds = Array.isArray(cycle.build) ? cycle.build : [cycle.build];
        builds.forEach((b: any, bi: number) => {
          const bWords = b.sentence.map((ar: string, i: number) => ({ id: `b${bi}_w${i + 1}`, ar, tr: vocabRomanization[ar] ?? '' }));
          const bDecoys = b.decoys.map((ar: string, i: number) => ({ id: `b${bi}_d${i + 1}`, ar, tr: vocabRomanization[ar] ?? '' }));
          stages.push({ type: 'sentence_build', english: b.english, bank: [...bWords, ...bDecoys], correct: bWords.map((w: any) => w.id) });
        });
        // Speak → speak_the_blank (dynamic rounds from any even number of turns)
        const turns = cycle.speak.turns;
        const rounds: any[] = [];
        for (let idx = 0; idx < turns.length - 1; idx += 2) {
          rounds.push({
            id: `c${cycle.cycle}_r${Math.floor(idx / 2) + 1}`,
            context: cycle.speak.scenario,
            prompt: { arabic: turns[idx].arabic, translit: turns[idx].romanization, english: turns[idx].english },
            answer: { arabic: '___', translit: '___', english: '___', blank: { arabic: turns[idx + 1].arabic, translit: turns[idx + 1].romanization, english: turns[idx + 1].english } },
          });
        }
        stages.push({ type: 'speak_the_blank', rounds });
        // Match pairs at end of each cycle
        stages.push({ type: 'match_pairs', word_ids: cycle.vocab.map((_: any, i: number) => `c${cycle.cycle}_w${i + 1}`) });
      }
      return { ...lesson, words, stages };
    })() : lesson;

    const words = src.words ?? {};
    const expandedStages = (src.stages ?? []).map((stg: any) => {
      const word = stg.word_id ? words[stg.word_id] : null;
      if (stg.type === "choose_translation") {
        const options = (stg.option_ids ?? stg.options ?? []).map(
          (item: any) => {
            if (typeof item === "string")
              return {
                ...words[item],
                id: item,
                correct: item === stg.word_id,
              };
            return item;
          },
        );
        return { ...word, ...stg, options };
      }
      if (stg.type === "match_pairs" && stg.word_ids) {
        const pairs = stg.word_ids.map((wid: string) => ({
          id: wid,
          arabic: words[wid]?.arabic,
          translit: words[wid]?.translit,
          hebrew: words[wid]?.hebrew,
          english: words[wid]?.english,
        }));
        return { ...stg, pairs };
      }
      if (stg.type === "listen_choose" && stg.items?.[0]?.word_id) {
        const items = stg.items.map((item: any) => {
          const w = words[item.word_id];
          const d = words[item.distractor_id];
          return {
            arabic: w?.arabic,
            correct_hebrew: w?.hebrew,
            correct_icon: w?.icon,
            correct_icon_color: w?.icon_color,
            distractor_hebrew: d?.hebrew,
            distractor_icon: d?.icon,
            distractor_icon_color: d?.icon_color,
          };
        });
        return { ...stg, items };
      }
      if (stg.type === "mastery_check") {
        const items = (stg.items ?? []).map((item: any) => {
          if (item.mode === "choose" && item.option_ids) {
            const options = item.option_ids.map((wid: string) => ({
              ...words[wid],
              id: wid,
              correct: wid === item.word_id,
            }));
            return { ...item, options };
          }
          return { ...item, word: words[item.word_id] };
        });
        return { ...stg, items };
      }
      if (stg.type === "speak_the_blank") return stg;
      if (word)
        return {
          ...word,
          ...stg,
          target_word: stg.target_word ?? word.arabic_plain,
        };
      return stg;
    });
    return { ...src, stages: expandedStages };
  }, [lesson]);

  // ── Shuffle ────────────────────────────────────────────────────────────────
  const shuffledMap = useMemo<Record<number, any>>(() => {
    if (!expandedLesson) return {};
    const map: Record<number, any> = {};
    const allWords = expandedLesson.words ?? {};
    (expandedLesson.stages ?? []).forEach((stg: any, idx: number) => {
      if (stg.type === "choose_translation")
        map[idx] = shuffleArray([...(stg.options ?? [])]);
      if (stg.type === "match_pairs")
        map[idx] = shuffleArray([...(stg.pairs ?? [])]);
      if (stg.type === "micro_review")
        map[idx] = shuffleArray([...(stg.options ?? [])]);
      if (stg.type === "listen_choose")
        map[idx] = (stg.items ?? []).map((item: any) => ({
          ...item,
          shuffled_options: shuffleArray([
            {
              hebrew: item.correct_hebrew,
              icon: item.correct_icon,
              icon_color: item.correct_icon_color,
              correct: true,
            },
            {
              hebrew: item.distractor_hebrew,
              icon: item.distractor_icon,
              icon_color: item.distractor_icon_color,
              correct: false,
            },
          ]),
        }));
      if (stg.type === "write_translation" && stg.word_id) {
        const correctWord = allWords[stg.word_id];
        if (correctWord) {
          const distractors = shuffleArray(
            Object.keys(allWords).filter((id: string) => id !== stg.word_id),
          ).slice(0, 3);
          map[idx] = shuffleArray([
            { ...correctWord, id: stg.word_id, correct: true },
            ...distractors.map((id: string) => ({
              ...allWords[id],
              id,
              correct: false,
            })),
          ]);
        }
      }
      if (stg.type === "sentence_build" && stg.bank?.length)
        map[idx] = shuffleArray([...stg.bank]);
      else if (stg.type === "sentence_build" && stg.words?.length)
        map[idx] = shuffleArray([...stg.words]);
      if (stg.type === "sentence_complete" && stg.gap_word_id) {
        const correctWord = allWords[stg.gap_word_id];
        if (correctWord) {
          const distractors = shuffleArray(
            Object.keys(allWords).filter(
              (id: string) => id !== stg.gap_word_id,
            ),
          ).slice(0, 3);
          map[idx] = shuffleArray([
            { ...correctWord, id: stg.gap_word_id, correct: true },
            ...distractors.map((id: string) => ({
              ...allWords[id],
              id,
              correct: false,
            })),
          ]);
        }
      }
      if (stg.type === "listening_comprehension" && stg.options?.length)
        map[idx] = { options: shuffleArray([...stg.options]) };
      if (stg.type === "mastery_check") {
        map[idx] = (stg.items ?? []).map((item: any) => {
          if (item.mode === "choose" && item.options)
            return {
              ...item,
              shuffled_options: shuffleArray([...item.options]),
            };
          return item;
        });
      }
    });
    return map;
  }, [expandedLesson]);

  // ── Load lesson ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API}/api/lessons/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setLesson(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load lesson. Is the backend running?");
        setLoading(false);
      });
  }, [id]);

  // ── Auto-play TTS on stage mount ───────────────────────────────────────────
  useEffect(() => {
    if (!expandedLesson) return;
    const stg = (expandedLesson.stages ?? [])[stage];
    let text: string | null = null;
    if (stg?.type === "word_card") text = stg.arabic;
    else if (stg?.type === "listen_repeat") text = stg.arabic;
    else if (stg?.type === "choose_translation") text = stg.arabic;
    else if (stg?.type === "write_translation") text = stg.arabic;
    else if (stg?.type === "sentence_build") text = stg.sentence_arabic;
    else if (stg?.type === "shadowing") {
      setShadowPhase("idle");
      text = null;
    } else if (stg?.type === "listening_comprehension") text = stg.audio_text;
    if (!text) return;
    playAudio(text);
  }, [stage, expandedLesson, playAudio]);

  // ── STT result handler ─────────────────────────────────────────────────────
  useEffect(() => {
    const stg = (expandedLesson?.stages ?? [])[stage];
    if (!speechResult) return;
    if (stg?.type === "listen_repeat") {
      if (speechResult.score >= PASS_THRESHOLD) {
        setListenPhase("correct");
        setTimeout(() => {
          goNextStage();
          setListenPhase("speak");
          setSpeechResult(null);
        }, 1400);
      } else {
        setListenPhase("wrong");
        setTimeout(() => {
          setListenPhase("speak");
          setSpeechResult(null);
        }, 1200);
      }
    } else if (stg?.type === "shadowing" && shadowPhase === "recording") {
      if (speechResult.score >= PASS_THRESHOLD) {
        setShadowPhase("correct");
        setTimeout(() => {
          goNextStage();
          setShadowPhase("idle");
          setSpeechResult(null);
        }, 1400);
      } else {
        setShadowPhase("wrong");
        setTimeout(() => {
          setShadowPhase("idle");
          setSpeechResult(null);
        }, 1200);
      }
    } else if (stg?.type === "mastery_check") {
      if (speechResult.score >= PASS_THRESHOLD) {
        setListenPhase("correct");
        setMasteryScore((s) => s + 1);
        setTimeout(() => {
          advanceMasteryItem();
          setListenPhase("speak");
          setSpeechResult(null);
        }, 1400);
      } else {
        setListenPhase("wrong");
        setTimeout(() => {
          advanceMasteryItem();
          setListenPhase("speak");
          setSpeechResult(null);
        }, 1200);
      }
    } else if (stg?.type === "speak_the_blank") {
      const rounds = stg.rounds ?? [];
      if (speechResult.score >= PASS_THRESHOLD) {
        setListenPhase("correct");
        setTimeout(() => {
          setSpeechResult(null);
          if (speakBlankRoundIdx + 1 >= rounds.length) {
            goNextStage();
            setListenPhase("speak");
          } else {
            setSpeakBlankRoundIdx((r) => r + 1);
            setListenPhase("speak");
            setSpeakBlankRevealed(false);
            setSpeakBlankPlayingLine(null);
          }
        }, 1100);
      } else {
        setListenPhase("wrong");
        setTimeout(() => {
          setListenPhase("speak");
          setSpeechResult(null);
        }, 1200);
      }
    }
  }, [speechResult]);

  // ── Dialogue: auto-advance NPC lines ──────────────────────────────────────
  useEffect(() => {
    if (!expandedLesson) return;
    const stg = (expandedLesson.stages ?? [])[stage];
    if (stg?.type !== "dialogue") return;
    const lines = stg.lines ?? [];
    if (dialogueStep >= lines.length) return;
    const line = lines[dialogueStep];
    if (line.is_user_turn) return;
    let cancelled = false;
    playAudio(line.arabic, () => {
      if (cancelled) return;
      setTimeout(() => setDialogueStep((d) => d + 1), 600);
    });
    return () => {
      cancelled = true;
      stopCurrentAudio();
    };
  }, [dialogueStep, stage, expandedLesson, playAudio, stopCurrentAudio]);

  useEffect(() => {
    if (!expandedLesson) return;
    const stg = (expandedLesson.stages ?? [])[stage];
    if (stg?.type !== "dialogue") return;
    const t = setTimeout(
      () => scrollRef.current?.scrollToEnd?.({ animated: true }),
      200,
    );
    return () => clearTimeout(t);
  }, [dialogueStep, stage, expandedLesson]);

  // ── Speak the Blank: auto-play prompt on round entry ─────────────────────
  useEffect(() => {
    if (!expandedLesson) return;
    const stg = (expandedLesson.stages ?? [])[stage];
    if (stg?.type !== "speak_the_blank") return;
    const round = (stg.rounds ?? [])[speakBlankRoundIdx];
    if (!round?.prompt) return;
    const t = setTimeout(() => {
      setSpeakBlankPlayingLine(0); // 0 = prompt playing
      playAudio(round.prompt.arabic, () => setSpeakBlankPlayingLine(null));
    }, 450);
    return () => clearTimeout(t);
  }, [stage, speakBlankRoundIdx, expandedLesson, playAudio]);

  // ── Reset exercise state ───────────────────────────────────────────────────
  const resetExerciseState = () => {
    setLockedAnswer(null);
    setWrongAnswers([]);
    setPlacedSlots([]);
    setWriteCheckState("idle");
    setListenPhase("speak");
    setSpeechResult(null);
    setMatchSelected(null);
    setMatchedIds([]);
    setMatchWrong(null);
    setQIndex(0);
    setDialogueStep(0);
    setAudioProgress(0);
    setDialogueMicState("idle");
    setDialogueFailCount(0);
    setLastTranscript("");
    setBuildSlots([]);
    setBuildAvailable([]);
    setBuildWrong(false);
    setShadowPhase("idle");
    setBuildPhase("attempt");
    setChoosePendingAnswer(null);
    setMasteryItemIndex(0);
    setMasteryScore(0);
    setMasteryDone(false);
    setFeedbackVisible(false);
    feedbackAnim.setValue(80);
    setSpeakBlankRoundIdx(0);
    setSpeakBlankRevealed(false);
    setSpeakBlankPlayingLine(null);
    setSubjectLetter(0);
    setSubjectAudience("him");
    setSubjectFilter("all");
    setSubjectPlayingId(null);
  };

  const goNextStage = useCallback(() => {
    const total = expandedLesson?.stages?.length ?? 0;
    Animated.timing(stageOpacity, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      if (stage < total - 1) {
        setStage((s) => s + 1);
        resetExerciseState();
      } else {
        setCompleted(true);
        playFeedbackSound("complete");
      }
      Animated.timing(stageOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  }, [expandedLesson, stage, stageOpacity]);

  const goPrevStage = useCallback(() => {
    if (stage > 0) {
      setStage((s) => s - 1);
      resetExerciseState();
    }
  }, [stage]);

  // ── Mic ring pulse animation (for 96px circle mic in action bar) ───────────
  useEffect(() => {
    const isRecording = listenPhase === "recording";
    if (isRecording) {
      const mk = (v: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(v, {
              toValue: 1,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(v, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        );
      const a1 = mk(micRing1, 0);
      const a2 = mk(micRing2, 600);
      a1.start();
      a2.start();
      return () => {
        a1.stop();
        a2.stop();
        micRing1.setValue(0);
        micRing2.setValue(0);
      };
    } else {
      micRing1.setValue(0);
      micRing2.setValue(0);
    }
  }, [listenPhase]);

  // ── Mastery check helpers ──────────────────────────────────────────────────
  const advanceMasteryItem = useCallback(() => {
    setMasteryItemIndex((idx) => {
      const stg = (expandedLesson?.stages ?? [])[stage];
      const items = stg?.items ?? [];
      const next = idx + 1;
      if (next >= items.length) {
        setMasteryDone(true);
        return idx;
      }
      setLockedAnswer(null);
      setWrongAnswers([]);
      return next;
    });
  }, [expandedLesson, stage]);

  // ── Feedback helpers ───────────────────────────────────────────────────────
  const showFeedback = useCallback(
    (correct: boolean, correctForm: string) => {
      setFeedbackCorrect(correct);
      setFeedbackCorrectForm(correctForm);
      setFeedbackVisible(true);
      feedbackAnim.setValue(80);
      Animated.spring(feedbackAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }).start();
      if (correct) setTimeout(() => hideFeedback(), 1100);
    },
    [feedbackAnim],
  );

  const hideFeedback = useCallback(() => {
    Animated.timing(feedbackAnim, {
      toValue: 80,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setFeedbackVisible(false));
  }, [feedbackAnim]);

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (loading) return <LoadingScreen c={c} />;
  if (error || !expandedLesson)
    return <ErrorScreen c={c} error={error} onBack={() => router.back()} />;
  if (completed)
    return (
      <CompleteScreen
        c={c}
        lesson={expandedLesson}
        onHome={() => router.push("/")}
        onNext={expandedLesson?.next_lesson ? () => router.replace(`/lesson/${expandedLesson.next_lesson}`) : undefined}
      />
    );

  const stages = expandedLesson.stages ?? [];
  const totalStages = stages.length;
  const currentStage = stages[stage];
  const progress = (stage + 1) / totalStages;

  // ── Dialogue derivations ───────────────────────────────────────────────────
  const currentLines =
    currentStage?.type === "dialogue" ? (currentStage.lines ?? []) : [];
  const currentDialogueLine = currentLines[dialogueStep];
  const isActiveUserTurn = !!(
    currentDialogueLine?.is_user_turn && dialogueStep < currentLines.length
  );
  const isDialogueAllDone =
    currentStage?.type === "dialogue" && dialogueStep >= currentLines.length;
  const showPassLink =
    isActiveUserTurn &&
    dialogueFailCount >= 3 &&
    dialogueMicState !== "recording" &&
    dialogueMicState !== "scoring";

  // ── Action bar state ───────────────────────────────────────────────────────
  type MicPhase = "idle" | "recording" | "scoring" | "correct" | "wrong";
  type ActionBarState =
    | { type: "continue" }
    | { type: "check"; disabled: boolean }
    | { type: "mic"; phase: MicPhase }
    | { type: "hidden" };

  const actionBarState: ActionBarState = (() => {
    if (!currentStage) return { type: "hidden" };
    const t = currentStage.type;
    if (
      t === "word_card" ||
      t === "cultural_note" ||
      t === "idiom_card" ||
      t === "subject"
    )
      return { type: "continue" };
    if (t === "listen_repeat")
      return {
        type: "mic",
        phase: listenPhase === "speak" ? "idle" : listenPhase,
      };
    if (t === "shadowing") {
      if (shadowPhase === "idle" || shadowPhase === "playing")
        return { type: "hidden" };
      return {
        type: "mic",
        phase: (shadowPhase === "ready" ? "idle" : shadowPhase) as MicPhase,
      };
    }
    if (t === "dialogue") {
      if (isDialogueAllDone) return { type: "continue" };
      if (isActiveUserTurn)
        return {
          type: "mic",
          phase: (dialogueMicState === "idle"
            ? "idle"
            : dialogueMicState) as MicPhase,
        };
      return { type: "hidden" };
    }
    if (t === "match_pairs") {
      const pairs = currentStage.pairs ?? [];
      return matchedIds.length === pairs.length && pairs.length > 0
        ? { type: "continue" }
        : { type: "hidden" };
    }
    if (t === "choose_translation") {
      if (lockedAnswer !== null) return { type: "continue" };
      return { type: "check", disabled: choosePendingAnswer === null };
    }
    if (t === "sentence_build") {
      if (buildPhase === "done") return { type: "continue" };
      const slotCount = Array.isArray(currentStage.bank)
        ? (currentStage.correct ?? []).length
        : (currentStage.words ?? []).length;
      return { type: "check", disabled: buildSlots.length !== slotCount };
    }
    if (t === "listen_choose")
      return lockedAnswer !== null ? { type: "continue" } : { type: "hidden" };
    if (t === "speak_the_blank") return { type: "hidden" }; // custom bar inside renderer
    if (t === "mastery_check") {
      if (masteryDone) return { type: "continue" };
      const item = (shuffledMap[stage] ?? [])[masteryItemIndex];
      if (!item) return { type: "continue" };
      if (item.mode === "speak")
        return {
          type: "mic",
          phase: listenPhase === "speak" ? "idle" : listenPhase,
        };
      return { type: "hidden" };
    }
    return { type: "hidden" };
  })();

  // ── Action bar handlers ────────────────────────────────────────────────────
  const handleContinue = () => {
    if (currentStage?.type === "listen_choose") {
      const items = shuffledMap[stage] ?? currentStage.items ?? [];
      playFeedbackSound("correct");
      setTimeout(() => {
        if (qIndex < items.length - 1) {
          setQIndex((i) => i + 1);
          setLockedAnswer(null);
          setWrongAnswers([]);
        } else goNextStage();
      }, 200);
      return;
    }
    if (currentStage?.type === "mastery_check" && masteryDone) {
      goNextStage();
      return;
    }
    goNextStage();
  };

  const handleCheck = () => {
    const t = currentStage?.type;
    if (t === "choose_translation") {
      if (!choosePendingAnswer) return;
      const opts = shuffledMap[stage] ?? currentStage.options ?? [];
      const chosen = opts.find((o: any) => o.id === choosePendingAnswer);
      const correct = opts.find((o: any) => o.correct);
      setLockedAnswer(correct?.id ?? "ok");
      if (chosen?.correct) {
        playFeedbackSound("correct");
      } else {
        playFeedbackSound("wrong");
        setWrongAnswers([choosePendingAnswer]);
      }
      return;
    }
    if (t === "sentence_build") {
      const isNewSchema = Array.isArray(currentStage.bank);
      const correctWords: string[] = isNewSchema
        ? (currentStage.correct ?? []).map(
            (id: string) =>
              currentStage.bank.find((b: any) => b.id === id)?.ar ?? "",
          )
        : (currentStage.words ?? []);
      const words = correctWords;
      const isCorrect = buildSlots.every(
        (w: string, i: number) => w === words[i],
      );
      if (isCorrect) {
        setBuildPhase("done");
        playFeedbackSound("correct");
        showFeedback(true, "");
        setTimeout(() => hideFeedback(), 800);
      } else {
        playFeedbackSound("wrong");
        setBuildWrong(true);
        setTimeout(() => {
          setBuildWrong(false);
          setBuildSlots([]);
          setBuildAvailable(Array(words.length).fill(false));
          setBuildPhase("practice");
        }, 1100);
      }
      return;
    }
  };

  const handleMicPress = () => {
    if (currentStage?.type === "listen_repeat") {
      if (listenPhase === "recording") finishListenRepeatRecording();
      else if (listenPhase === "speak") startRecording(currentStage.arabic);
    } else if (currentStage?.type === "shadowing") {
      if (shadowPhase === "recording") {
        finishListenRepeatRecording();
        setShadowPhase("idle");
      } else if (shadowPhase === "ready") {
        startRecording(currentStage.sentence_arabic);
        setShadowPhase("recording");
      }
    } else if (currentStage?.type === "mastery_check") {
      const item = (shuffledMap[stage] ?? [])[masteryItemIndex];
      if (!item || item.mode !== "speak") return;
      const word = item.word ?? (expandedLesson.words ?? {})[item.word_id];
      if (listenPhase === "recording") finishListenRepeatRecording();
      else if (listenPhase === "speak" && word) startRecording(word.arabic);
    } else if (currentStage?.type === "speak_the_blank") {
      const round = (currentStage.rounds ?? [])[speakBlankRoundIdx];
      const blank = round?.answer?.blank;
      if (!blank) return;
      if (listenPhase === "recording") finishListenRepeatRecording();
      else if (listenPhase === "speak" || listenPhase === "wrong")
        startRecording(blank.arabic);
    } else if (isActiveUserTurn) {
      if (dialogueMicState === "recording") finishDialogueRecording();
      else if (dialogueMicState === "idle")
        startDialogueRecording(currentDialogueLine);
    }
  };

  // ── Letter-block helpers ───────────────────────────────────────────────────
  const disabledIdxs = new Set(placedSlots.map((s) => s.idx));
  const constructedWord = placedSlots.map((s) => s.char).join("");
  const tapBlock = (char: string, idx: number) => {
    if (disabledIdxs.has(idx) || writeCheckState === "correct") return;
    setPlacedSlots((prev) => [...prev, { char, idx }]);
  };
  const deleteBlock = () => {
    if (writeCheckState !== "correct")
      setPlacedSlots((prev) => prev.slice(0, -1));
  };
  const checkWord = (target: string, onCorrect: () => void) => {
    if (constructedWord === target) {
      setWriteCheckState("correct");
      onCorrect();
    } else {
      setWriteCheckState("wrong");
      setTimeout(() => {
        setWriteCheckState("idle");
        setPlacedSlots([]);
      }, 700);
    }
  };
  const renderLetterBlocks = (blocks: string[]) => (
    <View style={s.blocksWrap}>
      {blocks.map((char, idx) => {
        const disabled = disabledIdxs.has(idx);
        return (
          <TouchableOpacity
            key={idx}
            style={[
              s.block,
              {
                backgroundColor: disabled ? c.surface : c.card,
                borderColor: c.border,
                opacity: disabled ? 0.4 : 1,
              },
            ]}
            onPress={() => tapBlock(char, idx)}
            disabled={disabled || writeCheckState === "correct"}
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
      <TouchableOpacity
        style={[s.deleteBtn, { borderColor: c.border }]}
        onPress={deleteBlock}
      >
        <Ionicons name="backspace-outline" size={20} color={c.label} />
      </TouchableOpacity>
      {constructedWord.length > 0 && (
        <TouchableOpacity
          style={[
            s.doneBtn,
            {
              backgroundColor:
                writeCheckState === "correct" ? c.right : c.primary,
            },
          ]}
          onPress={() => checkWord(target, onCorrect)}
          disabled={writeCheckState === "correct"}
        >
          {writeCheckState === "correct" ? (
            <Ionicons name="checkmark" size={20} color="#fff" />
          ) : (
            <Text style={s.doneBtnText}>Done</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Gap renderers ──────────────────────────────────────────────────────────
  const renderArabicGap = (fullArabic: string, targetVoweled: string) => {
    const idx = fullArabic.indexOf(targetVoweled);
    if (idx === -1)
      return (
        <View
          style={[
            s.arabicGapPill,
            {
              backgroundColor: c.primary + "15",
              borderColor: c.primary + "40",
            },
          ]}
        >
          <Text style={[s.dialogueArabic, { color: c.primary }]}>
            {fullArabic}
          </Text>
        </View>
      );
    const before = fullArabic.slice(0, idx);
    const after = fullArabic.slice(idx + targetVoweled.length);
    return (
      <View
        style={{
          flexDirection: "row-reverse",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 4,
        }}
      >
        {before !== "" && (
          <Text style={[s.dialogueArabic, { color: c.text }]}>{before}</Text>
        )}
        <View
          style={[
            s.blankField,
            {
              borderTopColor: c.primary + "55",
              borderLeftColor: c.primary + "55",
              borderRightColor: c.primary + "55",
              borderBottomColor: c.primary,
              backgroundColor: c.surface,
            },
          ]}
        />
        {after !== "" && (
          <Text style={[s.dialogueArabic, { color: c.text }]}>{after}</Text>
        )}
      </View>
    );
  };
  const renderHebrewGap = (hebrew: string, gap: string) => {
    if (!gap || !hebrew.includes(gap))
      return (
        <Text
          style={[s.dialogueHebrew, { color: c.label, fontStyle: "italic" }]}
        >
          {hebrew}
        </Text>
      );
    const parts = hebrew.split(gap);
    return (
      <Text style={[s.dialogueHebrew, { color: c.label, fontStyle: "italic" }]}>
        {parts[0]}
        <Text
          style={{ fontWeight: "800", color: c.primary, fontStyle: "normal" }}
        >
          {gap}
        </Text>
        {parts.slice(1).join(gap)}
      </Text>
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDERERS
  // ════════════════════════════════════════════════════════════════════════════

  const renderWordCard = () => {
    const stg = currentStage;
    const freq = stg.frequency ?? "common";
    return (
      <View style={[s.stageWrap, { alignItems: "center" }]}>
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginBottom: 8,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <View
            style={[
              s.freqBadge,
              {
                backgroundColor: freq === "core" ? c.primary + "18" : c.surface,
                borderColor: freq === "core" ? c.primary + "30" : c.border,
              },
            ]}
          >
            <Text
              style={[
                s.freqBadgeText,
                { color: freq === "core" ? c.primary : c.label },
              ]}
            >
              {freq === "core"
                ? "⭐ מילת ליבה"
                : freq === "common"
                  ? "📗 נפוץ"
                  : "📌 מצבי"}
            </Text>
          </View>
          {stg.chunk && (
            <View
              style={[
                s.freqBadge,
                {
                  backgroundColor: c.right + "15",
                  borderColor: c.right + "28",
                },
              ]}
            >
              <Text style={[s.freqBadgeText, { color: c.right }]}>
                🔠 ביטוי קבוע
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => playAudio(stg.arabic)}
          activeOpacity={0.85}
          style={{ marginVertical: 20 }}
        >
          <WordIcon icon={stg.icon} iconColor={stg.icon_color} size={148} />
        </TouchableOpacity>

        <Text style={[s.wordCardArabic, { color: c.text }]}>
          {stg.arabic}
        </Text>
        <Text style={[s.hebrewText, { color: c.label }]}>
          {stg.english ?? ""}
        </Text>

        {stg.dialect_note ? (
          <View
            style={[
              s.dialectNote,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={14}
              color={c.label}
            />
            <Text style={[s.dialectNoteText, { color: c.label }]}>
              {stg.dialect_note}
            </Text>
          </View>
        ) : null}

        <View style={{ marginTop: 24 }}>
          <AudioProgressRing
            progress={audioProgress}
            size={52}
            ringColor={c.primary}
            onPress={() => playAudio(stg.arabic)}
          >
            <View style={[s.audioInner, { backgroundColor: c.card }]}>
              <Ionicons name="volume-high" size={20} color={c.primary} />
            </View>
          </AudioProgressRing>
        </View>
      </View>
    );
  };

  const renderMicroReview = () => {
    const stg = currentStage;
    const options = shuffledMap[stage] ?? stg.options ?? [];
    const isLocked = lockedAnswer !== null;
    return (
      <View style={s.stageWrap}>
        <View
          style={[
            s.microReviewBanner,
            {
              backgroundColor: c.primary + "12",
              borderColor: c.primary + "25",
            },
          ]}
        >
          <Text style={{ fontSize: 13, color: c.primary, fontWeight: "700" }}>
            🔁 חזרה מהשיעור הקודם
          </Text>
          <Text style={{ fontSize: 12, color: c.label, marginTop: 2 }}>
            זוכר את המילה הזאת?
          </Text>
        </View>
        <View style={s.audioRow}>
          <AudioProgressRing
            progress={audioProgress}
            size={52}
            ringColor={c.primary}
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
            const isWrong = wrongAnswers.includes(opt.id);
            const isCorrect = isLocked && opt.correct;
            const col = opt.icon_color ?? DEFAULT_COLOR;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  s.choiceCard,
                  {
                    backgroundColor: isCorrect
                      ? c.right + "18"
                      : isWrong
                        ? c.wrong + "10"
                        : c.card,
                    borderColor: isCorrect
                      ? c.right
                      : isWrong
                        ? c.wrong
                        : c.border,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => {
                  if (isLocked || isWrong) return;
                  if (opt.correct) {
                    setLockedAnswer(opt.id);
                    playFeedbackSound("correct");
                    setTimeout(() => goNextStage(), 900);
                  } else {
                    playFeedbackSound("wrong");
                    setWrongAnswers((w) => [...w, opt.id]);
                    setTimeout(
                      () =>
                        setWrongAnswers((w) => w.filter((id) => id !== opt.id)),
                      650,
                    );
                  }
                }}
                disabled={isLocked || isWrong}
                activeOpacity={1}
              >
                <View
                  style={[s.choiceCardIcon, { backgroundColor: col + "18" }]}
                >
                  <Ionicons name={toIonicon(opt.icon)} size={46} color={col} />
                </View>
                <View style={s.choiceCardLabel}>
                  <Text
                    style={[
                      s.choiceCardText,
                      {
                        color: isCorrect ? c.right : isWrong ? c.wrong : c.text,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {opt.english ?? opt.hebrew ?? ""}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderListenRepeat = () => {
    const stg = currentStage;
    const isPlaying = audioProgress > 0;
    return (
      <View style={[s.stageWrap, { alignItems: "center" }]}>
        <View
          style={{
            width: "100%",
            height: 220,
            marginBottom: 20,
            position: "relative",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <WordIcon icon={stg.icon} iconColor="#8a7a6e" size={200} />
          <TouchableOpacity
            style={[s.speakerBtnOverlay]}
            onPress={() => playAudio(stg.arabic)}
            activeOpacity={0.82}
          >
            <View
              style={[
                s.speakerBtnCircle,
                { backgroundColor: isPlaying ? c.primary : "#ffffff" },
              ]}
            >
              <Ionicons
                name="volume-high"
                size={20}
                color={isPlaying ? "#ffffff" : c.primary}
              />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={[s.wordCardArabic, { color: c.text }]}>
          {stg.arabic}
        </Text>
        {!!stg.translit && (
          <Text style={[s.romanizText, { color: c.label }]}>{stg.translit}</Text>
        )}
        <Text style={[s.hebrewText, { color: c.label }]}>
          {stg.english ?? ""}
        </Text>
        {listenPhase === "correct" && (
          <View style={{ alignItems: "center", marginTop: 16, gap: 6 }}>
            <Ionicons name="checkmark-circle" size={44} color={c.right} />
            <Text style={{ color: c.right, fontSize: 16, fontWeight: "700" }}>
              Well done!
            </Text>
          </View>
        )}
        {listenPhase === "wrong" && (
          <View style={{ alignItems: "center", marginTop: 16, gap: 6 }}>
            <Ionicons name="close-circle" size={44} color={c.wrong} />
            <Text style={{ color: c.wrong, fontSize: 15, fontWeight: "600" }}>
              Try again
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderChooseTranslation = () => {
    const stg = currentStage;
    const options = shuffledMap[stage] ?? stg.options ?? [];
    const isLocked = lockedAnswer !== null;
    const isPlaying = audioProgress > 0;
    return (
      <View style={s.stageWrap}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            fontFamily: FONT_UI_BOLD,
            color: "#151515",
            textAlign: "center",
            marginBottom: 2,
            letterSpacing: -0.2,
          }}
        >
          What does this word mean?
        </Text>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "500",
            fontFamily: FONT_UI,
            color: "#9d998e",
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          Tap the speaker to listen again
        </Text>
        {/* Word card with speaker button + large Arabic */}
        <View
          style={[
            s.chooseWordCard,
            { backgroundColor: c.card, borderColor: c.border },
          ]}
        >
          <TouchableOpacity
            onPress={() => playAudio(stg.arabic)}
            activeOpacity={0.82}
          >
            <View
              style={[
                s.speakerBtnCircle,
                {
                  backgroundColor: isPlaying ? c.primary : "#ffffff",
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                },
              ]}
            >
              <Ionicons
                name="volume-high"
                size={26}
                color={isPlaying ? "#ffffff" : c.primary}
              />
            </View>
          </TouchableOpacity>
          <Text
            style={[s.chooseArabicLarge, { color: "#151515", fontFamily: FONT_AR }]}
          >
            {stg.arabic}
          </Text>
          {!!stg.translit && (
            <Text style={[s.romanizText, { color: "#9d998e" }]}>{stg.translit}</Text>
          )}
          {isLocked && (
            <Text
              style={{
                fontFamily: FONT_UI,
                fontStyle: "italic",
                fontSize: 15,
                color: "#9d998e",
                fontWeight: "500",
                letterSpacing: 0.1,
              }}
            >
              {stg.english ?? ""}
            </Text>
          )}
        </View>

        {/* Text-only 2×2 option grid */}
        <View style={s.chooseOptionGrid}>
          {options.map((opt: any) => {
            const isWrong = wrongAnswers.includes(opt.id);
            const isPending = choosePendingAnswer === opt.id && !isLocked;
            const isRevealCorrect = isLocked && opt.correct;
            const isRevealWrong = isLocked && isWrong;

            let bgColor = c.card;
            let bdColor = c.border;
            let txtColor = c.text;
            let bdWidth: number = 1.5;

            if (isPending) {
              bgColor = c.primary;
              bdColor = c.primary;
              txtColor = "#ffffff";
            }
            if (isRevealCorrect) {
              bgColor = REVEAL_CORRECT_BG;
              bdColor = "#738ce6";
              txtColor = REVEAL_CORRECT_TEXT;
            }
            if (isRevealWrong) {
              bgColor = c.primary + "10";
              bdColor = c.primary + "66";
              txtColor = c.primary;
            }

            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  s.chooseOption,
                  {
                    backgroundColor: bgColor,
                    borderColor: bdColor,
                    borderWidth: bdWidth,
                    transform: [{ scale: isPending ? 1.02 : 1 }],
                  },
                ]}
                onPress={() => {
                  if (isLocked) return;
                  setChoosePendingAnswer(opt.id);
                }}
                disabled={isLocked}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    s.chooseOptionText,
                    {
                      color: txtColor,
                      fontFamily: FONT_UI,
                      backgroundColor: "transparent",
                    },
                  ]}
                  numberOfLines={3}
                >
                  {opt.english ?? ""}
                </Text>
                {isRevealCorrect && (
                  <View
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: "#738ce6",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="checkmark" size={13} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderWriteTranslation = () => {
    const stg = currentStage;
    const allOpts = shuffledMap[stage] ?? [];
    const isLocked = lockedAnswer !== null;
    const correct = allOpts.find((o: any) => o.correct);
    const distractor = allOpts.find((o: any) => !o.correct);
    const twoOptions: any[] = shuffleArray(
      [correct, distractor].filter(Boolean),
    );
    return (
      <View style={[s.stageWrap, { flex: 1 }]}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
          }}
        >
          <WordIcon icon={stg.icon} iconColor={stg.icon_color} size={140} />
          <Text style={[s.hebrewText, { color: c.label, marginBottom: 0 }]}>
            {stg.english ?? ""}
          </Text>
        </View>
        <View style={{ gap: 12, marginBottom: 8 }}>
          {twoOptions.map((opt: any) => {
            const isWrong = wrongAnswers.includes(opt.id);
            const isCorrect = isLocked && opt.correct;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  s.writeChip,
                  {
                    backgroundColor: isCorrect
                      ? c.primary + "15"
                      : isWrong
                        ? c.wrong + "10"
                        : c.card,
                    borderColor: isCorrect
                      ? c.primary
                      : isWrong
                        ? c.wrong
                        : c.border,
                    borderWidth: isCorrect || isWrong ? 2.5 : 1.5,
                  },
                ]}
                onPress={() => {
                  playAudio(opt.arabic);
                  if (isLocked || isWrong) return;
                  if (opt.correct) {
                    setLockedAnswer(opt.id);
                    playFeedbackSound("correct");
                    showFeedback(true, "");
                    setTimeout(() => {
                      hideFeedback();
                      goNextStage();
                    }, 1000);
                  } else {
                    playFeedbackSound("wrong");
                    showFeedback(false, correct?.arabic ?? "");
                    setWrongAnswers((w) => [...w, opt.id]);
                    setTimeout(() => {
                      setWrongAnswers((w) => w.filter((id) => id !== opt.id));
                      hideFeedback();
                    }, 1200);
                  }
                }}
                disabled={isLocked}
                activeOpacity={1}
              >
                <Text
                  style={[s.writeChipText, { color: isCorrect ? c.primary : isWrong ? c.wrong : c.text }]}
                >
                  {opt.arabic}
                </Text>
                {!!opt.translit && (
                  <Text style={[s.romanizText, { color: isCorrect ? c.primary : isWrong ? c.wrong : c.label }]}>
                    {opt.translit}
                  </Text>
                )}
                {isCorrect && (
                  <Ionicons name="checkmark-circle" size={20} color={c.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderMatchPairs = () => {
    const pairs = currentStage.pairs ?? [];
    const shuffledRight = shuffledMap[stage] ?? [...pairs];
    return (
      <View style={s.stageWrap}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            fontFamily: FONT_UI_BOLD,
            color: c.text,
            textAlign: "center",
            marginBottom: 16,
            letterSpacing: -0.2,
          }}
        >
          Tap each Arabic word
        </Text>
        <View style={s.pairsContainer}>
          {pairs.map((p: any, i: number) => {
            const rightPair = shuffledRight[i];
            const isLeftMatched = matchedIds.includes(p.id);
            const isLeftSelected = matchSelected === p.id;
            const isRightMatched =
              rightPair && matchedIds.includes(rightPair.id);
            const isRightWrong = rightPair && matchWrong === rightPair.id;

            const leftBg = isLeftMatched
              ? "#fe4d0114"
              : isLeftSelected
                ? "#fe4d01"
                : "#ffffff";
            const leftBd = isLeftMatched
              ? "rgba(254,77,1,0.25)"
              : isLeftSelected
                ? "#fe4d01"
                : "#efeeeb";
            const leftTxt = isLeftSelected
              ? "#ffffff"
              : isLeftMatched
                ? "#fe4d01"
                : "#151515";
            const leftOp = isLeftMatched ? 0.6 : 1;

            const rightBg = isRightMatched ? "#fe4d0114" : "#ffffff";
            const rightBd = isRightMatched ? "rgba(254,77,1,0.25)" : "#efeeeb";
            const rightTxt = isRightMatched ? "#fe4d01" : "#151515";
            const rightOp = isRightMatched ? 0.6 : 1;

            return (
              <View key={p.id} style={s.pairRow}>
                <TouchableOpacity
                  style={[
                    s.matchPairCard,
                    {
                      backgroundColor: leftBg,
                      borderColor: isRightWrong ? "#efeeeb" : leftBd,
                      opacity: leftOp,
                      transform: [{ scale: isLeftSelected ? 1.02 : 1 }],
                      shadowColor: isLeftSelected ? "#fe4d01" : "#151515",
                      shadowOpacity: isLeftSelected ? 0.28 : 0.04,
                    },
                  ]}
                  onPress={() => !isLeftMatched && setMatchSelected(p.id)}
                  disabled={isLeftMatched}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[s.matchAr, { color: leftTxt, fontFamily: FONT_AR }]}
                  >
                    {p.arabic}
                  </Text>
                  {!!p.translit && (
                    <Text style={[s.romanizText, { color: isLeftSelected ? 'rgba(255,255,255,0.75)' : c.label }]}>
                      {p.translit}
                    </Text>
                  )}
                </TouchableOpacity>
                {rightPair && (
                  <TouchableOpacity
                    style={[
                      s.matchPairCard,
                      {
                        backgroundColor: rightBg,
                        borderColor: rightBd,
                        opacity: rightOp,
                        shadowColor: "#fe4d01",
                        shadowOpacity: matchWrong === rightPair.id ? 0.2 : 0,
                      },
                    ]}
                    onPress={() => {
                      if (isRightMatched || !matchSelected) return;
                      if (rightPair.id === matchSelected) {
                        setMatchedIds((prev) => [...prev, rightPair.id]);
                        setMatchSelected(null);
                      } else {
                        setMatchWrong(rightPair.id);
                        setTimeout(() => setMatchWrong(null), 500);
                        setMatchSelected(null);
                      }
                    }}
                    disabled={isRightMatched}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        s.matchHe,
                        { color: rightTxt, fontFamily: FONT_UI },
                      ]}
                    >
                      {rightPair.english ?? ""}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
        <Text
          style={[
            s.matchCounter,
            {
              color: "#9d998e",
              marginTop: 14,
              marginBottom: 0,
              fontFamily: FONT_UI,
            },
          ]}
        >
          {matchedIds.length} of {pairs.length} matched
        </Text>
      </View>
    );
  };

  const renderListenChoose = () => {
    const items = shuffledMap[stage] ?? currentStage.items ?? [];
    const item = items[qIndex];
    if (!item) return null;
    const isLocked = lockedAnswer !== null;
    return (
      <View style={s.stageWrap}>
        <View style={{ alignItems: "center", marginBottom: 12 }}>
          <AudioProgressRing
            progress={audioProgress}
            size={86}
            ringColor={c.primary}
            onPress={() => playAudio(item.arabic)}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: c.primary,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: c.primary,
                shadowOpacity: 0.35,
                shadowOffset: { width: 0, height: 6 },
                shadowRadius: 14,
                elevation: 8,
              }}
            >
              <Ionicons name="volume-high" size={30} color="#fff" />
            </View>
          </AudioProgressRing>
        </View>
        <View style={[s.choiceGrid, { marginTop: 8 }]}>
          {(item.shuffled_options ?? []).map((opt: any, idx: number) => {
            const isWrong = wrongAnswers.includes(`lc_${idx}`);
            const isCorrect = isLocked && opt.correct;
            const col = opt.icon_color ?? DEFAULT_COLOR;
            return (
              <TouchableOpacity
                key={idx}
                style={[
                  s.choiceCard,
                  {
                    backgroundColor: isCorrect
                      ? c.primary + "18"
                      : isWrong
                        ? c.wrong + "10"
                        : c.card,
                    borderColor: isCorrect
                      ? c.primary
                      : isWrong
                        ? c.wrong
                        : c.border,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => {
                  if (isLocked || isWrong) return;
                  if (opt.correct) {
                    setLockedAnswer("ok");
                    playFeedbackSound("correct");
                  } else {
                    playFeedbackSound("wrong");
                    setWrongAnswers((w) => [...w, `lc_${idx}`]);
                    setTimeout(
                      () =>
                        setWrongAnswers((w) =>
                          w.filter((id) => id !== `lc_${idx}`),
                        ),
                      600,
                    );
                  }
                }}
                disabled={isLocked || isWrong}
                activeOpacity={1}
              >
                <View
                  style={[s.choiceCardIcon, { backgroundColor: col + "18" }]}
                >
                  <Ionicons
                    name={toIonicon(opt.icon ?? DEFAULT_ICON)}
                    size={50}
                    color={col}
                  />
                </View>
                <View style={s.choiceCardLabel}>
                  <Text
                    style={[
                      s.choiceCardText,
                      {
                        color: isCorrect
                          ? c.primary
                          : isWrong
                            ? c.wrong
                            : c.text,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {opt.english ?? opt.hebrew ?? ""}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[s.matchCounter, { color: c.label, marginTop: 12 }]}>
          {qIndex + 1} / {items.length}
        </Text>
      </View>
    );
  };

  const renderSentenceBuild = () => {
    const stg = currentStage;
    // Support both new schema (bank/correct) and old schema (words/sentence_arabic)
    const isNewSchema = Array.isArray(stg.bank);
    const shuffledBank: any[] = shuffledMap[stage] ?? [];
    const correctIds: string[] = stg.correct ?? [];
    const correctWords: string[] = isNewSchema
      ? correctIds.map(
          (id: string) => stg.bank.find((b: any) => b.id === id)?.ar ?? "",
        )
      : (stg.words ?? []);
    const slotCount = isNewSchema
      ? correctIds.length
      : (stg.words ?? []).length;
    const promptText = isNewSchema
      ? (stg.english ?? stg.sentence_hebrew)
      : (stg.sentence_hebrew ?? stg.sentence_english);

    const handleAvailableTap = (displayIdx: number) => {
      if (buildAvailable[displayIdx] || buildPhase === "done") return;
      const wordVal = isNewSchema
        ? shuffledBank[displayIdx]?.ar
        : shuffledBank[displayIdx];
      if (!wordVal) return;
      playAudio(wordVal);
      setBuildSlots((sl) => [...sl, wordVal]);
      setBuildAvailable((prev) => {
        const n = [...prev];
        n[displayIdx] = true;
        return n;
      });
    };
    const handleSlotTap = (slotIdx: number) => {
      if (buildPhase === "done") return;
      const word = buildSlots[slotIdx];
      setBuildSlots((sl) => sl.filter((_, i) => i !== slotIdx));
      setBuildAvailable((prev) => {
        const n = [...prev];
        const fi = shuffledBank.findIndex(
          (w: any, i: number) => (isNewSchema ? w.ar : w) === word && n[i],
        );
        if (fi !== -1) n[fi] = false;
        return n;
      });
    };
    return (
      <View style={s.stageWrap}>
        <Text
          style={{
            color: "#9d998e",
            fontSize: 14,
            fontWeight: "600",
            fontFamily: FONT_UI,
            textAlign: "center",
            marginBottom: 6,
            letterSpacing: 0.3,
          }}
        >
          Translate this sentence
        </Text>
        <Text
          style={{
            color: "#151515",
            fontSize: 22,
            fontWeight: "700",
            fontFamily: FONT_UI_BOLD,
            textAlign: "center",
            marginBottom: 18,
            lineHeight: 32,
            letterSpacing: -0.2,
          }}
        >
          "{promptText}"
        </Text>

        {/* Answer area — RTL with dashed slots for empty positions */}
        <View
          style={[
            s.sbAnswerArea,
            {
              backgroundColor: "#faf9f6",
              borderColor: buildWrong ? c.wrong : "#efeeeb",
            },
          ]}
        >
          {Array.from({ length: slotCount }).map((_, i) => {
            const placedWord = buildSlots[i];
            const placedItem = isNewSchema
              ? stg.bank?.find((b: any) => b.ar === placedWord)
              : null;
            if (!placedWord) {
              return (
                <View
                  key={"slot-" + i}
                  style={[s.sbSlotDash, { borderColor: "#d8d5cd" }]}
                />
              );
            }
            const slotBg = buildWrong
              ? c.wrong + "12"
              : buildPhase === "done"
                ? REVEAL_CORRECT_BG
                : "rgba(254,77,1,0.08)";
            const slotBd = buildWrong
              ? c.wrong
              : buildPhase === "done"
                ? "#738ce6"
                : "#fe4d01";
            const slotTxt = buildWrong
              ? c.wrong
              : buildPhase === "done"
                ? REVEAL_CORRECT_TEXT
                : "#fe4d01";
            return (
              <TouchableOpacity
                key={"placed-" + i}
                onPress={() => handleSlotTap(i)}
                style={[
                  s.sbWordBlock,
                  { backgroundColor: slotBg, borderColor: slotBd },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[s.sbWordAr, { color: slotTxt, fontFamily: FONT_AR }]}
                >
                  {placedWord}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Practice phase reference banner */}
        {buildPhase === "practice" && (
          <View
            style={[
              s.sbPracticeStrip,
              {
                backgroundColor: REVEAL_CORRECT_BG,
                borderColor: "rgba(115,140,230,0.28)",
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  fontFamily: FONT_UI_BOLD,
                  color: REVEAL_CORRECT_TEXT,
                  letterSpacing: 1.2,
                  textTransform: "uppercase" as any,
                }}
              >
                Now you try — match this
              </Text>
              <Text
                style={{ fontSize: 11, fontFamily: FONT_UI, color: "#9d998e" }}
              >
                {buildSlots.length}/{slotCount}
              </Text>
            </View>
            <View
              style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}
            >
              {correctWords.map((w, i) => {
                const item = isNewSchema
                  ? stg.bank?.find((b: any) => b.ar === w)
                  : null;
                return (
                  <View key={i} style={{ alignItems: "center" }}>
                    <Text
                      style={{
                        fontWeight: "700",
                        fontFamily: FONT_AR,
                        fontSize: 20,
                        color: REVEAL_CORRECT_TEXT,
                        lineHeight: 28,
                      }}
                    >
                      {w}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Word bank */}
        <View style={{ marginTop: "auto" as any, paddingTop: 16 }}>
          <Text
            style={{
              color: "#9d998e",
              fontSize: 11,
              fontWeight: "700",
              fontFamily: FONT_UI_BOLD,
              letterSpacing: 1.2,
              textTransform: "uppercase" as any,
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            Tap to add · Tap again to hear
          </Text>
          <View
            style={{
              flexDirection: "row-reverse",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
            }}
          >
            {shuffledBank.map((item: any, displayIdx: number) => {
              const word = isNewSchema ? item.ar : item;
              const tr = isNewSchema ? item.tr : null;
              const used = buildAvailable[displayIdx] === true;
              return (
                <TouchableOpacity
                  key={displayIdx}
                  onPress={() => !used && handleAvailableTap(displayIdx)}
                  style={[
                    s.sbWordBlock,
                    {
                      backgroundColor: used ? "#faf9f6" : "#ffffff",
                      borderColor: "#efeeeb",
                      opacity: used ? 0.3 : 1,
                      shadowColor: "#151515",
                      shadowOpacity: used ? 0 : 0.04,
                      shadowOffset: { width: 0, height: 2 },
                      shadowRadius: 6,
                      elevation: used ? 0 : 2,
                    },
                  ]}
                  disabled={used}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      s.sbWordAr,
                      { color: "#151515", fontFamily: FONT_AR },
                    ]}
                  >
                    {word}
                  </Text>
                  {!!tr && (
                    <Text style={[s.sbWordTr, { color: c.label, fontFamily: FONT_UI }]}>
                      {tr}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  const renderSentenceComplete = () => {
    const stg = currentStage;
    const isLocked = lockedAnswer !== null;
    const options = shuffledMap[stage] ?? [];
    return (
      <View style={s.stageWrap}>
        <View style={[s.sentenceCard, { backgroundColor: c.card }]}>
          <TouchableOpacity
            onPress={() => playAudio(stg.arabic_context ?? "")}
            activeOpacity={0.8}
          >
            <Text
              style={[s.dialogueArabic, { color: c.text, marginBottom: 8 }]}
            >
              {stg.arabic_context}{" "}
              <Text style={{ color: c.primary }}>____</Text>
            </Text>
          </TouchableOpacity>
          <Text style={[s.hebrewHint, { color: c.label }]}>
            {stg.sentence_translation}
          </Text>
        </View>
        <View style={[s.wordChoiceGrid, { marginTop: 16 }]}>
          {options.length > 0 ? (
            options.map((opt: any) => {
              const isWrong = wrongAnswers.includes(opt.id);
              const isCorrect = isLocked && opt.correct;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    s.wordChip,
                    {
                      backgroundColor: isCorrect
                        ? c.primary + "15"
                        : isWrong
                          ? c.wrong + "10"
                          : c.card,
                      borderColor: isCorrect
                        ? c.primary
                        : isWrong
                          ? c.wrong
                          : c.border,
                      borderWidth: isCorrect || isWrong ? 2.5 : 1.5,
                    },
                  ]}
                  onPress={() => {
                    if (isLocked || isWrong) return;
                    playAudio(opt.arabic);
                    if (opt.correct) {
                      setLockedAnswer(opt.id);
                      playFeedbackSound("correct");
                      setTimeout(() => goNextStage(), 900);
                    } else {
                      playFeedbackSound("wrong");
                      setWrongAnswers((w) => [...w, opt.id]);
                      setTimeout(
                        () =>
                          setWrongAnswers((w) =>
                            w.filter((id) => id !== opt.id),
                          ),
                        650,
                      );
                    }
                  }}
                  disabled={isLocked || isWrong}
                  activeOpacity={1}
                >
                  <Text
                    style={[
                      s.wordChipText,
                      {
                        color: isCorrect
                          ? c.primary
                          : isWrong
                            ? c.wrong
                            : c.text,
                      },
                    ]}
                  >
                    {opt.arabic}
                  </Text>
                  {isCorrect && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={c.primary}
                      style={{ marginTop: 4 }}
                    />
                  )}
                </TouchableOpacity>
              );
            })
          ) : (
            <>
              {renderLetterBlocks(stg.letter_blocks ?? [])}
              {renderBlockActions(stg.target_word, () => {
                setTimeout(() => goNextStage(), 1100);
              })}
            </>
          )}
        </View>
      </View>
    );
  };

  const renderDialogue = () => {
    const stg = currentStage;
    const lines = stg.lines ?? [];

    // Design-spec avatar: 36×36 circle
    const DlgAvatar = ({ isUser }: { isUser: boolean }) => (
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: isUser ? "#fe4d01" : "#738ce6",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          borderWidth: 2.5,
          borderColor: "#ffffff",
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <Text
          style={{
            color: "#ffffff",
            fontWeight: "700",
            fontFamily: FONT_UI_BOLD,
            fontSize: 14,
          }}
        >
          {isUser ? "S" : "L"}
        </Text>
      </View>
    );

    return (
      <View style={s.stageWrap}>
        <View style={{ gap: 14 }}>
          {lines.map((line: any, idx: number) => {
            if (idx > dialogueStep) return null;
            const isUser = !!line.is_user_turn;
            const isDone = isUser && idx < dialogueStep;
            const isCurrent = idx === dialogueStep;

            // NPC bubble (partner)
            if (!isUser) {
              const isPlayingThis = audioProgress > 0 && dialogueStep === idx;
              return (
                <View
                  key={idx}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-end",
                    gap: 8,
                    alignSelf: "flex-start",
                    maxWidth: "86%",
                  }}
                >
                  <DlgAvatar isUser={false} />
                  <TouchableOpacity
                    style={[
                      s.dlgBubbleThem,
                      {
                        transform: [{ scale: isPlayingThis ? 1.015 : 1 }],
                        outlineWidth: isPlayingThis ? 2 : 0,
                      } as any,
                    ]}
                    onPress={() => playAudio(line.arabic)}
                    activeOpacity={0.88}
                  >
                    {/* Inline speaker pill + Arabic in a row */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          backgroundColor: "rgba(254,77,1,0.10)",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Ionicons
                          name="volume-medium"
                          size={14}
                          color="#fe4d01"
                        />
                      </View>
                      <Text
                        style={{
                          fontFamily: FONT_AR,
                          fontSize: 26,
                          fontWeight: "600",
                          color: "#151515",
                          lineHeight: 44,
                          textAlign: "right",
                          flex: 1,
                        }}
                      >
                        {line.arabic}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontFamily: FONT_UI,
                        fontSize: 13,
                        color: "#9d998e",
                        marginTop: 2,
                      }}
                    >
                      {line.english ?? ""}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }

            // User bubble — done (filled orange)
            if (isDone)
              return (
                <View
                  key={idx}
                  style={{
                    flexDirection: "row-reverse",
                    alignItems: "flex-end",
                    gap: 8,
                    alignSelf: "flex-end",
                    maxWidth: "86%",
                  }}
                >
                  <DlgAvatar isUser={true} />
                  <View style={[s.dlgBubbleYouDone]}>
                    <Text
                      style={{
                        fontFamily: FONT_AR,
                        fontSize: 26,
                        fontWeight: "600",
                        color: "#ffffff",
                        lineHeight: 44,
                        textAlign: "right",
                      }}
                    >
                      {line.full_arabic}
                    </Text>
                    <Text
                      style={{
                        fontFamily: FONT_UI,
                        fontSize: 13,
                        color: "rgba(255,255,255,0.85)",
                        marginTop: 2,
                        textAlign: "right",
                      }}
                    >
                      {line.english ?? ""}
                    </Text>
                  </View>
                </View>
              );

            // User bubble — current / active (ghost with dashed border)
            return (
              <View
                key={idx}
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "flex-end",
                  gap: 8,
                  alignSelf: "flex-end",
                  maxWidth: "86%",
                }}
              >
                <DlgAvatar isUser={true} />
                <View style={s.dlgBubbleYouGhost}>
                  {renderHebrewGap(
                    line.english ?? line.hebrew ?? "",
                    line.english_gap ?? line.hebrew_gap ?? "",
                  )}
                  <View style={{ marginTop: 10 }}>
                    {renderArabicGap(line.full_arabic, line.target_voweled)}
                  </View>
                  {dialogueMicState === "wrong" &&
                    lastTranscript.length > 1 && (
                      <Text
                        style={{
                          color: c.wrong,
                          fontSize: 12,
                          marginTop: 6,
                          fontFamily: FONT_UI,
                        }}
                      >
                        Heard: {lastTranscript}
                      </Text>
                    )}
                  {dialogueMicState === "scoring" && (
                    <View style={{ alignItems: "center", marginTop: 12 }}>
                      <ActivityIndicator color={c.primary} size="small" />
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
        {isDialogueAllDone && stg.cultural_note && (
          <View style={{ marginTop: 24 }}>
            <View style={[s.culturalNoteCard, { backgroundColor: c.card }]}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={c.primary}
                style={{ marginBottom: 6 }}
              />
              <Text style={[s.culturalNote, { color: c.label }]}>
                {stg.cultural_note}
              </Text>
            </View>
          </View>
        )}
        {showPassLink && (
          <TouchableOpacity
            onPress={() => passDialogueLine(currentDialogueLine)}
            style={{
              alignSelf: "center",
              marginTop: 12,
              paddingVertical: 6,
              paddingHorizontal: 20,
            }}
          >
            <Text
              style={{
                color: c.label,
                fontSize: 14,
                fontWeight: "500",
                fontFamily: FONT_UI,
                textDecorationLine: "underline",
              }}
            >
              Skip →
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderCulturalNote = () => {
    const stg = currentStage;
    return (
      <View style={[s.stageWrap, { flex: 1 }]}>
        <View
          style={{ flex: 1, justifyContent: "center", paddingHorizontal: 4 }}
        >
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <View
              style={[
                s.culturalNoteIcon,
                { backgroundColor: c.primary + "18" },
              ]}
            >
              <Ionicons name="sparkles" size={40} color={c.primary} />
            </View>
          </View>
          <Text style={[s.culturalNoteTitle, { color: c.text }]}>
            {stg.title}
          </Text>
          <View
            style={[
              s.culturalNoteBody,
              { backgroundColor: c.card, borderColor: c.border },
            ]}
          >
            <Text style={[s.culturalNoteText, { color: c.text }]}>
              {stg.body_hebrew}
            </Text>
          </View>
          {stg.audio_text && (
            <TouchableOpacity
              style={[
                s.culturalNoteAudio,
                {
                  borderColor: c.primary + "50",
                  backgroundColor: c.primary + "10",
                },
              ]}
              onPress={() => playAudio(stg.audio_text)}
              activeOpacity={0.8}
            >
              <Ionicons name="volume-high" size={18} color={c.primary} />
              <Text style={[s.culturalNoteAudioText, { color: c.primary }]}>
                שמע בערבית
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderShadowing = () => {
    const stg = currentStage;
    const isPlaying = shadowPhase === "playing";
    return (
      <View style={[s.stageWrap, { alignItems: "center" }]}>
        <View style={{ marginBottom: 24 }}>
          <AudioProgressRing
            progress={isPlaying ? audioProgress : 0}
            size={72}
            ringColor={c.primary}
            onPress={() => {
              if (shadowPhase !== "playing") {
                setShadowPhase("playing");
                playAudio(stg.sentence_arabic, () => {
                  setShadowPhase("ready");
                  setTimeout(() => {
                    startRecording(stg.sentence_arabic);
                    setShadowPhase("recording");
                  }, 800);
                });
              }
            }}
          >
            <View
              style={[
                s.audioInner,
                {
                  backgroundColor: isPlaying ? c.primary : c.card,
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                },
              ]}
            >
              <Ionicons
                name={isPlaying ? "volume-high" : "play"}
                size={24}
                color={isPlaying ? "#fff" : c.primary}
              />
            </View>
          </AudioProgressRing>
        </View>
        <Text
          style={[
            s.wordCardArabic,
            { color: c.text, fontSize: 34, lineHeight: 50 },
          ]}
          adjustsFontSizeToFit
        >
          {stg.sentence_arabic}
        </Text>
        <Text style={[s.hebrewText, { color: c.label }]}>
          {stg.sentence_english ?? stg.sentence_hebrew ?? ""}
        </Text>
        {shadowPhase === "idle" && (
          <Text style={[s.micHint, { color: c.label, marginTop: 8 }]}>
            Tap to listen
          </Text>
        )}
        {shadowPhase === "ready" && (
          <Text
            style={[
              s.micHint,
              { color: c.primary, fontWeight: "700", marginTop: 8 },
            ]}
          >
            Now repeat!
          </Text>
        )}
        {shadowPhase === "correct" && (
          <View style={{ alignItems: "center", marginTop: 16, gap: 6 }}>
            <Ionicons name="checkmark-circle" size={48} color={c.right} />
            <Text style={{ color: c.right, fontSize: 18, fontWeight: "800" }}>
              Well done!
            </Text>
          </View>
        )}
        {shadowPhase === "wrong" && (
          <View style={{ alignItems: "center", marginTop: 16, gap: 6 }}>
            <Ionicons name="close-circle" size={48} color={c.wrong} />
            <Text style={{ color: c.wrong, fontSize: 18, fontWeight: "700" }}>
              Try again
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderListeningComprehension = () => {
    const stg = currentStage;
    const shuffled = shuffledMap[stage];
    const options = shuffled?.options ?? stg.options ?? [];
    const isLocked = lockedAnswer !== null;
    return (
      <View style={s.stageWrap}>
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <AudioProgressRing
            progress={audioProgress}
            size={86}
            ringColor={c.primary}
            onPress={() => playAudio(stg.audio_text)}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: c.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="headset" size={30} color="#fff" />
            </View>
          </AudioProgressRing>
        </View>
        <Text style={[s.lcQuestion, { color: c.text }]}>{stg.question_he}</Text>
        <View style={s.lcOptionsList}>
          {options.map((opt: any) => {
            const isWrong = wrongAnswers.includes(opt.id);
            const isCorrect = isLocked && opt.correct;
            if (isWrong) return null;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  s.lcOption,
                  {
                    backgroundColor: isCorrect ? c.right + "15" : c.card,
                    borderColor: isCorrect ? c.right : c.border,
                    borderWidth: isCorrect ? 2 : 1.5,
                  },
                ]}
                onPress={() => {
                  if (isLocked) return;
                  if (opt.correct) {
                    setLockedAnswer(opt.id);
                    playFeedbackSound("correct");
                    setTimeout(() => goNextStage(), 900);
                  } else {
                    playFeedbackSound("wrong");
                    setWrongAnswers((w) => [...w, opt.id]);
                  }
                }}
                disabled={isLocked}
                activeOpacity={0.8}
              >
                {isCorrect && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={c.right}
                    style={{ marginRight: 10 }}
                  />
                )}
                <Text
                  style={[
                    s.lcOptionText,
                    {
                      color: isCorrect ? c.right : c.text,
                      fontWeight: isCorrect ? "700" : "500",
                    },
                  ]}
                >
                  {opt.english ?? opt.hebrew ?? ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderIdiomCard = () => {
    const stg = currentStage;
    return (
      <View style={[s.stageWrap, { flex: 1 }]}>
        <View
          style={{ flex: 1, justifyContent: "center", paddingHorizontal: 4 }}
        >
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <View
              style={[
                s.culturalNoteIcon,
                { backgroundColor: c.primary + "18" },
              ]}
            >
              <Ionicons
                name="chatbubble-ellipses"
                size={40}
                color={c.primary}
              />
            </View>
          </View>
          <Text style={[s.idiomArabic, { color: c.text }]}>
            {stg.idiom_arabic}
          </Text>
          {stg.idiom_hebrew && (
            <Text
              style={[
                s.pronText,
                { color: c.label, fontStyle: "italic", marginBottom: 20 },
              ]}
            >
              {stg.idiom_hebrew}
            </Text>
          )}
          <View
            style={[
              s.idiomMeaningCard,
              { backgroundColor: c.card, borderColor: c.border },
            ]}
          >
            <View style={s.idiomMeaningRow}>
              <Ionicons name="book-outline" size={16} color={c.label} />
              <View style={{ flex: 1 }}>
                <Text style={[s.idiomMeaningLabel, { color: c.label }]}>
                  פשוטו כמשמעו
                </Text>
                <Text style={[s.idiomMeaningText, { color: c.text }]}>
                  {stg.literal_meaning_he}
                </Text>
              </View>
            </View>
            <View style={[s.idiomDivider, { backgroundColor: c.border }]} />
            <View style={s.idiomMeaningRow}>
              <Ionicons name="bulb-outline" size={16} color={c.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[s.idiomMeaningLabel, { color: c.label }]}>
                  בפועל
                </Text>
                <Text style={[s.idiomMeaningText, { color: c.text }]}>
                  {stg.actual_meaning_he}
                </Text>
              </View>
            </View>
          </View>
          {stg.example_arabic && (
            <View style={{ marginTop: 16 }}>
              <Text
                style={[
                  s.idiomMeaningLabel,
                  { color: c.label, textAlign: "center", marginBottom: 6 },
                ]}
              >
                דוגמה
              </Text>
              <Text
                style={[
                  s.dialogueArabic,
                  { color: c.text, textAlign: "center", fontSize: 20 },
                ]}
              >
                {stg.example_arabic}
              </Text>
              <Text style={[s.pronText, { color: c.label }]}>
                {stg.example_hebrew}
              </Text>
            </View>
          )}
          {stg.audio_text && (
            <TouchableOpacity
              style={[
                s.culturalNoteAudio,
                {
                  borderColor: c.primary + "50",
                  backgroundColor: c.primary + "10",
                  marginTop: 16,
                },
              ]}
              onPress={() => playAudio(stg.audio_text)}
              activeOpacity={0.8}
            >
              <Ionicons name="volume-high" size={18} color={c.primary} />
              <Text style={[s.culturalNoteAudioText, { color: c.primary }]}>
                שמע דוגמה
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderMasteryCheck = () => {
    const stg = currentStage;
    const allItems = shuffledMap[stage] ?? stg.items ?? [];
    const item = allItems[masteryItemIndex];

    if (masteryDone) {
      const passed = masteryScore >= 2;
      return (
        <View
          style={[
            s.stageWrap,
            { alignItems: "center", justifyContent: "center", flex: 1 },
          ]}
        >
          <Ionicons
            name={passed ? "checkmark-circle" : "school-outline"}
            size={80}
            color={passed ? c.right : c.primary}
          />
          <Text
            style={{
              fontSize: 26,
              fontWeight: "800",
              color: c.text,
              marginTop: 16,
              textAlign: "center",
            }}
          >
            {passed ? "עברת את הבדיקה! 🎉" : "כדאי לחזור על השיעור"}
          </Text>
          <Text
            style={{
              color: c.label,
              textAlign: "center",
              marginTop: 8,
              fontSize: 16,
            }}
          >
            {masteryScore} מתוך 3 תשובות נכונות
          </Text>
        </View>
      );
    }

    if (!item) return null;
    return (
      <View style={s.stageWrap}>
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          {allItems.map((_: any, i: number) => (
            <View
              key={i}
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor:
                  i < masteryItemIndex
                    ? c.right
                    : i === masteryItemIndex
                      ? c.primary
                      : c.border,
              }}
            />
          ))}
        </View>
        <Text
          style={[
            s.hebrewText,
            {
              color: c.text,
              textAlign: "center",
              marginBottom: 20,
              fontSize: 18,
            },
          ]}
        >
          {item.prompt_he}
        </Text>
        {item.mode === "choose" ? (
          <View style={s.choiceGrid}>
            {(item.shuffled_options ?? item.options ?? []).map((opt: any) => {
              const isWrong = wrongAnswers.includes(opt.id);
              const isCorrect = lockedAnswer === opt.id && opt.correct;
              const col = opt.icon_color ?? DEFAULT_COLOR;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    s.choiceCard,
                    {
                      backgroundColor: isCorrect
                        ? c.right + "18"
                        : isWrong
                          ? c.wrong + "10"
                          : c.card,
                      borderColor: isCorrect
                        ? c.right
                        : isWrong
                          ? c.wrong
                          : c.border,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => {
                    if (lockedAnswer || isWrong) return;
                    playAudio(opt.arabic ?? "");
                    if (opt.correct) {
                      setLockedAnswer(opt.id);
                      playFeedbackSound("correct");
                      setMasteryScore((sc) => sc + 1);
                      setTimeout(() => {
                        setLockedAnswer(null);
                        setWrongAnswers([]);
                        advanceMasteryItem();
                      }, 800);
                    } else {
                      playFeedbackSound("wrong");
                      setWrongAnswers((w) => [...w, opt.id]);
                      setTimeout(() => {
                        setWrongAnswers((w) => w.filter((id) => id !== opt.id));
                        advanceMasteryItem();
                      }, 800);
                    }
                  }}
                  disabled={!!lockedAnswer || isWrong}
                  activeOpacity={1}
                >
                  <View
                    style={[s.choiceCardIcon, { backgroundColor: col + "18" }]}
                  >
                    <Ionicons
                      name={toIonicon(opt.icon)}
                      size={42}
                      color={col}
                    />
                  </View>
                  <View style={s.choiceCardLabel}>
                    <Text
                      style={[
                        s.choiceCardText,
                        {
                          color: isCorrect
                            ? c.right
                            : isWrong
                              ? c.wrong
                              : c.text,
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {opt.english ?? opt.hebrew ?? ""}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={{ alignItems: "center", gap: 16 }}>
            {item.word && (
              <WordIcon
                icon={item.word.icon}
                iconColor={item.word.icon_color}
                size={140}
              />
            )}
            <Text style={[s.wordCardArabic, { color: c.text, fontSize: 52 }]}>
              {item.word?.arabic}
            </Text>
            <Text style={[s.hebrewText, { color: c.label }]}>
              {item.word?.english}
            </Text>
            {listenPhase === "correct" && (
              <View style={{ alignItems: "center", gap: 6 }}>
                <Ionicons name="checkmark-circle" size={40} color={c.right} />
                <Text style={{ color: c.right, fontWeight: "700" }}>
                  Well done!
                </Text>
              </View>
            )}
            {listenPhase === "wrong" && (
              <View style={{ alignItems: "center", gap: 6 }}>
                <Ionicons name="close-circle" size={40} color={c.wrong} />
                <Text style={{ color: c.wrong, fontWeight: "600" }}>
                  Try again
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // ── Lesson intro (shown for all cycles-format lessons) ────────────────────
  const renderLessonIntro = () => {
    const stg = currentStage;
    const vocab: any[] = stg.allVocab ?? [];
    const topic: string = stg.topic ?? expandedLesson?.topic ?? '';

    const suffix = (id ?? '').split('_').pop() ?? '';
    const order = parseInt(suffix, 10) || 1;
    const level = order <= 12 ? 'A1' : order <= 24 ? 'A2' : order <= 36 ? 'B1' : 'B2';
    const levelColor = level === 'A1' ? '#FF9500' : level === 'A2' ? '#4CAF50' : level === 'B1' ? '#2196F3' : '#9C27B0';

    // Same color tokens as renderSubject
    const SC = {
      ink: '#151515', inkSoft: '#46443f', muted: '#9d998e', muted2: '#b9b5ab',
      hair: '#ece9e2', surface: '#faf9f6', card: '#ffffff',
      accent: '#fe4d01', accentWash: '#fff7f1',
      cool: '#738ce6', coolDeep: '#3d57b8', coolWash: 'rgba(115,140,230,0.08)',
    };

    // Same sub-components as renderSubject
    const SubCard = ({ children, style = {} }: any) => (
      <View style={[{ backgroundColor: SC.card, borderWidth: 1, borderColor: SC.hair, borderRadius: 20, padding: 20, shadowColor: '#151515', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 6 }, shadowRadius: 18, elevation: 2 }, style]}>
        {children}
      </View>
    );
    const SubEyebrow = ({ text, color = SC.accent }: any) => (
      <Text style={{ fontFamily: FONT_UI_BOLD, fontSize: 12, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase' as any, color }}>{text}</Text>
    );
    const SubSectionTitle = ({ kicker, kickerColor, title, sub }: any) => (
      <View style={{ gap: 6, marginBottom: 18 }}>
        <SubEyebrow text={kicker} color={kickerColor} />
        <Text style={{ fontFamily: FONT_UI_EXTRABOLD, fontSize: 30, fontWeight: '800', color: SC.ink, letterSpacing: -0.4, lineHeight: 36 }}>{title}</Text>
        {sub && <Text style={{ fontFamily: FONT_UI, fontSize: 15, fontWeight: '500', color: SC.muted, lineHeight: 22 }}>{sub}</Text>}
      </View>
    );
    const InfoRow = ({ tone, title: t2, body }: any) => {
      const isWarm = tone === 'warm';
      return (
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 10 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, flexShrink: 0, backgroundColor: isWarm ? SC.accentWash : SC.coolWash, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: FONT_UI_EXTRABOLD, fontSize: 13, fontWeight: '800', color: isWarm ? SC.accent : SC.coolDeep }}>·</Text>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontFamily: FONT_UI_BOLD, fontSize: 15, fontWeight: '700', color: SC.ink }}>{t2}</Text>
            <Text style={{ fontFamily: FONT_UI, fontSize: 14, fontWeight: '500', color: SC.muted, lineHeight: 20 }}>{body}</Text>
          </View>
        </View>
      );
    };
    const PlayPill = ({ wid, arabicText }: any) => {
      const playing = subjectPlayingId === wid;
      return (
        <TouchableOpacity
          onPress={() => { setSubjectPlayingId(wid); playAudio(arabicText, () => setSubjectPlayingId(null)); }}
          activeOpacity={0.8}
          style={{ width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: playing ? SC.accent : SC.card, shadowColor: playing ? SC.accent : '#151515', shadowOpacity: playing ? 0.35 : 0.06, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, borderWidth: 1, borderColor: SC.hair }}
        >
          <Ionicons name={playing ? 'volume-high' : 'volume-medium-outline'} size={18} color={playing ? '#ffffff' : SC.inkSoft} />
        </TouchableOpacity>
      );
    };

    const EXERCISES = [
      { tone: 'warm', title: 'Listen & Repeat',    body: 'Hear each word spoken aloud, then say it yourself into the mic.' },
      { tone: 'cool', title: 'Choose the Meaning', body: 'Pick the correct English translation from four options.' },
      { tone: 'warm', title: 'Pick the Word',      body: 'Two Arabic options — choose the one that matches the English.' },
      { tone: 'cool', title: 'Match Pairs',        body: 'Connect every Arabic word to its English meaning before time runs out.' },
      { tone: 'warm', title: 'Build a Sentence',   body: 'Arrange word blocks in the right order to form a full sentence.' },
      { tone: 'cool', title: 'Speak to Fill',      body: 'A conversation has a missing word — say it aloud to complete it.' },
    ];

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32, gap: 16 }}>

        {/* ── Section 1: Overview ─────────────────────────────────────────── */}
        <SubCard style={{ gap: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <View style={{ backgroundColor: levelColor + '18', borderRadius: 50, borderWidth: 1, borderColor: levelColor + '40', paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ fontFamily: FONT_UI_BOLD, fontSize: 12, fontWeight: '700', color: levelColor, letterSpacing: 0.8 }}>{level}</Text>
            </View>
            <Text style={{ fontFamily: FONT_UI_BOLD, fontSize: 12, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase' as any, color: SC.muted }}>Palestinian Arabic</Text>
          </View>
          <SubSectionTitle
            kicker={`01 · This lesson`}
            kickerColor={SC.accent}
            title={topic}
            sub={`You'll learn ${vocab.length} new words and practise them across 6 different exercise types.`}
          />
          <InfoRow tone="warm" title="Say it like a local" body="All words are in Palestinian Levantine dialect — the Arabic spoken in everyday life, not textbooks." />
          <InfoRow tone="cool" title="Tap any word to hear it" body="On the vocabulary list below every word is tappable — hear its pronunciation before you start." />
        </SubCard>

        {/* ── Section 2: Vocabulary ───────────────────────────────────────── */}
        <SubCard style={{ gap: 0 }}>
          <SubSectionTitle
            kicker={`02 · Vocabulary · ${vocab.length} words`}
            kickerColor={SC.cool}
            title="Words you'll learn"
            sub="Tap the speaker button to hear any word before you start."
          />
          <View style={{ gap: 0 }}>
            {vocab.map((w: any, i: number) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  paddingVertical: 12,
                  borderTopWidth: i === 0 ? 0 : 1, borderTopColor: SC.hair,
                }}
              >
                {/* Icon */}
                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: SC.surface, borderWidth: 1, borderColor: SC.hair, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <WordIcon icon={w.icon ?? 'book'} iconColor={w.icon_color ?? SC.muted} size={26} />
                </View>
                {/* Text */}
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={{ fontFamily: FONT_AR, fontSize: 22, fontWeight: '700', color: SC.ink, alignSelf: 'stretch' }}>{w.arabic}</Text>
                  {!!w.romanization && (
                    <Text style={{ fontFamily: FONT_UI, fontSize: 13, fontStyle: 'italic', color: SC.muted }}>{w.romanization}</Text>
                  )}
                  <Text style={{ fontFamily: FONT_UI, fontSize: 14, fontWeight: '500', color: SC.inkSoft }}>{w.english}</Text>
                </View>
                {/* Play */}
                <PlayPill wid={`intro_${i}`} arabicText={w.arabic} />
              </View>
            ))}
          </View>
        </SubCard>

        {/* ── Section 3: Practice plan ────────────────────────────────────── */}
        <SubCard style={{ gap: 0 }}>
          <SubSectionTitle
            kicker="03 · Practice plan"
            kickerColor={SC.accent}
            title="6 exercise types"
            sub="Each type trains a different skill — listening, recall, speaking."
          />
          {EXERCISES.map((ex, i) => (
            <View key={i} style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: SC.hair }}>
              <InfoRow tone={ex.tone as any} title={ex.title} body={ex.body} />
            </View>
          ))}
        </SubCard>

      </ScrollView>
    );
  };

  // ── Subject (read-only intro lesson) renderer ────────────────────────────
  const renderSubject = () => {
    const SC = {
      ink: "#151515",
      inkSoft: "#46443f",
      muted: "#9d998e",
      muted2: "#b9b5ab",
      hair: "#ece9e2",
      surface: "#faf9f6",
      card: "#ffffff",
      accent: "#fe4d01",
      accentWash: "#fff7f1",
      cool: "#738ce6",
      coolDeep: "#3d57b8",
      coolWash: "rgba(115,140,230,0.08)",
    };

    const curLetter = SUBJECT_LETTERS[subjectLetter];
    const filteredPronouns = SUBJECT_PRONOUNS.filter((p) =>
      subjectFilter === "all"
        ? true
        : subjectFilter === "sing"
          ? p.number === "singular"
          : p.number === "plural",
    );

    const playSubject = (id: string, arabicText: string) => {
      setSubjectPlayingId(id);
      playAudio(arabicText, () => setSubjectPlayingId(null));
    };

    const SubCard = ({ children, style = {} }: any) => (
      <View
        style={[
          {
            backgroundColor: SC.card,
            borderWidth: 1,
            borderColor: SC.hair,
            borderRadius: 20,
            padding: 20,
            shadowColor: "#151515",
            shadowOpacity: 0.04,
            shadowOffset: { width: 0, height: 6 },
            shadowRadius: 18,
            elevation: 2,
          },
          style,
        ]}
      >
        {children}
      </View>
    );

    const SubEyebrow = ({ text, color = SC.accent }: any) => (
      <Text
        style={{
          fontFamily: FONT_UI_BOLD,
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 1.6,
          textTransform: "uppercase" as any,
          color,
        }}
      >
        {text}
      </Text>
    );

    const SubSectionTitle = ({ kicker, kickerColor, title, sub }: any) => (
      <View style={{ gap: 6, marginBottom: 18 }}>
        <SubEyebrow text={kicker} color={kickerColor} />
        <Text
          style={{
            fontFamily: FONT_UI_EXTRABOLD,
            fontSize: 30,
            fontWeight: "800",
            color: SC.ink,
            letterSpacing: -0.4,
            lineHeight: 36,
          }}
        >
          {title}
        </Text>
        {sub && (
          <Text
            style={{
              fontFamily: FONT_UI,
              fontSize: 15,
              fontWeight: "500",
              color: SC.muted,
              lineHeight: 22,
            }}
          >
            {sub}
          </Text>
        )}
      </View>
    );

    const InfoRow = ({ tone, title: t2, body }: any) => {
      const isWarm = tone === "warm";
      return (
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            alignItems: "flex-start",
            paddingVertical: 10,
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              flexShrink: 0,
              backgroundColor: isWarm ? SC.accentWash : SC.coolWash,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontFamily: FONT_UI_EXTRABOLD,
                fontSize: 13,
                fontWeight: "800",
                color: isWarm ? SC.accent : SC.coolDeep,
              }}
            >
              ·
            </Text>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text
              style={{
                fontFamily: FONT_UI_BOLD,
                fontSize: 15,
                fontWeight: "700",
                color: SC.ink,
              }}
            >
              {t2}
            </Text>
            <Text
              style={{
                fontFamily: FONT_UI,
                fontSize: 14,
                fontWeight: "500",
                color: SC.muted,
                lineHeight: 20,
              }}
            >
              {body}
            </Text>
          </View>
        </View>
      );
    };

    const PronCell = ({ label, value, note, accent: acc }: any) => (
      <View
        style={{
          flex: 1,
          backgroundColor: acc ? SC.accentWash : "#ffffff",
          borderWidth: 1,
          borderColor: acc ? "rgba(254,77,1,0.18)" : SC.hair,
          borderRadius: 12,
          padding: 12,
          gap: 4,
        }}
      >
        <Text
          style={{
            fontFamily: FONT_UI_BOLD,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 1.2,
            textTransform: "uppercase" as any,
            color: acc ? SC.accent : SC.muted,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontFamily: FONT_UI_EXTRABOLD,
            fontSize: 22,
            fontWeight: "700",
            color: SC.ink,
            letterSpacing: -0.3,
          }}
        >
          {value}
        </Text>
        <Text
          style={{
            fontFamily: FONT_UI,
            fontSize: 12,
            fontWeight: "500",
            color: SC.muted,
            lineHeight: 17,
          }}
        >
          {note}
        </Text>
      </View>
    );

    const PlayPill = ({ id, arabicText, label }: any) => {
      const playing = subjectPlayingId === id;
      return (
        <TouchableOpacity
          onPress={() => playSubject(id, arabicText)}
          activeOpacity={0.8}
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            backgroundColor: playing ? SC.accent : "#ffffff",
            shadowColor: playing ? SC.accent : "#151515",
            shadowOpacity: playing ? 0.35 : 0.06,
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 2,
            borderWidth: 1,
            borderColor: SC.hair,
          }}
        >
          <Ionicons
            name={playing ? "volume-high" : "volume-medium-outline"}
            size={18}
            color={playing ? "#ffffff" : SC.inkSoft}
          />
        </TouchableOpacity>
      );
    };

    // ── Section 1: Background ───────────────────────────────────────────────
    const BackgroundSection = () => (
      <SubCard style={{ gap: 16 }}>
        <SubSectionTitle
          kicker="01 · Background"
          kickerColor={SC.accent}
          title="A few things to know first"
          sub="You're learning Levantine Arabic — the everyday spoken Arabic of Syria, Lebanon, Jordan and Palestine."
        />
        <InfoRow
          tone="warm"
          title="It's regional"
          body="Levantine is spoken, not formal. Newspapers and the Qur'an use Modern Standard Arabic — but on the street and between friends, it's Levantine."
        />
        <InfoRow
          tone="cool"
          title="It has gender"
          body="Every noun and many verbs change depending on whether you're addressing a man or a woman. 'You' isn't one word — it's two."
        />
        <InfoRow
          tone="warm"
          title="Pronunciation flexes"
          body="Some letters sound different in everyday Levantine versus formal Arabic. Tap a letter below to see how."
        />

        <View
          style={{
            backgroundColor: SC.surface,
            borderWidth: 1,
            borderColor: SC.hair,
            borderRadius: 16,
            padding: 16,
            marginTop: 6,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            {SUBJECT_LETTERS.map((v, i) => {
              const active = i === subjectLetter;
              return (
                <TouchableOpacity
                  key={v.id}
                  onPress={() => setSubjectLetter(i)}
                  activeOpacity={0.8}
                  style={{
                    paddingVertical: 9,
                    paddingHorizontal: 16,
                    borderRadius: 999,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    backgroundColor: active ? SC.ink : "#ffffff",
                    borderWidth: 1,
                    borderColor: active ? SC.ink : SC.hair,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: FONT_AR,
                      fontSize: 20,
                      fontWeight: "700",
                      color: active ? "#ffffff" : SC.inkSoft,
                    }}
                  >
                    {v.id}
                  </Text>
                  <Text
                    style={{
                      fontFamily: FONT_UI_BOLD,
                      fontSize: 14,
                      fontWeight: "600",
                      letterSpacing: 0.1,
                      color: active ? "#ffffff" : SC.inkSoft,
                    }}
                  >
                    {v.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <PronCell
              label="Formal · MSA"
              value={curLetter.msa}
              note={curLetter.note}
              accent={false}
            />
            <PronCell
              label="Levantine"
              value={curLetter.lev}
              note={curLetter.note2}
              accent={true}
            />
          </View>
        </View>
      </SubCard>
    );

    // ── Section 2: Greetings ────────────────────────────────────────────────
    const GreetingsSection = () => (
      <SubCard style={{ gap: 16 }}>
        <SubSectionTitle
          kicker="02 · Greetings"
          kickerColor={SC.accent}
          title="Saying hello"
          sub="Most greetings work for anyone. Some change depending on whether you're addressing a man or a woman — both forms shown below."
        />

        <View>
          {SUBJECT_GREETINGS.map((g, i) => {
            const isLast = i === SUBJECT_GREETINGS.length - 1;
            if (!g.gendered) {
              return (
                <View
                  key={g.id}
                  style={{
                    flexDirection: "row",
                    gap: 14,
                    alignItems: "center",
                    paddingVertical: 18,
                    paddingHorizontal: 4,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: SC.hair,
                  }}
                >
                  <PlayPill
                    id={g.id}
                    arabicText={g.arabic!}
                    label={g.meaning}
                  />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text
                      style={{
                        fontFamily: FONT_AR,
                        fontSize: 30,
                        fontWeight: "600",
                        color: SC.ink,
                        lineHeight: 40,
                      }}
                    >
                      {g.arabic}
                    </Text>
                    <Text
                      style={{
                        fontFamily: FONT_UI_BOLD,
                        fontSize: 17,
                        fontWeight: "700",
                        color: SC.inkSoft,
                      }}
                    >
                      {g.meaning}
                    </Text>
                    <Text
                      style={{
                        fontFamily: FONT_UI,
                        fontSize: 14,
                        fontWeight: "500",
                        color: SC.muted,
                        lineHeight: 20,
                      }}
                    >
                      {g.use}
                    </Text>
                  </View>
                </View>
              );
            }
            return (
              <View
                key={g.id}
                style={{
                  paddingVertical: 18,
                  paddingHorizontal: 4,
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: SC.hair,
                  gap: 10,
                }}
              >
                <Text
                  style={{
                    fontFamily: FONT_UI_BOLD,
                    fontSize: 17,
                    fontWeight: "700",
                    color: SC.inkSoft,
                  }}
                >
                  {g.meaning}
                </Text>
                <Text
                  style={{
                    fontFamily: FONT_UI,
                    fontSize: 14,
                    fontWeight: "500",
                    color: SC.muted,
                    lineHeight: 20,
                  }}
                >
                  {g.use}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    alignItems: "center",
                    backgroundColor: SC.coolWash,
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <PlayPill
                    id={g.id + "_m"}
                    arabicText={g.masculine!.arabic}
                    label={g.meaning}
                  />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text
                      style={{
                        fontFamily: FONT_AR,
                        fontSize: 30,
                        fontWeight: "600",
                        color: SC.ink,
                        lineHeight: 40,
                      }}
                    >
                      {g.masculine!.arabic}
                    </Text>
                    <Text
                      style={{
                        fontFamily: FONT_UI_BOLD,
                        fontSize: 12,
                        fontWeight: "700",
                        letterSpacing: 0.8,
                        textTransform: "uppercase" as any,
                        color: SC.coolDeep,
                      }}
                    >
                      to a man
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    alignItems: "center",
                    backgroundColor: SC.accentWash,
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <PlayPill
                    id={g.id + "_f"}
                    arabicText={g.feminine!.arabic}
                    label={g.meaning}
                  />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text
                      style={{
                        fontFamily: FONT_AR,
                        fontSize: 30,
                        fontWeight: "600",
                        color: SC.ink,
                        lineHeight: 40,
                      }}
                    >
                      {g.feminine!.arabic}
                    </Text>
                    <Text
                      style={{
                        fontFamily: FONT_UI_BOLD,
                        fontSize: 12,
                        fontWeight: "700",
                        letterSpacing: 0.8,
                        textTransform: "uppercase" as any,
                        color: SC.accent,
                      }}
                    >
                      to a woman
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </SubCard>
    );

    // ── Section 3: Pronouns ─────────────────────────────────────────────────
    const PronounsSection = () => (
      <SubCard style={{ gap: 16 }}>
        <SubSectionTitle
          kicker="03 · Pronouns"
          kickerColor={SC.coolDeep}
          title="Subject pronouns"
          sub="Eight words cover I, you, he, she, we, you all, they. Notice how 'you' splits into masculine and feminine — that pattern repeats everywhere in Arabic."
        />

        <View
          style={{
            flexDirection: "row",
            alignSelf: "flex-start",
            backgroundColor: SC.surface,
            borderWidth: 1,
            borderColor: SC.hair,
            borderRadius: 999,
            padding: 4,
            gap: 4,
          }}
        >
          {(
            [
              ["all", "All"],
              ["sing", "Singular"],
              ["plur", "Plural"],
            ] as const
          ).map(([id, label]) => {
            const active = id === subjectFilter;
            return (
              <TouchableOpacity
                key={id}
                onPress={() => setSubjectFilter(id)}
                activeOpacity={0.8}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 999,
                  backgroundColor: active ? SC.coolDeep : "transparent",
                }}
              >
                <Text
                  style={{
                    fontFamily: FONT_UI_BOLD,
                    fontSize: 14,
                    fontWeight: "700",
                    letterSpacing: 0.2,
                    color: active ? "#ffffff" : SC.inkSoft,
                  }}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {filteredPronouns.map((p) => {
            const playing = subjectPlayingId === p.id;
            const gTag =
              p.gender === "m"
                ? { label: "masculine", color: SC.coolDeep, bg: SC.coolWash }
                : p.gender === "f"
                  ? { label: "feminine", color: SC.accent, bg: SC.accentWash }
                  : { label: "any", color: SC.muted, bg: SC.surface };
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => playSubject(p.id, p.arabic)}
                activeOpacity={0.85}
                style={{
                  width: "47%",
                  backgroundColor: playing ? SC.accentWash : "#ffffff",
                  borderWidth: 1,
                  borderColor: playing ? "rgba(254,77,1,0.4)" : SC.hair,
                  borderRadius: 16,
                  padding: 16,
                  gap: 8,
                  shadowColor: playing ? SC.accent : "#151515",
                  shadowOpacity: playing ? 0.15 : 0.04,
                  shadowOffset: { width: 0, height: 1 },
                  shadowRadius: 2,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: FONT_UI_BOLD,
                      fontSize: 14,
                      fontWeight: "700",
                      color: SC.muted,
                    }}
                  >
                    {p.english}
                  </Text>
                  <Ionicons
                    name={playing ? "volume-high" : "volume-medium-outline"}
                    size={16}
                    color={playing ? SC.accent : SC.muted}
                  />
                </View>
                <Text
                  style={{
                    fontFamily: FONT_AR,
                    fontSize: 36,
                    fontWeight: "600",
                    color: SC.ink,
                    lineHeight: 44,
                    textAlign: "right",
                  }}
                >
                  {p.arabic}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      paddingVertical: 4,
                      paddingHorizontal: 8,
                      borderRadius: 999,
                      backgroundColor: gTag.bg,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: FONT_UI_BOLD,
                        fontSize: 11,
                        fontWeight: "700",
                        letterSpacing: 0.4,
                        textTransform: "uppercase" as any,
                        color: gTag.color,
                      }}
                    >
                      {gTag.label}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: FONT_UI,
                      fontSize: 12,
                      fontWeight: "600",
                      color: SC.muted2,
                      textTransform: "lowercase" as any,
                    }}
                  >
                    {p.number}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </SubCard>
    );

    return (
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero — scrolls with content */}
          <View
            style={{
              backgroundColor: "#ffffff",
              borderBottomWidth: 1,
              borderBottomColor: SC.hair,
              paddingHorizontal: 28,
              paddingTop: 22,
              paddingBottom: 24,
            }}
          >
            <Text
              style={{
                fontFamily: FONT_UI_EXTRABOLD,
                fontSize: 32,
                fontWeight: "800",
                color: SC.ink,
                letterSpacing: -0.6,
                lineHeight: 38,
              }}
            >
              Arabic, the basics
            </Text>
            <Text
              style={{
                fontFamily: FONT_UI,
                fontSize: 15,
                fontWeight: "500",
                color: SC.muted,
                lineHeight: 22,
                marginTop: 10,
              }}
            >
              {"A quick orientation to "}
              <Text
                style={{
                  fontFamily: FONT_AR,
                  fontWeight: "600",
                  color: SC.inkSoft,
                }}
              >
                العَرَبِيَّة
              </Text>
              {
                ' — the kind of Arabic you\'ll learn, how to greet someone, and the words for "I, you, he, she."'
              }
            </Text>
            <View
              style={{
                marginTop: 20,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              {["Background", "Greetings", "Pronouns"].map((label, i) => (
                <View
                  key={label}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: i < 2 ? 6 : 0,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: i < 2 ? SC.accent : SC.coolDeep,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: FONT_UI_EXTRABOLD,
                          fontSize: 11,
                          fontWeight: "800",
                          color: "#ffffff",
                        }}
                      >
                        {"0" + (i + 1)}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontFamily: FONT_UI_BOLD,
                        fontSize: 13,
                        fontWeight: "700",
                        color: SC.inkSoft,
                        letterSpacing: 0.2,
                      }}
                    >
                      {label}
                    </Text>
                  </View>
                  {i < 2 && (
                    <View
                      style={{
                        width: 20,
                        height: 1,
                        backgroundColor: SC.hair,
                        marginHorizontal: 4,
                      }}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>

          <View style={{ padding: 22, paddingBottom: 80, gap: 18 }}>
            <BackgroundSection />
            <GreetingsSection />
            <PronounsSection />
            <View
              style={{
                padding: 16,
                backgroundColor: SC.coolWash,
                borderWidth: 1,
                borderColor: "rgba(115,140,230,0.22)",
                borderRadius: 16,
                flexDirection: "row",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: SC.cool,
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Courier New",
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#ffffff",
                  }}
                >
                  i
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: FONT_UI,
                  fontSize: 14,
                  fontWeight: "500",
                  color: SC.coolDeep,
                  lineHeight: 21,
                  flex: 1,
                }}
              >
                This is an introduction — nothing to memorise yet. The exercises
                ahead will drill greetings first, then pronouns, then put them
                together.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  // ── Speak the Blank renderer ──────────────────────────────────────────────
  const renderSpeakTheBlank = () => {
    const stg = currentStage;
    const round = (stg.rounds ?? [])[speakBlankRoundIdx];
    if (!round?.prompt) return null;

    const isListening = listenPhase === "recording";
    const isSuccess = listenPhase === "correct";
    const isRetry = listenPhase === "wrong";
    const promptPlaying = speakBlankPlayingLine === 0;
    const micBg = isRetry ? "#46443f" : "#fe4d01";

    const SBC = {
      ink: "#151515",
      inkSoft: "#46443f",
      muted: "#9d998e",
      hair: "#ece9e2",
      card: "#ffffff",
      accent: "#fe4d01",
      accentWash: "#fff7f1",
    };

    const status = isListening
      ? "Listening…"
      : isRetry
        ? "Try again — speak clearly"
        : isSuccess
          ? "Nicely said"
          : "Speak the missing word";

    const mkRingStyle = (v: Animated.Value) => ({
      position: "absolute" as const,
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: micBg,
      transform: [
        {
          scale: v.interpolate({
            inputRange: [0, 1],
            outputRange: [0.85, 1.4],
          }),
        },
      ],
      opacity: v.interpolate({
        inputRange: [0, 0.2, 1],
        outputRange: [0, 0.35, 0],
      }),
    });

    // ── BlankRect (RTL split on ___) ──────────────────────────────────────
    const BlankRect = ({ fontSize = 28 }: { fontSize?: number }) => {
      const filled = speakBlankRevealed || isSuccess;
      if (filled) {
        return (
          <View
            style={{
              backgroundColor: "#f5f2ea",
              borderWidth: 1,
              borderColor: "#ffffff",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 2,
              marginHorizontal: 4,
            }}
          >
            <Text
              style={{
                fontFamily: FONT_AR,
                fontSize,
                fontWeight: "600",
                color: SBC.ink,
              }}
            >
              {round.answer.blank.arabic}
            </Text>
          </View>
        );
      }
      const bg = isListening ? SBC.accentWash : isRetry ? "#ece8df" : "#f5f2ea";
      return (
        <View
          style={{
            minWidth: 110,
            height: fontSize + 14,
            marginHorizontal: 6,
            backgroundColor: bg,
            borderWidth: 1,
            borderColor: "#ffffff",
            borderRadius: 8,
          }}
        />
      );
    };

    const BlankRectMini = () => {
      const filled = speakBlankRevealed || isSuccess;
      if (filled) {
        return (
          <Text
            style={{
              fontFamily: FONT_UI,
              fontStyle: "italic",
              fontWeight: "700",
              color: SBC.ink,
              paddingHorizontal: 4,
            }}
          >
            {round.answer.blank.translit}
          </Text>
        );
      }
      const bg = isListening ? SBC.accentWash : "#f5f2ea";
      return (
        <View
          style={{
            minWidth: 60,
            height: 14,
            backgroundColor: bg,
            borderWidth: 1,
            borderColor: "#ffffff",
            borderRadius: 4,
            marginHorizontal: 4,
          }}
        />
      );
    };

    // ── PromptCard ─────────────────────────────────────────────────────────
    const PromptCard = () => (
      <TouchableOpacity
        onPress={() => {
          setSpeakBlankPlayingLine(0);
          playAudio(round.prompt.arabic, () => setSpeakBlankPlayingLine(null));
        }}
        activeOpacity={0.88}
        style={{ textAlign: "right" as any, padding: 4 }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <Text
            style={{
              fontFamily: FONT_UI_BOLD,
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: 1.4,
              textTransform: "uppercase" as any,
              color: promptPlaying ? SBC.accent : SBC.muted,
            }}
          >
            Layla
          </Text>
          <Ionicons
            name={promptPlaying ? "volume-high" : "volume-medium-outline"}
            size={16}
            color={promptPlaying ? SBC.accent : SBC.muted}
            style={{ opacity: promptPlaying ? 1 : 0.7 }}
          />
        </View>
        <Text
          style={{
            fontFamily: FONT_AR,
            fontSize: 30,
            fontWeight: "600",
            color: SBC.ink,
            lineHeight: 47,
            textAlign: "right",
          }}
        >
          {round.prompt.arabic}
        </Text>
        <Text
          style={{
            fontFamily: FONT_UI,
            fontStyle: "italic",
            fontSize: 14,
            color: SBC.muted,
            fontWeight: "500",
            textAlign: "right",
            marginTop: 4,
          }}
        >
          {round.prompt.translit}
        </Text>
        <Text
          style={{
            fontFamily: FONT_UI,
            fontSize: 14,
            color: SBC.muted,
            fontWeight: "500",
            textAlign: "right",
            marginTop: 2,
          }}
        >
          {round.prompt.english}
        </Text>
      </TouchableOpacity>
    );

    // ── AnswerCard ─────────────────────────────────────────────────────────
    const AnswerCard = () => {
      const arabicParts = round.answer.arabic.split("___");
      const translitParts = round.answer.translit.split("___");
      const englishParts = round.answer.english.split("___");
      const targetWord = round.answer.blank.english;

      return (
        <View
          style={{
            backgroundColor: SBC.card,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: SBC.hair,
            paddingTop: 26,
            paddingHorizontal: 24,
            paddingBottom: 24,
            shadowColor: "#151515",
            shadowOpacity: 0.04,
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 24,
            elevation: 2,
            gap: 8,
          }}
        >
          <Text
            style={{
              fontFamily: FONT_UI_BOLD,
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: 1.4,
              textTransform: "uppercase" as any,
              color: SBC.accent,
            }}
          >
            Your reply
          </Text>

          {/* Arabic row with blank */}
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {arabicParts.map((p: string, i: number) => (
              <React.Fragment key={i}>
                {p !== "" && (
                  <Text
                    style={{
                      fontFamily: FONT_AR,
                      fontSize: 28,
                      fontWeight: "600",
                      color: SBC.ink,
                      lineHeight: 44,
                    }}
                  >
                    {p}
                  </Text>
                )}
                {i < arabicParts.length - 1 && <BlankRect fontSize={28} />}
              </React.Fragment>
            ))}
          </View>

          {/* Translit row with mini blank */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              marginTop: 2,
            }}
          >
            {translitParts.map((p: string, i: number) => (
              <React.Fragment key={i}>
                {p !== "" && (
                  <Text
                    style={{
                      fontFamily: FONT_UI,
                      fontStyle: "italic",
                      fontSize: 14,
                      color: SBC.muted,
                      fontWeight: "500",
                    }}
                  >
                    {p}
                  </Text>
                )}
                {i < translitParts.length - 1 && <BlankRectMini />}
              </React.Fragment>
            ))}
          </View>

          {/* English row — target word always orange bold */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              marginTop: 2,
            }}
          >
            {englishParts.map((p: string, i: number) => (
              <React.Fragment key={i}>
                {p !== "" && (
                  <Text
                    style={{
                      fontFamily: FONT_UI,
                      fontSize: 14,
                      color: SBC.inkSoft,
                      fontWeight: "500",
                    }}
                  >
                    {p}
                  </Text>
                )}
                {i < englishParts.length - 1 && (
                  <Text
                    style={{
                      fontFamily: FONT_UI_BOLD,
                      fontSize: 14,
                      color: SBC.accent,
                      fontWeight: "700",
                      paddingHorizontal: 1,
                    }}
                  >
                    {targetWord}
                  </Text>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      );
    };

    return (
      <View style={{ flex: 1 }}>
        {/* Title + context */}
        <View
          style={{
            paddingHorizontal: 28,
            paddingTop: 12,
            paddingBottom: 0,
            flexShrink: 0,
          }}
        >
          <Text
            style={{
              fontFamily: FONT_UI_BOLD,
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: 1.6,
              textTransform: "uppercase" as any,
              color: SBC.accent,
              marginBottom: 6,
            }}
          >
            Speak the blank
          </Text>
          <Text
            style={{
              fontFamily: FONT_UI,
              fontSize: 14,
              fontWeight: "500",
              color: SBC.muted,
              lineHeight: 21,
            }}
          >
            {round.context}
          </Text>
        </View>

        {/* Scrollable body */}
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 28,
            paddingTop: 24,
            paddingBottom: 16,
            gap: 22,
          }}
          showsVerticalScrollIndicator={false}
        >
          <PromptCard />
          <View
            style={{ height: 1, backgroundColor: SBC.hair, marginVertical: 2 }}
          />
          <AnswerCard />
          {/* Show / hide answer link */}
          <View style={{ alignItems: "center", marginTop: -4 }}>
            <TouchableOpacity
              onPress={() => setSpeakBlankRevealed((v) => !v)}
              activeOpacity={0.7}
              style={{ paddingVertical: 6, paddingHorizontal: 10 }}
            >
              <Text
                style={{
                  fontFamily: FONT_UI_BOLD,
                  fontSize: 13,
                  fontWeight: "600",
                  color: speakBlankRevealed ? SBC.inkSoft : SBC.muted,
                  letterSpacing: 0.2,
                  textDecorationLine: "underline",
                }}
              >
                {speakBlankRevealed ? "Hide the answer" : "Show the answer"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Bottom: status + mic */}
        <View
          style={{
            paddingTop: 10,
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 20,
            alignItems: "center",
            gap: 14,
            flexShrink: 0,
            borderTopWidth: 1,
            borderTopColor: SBC.hair,
          }}
        >
          <Text
            style={{
              fontFamily: FONT_UI_BOLD,
              fontSize: 13,
              fontWeight: "600",
              letterSpacing: 0.4,
              color: isRetry ? SBC.inkSoft : SBC.muted,
            }}
          >
            {status}
          </Text>
          <View
            style={{
              position: "relative",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isListening && (
              <>
                <Animated.View style={mkRingStyle(micRing1)} />
                <Animated.View style={mkRingStyle(micRing2)} />
              </>
            )}
            <TouchableOpacity
              style={[
                s.micCircleBtn,
                { backgroundColor: micBg, shadowColor: micBg },
              ]}
              onPress={() => {
                if (listenPhase === "recording") finishListenRepeatRecording();
                else if (listenPhase === "speak" || listenPhase === "wrong") {
                  const r = (currentStage.rounds ?? [])[speakBlankRoundIdx];
                  if (r?.answer?.blank) startRecording(r.answer.blank.arabic);
                }
              }}
              activeOpacity={0.87}
            >
              {isSuccess ? (
                <Ionicons name="checkmark" size={38} color="#fff" />
              ) : isRetry ? (
                <Ionicons name="refresh" size={28} color="#fff" />
              ) : (
                <Ionicons name="mic" size={38} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ── Action bar renderer ────────────────────────────────────────────────────
  const renderActionBar = () => {
    const bar = actionBarState;
    if (bar.type === "hidden") return null;
    const micColor =
      bar.type === "mic" && bar.phase === "wrong"
        ? c.wrong
        : bar.type === "mic" && bar.phase === "correct"
          ? c.right
          : c.primary;
    return (
      <View
        style={[
          s.actionBar,
          {
            backgroundColor: c.card,
            borderTopColor: c.border,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <View style={{ paddingHorizontal: 24, paddingTop: 12 }}>
          {/* Inline feedback strip for sentence_build */}
          {currentStage?.type === "sentence_build" && buildPhase === "done" && (
            <View
              style={[s.feedbackStrip, { backgroundColor: REVEAL_CORRECT_BG }]}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: "#738ce6",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="checkmark" size={13} color="#ffffff" />
              </View>
              <Text
                style={[s.feedbackStripText, { color: REVEAL_CORRECT_TEXT }]}
              >
                Nice — that reads right.
              </Text>
            </View>
          )}

          {/* Inline feedback strip for choose_translation */}
          {currentStage?.type === "choose_translation" &&
            lockedAnswer !== null &&
            (() => {
              const opts = shuffledMap[stage] ?? currentStage.options ?? [];
              const correct = opts.find((o: any) => o.correct);
              const isRight = wrongAnswers.length === 0;
              return (
                <View
                  style={[
                    s.feedbackStrip,
                    {
                      backgroundColor: isRight
                        ? REVEAL_CORRECT_BG
                        : c.primary + "12",
                    },
                  ]}
                >
                  <Ionicons
                    name={isRight ? "checkmark-circle" : "close-circle"}
                    size={18}
                    color={isRight ? REVEAL_CORRECT_TEXT : c.primary}
                  />
                  <Text
                    style={[
                      s.feedbackStripText,
                      { color: isRight ? REVEAL_CORRECT_TEXT : c.primary },
                    ]}
                  >
                    {isRight ? (
                      "Nice — that's right."
                    ) : (
                      <>
                        The answer is{" "}
                        <Text style={{ fontWeight: "800" }}>
                          {correct?.arabic ?? ""}
                        </Text>
                        .
                      </>
                    )}
                  </Text>
                </View>
              );
            })()}

          {bar.type === "continue" && (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: c.primary }]}
              onPress={handleContinue}
              activeOpacity={0.87}
            >
              <Text style={s.actionBtnText}>Continue</Text>
            </TouchableOpacity>
          )}
          {bar.type === "check" &&
            (() => {
              const isSentenceBuild = currentStage?.type === "sentence_build";
              const sbCount = isSentenceBuild
                ? Array.isArray(currentStage.bank)
                  ? (currentStage.correct ?? []).length
                  : (currentStage.words ?? []).length
                : 0;
              const remaining = isSentenceBuild
                ? sbCount - buildSlots.length
                : 0;
              const label =
                isSentenceBuild && remaining > 0
                  ? `${remaining} more`
                  : "Check";
              return (
                <TouchableOpacity
                  style={[
                    s.actionBtn,
                    {
                      backgroundColor: bar.disabled ? "#efeeeb" : c.primary,
                      shadowOpacity: bar.disabled ? 0 : 0.28,
                    },
                  ]}
                  onPress={handleCheck}
                  disabled={bar.disabled}
                  activeOpacity={0.87}
                >
                  <Text
                    style={[
                      s.actionBtnText,
                      { color: bar.disabled ? "#bebbb1" : "#fff" },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })()}
          {bar.type === "mic" &&
            (() => {
              const micBg =
                bar.phase === "wrong"
                  ? "#46443f"
                  : bar.phase === "correct"
                    ? "#738ce6"
                    : "#fe4d01";
              const statusLabel =
                bar.phase === "recording"
                  ? "Listening…"
                  : bar.phase === "correct"
                    ? "Nicely said"
                    : bar.phase === "wrong"
                      ? "Try again"
                      : bar.phase === "scoring"
                        ? "Scoring…"
                        : "Tap to speak";
              const mkRingStyle = (v: Animated.Value) => ({
                position: "absolute" as const,
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: micBg,
                transform: [
                  {
                    scale: v.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.85, 1.4],
                    }),
                  },
                ],
                opacity: v.interpolate({
                  inputRange: [0, 0.2, 1],
                  outputRange: [0, 0.35, 0],
                }),
              });
              return (
                <View
                  style={{ alignItems: "center", gap: 12, paddingVertical: 8 }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      fontFamily: FONT_UI,
                      color: "#9d998e",
                      letterSpacing: 0.6,
                      textTransform: "uppercase" as any,
                    }}
                  >
                    {statusLabel}
                  </Text>
                  <View
                    style={{
                      position: "relative",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {bar.phase === "recording" && (
                      <>
                        <Animated.View style={mkRingStyle(micRing1)} />
                        <Animated.View style={mkRingStyle(micRing2)} />
                      </>
                    )}
                    <TouchableOpacity
                      style={[
                        s.micCircleBtn,
                        { backgroundColor: micBg, shadowColor: micBg },
                      ]}
                      onPress={handleMicPress}
                      disabled={bar.phase === "scoring"}
                      activeOpacity={0.87}
                    >
                      {bar.phase === "scoring" ? (
                        <ActivityIndicator color="#fff" size="large" />
                      ) : bar.phase === "correct" ? (
                        <Ionicons name="checkmark" size={38} color="#fff" />
                      ) : bar.phase === "wrong" ? (
                        <Ionicons name="refresh" size={28} color="#fff" />
                      ) : (
                        <Ionicons name="mic" size={38} color="#fff" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}
        </View>
      </View>
    );
  };

  // ── Main render ────────────────────────────────────────────────────────────
  const phaseInfo = currentStage?.type ? PHASE_LABELS[currentStage.type] : null;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}>
      <View style={s.centeredWrapper}>
        {/* Header — X circle · back arrow · progress bar · skip arrow · counter */}
        <View style={[s.header, { backgroundColor: c.background }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[s.headerCloseBtn, { backgroundColor: c.surface }]}
          >
            <Ionicons name="close" size={20} color={c.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={goPrevStage} style={s.headerArrowBtn}>
            <Ionicons name="chevron-back" size={18} color={c.label} />
          </TouchableOpacity>
          <View style={s.progressWrap}>
            <View style={[s.progressTrack, { backgroundColor: "#efeeeb" }]}>
              <View
                style={[
                  s.progressFill,
                  {
                    width: `${progress * 100}%` as any,
                    backgroundColor: c.primary,
                  },
                ]}
              />
            </View>
          </View>
          <TouchableOpacity onPress={goNextStage} style={s.headerArrowBtn}>
            <Ionicons name="chevron-forward" size={18} color={c.label} />
          </TouchableOpacity>
          <Text style={[s.stageCountText, { color: c.label }]}>
            {stage + 1}/{totalStages}
          </Text>
        </View>

        {/* Eyebrow label — orange uppercase, matches design */}
        {phaseInfo && <Text style={s.eyebrow}>{phaseInfo.label}</Text>}

        {/* Content */}
        <Animated.View style={{ flex: 1, opacity: stageOpacity }}>
          {currentStage?.type === "speak_the_blank" ? (
            renderSpeakTheBlank()
          ) : currentStage?.type === "subject" && currentStage?.allVocab ? (
            renderLessonIntro()
          ) : currentStage?.type === "subject" ? (
            renderSubject()
          ) : (
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={[
                s.content,
                { flexGrow: 1, paddingBottom: 24 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {currentStage?.type === "word_card" && renderWordCard()}
              {currentStage?.type === "micro_review" && renderMicroReview()}
              {currentStage?.type === "listen_repeat" && renderListenRepeat()}
              {currentStage?.type === "choose_translation" &&
                renderChooseTranslation()}
              {currentStage?.type === "write_translation" &&
                renderWriteTranslation()}
              {currentStage?.type === "match_pairs" && renderMatchPairs()}
              {currentStage?.type === "listen_choose" && renderListenChoose()}
              {currentStage?.type === "sentence_build" && renderSentenceBuild()}
              {currentStage?.type === "sentence_complete" &&
                renderSentenceComplete()}
              {currentStage?.type === "dialogue" && renderDialogue()}
              {currentStage?.type === "cultural_note" && renderCulturalNote()}
              {currentStage?.type === "shadowing" && renderShadowing()}
              {currentStage?.type === "listening_comprehension" &&
                renderListeningComprehension()}
              {currentStage?.type === "idiom_card" && renderIdiomCard()}
              {currentStage?.type === "mastery_check" && renderMasteryCheck()}
            </ScrollView>
          )}
        </Animated.View>

        {/* Feedback banner */}
        {feedbackVisible && (
          <Animated.View
            style={[
              s.feedbackBanner,
              {
                backgroundColor: feedbackCorrect ? c.right : c.wrong,
                transform: [{ translateY: feedbackAnim }],
              },
            ]}
          >
            <Ionicons
              name={feedbackCorrect ? "checkmark-circle" : "close-circle"}
              size={22}
              color="#fff"
            />
            <Text style={s.feedbackBannerText}>
              {feedbackCorrect
                ? "Correct! 🎉"
                : `Correct answer: ${feedbackCorrectForm}`}
            </Text>
          </Animated.View>
        )}

        {/* Action bar */}
        {renderActionBar()}
      </View>
    </SafeAreaView>
  );
}

// ── Sub-screens ───────────────────────────────────────────────────────────────
function LoadingScreen({ c }: any) {
  return (
    <SafeAreaView
      style={[
        s.safe,
        {
          backgroundColor: c.background,
          justifyContent: "center",
          alignItems: "center",
        },
      ]}
    >
      <ActivityIndicator size="large" color={c.primary} />
      <Text style={{ color: c.label, marginTop: 16, fontWeight: "500" }}>
        Loading lesson…
      </Text>
    </SafeAreaView>
  );
}

function ErrorScreen({ c, error, onBack }: any) {
  return (
    <SafeAreaView
      style={[
        s.safe,
        {
          backgroundColor: c.background,
          justifyContent: "center",
          alignItems: "center",
          padding: 32,
        },
      ]}
    >
      <Ionicons name="warning-outline" size={52} color={c.wrong} />
      <Text
        style={{
          color: c.text,
          fontSize: 18,
          fontWeight: "700",
          marginTop: 16,
          textAlign: "center",
        }}
      >
        {error || "Lesson unavailable"}
      </Text>
      <TouchableOpacity
        style={[
          s.actionBtn,
          { backgroundColor: c.primary, marginTop: 24, width: "100%" },
        ]}
        onPress={onBack}
      >
        <Text style={s.actionBtnText}>Go back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function CompleteScreen({ c, lesson, onHome, onNext }: any) {
  return (
    <SafeAreaView
      style={[
        s.safe,
        {
          backgroundColor: c.background,
          justifyContent: "center",
          alignItems: "center",
          padding: 32,
        },
      ]}
    >
      <View
        style={{
          width: 110,
          height: 110,
          borderRadius: 55,
          backgroundColor: c.primary + "15",
          borderWidth: 2,
          borderColor: c.primary + "25",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: c.primary,
          shadowOpacity: 0.2,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 20,
          elevation: 6,
        }}
      >
        <Ionicons name="sparkles" size={54} color={c.primary} />
      </View>
      <Text
        style={{
          color: c.text,
          fontSize: 38,
          fontWeight: "900",
          marginTop: 24,
          letterSpacing: -1,
          textAlign: "center",
        }}
      >
        Well done!
      </Text>
      <Text
        style={{
          color: c.label,
          fontSize: 17,
          marginTop: 8,
          textAlign: "center",
        }}
      >
        Lesson complete!
      </Text>
      {lesson?.topic && (
        <Text
          style={{
            color: c.label,
            fontSize: 14,
            marginTop: 4,
            fontStyle: "italic",
            textAlign: "center",
          }}
        >
          {lesson.topic}
        </Text>
      )}
      {lesson?.communicative_goal && (
        <Text
          style={{
            color: c.label,
            fontSize: 13,
            marginTop: 6,
            textAlign: "center",
            paddingHorizontal: 20,
          }}
        >
          {lesson.communicative_goal}
        </Text>
      )}
      <View
        style={{
          borderRadius: 24,
          backgroundColor: c.primary + "12",
          borderWidth: 1.5,
          borderColor: c.primary + "28",
          paddingHorizontal: 44,
          paddingVertical: 22,
          marginTop: 36,
          alignItems: "center",
          shadowColor: c.primary,
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 16,
          elevation: 4,
        }}
      >
        <Text style={{ color: c.primary, fontSize: 32, fontWeight: "900" }}>
          +{lesson?.xp_reward ?? 50} XP
        </Text>
        <Text
          style={{
            color: c.primary + "aa",
            fontSize: 13,
            fontWeight: "600",
            marginTop: 3,
          }}
        >
          points earned
        </Text>
      </View>
      {onNext && (
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: c.primary, marginTop: 40, alignSelf: 'stretch', flexDirection: 'row', gap: 8 }]}
          onPress={onNext}
          activeOpacity={0.87}
        >
          <Text style={s.actionBtnText}>Next lesson</Text>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[
          s.actionBtn,
          {
            backgroundColor: onNext ? c.surface : c.primary,
            borderWidth: onNext ? 1 : 0,
            borderColor: c.border,
            marginTop: onNext ? 12 : 40,
            alignSelf: "stretch",
            flexDirection: "row",
            gap: 8,
          },
        ]}
        onPress={onHome}
        activeOpacity={0.87}
      >
        <Ionicons name="home-outline" size={20} color={onNext ? c.label : "#fff"} />
        <Text style={[s.actionBtnText, onNext && { color: c.label }]}>Back to lessons</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ── StyleSheet ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1 },
  centeredWrapper: {
    flex: 1,
    maxWidth: 640,
    alignSelf: "center",
    width: "100%",
  },

  // Header — matches Claude Design LessonHeader
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 8,
  },
  headerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  headerArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  progressWrap: { flex: 1 },
  progressTrack: {
    height: 12,
    width: "100%",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 999 },
  stageCountText: {
    fontSize: 13,
    fontWeight: "600",
    minWidth: 28,
    textAlign: "right" as any,
  },

  // Eyebrow label — orange uppercase section label
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase" as any,
    color: "#fe4d01",
    textAlign: "center" as any,
    paddingVertical: 8,
  },

  // Content
  content: { paddingHorizontal: 24, paddingTop: 8 },
  stageWrap: { paddingTop: 8 },

  // Word card
  wordCardArabic: {
    fontSize: 60,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 6,
    paddingHorizontal: 12,
    alignSelf: "stretch",
  },
  freqBadge: {
    borderRadius: 50,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  freqBadgeText: { fontSize: 12, fontWeight: "700" },
  dialectNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginTop: 16,
    maxWidth: "90%",
  },
  dialectNoteText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    fontStyle: "italic",
  },

  // Micro review
  microReviewBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    marginBottom: 20,
  },

  // Audio
  audioInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginBottom: 24,
  },

  // Typography
  arabicMedium: {
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 44,
  },
  pronText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  hebrewText: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 28,
  },
  romanizText: {
    fontSize: 14,
    fontWeight: "500",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 2,
    letterSpacing: 0.1,
    alignSelf: "stretch",
  },
  hebrewHint: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 18,
  },
  micHint: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    fontWeight: "500",
  },

  // Choice grid
  choiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  choiceCard: {
    width: "47.5%",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1.5,
    shadowColor: "#a0846a",
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 3,
  },
  choiceCardIcon: {
    width: "100%",
    height: 118,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceCardLabel: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  choiceCardText: { fontSize: 13, fontWeight: "600", textAlign: "center" },

  // Write translation
  writeChip: {
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: 2,
    shadowColor: "#a0846a",
    shadowOpacity: 0.09,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  writeChipText: { fontSize: 28, fontWeight: "800", textAlign: "center" },

  // Match pairs (row-per-pair layout)
  matchCounter: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "500",
  },
  matchGrid: { flexDirection: "row", gap: 12 },
  matchCol: { flex: 1, gap: 10 },
  pairsContainer: { flexDirection: "column", gap: 10 },
  pairRow: { flexDirection: "row", gap: 10 },
  matchPairCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 70,
    shadowColor: "#a0846a",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  matchChipLeft: {
    borderRadius: 16,
    borderTopLeftRadius: 28,
    borderBottomLeftRadius: 28,
    borderWidth: 1.5,
    padding: 16,
    alignItems: "center",
    shadowColor: "#a0846a",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  matchChipRight: {
    borderRadius: 16,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    borderWidth: 1.5,
    padding: 16,
    alignItems: "center",
    shadowColor: "#a0846a",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  matchAr: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  matchHe: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 26,
  },

  // Word chips
  wordChoiceGrid: { gap: 12, marginTop: 4 },
  wordChip: {
    borderRadius: 22,
    borderWidth: 1.5,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#a0846a",
    shadowOpacity: 0.09,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  wordChipText: { fontSize: 26, fontWeight: "800", textAlign: "center" },

  // Sentence card
  sentenceCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 8,
    shadowColor: "#a0846a",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },

  // Letter blocks
  blocksWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  block: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 14,
    minWidth: 50,
    alignItems: "center",
    shadowColor: "#a0846a",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
  blockChar: { fontSize: 22, fontWeight: "700" },
  blockActions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    marginTop: 16,
  },
  deleteBtn: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 22,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtn: {
    borderRadius: 16,
    paddingHorizontal: 36,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Dialogue
  dialogueThread: { gap: 24 },
  npcWrap: { alignItems: "flex-start" },
  npcAvatarAnchor: { marginLeft: 20, marginBottom: -22, zIndex: 1 },
  npcBubble: {
    width: "90%",
    borderRadius: 22,
    borderTopLeftRadius: 6,
    borderWidth: 1,
    padding: 22,
    paddingTop: 32,
    shadowColor: "#a0846a",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 3,
  },
  userWrap: { alignItems: "flex-end" },
  userAvatarAnchor: {
    marginRight: 20,
    marginBottom: -22,
    zIndex: 1,
    alignSelf: "flex-end",
  },
  userBubble: {
    width: "90%",
    borderRadius: 22,
    borderTopRightRadius: 6,
    borderWidth: 1.5,
    padding: 22,
    paddingTop: 32,
    shadowColor: "#a0846a",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 2,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  dialogueName: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  dialogueArabic: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "right",
    lineHeight: 36,
    marginBottom: 4,
  },
  dialoguePron: { fontSize: 13, marginBottom: 4 },
  dialogueHebrew: { fontSize: 15, fontWeight: "500", lineHeight: 22 },
  replayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 12,
  },
  tapHint: { fontSize: 12 },
  blankField: {
    width: 72,
    height: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    marginHorizontal: 4,
  },
  arabicGapPill: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    alignItems: "center",
  },

  // Dialogue complete
  culturalNoteCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#a0846a",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 2,
  },
  culturalNote: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 4,
  },

  // Cultural note full
  culturalNoteIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  culturalNoteTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  culturalNoteBody: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#a0846a",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 2,
  },
  culturalNoteText: { fontSize: 16, lineHeight: 26, textAlign: "center" },
  culturalNoteAudio: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: "center",
  },
  culturalNoteAudioText: { fontSize: 14, fontWeight: "600" },

  // Listening comprehension
  lcQuestion: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 30,
  },
  lcOptionsList: { gap: 12 },
  lcOption: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: "#a0846a",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  lcOptionText: { fontSize: 17, flex: 1 },

  // Idiom card
  idiomArabic: {
    fontSize: 36,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 6,
    lineHeight: 52,
  },
  idiomMeaningCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    gap: 12,
    shadowColor: "#a0846a",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 2,
  },
  idiomMeaningRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  idiomMeaningLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  idiomMeaningText: { fontSize: 16, fontWeight: "600", lineHeight: 22 },
  idiomDivider: { height: 1 },

  // Listen repeat illustration card
  listenRepeatCard: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    marginBottom: 20,
    shadowColor: "#a0846a",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 2,
  },
  speakerBtnOverlay: { position: "absolute", top: 14, right: 14 },
  speakerBtnCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },

  // Choose translation
  chooseWordCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
    shadowColor: "#a0846a",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
    elevation: 3,
  },
  chooseArabicLarge: {
    fontSize: 42,
    fontWeight: "700",
    textAlign: "center",
  },
  chooseOptionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chooseOption: {
    flexBasis: "47.5%",
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    minHeight: 70,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#a0846a",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  chooseOptionText: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 24,
  },

  // Sentence build
  sbAnswerArea: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 16,
    minHeight: 110,
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    shadowColor: "#a0846a",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 1,
  },
  sbSlotDash: { minWidth: 64, height: 54, borderBottomWidth: 2, flexShrink: 0 },
  sbWordBlock: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    gap: 2,
  },
  sbWordAr: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 32,
    textAlign: "center",
  },
  sbWordTr: {
    fontSize: 11,
    fontWeight: "500",
    fontStyle: "italic",
    textAlign: "center",
  },
  sbPracticeStrip: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },

  // Feedback strip (inline, inside action bar, for choose_translation)
  feedbackStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  feedbackStripText: { fontSize: 14, fontWeight: "600", flex: 1 },

  // Action bar
  actionBar: {
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 8,
  },
  actionBtn: {
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#fe4d01",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 22,
    elevation: 6,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  micActionBtn: {
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 8,
  },
  micActionLabel: { color: "#fff", fontSize: 16, fontWeight: "700" },
  // 96px circle mic — design-spec, replaces wide pill for listen_repeat/dialogue/speak_the_blank
  micCircleBtn: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.32,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 22,
    elevation: 8,
  },

  // Match pairs translit line
  matchTr: {
    fontSize: 11,
    fontStyle: "italic",
    fontWeight: "500",
    textAlign: "center",
    marginTop: 2,
  },

  // Dialogue bubbles (design-spec)
  dlgBubbleThem: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#efeeeb",
    borderRadius: 20,
    borderTopLeftRadius: 6,
    padding: 12,
    paddingLeft: 14,
    paddingRight: 16,
    shadowColor: "#151515",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    elevation: 2,
  },
  dlgBubbleYouDone: {
    backgroundColor: "#fe4d01",
    borderRadius: 20,
    borderTopRightRadius: 6,
    padding: 12,
    paddingLeft: 16,
    paddingRight: 14,
    shadowColor: "#fe4d01",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 4,
  },
  dlgBubbleYouGhost: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(254,77,1,0.45)",
    borderRadius: 20,
    borderTopRightRadius: 6,
    padding: 12,
    paddingLeft: 16,
    paddingRight: 14,
  },

  // Feedback banner
  feedbackBanner: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    padding: 16,
    zIndex: 100,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 10,
  },
  feedbackBannerText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },

  // Input pill
  inputPill: {
    borderRadius: 50,
    borderWidth: 2,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 16,
    marginBottom: 6,
    alignItems: "center",
    minWidth: 160,
    alignSelf: "center",
  },
  inputPillText: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  inputPillPlaceholder: { fontSize: 20, letterSpacing: 8 },
});
