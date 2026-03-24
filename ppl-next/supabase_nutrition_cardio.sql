-- ── Nutrition tracking ────────────────────────────────────────

-- Daily nutrition targets per user
CREATE TABLE IF NOT EXISTS nutrition_targets (
  user_id     uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  calories    int,
  protein_g   int,
  carbs_g     int,
  fat_g       int,
  updated_at  timestamptz DEFAULT now()
);

-- Daily nutrition log entries
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  date        date NOT NULL,
  calories    int DEFAULT 0,
  protein_g   numeric(6,1) DEFAULT 0,
  carbs_g     numeric(6,1) DEFAULT 0,
  fat_g       numeric(6,1) DEFAULT 0,
  notes       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);

-- ── Cardio support ─────────────────────────────────────────────

-- Add category and cardio metadata to exercises
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'strength' CHECK (category IN ('strength', 'cardio')),
  ADD COLUMN IF NOT EXISTS cardio_metric text CHECK (cardio_metric IN ('duration', 'distance', 'calories', null));

-- Add cardio fields to session_sets
ALTER TABLE session_sets
  ADD COLUMN IF NOT EXISTS duration_seconds int,
  ADD COLUMN IF NOT EXISTS distance_meters  numeric(8,2),
  ADD COLUMN IF NOT EXISTS calories_burned  int;

-- ── Seed cardio exercises ──────────────────────────────────────
INSERT INTO exercises (slug, name, muscles, secondary_muscles, tags, category, cardio_metric)
VALUES
  ('treadmill',       'Treadmill',       '{}'::text[], '{}'::text[], '{cardio}'::text[], 'cardio', 'distance'),
  ('stationary-bike', 'Stationary Bike', '{}'::text[], '{}'::text[], '{cardio}'::text[], 'cardio', 'duration'),
  ('rowing-machine',  'Rowing Machine',  '{}'::text[], '{}'::text[], '{cardio}'::text[], 'cardio', 'distance'),
  ('stairmaster',     'StairMaster',     '{}'::text[], '{}'::text[], '{cardio}'::text[], 'cardio', 'duration'),
  ('elliptical',      'Elliptical',      '{}'::text[], '{}'::text[], '{cardio}'::text[], 'cardio', 'duration'),
  ('jump-rope',       'Jump Rope',       '{}'::text[], '{}'::text[], '{cardio}'::text[], 'cardio', 'duration'),
  ('hiit',            'HIIT',            '{}'::text[], '{}'::text[], '{cardio}'::text[], 'cardio', 'duration'),
  ('outdoor-run',     'Outdoor Run',     '{}'::text[], '{}'::text[], '{cardio}'::text[], 'cardio', 'distance'),
  ('outdoor-walk',    'Outdoor Walk',    '{}'::text[], '{}'::text[], '{cardio}'::text[], 'cardio', 'distance'),
  ('swimming',        'Swimming',        '{}'::text[], '{}'::text[], '{cardio}'::text[], 'cardio', 'distance')
ON CONFLICT (slug) DO UPDATE SET
  category = EXCLUDED.category,
  cardio_metric = EXCLUDED.cardio_metric;

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE nutrition_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own nutrition targets"
  ON nutrition_targets FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own nutrition logs"
  ON nutrition_logs FOR ALL USING (auth.uid() = user_id);
