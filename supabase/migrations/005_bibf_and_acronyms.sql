-- ============================================================
-- Migration 005: BIBF + University Acronyms
-- ============================================================

-- 1. Add short_name (acronym) column to universities
ALTER TABLE universities ADD COLUMN IF NOT EXISTS short_name TEXT;

-- 2. Populate acronyms for all universities
UPDATE universities SET short_name = 'UoB' WHERE slug = 'uob';
UPDATE universities SET short_name = 'AUBH' WHERE slug = 'aubh';
UPDATE universities SET short_name = 'Polytech' WHERE slug = 'polytechnic-bh';
UPDATE universities SET short_name = 'RCSI' WHERE slug = 'rcsi-bh';
UPDATE universities SET short_name = 'AGU' WHERE slug = 'agu';
UPDATE universities SET short_name = 'UTB' WHERE slug = 'utb';
UPDATE universities SET short_name = 'ASU' WHERE slug = 'asu';
UPDATE universities SET short_name = 'Ahlia' WHERE slug = 'ahlia';
UPDATE universities SET short_name = 'UCB' WHERE slug = 'ucb';
UPDATE universities SET short_name = 'RUW' WHERE slug = 'ruw';
UPDATE universities SET short_name = 'GU' WHERE slug = 'gu';
UPDATE universities SET short_name = 'Strath' WHERE slug = 'strathclyde-bh';

-- 3. Add BIBF
INSERT INTO universities (id, name_en, name_ar, slug, short_name) VALUES
  ('a1000000-0000-0000-0000-000000000013', 'Bahrain Institute of Banking and Finance', 'معهد البحرين للدراسات المصرفية والمالية', 'bibf', 'BIBF')
ON CONFLICT DO NOTHING;

-- 4. BIBF Departments
INSERT INTO departments (id, university_id, name_en, name_ar, slug) VALUES
  ('bd000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000013', 'Banking & Finance', 'المصرفية والمالية', 'bf'),
  ('bd000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000013', 'Insurance & Risk', 'التأمين والمخاطر', 'ir'),
  ('bd000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000013', 'Leadership & Management', 'القيادة والإدارة', 'lm'),
  ('bd000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000013', 'Islamic Finance', 'التمويل الإسلامي', 'isf')
ON CONFLICT DO NOTHING;

-- 5. BIBF Professors (diverse)
INSERT INTO professors (id, university_id, department_id, name_en, name_ar, slug) VALUES
  ('cd000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000013', 'bd000000-0000-0000-0000-000000000001', 'Dr. Mohammed Al-Sayed', 'د. محمد السيد', 'mohammed-al-sayed'),
  ('cd000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000013', 'bd000000-0000-0000-0000-000000000001', 'Dr. Sarah Thompson', 'د. سارة طومسون', 'sarah-thompson'),
  ('cd000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000013', 'bd000000-0000-0000-0000-000000000002', 'Dr. Anwar Hussain', 'د. أنور حسين', 'anwar-hussain'),
  ('cd000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000013', 'bd000000-0000-0000-0000-000000000003', 'Dr. Deepa Nair', 'د. ديبا نايير', 'deepa-nair'),
  ('cd000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000013', 'bd000000-0000-0000-0000-000000000004', 'Dr. Abdul Wahab Al-Arrayed', 'د. عبدالوهاب العريض', 'abdul-wahab-al-arrayed')
ON CONFLICT DO NOTHING;

-- 6. BIBF Courses
INSERT INTO courses (id, university_id, department_id, code, title_en, title_ar, slug) VALUES
  ('dd000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000013', 'bd000000-0000-0000-0000-000000000001', 'BF 101', 'Principles of Banking', 'مبادئ العمل المصرفي', 'bibf-bf-101'),
  ('dd000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000013', 'bd000000-0000-0000-0000-000000000001', 'BF 201', 'Credit Analysis', 'تحليل الائتمان', 'bibf-bf-201'),
  ('dd000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000013', 'bd000000-0000-0000-0000-000000000002', 'IR 110', 'Insurance Fundamentals', 'أساسيات التأمين', 'bibf-ir-110'),
  ('dd000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000013', 'bd000000-0000-0000-0000-000000000003', 'LM 200', 'Strategic Leadership', 'القيادة الاستراتيجية', 'bibf-lm-200'),
  ('dd000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000013', 'bd000000-0000-0000-0000-000000000004', 'ISF 301', 'Islamic Banking Products', 'منتجات الصيرفة الإسلامية', 'bibf-isf-301')
ON CONFLICT DO NOTHING;

-- 7. Professor-Course Links
INSERT INTO professor_courses (professor_id, course_id) VALUES
  ('cd000000-0000-0000-0000-000000000001', 'dd000000-0000-0000-0000-000000000001'),
  ('cd000000-0000-0000-0000-000000000001', 'dd000000-0000-0000-0000-000000000002'),
  ('cd000000-0000-0000-0000-000000000002', 'dd000000-0000-0000-0000-000000000001'),
  ('cd000000-0000-0000-0000-000000000003', 'dd000000-0000-0000-0000-000000000003'),
  ('cd000000-0000-0000-0000-000000000004', 'dd000000-0000-0000-0000-000000000004'),
  ('cd000000-0000-0000-0000-000000000005', 'dd000000-0000-0000-0000-000000000005')
ON CONFLICT DO NOTHING;

-- 8. BIBF Reviews
CREATE TEMP TABLE temp_bibf_reviews (
  idx SERIAL, comment TEXT, tags TEXT[], grade TEXT
);
INSERT INTO temp_bibf_reviews (comment, tags, grade) VALUES
  ('Excellent real-world banking knowledge. Brings years of CBB experience into the classroom.', ARRAY['Amazing Lectures','Inspirational'], 'A'),
  ('Very structured approach. The case studies from actual Bahraini banks are incredibly useful.', ARRAY['Clear Grading','Amazing Lectures'], 'A-'),
  ('Tough exams but fair. The CFA-style questions really prepare you for professional certifications.', ARRAY['Tough Grader','Lots of Homework'], 'B+'),
  ('She explains complex derivatives and hedging strategies in a way that actually makes sense.', ARRAY['Amazing Lectures','Caring'], 'A'),
  ('Great networking opportunities through this course. He invited guest speakers from major banks.', ARRAY['Inspirational','Group Projects'], 'A-'),
  ('The Islamic finance module was eye-opening. Dr. Al-Arrayed is a legend in this field.', ARRAY['Amazing Lectures','Inspirational'], 'A+'),
  ('Attendance is mandatory and he checks. But the content is worth showing up for.', ARRAY['Participation Matters','Clear Grading'], 'B+'),
  ('Fast-paced course. If you fall behind on the readings you will struggle with the midterm.', ARRAY['Tough Grader','Textbook Required'], 'B'),
  ('One of the most practical courses at BIBF. Everything I learned I use at work now.', ARRAY['Amazing Lectures','Inspirational'], 'A'),
  ('Good professor but the 8am weekend slot is brutal. Content quality is high though.', ARRAY['Clear Grading','Lots of Homework'], 'B+');

DO $$
DECLARE
  prof RECORD;
  rev RECORD;
  rev_idx INT;
BEGIN
  FOR prof IN
    SELECT p.id AS prof_id, p.university_id,
           (SELECT pc.course_id FROM professor_courses pc WHERE pc.professor_id = p.id LIMIT 1) AS course_id
    FROM professors p WHERE p.id::text LIKE 'cd%'
  LOOP
    IF prof.course_id IS NULL THEN CONTINUE; END IF;
    FOR rev_idx IN 1..((random() * 3 + 3)::int) LOOP
      SELECT * INTO rev FROM temp_bibf_reviews ORDER BY random() LIMIT 1;
      INSERT INTO reviews (
        professor_id, course_id, university_id, anon_user_hash,
        rating_quality, rating_difficulty, would_take_again,
        tags, comment, status, grade_received, semester_window, created_at
      ) VALUES (
        prof.prof_id, prof.course_id, prof.university_id,
        md5(random()::text || prof.prof_id || rev_idx),
        (random() * 2 + 3)::numeric(3,1),
        (random() * 2.5 + 2)::numeric(3,1),
        random() > 0.2,
        rev.tags, rev.comment, 'live', rev.grade,
        'Spring 2025', NOW() - (random() * 60 || ' days')::interval
      );
    END LOOP;
  END LOOP;
END $$;
DROP TABLE IF EXISTS temp_bibf_reviews;

-- 9. Refresh aggregates for BIBF
DO $$
DECLARE pid UUID;
BEGIN
  FOR pid IN SELECT DISTINCT professor_id FROM reviews WHERE professor_id::text LIKE 'cd%'
  LOOP PERFORM refresh_professor_aggregates(pid); END LOOP;
END $$;

-- 10. Add trigram index on university short_name
CREATE INDEX IF NOT EXISTS idx_universities_short_name_trgm ON universities USING GIN (short_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_universities_name_trgm ON universities USING GIN (name_en gin_trgm_ops);

-- 11. Refresh trending
SELECT refresh_trending();

