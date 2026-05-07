# LevantiLearn — Setup Guide

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in your credentials
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npx expo start
```

---

## Azure TTS — Offline Audio Generation

LevantiLearn can generate all lesson audio files once using Azure Cognitive Services
and play them locally at runtime — no TTS calls during user sessions.

### 1. Create an Azure Speech resource

1. Go to [portal.azure.com](https://portal.azure.com) and sign in.
2. Search for **Cognitive Services** → **Speech** → **Create**.
3. Choose pricing tier:
   - **F0 (Free)** — 5 hours of neural TTS per month, good for development.
   - **S0 (Standard)** — ~$16 / 1M characters, use for production.
4. Once deployed, go to **Keys and Endpoint** and copy:
   - **Key 1** → `AZURE_SPEECH_KEY`
   - **Location/Region** → `AZURE_SPEECH_REGION` (e.g. `eastus`)

### 2. Configure credentials

Add to `backend/.env`:

```
AZURE_SPEECH_KEY=your_key_here
AZURE_SPEECH_REGION=eastus
AZURE_SPEECH_ENDPOINT=https://eastus.tts.speech.microsoft.com
```

### 3. Estimated cost

The full 48-lesson curriculum contains approximately **3,500–4,000 audio entries**.
Average Arabic phrase length ≈ 8 characters.

| Tier | Characters / month free | Cost per 1M chars | Est. one-time cost |
|------|------------------------|-------------------|-------------------|
| F0   | 500,000                | —                 | Free (within limit) |
| S0   | 0                      | ~$16              | < $0.10 for full curriculum |

### 4. Install script dependencies

```bash
cd scripts
npm install
```

### 5. Voice

The generator uses **ar-PS-AvriNeural** (Palestinian Arabic, female).

If that voice is unavailable on your account it automatically falls back to
**ar-SY-AmanyNeural** (Syrian Arabic, female) after your confirmation.

To list all available voices:
```bash
curl "https://eastus.tts.speech.microsoft.com/cognitiveservices/v1/voices/list" \
  -H "Ocp-Apim-Subscription-Key: YOUR_KEY" | jq '.[].ShortName' | grep ar-
```

### 6. Generate audio

#### All lessons
```bash
cd scripts
npm run generate-audio
```

#### One lesson
```bash
npx ts-node generate-audio.ts --lesson greetings_001
```

#### Range of lessons (by numeric suffix)
```bash
npx ts-node generate-audio.ts --lessons 001-012
```

#### Check without generating
```bash
npx ts-node generate-audio.ts --dry-run
```

#### Regenerate everything (ignore checkpoint)
```bash
npx ts-node generate-audio.ts --force
```

### 7. Resume after interruption

Generation is checkpointed automatically to `frontend/src/assets/audio/.checkpoint.json`.
If the script is interrupted (Ctrl+C, crash, etc.), simply re-run the same command —
it picks up exactly where it stopped.

### 8. Hard stop

**From the terminal:** Press `Ctrl+C`. The script saves the checkpoint immediately and exits.

**From the AdminAudioScreen (in-app):** Start the generation server, then use the STOP button:

```bash
cd scripts
npm run generate-audio:serve   # starts HTTP server on port 9423
```

Open the Expo app in development mode and navigate to `/admin`.
The STOP button sends an abort signal to the server — the current batch finishes
(≤ 10 files) then generation halts. All completed files and the checkpoint are flushed.

### 9. After generation

After generating audio, restart Metro bundler so it picks up the new files and the
updated `audioRequireMap.ts`:

```bash
cd frontend
npx expo start --clear
```

The generated files (`*.mp3`) are **not committed to git** — they are gitignored.
The map files (`audio_map.json`, `text_map.json`, `audioRequireMap.ts`) ARE committed.

### 10. Failed files

If any files failed during generation (rate limits, network errors), they are logged to
`frontend/src/assets/audio/.failed.json`. Re-run the generator to retry them (they are
not in the checkpoint's completed list so they will be retried automatically).

---

## Development Notes

### Admin screen

Navigate to `http://localhost:8081/admin` in the Expo web app, or
go to `/admin` in the mobile app while running in development mode.

The admin screen is completely inaccessible in production builds (`__DEV__ === false`).

### Audio fallback

Until audio generation is run, all audio plays via the backend TTS endpoint
(`/api/tts/synthesize`) as before. No configuration change is required — the
fallback is automatic.

### IPC architecture

```
┌──────────────────────────────────────────────────────┐
│  Terminal (dev machine)                               │
│  npx ts-node scripts/generate-audio.ts --serve       │
│  └─ HTTP server on :9423                             │
│       GET  /status  → current progress               │
│       GET  /info    → total/completed/stoppedAt      │
│       POST /start   → begin generation               │
│       POST /stop    → abort (flush checkpoint)       │
└──────────────────┬───────────────────────────────────┘
                   │ HTTP (localhost)
┌──────────────────▼───────────────────────────────────┐
│  Expo app (simulator or device on same network)       │
│  /admin route → AdminAudioScreen                     │
│  Polls /status every 2s                              │
│  STOP button → POST /stop                            │
└──────────────────────────────────────────────────────┘
```
