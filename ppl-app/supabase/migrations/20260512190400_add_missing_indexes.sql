-- Add indexes for query patterns that currently fall back to seq scans.
-- All use partial WHERE clauses to keep indexes lean: only index rows we'll query.

BEGIN;

-- programs.user_id — used by usePrograms hook on every dashboard load.
CREATE INDEX IF NOT EXISTS idx_programs_user_id
  ON public.programs (user_id)
  WHERE user_id IS NOT NULL;

-- workouts.user_id — used by Programs tab + workout selection.
-- Note: workouts_user_slug_unique already exists on (user_id, slug) so this is
-- partially redundant; keeping for clarity on user_id-only filters.
CREATE INDEX IF NOT EXISTS idx_workouts_user_id
  ON public.workouts (user_id)
  WHERE user_id IS NOT NULL;

-- progress_photos: list view orders by date DESC.
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_date
  ON public.progress_photos (user_id, date DESC);

-- user_settings.partner_user_id — used inside multiple RLS policies
-- (programs, program_days, workouts, workout_exercises). Currently every
-- partner-shared read does a seq scan of user_settings.
CREATE INDEX IF NOT EXISTS idx_user_settings_partner_user_id
  ON public.user_settings (partner_user_id)
  WHERE partner_user_id IS NOT NULL;

-- workout_sessions.completed_at — used by CSV export, PR detection, history.
-- Partial: skip in-progress sessions.
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_completed
  ON public.workout_sessions (user_id, completed_at DESC)
  WHERE completed_at IS NOT NULL;

-- exercise_alternatives reverse direction — needed for "what's similar to this exercise?"
-- queries that filter on alternative_id.
CREATE INDEX IF NOT EXISTS idx_exercise_alternatives_alternative
  ON public.exercise_alternatives (alternative_id);

-- public_stats partner mode flag — partner discovery query.
CREATE INDEX IF NOT EXISTS idx_public_stats_partner_mode
  ON public.public_stats (partner_mode)
  WHERE partner_mode = true;

-- workout_exercises ordering inside a workout — workout detail screen.
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_order
  ON public.workout_exercises (workout_id, order_index);

COMMIT;
