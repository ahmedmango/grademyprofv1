-- ============================================================
-- GradeMyProfessor Bahrain — Supabase Migration
-- Reviews default to 'pending' — moderators must approve.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE review_status AS ENUM ('pending', 'live', 'shadow', 'flagged', 'removed');
CREATE TYPE report_reason AS ENUM ('spam', 'offensive', 'inaccurate', 'doxxing', 'other');
CREATE TYPE admin_role    AS ENUM ('super_admin', 'moderator', 'viewer');

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE universities (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en    TEXT NOT NULL,
  name_ar    TEXT,
  country    TEXT NOT NULL DEFAULT 'BH',
  slug       TEXT NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE departments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id  UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name_en        TEXT NOT NULL,
  name_ar        TEXT,
  slug           TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (university_id, slug)
);

CREATE TABLE professors (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id  UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  department_id  UUID REFERENCES departments(id) ON DELETE SET NULL,
  name_en        TEXT NOT NULL,
  name_ar        TEXT,
  slug           TEXT NOT NULL UNIQUE,
  photo_url      TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE courses (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id  UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  department_id  UUID REFERENCES departments(id) ON DELETE SET NULL,
  code           TEXT NOT NULL,
  title_en       TEXT NOT NULL,
  title_ar       TEXT,
  slug           TEXT NOT NULL UNIQUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (university_id, code)
);

CREATE TABLE professor_courses (
  professor_id   UUID NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  course_id      UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  PRIMARY KEY (professor_id, course_id)
);

CREATE TABLE reviews (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professor_id         UUID NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  course_id            UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  university_id        UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  anon_user_hash       TEXT NOT NULL,
  rating_quality       NUMERIC(2,1) NOT NULL CHECK (rating_quality >= 0.5 AND rating_quality <= 5.0),
  rating_difficulty    NUMERIC(2,1) NOT NULL CHECK (rating_difficulty >= 0.5 AND rating_difficulty <= 5.0),
  would_take_again     BOOLEAN,
  attendance_mandatory BOOLEAN,
  uses_textbook        BOOLEAN,
  tags                 TEXT[] DEFAULT '{}',
  comment              TEXT DEFAULT '',
  status               review_status NOT NULL DEFAULT 'pending',
  toxicity_score       NUMERIC(3,2) DEFAULT 0,
  risk_flags           JSONB DEFAULT '{}',
  ip_hash              TEXT,
  user_agent_hash      TEXT,
  semester_window      TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE aggregates_professor (
  professor_id         UUID PRIMARY KEY REFERENCES professors(id) ON DELETE CASCADE,
  review_count         INT NOT NULL DEFAULT 0,
  avg_quality          NUMERIC(3,2) DEFAULT 0,
  avg_difficulty       NUMERIC(3,2) DEFAULT 0,
  would_take_again_pct NUMERIC(5,2) DEFAULT 0,
  rating_dist          JSONB DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0}',
  tag_dist             JSONB DEFAULT '{}',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id   UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  reason      report_reason NOT NULL,
  detail      TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admin_users (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role       admin_role NOT NULL DEFAULT 'moderator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rate_limits (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anon_user_hash TEXT NOT NULL,
  ip_hash        TEXT,
  action         TEXT NOT NULL DEFAULT 'review',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_reviews_professor_created    ON reviews(professor_id, created_at DESC);
CREATE INDEX idx_reviews_course_created       ON reviews(course_id, created_at DESC);
CREATE INDEX idx_reviews_status               ON reviews(status);
CREATE INDEX idx_reviews_status_created       ON reviews(status, created_at DESC);
CREATE INDEX idx_reviews_anon_user            ON reviews(anon_user_hash);
CREATE INDEX idx_professors_university_dept   ON professors(university_id, department_id);
CREATE INDEX idx_courses_university_code      ON courses(university_id, code);
CREATE INDEX idx_rate_limits_user_time        ON rate_limits(anon_user_hash, created_at DESC);
CREATE INDEX idx_rate_limits_ip_time          ON rate_limits(ip_hash, created_at DESC);
CREATE INDEX idx_professors_name_search       ON professors USING GIN (to_tsvector('english', name_en));
CREATE INDEX idx_courses_search               ON courses USING GIN (to_tsvector('english', code || ' ' || title_en));

CREATE UNIQUE INDEX idx_reviews_unique_per_semester
  ON reviews(anon_user_hash, professor_id, course_id, semester_window)
  WHERE status NOT IN ('removed');

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE universities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE professors            ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE professor_courses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews               ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregates_professor  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports               ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits           ENABLE ROW LEVEL SECURITY;

-- Public reads
CREATE POLICY "pub_read_universities"       ON universities       FOR SELECT USING (is_active = true);
CREATE POLICY "pub_read_departments"        ON departments        FOR SELECT USING (true);
CREATE POLICY "pub_read_professors"         ON professors         FOR SELECT USING (is_active = true);
CREATE POLICY "pub_read_courses"            ON courses            FOR SELECT USING (true);
CREATE POLICY "pub_read_prof_courses"       ON professor_courses  FOR SELECT USING (true);
CREATE POLICY "pub_read_live_reviews"       ON reviews            FOR SELECT USING (status = 'live');
CREATE POLICY "pub_read_aggregates"         ON aggregates_professor FOR SELECT USING (true);

-- Service role (Edge Functions / API routes use service key)
CREATE POLICY "svc_all_reviews"       ON reviews             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "svc_all_reports"       ON reports             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "svc_all_aggregates"    ON aggregates_professor FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "svc_all_rate_limits"   ON rate_limits         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "svc_all_admin_users"   ON admin_users         FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Functions
-- ============================================================

-- Refresh professor aggregates (only counts 'live' reviews)
CREATE OR REPLACE FUNCTION refresh_professor_aggregates(p_professor_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO aggregates_professor (professor_id, review_count, avg_quality, avg_difficulty, would_take_again_pct, rating_dist, tag_dist, updated_at)
  SELECT
    p_professor_id,
    COUNT(*)::INT,
    ROUND(AVG(rating_quality), 2),
    ROUND(AVG(rating_difficulty), 2),
    ROUND(
      (COUNT(*) FILTER (WHERE would_take_again = true)::NUMERIC /
       NULLIF(COUNT(*) FILTER (WHERE would_take_again IS NOT NULL), 0)) * 100, 2
    ),
    jsonb_build_object(
      '1', COUNT(*) FILTER (WHERE rating_quality >= 0.5 AND rating_quality < 1.5),
      '2', COUNT(*) FILTER (WHERE rating_quality >= 1.5 AND rating_quality < 2.5),
      '3', COUNT(*) FILTER (WHERE rating_quality >= 2.5 AND rating_quality < 3.5),
      '4', COUNT(*) FILTER (WHERE rating_quality >= 3.5 AND rating_quality < 4.5),
      '5', COUNT(*) FILTER (WHERE rating_quality >= 4.5)
    ),
    (
      SELECT COALESCE(jsonb_object_agg(tag, cnt), '{}'::jsonb)
      FROM (
        SELECT unnest(tags) AS tag, COUNT(*) AS cnt
        FROM reviews
        WHERE professor_id = p_professor_id AND status = 'live'
        GROUP BY tag
      ) tag_counts
    ),
    now()
  FROM reviews
  WHERE professor_id = p_professor_id AND status = 'live'
  ON CONFLICT (professor_id) DO UPDATE SET
    review_count         = EXCLUDED.review_count,
    avg_quality          = EXCLUDED.avg_quality,
    avg_difficulty       = EXCLUDED.avg_difficulty,
    would_take_again_pct = EXCLUDED.would_take_again_pct,
    rating_dist          = EXCLUDED.rating_dist,
    tag_dist             = EXCLUDED.tag_dist,
    updated_at           = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Current semester helper
CREATE OR REPLACE FUNCTION current_semester_window()
RETURNS TEXT AS $$
BEGIN
  IF EXTRACT(MONTH FROM now()) BETWEEN 1 AND 5 THEN
    RETURN EXTRACT(YEAR FROM now()) || '-spring';
  ELSIF EXTRACT(MONTH FROM now()) BETWEEN 6 AND 8 THEN
    RETURN EXTRACT(YEAR FROM now()) || '-summer';
  ELSE
    RETURN EXTRACT(YEAR FROM now()) || '-fall';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Search function
CREATE OR REPLACE FUNCTION search_professors_courses(search_query TEXT, result_limit INT DEFAULT 20)
RETURNS TABLE (
  result_type TEXT,
  id UUID,
  name TEXT,
  slug TEXT,
  extra JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'professor'::TEXT, p.id, p.name_en, p.slug,
    jsonb_build_object('department', d.name_en, 'university', u.name_en, 'university_slug', u.slug, 'avg_quality', ap.avg_quality, 'review_count', ap.review_count)
  FROM professors p
  LEFT JOIN departments d ON p.department_id = d.id
  LEFT JOIN universities u ON p.university_id = u.id
  LEFT JOIN aggregates_professor ap ON p.id = ap.professor_id
  WHERE p.is_active = true AND (
    p.name_en ILIKE '%' || search_query || '%' OR
    p.name_ar ILIKE '%' || search_query || '%' OR
    to_tsvector('english', p.name_en) @@ plainto_tsquery('english', search_query)
  )
  UNION ALL
  SELECT 'course'::TEXT, c.id, c.code || ' — ' || c.title_en, c.slug,
    jsonb_build_object('code', c.code, 'title', c.title_en, 'university', u.name_en, 'university_slug', u.slug)
  FROM courses c
  LEFT JOIN universities u ON c.university_id = u.id
  WHERE c.code ILIKE '%' || search_query || '%' OR c.title_en ILIKE '%' || search_query || '%'
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Seed Data
-- ============================================================

INSERT INTO universities (name_en, name_ar, country, slug) VALUES
  ('University of Bahrain',            'جامعة البحرين',                       'BH', 'uob'),
  ('American University of Bahrain',   'الجامعة الأمريكية في البحرين',        'BH', 'aubh'),
  ('Bahrain Polytechnic',              'بوليتكنك البحرين',                    'BH', 'polybh'),
  ('RCSI Bahrain',                     'الكلية الملكية للجراحين في البحرين',  'BH', 'rcsi'),
  ('Arabian Gulf University',          'جامعة الخليج العربي',                 'BH', 'agu'),
  ('University of Technology Bahrain', 'جامعة التكنولوجيا البحرين',           'BH', 'utb'),
  ('Applied Science University',       'جامعة العلوم التطبيقية',              'BH', 'asu'),
  ('Ahlia University',                 'جامعة العلياء',                        'BH', 'ahlia');

INSERT INTO departments (university_id, name_en, name_ar, slug)
SELECT u.id, d.name_en, d.name_ar, d.slug
FROM universities u
CROSS JOIN (VALUES
  ('Computer Science',        'علوم الحاسوب',          'computer-science'),
  ('Electrical Engineering',  'الهندسة الكهربائية',    'electrical-engineering'),
  ('Mathematics',             'الرياضيات',             'mathematics'),
  ('Business Administration', 'إدارة الأعمال',         'business-administration'),
  ('English Language',        'اللغة الإنجليزية',      'english-language'),
  ('Mechanical Engineering',  'الهندسة الميكانيكية',   'mechanical-engineering')
) AS d(name_en, name_ar, slug)
WHERE u.slug IN ('uob', 'aubh');

-- Seed a default admin (password: admin123 — CHANGE THIS)
-- Hash generated with: SELECT crypt('admin123', gen_salt('bf'));
INSERT INTO admin_users (email, password_hash, role)
VALUES ('admin@grademyprofessor.bh', crypt('admin123', gen_salt('bf')), 'super_admin');
