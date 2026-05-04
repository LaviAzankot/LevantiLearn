// Arabic Basics — single read-only-but-interactive lesson page.
// 3 sections: Background → Greetings (gender-aware) → Subject pronouns.

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
  cool: "#738ce6",
  coolDeep: "#3d57b8",
  coolWash: "rgba(115,140,230,0.08)",
};

// ---------- Generic atoms ----------

function Eyebrow({ color = C.accent, children }) {
  return (
    <div style={{
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: 12, fontWeight: 700,
      letterSpacing: 1.6, textTransform: "uppercase",
      color,
    }}>{children}</div>
  );
}

function SectionTitle({ kicker, kickerColor, title, sub }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
      <Eyebrow color={kickerColor}>{kicker}</Eyebrow>
      <h2 style={{
        margin: 0,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 26, fontWeight: 800, color: C.ink,
        letterSpacing: -0.4,
        lineHeight: 1.15,
      }}>{title}</h2>
      {sub && (
        <p style={{
          margin: 0,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 14, fontWeight: 500, color: C.muted,
          lineHeight: 1.55,
        }}>{sub}</p>
      )}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.hair}`,
      borderRadius: 20,
      padding: "20px 20px 18px",
      boxShadow: "0 1px 2px rgba(21,21,21,0.04), 0 6px 18px rgba(21,21,21,0.04)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function SpeakerGlyph({ playing, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none" />
      {playing && <path d="M16 9a4 4 0 0 1 0 6" />}
      {playing && <path d="M19 6a8 8 0 0 1 0 12" />}
    </svg>
  );
}

// Tap-to-"play" button. Mock — no real audio. Pulses for ~1.1s.
function PlayPill({ id, label, playing, onPlay }) {
  return (
    <button
      onClick={() => onPlay(id)}
      aria-label={label || "Play audio"}
      style={{
        appearance: "none", border: "none", cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 34, height: 34, borderRadius: 999,
        background: playing ? C.accent : "#ffffff",
        color: playing ? "#ffffff" : C.inkSoft,
        boxShadow: playing
          ? "0 4px 14px rgba(254,77,1,0.35)"
          : "0 1px 2px rgba(21,21,21,0.06), inset 0 0 0 1px " + C.hair,
        flexShrink: 0,
        transition: "all 200ms ease",
      }}
    >
      <SpeakerGlyph playing={playing} size={16} />
    </button>
  );
}

// ---------- Section 1: Background ----------

function BackgroundSection() {
  // Pronunciation toggle on a single tricky letter — interactive demo
  const [letter, setLetter] = React.useState("ق"); // qaf default
  const variants = [
    { id: "ق", label: "Qaf", msa: "qa", lev: "ʔa", note: "Classical 'q'", note2: "In Levantine, often a glottal stop." },
    { id: "ج", label: "Jīm", msa: "ja", lev: "ja / ʒa", note: "Hard 'j' in MSA", note2: "Soft 'zh' in some Levantine cities." },
    { id: "ث", label: "Thāʾ", msa: "tha", lev: "ta / sa", note: "English 'th' in MSA", note2: "Often becomes 't' or 's' in Levantine." },
  ];
  const cur = variants.find((v) => v.id === letter);

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle
        kicker="01 · Background"
        kickerColor={C.accent}
        title="A few things to know first"
        sub="You're learning Levantine Arabic — the everyday spoken Arabic of Syria, Lebanon, Jordan and Palestine. It's close to Modern Standard Arabic, but with a softer, looser pronunciation."
      />

      {/* Three quick info chips */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 10,
      }}>
        <InfoRow
          tone="warm"
          title="It's regional"
          body="Levantine is spoken, not formal. Newspapers and the Qur'an use Modern Standard Arabic — but on the street, on TV, between friends, it's Levantine."
        />
        <InfoRow
          tone="cool"
          title="It has gender"
          body="Every noun and many verbs change depending on whether you're addressing a man or a woman. 'You' isn't one word — it's two."
        />
        <InfoRow
          tone="warm"
          title="Pronunciation flexes"
          body="Some letters are pronounced one way in the formal language and a softer way in everyday Levantine speech. Tap a letter below to hear how."
        />
      </div>

      {/* Letter pronunciation toggle */}
      <div style={{
        marginTop: 6,
        background: C.surface,
        border: `1px solid ${C.hair}`,
        borderRadius: 16,
        padding: "16px 16px 14px",
      }}>
        <div style={{
          display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap",
        }}>
          {variants.map((v) => {
            const active = v.id === letter;
            return (
              <button
                key={v.id}
                onClick={() => setLetter(v.id)}
                style={{
                  appearance: "none", cursor: "pointer",
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: active ? C.ink : "#ffffff",
                  color: active ? "#ffffff" : C.inkSoft,
                  border: active ? "1px solid " + C.ink : "1px solid " + C.hair,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13, fontWeight: 600, letterSpacing: 0.1,
                  transition: "all 180ms ease",
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}
              >
                <span dir="rtl" lang="ar" style={{
                  fontFamily: "'Reem Kufi', sans-serif",
                  fontSize: 18, fontWeight: 700,
                }}>{v.id}</span>
                {v.label}
              </button>
            );
          })}
        </div>

        {/* Two-side comparison */}
        <div key={cur.id} style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
          animation: "fade-in 220ms ease",
        }}>
          <PronCell label="Formal · MSA" value={cur.msa} note={cur.note} />
          <PronCell label="Levantine"    value={cur.lev} note={cur.note2} accent />
        </div>
      </div>
    </Card>
  );
}

function InfoRow({ tone, title, body }) {
  const isWarm = tone === "warm";
  const dotBg = isWarm ? C.accentWash : C.coolWash;
  const dotFg = isWarm ? C.accent    : C.coolDeep;
  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "flex-start",
      padding: "10px 0",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 14,
        background: dotBg, color: dotFg,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 13, fontWeight: 800,
      }}>·</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 14, fontWeight: 700, color: C.ink,
        }}>{title}</div>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13, fontWeight: 500, color: C.muted,
          lineHeight: 1.5,
        }}>{body}</div>
      </div>
    </div>
  );
}

function PronCell({ label, value, note, accent }) {
  return (
    <div style={{
      background: accent ? C.accentWash : "#ffffff",
      border: `1px solid ${accent ? "rgba(254,77,1,0.18)" : C.hair}`,
      borderRadius: 12,
      padding: "12px 14px",
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase",
        color: accent ? C.accent : C.muted,
      }}>{label}</div>
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 22, fontWeight: 700, color: C.ink,
        letterSpacing: -0.3,
      }}>{value}</div>
      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 12, fontWeight: 500, color: C.muted,
        lineHeight: 1.4,
      }}>{note}</div>
    </div>
  );
}

// ---------- Section 2: Greetings (gender-aware) ----------

const GREETINGS = [
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
    masculine: { arabic: "كَيْفَ حَالَك؟", translit: "kīf ḥālak", note: "to a man" },
    feminine:  { arabic: "كَيْفَ حَالِك؟", translit: "kīf ḥālik", note: "to a woman" },
    use: "The ending shifts: ‑ak for him, ‑ik for her.",
  },
  {
    id: "g6",
    meaning: "Nice to meet you",
    gendered: true,
    masculine: { arabic: "تَشَرَّفْتُ بِك",  translit: "tsharrafit fīk",  note: "to a man" },
    feminine:  { arabic: "تَشَرَّفْتُ بِكِ", translit: "tsharrafit fīki", note: "to a woman" },
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

function GreetingsSection({ playingId, onPlay }) {
  const [audience, setAudience] = React.useState("him"); // 'him' | 'her'

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle
        kicker="02 · Greetings"
        kickerColor={C.accent}
        title="Saying hello"
        sub="Most greetings are unisex. Some change depending on whether you're greeting a man or a woman — toggle below to see the difference."
      />

      <AudienceToggle value={audience} onChange={setAudience} />

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {GREETINGS.map((g, i) => (
          <GreetingRow
            key={g.id}
            g={g}
            audience={audience}
            playing={playingId === g.id}
            onPlay={onPlay}
            isLast={i === GREETINGS.length - 1}
          />
        ))}
      </div>
    </Card>
  );
}

function AudienceToggle({ value, onChange }) {
  const opts = [
    { id: "him", label: "to him",  ar: "أَنتَ", translit: "anta" },
    { id: "her", label: "to her",  ar: "أَنتِ", translit: "anti" },
  ];
  return (
    <div style={{
      display: "inline-flex",
      alignSelf: "flex-start",
      background: C.surface,
      border: `1px solid ${C.hair}`,
      borderRadius: 999,
      padding: 4,
      gap: 4,
    }}>
      {opts.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            style={{
              appearance: "none", cursor: "pointer",
              padding: "8px 14px",
              borderRadius: 999,
              background: active ? C.accent : "transparent",
              color: active ? "#ffffff" : C.inkSoft,
              border: "none",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13, fontWeight: 700, letterSpacing: 0.2,
              display: "inline-flex", alignItems: "center", gap: 8,
              transition: "all 180ms ease",
            }}
          >
            <span dir="rtl" lang="ar" style={{
              fontFamily: "'Reem Kufi', sans-serif",
              fontSize: 15, fontWeight: 700,
            }}>{o.ar}</span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function GreetingRow({ g, audience, playing, onPlay, isLast }) {
  const variant = g.gendered
    ? (audience === "him" ? g.masculine : g.feminine)
    : null;

  const arabic = g.gendered ? variant.arabic : g.arabic;
  const translit = g.gendered ? variant.translit : g.translit;

  return (
    <div className="ab-row" style={{
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      gap: 14,
      alignItems: "center",
      padding: "14px 4px",
      borderBottom: isLast ? "none" : `1px solid ${C.hair}`,
    }}>
      <PlayPill id={g.id} playing={playing} onPlay={onPlay} label={g.meaning} />

      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span dir="rtl" lang="ar" style={{
            fontFamily: "'Reem Kufi', sans-serif",
            fontSize: 22, fontWeight: 600, color: C.ink,
            lineHeight: 1.3,
          }}>{arabic}</span>
          <span style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontStyle: "italic",
            fontSize: 13, color: C.muted, fontWeight: 500,
          }}>{translit}</span>
        </div>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13, fontWeight: 500, color: C.muted,
          lineHeight: 1.45,
        }}>
          <span style={{ color: C.inkSoft, fontWeight: 600 }}>{g.meaning}</span>
          {" · " + g.use}
        </div>
      </div>

      {g.gendered && (
        <div style={{
          padding: "4px 8px",
          borderRadius: 999,
          background: audience === "him" ? "rgba(115,140,230,0.10)" : C.accentWash,
          color: audience === "him" ? C.coolDeep : C.accent,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
          textTransform: "uppercase",
          flexShrink: 0,
        }}>
          {audience === "him" ? "to him" : "to her"}
        </div>
      )}
    </div>
  );
}

// ---------- Section 3: Subject pronouns ----------

const PRONOUNS = [
  { id: "p1", arabic: "أَنَا",    translit: "ana",   english: "I",          person: "1st", number: "singular", gender: "any",   note: "Same for men and women." },
  { id: "p2", arabic: "أَنْتَ",   translit: "anta",  english: "You",        person: "2nd", number: "singular", gender: "m",     note: "Speaking to a man." },
  { id: "p3", arabic: "أَنْتِ",   translit: "anti",  english: "You",        person: "2nd", number: "singular", gender: "f",     note: "Speaking to a woman." },
  { id: "p4", arabic: "هُوَ",     translit: "huwa",  english: "He / it",    person: "3rd", number: "singular", gender: "m",     note: "Also used for masculine objects." },
  { id: "p5", arabic: "هِيَ",     translit: "hiya",  english: "She / it",   person: "3rd", number: "singular", gender: "f",     note: "Also used for feminine objects." },
  { id: "p6", arabic: "نَحْنُ",    translit: "naḥnu", english: "We",         person: "1st", number: "plural",   gender: "any",   note: "Mixed groups too." },
  { id: "p7", arabic: "أَنْتُم",   translit: "antum", english: "You all",    person: "2nd", number: "plural",   gender: "any",   note: "Use for any group." },
  { id: "p8", arabic: "هُم",       translit: "hum",   english: "They",       person: "3rd", number: "plural",   gender: "any",   note: "Use for any group." },
];

function PronounsSection({ playingId, onPlay }) {
  const [filter, setFilter] = React.useState("all"); // all | sing | plur

  const filtered = PRONOUNS.filter((p) =>
    filter === "all" ? true :
    filter === "sing" ? p.number === "singular" :
    p.number === "plural"
  );

  const filters = [
    { id: "all",  label: "All" },
    { id: "sing", label: "Singular" },
    { id: "plur", label: "Plural" },
  ];

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionTitle
        kicker="03 · Pronouns"
        kickerColor={C.coolDeep}
        title="Subject pronouns"
        sub="Eight words cover 'I, you, he, she, we, you all, they'. Notice how 'you' splits into masculine and feminine — that pattern repeats everywhere in Arabic."
      />

      {/* Filter */}
      <div style={{
        display: "inline-flex",
        alignSelf: "flex-start",
        background: C.surface,
        border: `1px solid ${C.hair}`,
        borderRadius: 999,
        padding: 4,
        gap: 4,
      }}>
        {filters.map((f) => {
          const active = f.id === filter;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                appearance: "none", cursor: "pointer",
                padding: "7px 14px",
                borderRadius: 999,
                background: active ? C.coolDeep : "transparent",
                color: active ? "#ffffff" : C.inkSoft,
                border: "none",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 12, fontWeight: 700, letterSpacing: 0.2,
                transition: "all 180ms ease",
              }}
            >{f.label}</button>
          );
        })}
      </div>

      {/* Grid of pronoun cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
      }}>
        {filtered.map((p) => (
          <PronounCard
            key={p.id}
            p={p}
            playing={playingId === p.id}
            onPlay={onPlay}
          />
        ))}
      </div>
    </Card>
  );
}

function PronounCard({ p, playing, onPlay }) {
  const genderTag =
    p.gender === "m" ? { label: "masculine", color: C.coolDeep, bg: "rgba(115,140,230,0.10)" } :
    p.gender === "f" ? { label: "feminine",  color: C.accent,   bg: C.accentWash } :
                       { label: "any",       color: C.muted,    bg: C.surface };

  return (
    <div
      onClick={() => onPlay(p.id)}
      style={{
        cursor: "pointer",
        background: playing ? C.accentWash : "#ffffff",
        border: `1px solid ${playing ? "rgba(254,77,1,0.4)" : C.hair}`,
        borderRadius: 16,
        padding: "14px 14px 12px",
        display: "flex", flexDirection: "column", gap: 6,
        boxShadow: playing
          ? "0 4px 14px rgba(254,77,1,0.15)"
          : "0 1px 2px rgba(21,21,21,0.04)",
        transition: "all 200ms ease",
        position: "relative",
        animation: "pop-in 240ms ease",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase",
          color: C.muted,
        }}>{p.english}</div>
        <SpeakerGlyph playing={playing} size={14} />
      </div>

      <div dir="rtl" lang="ar" style={{
        fontFamily: "'Reem Kufi', sans-serif",
        fontSize: 28, fontWeight: 600, color: C.ink,
        lineHeight: 1.2, textAlign: "right",
      }}>{p.arabic}</div>

      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontStyle: "italic", fontSize: 13, fontWeight: 500,
        color: C.inkSoft,
        textAlign: "right",
      }}>{p.translit}</div>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: 4, gap: 8,
      }}>
        <span style={{
          padding: "3px 8px", borderRadius: 999,
          background: genderTag.bg, color: genderTag.color,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase",
          flexShrink: 0,
        }}>{genderTag.label}</span>
        <span style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 11, fontWeight: 600, color: C.muted2,
          textTransform: "lowercase",
        }}>{p.number}</span>
      </div>
    </div>
  );
}

// ---------- Header / hero ----------

function Hero({ progressPct }) {
  return (
    <div style={{
      background: "linear-gradient(180deg, #ffffff 0%, #faf9f6 100%)",
      borderBottom: `1px solid ${C.hair}`,
      padding: "20px 28px 22px",
      position: "sticky",
      top: 0,
      zIndex: 5,
      backdropFilter: "blur(8px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 11, fontWeight: 500, color: C.muted,
          letterSpacing: 0.4,
        }}>
          UNIT 01 · ARABIC · LEVANTINE
        </div>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 12, fontWeight: 700, color: C.muted,
          letterSpacing: 0.2,
        }}>
          Read-only lesson
        </div>
      </div>
      <h1 style={{
        margin: 0,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 30, fontWeight: 800, color: C.ink,
        letterSpacing: -0.6,
        lineHeight: 1.1,
      }}>
        Arabic, the basics
      </h1>
      <p style={{
        margin: "8px 0 0",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 14, fontWeight: 500, color: C.muted,
        lineHeight: 1.5,
        maxWidth: 520,
      }}>
        A quick orientation to <span dir="rtl" lang="ar" style={{ fontFamily: "'Reem Kufi', sans-serif", fontWeight: 600, color: C.inkSoft }}>العَرَبِيَّة</span> — what kind of Arabic you'll learn, how to greet someone, and the words for "I, you, he, she."
      </p>

      {/* Section index */}
      <div style={{
        marginTop: 18,
        display: "flex", gap: 6, alignItems: "center",
      }}>
        {["Background", "Greetings", "Pronouns"].map((label, i) => (
          <React.Fragment key={label}>
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 12, fontWeight: 700,
              color: C.inkSoft, letterSpacing: 0.2,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: 9,
                background: i === 0 ? C.accent : (i === 1 ? C.accent : C.coolDeep),
                color: "#ffffff",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800,
              }}>{"0" + (i + 1)}</span>
              {label}
            </div>
            {i < 2 && (
              <div style={{
                width: 18, height: 1, background: C.hair, margin: "0 4px",
              }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ---------- App ----------

function ArabicBasicsApp() {
  // shared "playing audio" id — only one item plays at a time
  const [playingId, setPlayingId] = React.useState(null);
  const timerRef = React.useRef(null);

  const onPlay = (id) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPlayingId(id);
    timerRef.current = setTimeout(() => setPlayingId(null), 1100);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: C.surface,
      display: "flex", justifyContent: "center",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 720,
        background: C.surface,
        borderLeft: `1px solid ${C.hair}`,
        borderRight: `1px solid ${C.hair}`,
      }}>
        <Hero />

        <div style={{
          padding: "22px 22px 80px",
          display: "flex", flexDirection: "column", gap: 18,
        }}>
          <BackgroundSection />
          <GreetingsSection playingId={playingId} onPlay={onPlay} />
          <PronounsSection playingId={playingId} onPlay={onPlay} />

          {/* Footer note */}
          <div style={{
            marginTop: 6,
            padding: "16px 18px",
            background: C.coolWash,
            border: `1px solid rgba(115,140,230,0.22)`,
            borderRadius: 16,
            display: "flex", gap: 12, alignItems: "flex-start",
          }}>
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 22, height: 22, borderRadius: 11,
              background: C.cool, color: "#ffffff",
              flexShrink: 0, marginTop: 1,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, fontWeight: 700,
            }}>i</span>
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13, fontWeight: 500, color: C.coolDeep,
              lineHeight: 1.5,
            }}>
              This is an introduction page — nothing to memorise yet. The next lessons will drill greetings, then pronouns, then put them together in short conversations.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ArabicBasicsApp />);
