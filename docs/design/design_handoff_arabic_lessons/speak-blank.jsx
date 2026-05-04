// Speak the Blank — calmer, focused redesign.
// Replaces the chat-bubble vocabulary with a single-focus "exercise card":
//   PROMPT (partner says…)  →  YOUR LINE (with the blank)  →  MIC
// One accent color, one font scale per role, generous whitespace.

const ROUNDS = [
  {
    id: "r1",
    context: "Greeting your neighbour Layla on the way out in the morning.",
    prompt: {
      arabic: "صَبَاحُ الخَيْر يَا سَارَة!",
      translit: "ṣabāḥu l-khayr yā Sāra",
      english: "Good morning, Sara!",
    },
    answer: {
      arabic: "صَبَاحُ ___",
      translit: "ṣabāḥu ___",
      english: "Good morning of ___.",
      blank: { arabic: "النُّور", translit: "an-nūr", english: "light" },
    },
  },
  {
    id: "r2",
    context: "Layla asks how you are doing today.",
    prompt: {
      arabic: "كَيْفَ حَالُكِ اليَوْم؟",
      translit: "kayfa ḥāluki l-yawm",
      english: "How are you today?",
    },
    answer: {
      arabic: "أَنَا ___ ، شُكْرًا.",
      translit: "anā ___, shukran",
      english: "I am ___, thank you.",
      blank: { arabic: "بِخَيْر", translit: "bi-khayr", english: "fine" },
    },
  },
  {
    id: "r3",
    context: "At the café, Layla asks what you'd like.",
    prompt: {
      arabic: "مَاذَا تُرِيدِين؟",
      translit: "māthā turīdīn",
      english: "What would you like?",
    },
    answer: {
      arabic: "أُرِيدُ ___ مِنْ فَضْلِك.",
      translit: "urīdu ___ min faḍlik",
      english: "I would like ___, please.",
      blank: { arabic: "قَهْوَة", translit: "qahwa", english: "coffee" },
    },
  },
];

// ---------- Tokens ----------
const C = {
  ink: "#151515",
  inkSoft: "#46443f",
  muted: "#9d998e",
  muted2: "#b9b5ab",
  hair: "#ece9e2",
  surface: "#faf9f6",
  card: "#ffffff",
  accent: "#fe4d01",
  accentDeep: "#b53700",
  accentWash: "#fff7f1",
};

// ---------- Tiny speaker glyph (no chrome around it) ----------
function SpeakerGlyph({ playing, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round"
         style={{
           opacity: playing ? 1 : 0.7,
           transition: "opacity 200ms ease",
         }}>
      <path d="M11 5L6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none" />
      {playing && <path d="M16 9a4 4 0 0 1 0 6" />}
      {playing && <path d="M19 6a8 8 0 0 1 0 12" />}
    </svg>
  );
}

// ---------- Blank rectangle ----------
// Single warm-orange border, with a thicker bottom edge to read as a "write here" line.
// On reveal/success, it dissolves and the Arabic answer takes its place — same orange,
// same underline, no recoloring of the surrounding card.
function BlankRect({ state, revealed, success, blank, fontSize = 28 }) {
  const filled = revealed || success;

  if (filled) {
    return (
      <span dir="rtl" lang="ar"
            style={{
              display: "inline-block",
              color: C.ink,
              fontFamily: "'Reem Kufi', sans-serif",
              fontSize, fontWeight: 600,
              padding: "2px 12px",
              margin: "0 4px",
              background: "#f5f2ea",
              border: "1px solid #ffffff",
              borderRadius: 8,
              animation: "fade-in 240ms ease",
            }}>
        {blank.arabic}
      </span>
    );
  }

  const isListening = state === "listening";
  const isRetry = state === "retry";

  let borderColor = "#ffffff";
  let bg = "#f5f2ea"; // brighter warm fill
  if (isListening) {
    bg = C.accentWash;
    borderColor = "#ffffff";
  } else if (isRetry) {
    bg = "#ece8df";
    borderColor = "#ffffff";
  }

  return (
    <span
      className={isListening ? "sb-blank-pulse" : ""}
      style={{
        display: "inline-block",
        minWidth: 110, height: fontSize + 14,
        margin: "0 6px",
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        verticalAlign: "middle",
        transition: "all 220ms ease",
      }}
    />
  );
}

function BlankRectMini({ state, revealed, success, blank }) {
  const filled = revealed || success;
  if (filled) {
    return (
      <span style={{
        color: C.ink, fontStyle: "italic", fontWeight: 700,
        padding: "0 4px",
        animation: "fade-in 240ms ease",
      }}>
        {blank.translit}
      </span>
    );
  }
  const isListening = state === "listening";
  const isRetry = state === "retry";
  const color = "#ffffff";
  const bg = isListening ? C.accentWash : "#f5f2ea";
  return (
    <span style={{
      display: "inline-block",
      minWidth: 60, height: 14,
      background: bg,
      border: `1px solid ${color}`,
      borderRadius: 4,
      verticalAlign: "middle",
      margin: "0 4px",
      transition: "all 220ms ease",
    }} />
  );
}

// ---------- Prompt (what they say) ----------
function PromptCard({ line, playing, onPlay }) {
  return (
    <button
      onClick={onPlay}
      aria-label="Play prompt"
      style={{
        appearance: "none", background: "transparent", border: "none",
        textAlign: "right", cursor: "pointer",
        padding: "4px 0",
        font: "inherit", color: "inherit",
        display: "flex", flexDirection: "column", alignItems: "stretch", gap: 6,
        width: "100%",
      }}
    >
      {/* eyebrow row: speaker name + tiny audio glyph */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        color: playing ? C.accent : C.muted,
        transition: "color 200ms ease",
      }}>
        <span style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 12, fontWeight: 700,
          letterSpacing: 1.4, textTransform: "uppercase",
        }}>
          Layla
        </span>
        <SpeakerGlyph playing={playing} size={16} />
      </div>

      <div dir="rtl" lang="ar" style={{
        fontFamily: "'Reem Kufi', sans-serif",
        fontSize: 30, fontWeight: 600,
        color: C.ink,
        lineHeight: 1.55,
        textAlign: "right",
      }}>
        {line.arabic}
      </div>
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontStyle: "italic",
        fontSize: 14, color: C.muted, fontWeight: 500,
        textAlign: "right",
      }}>
        {line.translit}
      </div>
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 14, color: C.muted, fontWeight: 500,
        textAlign: "right",
      }}>
        {line.english}
      </div>
    </button>
  );
}

// ---------- Answer (your line, with the blank) ----------
function AnswerCard({ line, micState, blankRevealed }) {
  const success = micState === "success";

  // Arabic
  const renderArabic = () => {
    const parts = line.arabic.split("___");
    return (
      <span dir="rtl">
        {parts.map((p, i) => (
          <React.Fragment key={i}>
            <span>{p}</span>
            {i < parts.length - 1 && (
              <BlankRect state={micState} revealed={blankRevealed} success={success} blank={line.blank} />
            )}
          </React.Fragment>
        ))}
      </span>
    );
  };

  const renderTranslit = () => {
    const parts = line.translit.split("___");
    return parts.map((p, i) => (
      <React.Fragment key={i}>
        <span>{p}</span>
        {i < parts.length - 1 && (
          <BlankRectMini state={micState} revealed={blankRevealed} success={success} blank={line.blank} />
        )}
      </React.Fragment>
    ));
  };

  // English with target word always highlighted
  const renderEnglish = () => {
    const word = line.blank.english;
    const parts = line.english.split("___");
    return parts.map((p, i) => (
      <React.Fragment key={i}>
        <span>{p}</span>
        {i < parts.length - 1 && (
          <span style={{
            color: C.accent, fontWeight: 700,
            padding: "0 1px",
          }}>
            {word}
          </span>
        )}
      </React.Fragment>
    ));
  };

  return (
    <div style={{
      background: C.card,
      borderRadius: 24,
      border: `1px solid ${C.hair}`,
      padding: "26px 24px 24px",
      boxShadow: "0 1px 2px rgba(21,21,21,0.04), 0 8px 24px rgba(21,21,21,0.04)",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 12, fontWeight: 700,
        letterSpacing: 1.4, textTransform: "uppercase",
        color: C.accent,
      }}>
        Your reply
      </div>

      <div dir="rtl" lang="ar" style={{
        fontFamily: "'Reem Kufi', sans-serif",
        fontSize: 28, fontWeight: 600,
        color: C.ink,
        lineHeight: 1.7,
        textAlign: "right",
      }}>
        {renderArabic()}
      </div>
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontStyle: "italic",
        fontSize: 14, color: C.muted, fontWeight: 500,
        textAlign: "right",
        marginTop: 2,
      }}>
        {renderTranslit()}
      </div>
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 14, color: C.inkSoft, fontWeight: 500,
        textAlign: "right",
        marginTop: 2,
      }}>
        {renderEnglish()}
      </div>
    </div>
  );
}

// ---------- App ----------
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "showContext": true
}/*EDITMODE-END*/;

function SpeakBlankApp() {
  const [tweaks, setTweak] = window.useTweaks
    ? window.useTweaks(TWEAK_DEFAULTS)
    : [TWEAK_DEFAULTS, () => {}];

  const [roundIdx, setRoundIdx] = React.useState(0);
  const [micState, setMicState] = React.useState("idle");
  const [promptPlaying, setPromptPlaying] = React.useState(false);
  const [blankRevealed, setBlankRevealed] = React.useState(false);
  const [completed, setCompleted] = React.useState(false);

  const round = ROUNDS[roundIdx];

  // Reset per-round
  React.useEffect(() => {
    setMicState("idle");
    setPromptPlaying(false);
    setBlankRevealed(false);
  }, [roundIdx]);

  // Auto-play prompt on round entry
  React.useEffect(() => {
    if (completed) return;
    const t = setTimeout(() => {
      setPromptPlaying(true);
      setTimeout(() => setPromptPlaying(false), 1300);
    }, 450);
    return () => clearTimeout(t);
  }, [roundIdx, completed]);

  const playPrompt = () => {
    setPromptPlaying(true);
    setTimeout(() => setPromptPlaying(false), 1200);
  };

  const handleMic = () => {
    if (micState === "idle" || micState === "retry") {
      setMicState("listening");
      setTimeout(() => {
        const ok = Math.random() < 0.75;
        setMicState(ok ? "success" : "retry");
        if (ok) {
          setTimeout(() => {
            if (roundIdx + 1 >= ROUNDS.length) setCompleted(true);
            else setRoundIdx((i) => i + 1);
          }, 1100);
        }
      }, 1800);
    } else if (micState === "listening") {
      setMicState("idle");
    }
  };

  const reset = () => {
    setRoundIdx(0);
    setMicState("idle");
    setPromptPlaying(false);
    setBlankRevealed(false);
    setCompleted(false);
  };

  // ---------- Completion ----------
  if (completed) {
    return (
      <window.PhoneFrame tone="light" label="01 Speak the Blank">
        <window.LessonHeader
          tone="light" onClose={() => {}} onBack={() => {}} onSkip={() => {}}
          step={ROUNDS.length} total={ROUNDS.length}
        />
        <div style={{
          flex: 1, padding: "32px 32px 0",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 20,
        }}>
          <div style={{
            width: 84, height: 84, borderRadius: 42,
            background: C.accentWash, color: C.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `inset 0 0 0 1px ${C.hair}`,
          }}>
            <window.Icon.Check size={40} color={C.accent} />
          </div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 28, fontWeight: 800, color: C.ink,
            letterSpacing: -0.4, textAlign: "center",
          }}>
            Conversation done
          </div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 15, fontWeight: 500, color: C.muted,
            textAlign: "center", maxWidth: 280, lineHeight: 1.5,
          }}>
            You spoke {ROUNDS.length} replies in context.
          </div>
        </div>
        <div style={{
          padding: "24px 24px 36px",
          display: "flex", justifyContent: "center", flexShrink: 0,
        }}>
          <button
            onClick={reset}
            style={{
              padding: "16px 36px", borderRadius: 999,
              background: C.accent, color: "#ffffff", border: "none",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700, fontSize: 16, letterSpacing: 0.2,
              cursor: "pointer",
              boxShadow: "0 8px 22px rgba(254,77,1,0.32)",
            }}
          >
            Continue
          </button>
        </div>
      </window.PhoneFrame>
    );
  }

  // ---------- Status copy ----------
  const status =
    micState === "listening" ? "Listening…" :
    micState === "retry"     ? "Try again — speak clearly" :
    micState === "success"   ? "Nicely said" :
                               "Speak the missing word";

  return (
    <>
    <window.PhoneFrame tone="light" label="01 Speak the Blank">
      <window.LessonHeader
        tone="light" onClose={() => {}} onBack={() => {}} onSkip={() => {}}
        step={roundIdx} total={ROUNDS.length}
      />

      {/* Title block */}
      <div style={{ padding: "12px 28px 0", flexShrink: 0 }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 12, fontWeight: 700,
          letterSpacing: 1.6, textTransform: "uppercase",
          color: C.accent,
          marginBottom: 6,
        }}>
          Speak the blank
        </div>
        {tweaks.showContext && (
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 14, fontWeight: 500, color: C.muted,
            lineHeight: 1.5,
          }}>
            {round.context}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{
        flex: 1,
        padding: "24px 28px 16px",
        display: "flex", flexDirection: "column", gap: 22,
        overflowY: "auto",
      }}>
        {/* Prompt — quiet, no card chrome */}
        <PromptCard line={round.prompt} playing={promptPlaying} onPlay={playPrompt} />

        {/* Hairline separator */}
        <div style={{ height: 1, background: C.hair, margin: "2px 0" }} />

        {/* Your reply */}
        <AnswerCard line={round.answer} micState={micState} blankRevealed={blankRevealed} />

        {/* Show / hide answer link */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: -4 }}>
          <button
            onClick={() => setBlankRevealed((v) => !v)}
            style={{
              appearance: "none", background: "transparent", border: "none",
              padding: "6px 10px", cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13, fontWeight: 600,
              color: blankRevealed ? C.inkSoft : C.muted,
              letterSpacing: 0.2,
              textDecoration: "underline",
              textUnderlineOffset: 4,
              textDecorationColor: blankRevealed ? C.muted2 : C.muted2,
              textDecorationThickness: "1px",
              transition: "color 200ms ease",
            }}
          >
            {blankRevealed ? "Hide the answer" : "Show the answer"}
          </button>
        </div>
      </div>

      {/* Bottom — just status + mic */}
      <div style={{
        padding: "10px 24px 32px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13, fontWeight: 600,
          color: micState === "retry" ? C.inkSoft : C.muted,
          letterSpacing: 0.4,
          transition: "color 200ms ease",
        }}>
          {status}
        </div>
        <window.MicButton
          state={micState}
          onClick={handleMic}
          accent={C.accent}
          micStyle="large"
        />
      </div>
    </window.PhoneFrame>

    {window.TweaksPanel && (
      <window.TweaksPanel title="Tweaks">
        <window.TweakSection title="Layout">
          <window.TweakToggle
            label="Show context line"
            value={tweaks.showContext}
            onChange={(v) => setTweak("showContext", v)}
          />
        </window.TweakSection>
      </window.TweaksPanel>
    )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<SpeakBlankApp />);
