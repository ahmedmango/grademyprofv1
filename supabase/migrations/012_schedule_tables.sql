-- ============================================================
-- 012_schedule_tables.sql
-- Student Schedule Manager — schedules + course_entries
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE schedules (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL,
  semester_name TEXT NOT NULL DEFAULT 'Spring 2026',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  week_start    TEXT NOT NULL DEFAULT 'sun',  -- 'sun' (Sun-Thu) or 'mon' (Mon-Fri)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE course_entries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id   UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  course_name   TEXT NOT NULL,
  section       TEXT,
  professor_name TEXT NOT NULL DEFAULT '',
  professor_id  UUID REFERENCES professors(id) ON DELETE SET NULL,
  days          TEXT[] NOT NULL DEFAULT '{}',
  start_time    TIME NOT NULL DEFAULT '09:00',
  end_time      TIME NOT NULL DEFAULT '10:00',
  location      TEXT,
  color         TEXT NOT NULL DEFAULT '#7C3AED',
  credit_hours  INT NOT NULL DEFAULT 3,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX idx_schedules_user           ON schedules(user_id);
CREATE INDEX idx_schedules_user_active    ON schedules(user_id, is_active);
CREATE INDEX idx_course_entries_schedule  ON course_entries(schedule_id);

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE schedules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_entries ENABLE ROW LEVEL SECURITY;

-- Schedules: service role only (API routes use service key)
-- No public/anon access — all access goes through authenticated API routes
COMMENT ON TABLE public.schedules IS 'Student schedules. RLS enabled, no public policies — accessed only via service role key in API routes.';
COMMENT ON TABLE public.course_entries IS 'Course entries within schedules. RLS enabled, no public policies — accessed only via service role key in API routes.';

-- ============================================================
-- 4. UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_schedule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_schedule_timestamp();

CREATE TRIGGER trg_course_entries_updated_at
  BEFORE UPDATE ON course_entries
  FOR EACH ROW EXECUTE FUNCTION update_schedule_timestamp();
