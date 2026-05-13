-- Normalize session_sets.exercise_id from text(uuid|slug) → uuid + FK to exercises.
-- Background: column was created as text to allow both UUIDs and slugs during early dev.
-- Live data (audited 2026-05-12): 464 UUID rows, 163 slug rows, 0 nulls, 627 total.

BEGIN;

-- 1. Backfill: replace slug values with their UUID equivalents from exercises.slug.
UPDATE public.session_sets ss
SET exercise_id = e.id::text
FROM public.exercises e
WHERE ss.exercise_id = e.slug
  AND ss.exercise_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 2. Hard guarantee: no rows can remain that don't resolve to a real exercise.
DO $$
DECLARE
  bad_count int;
BEGIN
  SELECT count(*) INTO bad_count
  FROM public.session_sets ss
  LEFT JOIN public.exercises e ON e.id::text = ss.exercise_id
  WHERE e.id IS NULL;

  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Migration aborted: % session_sets rows cannot resolve to an exercise. Inspect via: SELECT exercise_id FROM session_sets ss LEFT JOIN exercises e ON e.id::text = ss.exercise_id WHERE e.id IS NULL;', bad_count;
  END IF;
END $$;

-- 3. Change column type to uuid.
ALTER TABLE public.session_sets
  ALTER COLUMN exercise_id TYPE uuid USING exercise_id::uuid;

-- 4. Enforce referential integrity. ON DELETE RESTRICT: don't allow deleting an exercise
-- that has historical sets logged against it; soft-archive instead.
ALTER TABLE public.session_sets
  ADD CONSTRAINT session_sets_exercise_id_fkey
  FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE RESTRICT;

COMMIT;
