-- Add FKs from every user-owned table to auth.users(id).
-- Without these, "Delete Account" (Settings → Account → Delete) leaves orphaned rows
-- in every domain table because nothing cascades on auth.users deletion.
-- ON DELETE CASCADE for owned data; SET NULL where the row can legitimately survive
-- (created_by, partner_user_id).
--
-- Idempotent: cross-schema FKs to auth.users don't always show in
-- information_schema, so each ADD is gated on pg_constraint membership.

BEGIN;

DO $$
DECLARE
  fk_spec record;
BEGIN
  FOR fk_spec IN
    SELECT * FROM (VALUES
      ('bodyweight',         'bodyweight_user_id_fkey',         'user_id',         'CASCADE'),
      ('body_measurements',  'body_measurements_user_id_fkey',  'user_id',         'CASCADE'),
      ('workout_sessions',   'workout_sessions_user_id_fkey',   'user_id',         'CASCADE'),
      ('progress_photos',    'progress_photos_user_id_fkey',    'user_id',         'CASCADE'),
      ('user_settings',      'user_settings_user_id_fkey',      'user_id',         'CASCADE'),
      ('user_programs',      'user_programs_user_id_fkey',      'user_id',         'CASCADE'),
      ('programs',           'programs_user_id_fkey',           'user_id',         'CASCADE'),
      ('workouts',           'workouts_user_id_fkey',           'user_id',         'CASCADE'),
      ('achievements',       'achievements_user_id_fkey',       'user_id',         'CASCADE'),
      ('nutrition_logs',     'nutrition_logs_user_id_fkey',     'user_id',         'CASCADE'),
      ('nutrition_targets',  'nutrition_targets_user_id_fkey',  'user_id',         'CASCADE'),
      ('public_stats',       'public_stats_user_id_fkey',       'user_id',         'CASCADE'),
      ('user_settings',      'user_settings_partner_user_id_fkey', 'partner_user_id', 'SET NULL'),
      ('exercises',          'exercises_created_by_fkey',       'created_by',      'SET NULL')
    ) AS t(tbl, conname, col, ondelete)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = fk_spec.conname
        AND conrelid = ('public.' || fk_spec.tbl)::regclass
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE %s',
        fk_spec.tbl, fk_spec.conname, fk_spec.col, fk_spec.ondelete
      );
      RAISE NOTICE 'Added FK: %.%', fk_spec.tbl, fk_spec.conname;
    ELSE
      RAISE NOTICE 'Skipped FK (exists): %.%', fk_spec.tbl, fk_spec.conname;
    END IF;
  END LOOP;
END $$;

COMMIT;
