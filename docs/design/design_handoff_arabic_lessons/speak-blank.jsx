// Speak the Blank — fill-in-the-blank dialogue.
// The missing word is shown as a clean BLANK RECTANGLE inline.
// Whole bubble is tappable to play audio; partner line auto-plays on entry.
// The English translation always highlights the target word in orange so
// the learner knows what they're speaking.

const ROUNDS = [
  {
    id: "r1",
    context: "Sara meets her neighbour Layla in the morning at the entrance of their building.",
    lines: [
      {
        speaker: "them",
        arabic: "صَبَاحُ الخَيْر يَا سَارَة!",
        translit: "ṣabāḥu l-khayr yā Sāra",
        english: "Good morning, Sara!",
      },
      {
        speaker: "you",
        arabic: "صَبَاحُ ___",
        translit: "ṣabāḥu ___",
        english: "Good morning of ___.",
        blank: { arabic: "النُّور", translit: "an-nūr", english: "light" },
      },
    ],
    blankLineIdx: 1,
  },
  {
    id: "r2",
    context: "After greeting, Layla asks how Sara is doing today.",
    lines: [
      {
        speaker: "them",
        arabic: "كَيْفَ حَالُكِ اليَوْم؟",
        translit: "kayfa ḥāluki l-yawm",
        english: "How are you today?",
      },
      {
        speaker: "you",
        arabic: "أَنَا ___ ، شُكْرًا.",
        translit: "anā ___, shukran",
        english: "I am ___, thank you.",
        blank: { arabic: "بِخَيْر", translit: "bi-khayr", english: "fine" },
      },
    ],
    blankLineIdx: 1,
  },
  {
    id: "r3",
    context: "They walk to the café. Layla offers to order something.",
    lines: [
      {
        speaker: "them",
        arabic: "مَاذَا تُرِيدِين؟",
        translit: "māthā turīdīn",
        english: "What would you like?",
      },
      {
        speaker: "you",
        arabic: "أُرِيدُ ___ مِنْ فَضْلِك.",
        translit: "urīdu ___ min faḍlik",
        english: "I would like ___, please.",
        blank: { arabic: "قَهْوَة", translit: "qahwa", english: "coffee" },
      },
    ],
    blankLineIdx: 1,
  },
];

// ---------- Avatars ----------
const Avatar = ({ speaker, size = 32 }) => {
  const isYou = speaker === "you";
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: isYou ? "#fe4d01" : "#738ce6",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: size * 0.44,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      flexShrink: 0,
      boxShadow: "0 0 0 3px #faf9f6",
    }}>
      {isYou ? "S" : "L"}
    </div>
  );
};

// ---------- Blank rectangle ----------
// Plain rectangle stand-in for the missing word. Pulses subtly while listening.
function BlankRect({ state, revealed, success, blank, onLight, fontSize = 24 }) {
  // When success or revealed, replace with the answer (orange or light)
  if (revealed || success) {
    return (
      <span style={{
        display: "inline-block",
        color: onLight ? "#fe4d01" : "#ffffff",
        fontFamily: "'Reem Kufi', sans-serif",
        fontSize, fontWeight: 600,
        padding: "0 6px",
        margin: "0 4px",
        borderBottom: onLight
          ? "2px solid rgba(254,77,1,0.55)"
          : "2px solid rgba(255,255,255,0.7)",
        animation: "fade-in 240ms ease",
      }} dir="rtl" lang="ar">
        {blank.arabic}
      </span>
    );
  }

  const isListening = state === "listening";
  const isRetry = state === "retry";

  let bg = onLight ? "#faf9f6" : "rgba(255,255,255,0.18)";
  let border = onLight ? "1.5px solid #d8d5cd" : "1.5px solid rgba(255,255,255,0.35)";
  if (isListening) {
    bg = onLight ? "#ffece0" : "rgba(255,255,255,0.28)";
    border = onLight ? "1.5px solid #fe4d01" : "1.5px solid #ffffff";
  } else if (isRetry) {
    bg = onLight ? "#f3f1ec" : "rgba(255,255,255,0.18)";
    border = onLight ? "1.5px solid #46443f" : "1.5px solid rgba(255,255,255,0.5)";
  }

  return (
    <span
      className={isListening ? "sb-blank-pulse" : ""}
      style={{
        display: "inline-block",
        minWidth: 96, height: fontSize + 10,
        margin: "0 6px",
        background: bg,
        border,
        borderRadius: 8,
        verticalAlign: "middle",
        transition: "all 200ms ease",
      }}
    />
  );
}

// Translit-line equivalent — small flat blank
function BlankRectMini({ state, revealed, success, blank, onLight }) {
  if (revealed || success) {
    return (
      <span style={{
        color: onLight ? "#fe4d01" : "#ffffff",
        fontStyle: "italic", fontWeight: 700,
        padding: "0 2px",
      }}>
        {blank.translit}
      </span>
    );
  }
  const isListening = state === "listening";
  const isRetry = state === "retry";
  let bg = onLight ? "#faf9f6" : "rgba(255,255,255,0.18)";
  let border = onLight ? "1px solid #d8d5cd" : "1px solid rgba(255,255,255,0.35)";
  if (isListening) {
    bg = onLight ? "#ffece0" : "rgba(255,255,255,0.28)";
    border = onLight ? "1px solid #fe4d01" : "1px solid #ffffff";
  } else if (isRetry) {
    border = onLight ? "1px solid #46443f" : "1px solid rgba(255,255,255,0.5)";
  }
  return (
    <span style={{
      display: "inline-block",
      minWidth: 54, height: 14,
      background: bg, border, borderRadius: 4,
      verticalAlign: "middle",
      margin: "0 4px",
      transition: "all 200ms ease",
    }} />
  );
}

// ---------- Bubble ----------
function Bubble({ line, isBlank, blankRevealed, micState, audioPlaying, onPlay }) {
  const isYou = line.speaker === "you";
  const align = isYou ? "flex-end" : "flex-start";
  const success = micState === "success";

  // Visual treatment
  let bubbleBg, bubbleBorder, arabicColor, translitColor, englishColor;
  if (isYou) {
    if (isBlank && !success && !blankRevealed) {
      // Awaiting answer — ghost bubble (matches Dialogue)
      bubbleBg = "#ffffff";
      bubbleBorder = "1.5px dashed rgba(254,77,1,0.45)";
      arabicColor = "#151515";
      translitColor = "#9d998e";
      englishColor = "#9d998e";
    } else {
      bubbleBg = "#fe4d01";
      bubbleBorder = "none";
      arabicColor = "#ffffff";
      translitColor = "rgba(255,255,255,0.85)";
      englishColor = "rgba(255,255,255,0.85)";
    }
  } else {
    bubbleBg = "#ffffff";
    bubbleBorder = "1px solid #efeeeb";
    arabicColor = "#151515";
    translitColor = "#9d998e";
    englishColor = "#9d998e";
  }

  const filledBubble = isYou && (success || blankRevealed);
  const onLight = !filledBubble; // are we drawing on a light bubble bg?

  // Render Arabic with optional inline blank rectangle
  const renderArabic = () => {
    if (!isBlank) return line.arabic;
    const parts = line.arabic.split("___");
    return (
      <span dir="rtl">
        {parts.map((p, i) => (
          <React.Fragment key={i}>
            <span>{p}</span>
            {i < parts.length - 1 && (
              <BlankRect
                state={micState}
                revealed={blankRevealed}
                success={success}
                blank={line.blank}
                onLight={onLight}
              />
            )}
          </React.Fragment>
        ))}
      </span>
    );
  };

  const renderTranslit = () => {
    if (!isBlank) return line.translit;
    const parts = line.translit.split("___");
    return parts.map((p, i) => (
      <React.Fragment key={i}>
        <span>{p}</span>
        {i < parts.length - 1 && (
          <BlankRectMini
            state={micState}
            revealed={blankRevealed}
            success={success}
            blank={line.blank}
            onLight={onLight}
          />
        )}
      </React.Fragment>
    ));
  };

  // English: ALWAYS highlight the target word in orange (so the learner
  // always knows what they're trying to say). For non-blank lines or
  // already-filled bubbles, fall back to the literal english.
  const renderEnglish = () => {
    if (!isBlank) return line.english;

    const word = line.blank.english;
    const parts = line.english.split("___");
    return parts.map((p, i) => (
      <React.Fragment key={i}>
        <span>{p}</span>
        {i < parts.length - 1 && (
          <span style={{
            color: filledBubble ? "#ffffff" : "#fe4d01",
            fontWeight: 700,
            padding: "0 2px",
            borderBottom: filledBubble
              ? "1.5px solid rgba(255,255,255,0.7)"
              : "1.5px solid rgba(254,77,1,0.5)",
          }}>
            {word}
          </span>
        )}
      </React.Fragment>
    ));
  };

  const radius = isYou ? "20px 20px 6px 20px" : "20px 20px 20px 6px";

  return (
    <div style={{
      display: "flex", flexDirection: isYou ? "row-reverse" : "row",
      alignItems: "flex-end", gap: 8,
      alignSelf: align,
      maxWidth: "86%",
    }}>
      <Avatar speaker={line.speaker} />
      <button
        onClick={onPlay}
        aria-label="Play audio"
        style={{
          background: bubbleBg, border: bubbleBorder,
          borderRadius: radius,
          padding: "14px 18px 12px",
          boxShadow: audioPlaying
            ? "0 6px 20px rgba(254,77,1,0.18), 0 2px 6px rgba(21,21,21,0.05)"
            : (bubbleBg === "#fe4d01"
                ? "0 4px 14px rgba(254,77,1,0.20)"
                : "0 2px 10px rgba(21,21,21,0.05)"),
          minWidth: 0,
          textAlign: "inherit",
          cursor: "pointer",
          color: "inherit",
          font: "inherit",
          transition: "all 220ms ease",
          transform: audioPlaying ? "scale(1.015)" : "scale(1)",
          outline: audioPlaying ? "2px solid rgba(254,77,1,0.35)" : "none",
          outlineOffset: 2,
          display: "block",
        }}
      >
        <div
          dir="rtl" lang="ar"
          style={{
            fontFamily: "'Reem Kufi', sans-serif",
            fontSize: 26, fontWeight: 600,
            color: arabicColor,
            lineHeight: 1.7,
            textAlign: "right",
          }}
        >
          {renderArabic()}
        </div>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontStyle: "italic",
          fontSize: 13, color: translitColor, fontWeight: 500,
          marginTop: 4,
          textAlign: isYou ? "right" : "left",
        }}>
          {renderTranslit()}
        </div>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13, color: englishColor, fontWeight: 500,
          marginTop: 2,
          textAlign: isYou ? "right" : "left",
        }}>
          {renderEnglish()}
        </div>
      </button>
    </div>
  );
}

// ---------- Eye icon (for show-answer toggle) ----------
function EyeIcon({ open }) {
  if (open) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="2.2"
           strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.2"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2" />
      <path d="M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7c1.6 0 3-.3 4.3-.8" />
    </svg>
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
  const [playingLine, setPlayingLine] = React.useState(null);
  const [blankRevealed, setBlankRevealed] = React.useState(false);
  const [completed, setCompleted] = React.useState(false);

  const round = ROUNDS[roundIdx];

  // Reset per-round state
  React.useEffect(() => {
    setMicState("idle");
    setPlayingLine(null);
    setBlankRevealed(false);
  }, [roundIdx]);

  // Auto-play partner's prompt line on round entry
  React.useEffect(() => {
    if (completed) return;
    const t = setTimeout(() => {
      const promptIdx = round.lines.findIndex(
        (l, i) => i < round.blankLineIdx && l.speaker === "them"
      );
      if (promptIdx >= 0) {
        setPlayingLine(promptIdx);
        setTimeout(() => setPlayingLine(null), 1300);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [roundIdx, completed]);

  const playLineAudio = (i) => {
    setPlayingLine(i);
    setTimeout(() => setPlayingLine((p) => (p === i ? null : p)), 1200);
  };

  const handleMic = () => {
    if (micState === "idle" || micState === "retry") {
      setMicState("listening");
      setTimeout(() => {
        const ok = Math.random() < 0.75;
        setMicState(ok ? "success" : "retry");
        if (ok) {
          setTimeout(() => {
            if (roundIdx + 1 >= ROUNDS.length) {
              setCompleted(true);
            } else {
              setRoundIdx((i) => i + 1);
            }
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
    setPlayingLine(null);
    setBlankRevealed(false);
    setCompleted(false);
  };

  // ---------- Completion screen ----------
  if (completed) {
    return (
      <window.PhoneFrame tone="light" label="01 Speak the Blank">
        <window.LessonHeader
          tone="light" onClose={() => {}} onBack={() => {}} onSkip={() => {}}
          step={ROUNDS.length} total={ROUNDS.length}
        />
        <div style={{
          flex: 1, padding: "24px 28px",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 18,
        }}>
          <div style={{
            width: 88, height: 88, borderRadius: 44,
            background: "rgba(115,140,230,0.12)", color: "#3d57b8",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <window.Icon.Check size={44} color="#3d57b8" />
          </div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 26, fontWeight: 800, color: "#151515",
            letterSpacing: -0.3, textAlign: "center",
          }}>
            Conversation done
          </div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 16, fontWeight: 500, color: "#9d998e",
            textAlign: "center", maxWidth: 280, lineHeight: 1.4,
          }}>
            You spoke {ROUNDS.length} replies in context.
          </div>
        </div>
        <div style={{
          padding: "20px 24px 36px",
          display: "flex", justifyContent: "center", flexShrink: 0,
        }}>
          <button
            onClick={reset}
            style={{
              padding: "16px 32px", borderRadius: 999,
              background: "#fe4d01", color: "#ffffff", border: "none",
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

  return (
    <>
    <window.PhoneFrame tone="light" label="01 Speak the Blank">
      <window.LessonHeader
        tone="light" onClose={() => {}} onBack={() => {}} onSkip={() => {}}
        step={roundIdx} total={ROUNDS.length}
      />

      <div style={{ padding: "10px 24px 0", flexShrink: 0 }}>
        <window.Eyebrow>Speak to fill the blank</window.Eyebrow>
      </div>

      {/* Context card */}
      {tweaks.showContext && (
        <div style={{ padding: "14px 20px 0", flexShrink: 0 }}>
          <div style={{
            background: "rgba(115,140,230,0.08)",
            border: "1px solid rgba(115,140,230,0.22)",
            borderRadius: 16,
            padding: "10px 14px",
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 22, height: 22, borderRadius: 11,
              background: "#738ce6", color: "#ffffff",
              flexShrink: 0, marginTop: 1,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, fontWeight: 700,
            }}>i</span>
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13, fontWeight: 500, color: "#3d57b8",
              lineHeight: 1.45,
            }}>
              {round.context}
            </div>
          </div>
        </div>
      )}

      {/* Conversation */}
      <div style={{
        flex: 1,
        padding: "16px 20px 6px",
        display: "flex", flexDirection: "column", gap: 14,
        overflowY: "auto",
      }}>
        {round.lines.map((line, i) => (
          <Bubble
            key={i}
            line={line}
            isBlank={i === round.blankLineIdx}
            blankRevealed={i === round.blankLineIdx && blankRevealed}
            micState={i === round.blankLineIdx ? micState : "idle"}
            audioPlaying={playingLine === i}
            onPlay={() => playLineAudio(i)}
          />
        ))}
      </div>

      {/* Bottom action */}
      <div style={{
        borderTop: "1px solid #efeeeb",
        background: "#faf9f6",
        padding: "18px 24px 30px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
        flexShrink: 0,
      }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13, fontWeight: 600, color: "#9d998e",
          letterSpacing: 0.6, textTransform: "uppercase",
        }}>
          {micState === "listening" ? "Listening…" :
           micState === "retry" ? "Try again" :
           micState === "success" ? "Nicely said" :
           "Speak the missing word"}
        </div>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 18,
          width: "100%",
        }}>
          {/* Show answer toggle (left) */}
          <button
            onClick={() => setBlankRevealed((v) => !v)}
            aria-pressed={blankRevealed}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "11px 16px", borderRadius: 999,
              background: blankRevealed ? "rgba(115,140,230,0.12)" : "#ffffff",
              color: blankRevealed ? "#3d57b8" : "#46443f",
              border: blankRevealed ? "1px solid rgba(115,140,230,0.35)" : "1px solid #efeeeb",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600, fontSize: 13, letterSpacing: 0.1,
              cursor: "pointer",
              boxShadow: blankRevealed ? "none" : "0 2px 6px rgba(21,21,21,0.05)",
              flexShrink: 0,
              transition: "all 200ms ease",
            }}
          >
            <EyeIcon open={blankRevealed} />
            {blankRevealed ? "Hide answer" : "Show answer"}
          </button>

          <window.MicButton
            state={micState}
            onClick={handleMic}
            accent="#fe4d01"
            micStyle="large"
          />

          {/* Spacer to balance the row visually opposite the button */}
          <div style={{ width: 116, flexShrink: 0 }} />
        </div>
      </div>
    </window.PhoneFrame>

    {window.TweaksPanel && (
      <window.TweaksPanel title="Tweaks">
        <window.TweakSection title="Layout">
          <window.TweakToggle
            label="Show context card"
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
