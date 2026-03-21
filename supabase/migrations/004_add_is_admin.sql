-- ============================================================================
-- GolfGives — Migration 004: Add is_admin to profiles
-- Run in Supabase SQL Editor after 001_schema.sql
-- ============================================================================

-- ─── Add is_admin column ─────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.is_admin IS
  'Set to TRUE by service role only. Users cannot self-promote.';

-- ─── Lock down the update policy so users cannot flip their own is_admin ─────
-- Drop the broad update policy and replace with a CHECK that prevents
-- the is_admin column from being changed by anyone other than service role.

DROP POLICY IF EXISTS "profiles: user updates own" ON public.profiles;

CREATE POLICY "profiles: user updates own (safe fields)"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent self-elevation: is_admin must stay the same as its current DB value
    AND is_admin = (
      SELECT is_admin FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ─── Grant admin: run this manually for your admin account ───────────────────
-- UPDATE public.profiles SET is_admin = TRUE WHERE id = '<your-user-uuid>';
-- (Use service role in SQL Editor — anon/authenticated key cannot do this
--  because the WITH CHECK above blocks it.)
  UPDATE public.profiles
  SET is_admin = TRUE
  WHERE email = 'your@email.com';
