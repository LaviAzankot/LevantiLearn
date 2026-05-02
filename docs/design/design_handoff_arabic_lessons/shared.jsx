// Shared design system for all Arabic lessons
// Exports onto window: Icon, IllustrationPlaceholder, MicButton, SpeakerButton,
// LessonHeader, PhoneFrame, COLORS

const COLORS = {
  // backgrounds
  pageBg: "#efeeeb",
  pageBgDark: "#0d0d0d",
  surface: "#faf9f6",
  surfaceDark: "#151515",
  card: "#ffffff",
  cardDark: "#1f1d1a",
  // foreground
  ink: "#151515",
  inkOnDark: "#faf9f6",
  muted: "#9d998e",
  divider: "#efeeeb",
  warm: "#46443f",
  // accents
  accent: "#fe4d01",
  cool: "#738ce6",
};

// ---------- icons ----------
const Icon = {
  Close: ({ size = 22, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round">
      <path d="M6 6 L18 18 M18 6 L6 18" />
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

// ---------- Illustration placeholder ----------
function IllustrationPlaceholder({ tone, label = "flat illustration", style = {} }) {
  const stripeColor = tone === "dark" ? "rgba(255,255,255,0.05)" : "rgba(21,21,21,0.05)";
  const stripeBg = tone === "dark" ? "#1f1d1a" : "#efeeeb";
  return (
    <div
      style={{
        background: `repeating-linear-gradient(135deg, ${stripeBg} 0 14px, ${stripeColor} 14px 15px)`,
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
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
  const fill = hue === "warm" ? "#fe4d01" : "#738ce6";
  const skin = tone === "dark" ? "#46443f" : "#bebbb1";
  return (
    <svg width="120" height="160" viewBox="0 0 120 160">
      <path d="M20 160 Q20 70 60 70 Q100 70 100 160 Z" fill={fill} opacity="0.92" />
      <circle cx="60" cy="46" r="26" fill={skin} />
    </svg>
  );
}

// ---------- Mic Button ----------
function MicButton({ state, onClick, accent = COLORS.accent, micStyle = "large" }) {
  const isListening = state === "listening";
  const isSuccess = state === "success";
  const isRetry = state === "retry";

  const bg = isRetry ? COLORS.warm : accent;
  const fg = "#ffffff";

  let content;
  if (isSuccess) content = <Icon.Check color={fg} />;
  else if (isRetry) content = <Icon.Retry color={fg} />;
  else content = <Icon.Mic color={fg} size={micStyle === "compact" ? 30 : 38} />;

  const size = micStyle === "compact" ? 72 : 96;

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
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

// ---------- Speaker button (white, sits on imagery / bubbles) ----------
function SpeakerButton({ onClick, playing, size = 44 }) {
  const bg = playing ? COLORS.accent : "#ffffff";
  const color = playing ? "#ffffff" : COLORS.accent;
  return (
    <button
      onClick={onClick}
      aria-label="Play audio"
      style={{
        width: size, height: size, borderRadius: size / 2,
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
      <Icon.Speaker color="currentColor" size={Math.round(size * 0.45)} />
    </button>
  );
}

// ---------- Header (close + back + progress + skip + count) ----------
function LessonHeader({ tone = "light", onClose, onBack, onSkip, step = 3, total = 7 }) {
  const trackBg = tone === "dark" ? "rgba(255,255,255,0.10)" : "#efeeeb";
  const fillBg = COLORS.accent;
  const fg = tone === "dark" ? COLORS.inkOnDark : COLORS.ink;
  const muted = COLORS.muted;

  const ArrowBtn = ({ direction, onClick: handler, ariaLabel }) => (
    <button
      onClick={handler}
      aria-label={ariaLabel}
      style={{
        width: 28, height: 28, borderRadius: 14, border: "none",
        background: "transparent",
        color: muted,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0, padding: 0,
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

// ---------- Phone frame (full-bleed mobile card centered on canvas) ----------
function PhoneFrame({ tone = "light", label, children }) {
  const bg = tone === "dark" ? COLORS.surfaceDark : COLORS.surface;
  const fg = tone === "dark" ? COLORS.inkOnDark : COLORS.ink;
  const pageBg = tone === "dark" ? COLORS.pageBgDark : COLORS.pageBg;

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: pageBg,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div
        data-screen-label={label}
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
        {children}
      </div>
    </div>
  );
}

// ---------- Section eyebrow ("LISTEN AND REPEAT" style label) ----------
function Eyebrow({ children }) {
  return (
    <div style={{
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      textAlign: "center",
      fontSize: 13, fontWeight: 700, letterSpacing: 1.6,
      textTransform: "uppercase",
      color: COLORS.accent,
    }}>
      {children}
    </div>
  );
}

Object.assign(window, {
  COLORS, Icon, IllustrationPlaceholder, FigureGlyph,
  MicButton, SpeakerButton, LessonHeader, PhoneFrame, Eyebrow,
});
