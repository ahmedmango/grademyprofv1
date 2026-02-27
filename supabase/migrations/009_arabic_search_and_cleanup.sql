-- ============================================================
-- Migration 009: Arabic search performance + policy cleanup
-- ============================================================

-- Trigram indexes for Arabic name/title search (ILIKE queries were doing full scans)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_professors_name_ar_trgm
  ON professors USING GIN (name_ar gin_trgm_ops)
  WHERE name_ar IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_courses_title_ar_trgm
  ON courses USING GIN (title_ar gin_trgm_ops)
  WHERE title_ar IS NOT NULL;

-- Drop the user_read_own_reviews policy — it depends on
-- current_setting('app.anon_user_hash') which is never set by the
-- Next.js service client. My Reviews works via the service key
-- (which bypasses RLS), so this policy has never done anything.
DROP POLICY IF EXISTS "user_read_own_reviews" ON reviews;
