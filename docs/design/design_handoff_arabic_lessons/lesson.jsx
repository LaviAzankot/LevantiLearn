// Listen-and-repeat lesson screen
// Tweakable: layout, accent, dark, transliteration, mic style

const PHRASE = {
  arabic: "السَّلامُ عَلَيْكُم",
  translit: "as-salāmu ʿalaykum",
  english: "Peace be upon you",
  context: "A common greeting, used any time of day.",
};

const TOTAL_STEPS = 7;
const CURRENT_STEP = 3;

// ---------- icons (simple geometric, no hand-drawn complexity) ----------
const Icon = {
  Close: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round">
      <path d="M6 6 L18 18 M18 6 L6 18" />
    </svg>
  ),
  Hint: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 0 0-4 10.5c.8.7 1 1.3 1 2.5h6c0-1.2.2-1.8 1-2.5A6 6 0 0 0 12 3Z" />
    </svg>
  ),
  Skip: ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4l10 8-10 8z" fill={color} />
      <path d="M19 4v16" />
    </svg>
  ),
  Mic: ({ size = 36, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="12" rx="3" fill={color} stroke="none" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  ),
  Speaker: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9h3l5-4v14l-5-4H4z" fill={color} stroke={color} />
      <path d="M16 8a5 5 0 0 1 0 8" />
      <path d="M19 5a9 9 0 0 1 0 14" />
    </svg>
  ),
  Back: ({ size = 18, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  ),
  Check: ({ size = 28, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l5 5 9-11" />
    </svg>
  ),
  Retry: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  ),
};

// ---------- Image placeholder (per system prompt: striped + monospace caption) ----------
function IllustrationPlaceholder({ tone, label = "flat illustration", className = "", style = {} }) {
  const stripeColor = tone === "dark" ? "rgba(255,255,255,0.05)" : "rgba(21,21,21,0.05)";
  const stripeBg = tone === "dark" ? "#1f1d1a" : "#efeeeb";
  return (
    <div
      className={className}
      style={{
        background: `repeating-linear-gradient(135deg, ${stripeBg} 0 14px, ${stripeColor} 14px 15px)`,
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* simple geometric centerpiece — two figures suggested by circles + arches */}
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 24,
      }}>
        <FigureGlyph tone={tone} hue="warm" />
        <FigureGlyph tone={tone} hue="cool" />
      </div>
      <div style={{
        position: "absolute", left: 16, bottom: 12,
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 11, letterSpacing: 0.3,
        color: tone === "dark" ? "rgba(255,255,255,0.5)" : "rgba(21,21,21,0.45)",
      }}>
        [ {label} ]
      </div>
    </div>
  );
}

function FigureGlyph({ tone, hue }) {
  const fill = hue === "warm"
    ? (tone === "dark" ? "#fe4d01" : "#fe4d01")
    : (tone === "dark" ? "#738ce6" : "#738ce6");
  const skin = tone === "dark" ? "#46443f" : "#bebbb1";
  return (
    <svg width="120" height="160" viewBox="0 0 120 160" style={{ filter: tone === "dark" ? "" : "" }}>
      {/* body — arch */}
      <path d="M20 160 Q20 70 60 70 Q100 70 100 160 Z" fill={fill} opacity="0.92" />
      {/* head */}
      <circle cx="60" cy="46" r="26" fill={skin} />
    </svg>
  );
}

// ---------- Mic Button ----------
function MicButton({ state, onClick, accent, micStyle, tone }) {
  // states: idle | listening | success | retry
  const isListening = state === "listening";
  const isSuccess = state === "success";
  const isRetry = state === "retry";

  // Success uses the same accent (orange) as the idle mic; retry uses neutral dark.
  const bg = isRetry ? "#46443f" : accent;
  const fg = "#ffffff";

  let content;
  if (isSuccess) content = <Icon.Check color={fg} />;
  else if (isRetry) content = <Icon.Retry color={fg} />;
  else content = <Icon.Mic color={fg} size={micStyle === "compact" ? 30 : 38} />;

  const size = micStyle === "compact" ? 72 : 96;

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      {/* pulsing rings when listening */}
      {isListening && (
        <>
          <span className="mic-ring" style={{ background: bg, width: size + 32, height: size + 32 }} />
          <span className="mic-ring mic-ring-2" style={{ background: bg, width: size + 32, height: size + 32 }} />
        </>
      )}
      <button
        onClick={onClick}
        aria-label={isListening ? "Listening" : "Tap to speak"}
        style={{
          width: size, height: size, borderRadius: size / 2,
          background: bg, color: fg,
          border: "none", cursor: "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          boxShadow: isListening
            ? `0 12px 30px ${bg}55, 0 0 0 6px ${bg}22`
            : `0 8px 22px rgba(254,77,1,0.32), 0 2px 6px rgba(0,0,0,0.08)`,
          transition: "transform 160ms ease, box-shadow 220ms ease, background 220ms ease",
          transform: isListening ? "scale(1.04)" : "scale(1)",
          position: "relative", zIndex: 2,
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = isListening ? "scale(1.04)" : "scale(1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = isListening ? "scale(1.04)" : "scale(1)")}
      >
        {content}
      </button>
    </div>
  );
}

// ---------- Listening waveform (CSS only, decorative) ----------
function Waveform({ active, color }) {
  const bars = 24;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 4, height: 28,
      opacity: active ? 1 : 0.35,
      transition: "opacity 200ms ease",
    }}>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={active ? "wf-bar wf-bar-active" : "wf-bar"}
          style={{
            background: color,
            width: 3, borderRadius: 3,
            animationDelay: `${(i % 8) * 80}ms`,
            height: active ? undefined : 6,
          }}
        />
      ))}
    </div>
  );
}

// ---------- Header (close + back + progress + skip) ----------
function LessonHeader({ tone, onClose, onBack, onSkip, step = CURRENT_STEP, total = TOTAL_STEPS }) {
  const trackBg = tone === "dark" ? "rgba(255,255,255,0.10)" : "#efeeeb";
  const fillBg = "#fe4d01";
  const fg = tone === "dark" ? "#faf9f6" : "#151515";
  const muted = tone === "dark" ? "#9d998e" : "#9d998e";

  const ArrowBtn = ({ direction, onClick, ariaLabel }) => (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: 28, height: 28, borderRadius: 14, border: "none",
        background: "transparent",
        color: muted,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0,
        padding: 0,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {direction === "left" ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
      </svg>
    </button>
  );

  const pct = (step / total) * 100;
  return (
    <div style={{ padding: "14px 20px 8px", display: "flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={onClose}
        aria-label="Close lesson"
        style={{
          width: 36, height: 36, borderRadius: 18, border: "none",
          background: tone === "dark" ? "rgba(255,255,255,0.06)" : "#efeeeb",
          color: fg, display: "inline-flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0, marginRight: 6,
        }}
      >
        <Icon.Close />
      </button>
      <ArrowBtn direction="left" onClick={onBack} ariaLabel="Previous step" />
      <div style={{ flex: 1, height: 12, background: trackBg, borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, background: fillBg,
          borderRadius: 999, transition: "width 400ms ease",
          boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.08)",
        }} />
      </div>
      <ArrowBtn direction="right" onClick={onSkip} ariaLabel="Skip step" />
      <span style={{
        fontSize: 13, fontWeight: 600, color: muted,
        fontVariantNumeric: "tabular-nums",
        minWidth: 28, textAlign: "right",
      }}>{step}/{total}</span>
    </div>
  );
}

// ---------- Speaker button (lives on top-right of the image) ----------
function SpeakerButton({ onClick, playing, tone, onImage = true }) {
  // onImage = true: high-contrast white pill that floats on top of the illustration
  // onImage = false: subtle pill, used if image is absent (not needed currently)
  const bg = playing ? "#fe4d01" : "#ffffff";
  const color = playing ? "#ffffff" : "#fe4d01";
  return (
    <button
      onClick={onClick}
      aria-label="Play audio"
      style={{
        width: 44, height: 44, borderRadius: 22,
        background: bg, color,
        border: "none",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0,
        boxShadow: playing
          ? "0 8px 22px rgba(254,77,1,0.35), 0 2px 6px rgba(21,21,21,0.10)"
          : "0 4px 14px rgba(21,21,21,0.10), 0 1px 3px rgba(21,21,21,0.08)",
        transition: "all 220ms ease",
        transform: playing ? "scale(1.04)" : "scale(1)",
      }}
    >
      <Icon.Speaker color="currentColor" size={20} />
    </button>
  );
}

// ---------- Phrase block ----------
function PhraseBlock({ tone, showTranslit, align = "center", scale = 1 }) {
  const fg = tone === "dark" ? "#faf9f6" : "#151515";
  const muted = tone === "dark" ? "#bebbb1" : "#9d998e";
  const subtle = tone === "dark" ? "#9d998e" : "#9d998e";

  return (
    <div style={{ textAlign: align, display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start", gap: 14 }}>
      <div
        dir="rtl"
        lang="ar"
        style={{
          fontFamily: "'Reem Kufi', 'Noto Naskh Arabic', sans-serif",
          fontSize: 44 * scale,
          fontWeight: 600,
          color: fg,
          letterSpacing: 0,
          lineHeight: 1.7,
          paddingBottom: 4,
          width: "100%",
          textAlign: "center",
        }}
      >
        {PHRASE.arabic}
      </div>

      {showTranslit && (
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontStyle: "italic",
          fontSize: 17, color: subtle, fontWeight: 500,
          letterSpacing: 0.1,
          lineHeight: 1.4,
        }}>
          {PHRASE.translit}
        </div>
      )}

      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 18, color: muted, fontWeight: 500,
        lineHeight: 1.4,
      }}>
        “{PHRASE.english}”
      </div>
    </div>
  );
}

// ---------- Status text ----------
function StatusText({ state, tone }) {
  const fg = tone === "dark" ? "#faf9f6" : "#151515";
  const muted = tone === "dark" ? "#bebbb1" : "#9d998e";

  let label = "Tap to speak";
  let sub = "Repeat the phrase out loud";
  let color = fg;

  if (state === "listening") {
    label = "Listening…";
    sub = "Speak clearly into the mic";
    color = "#fe4d01";
  } else if (state === "success") {
    label = "Nicely said";
    sub = "Tap to continue";
    color = "#738ce6";
  } else if (state === "retry") {
    label = "Try again";
    sub = "Listen once more, then repeat";
    color = "#46443f";
  }

  return (
    <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 700, fontSize: 17, color, letterSpacing: 0.1,
      }}>{label}</div>
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 500, fontSize: 13, color: muted,
      }}>{sub}</div>
    </div>
  );
}

// ---------- Hint pill (used at bottom, left of mic) ----------
function HintPill({ tone, onClick }) {
  const fg = tone === "dark" ? "#faf9f6" : "#46443f";
  const bg = tone === "dark" ? "rgba(255,255,255,0.06)" : "#ffffff";
  const border = tone === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid #efeeeb";
  return (
    <button
      onClick={onClick}
      aria-label="Hint"
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: "12px 18px", borderRadius: 999,
        background: bg, color: fg, border,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 600, fontSize: 14, letterSpacing: 0.1,
        cursor: "pointer", flexShrink: 0,
        boxShadow: "0 2px 6px rgba(21,21,21,0.05)",
      }}
    >
      <Icon.Hint size={18} />
      Hint
    </button>
  );
}

// ---------- LAYOUTS ----------

// Layout A: Stacked — closest to sketch. Image card top, phrase middle, mic bottom.
function LayoutStacked({ tweaks, micState, audioPlaying, setMicState, setAudioPlaying }) {
  const { tone, accent, showTranslit, micStyle } = tweaks;
  const playAudio = () => {
    setAudioPlaying(true);
    setTimeout(() => setAudioPlaying(false), 1400);
  };
  return (
    <>
      <LessonHeader tone={tone} onClose={() => {}} onBack={() => {}} onSkip={() => {}} />
      <div style={{ padding: "8px 24px 0", flex: 1, display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          textAlign: "center", marginTop: 6,
          fontSize: 13, fontWeight: 700, letterSpacing: 1.6,
          textTransform: "uppercase",
          color: "#fe4d01",
        }}>
          Listen and Repeat
        </div>
        <div style={{ position: "relative" }}>
          <IllustrationPlaceholder
            tone={tone}
            label="greeting scene"
            style={{
              width: "100%", aspectRatio: "1 / 1", maxHeight: 320,
              borderRadius: 32,
              border: tone === "dark" ? "1px solid rgba(255,255,255,0.06)" : "1px solid #efeeeb",
            }}
          />
          <div style={{ position: "absolute", top: 14, right: 14 }}>
            <SpeakerButton onClick={playAudio} playing={audioPlaying} tone={tone} />
          </div>
        </div>
        <PhraseBlock
          tone={tone}
          showTranslit={showTranslit}
        />
      </div>
      <BottomBar
        tone={tone}
        micState={micState}
        setMicState={setMicState}
        accent={accent}
        micStyle={micStyle}
      />
    </>
  );
}

// Layout B: Card — phrase + image inside one floating card; mic below
function LayoutCard({ tweaks, micState, audioPlaying, setMicState, setAudioPlaying }) {
  const { tone, accent, showTranslit, micStyle } = tweaks;
  const cardBg = tone === "dark" ? "#1f1d1a" : "#ffffff";
  const border = tone === "dark" ? "1px solid rgba(255,255,255,0.06)" : "1px solid #efeeeb";
  const playAudio = () => {
    setAudioPlaying(true);
    setTimeout(() => setAudioPlaying(false), 1400);
  };

  return (
    <>
      <LessonHeader tone={tone} onClose={() => {}} onBack={() => {}} onSkip={() => {}} />
      <div style={{ padding: "12px 24px 0", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          textAlign: "center",
          fontSize: 13, fontWeight: 700, letterSpacing: 1.6,
          textTransform: "uppercase",
          color: "#fe4d01",
        }}>
          Listen and Repeat
        </div>
        <div style={{
          background: cardBg, borderRadius: 28, padding: 18, border,
          boxShadow: tone === "dark" ? "none" : "0 12px 40px rgba(21,21,21,0.06), 0 2px 8px rgba(21,21,21,0.03)",
          display: "flex", flexDirection: "column", gap: 22,
        }}>
          <div style={{ position: "relative" }}>
            <IllustrationPlaceholder
              tone={tone}
              label="greeting scene"
              style={{
                width: "100%", aspectRatio: "16 / 11",
                borderRadius: 18,
              }}
            />
            <div style={{ position: "absolute", top: 12, right: 12 }}>
              <SpeakerButton onClick={playAudio} playing={audioPlaying} tone={tone} />
            </div>
          </div>
          <div style={{ paddingBottom: 6 }}>
            <PhraseBlock
              tone={tone}
              showTranslit={showTranslit}
            />
          </div>
        </div>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          textAlign: "center", fontSize: 13, color: tone === "dark" ? "#9d998e" : "#9d998e", fontWeight: 500,
        }}>
          {PHRASE.context}
        </div>
      </div>
      <BottomBar
        tone={tone}
        micState={micState}
        setMicState={setMicState}
        accent={accent}
        micStyle={micStyle}
      />
    </>
  );
}

// Layout C: Bold — full-bleed image up top, sheet drawer with phrase + mic
function LayoutBold({ tweaks, micState, audioPlaying, setMicState, setAudioPlaying }) {
  const { tone, accent, showTranslit, micStyle } = tweaks;
  const sheetBg = tone === "dark" ? "#1f1d1a" : "#faf9f6";
  const playAudio = () => {
    setAudioPlaying(true);
    setTimeout(() => setAudioPlaying(false), 1400);
  };
  return (
    <>
      <div style={{ position: "relative", width: "100%", height: "44%", flexShrink: 0 }}>
        <IllustrationPlaceholder
          tone={tone}
          label="greeting scene"
          style={{ width: "100%", height: "100%" }}
        />
        <div style={{ position: "absolute", inset: 0, padding: "14px 20px 0" }}>
          <LessonHeader tone="dark" onClose={() => {}} onBack={() => {}} onSkip={() => {}} />
        </div>
        <div style={{ position: "absolute", top: 64, right: 20 }}>
          <SpeakerButton onClick={playAudio} playing={audioPlaying} tone={tone} />
        </div>
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: -1, height: 32,
          background: sheetBg,
          borderRadius: "32px 32px 0 0",
        }} />
      </div>
      <div style={{
        flex: 1, padding: "8px 24px 0", display: "flex", flexDirection: "column", gap: 24,
        background: sheetBg,
      }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          textAlign: "center",
          fontSize: 13, fontWeight: 700, letterSpacing: 1.6,
          textTransform: "uppercase",
          color: "#fe4d01",
        }}>
          Listen and Repeat
        </div>
        <PhraseBlock
          tone={tone}
          showTranslit={showTranslit}
          scale={0.95}
        />
      </div>
      <BottomBar
        tone={tone}
        micState={micState}
        setMicState={setMicState}
        accent={accent}
        micStyle={micStyle}
      />
    </>
  );
}

// ---------- Bottom bar (mic + status + footer) ----------
function BottomBar({ tone, micState, setMicState, accent, micStyle }) {
  const handleMicPress = () => {
    if (micState === "idle") {
      setMicState("listening");
      // simulate 2s of listening, then random success/retry
      setTimeout(() => {
        setMicState(Math.random() < 0.7 ? "success" : "retry");
      }, 2000);
    } else if (micState === "success" || micState === "retry") {
      setMicState("idle");
    } else {
      // listening — let user cancel
      setMicState("idle");
    }
  };

  return (
    <div style={{
      padding: "40px 24px 40px",
      display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18,
      flexShrink: 0,
    }}>
      <MicButton
        state={micState}
        onClick={handleMicPress}
        accent={accent}
        micStyle={micStyle}
        tone={tone}
      />
    </div>
  );
}

// ---------- Root App ----------
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "layout": "stacked",
  "dark": false,
  "showTranslit": true,
  "micStyle": "large",
  "accent": "#fe4d01"
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const tone = tweaks.dark ? "dark" : "light";

  const [micState, setMicState] = React.useState("idle");
  const [audioPlaying, setAudioPlaying] = React.useState(false);

  const t = { ...tweaks, tone };

  const bg = tone === "dark" ? "#151515" : "#faf9f6";
  const fg = tone === "dark" ? "#faf9f6" : "#151515";

  let LayoutComp = LayoutStacked;
  if (tweaks.layout === "card") LayoutComp = LayoutCard;
  if (tweaks.layout === "bold") LayoutComp = LayoutBold;

  return (
    <>
      <div style={{
        position: "fixed", inset: 0,
        background: tone === "dark" ? "#0d0d0d" : "#efeeeb",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}>
        {/* phone screen — fixed mobile-ish frame, full bleed (no bezel) */}
        <div
          data-screen-label="01 Listen & Repeat"
          style={{
            width: 412, height: 880, maxHeight: "calc(100vh - 48px)",
            background: bg, color: fg,
            borderRadius: 36, overflow: "hidden",
            display: "flex", flexDirection: "column",
            boxShadow: "0 30px 80px rgba(21,21,21,0.18), 0 8px 20px rgba(21,21,21,0.08)",
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            position: "relative",
          }}
        >
          <LayoutComp
            tweaks={t}
            micState={micState}
            audioPlaying={audioPlaying}
            setMicState={setMicState}
            setAudioPlaying={setAudioPlaying}
          />
        </div>
      </div>

      <window.TweaksPanel title="Tweaks">
        <window.TweakSection title="Layout">
          <window.TweakRadio
            label="Variation"
            value={tweaks.layout}
            onChange={(v) => setTweak("layout", v)}
            options={[
              { value: "stacked", label: "Stacked" },
              { value: "card", label: "Card" },
              { value: "bold", label: "Bold (full-bleed)" },
            ]}
          />
        </window.TweakSection>
        <window.TweakSection title="Appearance">
          <window.TweakToggle
            label="Dark mode"
            value={tweaks.dark}
            onChange={(v) => setTweak("dark", v)}
          />
          <window.TweakToggle
            label="Show transliteration"
            value={tweaks.showTranslit}
            onChange={(v) => setTweak("showTranslit", v)}
          />
        </window.TweakSection>
        <window.TweakSection title="Mic button">
          <window.TweakRadio
            label="Size"
            value={tweaks.micStyle}
            onChange={(v) => setTweak("micStyle", v)}
            options={[
              { value: "large", label: "Large" },
              { value: "compact", label: "Compact" },
            ]}
          />
        </window.TweakSection>
      </window.TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
