// Choose Translation — listen to an Arabic word, pick the matching English translation
// 4 rounds, one per word

const ROUNDS = [
  {
    id: "r1",
    arabic: "كَلْب",
    translit: "kalb",
    correct: "Dog",
    options: ["Cat", "Dog", "Horse", "Bird"],
  },
  {
    id: "r2",
    arabic: "كِتَاب",
    translit: "kitāb",
    correct: "Book",
    options: ["Pen", "Notebook", "Book", "Letter"],
  },
  {
    id: "r3",
    arabic: "شَمْس",
    translit: "shams",
    correct: "Sun",
    options: ["Moon", "Star", "Cloud", "Sun"],
  },
  {
    id: "r4",
    arabic: "بَيْت",
    translit: "bayt",
    correct: "House",
    options: ["House", "Door", "Window", "Room"],
  },
];

function ChooseTranslationApp() {
  const [roundIdx, setRoundIdx] = React.useState(0);
  const [selected, setSelected] = React.useState(null); // option string
  const [revealed, setRevealed] = React.useState(false); // after Check tapped
  const [audioPlaying, setAudioPlaying] = React.useState(false);
  const [completed, setCompleted] = React.useState(false);
  const [correctCount, setCorrectCount] = React.useState(0);
  const [shakeWrong, setShakeWrong] = React.useState(false);

  const round = ROUNDS[roundIdx];
  const isCorrect = selected === round.correct;

  // auto-play audio when entering a new round
  React.useEffect(() => {
    if (completed) return;
    const t = setTimeout(() => {
      setAudioPlaying(true);
      setTimeout(() => setAudioPlaying(false), 1300);
    }, 350);
    return () => clearTimeout(t);
  }, [roundIdx, completed]);

  const playAudio = () => {
    setAudioPlaying(true);
    setTimeout(() => setAudioPlaying(false), 1300);
  };

  const handleCheck = () => {
    if (!selected) return;
    setRevealed(true);
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
    } else {
      setShakeWrong(true);
      setTimeout(() => setShakeWrong(false), 500);
    }
  };

  const handleContinue = () => {
    if (roundIdx + 1 >= ROUNDS.length) {
      setCompleted(true);
    } else {
      setRoundIdx((i) => i + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  const reset = () => {
    setRoundIdx(0);
    setSelected(null);
    setRevealed(false);
    setCompleted(false);
    setCorrectCount(0);
  };

  // ---------- Option button ----------
  const OptionButton = ({ label }) => {
    const isSel = selected === label;
    const isThisCorrect = label === round.correct;

    let bg = "#ffffff";
    let fg = "#151515";
    let brd = "1px solid #efeeeb";
    let shadow = "0 2px 6px rgba(21,21,21,0.04)";
    let transform = "scale(1)";

    if (revealed) {
      if (isThisCorrect) {
        bg = "rgba(115,140,230,0.10)";
        fg = "#3d57b8";
        brd = "1px solid rgba(115,140,230,0.45)";
        shadow = "0 6px 18px rgba(115,140,230,0.18)";
      } else if (isSel && !isThisCorrect) {
        bg = "rgba(254,77,1,0.08)";
        fg = "#fe4d01";
        brd = "1px solid rgba(254,77,1,0.4)";
        shadow = "none";
      } else {
        bg = "#ffffff";
        fg = "#9d998e";
        brd = "1px solid #efeeeb";
        shadow = "none";
      }
    } else if (isSel) {
      bg = "#fe4d01";
      fg = "#ffffff";
      brd = "1px solid #fe4d01";
      shadow = "0 8px 22px rgba(254,77,1,0.28)";
      transform = "scale(1.02)";
    }

    const isWrongShake = revealed && isSel && !isThisCorrect && shakeWrong;

    return (
      <button
        onClick={() => !revealed && setSelected(label)}
        disabled={revealed}
        className={isWrongShake ? "shake" : ""}
        style={{
          width: "100%",
          height: "100%",
          padding: "16px 14px",
          minHeight: 70,
          background: bg,
          color: fg,
          border: brd,
          borderRadius: 18,
          boxShadow: shadow,
          cursor: revealed ? "default" : "pointer",
          transform,
          transition: "all 220ms ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 18,
          fontWeight: 600,
          textAlign: "center",
          lineHeight: 1.3,
          whiteSpace: "normal",
          overflowWrap: "break-word",
          wordBreak: "break-word",
          textWrap: "pretty",
          position: "relative",
        }}
      >
        {label}
        {revealed && isThisCorrect && (
          <span style={{
            position: "absolute", top: 10, right: 12,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 22, height: 22, borderRadius: 11,
            background: "#738ce6", color: "#ffffff",
          }}>
            <window.Icon.Check size={14} color="#ffffff" />
          </span>
        )}
      </button>
    );
  };

  // ---------- Completion screen ----------
  if (completed) {
    return (
      <window.PhoneFrame tone="light" label="01 Choose Translation">
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
            Round complete
          </div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 16, fontWeight: 500, color: "#9d998e",
            textAlign: "center", maxWidth: 280, lineHeight: 1.4,
          }}>
            You got <span style={{ color: "#151515", fontWeight: 700 }}>
              {correctCount} of {ROUNDS.length}
            </span> right on the first try.
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

  // ---------- Main exercise screen ----------
  return (
    <window.PhoneFrame tone="light" label="01 Choose Translation">
      <window.LessonHeader
        tone="light" onClose={() => {}} onBack={() => {}} onSkip={() => {}}
        step={roundIdx} total={ROUNDS.length}
      />

      <div style={{
        padding: "14px 24px 0", flex: 1,
        display: "flex", flexDirection: "column", gap: 22, overflow: "hidden",
      }}>
        <window.Eyebrow>Choose the Translation</window.Eyebrow>

        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 22, fontWeight: 700, color: "#151515",
            lineHeight: 1.3, letterSpacing: -0.2,
          }}>
            What does this word mean?
          </div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 15, fontWeight: 500, color: "#9d998e", marginTop: 4,
          }}>
            Tap the speaker to listen again
          </div>
        </div>

        {/* Word card with speaker */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #efeeeb",
          borderRadius: 28,
          padding: "30px 22px 26px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
          boxShadow: "0 8px 24px rgba(21,21,21,0.05), 0 1px 3px rgba(21,21,21,0.04)",
        }}>
          <window.SpeakerButton onClick={playAudio} playing={audioPlaying} size={56} />
          <div
            dir="rtl" lang="ar"
            style={{
              fontFamily: "'Reem Kufi', 'Noto Naskh Arabic', sans-serif",
              fontSize: 42, fontWeight: 600, color: "#151515",
              lineHeight: 1.5, textAlign: "center",
              opacity: revealed ? 1 : 1,
            }}
          >
            {round.arabic}
          </div>
          {revealed && (
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontStyle: "italic",
              fontSize: 15, color: "#9d998e", fontWeight: 500,
              letterSpacing: 0.1,
              animation: "fade-in 240ms ease",
            }}>
              {round.translit}
            </div>
          )}
        </div>

        {/* Options grid — 2x2, equal size */}
        <div style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridAutoRows: "1fr",
          gap: 10,
          alignContent: "stretch",
          minHeight: 180,
        }}>
          {round.options.map((opt) => (
            <OptionButton key={opt} label={opt} />
          ))}
        </div>
      </div>

      {/* Bottom action bar */}
      <div style={{
        padding: "18px 24px 30px",
        flexShrink: 0,
        display: "flex", flexDirection: "column", alignItems: "stretch", gap: 10,
      }}>
        {revealed && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px", borderRadius: 14,
            background: isCorrect ? "rgba(115,140,230,0.10)" : "rgba(254,77,1,0.08)",
            color: isCorrect ? "#3d57b8" : "#fe4d01",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 600, fontSize: 14,
            animation: "fade-in 240ms ease",
          }}>
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 22, height: 22, borderRadius: 11,
              background: isCorrect ? "#738ce6" : "#fe4d01", color: "#ffffff",
              flexShrink: 0,
            }}>
              {isCorrect
                ? <window.Icon.Check size={14} color="#ffffff" />
                : <span style={{ fontWeight: 800, fontSize: 14, lineHeight: 1 }}>!</span>}
            </span>
            <span>
              {isCorrect
                ? "Nice — that's right."
                : <>The answer is <strong style={{ fontWeight: 800 }}>{round.correct}</strong>.</>}
            </span>
          </div>
        )}

        <button
          onClick={revealed ? handleContinue : handleCheck}
          disabled={!selected && !revealed}
          style={{
            padding: "16px 32px", borderRadius: 999,
            background: !selected && !revealed ? "#efeeeb" : "#fe4d01",
            color: !selected && !revealed ? "#bebbb1" : "#ffffff",
            border: "none",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700, fontSize: 16, letterSpacing: 0.2,
            cursor: !selected && !revealed ? "default" : "pointer",
            boxShadow: !selected && !revealed
              ? "none"
              : "0 8px 22px rgba(254,77,1,0.32)",
            transition: "all 220ms ease",
          }}
        >
          {revealed
            ? (roundIdx + 1 >= ROUNDS.length ? "Finish" : "Continue")
            : "Check"}
        </button>
      </div>
    </window.PhoneFrame>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ChooseTranslationApp />);
