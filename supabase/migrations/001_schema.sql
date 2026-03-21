-- ============================================================================
-- GolfGives — Complete Database Schema
-- Single-shot SQL for Supabase SQL Editor
--
-- Run order (all in one paste, in this order):
--   1. ENUMs
--   2. Tables
--   3. Triggers (scores rolling-5 + updated_at)
--   4. Row Level Security
--   5. Indexes
--
-- Admin role setup after running:
--   UPDATE auth.users
--   SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'
--   WHERE id = '<your-user-uuid>';
--
-- Admin RLS check reads from app_metadata (service-role-only write path):
--   (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
-- ============================================================================


-- ============================================================================
-- SECTION 1 — ENUMs
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM (
    'active',
    'inactive',
    'lapsed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE draw_status AS ENUM (
    'configured',
    'simulated',
    'published'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'pending',
    'paid'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE draw_mode AS ENUM (
    'random',
    'algorithmic'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE match_type AS ENUM (
    'five_match',
    'four_match',
    'three_match'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- SECTION 2 — Tables (ordered to satisfy foreign key dependencies)
-- ============================================================================

-- ─── profiles ────────────────────────────────────────────────────────────────
-- One row per auth.users entry.
-- Auto-created by the on_auth_user_created trigger (see Section 3).

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  email       TEXT         UNIQUE,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.profiles IS 'Public profile synced from auth.users on signup.';
COMMENT ON COLUMN public.profiles.email IS 'Denormalised from auth.users for join convenience.';

-- ─── subscriptions ───────────────────────────────────────────────────────────
-- Written exclusively by the Stripe webhook handler (service role).

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                       UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID                NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id       TEXT,
  stripe_subscription_id   TEXT,
  plan                     TEXT                CHECK (plan IN ('monthly', 'yearly')),
  status                   subscription_status NOT NULL DEFAULT 'inactive',
  current_period_start     TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  cancelled_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.subscriptions IS 'Stripe subscription state. Written only by the webhook handler.';
COMMENT ON COLUMN public.subscriptions.plan IS '''monthly'' or ''yearly''.';

-- ─── charities ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.charities (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT         NOT NULL,
  description  TEXT,
  image_url    TEXT,
  website_url  TEXT,
  is_featured  BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.charities IS 'Partner charities displayed on the public charities page.';

-- ─── charity_events ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.charity_events (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  charity_id   UUID         NOT NULL REFERENCES public.charities(id) ON DELETE CASCADE,
  title        TEXT         NOT NULL,
  description  TEXT,
  event_date   DATE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.charity_events IS 'Upcoming events associated with a partner charity.';

-- ─── charity_contributions ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.charity_contributions (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  charity_id       UUID         NOT NULL REFERENCES public.charities(id) ON DELETE CASCADE,
  percentage       NUMERIC(5,2) NOT NULL DEFAULT 10,
  amount           NUMERIC(12,2),
  is_independent   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.charity_contributions IS 'Individual contribution records per user per charity.';
COMMENT ON COLUMN public.charity_contributions.is_independent IS 'TRUE = contribution made outside of a subscription payment.';

-- ─── user_charity_selections ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_charity_selections (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID         NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  charity_id               UUID         NOT NULL REFERENCES public.charities(id) ON DELETE RESTRICT,
  contribution_percentage  NUMERIC(5,2) NOT NULL DEFAULT 10,
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.user_charity_selections IS 'Each user''s current charity selection and contribution split. One row per user.';
COMMENT ON COLUMN public.user_charity_selections.contribution_percentage IS 'Percentage of the user''s subscription directed to this charity.';

-- ─── scores ──────────────────────────────────────────────────────────────────
-- Stableford scoring (1–45 points per round).
-- Max 5 scores per user enforced by the enforce_rolling_five_scores trigger.

CREATE TABLE IF NOT EXISTS public.scores (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score       INTEGER      NOT NULL CHECK (score >= 1 AND score <= 45),
  played_at   DATE         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.scores IS 'Stableford scores (1–45). Maximum 5 per user; oldest auto-deleted by trigger.';
COMMENT ON COLUMN public.scores.score IS 'Stableford points for the round (1–45).';

-- ─── prize_pools ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.prize_pools (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  month                    TEXT         NOT NULL UNIQUE,  -- 'YYYY-MM'
  total_pool               NUMERIC(12,2) NOT NULL DEFAULT 0,
  five_match_pool          NUMERIC(12,2) NOT NULL DEFAULT 0,
  four_match_pool          NUMERIC(12,2) NOT NULL DEFAULT 0,
  three_match_pool         NUMERIC(12,2) NOT NULL DEFAULT 0,
  jackpot_carryover        NUMERIC(12,2) NOT NULL DEFAULT 0,
  active_subscriber_count  INTEGER       NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.prize_pools IS 'Monthly prize pool breakdown. One row per calendar month.';
COMMENT ON COLUMN public.prize_pools.month IS 'Format: YYYY-MM (e.g. ''2025-03'').';
COMMENT ON COLUMN public.prize_pools.jackpot_carryover IS 'Unclaimed prize from the previous month rolled into this pool.';

-- ─── draws ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.draws (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  month          TEXT         NOT NULL UNIQUE,  -- 'YYYY-MM'
  mode           draw_mode    NOT NULL,
  status         draw_status  NOT NULL DEFAULT 'configured',
  drawn_numbers  INTEGER[]    CHECK (array_length(drawn_numbers, 1) = 5),
  prize_pool_id  UUID         REFERENCES public.prize_pools(id) ON DELETE SET NULL,
  simulated_at   TIMESTAMPTZ,
  published_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.draws IS 'Monthly draw configuration and results.';
COMMENT ON COLUMN public.draws.drawn_numbers IS 'Array of exactly 5 drawn Stableford scores used to match against member entries.';
COMMENT ON COLUMN public.draws.month IS 'Format: YYYY-MM. One draw per calendar month.';

-- ─── draw_entries ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.draw_entries (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id          UUID         NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
  user_id          UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scores_snapshot  INTEGER[]    NOT NULL,  -- copy of user's scores at draw time
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (draw_id, user_id)  -- one entry per user per draw
);

COMMENT ON TABLE  public.draw_entries IS 'Snapshot of each eligible member''s scores at draw time.';
COMMENT ON COLUMN public.draw_entries.scores_snapshot IS 'Immutable copy of the user''s scores when the draw was run.';

-- ─── winners ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.winners (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id         UUID            NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
  user_id         UUID            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_type      match_type      NOT NULL,
  prize_amount    NUMERIC(12,2)   NOT NULL DEFAULT 0,
  payment_status  payment_status  NOT NULL DEFAULT 'pending',
  proof_url       TEXT,
  verified_at     TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.winners IS 'Draw winners with prize allocation and payment tracking.';
COMMENT ON COLUMN public.winners.match_type IS 'five_match = all 5 scores matched; four_match = 4 matched; three_match = 3 matched.';
COMMENT ON COLUMN public.winners.proof_url IS 'URL to uploaded payment proof document (stored in Supabase Storage).';


-- ============================================================================
-- SECTION 3 — Triggers
-- ============================================================================

-- ─── 3a. Auto-create profile on signup ───────────────────────────────────────
-- Fires after Supabase creates a new auth.users row (email or OAuth signup).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',   -- Google OAuth
      NEW.raw_user_meta_data ->> 'display_name', -- email signup
      split_part(NEW.email, '@', 1)              -- fallback
    ),
    NEW.email,
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─── 3b. Enforce rolling 5 scores per user ───────────────────────────────────
-- After each INSERT on scores, if the user now has more than 5 rows,
-- the oldest (by played_at, tie-broken by created_at) is deleted.

CREATE OR REPLACE FUNCTION public.enforce_rolling_five_scores_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  overflow_count INTEGER;
BEGIN
  SELECT COUNT(*) - 5
  INTO   overflow_count
  FROM   public.scores
  WHERE  user_id = NEW.user_id;

  IF overflow_count > 0 THEN
    DELETE FROM public.scores
    WHERE id IN (
      SELECT id
      FROM   public.scores
      WHERE  user_id = NEW.user_id
      ORDER  BY played_at ASC, created_at ASC
      LIMIT  overflow_count
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_rolling_five_scores ON public.scores;

CREATE TRIGGER enforce_rolling_five_scores
  AFTER INSERT ON public.scores
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_rolling_five_scores_fn();

-- ─── 3c. Auto-update updated_at ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply to: profiles
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Apply to: subscriptions
DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Apply to: user_charity_selections
DROP TRIGGER IF EXISTS set_user_charity_selections_updated_at ON public.user_charity_selections;
CREATE TRIGGER set_user_charity_selections_updated_at
  BEFORE UPDATE ON public.user_charity_selections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================================
-- SECTION 4 — Row Level Security
--
-- Admin check: (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
-- app_metadata can only be written by the service role — users cannot
-- self-elevate by editing their own profile.
--
-- To grant admin:
--   UPDATE auth.users
--   SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
--   WHERE id = '<uuid>';
-- ============================================================================

-- ─── profiles ────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: user reads own"       ON public.profiles;
DROP POLICY IF EXISTS "profiles: user updates own"     ON public.profiles;
DROP POLICY IF EXISTS "profiles: admin reads all"      ON public.profiles;

CREATE POLICY "profiles: user reads own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: user updates own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: admin reads all"
  ON public.profiles FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ─── subscriptions ───────────────────────────────────────────────────────────

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions: user reads own"   ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions: admin reads all"  ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions: admin updates all" ON public.subscriptions;

CREATE POLICY "subscriptions: user reads own"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "subscriptions: admin reads all"
  ON public.subscriptions FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "subscriptions: admin updates all"
  ON public.subscriptions FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ─── scores ──────────────────────────────────────────────────────────────────

ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scores: user reads own"    ON public.scores;
DROP POLICY IF EXISTS "scores: user inserts own"  ON public.scores;
DROP POLICY IF EXISTS "scores: user updates own"  ON public.scores;
DROP POLICY IF EXISTS "scores: user deletes own"  ON public.scores;
DROP POLICY IF EXISTS "scores: admin reads all"   ON public.scores;
DROP POLICY IF EXISTS "scores: admin edits all"   ON public.scores;

CREATE POLICY "scores: user reads own"
  ON public.scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "scores: user inserts own"
  ON public.scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scores: user updates own"
  ON public.scores FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scores: user deletes own"
  ON public.scores FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "scores: admin reads all"
  ON public.scores FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "scores: admin edits all"
  ON public.scores FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ─── charities ───────────────────────────────────────────────────────────────

ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "charities: public reads active"  ON public.charities;
DROP POLICY IF EXISTS "charities: admin reads all"      ON public.charities;
DROP POLICY IF EXISTS "charities: admin inserts"        ON public.charities;
DROP POLICY IF EXISTS "charities: admin updates"        ON public.charities;
DROP POLICY IF EXISTS "charities: admin deletes"        ON public.charities;

-- Public (including unauthenticated) can read active charities
CREATE POLICY "charities: public reads active"
  ON public.charities FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "charities: admin reads all"
  ON public.charities FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "charities: admin inserts"
  ON public.charities FOR INSERT
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "charities: admin updates"
  ON public.charities FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "charities: admin deletes"
  ON public.charities FOR DELETE
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ─── charity_events ──────────────────────────────────────────────────────────

ALTER TABLE public.charity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "charity_events: public reads"   ON public.charity_events;
DROP POLICY IF EXISTS "charity_events: admin writes"   ON public.charity_events;

CREATE POLICY "charity_events: public reads"
  ON public.charity_events FOR SELECT
  USING (TRUE);

CREATE POLICY "charity_events: admin writes"
  ON public.charity_events FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ─── charity_contributions ───────────────────────────────────────────────────

ALTER TABLE public.charity_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "charity_contributions: user reads own"    ON public.charity_contributions;
DROP POLICY IF EXISTS "charity_contributions: user inserts own"  ON public.charity_contributions;
DROP POLICY IF EXISTS "charity_contributions: admin reads all"   ON public.charity_contributions;

CREATE POLICY "charity_contributions: user reads own"
  ON public.charity_contributions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "charity_contributions: user inserts own"
  ON public.charity_contributions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "charity_contributions: admin reads all"
  ON public.charity_contributions FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ─── user_charity_selections ─────────────────────────────────────────────────

ALTER TABLE public.user_charity_selections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_charity_selections: user reads own"    ON public.user_charity_selections;
DROP POLICY IF EXISTS "user_charity_selections: user upserts own"  ON public.user_charity_selections;
DROP POLICY IF EXISTS "user_charity_selections: admin reads all"   ON public.user_charity_selections;

CREATE POLICY "user_charity_selections: user reads own"
  ON public.user_charity_selections FOR SELECT
  USING (auth.uid() = user_id);

-- Covers both INSERT (new selection) and UPDATE (change charity)
CREATE POLICY "user_charity_selections: user upserts own"
  ON public.user_charity_selections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_charity_selections: user updates own"
  ON public.user_charity_selections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_charity_selections: admin reads all"
  ON public.user_charity_selections FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ─── draws ───────────────────────────────────────────────────────────────────

ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "draws: public reads published"  ON public.draws;
DROP POLICY IF EXISTS "draws: admin reads all"         ON public.draws;
DROP POLICY IF EXISTS "draws: admin inserts"           ON public.draws;
DROP POLICY IF EXISTS "draws: admin updates"           ON public.draws;

-- Public audit trail — anyone can see published draws
CREATE POLICY "draws: public reads published"
  ON public.draws FOR SELECT
  USING (status = 'published');

CREATE POLICY "draws: admin reads all"
  ON public.draws FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "draws: admin inserts"
  ON public.draws FOR INSERT
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "draws: admin updates"
  ON public.draws FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ─── draw_entries ────────────────────────────────────────────────────────────

ALTER TABLE public.draw_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "draw_entries: user reads own"   ON public.draw_entries;
DROP POLICY IF EXISTS "draw_entries: admin reads all"  ON public.draw_entries;

CREATE POLICY "draw_entries: user reads own"
  ON public.draw_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "draw_entries: admin reads all"
  ON public.draw_entries FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ─── winners ─────────────────────────────────────────────────────────────────

ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "winners: user reads own"    ON public.winners;
DROP POLICY IF EXISTS "winners: admin reads all"   ON public.winners;
DROP POLICY IF EXISTS "winners: admin updates all" ON public.winners;

CREATE POLICY "winners: user reads own"
  ON public.winners FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "winners: admin reads all"
  ON public.winners FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "winners: admin updates all"
  ON public.winners FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ─── prize_pools ─────────────────────────────────────────────────────────────

ALTER TABLE public.prize_pools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prize_pools: public reads"   ON public.prize_pools;
DROP POLICY IF EXISTS "prize_pools: admin inserts"  ON public.prize_pools;
DROP POLICY IF EXISTS "prize_pools: admin updates"  ON public.prize_pools;

-- Everyone can read prize pool data
CREATE POLICY "prize_pools: public reads"
  ON public.prize_pools FOR SELECT
  USING (TRUE);

CREATE POLICY "prize_pools: admin inserts"
  ON public.prize_pools FOR INSERT
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "prize_pools: admin updates"
  ON public.prize_pools FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');


-- ============================================================================
-- SECTION 5 — Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_scores_user_played
  ON public.scores (user_id, played_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON public.subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id
  ON public.subscriptions (stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_draw_entries_draw_user
  ON public.draw_entries (draw_id, user_id);

CREATE INDEX IF NOT EXISTS idx_winners_draw_id
  ON public.winners (draw_id);

CREATE INDEX IF NOT EXISTS idx_winners_user_id
  ON public.winners (user_id);

CREATE INDEX IF NOT EXISTS idx_charity_contributions_user_id
  ON public.charity_contributions (user_id);


-- ============================================================================
-- Done.
-- Verify with:
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
--   SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public';
-- ============================================================================
