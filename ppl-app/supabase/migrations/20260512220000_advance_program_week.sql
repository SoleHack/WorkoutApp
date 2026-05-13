-- advance_program_week() — bumps the calling user's current_week if they've
-- completed enough sessions for the active week. Idempotent: safe to call
-- after every workout finish. Returns the new current_week (which may equal
-- the previous one if conditions aren't met).
--
-- Advancement rule:
--   - User has a periodized program (program.total_weeks > 1).
--   - current_week < total_weeks.
--   - Distinct non-rest, non-cardio session day_keys completed in the
--     [week_started_at, week_started_at + 7d) window >= number of
--     non-rest training days defined for the program.
--   - week_started_at moves to NOW() on advance.

BEGIN;

CREATE OR REPLACE FUNCTION public.advance_program_week()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  up_row     user_programs%ROWTYPE;
  total      int;
  expected   int;
  completed  int;
  week_start timestamptz;
  week_end   timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO up_row FROM public.user_programs WHERE user_id = auth.uid();
  IF NOT FOUND OR up_row.program_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT total_weeks INTO total FROM public.programs WHERE id = up_row.program_id;
  IF total IS NULL OR total <= 1 THEN
    -- Flat (non-periodized) programs don't advance.
    RETURN jsonb_build_object('advanced', false, 'current_week', up_row.current_week, 'reason', 'not_periodized');
  END IF;

  IF up_row.current_week >= total THEN
    RETURN jsonb_build_object('advanced', false, 'current_week', up_row.current_week, 'reason', 'at_end');
  END IF;

  -- Expected training days per week (excluding rest).
  SELECT count(*) INTO expected
  FROM public.program_days
  WHERE program_id = up_row.program_id AND is_rest = false;
  IF expected IS NULL OR expected = 0 THEN
    RETURN jsonb_build_object('advanced', false, 'current_week', up_row.current_week, 'reason', 'no_training_days');
  END IF;

  -- Window: from week_started_at (or now if null) for 7 days.
  week_start := COALESCE(up_row.week_started_at, now());
  week_end   := week_start + interval '7 days';

  -- Distinct non-rest/cardio day_keys completed in window.
  SELECT count(DISTINCT day_key) INTO completed
  FROM public.workout_sessions
  WHERE user_id = auth.uid()
    AND completed_at IS NOT NULL
    AND day_key NOT IN ('rest', 'cardio')
    AND date >= week_start::date
    AND date <  week_end::date;

  IF completed < expected THEN
    RETURN jsonb_build_object(
      'advanced', false,
      'current_week', up_row.current_week,
      'reason', 'not_enough_sessions',
      'completed', completed,
      'expected', expected
    );
  END IF;

  -- Advance.
  UPDATE public.user_programs
  SET current_week     = up_row.current_week + 1,
      week_started_at  = now(),
      updated_at       = now()
  WHERE user_id = auth.uid();

  RETURN jsonb_build_object(
    'advanced', true,
    'current_week', up_row.current_week + 1,
    'previous', up_row.current_week
  );
END;
$$;

REVOKE ALL ON FUNCTION public.advance_program_week() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advance_program_week() TO authenticated;

-- set_program_week(target_week) — manual override exposed in the editor + phase strip
-- for when the user wants to skip ahead, go back, or restart a phase. Clamps to
-- [1, total_weeks]. Resets week_started_at to now() so auto-advance picks up from
-- the new boundary.
CREATE OR REPLACE FUNCTION public.set_program_week(target_week int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  up_row user_programs%ROWTYPE;
  total  int;
  clamped int;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO up_row FROM public.user_programs WHERE user_id = auth.uid();
  IF NOT FOUND OR up_row.program_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT total_weeks INTO total FROM public.programs WHERE id = up_row.program_id;
  IF total IS NULL THEN total := 1; END IF;

  clamped := greatest(1, least(total, target_week));

  UPDATE public.user_programs
  SET current_week    = clamped,
      week_started_at = now(),
      updated_at      = now()
  WHERE user_id = auth.uid();

  RETURN jsonb_build_object('current_week', clamped);
END;
$$;

REVOKE ALL ON FUNCTION public.set_program_week(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_program_week(int) TO authenticated;

COMMIT;
