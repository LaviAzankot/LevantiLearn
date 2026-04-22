# LevantiLearn — Palestinian/Levantine Arabic Learning App

> Babbel-style mobile/web app for learning Palestinian Arabic dialect.
> Built for Tel Aviv / Israel learners. Production-ready MVP.

---

## Tech Stack

| Layer        | Technology                                                    |
|-------------|---------------------------------------------------------------|
| Frontend     | React Native (Expo) + TypeScript                              |
| Web version  | React (same codebase via Expo Web)                            |
| Backend API  | FastAPI (Python 3.11)                                         |
| Database     | PostgreSQL 15 + Redis 7 (caching / sessions)                  |
| Auth         | Firebase Auth (Google, Apple, Email)                          |
| TTS          | Coqui TTS (open-source) → fallback Azure Cognitive Services   |
| STT          | OpenAI Whisper (local / self-hosted)                          |
| Vocab Data   | Maknuune Palestinian Lexicon (36K entries, CC-BY-SA)          |
| Images       | Unsplash API (CC0 licensed)                                   |
| Deployment   | Frontend → Expo EAS (mobile) + Vercel (web)                   |
|              | Backend → Railway.app (FastAPI) + Supabase (Postgres)         |

---

## Project Structure

```
LevantiLearn/
├── frontend/           # React Native (Expo) app
│   └── src/
│       ├── screens/    # Home, Lesson, Review, Profile
│       ├── components/ # Reusable UI components
│       ├── hooks/      # Custom React hooks
│       ├── store/      # Zustand global state
│       ├── services/   # API, Firebase, Audio clients
│       └── utils/      # Spaced repetition, helpers
├── backend/            # FastAPI Python API
│   ├── api/            # Route handlers
│   ├── models/         # Pydantic + DB models
│   ├── services/       # TTS, STT, vocab, SRS logic
│   └── data/           # Lesson JSON, seed data
└── docs/               # Wireframes, architecture diagrams
```

---

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in keys
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npx expo start
```

---

## Key Features
- 10 topic paths: Greetings, Food, Directions, Shopping, Family, Travel, Numbers, Colors, Emergency, Culture
- Spaced Repetition System (SM-2 algorithm)
- Whisper-powered pronunciation feedback
- RTL Arabic text rendering
- Offline-first with SQLite local cache
- Streak system, XP, badges, daily goals
- Dark mode + accessibility support
