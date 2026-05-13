-- clone_program(source_id, owner_id) — deep-copies a program into the owner's
-- namespace. Used when a user activates a system / public program: they get
-- their own copy they can customize, and future edits to the seed program
-- won't disrupt their in-progress run.
--
-- The clone copies: program row → phases → weeks (remapping phase IDs) →
-- workouts → workout_exercises → program_days (remapping workout IDs).
-- It does NOT copy sessions or user state. The caller wires user_programs
-- to point at the returned new program_id.
--
-- SECURITY DEFINER so it can read system rows (user_id IS NULL) while running
-- as an authenticated user; the source-readability check enforces the same
-- visibility rules as the SELECT RLS policy on programs.

BEGIN;

CREATE OR REPLACE FUNCTION public.clone_program(source_id uuid, owner_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_program_id  uuid;
  src_workout_rec record;
  src_day_rec     record;
  new_workout_id  uuid;
  phase_map       jsonb := '{}'::jsonb;
  workout_map     jsonb := '{}'::jsonb;
  src_phase       record;
  new_phase_id    uuid;
BEGIN
  -- Caller must be the owner_id (no cloning into someone else's account).
  IF auth.uid() IS NULL OR auth.uid() <> owner_id THEN
    RAISE EXCEPTION 'clone_program: owner_id must match auth.uid()';
  END IF;

  -- Source must be readable per the programs SELECT RLS policy
  -- (own / public / default / partner). The function runs as definer so we
  -- enforce visibility manually.
  PERFORM 1
  FROM public.programs p
  LEFT JOIN public.user_settings us ON us.user_id = auth.uid()
  WHERE p.id = source_id
    AND (
      p.is_default = true
      OR p.is_public = true
      OR p.user_id = auth.uid()
      OR p.user_id = us.partner_user_id
    );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'clone_program: source program not accessible';
  END IF;

  -- 1. Program row
  INSERT INTO public.programs (user_id, name, description, split_type, total_weeks, target_experience, is_default, is_public)
  SELECT owner_id, name, description, split_type, total_weeks, target_experience, false, false
  FROM public.programs WHERE id = source_id
  RETURNING id INTO new_program_id;

  -- 2. Phases (remember source_id → new_id mapping)
  FOR src_phase IN
    SELECT * FROM public.program_phases WHERE program_id = source_id ORDER BY order_index
  LOOP
    INSERT INTO public.program_phases (program_id, slug, name, week_start, week_end, goal, intensity_range, rpe_target, order_index)
    VALUES (new_program_id, src_phase.slug, src_phase.name, src_phase.week_start, src_phase.week_end,
            src_phase.goal, src_phase.intensity_range, src_phase.rpe_target, src_phase.order_index)
    RETURNING id INTO new_phase_id;
    phase_map := phase_map || jsonb_build_object(src_phase.id::text, new_phase_id::text);
  END LOOP;

  -- 3. Weeks (resolve phase_id via the map)
  INSERT INTO public.program_weeks (
    program_id, week_number, phase_id,
    compound_load_pct, accessory_load_pct, rest_modifier, set_modifier,
    techniques, coach_note, progression_focus, compound_target, accessory_target,
    key_lifts, special_instructions
  )
  SELECT
    new_program_id, week_number,
    CASE WHEN phase_id IS NULL THEN NULL
         ELSE (phase_map->>phase_id::text)::uuid END,
    compound_load_pct, accessory_load_pct, rest_modifier, set_modifier,
    techniques, coach_note, progression_focus, compound_target, accessory_target,
    key_lifts, special_instructions
  FROM public.program_weeks
  WHERE program_id = source_id;

  -- 4. Workouts (one per program_day; remember the mapping)
  FOR src_workout_rec IN
    SELECT DISTINCT w.*
    FROM public.workouts w
    JOIN public.program_days pd ON pd.workout_id = w.id
    WHERE pd.program_id = source_id
  LOOP
    INSERT INTO public.workouts (user_id, name, slug, day_type, color, focus, is_morning_routine)
    VALUES (
      owner_id,
      src_workout_rec.name,
      -- Suffix the slug so it stays unique under the (user_id, slug) constraint.
      src_workout_rec.slug || '-' || substr(new_program_id::text, 1, 8),
      src_workout_rec.day_type,
      src_workout_rec.color,
      src_workout_rec.focus,
      coalesce(src_workout_rec.is_morning_routine, false)
    )
    RETURNING id INTO new_workout_id;

    workout_map := workout_map || jsonb_build_object(src_workout_rec.id::text, new_workout_id::text);

    -- 4b. Copy workout_exercises for this workout
    INSERT INTO public.workout_exercises (
      workout_id, exercise_id, order_index, sets, reps, rest_seconds, tag, notes, accent,
      superset_group, group_type, reps_min, reps_max, rep_unit,
      intensity_note, progression_rule, intensity_technique, is_compound
    )
    SELECT
      new_workout_id, exercise_id, order_index, sets, reps, rest_seconds, tag, notes, accent,
      superset_group, group_type, reps_min, reps_max, rep_unit,
      intensity_note, progression_rule, intensity_technique, is_compound
    FROM public.workout_exercises
    WHERE workout_id = src_workout_rec.id
    ORDER BY order_index;
  END LOOP;

  -- 5. program_days (resolve workout_id via the map; rest days have workout_id NULL)
  INSERT INTO public.program_days (program_id, day_index, workout_id, is_rest)
  SELECT
    new_program_id, day_index,
    CASE WHEN workout_id IS NULL THEN NULL
         ELSE (workout_map->>workout_id::text)::uuid END,
    is_rest
  FROM public.program_days
  WHERE program_id = source_id;

  RETURN new_program_id;
END;
$$;

REVOKE ALL ON FUNCTION public.clone_program(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clone_program(uuid, uuid) TO authenticated;

COMMIT;
