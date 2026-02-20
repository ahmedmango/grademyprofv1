-- ============================================================
-- GradeMyProfessor v2 — Infrastructure Upgrade Migration
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- 1. Status counts RPC (replaces 5 sequential queries)
CREATE OR REPLACE FUNCTION get_review_status_counts()
RETURNS JSONB AS $$
  SELECT jsonb_object_agg(status, cnt)
  FROM (
    SELECT status::TEXT, COUNT(*)::INT AS cnt
    FROM reviews
    GROUP BY status
  ) sub;
$$ LANGUAGE sql STABLE;

-- 2. Auto-link professor <-> course on review insert
CREATE OR REPLACE FUNCTION auto_link_professor_course()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO professor_courses (professor_id, course_id)
  VALUES (NEW.professor_id, NEW.course_id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_link_prof_course
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_professor_course();

-- 3. "My Reviews" RLS policy
CREATE POLICY "user_read_own_reviews"
  ON reviews FOR SELECT
  USING (
    anon_user_hash = current_setting('app.anon_user_hash', true)
    AND status != 'removed'
  );

-- 4. Trigram indexes for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_professors_name_trgm ON professors USING GIN (name_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_courses_code_trgm    ON courses USING GIN (code gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_courses_title_trgm   ON courses USING GIN (title_en gin_trgm_ops);

-- 5. Course -> Professors view
CREATE OR REPLACE VIEW course_professors AS
SELECT
  c.id AS course_id, c.code, c.title_en AS course_title, c.slug AS course_slug,
  c.university_id, u.name_en AS university_name, u.slug AS university_slug,
  p.id AS professor_id, p.name_en AS professor_name, p.slug AS professor_slug,
  ap.avg_quality, ap.avg_difficulty, ap.review_count, ap.would_take_again_pct
FROM professor_courses pc
JOIN courses c ON c.id = pc.course_id
JOIN professors p ON p.id = pc.professor_id AND p.is_active = true
JOIN universities u ON u.id = c.university_id
LEFT JOIN aggregates_professor ap ON ap.professor_id = p.id;

-- 6. Batch aggregate refresh
CREATE OR REPLACE FUNCTION refresh_professor_aggregates_batch(p_professor_ids UUID[])
RETURNS void AS $$
DECLARE pid UUID;
BEGIN
  FOREACH pid IN ARRAY p_professor_ids LOOP
    PERFORM refresh_professor_aggregates(pid);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Materialized view for trending
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_trending_professors AS
SELECT
  ap.professor_id, ap.review_count, ap.avg_quality, ap.avg_difficulty, ap.would_take_again_pct,
  p.name_en, p.slug,
  d.name_en AS department_name, u.name_en AS university_name, u.slug AS university_slug
FROM aggregates_professor ap
JOIN professors p ON p.id = ap.professor_id AND p.is_active = true
LEFT JOIN departments d ON d.id = p.department_id
JOIN universities u ON u.id = p.university_id
WHERE ap.review_count >= 1
ORDER BY ap.review_count DESC, ap.avg_quality DESC
LIMIT 50;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_trending_prof_id ON mv_trending_professors(professor_id);

CREATE OR REPLACE FUNCTION refresh_trending()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_trending_professors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Public report insertion
CREATE POLICY "pub_insert_reports"
  ON reports FOR INSERT
  WITH CHECK (true);

-- 9. Better indexes
CREATE INDEX IF NOT EXISTS idx_reviews_prof_status_live ON reviews(professor_id) WHERE status = 'live';
CREATE INDEX IF NOT EXISTS idx_reviews_university_id    ON reviews(university_id);
CREATE INDEX IF NOT EXISTS idx_prof_courses_course      ON professor_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_departments_university   ON departments(university_id);

-- 10. Add top_tags to aggregates
ALTER TABLE aggregates_professor ADD COLUMN IF NOT EXISTS top_tags TEXT[] DEFAULT '{}';

-- 11. Updated refresh function with top_tags
CREATE OR REPLACE FUNCTION refresh_professor_aggregates(p_professor_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO aggregates_professor (
    professor_id, review_count, avg_quality, avg_difficulty,
    would_take_again_pct, rating_dist, tag_dist, top_tags, updated_at
  )
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
        FROM reviews WHERE professor_id = p_professor_id AND status = 'live' GROUP BY tag
      ) tag_counts
    ),
    (
      SELECT COALESCE(ARRAY_AGG(tag ORDER BY cnt DESC), '{}')
      FROM (
        SELECT unnest(tags) AS tag, COUNT(*) AS cnt
        FROM reviews WHERE professor_id = p_professor_id AND status = 'live'
        GROUP BY tag ORDER BY cnt DESC LIMIT 3
      ) top
    ),
    now()
  FROM reviews
  WHERE professor_id = p_professor_id AND status = 'live'
  ON CONFLICT (professor_id) DO UPDATE SET
    review_count = EXCLUDED.review_count, avg_quality = EXCLUDED.avg_quality,
    avg_difficulty = EXCLUDED.avg_difficulty, would_take_again_pct = EXCLUDED.would_take_again_pct,
    rating_dist = EXCLUDED.rating_dist, tag_dist = EXCLUDED.tag_dist,
    top_tags = EXCLUDED.top_tags, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
