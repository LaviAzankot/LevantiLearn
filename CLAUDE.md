# LEVANTI LEARN RULES
## PROJECT OVERVIEW [levanti:*]
- App: Babbel-style Levantine Arabic learning for Tel Aviv/Israel users
- Goals: MVP with 10 topics (Greetings-Food-Directions-Shopping-Family-Travel-Numbers-Colors-Emergency-Culture)
- Ethical: Open-source only (Maknuune CC-BY-SA, Unsplash CC0); no copyrighted content

## TECH STACK [tech:*]
[frontend:*]
- React Native (Expo) + TypeScript; share code with React web
- Zustand state; RTL Arabic support; dark mode/accessibility
[backend:*]
- FastAPI (Python 3.11); Postgres + Redis
- Services: Coqui TTS primary, Azure fallback; OpenAI Whisper STT
[db:*]
- Postgres/Supabase; Redis cache; local SQLite offline
[deploy:*]
- Expo EAS/Vercel frontend; Railway/Supabase backend
[data:*]
- Maknuune 36K lexicon; lesson JSON in backend/data/

## CODING RULES [coding:*]
- Security: Validate all inputs; Firebase Auth (no custom JWT); rate-limit API
- Performance: Cache TTS/STT; offline SRS with SQLite
- Style: TypeScript strict; Python black/flake8; ESLint/Prettier
- Features: SM-2 spaced repetition; Whisper pronunciation; streaks/XP/badges

## WORKFLOW [workflow:*]
- Always check @task_plan.md first
- Use /compact at 70% context
- Offline-first: Test without net (SQLite cache)
- Test: Expo dev, Railway preview URLs

## TOKEN SAVER [optimize:*]
- Summarize <150 tokens
- Reference files: @README.md for stack, backend/data/ for lessons
- Batch: Plan 3 screens/features per prompt
