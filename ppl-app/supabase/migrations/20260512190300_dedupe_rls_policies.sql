-- Drop duplicate RLS policies. The DB currently has paired policies on 7 tables
-- (e.g. "Users can manage own X" + "Users manage own X" with identical USING/WITH CHECK)
-- from successive migrations that didn't clean up. Every query evaluates both,
-- doubling the RLS overhead.
-- Keeping the shorter ("Users manage own ...") name; dropping the verbose duplicate.

BEGIN;

DROP POLICY IF EXISTS "Users can manage own achievements" ON public.achievements;
DROP POLICY IF EXISTS "Users can manage own measurements" ON public.body_measurements;
DROP POLICY IF EXISTS "Users can manage own bodyweight" ON public.bodyweight;
DROP POLICY IF EXISTS "Users can manage own photos" ON public.progress_photos;
DROP POLICY IF EXISTS "Users can manage own sets" ON public.session_sets;
DROP POLICY IF EXISTS "Users can manage own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can manage own sessions" ON public.workout_sessions;

-- public_stats has two identical SELECT policies; keep the descriptive one.
DROP POLICY IF EXISTS "Public stats readable by authenticated" ON public.public_stats;

COMMIT;
