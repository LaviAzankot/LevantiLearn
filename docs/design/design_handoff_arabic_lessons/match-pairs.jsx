// Match Pairs lesson — Arabic ↔ English vocab matching

const PAIRS = [
  { id: "p1", arabic: "كَلْب", translit: "kalb", english: "Dog" },
  { id: "p2", arabic: "بَيْت", translit: "bayt", english: "House" },
  { id: "p3", arabic: "كِتَاب", translit: "kitāb", english: "Book" },
  { id: "p4", arabic: "مَاء", translit: "māʾ", english: "Water" },
  { id: "p5", arabic: "شَمْس", translit: "shams", english: "Sun" },
];

// Stable shuffled english order — looks shuffled, doesn't change between renders
const ENGLISH_ORDER = ["p3", "p5", "p1", "p4", "p2"];

function MatchPairsApp() {
  const [matched, setMatched] = React.useState(new Set()); // set of pair ids
  const [arabicSel, setArabicSel] = React.useState(null);
  const [englishSel, setEnglishSel] = React.useState(null);
  const [wrongFlash, setWrongFlash] = React.useState(null); // {arabic, english}
  const [completed, setCompleted] = React.useState(false);

  // when both sides selected, evaluate
  React.useEffect(() => {
    if (arabicSel && englishSel) {
      if (arabicSel === englishSel) {
        // correct
        const next = new Set(matched);
        next.add(arabicSel);
        setMatched(next);
        setTimeout(() => {
          setArabicSel(null);
          setEnglishSel(null);
        }, 350);
        if (next.size === PAIRS.length) {
          setTimeout(() => setCompleted(true), 700);
        }
      } else {
        // wrong — flash, then clear
        setWrongFlash({ arabic: arabicSel, english: englishSel });
        setTimeout(() => {
          setWrongFlash(null);
          setArabicSel(null);
          setEnglishSel(null);
        }, 600);
      }
    }
  }, [arabicSel, englishSel]);

  const reset = () => {
    setMatched(new Set());
    setArabicSel(null);
    setEnglishSel(null);
    setCompleted(false);
  };

  const PairCard = ({ pair, side, selected, isMatched, isWrong, onClick }) => {
    const baseBg = "#ffffff";
    const border = "1px solid #efeeeb";
    let bg = baseBg, fg = "#151515", brd = border, shadow = "0 2px 6px rgba(21,21,21,0.04)";
    let opacity = 1;
    let transform = "scale(1)";

    if (isMatched) {
      bg = "rgba(254,77,1,0.08)";
      fg = "#fe4d01";
      brd = "1px solid rgba(254,77,1,0.25)";
      shadow = "none";
      opacity = 0.6;
    } else if (selected) {
      bg = "#fe4d01";
      fg = "#ffffff";
      brd = "1px solid #fe4d01";
      shadow = "0 8px 22px rgba(254,77,1,0.28)";
      transform = "scale(1.02)";
    }

    return (
      <button
        onClick={onClick}
        disabled={isMatched}
        className={isWrong ? "shake" : ""}
        style={{
          width: "100%",
          height: "100%",
          padding: "16px 14px",
          minHeight: 70,
          background: bg, color: fg, border: brd, borderRadius: 18,
          boxShadow: shadow,
          cursor: isMatched ? "default" : "pointer",
          opacity,
          transform,
          transition: "all 220ms ease",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: side === "arabic" ? "'Reem Kufi', sans-serif" : "'Plus Jakarta Sans', sans-serif",
          fontSize: side === "arabic" ? 26 : 18,
          fontWeight: 600,
          textAlign: "center",
          lineHeight: side === "arabic" ? 1.6 : 1.3,
          direction: side === "arabic" ? "rtl" : "ltr",
          whiteSpace: "normal",
          overflowWrap: "break-word",
          wordBreak: "break-word",
          textWrap: "pretty",
        }}
      >
        {side === "arabic" ? pair.arabic : pair.english}
      </button>
    );
  };

  const completedPct = (matched.size / PAIRS.length);
  const stepDisplay = Math.min(matched.size + 1, PAIRS.length);

  return (
    <window.PhoneFrame tone="light" label="01 Match Pairs">
      <window.LessonHeader
        tone="light"
        onClose={() => {}}
        onBack={() => {}}
        onSkip={() => {}}
        step={matched.size}
        total={PAIRS.length}
      />
      <div style={{ padding: "14px 24px 0", flex: 1, display: "flex", flexDirection: "column", gap: 22, overflow: "hidden" }}>
        <window.Eyebrow>Match the Pairs</window.Eyebrow>

        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 22, fontWeight: 700, color: "#151515",
            lineHeight: 1.3, letterSpacing: -0.2,
          }}>
            Tap each Arabic word
          </div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 15, fontWeight: 500, color: "#9d998e",
            marginTop: 4,
          }}>
            …and its English meaning
          </div>
        </div>

        <div style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridAutoRows: "1fr",
          gap: 10,
          alignContent: "stretch",
        }}>
          {PAIRS.map((p, i) => {
            const enId = ENGLISH_ORDER[i];
            const enPair = PAIRS.find(x => x.id === enId);
            return (
              <React.Fragment key={"row-" + i}>
                <PairCard
                  pair={p}
                  side="arabic"
                  selected={arabicSel === p.id && !matched.has(p.id)}
                  isMatched={matched.has(p.id)}
                  isWrong={wrongFlash && wrongFlash.arabic === p.id}
                  onClick={() => !matched.has(p.id) && setArabicSel(p.id)}
                />
                <PairCard
                  pair={enPair}
                  side="english"
                  selected={englishSel === enPair.id && !matched.has(enPair.id)}
                  isMatched={matched.has(enPair.id)}
                  isWrong={wrongFlash && wrongFlash.english === enPair.id}
                  onClick={() => !matched.has(enPair.id) && setEnglishSel(enPair.id)}
                />
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Bottom action — appears when complete */}
      <div style={{
        padding: "20px 24px 36px",
        display: "flex", justifyContent: "center",
        flexShrink: 0,
      }}>
        {completed ? (
          <button
            onClick={reset}
            style={{
              padding: "16px 32px",
              borderRadius: 999,
              background: "#fe4d01", color: "#ffffff", border: "none",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700, fontSize: 16, letterSpacing: 0.2,
              cursor: "pointer",
              boxShadow: "0 8px 22px rgba(254,77,1,0.32)",
            }}
          >
            Continue
          </button>
        ) : (
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 13, fontWeight: 600, color: "#9d998e",
            letterSpacing: 0.2,
          }}>
            {matched.size} of {PAIRS.length} matched
          </div>
        )}
      </div>
    </window.PhoneFrame>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<MatchPairsApp />);
