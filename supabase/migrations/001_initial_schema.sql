-- LevantiLearn — Initial Schema + RLS
-- Run this in: Supabase Dashboard → SQL Editor → Run

-- ── 1. PROFILES ───────────────────────────────────────────────────────────────
-- Extends auth.users with app-specific fields.
-- Created automatically via trigger on user signup.

CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name        TEXT        NOT NULL DEFAULT '',
  is_premium          BOOLEAN     NOT NULL DEFAULT false,
  xp_total            INTEGER     NOT NULL DEFAULT 0,
  streak_days         INTEGER     NOT NULL DEFAULT 0,
  streak_last_date    DATE,
  daily_goal_minutes  INTEGER     NOT NULL DEFAULT 10,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Service role (backend) can do everything
CREATE POLICY "profiles_service_all" ON public.profiles
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ── 2. AUTO-CREATE PROFILE ON SIGNUP ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 3. LESSON PROGRESS ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id    TEXT        NOT NULL,
  completed    BOOLEAN     NOT NULL DEFAULT false,
  score        INTEGER     NOT NULL DEFAULT 0,
  xp_earned    INTEGER     NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress_select_own" ON public.lesson_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "progress_insert_own" ON public.lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "progress_update_own" ON public.lesson_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "progress_service_all" ON public.lesson_progress
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ── 4. SRS CARDS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.srs_cards (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  word_id       TEXT        NOT NULL,
  arabic        TEXT        NOT NULL DEFAULT '',
  romanization  TEXT        NOT NULL DEFAULT '',
  english       TEXT        NOT NULL DEFAULT '',
  lesson_id     TEXT        NOT NULL DEFAULT '',
  repetitions   INTEGER     NOT NULL DEFAULT 0,
  ease_factor   FLOAT       NOT NULL DEFAULT 2.5,
  interval_days INTEGER     NOT NULL DEFAULT 1,
  next_review   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, word_id)
);

ALTER TABLE public.srs_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "srs_select_own" ON public.srs_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "srs_insert_own" ON public.srs_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "srs_update_own" ON public.srs_cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "srs_service_all" ON public.srs_cards
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ── 5. PAYMENTS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  paypal_order_id  TEXT        NOT NULL UNIQUE,
  amount_ils       NUMERIC(10,2),
  vat_amount_ils   NUMERIC(10,2),
  status           TEXT        NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can only see their own payments
CREATE POLICY "payments_select_own" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update payments (prevents client-side fraud)
CREATE POLICY "payments_service_all" ON public.payments
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ── 6. INDEXES ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_srs_user_review   ON public.srs_cards (user_id, next_review);
CREATE INDEX IF NOT EXISTS idx_progress_user      ON public.lesson_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user      ON public.payments (user_id);
