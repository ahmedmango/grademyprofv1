-- ============================================================
-- Migration 004: Add grade_received + Full Seed Data
-- ============================================================

-- 1. Add grade_received to reviews
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS grade_received TEXT DEFAULT NULL;

-- Valid grades: A+, A, A-, B+, B, B-, C+, C, C-, D+, D, F, W, IP
-- (W = Withdrawn, IP = In Progress)

-- ============================================================
-- 2. DEPARTMENTS FOR REMAINING UNIVERSITIES
-- ============================================================

-- UTB (uni 006)
INSERT INTO departments (id, university_id, name_en, name_ar, slug) VALUES
  ('b6000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000006', 'Computer Science', 'علوم الحاسوب', 'cs'),
  ('b6000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000006', 'Engineering Technology', 'تكنولوجيا الهندسة', 'engtech'),
  ('b6000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000006', 'Business & Management', 'الأعمال والإدارة', 'bm')
ON CONFLICT DO NOTHING;

-- Ahlia (uni 008)
INSERT INTO departments (id, university_id, name_en, name_ar, slug) VALUES
  ('b8000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000008', 'Information Technology', 'تكنولوجيا المعلومات', 'it'),
  ('b8000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000008', 'Business & Finance', 'الأعمال والمالية', 'bf'),
  ('b8000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000008', 'Mass Communication', 'الإعلام', 'mc'),
  ('b8000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000008', 'Physiotherapy', 'العلاج الطبيعي', 'pt')
ON CONFLICT DO NOTHING;

-- UCB (uni 009)
INSERT INTO departments (id, university_id, name_en, name_ar, slug) VALUES
  ('b9000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000009', 'Business Studies', 'الدراسات التجارية', 'bus'),
  ('b9000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000009', 'Computing', 'الحوسبة', 'comp'),
  ('b9000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000009', 'Graphic Design', 'التصميم الجرافيكي', 'gd')
ON CONFLICT DO NOTHING;

-- RUW (uni 010)
INSERT INTO departments (id, university_id, name_en, name_ar, slug) VALUES
  ('ba000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000010', 'Computer Science', 'علوم الحاسوب', 'cs'),
  ('ba000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000010', 'Business Administration', 'إدارة الأعمال', 'ba'),
  ('ba000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000010', 'Interior Design', 'التصميم الداخلي', 'id'),
  ('ba000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000010', 'Law', 'القانون', 'law')
ON CONFLICT DO NOTHING;

-- Gulf University (uni 011)
INSERT INTO departments (id, university_id, name_en, name_ar, slug) VALUES
  ('bb000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000011', 'Engineering', 'الهندسة', 'eng'),
  ('bb000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000011', 'Administrative Sciences', 'العلوم الإدارية', 'admin'),
  ('bb000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000011', 'Computer Science & IT', 'علوم الحاسوب والمعلومات', 'csit')
ON CONFLICT DO NOTHING;

-- Strathclyde Bahrain (uni 012)
INSERT INTO departments (id, university_id, name_en, name_ar, slug) VALUES
  ('bc000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000012', 'Business', 'الأعمال', 'bus'),
  ('bc000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000012', 'Engineering', 'الهندسة', 'eng')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. PROFESSORS — Diverse names for all universities
-- ============================================================

-- UTB professors (uni 006)
INSERT INTO professors (id, university_id, department_id, name_en, name_ar, slug) VALUES
  ('c6000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000006', 'b6000000-0000-0000-0000-000000000001', 'Dr. Fatima Al-Qassab', 'د. فاطمة القصاب', 'fatima-al-qassab'),
  ('c6000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000006', 'b6000000-0000-0000-0000-000000000001', 'Dr. Raj Krishnamurthy', 'د. راج كريشنامورثي', 'raj-krishnamurthy'),
  ('c6000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000006', 'b6000000-0000-0000-0000-000000000002', 'Dr. Samuel Okonkwo', 'د. صامويل أوكونكوو', 'samuel-okonkwo'),
  ('c6000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000006', 'b6000000-0000-0000-0000-000000000003', 'Dr. Noor Abdulrahman', 'د. نور عبدالرحمن', 'noor-abdulrahman'),
  ('c6000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000006', 'b6000000-0000-0000-0000-000000000002', 'Dr. Priya Sharma', 'د. بريا شارما', 'priya-sharma-utb')
ON CONFLICT DO NOTHING;

-- Ahlia professors (uni 008)
INSERT INTO professors (id, university_id, department_id, name_en, name_ar, slug) VALUES
  ('c8000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000008', 'b8000000-0000-0000-0000-000000000001', 'Dr. Hassan Al-Jaber', 'د. حسن الجابر', 'hassan-al-jaber'),
  ('c8000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000008', 'b8000000-0000-0000-0000-000000000002', 'Dr. Mei Lin Wong', 'د. مي لين ونغ', 'mei-lin-wong'),
  ('c8000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000008', 'b8000000-0000-0000-0000-000000000003', 'Dr. Khalid Mansoor', 'د. خالد منصور', 'khalid-mansoor'),
  ('c8000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000008', 'b8000000-0000-0000-0000-000000000004', 'Dr. Elena Petrova', 'د. إيلينا بتروفا', 'elena-petrova'),
  ('c8000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000008', 'b8000000-0000-0000-0000-000000000001', 'Dr. Abdulla Fakhro', 'د. عبدالله فخرو', 'abdulla-fakhro')
ON CONFLICT DO NOTHING;

-- UCB professors (uni 009)
INSERT INTO professors (id, university_id, department_id, name_en, name_ar, slug) VALUES
  ('c9000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000009', 'b9000000-0000-0000-0000-000000000001', 'Dr. Amina Ebrahim', 'د. أمينة إبراهيم', 'amina-ebrahim'),
  ('c9000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000009', 'b9000000-0000-0000-0000-000000000002', 'Dr. Thomas Müller', 'د. توماس مولر', 'thomas-muller'),
  ('c9000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000009', 'b9000000-0000-0000-0000-000000000003', 'Dr. Layla Al-Doseri', 'د. ليلى الدوسري', 'layla-al-doseri'),
  ('c9000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000009', 'b9000000-0000-0000-0000-000000000001', 'Dr. James Oduya', 'د. جيمس أودويا', 'james-oduya')
ON CONFLICT DO NOTHING;

-- RUW professors (uni 010)
INSERT INTO professors (id, university_id, department_id, name_en, name_ar, slug) VALUES
  ('ca000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000010', 'ba000000-0000-0000-0000-000000000001', 'Dr. Maryam Al-Khalifa', 'د. مريم الخليفة', 'maryam-al-khalifa'),
  ('ca000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000010', 'ba000000-0000-0000-0000-000000000002', 'Dr. Sunita Patel', 'د. سونيتا باتيل', 'sunita-patel'),
  ('ca000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000010', 'ba000000-0000-0000-0000-000000000003', 'Dr. Reem Janahi', 'د. ريم جناحي', 'reem-janahi'),
  ('ca000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000010', 'ba000000-0000-0000-0000-000000000004', 'Dr. Huda Al-Awadhi', 'د. هدى العوضي', 'huda-al-awadhi')
ON CONFLICT DO NOTHING;

-- Gulf University professors (uni 011)
INSERT INTO professors (id, university_id, department_id, name_en, name_ar, slug) VALUES
  ('cb000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000011', 'bb000000-0000-0000-0000-000000000001', 'Dr. Ali Mohammadi', 'د. علي محمدي', 'ali-mohammadi'),
  ('cb000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000011', 'bb000000-0000-0000-0000-000000000002', 'Dr. Fatimah Bucheeri', 'د. فاطمة بوشهري', 'fatimah-bucheeri'),
  ('cb000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000011', 'bb000000-0000-0000-0000-000000000003', 'Dr. Chen Wei', 'د. تشن وي', 'chen-wei'),
  ('cb000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000011', 'bb000000-0000-0000-0000-000000000001', 'Dr. Ibrahim Kanoo', 'د. إبراهيم كانو', 'ibrahim-kanoo')
ON CONFLICT DO NOTHING;

-- Strathclyde professors (uni 012)
INSERT INTO professors (id, university_id, department_id, name_en, name_ar, slug) VALUES
  ('cc000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000012', 'bc000000-0000-0000-0000-000000000001', 'Dr. Fiona MacLeod', 'د. فيونا ماكليود', 'fiona-macleod'),
  ('cc000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000012', 'bc000000-0000-0000-0000-000000000001', 'Dr. Yousif Al-Mahmeed', 'د. يوسف المحميد', 'yousif-al-mahmeed'),
  ('cc000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000012', 'bc000000-0000-0000-0000-000000000002', 'Dr. Alistair Campbell', 'د. أليستر كامبل', 'alistair-campbell'),
  ('cc000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000012', 'bc000000-0000-0000-0000-000000000002', 'Dr. Zahra Hashemi', 'د. زهراء هاشمي', 'zahra-hashemi')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. COURSES FOR ALL NEW UNIVERSITIES
-- ============================================================

-- UTB courses
INSERT INTO courses (id, university_id, department_id, code, title_en, title_ar, slug) VALUES
  ('d6000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000006', 'b6000000-0000-0000-0000-000000000001', 'ITCS 114', 'Programming Fundamentals', 'أساسيات البرمجة', 'utb-itcs-114'),
  ('d6000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000006', 'b6000000-0000-0000-0000-000000000001', 'ITCS 215', 'Data Structures', 'هياكل البيانات', 'utb-itcs-215'),
  ('d6000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000006', 'b6000000-0000-0000-0000-000000000002', 'ENGT 201', 'Engineering Mathematics', 'رياضيات هندسية', 'utb-engt-201'),
  ('d6000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000006', 'b6000000-0000-0000-0000-000000000003', 'MGMT 101', 'Principles of Management', 'مبادئ الإدارة', 'utb-mgmt-101'),
  ('d6000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000006', 'b6000000-0000-0000-0000-000000000001', 'ITCS 333', 'Web Development', 'تطوير المواقع', 'utb-itcs-333')
ON CONFLICT DO NOTHING;

-- Ahlia courses
INSERT INTO courses (id, university_id, department_id, code, title_en, title_ar, slug) VALUES
  ('d8000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000008', 'b8000000-0000-0000-0000-000000000001', 'IT 201', 'Database Systems', 'نظم قواعد البيانات', 'ahlia-it-201'),
  ('d8000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000008', 'b8000000-0000-0000-0000-000000000001', 'IT 305', 'Software Engineering', 'هندسة البرمجيات', 'ahlia-it-305'),
  ('d8000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000008', 'b8000000-0000-0000-0000-000000000002', 'FIN 201', 'Corporate Finance', 'تمويل الشركات', 'ahlia-fin-201'),
  ('d8000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000008', 'b8000000-0000-0000-0000-000000000003', 'MC 101', 'Intro to Media', 'مقدمة في الإعلام', 'ahlia-mc-101'),
  ('d8000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000008', 'b8000000-0000-0000-0000-000000000004', 'PT 202', 'Clinical Anatomy', 'التشريح السريري', 'ahlia-pt-202')
ON CONFLICT DO NOTHING;

-- UCB courses
INSERT INTO courses (id, university_id, department_id, code, title_en, title_ar, slug) VALUES
  ('d9000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000009', 'b9000000-0000-0000-0000-000000000001', 'BUS 100', 'Intro to Business', 'مقدمة في الأعمال', 'ucb-bus-100'),
  ('d9000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000009', 'b9000000-0000-0000-0000-000000000002', 'CMP 201', 'Programming I', 'البرمجة ١', 'ucb-cmp-201'),
  ('d9000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000009', 'b9000000-0000-0000-0000-000000000003', 'GD 110', 'Visual Communication', 'الاتصال البصري', 'ucb-gd-110'),
  ('d9000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000009', 'b9000000-0000-0000-0000-000000000002', 'CMP 310', 'Networking', 'الشبكات', 'ucb-cmp-310')
ON CONFLICT DO NOTHING;

-- RUW courses
INSERT INTO courses (id, university_id, department_id, code, title_en, title_ar, slug) VALUES
  ('da000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000010', 'ba000000-0000-0000-0000-000000000001', 'CS 101', 'Intro to Computer Science', 'مقدمة في علوم الحاسوب', 'ruw-cs-101'),
  ('da000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000010', 'ba000000-0000-0000-0000-000000000002', 'BA 200', 'Marketing Principles', 'مبادئ التسويق', 'ruw-ba-200'),
  ('da000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000010', 'ba000000-0000-0000-0000-000000000003', 'ID 150', 'Design Fundamentals', 'أساسيات التصميم', 'ruw-id-150'),
  ('da000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000010', 'ba000000-0000-0000-0000-000000000004', 'LAW 101', 'Legal Studies', 'الدراسات القانونية', 'ruw-law-101')
ON CONFLICT DO NOTHING;

-- Gulf University courses
INSERT INTO courses (id, university_id, department_id, code, title_en, title_ar, slug) VALUES
  ('db000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000011', 'bb000000-0000-0000-0000-000000000001', 'ENG 210', 'Circuit Analysis', 'تحليل الدوائر', 'gu-eng-210'),
  ('db000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000011', 'bb000000-0000-0000-0000-000000000002', 'ADM 101', 'Principles of Management', 'مبادئ الإدارة', 'gu-adm-101'),
  ('db000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000011', 'bb000000-0000-0000-0000-000000000003', 'CS 220', 'Operating Systems', 'نظم التشغيل', 'gu-cs-220'),
  ('db000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000011', 'bb000000-0000-0000-0000-000000000001', 'ENG 310', 'Thermodynamics', 'الديناميكا الحرارية', 'gu-eng-310')
ON CONFLICT DO NOTHING;

-- Strathclyde courses
INSERT INTO courses (id, university_id, department_id, code, title_en, title_ar, slug) VALUES
  ('dc000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000012', 'bc000000-0000-0000-0000-000000000001', 'MKT 201', 'Strategic Marketing', 'التسويق الاستراتيجي', 'strath-mkt-201'),
  ('dc000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000012', 'bc000000-0000-0000-0000-000000000001', 'ACC 301', 'Financial Accounting', 'المحاسبة المالية', 'strath-acc-301'),
  ('dc000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000012', 'bc000000-0000-0000-0000-000000000002', 'ENG 200', 'Mechanical Engineering Design', 'تصميم الهندسة الميكانيكية', 'strath-eng-200'),
  ('dc000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000012', 'bc000000-0000-0000-0000-000000000002', 'ENG 350', 'Renewable Energy Systems', 'أنظمة الطاقة المتجددة', 'strath-eng-350')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. PROFESSOR-COURSE LINKS
-- ============================================================
INSERT INTO professor_courses (professor_id, course_id) VALUES
  -- UTB
  ('c6000000-0000-0000-0000-000000000001', 'd6000000-0000-0000-0000-000000000001'),
  ('c6000000-0000-0000-0000-000000000001', 'd6000000-0000-0000-0000-000000000002'),
  ('c6000000-0000-0000-0000-000000000002', 'd6000000-0000-0000-0000-000000000005'),
  ('c6000000-0000-0000-0000-000000000003', 'd6000000-0000-0000-0000-000000000003'),
  ('c6000000-0000-0000-0000-000000000004', 'd6000000-0000-0000-0000-000000000004'),
  ('c6000000-0000-0000-0000-000000000005', 'd6000000-0000-0000-0000-000000000003'),
  -- Ahlia
  ('c8000000-0000-0000-0000-000000000001', 'd8000000-0000-0000-0000-000000000001'),
  ('c8000000-0000-0000-0000-000000000002', 'd8000000-0000-0000-0000-000000000003'),
  ('c8000000-0000-0000-0000-000000000003', 'd8000000-0000-0000-0000-000000000004'),
  ('c8000000-0000-0000-0000-000000000004', 'd8000000-0000-0000-0000-000000000005'),
  ('c8000000-0000-0000-0000-000000000005', 'd8000000-0000-0000-0000-000000000002'),
  -- UCB
  ('c9000000-0000-0000-0000-000000000001', 'd9000000-0000-0000-0000-000000000001'),
  ('c9000000-0000-0000-0000-000000000002', 'd9000000-0000-0000-0000-000000000002'),
  ('c9000000-0000-0000-0000-000000000002', 'd9000000-0000-0000-0000-000000000004'),
  ('c9000000-0000-0000-0000-000000000003', 'd9000000-0000-0000-0000-000000000003'),
  ('c9000000-0000-0000-0000-000000000004', 'd9000000-0000-0000-0000-000000000001'),
  -- RUW
  ('ca000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000001'),
  ('ca000000-0000-0000-0000-000000000002', 'da000000-0000-0000-0000-000000000002'),
  ('ca000000-0000-0000-0000-000000000003', 'da000000-0000-0000-0000-000000000003'),
  ('ca000000-0000-0000-0000-000000000004', 'da000000-0000-0000-0000-000000000004'),
  -- Gulf
  ('cb000000-0000-0000-0000-000000000001', 'db000000-0000-0000-0000-000000000001'),
  ('cb000000-0000-0000-0000-000000000002', 'db000000-0000-0000-0000-000000000002'),
  ('cb000000-0000-0000-0000-000000000003', 'db000000-0000-0000-0000-000000000003'),
  ('cb000000-0000-0000-0000-000000000004', 'db000000-0000-0000-0000-000000000004'),
  -- Strathclyde
  ('cc000000-0000-0000-0000-000000000001', 'dc000000-0000-0000-0000-000000000001'),
  ('cc000000-0000-0000-0000-000000000002', 'dc000000-0000-0000-0000-000000000002'),
  ('cc000000-0000-0000-0000-000000000003', 'dc000000-0000-0000-0000-000000000003'),
  ('cc000000-0000-0000-0000-000000000004', 'dc000000-0000-0000-0000-000000000004')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. REVIEWS WITH grade_received FOR ALL NEW UNIVERSITIES
-- ============================================================

-- Create temp table for review comments
CREATE TEMP TABLE temp_review_data (
  idx SERIAL,
  comment TEXT,
  tags TEXT[],
  grade TEXT
);

INSERT INTO temp_review_data (comment, tags, grade) VALUES
  ('Really knows the subject inside out. Makes complex topics feel simple. Office hours are genuinely helpful.', ARRAY['Amazing Lectures','Caring'], 'A'),
  ('Tough grader but you learn a lot. Start assignments early if you want to survive.', ARRAY['Tough Grader','Lots of Homework'], 'B+'),
  ('Lectures can be dry but the content is solid. Textbook is a must for this one.', ARRAY['Textbook Required','Clear Grading'], 'B'),
  ('One of the best experiences I had. Very accessible outside of class and really wants you to succeed.', ARRAY['Amazing Lectures','Inspirational'], 'A+'),
  ('Not great at explaining things. Had to rely on YouTube for most of the material.', ARRAY['Skip Class','Confusing Exams'], 'C+'),
  ('Friendly and approachable but exams are significantly harder than what we cover in class.', ARRAY['Tough Grader','Caring'], 'B-'),
  ('Clear slides, fair exams. The group project was actually fun. Would recommend.', ARRAY['Clear Grading','Group Projects'], 'A-'),
  ('Shows up late, cancels lectures randomly. When he does teach, the material is decent.', ARRAY['Skip Class','Participation Matters'], 'B'),
  ('She is incredibly passionate about what she teaches. You can feel the energy in every lecture.', ARRAY['Inspirational','Amazing Lectures'], 'A'),
  ('Expect to put in a LOT of work. The curve saved me honestly. Not for the faint-hearted.', ARRAY['Tough Grader','Lots of Homework'], 'C+'),
  ('Very organized course structure. Weekly quizzes keep you on track. Fair final exam.', ARRAY['Clear Grading','Lots of Homework'], 'B+'),
  ('Absolute legend. Explains things with real-world examples that actually stick with you.', ARRAY['Amazing Lectures','Inspirational'], 'A'),
  ('The labs were the best part. Lecture slides need updating though, some info is outdated.', ARRAY['Group Projects','Textbook Required'], 'B'),
  ('Harsh with attendance policy but generous with partial credit on exams.', ARRAY['Participation Matters','Clear Grading'], 'B+'),
  ('Could not understand his accent at first but you get used to it. Content-wise very knowledgeable.', ARRAY['Caring','Tough Grader'], 'B-'),
  ('Assignments are straightforward if you attend lectures. Skipping is not an option here.', ARRAY['Participation Matters','Clear Grading'], 'A-'),
  ('Makes accounting actually interesting which I did not think was possible.', ARRAY['Amazing Lectures','Inspirational'], 'A'),
  ('Midterm was brutal. Final was fair. Study the practice problems and you will be fine.', ARRAY['Tough Grader','Lots of Homework'], 'B'),
  ('Always willing to explain things again if you ask. Very patient with students.', ARRAY['Caring','Amazing Lectures'], 'A-'),
  ('The course felt rushed towards the end. First half was great, second half was chaos.', ARRAY['Skip Class','Confusing Exams'], 'C'),
  ('Genuinely cares about student wellbeing. Extended deadlines during a stressful week without us even asking.', ARRAY['Caring','Inspirational'], 'A'),
  ('Pop quizzes every other class. Keeps you on your toes but it is stressful.', ARRAY['Tough Grader','Participation Matters'], 'B+'),
  ('Best professor at this university no question. If they teach it, take it.', ARRAY['Amazing Lectures','Inspirational'], 'A+'),
  ('Average professor. Does the job. Nothing extraordinary but nothing terrible either.', ARRAY['Clear Grading'], 'B'),
  ('Her feedback on assignments is incredibly detailed. You actually learn from the corrections.', ARRAY['Caring','Clear Grading'], 'A-'),
  ('The workload is insane but I genuinely feel prepared for the workforce now.', ARRAY['Lots of Homework','Tough Grader'], 'B+'),
  ('Uses real case studies from Bahrain companies which makes the material relevant.', ARRAY['Amazing Lectures','Group Projects'], 'A'),
  ('Dropped this class twice before finally passing. Third time is the charm I guess.', ARRAY['Tough Grader','Confusing Exams'], 'C+'),
  ('Very engaging discussions in class. She encourages different viewpoints and that made it interesting.', ARRAY['Participation Matters','Inspirational'], 'A-'),
  ('Slides are basically the textbook copy pasted. Save your money and just read the slides.', ARRAY['Skip Class','Textbook Required'], 'B-');

-- Now insert reviews for each new university
DO $$
DECLARE
  prof RECORD;
  course_rec RECORD;
  rev RECORD;
  rev_idx INT;
  uni_id UUID;
  grades TEXT[] := ARRAY['A+','A','A-','B+','B','B-','C+','C','C-','D','F'];
BEGIN
  -- For each new professor
  FOR prof IN
    SELECT p.id AS prof_id, p.university_id, p.name_en,
           (SELECT pc.course_id FROM professor_courses pc WHERE pc.professor_id = p.id LIMIT 1) AS course_id
    FROM professors p
    WHERE p.id::text LIKE 'c6%' OR p.id::text LIKE 'c8%' OR p.id::text LIKE 'c9%'
       OR p.id::text LIKE 'ca%' OR p.id::text LIKE 'cb%' OR p.id::text LIKE 'cc%'
  LOOP
    IF prof.course_id IS NULL THEN CONTINUE; END IF;

    -- Insert 3-6 reviews per professor
    FOR rev_idx IN 1..((random() * 3 + 3)::int) LOOP
      SELECT * INTO rev FROM temp_review_data ORDER BY random() LIMIT 1;

      INSERT INTO reviews (
        professor_id, course_id, university_id, anon_user_hash,
        rating_quality, rating_difficulty, would_take_again,
        tags, comment, status, grade_received,
        semester_window, created_at
      ) VALUES (
        prof.prof_id,
        prof.course_id,
        prof.university_id,
        md5(random()::text || prof.prof_id || rev_idx),
        (random() * 2.5 + 2.5)::numeric(3,1),  -- 2.5-5.0
        (random() * 3 + 1.5)::numeric(3,1),     -- 1.5-4.5
        random() > 0.3,
        rev.tags,
        rev.comment,
        'live',
        rev.grade,
        'Spring 2025',
        NOW() - (random() * 90 || ' days')::interval
      );
    END LOOP;
  END LOOP;
END $$;

DROP TABLE IF EXISTS temp_review_data;

-- ============================================================
-- 7. UPDATE grade_received ON EXISTING REVIEWS (backfill)
-- ============================================================
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

-- ============================================================
-- 8. REFRESH AGGREGATES FOR ALL NEW PROFESSORS
-- ============================================================
DO $$
DECLARE pid UUID;
BEGIN
  FOR pid IN
    SELECT DISTINCT professor_id FROM reviews
    WHERE professor_id::text LIKE 'c6%' OR professor_id::text LIKE 'c8%'
       OR professor_id::text LIKE 'c9%' OR professor_id::text LIKE 'ca%'
       OR professor_id::text LIKE 'cb%' OR professor_id::text LIKE 'cc%'
  LOOP
    PERFORM refresh_professor_aggregates(pid);
  END LOOP;
END $$;

-- Refresh trending
SELECT refresh_trending();

