-- Partner code system: unique 6-char code per user for server-side partner lookup.
-- Replaces the current pattern where the client downloads .limit(1000) of all
-- user_settings rows and does the match in JS (app/(tabs)/partner.tsx:204).

BEGIN;

-- 1. Column + backfill for existing users.
ALTER TABLE public.user_settings
  ADD COLUMN partner_code text;

UPDATE public.user_settings
SET partner_code = upper(substr(md5(user_id::text || random()::text), 1, 6))
WHERE partner_code IS NULL;

-- 2. Make permanent + unique. Index is implicit on the unique constraint.
ALTER TABLE public.user_settings
  ALTER COLUMN partner_code SET NOT NULL,
  ADD CONSTRAINT user_settings_partner_code_key UNIQUE (partner_code);

-- 3. Trigger to generate a code on insert if one isn't provided. Loops in the
-- (vanishingly unlikely) case of collision until it finds a free code.
CREATE OR REPLACE FUNCTION public.gen_partner_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.partner_code IS NULL THEN
    LOOP
      NEW.partner_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.user_settings WHERE partner_code = NEW.partner_code
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_settings_gen_partner_code
  BEFORE INSERT ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.gen_partner_code();

-- 4. Server-side lookup RPC. SECURITY DEFINER so it can scan user_settings
-- under RLS, but it only returns the matched user and excludes self.
-- Returns at most one row.
CREATE OR REPLACE FUNCTION public.find_partner_by_code(code text)
RETURNS TABLE (user_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT us.user_id, us.partner_display_name
  FROM public.user_settings us
  WHERE us.partner_code = upper(code)
    AND us.user_id <> auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_partner_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_partner_by_code(text) TO authenticated;

COMMIT;
