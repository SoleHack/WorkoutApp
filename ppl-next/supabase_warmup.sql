-- Add warmup flag to session_sets
ALTER TABLE session_sets ADD COLUMN IF NOT EXISTS is_warmup boolean DEFAULT false;

-- Add is_warmup to the index for filtering
CREATE INDEX IF NOT EXISTS session_sets_warmup_idx ON session_sets (session_id, is_warmup);
