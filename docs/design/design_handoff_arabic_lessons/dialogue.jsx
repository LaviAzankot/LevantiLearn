// Dialogue lesson — chat-style back-and-forth, user speaks their turn into mic

const DIALOGUE = [
  { speaker: "them", arabic: "مَرْحَبًا!", translit: "marḥaban", english: "Hello!" },
  { speaker: "you",  arabic: "أَهْلًا.", translit: "ahlan",     english: "Hi." },
  { speaker: "them", arabic: "كَيْفَ حَالُك؟", translit: "kayfa ḥāluk", english: "How are you?" },
  { speaker: "you",  arabic: "بِخَيْر، شُكْرًا.", translit: "bi-khayr, shukran", english: "Fine, thank you." },
  { speaker: "them", arabic: "مَا اسْمُك؟", translit: "mā ismuk", english: "What's your name?" },
  { speaker: "you",  arabic: "اِسْمِي سَارَة.", translit: "ismī Sāra", english: "My name is Sara." },
];

// Map of avatar styles per speaker
const Avatar = ({ speaker, size = 36 }) => {
  if (speaker === "you") {
    return (
      <div style={{
        width: size, height: size, borderRadius: size / 2,
        background: "#fe4d01",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 700, fontSize: size * 0.42,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        flexShrink: 0,
      }}>S</div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: "#738ce6",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: size * 0.42,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      flexShrink: 0,
    }}>L</div>
  );
};

function Bubble({ turn, isCurrent, completed, onPlay, audioPlaying }) {
  const isYou = turn.speaker === "you";
  const align = isYou ? "flex-end" : "flex-start";
  const ghost = isCurrent && !completed && isYou;

  // Bubble visual treatment
  let bubbleBg, bubbleBorder, arabicColor, translitColor, englishColor;
  if (isYou) {
    if (ghost) {
      bubbleBg = "#ffffff";
      bubbleBorder = "1.5px dashed rgba(254,77,1,0.45)";
      arabicColor = "#151515";
      translitColor = "#9d998e";
      englishColor = "#9d998e";
    } else {
      bubbleBg = "#fe4d01";
      bubbleBorder = "none";
      arabicColor = "#ffffff";
      translitColor = "rgba(255,255,255,0.78)";
      englishColor = "rgba(255,255,255,0.78)";
    }
  } else {
    bubbleBg = "#ffffff";
    bubbleBorder = "1px solid #efeeeb";
    arabicColor = "#151515";
    translitColor = "#9d998e";
    englishColor = "#9d998e";
  }

  // corner shape — chat-style with one squared-off corner near avatar
  const radius = isYou ? "20px 20px 6px 20px" : "20px 20px 20px 6px";

  return (
    <div style={{
      display: "flex", flexDirection: isYou ? "row-reverse" : "row",
      alignItems: "flex-end", gap: 8,
      alignSelf: align,
      maxWidth: "82%",
    }}>
      <Avatar speaker={turn.speaker} />
      <div style={{
        background: bubbleBg, border: bubbleBorder,
        borderRadius: radius,
        padding: "12px 16px",
        boxShadow: !isYou || (isYou && !ghost) ? "0 2px 10px rgba(21,21,21,0.05)" : "none",
        position: "relative",
        minWidth: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexDirection: isYou ? "row-reverse" : "row" }}>
          {!isYou && (
            <button
              onClick={onPlay}
              aria-label="Play audio"
              style={{
                width: 30, height: 30, borderRadius: 15,
                background: audioPlaying ? "#fe4d01" : "rgba(254,77,1,0.10)",
                color: audioPlaying ? "#fff" : "#fe4d01",
                border: "none", cursor: "pointer",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                transition: "all 200ms ease",
              }}
            >
              <window.Icon.Speaker size={14} color="currentColor" />
            </button>
          )}
          <div
            dir="rtl" lang="ar"
            style={{
              fontFamily: "'Reem Kufi', sans-serif",
              fontSize: 26, fontWeight: 600,
              color: arabicColor,
              lineHeight: 1.6,
              textAlign: "right",
            }}
          >
            {turn.arabic}
          </div>
        </div>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontStyle: "italic",
          fontSize: 13, color: translitColor, fontWeight: 500,
          marginTop: 4,
          textAlign: isYou ? "right" : "left",
        }}>
          {turn.translit}
        </div>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13, color: englishColor, fontWeight: 500,
          marginTop: 2,
          textAlign: isYou ? "right" : "left",
        }}>
          {turn.english}
        </div>
      </div>
    </div>
  );
}

function DialogueApp() {
  // Index of current turn — turns 0..idx-1 are completed/displayed
  const [idx, setIdx] = React.useState(0);
  const [micState, setMicState] = React.useState("idle"); // idle | listening | success | retry
  const [playingIdx, setPlayingIdx] = React.useState(null);
  const scrollRef = React.useRef(null);

  // Auto-scroll to bottom when new turn appears
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [idx, micState]);

  // If "them" turn is current, auto-advance after a short delay (they speak, then user's turn)
  React.useEffect(() => {
    if (idx < DIALOGUE.length && DIALOGUE[idx].speaker === "them") {
      const t = setTimeout(() => {
        setIdx(i => i + 1);
      }, 1600);
      return () => clearTimeout(t);
    }
  }, [idx]);

  // Visible turns: all completed turns + the current turn (whether 'them' or 'you')
  const visibleCount = Math.min(idx + 1, DIALOGUE.length);
  const visibleTurns = DIALOGUE.slice(0, visibleCount);
  const currentTurn = idx < DIALOGUE.length ? DIALOGUE[idx] : null;
  const isUserTurn = currentTurn && currentTurn.speaker === "you";
  const conversationDone = idx >= DIALOGUE.length;

  const handleMic = () => {
    if (!isUserTurn) return;
    if (micState === "idle") {
      setMicState("listening");
      setTimeout(() => {
        const ok = Math.random() < 0.75;
        setMicState(ok ? "success" : "retry");
        if (ok) {
          setTimeout(() => {
            setMicState("idle");
            setIdx(i => i + 1);
          }, 700);
        }
      }, 1800);
    } else if (micState === "retry") {
      setMicState("idle");
    } else if (micState === "listening") {
      setMicState("idle");
    }
  };

  const playTurnAudio = (turnIdx) => {
    setPlayingIdx(turnIdx);
    setTimeout(() => setPlayingIdx(null), 1200);
  };

  // Progress: completed user-turns / total user-turns
  const userTurnsTotal = DIALOGUE.filter(t => t.speaker === "you").length;
  const userTurnsDone = DIALOGUE.slice(0, idx).filter(t => t.speaker === "you").length;

  return (
    <window.PhoneFrame tone="light" label="01 Dialogue">
      <window.LessonHeader
        tone="light"
        onClose={() => {}}
        onBack={() => {}}
        onSkip={() => {}}
        step={userTurnsDone}
        total={userTurnsTotal}
      />

      <div style={{ padding: "10px 24px 0", flexShrink: 0 }}>
        <window.Eyebrow>Dialogue · Greetings</window.Eyebrow>
      </div>

      {/* Conversation scroll area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          padding: "16px 20px 16px",
          display: "flex", flexDirection: "column", gap: 14,
          overflowY: "auto",
        }}
      >
        {visibleTurns.map((turn, i) => (
          <Bubble
            key={i}
            turn={turn}
            isCurrent={i === idx}
            completed={i < idx}
            onPlay={() => playTurnAudio(i)}
            audioPlaying={playingIdx === i}
          />
        ))}
      </div>

      {/* Bottom bar — mic for user turns, continue for done */}
      <div style={{
        borderTop: "1px solid #efeeeb",
        background: "#faf9f6",
        padding: "20px 24px 32px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        flexShrink: 0,
      }}>
        {conversationDone ? (
          <button
            onClick={() => { setIdx(0); setMicState("idle"); }}
            style={{
              padding: "16px 32px", borderRadius: 999,
              background: "#fe4d01", color: "#fff", border: "none",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700, fontSize: 16, letterSpacing: 0.2,
              cursor: "pointer",
              boxShadow: "0 8px 22px rgba(254,77,1,0.32)",
            }}
          >
            Continue
          </button>
        ) : isUserTurn ? (
          <>
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13, fontWeight: 600, color: "#9d998e",
              letterSpacing: 0.6, textTransform: "uppercase",
            }}>
              {micState === "listening" ? "Listening…" :
               micState === "retry" ? "Try again" :
               "Your turn"}
            </div>
            <window.MicButton
              state={micState}
              onClick={handleMic}
              accent="#fe4d01"
              micStyle="large"
            />
          </>
        ) : (
          // 'them' speaking — show typing indicator
          <>
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13, fontWeight: 600, color: "#9d998e",
              letterSpacing: 0.6, textTransform: "uppercase",
            }}>
              Layla is speaking…
            </div>
            <div style={{ display: "flex", gap: 6, padding: "32px 0 36px" }}>
              <span className="typing-dot" style={{ background: "#bebbb1" }} />
              <span className="typing-dot" style={{ background: "#bebbb1", animationDelay: "150ms" }} />
              <span className="typing-dot" style={{ background: "#bebbb1", animationDelay: "300ms" }} />
            </div>
          </>
        )}
      </div>
    </window.PhoneFrame>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<DialogueApp />);
