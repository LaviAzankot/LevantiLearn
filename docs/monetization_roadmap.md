# LevantiLearn — Monetization & MVP Roadmap

---

## Monetization Model

### Free Tier (Always free — drives adoption)
- 3 complete topic paths: Greetings, Food, Numbers
- 5 lessons per topic
- Full SRS review system (all learned words)
- Speech pronunciation scoring (5 attempts/day)
- Streak tracking, basic badges
- Offline mode for free lessons

### Premium (£8.99/month or £59.99/year)
- All 10 topic paths unlocked
- Unlimited pronunciation scoring
- Advanced dialogue scenarios
- Downloadable audio packs for offline
- Priority TTS (Azure Neural voices)
- Detailed pronunciation analytics
- Certificate of completion
- Ad-free experience

### Pricing rationale for Israeli market:
- Priced slightly below Babbel (£12.99/month) to be competitive
- Annual plan saves ~44% — strong conversion driver
- Free tier is genuinely useful — avoid the "free trial" bait-and-switch

---

## MVP Feature Roadmap

### Phase 1 — MVP (Weeks 1–6)
**Goal:** Working app with 3 free topics, submit to stores

| Week | Tasks |
|------|-------|
| 1 | Backend: FastAPI + PostgreSQL schema + SRS API |
| 1 | Lesson JSON: Greetings (all 4 stages) |
| 2 | Frontend: Home, Lesson (VocabStage + ExerciseStage) |
| 2 | TTS integration (Coqui or Azure) |
| 3 | Frontend: DialogueStage + QuizStage + LessonComplete |
| 3 | SRS ReviewScreen (SM-2 algorithm) |
| 4 | Firebase Auth + user profiles |
| 4 | Lesson JSON: Food, Numbers |
| 5 | Streak system, XP, badges |
| 5 | Offline caching (AsyncStorage + preload audio) |
| 6 | Polish: animations, dark mode, RTL support |
| 6 | Beta testing with 10 Hebrew-speaking testers |

**MVP deliverable:** iOS + Android beta via TestFlight/internal track

---

### Phase 2 — Growth (Weeks 7–12)
**Goal:** Premium paywall, 10 topics, app store launch

| Feature | Priority |
|---------|----------|
| Stripe/RevenueCat integration | High |
| 7 additional lesson topics | High |
| Whisper pronunciation scoring | High |
| Push notifications (streak reminders) | Medium |
| Leaderboard (opt-in) | Medium |
| Profile sharing / social | Low |
| Hebrew UI localization | Medium |

**Target:** 500 downloads, 50 premium subscribers by end of month 3

---

### Phase 3 — Expansion (Months 4–6)
**Goal:** Scale to 5K users, content depth

| Feature | Notes |
|---------|-------|
| Video lessons (native speaker clips) | License short CC videos |
| AI conversation partner (GPT-4 + Levantine prompt) | Premium feature |
| Community phrases (user submissions) | CC-licensed contributions |
| Palestinian dialect vs. MSA mode | Side-by-side comparison |
| Group learning (schools/teachers) | B2B revenue stream |

---

## Key Metrics to Track

| Metric | MVP Target | 6-Month Target |
|--------|-----------|----------------|
| Daily Active Users | 100 | 2,000 |
| D7 Retention | 25% | 35% |
| D30 Retention | 12% | 20% |
| Free → Premium conversion | 3% | 6% |
| Avg session length | 8 min | 12 min |
| Streak 7+ days | 15% of users | 25% |
| App Store rating | 4.3+ | 4.5+ |

---

## Go-to-Market Strategy (Tel Aviv / Israel)

### Target Channels:
1. **Reddit/Facebook groups** — r/israel, Hebrew expat groups, Arabic learning communities
2. **Language schools** — Partner with ulpan (Hebrew language schools) to cross-promote
3. **Cultural organizations** — Sindyanna of Galilee, Givat Haviva co-existence center
4. **University Arabic departments** — Hebrew University, Tel Aviv University
5. **App Store SEO** — "Learn Arabic", "Palestinian Arabic", "Levantine Arabic"
6. **TikTok/Instagram** — Short "word of the day" clips using actual lesson content

### Positioning:
> "The first app that teaches real Palestinian Arabic — the dialect spoken by your neighbors."
> Practical, culturally respectful, linguistically authentic.

### Content marketing:
- Blog: "10 Palestinian phrases every Israeli should know"
- YouTube: "Palestinian Arabic in 5 minutes" series
- Partner with Palestinian Arabic teachers in Israel for authenticity review

---

## Ethical Considerations

- **Attribution**: Maknuune dataset is CC-BY-SA — display credit in app
- **Cultural sensitivity**: Have Palestinian native speakers review all content
- **Dialect accuracy**: Explicitly label Levantine dialect (not MSA/Egyptian)
- **Political neutrality**: App is purely linguistic — avoid political commentary
- **Privacy**: GDPR/Israeli Privacy Law compliance — no data sold, minimal collection
- **Accessibility**: Support screen readers, high-contrast mode, font size adjustment
