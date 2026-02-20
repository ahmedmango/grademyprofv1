#!/bin/bash
# ============================================================
# GradeMyProfessor v3.2 — BIBF + Acronym Search + Rate Fix
# 1. Add BIBF university + departments + professors + courses
# 2. Add short_name (acronym) to universities table
# 3. Update search API to match acronyms
# 4. Rewrite rate page (fix the stuck-on-step-1 bug)
# Run from project root: bash fixes2.sh
# ============================================================

set -e

echo "🔧 GradeMyProfessor v3.2 — BIBF + Search + Rate Fix"
echo "====================================================="
echo ""

if [ ! -f "package.json" ]; then
  echo "❌ Run this from the project root"
  exit 1
fi

# ============================================================
# 1. SQL MIGRATION — BIBF + acronyms
# ============================================================
echo "📦 Writing migration 005..."

cat > supabase/migrations/005_bibf_and_acronyms.sql << 'MIGRATION_EOF'
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
INSERT INTO universities (id, name_en, name_ar, country_code, slug, short_name) VALUES
  ('a1000000-0000-0000-0000-000000000013', 'Bahrain Institute of Banking and Finance', 'معهد البحرين للدراسات المصرفية والمالية', 'BH', 'bibf', 'BIBF')
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

MIGRATION_EOF

echo "  ✅ Migration 005 written"

# ============================================================
# 2. UPDATE SEARCH API — Match acronyms + universities
# ============================================================
echo "🔍 Rewriting search API with acronym matching..."

cat > src/app/api/search/route.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const revalidate = 60;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const type = req.nextUrl.searchParams.get("type") || "all";

  if (!q || q.length < 1) {
    return NextResponse.json({ professors: [], courses: [], course_professors: [], universities: [] });
  }

  const sanitized = q.replace(/[^\w\s\-.']/g, "").slice(0, 100);
  if (!sanitized) return NextResponse.json({ professors: [], courses: [], course_professors: [], universities: [] });

  const supabase = createServerClient();
  const results: { professors: any[]; courses: any[]; course_professors: any[]; universities: any[] } = {
    professors: [], courses: [], course_professors: [], universities: [],
  };

  // Always search universities (by name OR acronym)
  {
    const { data } = await supabase
      .from("universities")
      .select("id, name_en, name_ar, slug, short_name")
      .eq("is_active", true)
      .or(`name_en.ilike.%${sanitized}%,short_name.ilike.%${sanitized}%,name_ar.ilike.%${sanitized}%`)
      .order("name_en")
      .limit(5);

    results.universities = (data || []).map((u: any) => ({
      id: u.id, name_en: u.name_en, name_ar: u.name_ar, slug: u.slug, short_name: u.short_name,
    }));
  }

  // Search professors
  if (type === "all" || type === "professors") {
    const { data } = await supabase
      .from("professors")
      .select(`id, name_en, name_ar, slug, photo_url,
        departments ( name_en ), universities ( name_en, slug, short_name ),
        aggregates_professor ( avg_quality, avg_difficulty, review_count, would_take_again_pct, top_tags )`)
      .eq("is_active", true)
      .or(`name_en.ilike.%${sanitized}%,name_ar.ilike.%${sanitized}%`)
      .order("name_en").limit(12);

    results.professors = (data || []).map((p: any) => ({
      id: p.id, name_en: p.name_en, name_ar: p.name_ar, slug: p.slug,
      department: p.departments?.name_en || null,
      university: p.universities?.name_en || null,
      university_short: p.universities?.short_name || null,
      university_slug: p.universities?.slug || null,
      avg_quality: p.aggregates_professor?.avg_quality ?? p.aggregates_professor?.[0]?.avg_quality ?? null,
      review_count: p.aggregates_professor?.review_count ?? p.aggregates_professor?.[0]?.review_count ?? 0,
      would_take_again_pct: p.aggregates_professor?.would_take_again_pct ?? p.aggregates_professor?.[0]?.would_take_again_pct ?? null,
      top_tags: p.aggregates_professor?.top_tags ?? p.aggregates_professor?.[0]?.top_tags ?? [],
    }));
  }

  // Search courses
  if (type === "all" || type === "courses") {
    const { data } = await supabase
      .from("courses")
      .select(`id, code, title_en, slug, universities ( name_en, slug, short_name ), departments ( name_en )`)
      .or(`code.ilike.%${sanitized}%,title_en.ilike.%${sanitized}%`)
      .order("code").limit(12);

    results.courses = (data || []).map((c: any) => ({
      id: c.id, code: c.code, title_en: c.title_en, slug: c.slug,
      university: c.universities?.name_en || null,
      university_short: c.universities?.short_name || null,
      university_slug: c.universities?.slug || null,
      department: c.departments?.name_en || null,
    }));
  }

  // Course -> professor lookup (when query contains numbers)
  if ((type === "all" || type === "courses") && /\d/.test(sanitized)) {
    const { data } = await supabase
      .from("professor_courses")
      .select(`courses!inner ( id, code, title_en, slug ),
        professors!inner ( id, name_en, slug, departments ( name_en ),
          aggregates_professor ( avg_quality, review_count ) )`)
      .ilike("courses.code", `%${sanitized}%`).limit(20);

    if (data) {
      results.course_professors = data.map((row: any) => ({
        course_code: row.courses?.code, course_slug: row.courses?.slug,
        professor_id: row.professors?.id, professor_name: row.professors?.name_en,
        professor_slug: row.professors?.slug, department: row.professors?.departments?.name_en,
        avg_quality: row.professors?.aggregates_professor?.avg_quality ?? null,
        review_count: row.professors?.aggregates_professor?.review_count ?? 0,
      }));
    }
  }

  return NextResponse.json(results, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
EOF

echo "  ✅ Search API updated with university/acronym matching"

# ============================================================
# 3. UPDATE SEARCH PAGE — Show university results
# ============================================================
echo "🔍 Updating search page to show universities..."

cat > src/app/search/page.tsx << 'SEARCH_EOF'
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useApp } from "@/components/Providers";
import { t } from "@/lib/i18n";

type SearchResults = {
  professors: any[];
  courses: any[];
  course_professors: any[];
  universities: any[];
};

export default function SearchPage() {
  const { lang } = useApp();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults>({ professors: [], courses: [], course_professors: [], universities: [] });
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    try { const saved = localStorage.getItem("gmp_recent_searches"); if (saved) setRecentSearches(JSON.parse(saved).slice(0, 5)); } catch {}
  }, []);

  useEffect(() => {
    if (q.trim().length < 1) { setResults({ professors: [], courses: [], course_professors: [], universities: [] }); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try { const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`); if (res.ok) setResults(await res.json()); } catch {}
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [q]);

  const saveRecentSearch = (term: string) => {
    try { const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5); localStorage.setItem("gmp_recent_searches", JSON.stringify(updated)); setRecentSearches(updated); } catch {}
  };

  const hasResults = results.professors.length > 0 || results.courses.length > 0 || results.course_professors.length > 0 || results.universities.length > 0;
  const qc = (v: number) => v >= 4 ? "text-green-600" : v >= 3 ? "text-amber-600" : "text-red-600";

  return (
    <div className="px-5 pb-10">
      <div className="pt-4 mb-5 flex items-center gap-3">
        <Link href="/" style={{ color: "var(--text-tertiary)" }} className="text-lg">←</Link>
        <div className="flex-1 flex items-center gap-2.5 rounded-xl px-4 py-3"
          style={{ background: "var(--accent-soft)", border: "2px solid var(--accent)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={t(lang, "search_placeholder")}
            className="flex-1 bg-transparent outline-none text-sm" style={{ color: "var(--text-primary)" }} />
          {q && <button onClick={() => setQ("")} style={{ color: "var(--text-tertiary)" }} className="text-sm">✕</button>}
        </div>
      </div>

      {/* Empty state */}
      {!q && !loading && (
        <div className="animate-fade-up">
          {recentSearches.length > 0 && (
            <div className="mb-6">
              <div className="section-label mb-3">{t(lang, "recent")}</div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <button key={term} onClick={() => setQ(term)}
                    className="pill">{term}</button>
                ))}
              </div>
            </div>
          )}
          <div className="card-flat p-5">
            <h3 className="font-display text-sm font-bold mb-3" style={{ color: "var(--accent)" }}>{t(lang, "search_tips")}</h3>
            <div className="space-y-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>
              <div className="flex items-start gap-2"><span>🔤</span><span>{t(lang, "tip_professor")}</span></div>
              <div className="flex items-start gap-2"><span>📚</span><span>{t(lang, "tip_course")}</span></div>
              <div className="flex items-start gap-2"><span>🏫</span><span>{t(lang, "tip_browse")}</span></div>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="text-center py-8 text-sm animate-pulse" style={{ color: "var(--text-tertiary)" }}>Searching…</div>}

      {/* University results */}
      {results.universities.length > 0 && (
        <div className="mb-5 animate-fade-up">
          <div className="section-label mb-2">🏫 {t(lang, "universities")}</div>
          {results.universities.map((u: any) => (
            <Link key={u.id} href={`/u/${u.slug}`} onClick={() => saveRecentSearch(q.trim())}
              className="flex items-center gap-3 card-flat p-3.5 mb-2">
              <div className="flex-1">
                <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {lang === "ar" && u.name_ar ? u.name_ar : u.name_en}
                </div>
                {u.short_name && (
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{u.short_name}</span>
                )}
              </div>
              <span style={{ color: "var(--accent)" }}>→</span>
            </Link>
          ))}
        </div>
      )}

      {/* Course professor results */}
      {results.course_professors.length > 0 && (
        <div className="mb-5 animate-fade-up">
          <div className="section-label mb-2">👩‍🏫 {t(lang, "professors")} for this course</div>
          {results.course_professors.map((cp: any, i: number) => (
            <Link key={`${cp.professor_id}-${i}`} href={`/p/${cp.professor_slug}`} onClick={() => saveRecentSearch(q.trim())}
              className="flex items-center justify-between card-flat p-3.5 mb-2">
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{cp.professor_name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="pill">{cp.course_code}</span>
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{cp.department}</span>
                </div>
              </div>
              {cp.review_count > 0 && (
                <div className="text-right">
                  <div className={`text-lg font-extrabold font-display ${qc(cp.avg_quality)}`}>{Number(cp.avg_quality).toFixed(1)}</div>
                  <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{cp.review_count} {t(lang, "ratings")}</div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Course results */}
      {results.courses.length > 0 && (
        <div className="mb-5 animate-fade-up">
          <div className="section-label mb-2">📚 {t(lang, "courses")}</div>
          {results.courses.map((c: any) => (
            <Link key={c.id} href={`/c/${c.slug}`} onClick={() => saveRecentSearch(q.trim())}
              className="card-flat p-3.5 mb-2 block">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm" style={{ color: "var(--accent)" }}>{c.code}</span>
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>{c.title_en}</span>
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>{c.university_short || c.university} · {c.department || "General"}</div>
            </Link>
          ))}
        </div>
      )}

      {/* Professor results */}
      {results.professors.length > 0 && (
        <div className="animate-fade-up">
          <div className="section-label mb-2">👩‍🏫 {t(lang, "professors")}</div>
          {results.professors.map((p: any) => (
            <Link key={p.id} href={`/p/${p.slug}`} onClick={() => saveRecentSearch(q.trim())}
              className="flex items-center justify-between card-flat p-4 mb-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{p.name_en}</div>
                <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{p.department} · {p.university_short || p.university}</div>
                {p.top_tags && p.top_tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5">{p.top_tags.slice(0, 2).map((tag: string) => (
                    <span key={tag} className="pill">{tag}</span>
                  ))}</div>
                )}
              </div>
              {p.review_count > 0 && (
                <div className="text-right ml-3 shrink-0">
                  <div className={`text-lg font-extrabold font-display ${qc(p.avg_quality)}`}>{Number(p.avg_quality).toFixed(1)}</div>
                  <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{p.review_count} {t(lang, "ratings")}</div>
                  {p.would_take_again_pct !== null && p.would_take_again_pct > 0 && (
                    <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{Math.round(p.would_take_again_pct)}% {t(lang, "retake")}</div>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* No results */}
      {!loading && q.length > 0 && !hasResults && (
        <div className="text-center py-12 animate-fade-up">
          <div className="text-3xl mb-3">🔍</div>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{t(lang, "no_results")} "{q}"</p>
          <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>{t(lang, "try_different")}</p>
          <Link href="/" className="text-xs font-medium hover:underline" style={{ color: "var(--accent)" }}>{t(lang, "browse_instead")} →</Link>
        </div>
      )}
    </div>
  );
}
SEARCH_EOF

echo "  ✅ Search page updated"

# ============================================================
# 4. REWRITE RATE PAGE — Fix the stuck bug
# ============================================================
echo "📝 Rewriting rate page..."

cat > src/app/rate/page.tsx << 'RATE_EOF'
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getAnonUserHash } from "@/lib/anon-identity";
import { fmtRating } from "@/lib/utils";
import { useApp } from "@/components/Providers";
import { VALID_TAGS } from "@/lib/constants";

const GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F", "W"];

function RateForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { lang } = useApp();

  const professorId = searchParams.get("professorId") || "";
  const courseId = searchParams.get("courseId") || "";
  const professorName = searchParams.get("professorName") || "";
  const courseName = searchParams.get("courseName") || "";

  const [step, setStep] = useState(1);
  const [quality, setQuality] = useState(0);
  const [difficulty, setDifficulty] = useState(0);
  const [wouldTakeAgain, setWouldTakeAgain] = useState<boolean | null>(null);
  const [grade, setGrade] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // If no professor selected, redirect to search
  useEffect(() => {
    if (!professorId || !courseId) {
      // Don't redirect yet — maybe they came directly
    }
  }, [professorId, courseId]);

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 3 ? [...prev, tag] : prev
    );
  };

  const canAdvance = () => {
    switch (step) {
      case 1: return quality > 0 && difficulty > 0;
      case 2: return grade.length > 0;
      case 3: return true; // tags + comment optional
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const hash = await getAnonUserHash();
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-anon-user-hash": hash },
        body: JSON.stringify({
          professor_id: professorId,
          course_id: courseId,
          rating_quality: quality,
          rating_difficulty: difficulty,
          would_take_again: wouldTakeAgain,
          grade_received: grade,
          tags,
          comment: comment.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to submit review");
      }
    } catch {
      setError("Connection failed. Please try again.");
    }
    setSubmitting(false);
  };

  // No professor selected — show message
  if (!professorId || !courseId) {
    return (
      <div className="px-5 pb-10 pt-8 text-center">
        <div className="text-4xl mb-3">✍️</div>
        <h1 className="font-display text-xl font-bold mb-2" style={{ color: "var(--accent)" }}>Rate a Professor</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          Find a professor first, then tap "Rate" on their profile page.
        </p>
        <Link href="/search" className="inline-block px-6 py-3 rounded-xl text-sm font-semibold"
          style={{ background: "var(--accent)", color: "#fff" }}>
          Search Professors →
        </Link>
      </div>
    );
  }

  // Success!
  if (success) {
    return (
      <div className="px-5 pb-10 pt-12 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="font-display text-xl font-bold mb-2" style={{ color: "var(--accent)" }}>Review Submitted!</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          Your review is pending moderation and will go live within 24 hours. Thank you for helping fellow students!
        </p>
        <div className="flex gap-3 justify-center">
          <Link href={`/p/${searchParams.get("professorSlug") || ""}`}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold card-flat">
            ← Back to Professor
          </Link>
          <Link href="/my-reviews" className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "var(--accent)", color: "#fff" }}>
            My Reviews
          </Link>
        </div>
      </div>
    );
  }

  const ratingLabel = (v: number) => v <= 1 ? "Awful" : v <= 2 ? "Poor" : v <= 3 ? "OK" : v <= 4 ? "Good" : "Amazing";

  return (
    <div className="px-5 pb-10">
      <div className="pt-4 mb-5 flex items-center gap-3">
        <button onClick={() => step > 1 ? setStep(step - 1) : router.back()}
          style={{ color: "var(--text-tertiary)" }} className="text-lg">←</button>
        <div className="flex-1">
          <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{professorName}</div>
          <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{courseName}</div>
        </div>
        <div className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>Step {step}/3</div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full mb-6" style={{ background: "var(--border)" }}>
        <div className="h-1 rounded-full transition-all duration-300" style={{ background: "var(--accent)", width: `${(step / 3) * 100}%` }} />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: "#7F1D1D30", color: "var(--rating-low)" }}>
          {error}
        </div>
      )}

      {/* STEP 1: Ratings */}
      {step === 1 && (
        <div className="space-y-6 animate-fade-up">
          <div>
            <label className="block text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
              Quality Rating * {quality > 0 && <span style={{ color: "var(--accent)" }}>— {ratingLabel(quality)}</span>}
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} onClick={() => setQuality(v)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                  style={quality === v
                    ? { background: "var(--accent)", color: "#fff" }
                    : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
                  }>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
              Difficulty Rating * {difficulty > 0 && <span style={{ color: "var(--accent)" }}>— {ratingLabel(difficulty)}</span>}
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} onClick={() => setDifficulty(v)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                  style={difficulty === v
                    ? { background: "var(--accent)", color: "#fff" }
                    : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
                  }>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Would you take this professor again?</label>
            <div className="flex gap-2">
              {[true, false].map((v) => (
                <button key={String(v)} onClick={() => setWouldTakeAgain(v)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={wouldTakeAgain === v
                    ? { background: "var(--accent)", color: "#fff" }
                    : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
                  }>
                  {v ? "👍 Yes" : "👎 No"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Grade */}
      {step === 2 && (
        <div className="animate-fade-up">
          <label className="block text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
            Grade Received *
          </label>
          <div className="flex flex-wrap gap-2">
            {GRADES.map((g) => (
              <button key={g} onClick={() => setGrade(g)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={grade === g
                  ? { background: "var(--accent)", color: "#fff" }
                  : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
                }>
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: Tags + Comment */}
      {step === 3 && (
        <div className="space-y-6 animate-fade-up">
          <div>
            <label className="block text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
              Tags (pick up to 3)
            </label>
            <div className="flex flex-wrap gap-2">
              {VALID_TAGS.map((tag) => (
                <button key={tag} onClick={() => toggleTag(tag)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={tags.includes(tag)
                    ? { background: "var(--accent)", color: "#fff" }
                    : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
                  }>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
              Review (optional but helpful!)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What should other students know about this professor?"
              rows={4}
              maxLength={1000}
              className="w-full p-3.5 rounded-xl text-sm resize-none outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
            <div className="text-right text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>{comment.length}/1000</div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex gap-3">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)}
            className="flex-1 py-3 rounded-xl text-sm font-semibold card-flat">
            Back
          </button>
        )}
        {step < 3 ? (
          <button onClick={() => setStep(step + 1)} disabled={!canAdvance()}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#fff" }}>
            Next →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting || !canAdvance()}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#fff" }}>
            {submitting ? "Submitting…" : "Submit Review ✓"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function RatePage() {
  return (
    <Suspense fallback={<div className="px-5 py-12 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>Loading…</div>}>
      <RateForm />
    </Suspense>
  );
}
RATE_EOF

echo "  ✅ Rate page rewritten"

# ============================================================
# DONE
# ============================================================
echo ""
echo "✅ All fixes written!"
echo ""
echo "  FILES CREATED/MODIFIED:"
echo "    supabase/migrations/005_bibf_and_acronyms.sql  — BIBF + acronyms"
echo "    src/app/api/search/route.ts                    — Acronym + uni search"
echo "    src/app/search/page.tsx                        — Shows uni results"
echo "    src/app/rate/page.tsx                          — Fixed 3-step flow"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "NEXT STEPS:"
echo ""
echo "  1. Run migration in Supabase SQL Editor:"
echo "     cat supabase/migrations/005_bibf_and_acronyms.sql | pbcopy"
echo "     → Supabase Dashboard → SQL Editor → Paste → Run"
echo ""
echo "  2. Test locally: npm run dev"
echo "     → Search 'BIBF', 'UoB', 'AUBH', 'Polytech'"
echo "     → Try the rate flow on a professor page"
echo ""
echo "  3. Push to GitHub:"
echo "     git add -A"
echo "     git commit -m 'feat: BIBF university, acronym search, rate page fix'"
echo "     git push origin main"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
