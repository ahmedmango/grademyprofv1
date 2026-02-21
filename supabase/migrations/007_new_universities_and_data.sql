-- ============================================================
-- Migration 007: New universities + professors + reviews
-- BUB, Kingdom University, TAG-UCB, CHSS, UniGrad, Euro Uni, Delmon
-- Each uni: 5-10 professors, max 1 unrated, min 5 reviews each
-- ============================================================

-- ============================================================
-- 1. INSERT NEW UNIVERSITIES
-- ============================================================

INSERT INTO universities (name_en, name_ar, short_name, slug, country_code, is_active) VALUES
('British University of Bahrain', 'الجامعة البريطانية في البحرين', 'BUB', 'bub', 'BH', true),
('Kingdom University', 'جامعة المملكة', 'KU', 'kingdom-university', 'BH', true),
('Talal Abu-Ghazaleh University College of Business', 'كلية طلال أبوغزالة الجامعية للأعمال', 'TAG-UCB', 'tag-ucb', 'BH', true),
('College of Health and Sport Sciences', 'كلية العلوم الصحية والرياضية', 'CHSS', 'chss', 'BH', true),
('UniGrad Education', 'يوني جراد للتعليم', 'UniGrad', 'unigrad', 'BH', true),
('Euro University', 'الجامعة الأوروبية', 'Euro Uni', 'euro-university', 'BH', true),
('Delmon University for Science and Technology', 'جامعة دلمون للعلوم والتكنولوجيا', 'Delmon', 'delmon-university', 'BH', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 2. GET UNIVERSITY IDs (use subqueries)
-- ============================================================

-- Helper: departments for new unis
INSERT INTO departments (name_en, university_id, slug) 
SELECT d.name_en, u.id, d.slug FROM (VALUES
  ('Business', 'bub', 'bub-business'),
  ('Engineering', 'bub', 'bub-engineering'),
  ('Computing', 'bub', 'bub-computing'),
  ('Law', 'bub', 'bub-law'),
  ('Architecture', 'kingdom-university', 'ku-architecture'),
  ('Business Administration', 'kingdom-university', 'ku-business'),
  ('Law', 'kingdom-university', 'ku-law'),
  ('IT', 'kingdom-university', 'ku-it'),
  ('Media', 'kingdom-university', 'ku-media'),
  ('Business', 'tag-ucb', 'tag-business'),
  ('Finance', 'tag-ucb', 'tag-finance'),
  ('Marketing', 'tag-ucb', 'tag-marketing'),
  ('Health Sciences', 'chss', 'chss-health'),
  ('Sport Sciences', 'chss', 'chss-sport'),
  ('Physiotherapy', 'chss', 'chss-physio'),
  ('Education', 'unigrad', 'ug-education'),
  ('Postgraduate Studies', 'unigrad', 'ug-postgrad'),
  ('Business', 'euro-university', 'euro-business'),
  ('Computer Science', 'euro-university', 'euro-cs'),
  ('Engineering', 'euro-university', 'euro-engineering'),
  ('Business', 'delmon-university', 'delmon-business'),
  ('IT', 'delmon-university', 'delmon-it'),
  ('General Studies', 'delmon-university', 'delmon-general')
) AS d(name_en, uni_slug, slug)
JOIN universities u ON u.slug = d.uni_slug
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 3. INSERT PROFESSORS (5-10 per uni, 1 unrated max)
-- ============================================================

-- BUB (8 professors)
INSERT INTO professors (name_en, name_ar, slug, university_id, department_id, is_active)
SELECT p.name_en, p.name_ar, p.slug, u.id, d.id, true
FROM (VALUES
  ('Dr. Simon Watson', 'د. سيمون واتسون', 'simon-watson', 'bub', 'bub-business'),
  ('Dr. Sarah Mitchell', 'د. سارة ميتشل', 'sarah-mitchell-bub', 'bub', 'bub-engineering'),
  ('Dr. Khalid Al-Doseri', 'د. خالد الدوسري', 'khalid-al-doseri-bub', 'bub', 'bub-computing'),
  ('Dr. Emma Thompson', 'د. إيما تومبسون', 'emma-thompson-bub', 'bub', 'bub-business'),
  ('Dr. Ali Hassan', 'د. علي حسن', 'ali-hassan-bub', 'bub', 'bub-law'),
  ('Dr. Rachel Adams', 'د. راشيل آدامز', 'rachel-adams-bub', 'bub', 'bub-computing'),
  ('Dr. Mohammed Jassim', 'د. محمد جاسم', 'mohammed-jassim-bub', 'bub', 'bub-engineering'),
  ('Dr. Victoria Clarke', 'د. فيكتوريا كلارك', 'victoria-clarke-bub', 'bub', 'bub-business')
) AS p(name_en, name_ar, slug, uni_slug, dept_slug)
JOIN universities u ON u.slug = p.uni_slug
JOIN departments d ON d.slug = p.dept_slug
ON CONFLICT (slug) DO NOTHING;

-- Kingdom University (7 professors)
INSERT INTO professors (name_en, name_ar, slug, university_id, department_id, is_active)
SELECT p.name_en, p.name_ar, p.slug, u.id, d.id, true
FROM (VALUES
  ('Dr. Fatima Al-Zayani', 'د. فاطمة الزياني', 'fatima-al-zayani', 'kingdom-university', 'ku-architecture'),
  ('Dr. Ahmed Al-Qadhi', 'د. أحمد القاضي', 'ahmed-al-qadhi-ku', 'kingdom-university', 'ku-law'),
  ('Dr. Noor Abdulla', 'د. نور عبدالله', 'noor-abdulla-ku', 'kingdom-university', 'ku-business'),
  ('Dr. Hassan Yousif', 'د. حسن يوسف', 'hassan-yousif-ku', 'kingdom-university', 'ku-it'),
  ('Dr. Maryam Al-Khalifa', 'د. مريم آل خليفة', 'maryam-al-khalifa-ku', 'kingdom-university', 'ku-media'),
  ('Dr. Jamal Karim', 'د. جمال كريم', 'jamal-karim-ku', 'kingdom-university', 'ku-business'),
  ('Dr. Layla Mansoor', 'د. ليلى منصور', 'layla-mansoor-ku', 'kingdom-university', 'ku-architecture')
) AS p(name_en, name_ar, slug, uni_slug, dept_slug)
JOIN universities u ON u.slug = p.uni_slug
JOIN departments d ON d.slug = p.dept_slug
ON CONFLICT (slug) DO NOTHING;

-- TAG-UCB (6 professors)
INSERT INTO professors (name_en, name_ar, slug, university_id, department_id, is_active)
SELECT p.name_en, p.name_ar, p.slug, u.id, d.id, true
FROM (VALUES
  ('Prof. Ahmed Alsaie', 'أ.د. أحمد الساعي', 'ahmed-alsaie-tag', 'tag-ucb', 'tag-business'),
  ('Dr. Rania Hamdi', 'د. رانيا حمدي', 'rania-hamdi-tag', 'tag-ucb', 'tag-finance'),
  ('Dr. Omar Saleh', 'د. عمر صالح', 'omar-saleh-tag', 'tag-ucb', 'tag-marketing'),
  ('Dr. Huda Al-Mannai', 'د. هدى المناعي', 'huda-al-mannai-tag', 'tag-ucb', 'tag-business'),
  ('Dr. Yousef Fakhro', 'د. يوسف فخرو', 'yousef-fakhro-tag', 'tag-ucb', 'tag-finance'),
  ('Dr. Samira Khan', 'د. سميرة خان', 'samira-khan-tag', 'tag-ucb', 'tag-marketing')
) AS p(name_en, name_ar, slug, uni_slug, dept_slug)
JOIN universities u ON u.slug = p.uni_slug
JOIN departments d ON d.slug = p.dept_slug
ON CONFLICT (slug) DO NOTHING;

-- CHSS (5 professors)
INSERT INTO professors (name_en, name_ar, slug, university_id, department_id, is_active)
SELECT p.name_en, p.name_ar, p.slug, u.id, d.id, true
FROM (VALUES
  ('Dr. Abdulrahman Jaber', 'د. عبدالرحمن جابر', 'abdulrahman-jaber-chss', 'chss', 'chss-health'),
  ('Dr. Noora Al-Rumaihi', 'د. نورة الرميحي', 'noora-al-rumaihi-chss', 'chss', 'chss-sport'),
  ('Dr. Mark Stevens', 'د. مارك ستيفنز', 'mark-stevens-chss', 'chss', 'chss-physio'),
  ('Dr. Zainab Mirza', 'د. زينب ميرزا', 'zainab-mirza-chss', 'chss', 'chss-health'),
  ('Dr. David Park', 'د. ديفيد بارك', 'david-park-chss', 'chss', 'chss-sport')
) AS p(name_en, name_ar, slug, uni_slug, dept_slug)
JOIN universities u ON u.slug = p.uni_slug
JOIN departments d ON d.slug = p.dept_slug
ON CONFLICT (slug) DO NOTHING;

-- UniGrad (5 professors)
INSERT INTO professors (name_en, name_ar, slug, university_id, department_id, is_active)
SELECT p.name_en, p.name_ar, p.slug, u.id, d.id, true
FROM (VALUES
  ('Dr. Isa Al-Binali', 'د. عيسى البنعلي', 'isa-al-binali-ug', 'unigrad', 'ug-education'),
  ('Dr. Hanan Rashid', 'د. حنان راشد', 'hanan-rashid-ug', 'unigrad', 'ug-education'),
  ('Dr. Robert Chen', 'د. روبرت تشين', 'robert-chen-ug', 'unigrad', 'ug-postgrad'),
  ('Dr. Aisha Bucheeri', 'د. عائشة بوشهري', 'aisha-bucheeri-ug', 'unigrad', 'ug-postgrad'),
  ('Dr. James Wright', 'د. جيمس رايت', 'james-wright-ug', 'unigrad', 'ug-education')
) AS p(name_en, name_ar, slug, uni_slug, dept_slug)
JOIN universities u ON u.slug = p.uni_slug
JOIN departments d ON d.slug = p.dept_slug
ON CONFLICT (slug) DO NOTHING;

-- Euro University (6 professors)
INSERT INTO professors (name_en, name_ar, slug, university_id, department_id, is_active)
SELECT p.name_en, p.name_ar, p.slug, u.id, d.id, true
FROM (VALUES
  ('Dr. Stefan Müller', 'د. ستيفان مولر', 'stefan-muller-euro', 'euro-university', 'euro-business'),
  ('Dr. Amina Gharib', 'د. أمينة غريب', 'amina-gharib-euro', 'euro-university', 'euro-cs'),
  ('Dr. Pierre Dubois', 'د. بيير دوبوا', 'pierre-dubois-euro', 'euro-university', 'euro-engineering'),
  ('Dr. Salma Al-Awadhi', 'د. سلمى العوضي', 'salma-al-awadhi-euro', 'euro-university', 'euro-business'),
  ('Dr. Michael Braun', 'د. مايكل براون', 'michael-braun-euro', 'euro-university', 'euro-cs'),
  ('Dr. Leila Farooq', 'د. ليلى فاروق', 'leila-farooq-euro', 'euro-university', 'euro-engineering')
) AS p(name_en, name_ar, slug, uni_slug, dept_slug)
JOIN universities u ON u.slug = p.uni_slug
JOIN departments d ON d.slug = p.dept_slug
ON CONFLICT (slug) DO NOTHING;

-- Delmon (5 professors)
INSERT INTO professors (name_en, name_ar, slug, university_id, department_id, is_active)
SELECT p.name_en, p.name_ar, p.slug, u.id, d.id, true
FROM (VALUES
  ('Dr. Hussain Al-Qadhi', 'د. حسين القاضي', 'hussain-al-qadhi-delmon', 'delmon-university', 'delmon-business'),
  ('Dr. Priya Sharma', 'د. بريا شارما', 'priya-sharma-delmon', 'delmon-university', 'delmon-it'),
  ('Dr. Abbas Salman', 'د. عباس سلمان', 'abbas-salman-delmon', 'delmon-university', 'delmon-business'),
  ('Dr. Farida Nasser', 'د. فريدة ناصر', 'farida-nasser-delmon', 'delmon-university', 'delmon-general'),
  ('Dr. Yousif Al-Meer', 'د. يوسف المير', 'yousif-al-meer-delmon', 'delmon-university', 'delmon-it')
) AS p(name_en, name_ar, slug, uni_slug, dept_slug)
JOIN universities u ON u.slug = p.uni_slug
JOIN departments d ON d.slug = p.dept_slug
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 4. GENERATE REVIEWS (5-8 per professor, realistic variety)
-- Uses generate_series + random to create varied reviews
-- ============================================================

-- Create a function to generate reviews for all new professors
DO $$
DECLARE
  prof RECORD;
  review_count INT;
  i INT;
  q NUMERIC;
  diff NUMERIC;
  retake BOOLEAN;
  grade TEXT;
  tag_list TEXT[];
  comment TEXT;
  comments TEXT[] := ARRAY[
    'Really enjoyed this class. The professor explains concepts clearly and is always available for questions.',
    'Tough grader but fair. You learn a lot if you put in the work.',
    'Lectures can be dry sometimes but the content is solid. Exams are straightforward.',
    'One of the best professors I''ve had. Makes difficult topics easy to understand.',
    'Not bad overall. Assignments are reasonable and grading is transparent.',
    'Very knowledgeable but sometimes goes too fast. Office hours are helpful though.',
    'Amazing professor! Truly cares about students and goes above and beyond.',
    'The workload is heavy but manageable. Group projects are actually useful.',
    'Could improve on feedback speed but overall a decent experience.',
    'Absolutely loved this course. The professor brings real-world experience into lectures.',
    'Fair exams, clear expectations. Would recommend to anyone.',
    'The class was okay. Nothing special but nothing terrible either.',
    'Great at explaining complex topics. Very patient with questions.',
    'Attendance is a must. Miss a lecture and you''re lost.',
    'Interesting material but the pace is very fast. Take good notes.',
    'Super approachable and friendly. Makes you actually want to come to class.',
    'Harsh grader. Study the textbook thoroughly.',
    'Engaging lectures with lots of practical examples. Highly recommend.',
    'Decent professor. Course content is useful for the career.',
    'Very organized. You always know what to expect.',
    'The final was harder than expected but curve saved everyone.',
    'Best class I took this semester. Very inspiring.',
    'Mediocre teaching style but the subject matter is interesting.',
    'Clear rubrics and fair grading. No surprises on exams.',
    'Passionate about the subject and it shows in every lecture.'
  ];
  grades TEXT[] := ARRAY['A+', 'A', 'A', 'A-', 'A-', 'B+', 'B+', 'B', 'B', 'B-', 'C+', 'C'];
  all_tags TEXT[] := ARRAY[
    'Amazing Lectures', 'Caring', 'Clear Grading', 'Group Projects',
    'Textbook Required', 'Tough Grader', 'Inspirational', 'Participation Matters',
    'Lots Of Homework', 'Test Heavy', 'Hilarious', 'Respected',
    'Accessible Outside Class', 'Gives Good Feedback', 'Skip Class? You Won''t Pass.',
    'Get Ready To Read', 'Extra Credit'
  ];
  selected_tags TEXT[];
  num_tags INT;
BEGIN
  FOR prof IN
    SELECT p.id as prof_id, p.slug, p.university_id
    FROM professors p
    JOIN universities u ON u.id = p.university_id
    WHERE u.slug IN ('bub', 'kingdom-university', 'tag-ucb', 'chss', 'unigrad', 'euro-university', 'delmon-university')
    AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.professor_id = p.id)
  LOOP
    -- Random 5-8 reviews per professor (occasionally 0 for one unrated prof per uni)
    -- ~15% chance of being the unrated professor
    IF random() < 0.12 THEN
      review_count := 0;
    ELSE
      review_count := 5 + floor(random() * 4)::int; -- 5 to 8
    END IF;
    
    FOR i IN 1..review_count LOOP
      -- Random quality 2.0-5.0 (skewed positive)
      q := round((2.0 + random() * 3.0)::numeric, 1);
      IF random() > 0.3 THEN q := round((3.0 + random() * 2.0)::numeric, 1); END IF;
      
      -- Random difficulty 1.5-4.5
      diff := round((1.5 + random() * 3.0)::numeric, 1);
      
      -- Would take again (correlated with quality)
      retake := (q >= 3.0 AND random() > 0.2) OR (q < 3.0 AND random() > 0.7);
      
      -- Random grade
      grade := grades[1 + floor(random() * array_length(grades, 1))::int];
      
      -- Random 2-3 tags
      num_tags := 2 + floor(random() * 2)::int;
      selected_tags := ARRAY[]::TEXT[];
      FOR j IN 1..num_tags LOOP
        selected_tags := selected_tags || all_tags[1 + floor(random() * array_length(all_tags, 1))::int];
      END LOOP;
      -- Deduplicate
      selected_tags := ARRAY(SELECT DISTINCT unnest(selected_tags));
      
      -- Random comment
      comment := comments[1 + floor(random() * array_length(comments, 1))::int];
      
      INSERT INTO reviews (
        professor_id, university_id, rating_quality, rating_difficulty,
        would_take_again, grade_received, tags, comment, status, created_at
      ) VALUES (
        prof.prof_id, prof.university_id, q, diff,
        retake, grade, selected_tags, comment, 'live',
        now() - (floor(random() * 365) || ' days')::interval - (floor(random() * 24) || ' hours')::interval
      );
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- 5. REFRESH AGGREGATES for new professors
-- ============================================================

-- Refresh aggregate view/table if it exists
-- This depends on your existing aggregation setup
-- If you use a materialized view:
-- REFRESH MATERIALIZED VIEW IF EXISTS aggregates_professor;

-- If you use a trigger-based table, run the aggregation function:
-- (adjust to match your actual aggregation logic)

INSERT INTO aggregates_professor (professor_id, review_count, avg_quality, avg_difficulty, would_take_again_pct, rating_dist, tag_dist, top_tags)
SELECT
  r.professor_id,
  COUNT(*)::int as review_count,
  ROUND(AVG(r.rating_quality), 2) as avg_quality,
  ROUND(AVG(r.rating_difficulty), 2) as avg_difficulty,
  ROUND(100.0 * COUNT(*) FILTER (WHERE r.would_take_again = true) / NULLIF(COUNT(*) FILTER (WHERE r.would_take_again IS NOT NULL), 0), 1) as would_take_again_pct,
  jsonb_build_object(
    '1', COUNT(*) FILTER (WHERE r.rating_quality >= 0.5 AND r.rating_quality < 1.5),
    '2', COUNT(*) FILTER (WHERE r.rating_quality >= 1.5 AND r.rating_quality < 2.5),
    '3', COUNT(*) FILTER (WHERE r.rating_quality >= 2.5 AND r.rating_quality < 3.5),
    '4', COUNT(*) FILTER (WHERE r.rating_quality >= 3.5 AND r.rating_quality < 4.5),
    '5', COUNT(*) FILTER (WHERE r.rating_quality >= 4.5)
  ) as rating_dist,
  (SELECT jsonb_object_agg(tag, cnt) FROM (
    SELECT tag, COUNT(*) as cnt
    FROM reviews r2, unnest(r2.tags) as tag
    WHERE r2.professor_id = r.professor_id AND r2.status = 'live'
    GROUP BY tag ORDER BY cnt DESC LIMIT 10
  ) t) as tag_dist,
  (SELECT ARRAY_AGG(tag ORDER BY cnt DESC) FROM (
    SELECT tag, COUNT(*) as cnt
    FROM reviews r3, unnest(r3.tags) as tag
    WHERE r3.professor_id = r.professor_id AND r3.status = 'live'
    GROUP BY tag ORDER BY cnt DESC LIMIT 5
  ) t) as top_tags
FROM reviews r
WHERE r.status = 'live'
AND r.professor_id IN (
  SELECT p.id FROM professors p
  JOIN universities u ON u.id = p.university_id
  WHERE u.slug IN ('bub', 'kingdom-university', 'tag-ucb', 'chss', 'unigrad', 'euro-university', 'delmon-university')
)
GROUP BY r.professor_id
ON CONFLICT (professor_id) DO UPDATE SET
  review_count = EXCLUDED.review_count,
  avg_quality = EXCLUDED.avg_quality,
  avg_difficulty = EXCLUDED.avg_difficulty,
  would_take_again_pct = EXCLUDED.would_take_again_pct,
  rating_dist = EXCLUDED.rating_dist,
  tag_dist = EXCLUDED.tag_dist,
  top_tags = EXCLUDED.top_tags;

