-- Periodization support: phases, weekly overrides, user 1RMs, exercise grouping.
-- Programs without phases/weeks remain valid — periodization is OPT-IN.
-- A program is "periodized" iff it has rows in program_phases + program_weeks;
-- otherwise the existing flat-program behavior continues to apply.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- 1. Program-level metadata
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS total_weeks integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS target_experience text;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Phases — group weeks into named phases (Intensification / Peak / …)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.program_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  week_start integer NOT NULL,
  week_end integer NOT NULL,
  goal text,
  intensity_range text,
  rpe_target text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT program_phases_week_range_chk CHECK (week_start <= week_end),
  CONSTRAINT program_phases_slug_chk CHECK (length(slug) > 0),
  UNIQUE (program_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_program_phases_program_id ON public.program_phases (program_id);

-- ─────────────────────────────────────────────────────────────────────
-- 3. Per-week overrides — loading %, modifiers, techniques, coach notes
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.program_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  phase_id uuid REFERENCES public.program_phases(id) ON DELETE SET NULL,
  compound_load_pct numeric NOT NULL DEFAULT 1.0,
  accessory_load_pct numeric NOT NULL DEFAULT 1.0,
  rest_modifier numeric NOT NULL DEFAULT 1.0,
  set_modifier numeric NOT NULL DEFAULT 1.0,
  techniques text[] NOT NULL DEFAULT '{}',
  coach_note text,
  progression_focus text,
  compound_target text,
  accessory_target text,
  key_lifts jsonb,
  special_instructions text[],
  created_at timestamptz DEFAULT now(),
  CONSTRAINT program_weeks_week_number_chk CHECK (week_number >= 1),
  CONSTRAINT program_weeks_compound_load_chk CHECK (compound_load_pct > 0 AND compound_load_pct <= 1.5),
  CONSTRAINT program_weeks_accessory_load_chk CHECK (accessory_load_pct > 0 AND accessory_load_pct <= 1.5),
  CONSTRAINT program_weeks_rest_chk CHECK (rest_modifier > 0 AND rest_modifier <= 2.0),
  CONSTRAINT program_weeks_set_chk CHECK (set_modifier > 0 AND set_modifier <= 2.0),
  UNIQUE (program_id, week_number)
);

CREATE INDEX IF NOT EXISTS idx_program_weeks_program_id ON public.program_weeks (program_id);
CREATE INDEX IF NOT EXISTS idx_program_weeks_phase_id ON public.program_weeks (phase_id) WHERE phase_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 4. User-tested 1RMs — used to compute working weight from phase load%
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_lift_maxes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  one_rm numeric NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  tested_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT user_lift_maxes_one_rm_chk CHECK (one_rm > 0),
  CONSTRAINT user_lift_maxes_source_chk CHECK (source IN ('manual', 'estimated_from_session', 'retest')),
  PRIMARY KEY (user_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_user_lift_maxes_user_id ON public.user_lift_maxes (user_id);

-- ─────────────────────────────────────────────────────────────────────
-- 5. Exercise-level extensions: grouping + structured reps + techniques
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS superset_group text,
  ADD COLUMN IF NOT EXISTS group_type text DEFAULT 'single' NOT NULL,
  ADD COLUMN IF NOT EXISTS reps_min integer,
  ADD COLUMN IF NOT EXISTS reps_max integer,
  ADD COLUMN IF NOT EXISTS rep_unit text DEFAULT 'reps' NOT NULL,
  ADD COLUMN IF NOT EXISTS intensity_note text,
  ADD COLUMN IF NOT EXISTS progression_rule text,
  ADD COLUMN IF NOT EXISTS intensity_technique text,
  ADD COLUMN IF NOT EXISTS is_compound boolean DEFAULT false NOT NULL;

-- Constraints — keep them additive so existing flat-program rows still validate.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workout_exercises_group_type_chk') THEN
    ALTER TABLE public.workout_exercises
      ADD CONSTRAINT workout_exercises_group_type_chk
      CHECK (group_type IN ('single', 'superset', 'circuit'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workout_exercises_rep_unit_chk') THEN
    ALTER TABLE public.workout_exercises
      ADD CONSTRAINT workout_exercises_rep_unit_chk
      CHECK (rep_unit IN ('reps', 'seconds', 'failure'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_workout_exercises_superset_group
  ON public.workout_exercises (workout_id, superset_group)
  WHERE superset_group IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 6. RLS — phases / weeks / 1RMs
--    Phases & weeks follow the program's read policy: own + public + default + partner.
--    Writes follow the program's mutate policy: own only.
--    1RMs are per-user, fully private.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.program_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_weeks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lift_maxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Program phases: read inherits from program"
  ON public.program_phases FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = program_phases.program_id
      AND (
        p.is_default = true
        OR p.is_public = true
        OR (auth.uid() IS NOT NULL AND p.user_id = auth.uid())
        OR (auth.uid() IS NOT NULL AND p.user_id IN (
          SELECT us.partner_user_id FROM public.user_settings us
          WHERE us.user_id = auth.uid() AND us.partner_user_id IS NOT NULL
        ))
      )
  ));

CREATE POLICY "Program phases: users mutate own"
  ON public.program_phases FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = program_phases.program_id
      AND auth.uid() IS NOT NULL AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = program_phases.program_id
      AND auth.uid() IS NOT NULL AND p.user_id = auth.uid()
  ));

CREATE POLICY "Program weeks: read inherits from program"
  ON public.program_weeks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = program_weeks.program_id
      AND (
        p.is_default = true
        OR p.is_public = true
        OR (auth.uid() IS NOT NULL AND p.user_id = auth.uid())
        OR (auth.uid() IS NOT NULL AND p.user_id IN (
          SELECT us.partner_user_id FROM public.user_settings us
          WHERE us.user_id = auth.uid() AND us.partner_user_id IS NOT NULL
        ))
      )
  ));

CREATE POLICY "Program weeks: users mutate own"
  ON public.program_weeks FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = program_weeks.program_id
      AND auth.uid() IS NOT NULL AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = program_weeks.program_id
      AND auth.uid() IS NOT NULL AND p.user_id = auth.uid()
  ));

CREATE POLICY "User lift maxes: users manage own"
  ON public.user_lift_maxes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────
-- 7. User program state — track which week the user is on
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_programs
  ADD COLUMN IF NOT EXISTS current_week integer DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS week_started_at timestamptz DEFAULT now();

COMMIT;
