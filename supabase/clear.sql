-- =============================================================================
-- CADENCE CLEAR SCRIPT
-- Deletes all data for a specific user. Schema, RLS policies, and auth.users
-- are left untouched. Safe to run before re-seeding.
--
-- Run in Supabase SQL Editor.
-- Replace YOUR_USER_ID with your actual auth.users id (Auth > Users).
-- =============================================================================

DO $$
DECLARE
  uid UUID := 'YOUR_USER_ID';  -- <-- REPLACE THIS
BEGIN

  -- ── Leaf tables first (no dependants) ──────────────────────────────────────

  DELETE FROM public.review_dismissed_items  WHERE user_id = uid;
  DELETE FROM public.weekly_reviews          WHERE user_id = uid;
  DELETE FROM public.competency_assessments  WHERE owning_user_id = uid;
  DELETE FROM public.growth_plans            WHERE owning_user_id = uid;
  DELETE FROM public.evidence_entries        WHERE owning_user_id = uid;
  DELETE FROM public.follow_ups              WHERE user_id = uid;
  DELETE FROM public.review_summaries        WHERE owning_user_id = uid;
  DELETE FROM public.review_cycles           WHERE owning_user_id = uid;

  -- ── Meeting data ────────────────────────────────────────────────────────────

  DELETE FROM public.meeting_templates       WHERE owning_user_id = uid;
  DELETE FROM public.meetings                WHERE owning_user_id = uid;

  -- ── Task data ───────────────────────────────────────────────────────────────

  DELETE FROM public.task_relations
    WHERE task_id IN (SELECT id FROM public.tasks WHERE owning_user_id = uid);
  DELETE FROM public.tasks                   WHERE owning_user_id = uid;

  -- ── People & team membership ────────────────────────────────────────────────
  -- team_memberships cascade-deletes when team or person is deleted,
  -- but delete explicitly to avoid FK order issues.

  DELETE FROM public.team_memberships
    WHERE team_id IN (SELECT id FROM public.teams WHERE owning_user_id = uid);

  -- ── Competency framework ────────────────────────────────────────────────────
  -- competency_levels and competency_areas cascade from framework.

  DELETE FROM public.competency_levels
    WHERE area_id IN (
      SELECT id FROM public.competency_areas WHERE owning_user_id = uid
    );
  DELETE FROM public.competency_areas        WHERE owning_user_id = uid;
  DELETE FROM public.competency_frameworks   WHERE owning_user_id = uid;

  -- ── Career goals ─────────────────────────────────────────────────────────────
  -- focus_distributions and career_goals cascade from gap_analysis_categories.

  DELETE FROM public.focus_distributions
    WHERE category_id IN (
      SELECT id FROM public.gap_analysis_categories WHERE owning_user_id = uid
    );
  DELETE FROM public.career_goals
    WHERE category_id IN (
      SELECT id FROM public.gap_analysis_categories WHERE owning_user_id = uid
    );
  DELETE FROM public.gap_analysis_categories WHERE owning_user_id = uid;
  DELETE FROM public.career_goals_profiles   WHERE owning_user_id = uid;
  DELETE FROM public.achievements            WHERE owning_user_id = uid;

  -- ── AI config ───────────────────────────────────────────────────────────────

  DELETE FROM public.ai_config               WHERE user_id = uid;

  -- ── Core entities (people & teams) ─────────────────────────────────────────

  DELETE FROM public.people                  WHERE owning_user_id = uid;
  DELETE FROM public.teams                   WHERE owning_user_id = uid;

  RAISE NOTICE 'All data cleared for user %', uid;
END $$;
