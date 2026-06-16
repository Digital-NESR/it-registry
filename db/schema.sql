-- NESR IT Application Registry — database schema
-- Applied automatically by the app (lib/db.js ensureSchema) and by the seed
-- script, but kept here for reference / manual provisioning.

CREATE TABLE IF NOT EXISTS applications (
  id          SERIAL PRIMARY KEY,
  -- The full application record (all 8 domains + workflow metadata) is stored
  -- as JSONB so the ~60-field, still-evolving registry schema stays flexible.
  record      JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Speeds up filtering the approvals queue by status.
CREATE INDEX IF NOT EXISTS applications_approval_idx
  ON applications ((record->>'approvalStatus'));
