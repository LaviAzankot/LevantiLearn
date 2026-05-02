# Handoff: Arabic Lessons (5-screen lesson set)

## Overview
A bundle of **5 finalized lesson screens** for an Arabic language-learning app. All five share one design system (colors, type, mic, header, phone frame, bubbles, eyebrow). They are designed to live inside the same lesson player and rotate as different exercise types within a single session.

The five lessons:

| # | Lesson | What the user does |
|---|---|---|
| 1 | **Listen and Repeat** | Hears an Arabic phrase, repeats it into the mic. 1 phrase. |
| 2 | **Choose Translation** | Hears an Arabic word, picks the matching English option from 4. 4 rounds. |
| 3 | **Match Pairs** | Taps an Arabic word, then its English match. 5 pairs total. |
| 4 | **Sentence Complete** | Taps Arabic word-tiles in order to build the translation of an English prompt. 3 rounds. |
| 5 | **Dialogue** | A turn-by-turn chat — partner speaks, user replies into mic. 6 turns. |
| 6 | **Speak the Blank** | A 2-line dialogue with one blank in the user's reply. User speaks the missing word. 3 rounds. |

## ⚠️ Do not modify the design

The files in this bundle are **finalized design references**. Treat them as read-only specs.

- **Do not** change layout, spacing, typography, colors, copy, animations, or component structure.
- **Do not** "clean up," refactor, rename, reformat, or reorganize them.
- **Do not** swap inline styles for a CSS framework, or convert JSX patterns to a different style.
- **Do not** "improve" accessibility, responsiveness, or performance unless explicitly asked.

Your only job is to **recreate** these designs in the target codebase using its existing patterns and libraries. If something doesn't fit cleanly, **stop and ask** rather than redesigning.

## About the Design Files
The HTML/JSX files here are **design references** — prototypes built with in-browser Babel that show intended look and behavior. They are NOT production code to ship as-is. Recreate them in the target codebase's existing environment (React, Vue, SwiftUI, native, etc.) using its established components and patterns. If no environment exists yet, choose the most appropriate framework for the project.

The mocks use `setTimeout` to simulate audio playback and ~70-75% mock speech-recognition success. Wire these to real audio + a real ASR/STT service in the target app. Do not change the visual design while doing so.

## Fidelity
**High-fidelity (hifi).** Pixel-perfect. Recreate exactly: colors, type, spacing, radii, shadows, animation timing.

---

## Shared Design System (read this FIRST)

All five lessons share one system, exported from `shared.jsx` onto `window`. Reproduce these once in the target codebase as shared primitives — every lesson reuses them.

### Colors (from `shared.jsx` `COLORS`)
| Token | Value | Use |
|---|---|---|
| `pageBg` | `#efeeeb` | App background behind phone |
| `pageBgDark` | `#0d0d0d` | Dark mode bg |
| `surface` | `#faf9f6` | Phone surface |
| `surfaceDark` | `#151515` | Dark phone surface |
| `card` | `#ffffff` | Bubbles, tiles, toggle bg |
| `cardDark` | `#1f1d1a` | Dark bubbles |
| `divider` | `#efeeeb` | Hairline borders |
| `ink` | `#151515` | Primary text |
| `inkOnDark` | `#faf9f6` | Primary text on dark |
| `muted` | `#9d998e` | Secondary text, status labels |
| `warm` | `#46443f` | Retry mic bg, neutral text |
| `accent` (orange) | `#fe4d01` | Brand: mic, user bubble, eyebrow, primary CTA |
| `cool` (blue) | `#738ce6` | Partner avatar, info icon, success accents |
| `cool-deep` | `#3d57b8` | Cool-bg text, completion check |

### Typography
- **Plus Jakarta Sans** (Google Fonts, weights 400/500/600/700/800, italic 500) — all Latin text.
- **Reem Kufi** (Google Fonts, weights 500/600/700) — Arabic.
- **JetBrains Mono** (400/500) — info "i" glyph and placeholder labels only.

### Shared primitives
- `PhoneFrame({ tone, label, children })` — fixed 412×880 phone canvas, border-radius 36, centered on `#efeeeb` page bg, vertical flex column. `data-screen-label` is the slide label.
- `LessonHeader({ tone, onClose, onBack, onSkip, step, total })` — close (36×36 round, bg `#efeeeb`), back chevron, progress bar (height 12, track `#efeeeb`, fill `#fe4d01`, radius 999), skip chevron, step counter (e.g. `3/7`).
- `MicButton({ state, onClick, accent, micStyle })` — 96 (large) or 72 (compact) circle, accent bg, pulsing rings on `listening`, check on `success`, retry on `retry`, `#46443f` bg on retry.
- `SpeakerButton({ onClick, playing, size })` — white pill (or orange when playing), drops a soft shadow.
- `Eyebrow({ children })` — orange uppercase 13px / weight 700 / letter-spacing 1.6.
- `Icon` — Close, Mic, Speaker, Check, Retry. Stroke-based SVG, strokeWidth ~2.2-2.4.

### Shared keyframes (already in each HTML)
```css
@keyframes ring-pulse {
  0%   { transform: scale(0.85); opacity: 0.35; }
  80%  { transform: scale(1.4);  opacity: 0; }
  100% { transform: scale(1.4);  opacity: 0; }
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```
Per-lesson: Sentence Complete and Match Pairs add a `.shake` class for wrong answers; Speak the Blank adds `.sb-wave-bar` keyframes (no longer used in the latest version but harmless).

### Spacing / radii / shadows (apply across all lessons)
- Phone outer padding: 24px. Header: `14/20/8`. Eyebrow: `10/24/0`. Conversation/content area: `16/20/6`, gap 14.
- Pill buttons: radius 999. Cards/info: 16. Bubbles: `20/20/6/20` (you) or `20/20/20/6` (them). Tiles: 14. Mic: 50%.
- Phone shadow: `0 30px 80px rgba(21,21,21,0.18), 0 8px 20px rgba(21,21,21,0.08)`
- Mic idle: `0 8px 22px rgba(254,77,1,0.32), 0 2px 6px rgba(0,0,0,0.08)`
- Mic listening adds `0 0 0 6px rgba(254,77,1,0.13)` outer ring (rendered as two pulsing absolute spans, not box-shadow).
- Light bubble: `0 2px 10px rgba(21,21,21,0.05)`. Orange bubble: `0 4px 14px rgba(254,77,1,0.20)`.
- Primary CTA shadow: `0 8px 22px rgba(254,77,1,0.32)`.

---

## Per-lesson specs

> Each lesson's exact data, rendering rules and state machine lives in its `.jsx` file. Read those alongside the high-level spec below.

### 1. Listen and Repeat — `lesson.jsx` / `Listen and Repeat.html`
- **Goal:** show one Arabic phrase + illustration, user repeats it into the mic.
- **Layouts (Tweakable):** `stacked` (image card on top, phrase, mic), `card` (phrase + image inside one floating card), `bold` (full-bleed image up top with sheet drawer).
- **Components per layout:**
  - `IllustrationPlaceholder` (striped 135° lines + mono caption) — replace with real illustration in production.
  - `SpeakerButton` floating top-right of image — auto-plays on tap; 1400ms simulated playback.
  - `PhraseBlock` — Arabic (Reem Kufi 44px, weight 600, line-height 1.7), italic transliteration (17px), English caption (18px).
  - `MicButton` (large) at bottom; 2000ms listening, 70% success.
- **State machine:** mic `idle | listening | success | retry`. Tap during listening cancels.
- **Tweaks**: `layout`, `dark`, `showTranslit`, `micStyle` (large/compact), `accent`.
- **Phrase data:**
  - arabic: `السَّلامُ عَلَيْكُم`
  - translit: `as-salāmu ʿalaykum`
  - english: `Peace be upon you`
  - context: `A common greeting, used any time of day.`
  - 7 total steps, currently on step 3 (header progress).

### 2. Choose Translation — `choose-translation.jsx` / `Choose Translation.html`
- **Goal:** hear an Arabic word, pick correct English meaning out of 4 options.
- **Layout (top → bottom):** header → eyebrow ("Choose the meaning") → big Arabic word + translit + speaker pill → 4 option cards (2×2 grid) → status + check button.
- **Option card:** rounded rect (radius 14), white bg, border `1px solid #efeeeb`. Selected: orange border + faint orange wash. After Check: correct = blue wash + check icon, wrong (selected) = red wash + cross + shakes.
- **Audio auto-plays on round entry**; 1300ms simulated.
- **State machine:** `idle (no selection) → selected → revealed (after Check) → next round`.
- **Rounds:** 4 (`Dog`, `Book`, `Sun`, `House`).
- **Completion:** "All set!" with X/4 score; reset on Continue.

### 3. Match Pairs — `match-pairs.jsx` / `Match Pairs.html`
- **Goal:** match 5 Arabic words to their English meanings.
- **Layout:** header → eyebrow ("Match the pairs") → two-column grid: Arabic tiles (left, RTL inside) and English tiles (right, shuffled). Tap one from each side; correct = both fade out (matched), wrong = brief red flash + shake, then clear.
- **Tile:** white card, radius 14, padding `12px 14px`, Arabic Reem Kufi 22px / weight 600, translit italic 11px under it; English Plus Jakarta Sans 16px / weight 600.
- **Selected state:** orange border + faint orange wash, scale 1.04.
- **Pair data:** `كَلْب/Dog`, `بَيْت/House`, `كِتَاب/Book`, `مَاء/Water`, `شَمْس/Sun`. English shuffled order: `[p3, p5, p1, p4, p2]`.
- **Completion:** "Pairs matched" celebration screen.

### 4. Sentence Complete — `sentence-complete.jsx` / `Sentence Complete.html`
- **Goal:** translate an English sentence into Arabic by tapping word tiles in order.
- **Layout:** header → eyebrow ("Build the Sentence") → centered English prompt ("Translate this sentence" / `“{english}”`) → answer area (RTL row of placed tiles + dotted slot for empties) → optional "Now you try — match this" reference card during practice phase → bank of word tiles → status pill + Check/Continue button.
- **Tile:** same shape as Match Pairs tile (radius 14, Arabic + translit). Tap bank tile → adds to next slot. Tap placed tile → returns it to bank.
- **Phases:** `attempt → check → done` (correct first try) or `attempt → check (wrong) → practice (shows correct sentence above; user must rebuild) → done`.
- **Wrong on first try:** placed tiles flash red and shake (animation `shake 500ms`); then clear and enter practice phase.
- **Rounds (3):** `Peace be upon you`, `I want water, please`, `The book is on the table`.
- **Completion:** "Sentences built" with first-try score.

### 5. Dialogue — `dialogue.jsx` / `Dialogue.html`
- **Goal:** turn-by-turn conversation with a partner. User speaks their turns into the mic.
- **Layout:** header (progress = user-turns done / total user-turns) → eyebrow ("Dialogue · Greetings") → scrolling chat → bottom bar (mic when user's turn, typing dots when partner's turn).
- **Bubble:** see Speak the Blank spec — same structure but partner ("them") avatar is **blue** (`#738ce6`) and **has an inline speaker pill on the left of the Arabic text** (30×30 round, faint-orange bg). User bubble is filled orange when completed; ghost-dashed white while it's the user's turn.
- **State machine:** `idx` = current turn. Partner turns auto-advance after 1600ms. User turn waits for mic; 1800ms listening, 75% success.
- **Dialogue:** 6 turns total (3 partner / 3 user) — see file. Greetings vocabulary: `marḥaban`, `ahlan`, `kayfa ḥāluk`, `bi-khayr shukran`, `mā ismuk`, `ismī Sāra`.
- **Completion:** Continue button resets the conversation.

### 6. Speak the Blank — `speak-blank.jsx` / `Speak the Blank.html`
- **Goal:** in a 2-line dialogue, the user's reply has one blank — they speak the missing Arabic word.
- **Layout:** header → eyebrow ("Speak to fill the blank") → blue context card → 2-bubble conversation → bottom bar (Show answer toggle + large Mic + spacer for balance).
- **Blank treatment:** plain inline rectangle. On light bubble: `min-width 96, height fontSize+10, bg #faf9f6, border 1.5px solid #d8d5cd, radius 8`. Listening: bg `#ffece0`, border `1.5px solid #fe4d01`. Retry: border `1.5px solid #46443f`. When revealed/success: replaced with the Arabic answer (orange or white depending on bubble bg).
- **English line ALWAYS highlights the target word in orange + bold + faint underline** (so the learner knows what they're trying to say) — even before answering.
- **Bubble tap = play audio.** Partner line auto-plays 500ms after entering each round. No separate per-bubble play button. No bottom replay button.
- **State machine:** `idle | listening | success | retry`. 1800ms listening, 75% success. On success, advance to next round after 1100ms.
- **Rounds:** 3 (`an-nūr`, `bi-khayr`, `qahwa`).
- **Completion:** "Conversation done" with the cool-blue check circle.

---

## Cross-cutting interactions

### Audio playback (all lessons)
- Each Arabic line / word / phrase needs its own audio asset. Suggested keying:
  - Listen and Repeat: `lr/<phrase-id>.mp3`
  - Choose Translation: `ct/<round-id>.mp3` (the Arabic word)
  - Match Pairs: `mp/<pair-id>.mp3` (optional — currently no audio in mock)
  - Sentence Complete: `sc/<word-id>.mp3` per bank word
  - Dialogue: `dlg/<turn-idx>.mp3` per partner turn (and optionally user turns for replay)
  - Speak the Blank: `sb/<round-id>-<line-idx>.mp3`
- Mock playback duration is fixed (~1300ms). Replace with real durations.

### Speech recognition (Listen and Repeat, Dialogue, Speak the Blank)
- Mock fakes 70-75% success after 1800-2000ms of listening.
- Replace with real ASR (Web Speech API, Whisper, your STT vendor).
- Match strategy: normalize (strip diacritics, lower/upper, trim) then compare against expected Arabic. Optional: phonetic similarity threshold.
- On success → state `success`, advance after ~1100ms. On failure → state `retry`, user re-taps mic to try again.

### State across lessons
Each lesson is self-contained. The lesson player just needs:
```ts
type LessonOutcome =
  | { kind: "completed", correctOnFirstTry?: number, totalRounds: number }
  | { kind: "skipped" }
  | { kind: "abandoned" };
```
Wire `onClose` / `onBack` / `onSkip` in `LessonHeader` to your router.

---

## Design Tokens (consolidated)

### Spacing scale (px)
2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36 — that's it.

### Font sizes (px)
- Microcopy: 11, 12, 13
- Body: 14, 16, 17, 18
- Display: 22, 26, 28, 44 (Listen and Repeat phrase only)

### Radius scale
- 4 (mini blanks), 8 (blank rect), 11 (info bubble), 14 (tiles), 16 (cards), 18 (close button), 20 (bubble outer), 22 (answer container, mic compact), 28 (sheet/card), 32 (sheet rounded), 36 (phone), 44 (completion icon), 999 (pills/progress).

---

## Assets
- **Fonts**: Google Fonts — Plus Jakarta Sans, Reem Kufi, JetBrains Mono. Already linked in every HTML head.
- **Icons**: All inline SVGs in `shared.jsx` (`Icon`) plus per-lesson eye/info/speaker variants. No external icon set required.
- **Illustrations**: `IllustrationPlaceholder` (striped + monospace caption) in `lesson.jsx` and `shared.jsx`. **Replace with real flat illustrations in production.** Don't ship the placeholder.
- **Audio**: NOT included. See "Audio playback" above.
- **ASR**: NOT included. See "Speech recognition" above.

---

## Files in this bundle
- `Listen and Repeat.html` + `lesson.jsx`
- `Choose Translation.html` + `choose-translation.jsx`
- `Match Pairs.html` + `match-pairs.jsx`
- `Sentence Complete.html` + `sentence-complete.jsx`
- `Dialogue.html` + `dialogue.jsx`
- `Speak the Blank.html` + `speak-blank.jsx`
- `shared.jsx` — `Icon`, `MicButton`, `SpeakerButton`, `LessonHeader`, `PhoneFrame`, `Eyebrow`, `IllustrationPlaceholder`, `COLORS`. Used by every lesson.
- `tweaks-panel.jsx` — design-time controls (preview-only; **strip in production**).

## Integration order (recommended)
Build the shared layer first, then add lessons one by one in this order — each gets harder than the last:

1. **Shared primitives** — `COLORS`, `Icon`, `PhoneFrame`, `LessonHeader`, `Eyebrow`, `MicButton`, `SpeakerButton`. Match the spec pixel-perfect with a Storybook page or screen tour.
2. **Choose Translation** — simplest interaction (4 buttons, 1 audio).
3. **Match Pairs** — pairing logic + matched/unmatched states.
4. **Sentence Complete** — placement queue + answer-area + practice phase. Most state of any lesson.
5. **Listen and Repeat** — first lesson with the mic + ASR. Verify your speech pipeline here.
6. **Dialogue** — multi-turn chat using the bubble + mic + auto-advance pattern.
7. **Speak the Blank** — combines bubbles, mic, and the inline blank rectangle.

## Integration notes (target codebase)
- These files are written for in-browser Babel (`<script type="text/babel">`). In a real React project, they convert to standard `import`/`export` modules. That is an integration change, not a design change.
- The `tweaks-panel.jsx` imports and the `useTweaks` hook are preview-only. Strip them in production.
- The `PhoneFrame` wrapper is for the design canvas. In the actual app, the lesson should fill the device viewport directly — drop the centered phone frame and use the inner column layout as the screen.
- Each lesson exports its component the same way: it grabs `window.PhoneFrame`, `window.LessonHeader`, etc. In production, replace those with normal imports from a shared module.

## If something doesn't fit
**Stop and ask.** Do not redesign or "improve" the spec. The visual language here is shared across all six lessons; changing it in isolation breaks the family.
