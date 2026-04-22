# LevantiLearn — Deployment Guide

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Users (Mobile / Web)                                       │
│  iOS App  │  Android App  │  Web (levantilearn.app)         │
└──────┬────┴───────┬────────┴──────────┬──────────────────────┘
       │            │                   │
       ▼            ▼                   ▼
   Expo EAS      Expo EAS           Vercel (Next.js/Web)
   (iOS build)   (Android build)    expo export --platform web

                        │
                        ▼
              ┌─────────────────┐
              │  FastAPI Backend │  ← Railway.app
              │  (Python 3.11)  │     auto-deploys from GitHub
              └────────┬────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    Supabase       Upstash        AWS S3 (or
    (PostgreSQL)   (Redis)        Cloudflare R2)
                                  for audio cache
```

---

## 1. Backend — Railway.app

Railway offers free tier with persistent PostgreSQL and Redis.

### Steps:
```bash
# 1. Push backend to GitHub repo
git init && git add . && git commit -m "initial"
git remote add origin https://github.com/yourusername/levantilearn
git push origin main

# 2. Go to railway.app → New Project → Deploy from GitHub
# 3. Add environment variables (from .env.example)
# 4. Railway auto-detects Python/FastAPI via Procfile
```

### Create Procfile:
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Database migrations (Alembic):
```bash
alembic init alembic
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

---

## 2. Frontend Web — Vercel

```bash
cd frontend
npx expo export -p web     # Builds static site to dist/

# Deploy to Vercel
npm i -g vercel
vercel --prod

# Or connect GitHub repo in Vercel dashboard:
# Build command: npx expo export -p web
# Output directory: dist
# Root directory: frontend
```

### Environment variables in Vercel:
```
EXPO_PUBLIC_API_URL=https://levantilearn-api.railway.app/api
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
```

---

## 3. Mobile — Expo EAS Build

```bash
npm install -g eas-cli
eas login

# Configure builds
eas build:configure

# Build for iOS (requires Apple Developer account)
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### eas.json:
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

---

## 4. Firebase Setup (Auth)

1. Go to console.firebase.google.com
2. Create project "LevantiLearn"
3. Enable Authentication → Sign-in methods: Google, Apple, Email/Password
4. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
5. Place in `frontend/` root
6. Download service account JSON for backend

### Firebase config (frontend/.env):
```
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=levantilearn.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=levantilearn
```

---

## 5. TTS Setup

### Option A: Coqui TTS (Open-Source, Free)
```bash
pip install TTS
# Download Arabic model
python -c "from TTS.api import TTS; TTS('tts_models/ar/cv/vits')"
```

### Option B: Azure TTS (Palestinian Arabic voice, $4/1M chars)
```bash
pip install azure-cognitiveservices-speech
# Set AZURE_SPEECH_KEY in .env
# Voice: ar-PS-SanaNeural (female) — native Palestinian Arabic
```

### Audio caching strategy:
- All lesson audio pre-generated and cached at lesson download
- Stored in Cloudflare R2 (free 10GB/month) or AWS S3
- Served via CDN for fast global delivery

---

## 6. Maknuune Vocab Data Setup

```bash
# Download CC-BY-SA Palestinian lexicon
wget https://github.com/CAMeL-Lab/maknuune/raw/main/maknuune.csv
mv maknuune.csv backend/data/maknuune.csv

# Or use Hugging Face Levanti dataset
pip install datasets
python -c "
from datasets import load_dataset
ds = load_dataset('CAMeL-Lab/Levanti')
ds['train'].to_csv('backend/data/levanti.csv')
"
```

---

## 7. Cost Estimate (Monthly)

| Service         | Free Tier                    | At Scale (10K users)  |
|----------------|------------------------------|-----------------------|
| Railway (API)   | $5/month (Hobby)             | ~$20/month            |
| Supabase (DB)   | Free (500MB)                 | $25/month (8GB)       |
| Upstash (Redis) | Free (10K req/day)           | $10/month             |
| Vercel (Web)    | Free                         | Free (Pro $20 if needed) |
| Expo EAS        | Free (30 builds/month)       | $99/year              |
| Azure TTS       | Free (500K chars/month)      | ~$4/million chars     |
| Cloudflare R2   | Free (10GB)                  | $0.015/GB             |
| Firebase Auth   | Free (10K/month)             | $0.0055/MAU above 10K |
| **Total**       | **~Free (MVP)**              | **~$60-80/month**     |

---

## 8. Custom Domain

```
levantilearn.app        → Vercel (web app)
api.levantilearn.app    → Railway (backend)
```

Configure DNS with your registrar:
- A record: @ → Vercel IP
- CNAME: api → railway-url.railway.app
