// Sentence Complete — build an Arabic sentence by tapping word blocks.
// Each block has Arabic + transliteration. Tapping plays its audio.
// 3 rounds.

const SENTENCES = [
  {
    id: "s1",
    english: "Peace be upon you",
    // ordered correctly (RTL display order = same as array, rendered with direction:rtl)
    correct: ["w1", "w2"],
    bank: [
      { id: "w1", ar: "السَّلامُ",    tr: "as-salāmu" },
      { id: "w2", ar: "عَلَيْكُم",    tr: "ʿalaykum" },
      { id: "d1", ar: "مَرْحَبًا",   tr: "marḥaban" },
      { id: "d2", ar: "صَبَاح",       tr: "ṣabāḥ" },
    ],
  },
  {
    id: "s2",
    english: "I want water, please",
    correct: ["w1", "w2", "w3"],
    bank: [
      { id: "w1", ar: "أُرِيدُ",      tr: "urīdu" },
      { id: "d1", ar: "أَكْتُبُ",     tr: "aktubu" },
      { id: "w2", ar: "مَاءً",         tr: "māʾan" },
      { id: "d2", ar: "خُبْزًا",       tr: "khubzan" },
      { id: "w3", ar: "مِنْ فَضْلِك", tr: "min faḍlik" },
      { id: "d3", ar: "شُكْرًا",       tr: "shukran" },
    ],
  },
  {
    id: "s3",
    english: "The book is on the table",
    correct: ["w1", "w2", "w3", "w4"],
    bank: [
      { id: "w1", ar: "الكِتَابُ",     tr: "al-kitābu" },
      { id: "d1", ar: "القَلَمُ",      tr: "al-qalamu" },
      { id: "w2", ar: "عَلَى",          tr: "ʿalā" },
      { id: "d2", ar: "تَحْتَ",        tr: "taḥta" },
      { id: "w3", ar: "الطَّاوِلَةِ",  tr: "aṭ-ṭāwilati" },
      { id: "d3", ar: "الكُرْسِيِّ",   tr: "al-kursiyyi" },
      { id: "w4", ar: "هُنَاكَ",        tr: "hunāka" },
    ],
  },
];

function SentenceCompleteApp() {
  const [roundIdx, setRoundIdx] = React.useState(0);
  const [placed, setPlaced] = React.useState([]); // array of word ids in placement order
  const [revealed, setRevealed] = React.useState(false);
  // phase: "attempt" → user's first try
  //        "practice" → after a wrong attempt, correct sentence is shown as reference
  //                     and user must rebuild it themselves
  //        "done" → answer was correct (either first try or after practice)
  const [phase, setPhase] = React.useState("attempt");
  const [shakeWrong, setShakeWrong] = React.useState(false);
  const [playingId, setPlayingId] = React.useState(null);
  const [completed, setCompleted] = React.useState(false);
  const [correctCount, setCorrectCount] = React.useState(0);

  const round = SENTENCES[roundIdx];
  const expectedLen = round.correct.length;

  // is the current placed array correct?
  const isCorrect =
    placed.length === expectedLen &&
    placed.every((id, i) => id === round.correct[i]);

  const playWord = (id) => {
    setPlayingId(id);
    setTimeout(() => setPlayingId((p) => (p === id ? null : p)), 900);
  };

  const tapBankWord = (id) => {
    if (revealed && phase === "done") return;
    if (placed.includes(id)) return;
    if (placed.length >= expectedLen) return;
    setPlaced([...placed, id]);
    playWord(id);
  };

  const tapPlacedWord = (id) => {
    if (revealed && phase === "done") return;
    setPlaced(placed.filter((x) => x !== id));
  };

  const handleCheck = () => {
    if (placed.length !== expectedLen) return;
    if (isCorrect) {
      setRevealed(true);
      // first try success only (phase still "attempt")
      if (phase === "attempt") setCorrectCount((c) => c + 1);
      setPhase("done");
    } else {
      // wrong — flash, briefly show wrong state, then enter practice phase
      setRevealed(true);
      setShakeWrong(true);
      setTimeout(() => setShakeWrong(false), 500);
      setTimeout(() => {
        setPlaced([]);
        setRevealed(false);
        setPhase("practice");
      }, 1100);
    }
  };

  const handleContinue = () => {
    if (roundIdx + 1 >= SENTENCES.length) {
      setCompleted(true);
    } else {
      setRoundIdx((i) => i + 1);
      setPlaced([]);
      setRevealed(false);
      setPhase("attempt");
    }
  };

  const reset = () => {
    setRoundIdx(0);
    setPlaced([]);
    setRevealed(false);
    setPhase("attempt");
    setCompleted(false);
    setCorrectCount(0);
  };

  // ---------- Word Block ----------
  // location: "bank" | "slot"
  const WordBlock = ({ word, location, isPlayed, onTap, dimmed, state }) => {
    // state: "default" | "correct" | "wrong"
    let bg = "#ffffff";
    let fg = "#151515";
    let trColor = "#9d998e";
    let brd = "1px solid #efeeeb";
    let shadow = "0 2px 6px rgba(21,21,21,0.04)";
    let transform = "scale(1)";
    let cursor = "pointer";
    let opacity = 1;

    if (dimmed) {
      opacity = 0.35;
      cursor = "default";
      shadow = "none";
    }
    if (isPlayed) {
      bg = "#fe4d01";
      fg = "#ffffff";
      trColor = "rgba(255,255,255,0.85)";
      brd = "1px solid #fe4d01";
      shadow = "0 8px 22px rgba(254,77,1,0.28)";
      transform = "scale(1.04)";
    }
    if (state === "correct") {
      bg = "rgba(115,140,230,0.10)";
      fg = "#3d57b8";
      trColor = "rgba(61,87,184,0.7)";
      brd = "1px solid rgba(115,140,230,0.45)";
      shadow = "0 6px 18px rgba(115,140,230,0.18)";
    } else if (state === "wrong") {
      bg = "rgba(254,77,1,0.08)";
      fg = "#fe4d01";
      trColor = "rgba(254,77,1,0.7)";
      brd = "1px solid rgba(254,77,1,0.4)";
      shadow = "none";
    }

    return (
      <button
        onClick={onTap}
        disabled={dimmed}
        className={state === "wrong" && shakeWrong ? "shake" : ""}
        style={{
          padding: "10px 14px 8px",
          background: bg,
          color: fg,
          border: brd,
          borderRadius: 14,
          boxShadow: shadow,
          cursor,
          opacity,
          transform,
          transition: "all 200ms ease",
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          minWidth: 56,
        }}
      >
        <span
          dir="rtl" lang="ar"
          style={{
            fontFamily: "'Reem Kufi', 'Noto Naskh Arabic', sans-serif",
            fontSize: 22, fontWeight: 600, lineHeight: 1.4,
            whiteSpace: "nowrap",
          }}
        >
          {word.ar}
        </span>
        <span style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontStyle: "italic",
          fontSize: 11, fontWeight: 500,
          color: trColor,
          letterSpacing: 0.1,
          lineHeight: 1.2,
          whiteSpace: "nowrap",
        }}>
          {word.tr}
        </span>
      </button>
    );
  };

  // ---------- Completion screen ----------
  if (completed) {
    return (
      <window.PhoneFrame tone="light" label="01 Sentence Complete">
        <window.LessonHeader
          tone="light" onClose={() => {}} onBack={() => {}} onSkip={() => {}}
          step={SENTENCES.length} total={SENTENCES.length}
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
            Sentences built
          </div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 16, fontWeight: 500, color: "#9d998e",
            textAlign: "center", maxWidth: 280, lineHeight: 1.4,
          }}>
            <span style={{ color: "#151515", fontWeight: 700 }}>
              {correctCount} of {SENTENCES.length}
            </span> correct on the first try.
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

  // word lookup
  const findWord = (id) => round.bank.find((w) => w.id === id);
  // bank words not yet placed (keep stable order from round.bank)
  const bankWords = round.bank;
  const placedSet = new Set(placed);

  // What state should each placed word show after reveal?
  // "wrong reveal": show user's order in red, plus the correct order strip below.
  const placedStateFor = (id, idx) => {
    if (!revealed) return "default";
    if (isCorrect) return "correct";
    return "wrong";
  };

  // empty slot count for hint
  const remainingSlots = expectedLen - placed.length;

  return (
    <window.PhoneFrame tone="light" label="01 Sentence Complete">
      <window.LessonHeader
        tone="light" onClose={() => {}} onBack={() => {}} onSkip={() => {}}
        step={roundIdx} total={SENTENCES.length}
      />

      <div style={{
        padding: "14px 24px 0", flex: 1,
        display: "flex", flexDirection: "column", gap: 18, overflow: "hidden",
      }}>
        <window.Eyebrow>Build the Sentence</window.Eyebrow>

        {/* Prompt */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 14, fontWeight: 600, color: "#9d998e",
            letterSpacing: 0.3, marginBottom: 6,
          }}>
            Translate this sentence
          </div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 22, fontWeight: 700, color: "#151515",
            lineHeight: 1.3, letterSpacing: -0.2,
            textWrap: "pretty",
          }}>
            “{round.english}”
          </div>
        </div>

        {/* Answer area — RTL, dotted underline rows */}
        <AnswerArea
          placed={placed}
          findWord={findWord}
          expectedLen={expectedLen}
          onTapPlaced={tapPlacedWord}
          revealed={revealed}
          isCorrect={isCorrect}
          shakeWrong={shakeWrong}
          playingId={playingId}
          playWord={playWord}
        />

        {/* Practice phase reference: show correct sentence above; user must rebuild */}
        {phase === "practice" && (
          <div style={{
            padding: "12px 14px",
            background: "rgba(115,140,230,0.08)",
            border: "1px solid rgba(115,140,230,0.28)",
            borderRadius: 14,
            display: "flex", flexDirection: "column", gap: 8,
            animation: "fade-in 240ms ease",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
            }}>
              <div style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
                textTransform: "uppercase", color: "#3d57b8",
              }}>
                Now you try — match this
              </div>
              <div style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 11, fontWeight: 600, color: "#9d998e",
              }}>
                {placed.length}/{expectedLen}
              </div>
            </div>
            <div dir="rtl" style={{
              display: "flex", flexWrap: "wrap", gap: 10,
              justifyContent: "flex-start", alignItems: "baseline",
            }}>
              {round.correct.map((id) => {
                const w = findWord(id);
                return (
                  <span key={"c-" + id} style={{
                    display: "inline-flex", flexDirection: "column",
                    alignItems: "center", lineHeight: 1.2,
                  }}>
                    <span dir="rtl" lang="ar" style={{
                      fontFamily: "'Reem Kufi', sans-serif",
                      fontSize: 20, fontWeight: 600, color: "#3d57b8",
                    }}>
                      {w.ar}
                    </span>
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontStyle: "italic",
                      fontSize: 10, fontWeight: 500,
                      color: "rgba(61,87,184,0.7)",
                      letterSpacing: 0.1,
                    }}>
                      {w.tr}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Bank — scrollable if needed */}
        <div style={{
          marginTop: "auto",
          display: "flex", flexDirection: "column", gap: 10,
          paddingBottom: 6,
        }}>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
            textTransform: "uppercase", color: "#9d998e",
            textAlign: "center",
          }}>
            Tap to add · Tap again to hear
          </div>
          <div dir="rtl" style={{
            display: "flex", flexWrap: "wrap", gap: 8,
            justifyContent: "center",
          }}>
            {bankWords.map((w) => (
              <WordBlock
                key={"bank-" + w.id}
                word={w}
                location="bank"
                isPlayed={playingId === w.id && !placedSet.has(w.id)}
                onTap={() => {
                  if (placedSet.has(w.id)) return;
                  tapBankWord(w.id);
                }}
                dimmed={placedSet.has(w.id) || (revealed && phase === "done")}
                state="default"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom action */}
      <div style={{
        padding: "14px 24px 28px",
        flexShrink: 0,
        display: "flex", flexDirection: "column", alignItems: "stretch", gap: 10,
      }}>
        {revealed && phase === "done" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px", borderRadius: 14,
            background: "rgba(115,140,230,0.10)",
            color: "#3d57b8",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 600, fontSize: 14,
            animation: "fade-in 240ms ease",
          }}>
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 22, height: 22, borderRadius: 11,
              background: "#738ce6", color: "#ffffff",
              flexShrink: 0,
            }}>
              <window.Icon.Check size={14} color="#ffffff" />
            </span>
            <span>Nice — that reads right.</span>
          </div>
        )}

        {revealed && phase !== "done" && !isCorrect && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px", borderRadius: 14,
            background: "rgba(254,77,1,0.08)",
            color: "#fe4d01",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 600, fontSize: 14,
            animation: "fade-in 240ms ease",
          }}>
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 22, height: 22, borderRadius: 11,
              background: "#fe4d01", color: "#ffffff",
              flexShrink: 0,
            }}>
              <span style={{ fontWeight: 800, fontSize: 14, lineHeight: 1 }}>!</span>
            </span>
            <span>Not quite — try building it again.</span>
          </div>
        )}

        <button
          onClick={(revealed && phase === "done") ? handleContinue : handleCheck}
          disabled={placed.length !== expectedLen && !(revealed && phase === "done")}
          style={{
            padding: "16px 32px", borderRadius: 999,
            background: (placed.length !== expectedLen && !(revealed && phase === "done")) ? "#efeeeb" : "#fe4d01",
            color: (placed.length !== expectedLen && !(revealed && phase === "done")) ? "#bebbb1" : "#ffffff",
            border: "none",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700, fontSize: 16, letterSpacing: 0.2,
            cursor: (placed.length !== expectedLen && !(revealed && phase === "done")) ? "default" : "pointer",
            boxShadow: (placed.length !== expectedLen && !(revealed && phase === "done"))
              ? "none"
              : "0 8px 22px rgba(254,77,1,0.32)",
            transition: "all 220ms ease",
          }}
        >
          {(revealed && phase === "done")
            ? (roundIdx + 1 >= SENTENCES.length ? "Finish" : "Continue")
            : (placed.length === expectedLen ? "Check" : `${remainingSlots} more`)}
        </button>
      </div>
    </window.PhoneFrame>
  );
}

// ---------- Answer Area ----------
// Single RTL row of placed blocks + dotted placeholders for empty slots.
// Wraps to the next line when out of width.
function AnswerArea({
  placed, findWord, expectedLen,
  onTapPlaced, revealed, isCorrect, shakeWrong, playingId, playWord,
}) {
  const slots = [];
  for (let i = 0; i < expectedLen; i++) {
    slots.push(placed[i] || null);
  }

  return (
    <div style={{
      background: "#faf9f6",
      border: "1px solid #efeeeb",
      borderRadius: 22,
      padding: "16px 14px",
      minHeight: 120,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div
        dir="rtl"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "flex-start",
          alignItems: "center",
          width: "100%",
        }}
      >
        {slots.map((id, idx) => {
          if (!id) {
            return (
              <span
                key={"slot-" + idx}
                style={{
                  display: "inline-block",
                  minWidth: 64, height: 56,
                  borderBottom: "2px dashed #d8d5cd",
                  flexShrink: 0,
                }}
              />
            );
          }
          const w = findWord(id);
          let state = "default";
          if (revealed) state = isCorrect ? "correct" : "wrong";

          // colors mirror WordBlock
          let bg = "#ffffff", fg = "#151515", trColor = "#9d998e";
          let brd = "1px solid #efeeeb";
          let shadow = "0 2px 6px rgba(21,21,21,0.04)";
          if (playingId === id) {
            bg = "#fe4d01"; fg = "#ffffff";
            trColor = "rgba(255,255,255,0.85)";
            brd = "1px solid #fe4d01";
            shadow = "0 8px 22px rgba(254,77,1,0.28)";
          }
          if (state === "correct") {
            bg = "rgba(115,140,230,0.10)"; fg = "#3d57b8";
            trColor = "rgba(61,87,184,0.7)";
            brd = "1px solid rgba(115,140,230,0.45)";
            shadow = "0 6px 18px rgba(115,140,230,0.18)";
          } else if (state === "wrong") {
            bg = "rgba(254,77,1,0.08)"; fg = "#fe4d01";
            trColor = "rgba(254,77,1,0.7)";
            brd = "1px solid rgba(254,77,1,0.4)";
            shadow = "none";
          }

          return (
            <button
              key={"slot-" + idx}
              onClick={() => {
                if (revealed) {
                  playWord(id);
                } else {
                  onTapPlaced(id);
                }
              }}
              className={state === "wrong" && shakeWrong ? "shake" : ""}
              style={{
                padding: "10px 14px 8px",
                background: bg, color: fg,
                border: brd, borderRadius: 14,
                boxShadow: shadow,
                cursor: "pointer",
                transition: "all 200ms ease",
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                minWidth: 56,
                transform: playingId === id ? "scale(1.04)" : "scale(1)",
              }}
            >
              <span
                dir="rtl" lang="ar"
                style={{
                  fontFamily: "'Reem Kufi', sans-serif",
                  fontSize: 22, fontWeight: 600, lineHeight: 1.4,
                  whiteSpace: "nowrap",
                }}
              >
                {w.ar}
              </span>
              <span style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontStyle: "italic",
                fontSize: 11, fontWeight: 500,
                color: trColor,
                letterSpacing: 0.1,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}>
                {w.tr}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<SentenceCompleteApp />);
