# LevantiLearn — Babbel UI/UX Redesign Plan

## Goal
Redesign LevantiLearn to match Babbel's clean, motivating UI/UX with real audio (OpenAI TTS) and speech recognition (faster-whisper). Scope: greetings_001 lesson only for new exercise types; design system applies globally.

---

## Status Legend
- `[ ]` not started
- `[~]` in progress
- `[x]` complete

---

## Phase 1 — Design System Update ✅
**Files:** `frontend/src/theme.ts`

- [x] Replace `#FF6B00` → `#fe4d01`
- [x] Replace `#F8F9FA` → `#f6f4ef`
- [x] Add `label: '#68665f'`
- [x] text: `#151515`
- [x] Lesson screen COLORS updated inline

---

## Phase 2 — Home Screen Hero Card ✅
**Files:** `frontend/app/(tabs)/index.tsx`

- [x] Replaced CTA button with floating hero card
- [x] Unsplash image + lesson title overlay + "התחל שיעור" button
- [x] `marginHorizontal: 20`, `borderRadius: 20`, shadow

---

## Phase 3 — Backend: STT Endpoint ✅ (already existed)
`/api/stt/score` was already implemented in `backend/api/stt.py`.
Uses OpenAI Whisper API with local Whisper fallback.

---

## Phase 4 — Lesson JSON Redesign (greetings_001) ✅
**Files:** `backend/data/lessons/greetings_001.json`

New stage structure (replaces all current stages):
```
stages:
  Round 1 (words 1-3):
    - listen_repeat  (w001)
    - choose_translation (w001, 3 distractors from lesson words)
    - write_translation (w001)
    - listen_repeat  (w002)
    - choose_translation (w002)
    - write_translation (w002)
    - listen_repeat  (w003)
    - choose_translation (w003)
    - write_translation (w003)
  Round 2 (words 4-5):
    - listen_repeat  (w004)
    - choose_translation (w004)
    - write_translation (w004)
    - listen_repeat  (w005)
    - choose_translation (w005)
    - write_translation (w005)
  Dialogue:
    - dialogue (existing scene, with gap-fill on user turns)
  Post-dialogue:
    - match_pairs (all 5 words)
    - listen_choose (2 words, 2 choices each)
    - sentence_complete (1 sentence from dialogue)
```

Each stage object shape:
- `listen_repeat`: `{ type, word_id, arabic, hebrew, hebrew_pronunciation, image_url }`
- `choose_translation`: `{ type, word_id, arabic, correct_hebrew, distractors: [str x3], all have image_url }`
- `write_translation`: `{ type, word_id, arabic, hebrew, image_url, letter_blocks: [char] }`
- `dialogue`: `{ type, scene, context_label, lines: [...], user_turns: [{ line_index, target_word, letter_blocks }] }`
- `match_pairs`: `{ type, pairs: [{ id, arabic, hebrew }] }`
- `listen_choose`: `{ type, items: [{ arabic, correct_hebrew, distractor_hebrew, image_url }] }`
- `sentence_complete`: `{ type, sentence_arabic, sentence_hebrew, gap_word, letter_blocks }`

---

## Phase 5 — Lesson Screen Redesign ✅
**Files:** `frontend/app/lesson/[id].tsx`

Full rewrite of the lesson renderer:

### State to add/keep
- `micState: 'idle' | 'recording' | 'correct' | 'wrong'`
- `letterSlots: string[]` (filled letters for write/sentence exercises)
- `disabledBlocks: number[]` (indexes of tapped letter blocks)
- Keep existing `matchSelected`, `matchedIds`, `matchWrong`

### Renderers to implement

**`renderListenRepeat(stage)`**
- Image (tappable → plays TTS)
- Arabic word (large, #151515)
- Hebrew pronunciation (small, #68665f)
- Hebrew translation
- Orange mic button "דבר" at bottom
  - On press: start MediaRecorder, animate orange waves
  - On stop: POST blob to /api/transcribe, compare to arabic
  - Correct: green checkmark animation, auto-advance after 1s
  - Wrong: red flash, allow retry

**`renderChooseTranslation(stage)`**
- Auto-play TTS on mount
- Circular audio replay button at top
- Mini label "בחר את התרגום הנכון" in #68665f
- 4 image cards in 2×2 grid (80% image / 20% label)
- Tap correct: green border, auto-advance
- Tap wrong: red flash

**`renderWriteTranslation(stage)`**
- Image at top
- Orange pill input slot showing placed letters
- Hebrew translation hint below slot
- Letter block keyboard: shuffled chars + space block
  - Pressed blocks: grey/disabled, stay in position
  - Delete button (backspace icon)
  - "סיום" Done button (orange, active when slot not empty)

**`renderDialogue(stage)`**
- Context label at top (#68665f, small)
- For NPC lines: avatar blob (circle with initial) on left, speech bubble right
- For user turns: orange pill gap in sentence, letter blocks below
- "המשך" advance button after completing user turn

**`renderMatchPairs(stage)`** (update existing)
- Two columns
- Left column items: `borderTopLeftRadius: 24, borderBottomLeftRadius: 24`
- Right column items: `borderTopRightRadius: 24, borderBottomRightRadius: 24`
- Tap to link: orange highlight when selected, green when matched

**`renderListenChoose(stage)`**
- Circular audio button at top
- 2 image cards side by side
- Tap correct: green, advance
- Tap wrong: red flash

**`renderSentenceComplete(stage)`**
- Full sentence with orange pill gap
- Hebrew translation below
- Letter blocks keyboard (same mechanic as write_translation)

### Stage dispatch
```tsx
switch(stage.type) {
  case 'listen_repeat':      return renderListenRepeat(stage)
  case 'choose_translation': return renderChooseTranslation(stage)
  case 'write_translation':  return renderWriteTranslation(stage)
  case 'dialogue':           return renderDialogue(stage)
  case 'match_pairs':        return renderMatchPairs(stage)
  case 'listen_choose':      return renderListenChoose(stage)
  case 'sentence_complete':  return renderSentenceComplete(stage)
}
```

### Progress bar
- Thin bar at top: `completedStages / totalStages` in orange
- Back arrow on left

---

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| — | — | — |

---

## Decisions Made
| Decision | Reason |
|----------|--------|
| OpenAI TTS (keep existing) | Already integrated, free tier available |
| faster-whisper for STT | Open source, best Arabic quality |
| Letter blocks stay disabled (not removed) | User preference |
| Scope to greetings_001 only | Validate UX before applying to all lessons |
| Chrome-only for mic | Web Speech API / MediaRecorder works best on Chrome |
