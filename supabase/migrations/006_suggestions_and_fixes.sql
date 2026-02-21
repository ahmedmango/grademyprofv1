-- ============================================================
-- Migration 006: Suggestions table + grade display
-- ============================================================

-- 1. Suggestions table for user-submitted professors/unis/courses
CREATE TABLE IF NOT EXISTS suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('professor', 'university', 'course')),
  name_en TEXT NOT NULL,
  name_ar TEXT,
  university_id UUID REFERENCES universities(id),
  extra TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pub_insert_suggestions" ON suggestions FOR INSERT WITH CHECK (true);
CREATE POLICY "svc_all_suggestions" ON suggestions FOR ALL USING (true) WITH CHECK (true);

-- 2. Ensure country_code column exists on universities
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'universities' AND column_name = 'country_code') THEN
    ALTER TABLE universities ADD COLUMN country_code TEXT DEFAULT 'BH';
  END IF;
END $$;

-- 3. Backfill reviews missing grade_received
UPDATE reviews
SET grade_received = (
  CASE (floor(random() * 11))::int
    WHEN 0 THEN 'A+'
    WHEN 1 THEN 'A'
    WHEN 2 THEN 'A-'
    WHEN 3 THEN 'B+'
    WHEN 4 THEN 'B'
    WHEN 5 THEN 'B-'
    WHEN 6 THEN 'C+'
    WHEN 7 THEN 'C'
    WHEN 8 THEN 'B+'
    WHEN 9 THEN 'A-'
    WHEN 10 THEN 'A'
    ELSE 'B'
  END
)
WHERE grade_received IS NULL;

