# Findings

## Current File Inventory

### Frontend
- `frontend/src/theme.ts` — THEME object with light/dark, currently uses #FF6B00 orange and #F8F9FA bg
- `frontend/app/(tabs)/index.tsx` — Home screen, 286 lines. CTA is a plain orange TouchableOpacity button (no image card)
- `frontend/app/(tabs)/review.tsx` — SRS flashcard screen
- `frontend/app/(tabs)/profile.tsx` — Profile/stats/settings screen
- `frontend/app/(tabs)/_layout.tsx` — Tab bar layout
- `frontend/app/lesson/[id].tsx` — Lesson screen, ~400+ lines. Current stages: vocabulary_intro, match_pairs, exercises, dialogue, quiz

### Backend
- `backend/data/lessons/greetings_001.json` — 5 words with image_url, stages: vocabulary_intro → match_pairs → exercises → dialogue → quiz
- `backend/data/lessons/food_001.json` — similar structure
- `backend/main.py` — FastAPI app, has /api/tts/synthesize endpoint (OpenAI TTS)

### Current Lesson Screen State Variables
- `lesson`, `loading`, `error`, `stage`, `wordIndex`
- `qIndex`, `qHistory`, `lockedAnswer`, `wrongAnswers`, `mistakeCount`
- `arranged`, `arrRevealed`
- `dialogueStep`, `isRecording`
- `matchSelected`, `matchedIds`, `matchWrong`

### Current Stage Types in Renderer
- `vocabulary_intro` — image cards with tap-to-hear
- `match_pairs` — two column tap matching
- `exercises` — multiple choice / fill in blank / listen and select
- `dialogue` — line-by-line conversation
- `quiz` — multiple choice + arrange words

## Design Tokens to Change
| Token | From | To |
|-------|------|----|
| Orange accent | #FF6B00 | #fe4d01 |
| Background | #F8F9FA | #f6f4ef |
| Lesson screen COLORS.light.accent | #E07A2F | #fe4d01 |
| Lesson screen COLORS.light.background | #F5F3EF | #f6f4ef |

## Key API Endpoints
- `GET /api/lessons/{id}` — returns lesson JSON
- `POST /api/tts/synthesize?text=...` — returns audio stream (OpenAI TTS)
- `POST /api/transcribe` — TO BE ADDED (faster-whisper STT)

## faster-whisper Notes
- Package: `faster-whisper` on PyPI
- Load model: `WhisperModel("medium", device="cpu", compute_type="int8")`
- Arabic transcription: `model.transcribe(audio_path, language="ar")`
- Endpoint should accept multipart audio file, save temp, transcribe, delete temp, return JSON
