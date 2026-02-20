#!/bin/bash
# ============================================================
# GradeMyProfessor v2 Upgrade Script
# Run from the project root: bash upgrade.sh
# ============================================================

set -e

echo "🚀 GradeMyProfessor v2 Upgrade"
echo "================================"
echo ""

# Check we're in the right directory
if [ ! -f "package.json" ] || ! grep -q "grade-my-professor-bh" package.json 2>/dev/null; then
  echo "❌ Run this from the project root (where package.json is)"
  exit 1
fi

echo "📁 Creating new directories..."
mkdir -p src/app/c/\[courseSlug\]
mkdir -p src/app/my-reviews
mkdir -p src/app/api/my-reviews
mkdir -p src/app/api/report
mkdir -p supabase/migrations

# ============================================================
# 1. DATABASE MIGRATION
# ============================================================
echo "📦 Writing database migration..."

cat > supabase/migrations/002_upgrade_v2.sql << 'MIGRATION_EOF'
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
MIGRATION_EOF

# ============================================================
# 2. MIDDLEWARE
# ============================================================
echo "🛡️  Writing middleware..."

cat > src/middleware.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Policy", "10/day per user, 5/hour per IP");

    const ua = req.headers.get("user-agent") || "";
    if (process.env.NODE_ENV === "production" && pathname === "/api/review") {
      if (!ua || ua.length < 5 || /^(curl|wget|python-requests|Go-http)/i.test(ua)) {
        return NextResponse.json({ error: "Request blocked" }, { status: 403 });
      }
    }
    return response;
  }

  if (pathname !== "/" && pathname.endsWith("/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(0, -1);
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
EOF

# ============================================================
# 3. NEXT.CONFIG.JS
# ============================================================
echo "⚙️  Upgrading next.config.js..."

cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { domains: [] },
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://grademyprofessor.bh";
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: isDev ? "*" : appUrl },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, x-anon-user-hash, Authorization" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.grademyprofessor.bh" }],
        destination: "https://grademyprofessor.bh/:path*",
        permanent: true,
      },
    ];
  },
};
module.exports = nextConfig;
EOF

# ============================================================
# 4. MODERATION LIB
# ============================================================
echo "🔍 Upgrading moderation engine..."

cat > src/lib/moderation.ts << 'EOF'
const PROFANITY_EN = [
  "fuck","shit","bitch","asshole","bastard","dick","piss",
  "cunt","whore","slut","retard","faggot",
];

const PROFANITY_AR_PATTERNS = [
  /كس\s*أم/, /ابن\s*(ال)?كلب/, /حمار/, /خنزير/, /عاهر/, /شرموط/,
];

const DOXXING_PATTERNS = [
  /\b\d{8}\b/,
  /\+?973\s?\d{4}\s?\d{4}/,
  /\+?\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{4}/,
  /[\w.+-]+@[\w-]+\.[\w.]+/,
  /\b\d{1,5}\s\w+\s(?:st|street|rd|road|ave|avenue|blvd|block|flat|building)\b/i,
  /\b(?:block|بلوك)\s*\d+/i,
  /\b(?:flat|شقة)\s*\d+/i,
  /\b\d{2}[-/]\d{2}[-/]\d{4}\b/,
  /\b(?:CPR|cpr)\s*:?\s*\d{9}\b/,
];

const DEFAMATION_PATTERNS = [
  /\b(he|she|they)\s+(is|are)\s+(a\s+)?(racist|sexist|harasser|predator|criminal|thief|corrupt)\b/i,
  /\bsexual\s+(harass|assault|abuse)/i,
  /\b(corrupt|brib|steal|embezzl|fraud)/i,
  /\b(affair|relationship)\s+with\s+(a\s+)?student/i,
];

const THREAT_PATTERNS = [
  /\b(kill|hurt|attack|punch|beat|shoot)\s+(him|her|them|the professor)\b/i,
  /\b(bomb|threat|weapon)\b/i,
  /\bwill\s+(pay|regret|suffer)\b/i,
];

export interface ScanResult {
  clean: boolean;
  toxicity_score: number;
  risk_flags: Record<string, boolean>;
  suggested_status: "pending" | "flagged" | "removed";
}

export function scanContent(comment: string): ScanResult {
  if (!comment || comment.trim().length === 0) {
    return { clean: true, toxicity_score: 0, risk_flags: {}, suggested_status: "pending" };
  }

  const flags: Record<string, boolean> = {};
  let toxicity = 0;
  const lower = comment.toLowerCase();

  const profanityHits = PROFANITY_EN.filter((w) => new RegExp(`\\b${w}`, "i").test(lower));
  if (profanityHits.length > 0) { flags.profanity = true; toxicity += 0.3 + profanityHits.length * 0.1; }

  if (PROFANITY_AR_PATTERNS.some((p) => p.test(comment))) { flags.profanity_ar = true; toxicity += 0.4; }

  for (const p of DOXXING_PATTERNS) { if (p.test(comment)) { flags.doxxing = true; toxicity += 0.5; break; } }
  for (const p of DEFAMATION_PATTERNS) { if (p.test(comment)) { flags.defamation_risk = true; toxicity += 0.3; break; } }
  for (const p of THREAT_PATTERNS) { if (p.test(comment)) { flags.threat = true; toxicity += 0.6; break; } }

  const letters = comment.replace(/[^a-zA-Z]/g, "");
  if (letters.length > 10 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.6) {
    flags.all_caps = true; toxicity += 0.1;
  }

  if (/(.)\1{4,}/i.test(comment) || /[!?]{4,}/.test(comment)) { flags.spam_pattern = true; toxicity += 0.1; }

  if (comment.length < 15 && /(worst|terrible|awful|hate|garbage|trash)/i.test(lower)) {
    flags.low_effort_negative = true; toxicity += 0.15;
  }

  toxicity = Math.min(Math.round(toxicity * 100) / 100, 1.0);

  let suggested_status: ScanResult["suggested_status"] = "pending";
  if (flags.doxxing || flags.threat) suggested_status = "removed";
  else if (flags.profanity && toxicity >= 0.5) suggested_status = "removed";
  else if (toxicity >= 0.5 || flags.defamation_risk) suggested_status = "flagged";

  return { clean: Object.keys(flags).length === 0, toxicity_score: toxicity, risk_flags: flags, suggested_status };
}
EOF

# ============================================================
# 5. API ROUTES
# ============================================================
echo "🔌 Upgrading API routes..."

# --- /api/search ---
cat > src/app/api/search/route.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const revalidate = 60;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const type = req.nextUrl.searchParams.get("type") || "all";

  if (!q || q.length < 1) {
    return NextResponse.json({ professors: [], courses: [], course_professors: [] });
  }

  const sanitized = q.replace(/[^\w\s\-.']/g, "").slice(0, 100);
  if (!sanitized) return NextResponse.json({ professors: [], courses: [], course_professors: [] });

  const supabase = createServerClient();
  const results: { professors: any[]; courses: any[]; course_professors: any[] } = {
    professors: [], courses: [], course_professors: [],
  };

  if (type === "all" || type === "professors") {
    const { data } = await supabase
      .from("professors")
      .select(`id, name_en, name_ar, slug, photo_url,
        departments ( name_en ), universities ( name_en, slug ),
        aggregates_professor ( avg_quality, avg_difficulty, review_count, would_take_again_pct, top_tags )`)
      .eq("is_active", true)
      .or(`name_en.ilike.%${sanitized}%,name_ar.ilike.%${sanitized}%`)
      .order("name_en").limit(12);

    results.professors = (data || []).map((p: any) => ({
      id: p.id, name_en: p.name_en, name_ar: p.name_ar, slug: p.slug,
      department: p.departments?.name_en || null,
      university: p.universities?.name_en || null,
      university_slug: p.universities?.slug || null,
      avg_quality: p.aggregates_professor?.avg_quality ?? p.aggregates_professor?.[0]?.avg_quality ?? null,
      review_count: p.aggregates_professor?.review_count ?? p.aggregates_professor?.[0]?.review_count ?? 0,
      would_take_again_pct: p.aggregates_professor?.would_take_again_pct ?? p.aggregates_professor?.[0]?.would_take_again_pct ?? null,
      top_tags: p.aggregates_professor?.top_tags ?? p.aggregates_professor?.[0]?.top_tags ?? [],
    }));
  }

  if (type === "all" || type === "courses") {
    const { data } = await supabase
      .from("courses")
      .select(`id, code, title_en, slug, universities ( name_en, slug ), departments ( name_en )`)
      .or(`code.ilike.%${sanitized}%,title_en.ilike.%${sanitized}%`)
      .order("code").limit(12);

    results.courses = (data || []).map((c: any) => ({
      id: c.id, code: c.code, title_en: c.title_en, slug: c.slug,
      university: c.universities?.name_en || null,
      university_slug: c.universities?.slug || null,
      department: c.departments?.name_en || null,
    }));
  }

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

# --- /api/professor ---
cat > src/app/api/professor/route.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const sort = req.nextUrl.searchParams.get("sort") || "newest";
  const courseId = req.nextUrl.searchParams.get("course") || null;
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabase = createServerClient();

  const { data: professor, error } = await supabase
    .from("professors")
    .select(`id, name_en, name_ar, slug, photo_url,
      departments ( id, name_en ), universities ( id, name_en, slug ),
      aggregates_professor ( review_count, avg_quality, avg_difficulty, would_take_again_pct, rating_dist, tag_dist, top_tags ),
      professor_courses ( courses ( id, code, title_en, slug ) )`)
    .eq("slug", slug).eq("is_active", true).single();

  if (error || !professor) return NextResponse.json({ error: "Professor not found" }, { status: 404 });

  let reviewQuery = supabase
    .from("reviews")
    .select("id, rating_quality, rating_difficulty, would_take_again, tags, comment, created_at, course_id, courses ( code, title_en )", { count: "exact" })
    .eq("professor_id", professor.id).eq("status", "live");

  if (courseId) reviewQuery = reviewQuery.eq("course_id", courseId);

  switch (sort) {
    case "oldest": reviewQuery = reviewQuery.order("created_at", { ascending: true }); break;
    case "highest": reviewQuery = reviewQuery.order("rating_quality", { ascending: false }); break;
    case "lowest": reviewQuery = reviewQuery.order("rating_quality", { ascending: true }); break;
    default: reviewQuery = reviewQuery.order("created_at", { ascending: false });
  }

  const { data: reviews, count } = await reviewQuery.range(offset, offset + limit - 1);

  const courses = ((professor as any).professor_courses || []).map((pc: any) => pc.courses).filter(Boolean);
  let courseStats: any[] = [];
  if (courses.length > 1) {
    for (const course of courses) {
      const { data: cr } = await supabase.from("reviews").select("rating_quality, rating_difficulty")
        .eq("professor_id", professor.id).eq("course_id", course.id).eq("status", "live");
      if (cr && cr.length > 0) {
        courseStats.push({
          course_id: course.id, code: course.code, title_en: course.title_en,
          review_count: cr.length,
          avg_quality: Math.round(cr.reduce((s: number, r: any) => s + Number(r.rating_quality), 0) / cr.length * 100) / 100,
          avg_difficulty: Math.round(cr.reduce((s: number, r: any) => s + Number(r.rating_difficulty), 0) / cr.length * 100) / 100,
        });
      }
    }
    courseStats.sort((a, b) => b.review_count - a.review_count);
  }

  return NextResponse.json({
    professor, reviews: reviews || [], total_reviews: count || 0,
    page, total_pages: Math.ceil((count || 0) / limit), course_stats: courseStats,
  }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
}
EOF

# --- /api/review ---
cat > src/app/api/review/route.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { scanContent } from "@/lib/moderation";
import { VALID_TAGS, RATE_LIMITS } from "@/lib/constants";
import { getCurrentSemester } from "@/lib/utils";

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = (hash << 5) - hash + str.charCodeAt(i); hash |= 0; }
  return Math.abs(hash).toString(36);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await req.json();
    const anonUserHash = req.headers.get("x-anon-user-hash") || "";
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = hashString(clientIp);
    const uaHash = hashString(req.headers.get("user-agent") || "");

    const { professor_id, course_id, rating_quality, rating_difficulty,
      would_take_again, attendance_mandatory, uses_textbook, tags, comment } = body;

    if (!professor_id || !course_id || !rating_quality || !rating_difficulty)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    if (!anonUserHash || anonUserHash.length < 8)
      return NextResponse.json({ error: "Invalid identity token" }, { status: 400 });

    const validRating = (v: number) => typeof v === "number" && v >= 0.5 && v <= 5.0 && (v * 10) % 5 === 0;
    if (!validRating(rating_quality) || !validRating(rating_difficulty))
      return NextResponse.json({ error: "Ratings must be 0.5–5.0 in 0.5 increments" }, { status: 400 });

    const validTags = (tags || []).filter((t: string) => VALID_TAGS.includes(t as any)).slice(0, RATE_LIMITS.MAX_TAGS);
    const cleanComment = (comment || "").trim().slice(0, RATE_LIMITS.MAX_COMMENT_LENGTH);

    // Parallel validation
    const semester = getCurrentSemester();
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

    const [profResult, courseResult, userDayResult, ipHourResult, duplicateResult] = await Promise.all([
      supabase.from("professors").select("id, university_id").eq("id", professor_id).eq("is_active", true).single(),
      supabase.from("courses").select("id").eq("id", course_id).single(),
      supabase.from("rate_limits").select("*", { count: "exact", head: true }).eq("anon_user_hash", anonUserHash).gte("created_at", oneDayAgo),
      supabase.from("rate_limits").select("*", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", oneHourAgo),
      supabase.from("reviews").select("id").eq("anon_user_hash", anonUserHash).eq("professor_id", professor_id)
        .eq("course_id", course_id).eq("semester_window", semester).neq("status", "removed").maybeSingle(),
    ]);

    if (!profResult.data) return NextResponse.json({ error: "Professor not found" }, { status: 404 });
    if (!courseResult.data) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    if ((userDayResult.count || 0) >= RATE_LIMITS.MAX_REVIEWS_PER_DAY)
      return NextResponse.json({ error: "Daily review limit reached. Try again tomorrow." }, { status: 429 });
    if ((ipHourResult.count || 0) >= RATE_LIMITS.MAX_REVIEWS_PER_IP_HOUR)
      return NextResponse.json({ error: "Too many submissions from this network." }, { status: 429 });
    if (duplicateResult.data)
      return NextResponse.json({ error: "You already reviewed this professor for this course this semester." }, { status: 409 });

    const scan = scanContent(cleanComment);

    const fiveMinAgo = new Date(Date.now() - 300000).toISOString();
    const { count: recentSameProf } = await supabase.from("reviews").select("*", { count: "exact", head: true })
      .eq("professor_id", professor_id).gte("created_at", fiveMinAgo);
    if ((recentSameProf || 0) >= 5) { scan.risk_flags.brigading_suspect = true; scan.suggested_status = "flagged"; }

    const status = scan.suggested_status === "removed" ? "removed" : scan.suggested_status === "flagged" ? "flagged" : "pending";

    const { data: review, error: insertError } = await supabase.from("reviews").insert({
      professor_id, course_id, university_id: profResult.data.university_id, anon_user_hash: anonUserHash,
      rating_quality, rating_difficulty, would_take_again: would_take_again ?? null,
      attendance_mandatory: attendance_mandatory ?? null, uses_textbook: uses_textbook ?? null,
      tags: validTags, comment: cleanComment, status, toxicity_score: scan.toxicity_score,
      risk_flags: scan.risk_flags, ip_hash: ipHash, user_agent_hash: uaHash, semester_window: semester,
    }).select("id").single();

    if (insertError) { console.error("Insert error:", insertError); return NextResponse.json({ error: "Failed to save review" }, { status: 500 }); }

    supabase.from("rate_limits").insert({ anon_user_hash: anonUserHash, ip_hash: ipHash }).then();

    return NextResponse.json({
      success: true, review_id: review.id, status,
      message: status === "pending" ? "Your review has been submitted and is pending moderation. Most reviews go live within 24 hours."
        : "Your review has been submitted and is being reviewed by our team.",
      points_earned: cleanComment.length >= 30 ? 50 : 30,
    }, { status: 201 });
  } catch (err) {
    console.error("Review submission error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
EOF

# --- /api/my-reviews ---
cat > src/app/api/my-reviews/route.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const anonUserHash = req.headers.get("x-anon-user-hash");
  if (!anonUserHash || anonUserHash.length < 8)
    return NextResponse.json({ error: "Missing identity" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: reviews, error } = await supabase.from("reviews")
    .select(`id, rating_quality, rating_difficulty, would_take_again, tags, comment, status, created_at, semester_window,
      professors ( name_en, slug ), courses ( code, title_en ), universities ( name_en )`)
    .eq("anon_user_hash", anonUserHash).neq("status", "removed")
    .order("created_at", { ascending: false }).limit(50);

  if (error) return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });

  const mapped = (reviews || []).map((r: any) => ({
    ...r,
    display_status: r.status === "shadow" ? "live" : r.status,
    status_label: r.status === "live" || r.status === "shadow" ? "Published"
      : r.status === "pending" || r.status === "flagged" ? "Under Review" : "Removed",
  }));

  return NextResponse.json({ reviews: mapped, count: mapped.length });
}
EOF

# --- /api/report ---
cat > src/app/api/report/route.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const VALID_REASONS = ["spam", "offensive", "inaccurate", "doxxing", "other"] as const;

export async function POST(req: NextRequest) {
  try {
    const { review_id, reason, detail } = await req.json();
    if (!review_id || !reason) return NextResponse.json({ error: "Missing review_id or reason" }, { status: 400 });
    if (!VALID_REASONS.includes(reason)) return NextResponse.json({ error: "Invalid reason" }, { status: 400 });

    const supabase = createServiceClient();
    const { data: review } = await supabase.from("reviews").select("id").eq("id", review_id).eq("status", "live").single();
    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

    const { error: insertError } = await supabase.from("reports").insert({
      review_id, reason, detail: (detail || "").trim().slice(0, 500),
    });
    if (insertError) return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });

    const { count } = await supabase.from("reports").select("*", { count: "exact", head: true }).eq("review_id", review_id);
    if ((count || 0) >= 3) {
      await supabase.from("reviews").update({ status: "flagged", updated_at: new Date().toISOString() })
        .eq("id", review_id).eq("status", "live");
    }

    return NextResponse.json({ success: true, message: "Thank you for reporting. Our team will review this." }, { status: 201 });
  } catch { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
EOF

# --- /api/admin/stats ---
cat > src/app/api/admin/stats/route.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  const { data: statusCounts } = await supabase.rpc("get_review_status_counts");

  let counts = statusCounts;
  if (!counts || typeof counts !== "object") {
    const statuses = ["pending", "flagged", "live", "shadow", "removed"];
    const results = await Promise.all(
      statuses.map((s) => supabase.from("reviews").select("*", { count: "exact", head: true }).eq("status", s))
    );
    counts = {};
    statuses.forEach((s, i) => { counts[s] = results[i].count || 0; });
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const { count: reviewsToday } = await supabase.from("reviews").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString());

  const { data: topProfessors } = await supabase.from("aggregates_professor")
    .select("professor_id, review_count, avg_quality, professors ( name_en, slug )")
    .order("review_count", { ascending: false }).limit(10);

  return NextResponse.json({
    status_counts: counts,
    reviews_today: reviewsToday || 0,
    total_reviews: Object.values(counts as Record<string, number>).reduce((a: number, b: number) => a + b, 0),
    top_professors: topProfessors || [],
  });
}
EOF

# --- /api/admin/review-action ---
cat > src/app/api/admin/review-action/route.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/admin-auth";

const STATUS_MAP: Record<string, string> = { approve: "live", reject: "removed", shadow: "shadow", flag: "flagged" };
const VALID_ACTIONS = ["approve", "reject", "shadow", "flag"];

export async function POST(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { review_id, action } = await req.json();
  if (!review_id || !action || !VALID_ACTIONS.includes(action))
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const supabase = createServiceClient();
  const newStatus = STATUS_MAP[action];

  const { data: review } = await supabase.from("reviews").select("id, professor_id, status").eq("id", review_id).single();
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

  const { error } = await supabase.from("reviews").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", review_id);
  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

  if (newStatus === "live" || review.status === "live") {
    await supabase.rpc("refresh_professor_aggregates", { p_professor_id: review.professor_id });
  }

  return NextResponse.json({ success: true, review_id, old_status: review.status, new_status: newStatus });
}

export async function PUT(req: NextRequest) {
  const admin = await authenticateAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "super_admin" && admin.role !== "moderator")
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { review_ids, action } = await req.json();
  if (!Array.isArray(review_ids) || review_ids.length === 0 || !VALID_ACTIONS.includes(action))
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (review_ids.length > 50)
    return NextResponse.json({ error: "Max 50 per bulk action" }, { status: 400 });

  const supabase = createServiceClient();
  const newStatus = STATUS_MAP[action];

  const { data: reviews } = await supabase.from("reviews").select("id, professor_id, status").in("id", review_ids);
  const { error } = await supabase.from("reviews").update({ status: newStatus, updated_at: new Date().toISOString() }).in("id", review_ids);
  if (error) return NextResponse.json({ error: "Bulk update failed" }, { status: 500 });

  const professorIds = [...new Set((reviews || []).map((r) => r.professor_id))];
  if (professorIds.length > 0) {
    try { await supabase.rpc("refresh_professor_aggregates_batch", { p_professor_ids: professorIds }); }
    catch { await Promise.all(professorIds.map((pid) => supabase.rpc("refresh_professor_aggregates", { p_professor_id: pid }))); }
  }
  if (review_ids.length >= 5) { try { await supabase.rpc("refresh_trending"); } catch {} }

  return NextResponse.json({ success: true, updated_count: review_ids.length, affected_professors: professorIds.length });
}
EOF

# ============================================================
# 6. PAGES
# ============================================================
echo "📄 Writing new pages..."

# --- Homepage ---
cat > src/app/page.tsx << 'EOF'
import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";

export const revalidate = 120;

export default async function HomePage() {
  const supabase = createServerClient();

  const { data: universities } = await supabase
    .from("universities").select("*").eq("is_active", true).order("name_en");

  let topProfessors: any[] = [];
  const { data: mvData } = await supabase.from("mv_trending_professors" as any).select("*").limit(6);
  if (mvData && mvData.length > 0) {
    topProfessors = mvData;
  } else {
    const { data } = await supabase.from("aggregates_professor")
      .select("*, professors ( id, name_en, slug, departments ( name_en ), universities ( name_en, slug ) )")
      .order("review_count", { ascending: false }).limit(6);
    topProfessors = data || [];
  }

  return (
    <div className="px-5 pb-10">
      <div className="pt-14 mb-9 text-center">
        <span className="inline-block bg-brand-50 text-brand-500 text-xs font-semibold tracking-widest uppercase px-3.5 py-1 rounded-full mb-4">Bahrain</span>
        <h1 className="font-display text-4xl font-black leading-none text-brand-600">Grade My<br />Professor</h1>
        <p className="text-gray-500 text-sm mt-3.5 leading-relaxed">
          <span className="text-brand-500 font-semibold">What Students Say</span> — anonymous ratings<br />by real students across Bahrain.
        </p>
      </div>

      <Link href="/search" className="flex items-center gap-3 bg-brand-50/60 rounded-2xl px-4 py-3.5 mb-4 border border-brand-100 hover:border-brand-300 transition">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <span className="text-gray-400 text-sm">Search professor or course code…</span>
      </Link>

      <div className="flex gap-2.5 mb-8">
        <Link href="/my-reviews" className="flex-1 flex items-center justify-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-brand-100 hover:border-brand-300 transition text-xs font-medium text-gray-600">
          <span>📝</span> My Reviews
        </Link>
        <Link href="/search" className="flex-1 flex items-center justify-center gap-2 bg-brand-50 rounded-xl px-3 py-2.5 border border-brand-100 hover:border-brand-300 transition text-xs font-medium text-brand-500">
          <span>✍️</span> Rate a Professor
        </Link>
      </div>

      <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">Universities</h2>
      <div className="grid grid-cols-2 gap-2.5 mb-9">
        {(universities || []).map((u) => (
          <Link key={u.id} href={`/u/${u.slug}`} className="bg-white rounded-2xl p-4 border border-brand-100 hover:border-brand-400 hover:-translate-y-0.5 transition-all">
            <div className="text-sm font-semibold text-brand-900 leading-tight">{u.name_en}</div>
            {u.name_ar && <div className="text-xs text-gray-400 mt-1" dir="rtl">{u.name_ar}</div>}
          </Link>
        ))}
      </div>

      {topProfessors.length > 0 && (
        <>
          <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">🔥 Trending</h2>
          <div className="space-y-2.5">
            {topProfessors.map((item: any) => {
              const name = item.name_en || item.professors?.name_en;
              const slug = item.slug || item.professors?.slug;
              const dept = item.department_name || item.professors?.departments?.name_en;
              const uni = item.university_name || item.professors?.universities?.name_en;
              const avgQ = Number(item.avg_quality);
              if (!name || !slug) return null;
              const qColor = avgQ >= 4 ? "text-green-600" : avgQ >= 3 ? "text-amber-600" : "text-red-600";
              return (
                <Link key={item.professor_id} href={`/p/${slug}`} className="flex items-center justify-between bg-white rounded-2xl p-4 border border-brand-100 hover:border-brand-400 hover:-translate-y-0.5 transition-all">
                  <div><div className="text-sm font-semibold text-brand-900">{name}</div><div className="text-xs text-gray-400">{dept} · {uni}</div></div>
                  <div className="text-right"><div className={`text-xl font-extrabold font-display ${qColor}`}>{avgQ.toFixed(1)}</div><div className="text-xs text-gray-400">{item.review_count} ratings</div></div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-8 bg-brand-50 rounded-2xl p-5 border border-brand-100 text-center">
        <div className="text-2xl mb-1.5">📚</div>
        <div className="text-sm font-bold text-brand-600">Registration Season</div>
        <div className="text-xs text-gray-500 mt-1 leading-relaxed">Search your course codes now and find the best professors before seats fill up.</div>
      </div>
    </div>
  );
}
EOF

# --- Search Page ---
cat > src/app/search/page.tsx << 'SEARCH_EOF'
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

type SearchResults = {
  professors: any[];
  courses: any[];
  course_professors: any[];
};

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults>({ professors: [], courses: [], course_professors: [] });
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    try { const saved = localStorage.getItem("gmp_recent_searches"); if (saved) setRecentSearches(JSON.parse(saved).slice(0, 5)); } catch {}
  }, []);

  useEffect(() => {
    if (q.trim().length < 1) { setResults({ professors: [], courses: [], course_professors: [] }); return; }
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

  const hasResults = results.professors.length > 0 || results.courses.length > 0 || results.course_professors.length > 0;
  const qc = (v: number) => v >= 4 ? "text-green-600" : v >= 3 ? "text-amber-600" : "text-red-600";

  return (
    <div className="px-5 pb-10">
      <div className="pt-4 mb-5 flex items-center gap-3">
        <Link href="/" className="text-gray-400 text-lg">←</Link>
        <div className="flex-1 flex items-center gap-2.5 bg-brand-50/60 rounded-xl px-4 py-3 border-2 border-brand-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Professor name or course code…"
            className="flex-1 bg-transparent outline-none text-brand-900 text-sm placeholder:text-gray-400" />
          {q && <button onClick={() => setQ("")} className="text-gray-400 text-sm">✕</button>}
        </div>
      </div>

      {!q && !loading && (
        <div className="animate-fade-up">
          {recentSearches.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-bold tracking-wider uppercase text-gray-400 mb-3">Recent</h2>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <button key={term} onClick={() => setQ(term)}
                    className="px-3 py-1.5 bg-brand-50 text-brand-500 text-xs font-medium rounded-lg border border-brand-100 hover:border-brand-300 transition">{term}</button>
                ))}
              </div>
            </div>
          )}
          <div className="bg-brand-50/40 rounded-2xl p-5 border border-brand-100">
            <h3 className="font-display text-sm font-bold text-brand-600 mb-3">Search Tips</h3>
            <div className="space-y-2.5 text-xs text-gray-600">
              <div className="flex items-start gap-2"><span className="text-brand-400 mt-0.5">🔤</span><span>Type a <span className="font-medium text-brand-500">professor name</span> to see their ratings and reviews</span></div>
              <div className="flex items-start gap-2"><span className="text-brand-400 mt-0.5">📚</span><span>Search by <span className="font-medium text-brand-500">course code</span> (e.g. CS 301) to see all professors who teach it</span></div>
              <div className="flex items-start gap-2"><span className="text-brand-400 mt-0.5">🏫</span><span>Or <Link href="/" className="text-brand-500 font-medium underline">browse by university</Link> from the home page</span></div>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="text-center py-8 text-gray-400 text-sm animate-pulse">Searching…</div>}

      {results.course_professors.length > 0 && (
        <div className="mb-6 animate-fade-up">
          <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">👩‍🏫 Professors for this course</h2>
          {results.course_professors.map((cp: any, i: number) => (
            <Link key={`${cp.professor_id}-${i}`} href={`/p/${cp.professor_slug}`} onClick={() => saveRecentSearch(q.trim())}
              className="flex items-center justify-between bg-white rounded-xl p-3.5 mb-2 border border-brand-100 hover:border-brand-400 transition">
              <div>
                <div className="text-sm font-semibold text-brand-900">{cp.professor_name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-brand-500 font-medium bg-brand-50 px-1.5 py-0.5 rounded">{cp.course_code}</span>
                  <span className="text-xs text-gray-400">{cp.department}</span>
                </div>
              </div>
              {cp.review_count > 0 && (
                <div className="text-right">
                  <div className={`text-lg font-extrabold font-display ${qc(cp.avg_quality)}`}>{Number(cp.avg_quality).toFixed(1)}</div>
                  <div className="text-[10px] text-gray-400">{cp.review_count} ratings</div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {results.courses.length > 0 && (
        <div className="mb-6 animate-fade-up">
          <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">Courses</h2>
          {results.courses.map((c: any) => (
            <Link key={c.id} href={`/c/${c.slug}`} onClick={() => saveRecentSearch(q.trim())}
              className="block bg-white rounded-xl p-3.5 mb-2 border border-brand-100 hover:border-brand-400 transition">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-brand-500">{c.code}</span>
                <span className="text-sm text-gray-600">{c.title_en}</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">{c.university} · {c.department || "General"}</div>
            </Link>
          ))}
        </div>
      )}

      {results.professors.length > 0 && (
        <div className="animate-fade-up">
          <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">Professors</h2>
          {results.professors.map((p: any) => (
            <Link key={p.id} href={`/p/${p.slug}`} onClick={() => saveRecentSearch(q.trim())}
              className="flex items-center justify-between bg-white rounded-xl p-4 mb-2 border border-brand-100 hover:border-brand-400 transition">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-brand-900">{p.name_en}</div>
                <div className="text-xs text-gray-400">{p.department} · {p.university}</div>
                {p.top_tags && p.top_tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5">{p.top_tags.slice(0, 2).map((tag: string) => (
                    <span key={tag} className="text-[10px] text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">{tag}</span>
                  ))}</div>
                )}
              </div>
              {p.review_count > 0 && (
                <div className="text-right ml-3 shrink-0">
                  <div className={`text-lg font-extrabold font-display ${qc(p.avg_quality)}`}>{Number(p.avg_quality).toFixed(1)}</div>
                  <div className="text-[10px] text-gray-400">{p.review_count} ratings</div>
                  {p.would_take_again_pct !== null && p.would_take_again_pct > 0 && (
                    <div className="text-[10px] text-gray-400">{Math.round(p.would_take_again_pct)}% retake</div>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {!loading && q.length > 0 && !hasResults && (
        <div className="text-center py-12 text-gray-400 animate-fade-up">
          <div className="text-3xl mb-3">🔍</div>
          <p className="text-sm font-medium mb-1">No results for &ldquo;{q}&rdquo;</p>
          <p className="text-xs text-gray-400 mb-4">Try a different spelling or course code</p>
          <Link href="/" className="text-xs text-brand-500 font-medium hover:underline">Browse by university instead →</Link>
        </div>
      )}
    </div>
  );
}
SEARCH_EOF

# --- Course Page ---
cat > src/app/c/\[courseSlug\]/page.tsx << 'COURSE_EOF'
import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fmtRating } from "@/lib/utils";

export async function generateMetadata({ params }: { params: { courseSlug: string } }) {
  const supabase = createServerClient();
  const { data: course } = await supabase.from("courses").select("code, title_en, universities ( name_en )").eq("slug", params.courseSlug).single();
  if (!course) return { title: "Course Not Found" };
  return {
    title: `${course.code} — ${course.title_en} | GradeMyProfessor`,
    description: `See which professors teach ${course.code} and what students say about them at ${(course as any).universities?.name_en}.`,
  };
}

export default async function CoursePage({ params }: { params: { courseSlug: string } }) {
  const supabase = createServerClient();
  const { data: course } = await supabase.from("courses")
    .select(`id, code, title_en, title_ar, slug, universities ( id, name_en, slug ), departments ( id, name_en )`)
    .eq("slug", params.courseSlug).single();
  if (!course) return notFound();

  const uni = (course as any).universities;
  const dept = (course as any).departments;

  const { data: profCourses } = await supabase.from("professor_courses")
    .select(`professors ( id, name_en, name_ar, slug, departments ( name_en ),
      aggregates_professor ( avg_quality, avg_difficulty, review_count, would_take_again_pct, top_tags ) )`)
    .eq("course_id", course.id);

  const professors = (profCourses || []).map((pc: any) => pc.professors).filter(Boolean)
    .sort((a: any, b: any) => {
      const ac = a.aggregates_professor?.review_count ?? a.aggregates_professor?.[0]?.review_count ?? 0;
      const bc = b.aggregates_professor?.review_count ?? b.aggregates_professor?.[0]?.review_count ?? 0;
      return bc - ac;
    });

  const { data: reviews } = await supabase.from("reviews")
    .select(`id, rating_quality, rating_difficulty, would_take_again, tags, comment, created_at, professors ( name_en, slug )`)
    .eq("course_id", course.id).eq("status", "live").order("created_at", { ascending: false }).limit(10);

  const qc = (v: number) => v >= 4 ? "text-green-600" : v >= 3 ? "text-amber-600" : "text-red-600";
  const dc = (v: number) => v >= 4 ? "text-red-600" : v >= 3 ? "text-amber-600" : "text-green-600";

  return (
    <div className="pb-10">
      <div className="px-5 pt-4 flex items-center gap-3 mb-5">
        <Link href="/" className="text-gray-400 text-lg">←</Link>
        <span className="text-xs text-gray-400">{uni?.name_en} · {dept?.name_en || "General"}</span>
      </div>

      <div className="px-5 mb-7">
        <div className="inline-block bg-brand-50 text-brand-500 text-sm font-bold px-3 py-1 rounded-lg mb-2">{course.code}</div>
        <h1 className="font-display text-xl font-extrabold text-brand-600 leading-tight">{course.title_en}</h1>
        {course.title_ar && <p className="text-sm text-gray-400 mt-1" dir="rtl">{course.title_ar}</p>}
      </div>

      <div className="px-5 mb-7">
        <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">👩‍🏫 Who Teaches This Course</h2>
        {professors.length > 0 ? (
          <div className="space-y-2.5">
            {professors.map((p: any) => {
              const agg = p.aggregates_professor;
              const avgQ = agg?.avg_quality ?? agg?.[0]?.avg_quality ?? 0;
              const count = agg?.review_count ?? agg?.[0]?.review_count ?? 0;
              const wta = agg?.would_take_again_pct ?? agg?.[0]?.would_take_again_pct ?? null;
              const topTags = agg?.top_tags ?? agg?.[0]?.top_tags ?? [];
              return (
                <Link key={p.id} href={`/p/${p.slug}`}
                  className="block bg-white rounded-2xl p-4 border border-brand-100 hover:border-brand-400 hover:-translate-y-0.5 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-brand-900">{p.name_en}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{p.departments?.name_en}</div>
                      {topTags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">{topTags.slice(0, 2).map((tag: string) => (
                          <span key={tag} className="text-[10px] text-brand-500 bg-brand-50 px-2 py-0.5 rounded-md">{tag}</span>
                        ))}</div>
                      )}
                    </div>
                    {count > 0 ? (
                      <div className="text-right ml-3 shrink-0">
                        <div className={`text-xl font-extrabold font-display ${qc(avgQ)}`}>{fmtRating(avgQ)}</div>
                        <div className="text-[10px] text-gray-400">{count} ratings</div>
                        {wta !== null && wta > 0 && <div className="text-[10px] text-gray-400">{Math.round(wta)}% retake</div>}
                      </div>
                    ) : (
                      <div className="text-right ml-3 shrink-0"><div className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md">No ratings yet</div></div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <div className="text-2xl mb-2">📚</div>
            <p className="text-sm">No professors linked to this course yet.</p>
            <p className="text-xs text-gray-400 mt-1">Be the first to rate a professor for {course.code}!</p>
          </div>
        )}
      </div>

      {reviews && reviews.length > 0 && (
        <div className="px-5 mb-7">
          <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">💬 Recent Reviews for {course.code}</h2>
          <div className="space-y-3">
            {reviews.map((r: any) => (
              <div key={r.id} className="bg-brand-50/40 rounded-2xl p-4 border border-brand-100">
                <div className="flex items-center justify-between mb-2">
                  <Link href={`/p/${r.professors?.slug}`} className="text-sm font-semibold text-brand-500 hover:underline">{r.professors?.name_en}</Link>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${qc(r.rating_quality)}`}>Q: {fmtRating(r.rating_quality)}</span>
                    <span className={`text-sm font-bold ${dc(r.rating_difficulty)}`}>D: {fmtRating(r.rating_difficulty)}</span>
                  </div>
                </div>
                {r.tags?.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mb-2">{r.tags.map((t: string) => (
                    <span key={t} className="text-[10px] text-brand-500 bg-brand-50 px-2 py-0.5 rounded-md">{t}</span>
                  ))}</div>
                )}
                {r.comment && <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>}
                <div className="text-[10px] text-gray-400 mt-2">{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
COURSE_EOF

# --- My Reviews Page ---
cat > src/app/my-reviews/page.tsx << 'MYREV_EOF'
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAnonUserHash } from "@/lib/anon-identity";
import { fmtRating } from "@/lib/utils";

type MyReview = {
  id: string; rating_quality: number; rating_difficulty: number; would_take_again: boolean | null;
  tags: string[]; comment: string; display_status: string; status_label: string;
  created_at: string; semester_window: string;
  professors: { name_en: string; slug: string } | null;
  courses: { code: string; title_en: string } | null;
  universities: { name_en: string } | null;
};

export default function MyReviewsPage() {
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const hash = await getAnonUserHash();
        const res = await fetch("/api/my-reviews", { headers: { "x-anon-user-hash": hash } });
        if (res.ok) { const data = await res.json(); setReviews(data.reviews); }
        else setError("Failed to load your reviews");
      } catch { setError("Connection failed"); }
      setLoading(false);
    })();
  }, []);

  const statusStyle = (status: string) => {
    switch (status) {
      case "live": return "bg-green-50 text-green-700 border-green-200";
      case "pending": case "flagged": return "bg-amber-50 text-amber-700 border-amber-200";
      default: return "bg-gray-50 text-gray-500 border-gray-200";
    }
  };

  const qc = (v: number) => v >= 4 ? "text-green-600" : v >= 3 ? "text-amber-600" : "text-red-600";

  return (
    <div className="px-5 pb-10">
      <div className="pt-4 flex items-center gap-3 mb-6">
        <Link href="/" className="text-gray-400 text-lg">←</Link>
        <span className="text-xs text-gray-400">Back to Home</span>
      </div>

      <h1 className="font-display text-2xl font-extrabold text-brand-600 mb-1">My Reviews</h1>
      <p className="text-sm text-gray-500 mb-6">Track the status of your submitted ratings. Reviews go live after moderation.</p>

      {loading ? (
        <div className="text-center py-16 text-gray-400"><div className="text-2xl mb-2 animate-pulse">📝</div><p className="text-sm">Loading your reviews…</p></div>
      ) : error ? (
        <div className="text-center py-16 text-red-400"><p className="text-sm">{error}</p></div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">✍️</div>
          <h3 className="font-display text-lg font-bold text-brand-600 mb-1">No reviews yet</h3>
          <p className="text-sm text-gray-500 mb-5">Your ratings help hundreds of students pick the right professor.</p>
          <Link href="/search" className="inline-block px-6 py-3 bg-brand-500 text-white rounded-xl font-semibold text-sm hover:bg-brand-600 transition">Find a Professor to Rate</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-brand-100 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <Link href={`/p/${r.professors?.slug}`} className="font-semibold text-sm text-brand-900 hover:text-brand-500 transition">
                    {r.professors?.name_en || "Unknown Professor"}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-brand-500 font-medium">{r.courses?.code}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-400">{r.universities?.name_en}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${statusStyle(r.display_status)}`}>{r.status_label}</span>
              </div>
              <div className="flex items-center gap-4 mb-2">
                <span className="text-sm">Quality: <span className={`font-bold ${qc(r.rating_quality)}`}>{fmtRating(r.rating_quality)}</span></span>
                <span className="text-sm">Difficulty: <span className="font-bold text-gray-700">{fmtRating(r.rating_difficulty)}</span></span>
                {r.would_take_again !== null && <span className="text-xs text-gray-500">{r.would_take_again ? "👍 Would retake" : "👎 Wouldn't retake"}</span>}
              </div>
              {r.tags?.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-2">{r.tags.map((t) => (
                  <span key={t} className="text-[10px] text-brand-500 bg-brand-50 px-2 py-0.5 rounded-md">{t}</span>
                ))}</div>
              )}
              {r.comment && <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{r.comment}</p>}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                <span className="text-[10px] text-gray-400">{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                <span className="text-[10px] text-gray-400">{r.semester_window}</span>
              </div>
              {(r.display_status === "pending" || r.display_status === "flagged") && (
                <div className="mt-2 p-2.5 bg-amber-50/50 rounded-lg border border-amber-100">
                  <p className="text-[11px] text-amber-700 leading-relaxed">⏳ Your review is being checked by our moderation team. Most reviews are approved within 24 hours.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
MYREV_EOF

# ============================================================
# 7. COMPONENTS
# ============================================================
echo "🧩 Writing new components..."

cat > src/components/ReportButton.tsx << 'COMPONENT_EOF'
"use client";

import { useState } from "react";

const REASONS = [
  { value: "spam", label: "Spam or fake review" },
  { value: "offensive", label: "Offensive or hateful" },
  { value: "inaccurate", label: "Inaccurate information" },
  { value: "doxxing", label: "Contains personal information" },
  { value: "other", label: "Other" },
];

export default function ReportButton({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_id: reviewId, reason, detail: detail.trim() }),
      });
      if (res.ok) setDone(true);
    } catch {}
    setSubmitting(false);
  };

  if (done) return <span className="text-[10px] text-green-600">✓ Reported</span>;

  return (
    <>
      <button onClick={() => setOpen(!open)} className="text-[10px] text-gray-400 hover:text-red-400 transition" title="Report this review">⚑ Report</button>
      {open && (
        <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200 animate-fade-up">
          <p className="text-xs font-medium text-gray-700 mb-2">Why are you reporting this?</p>
          <div className="space-y-1.5 mb-3">
            {REASONS.map((r) => (
              <button key={r.value} onClick={() => setReason(r.value)}
                className={`block w-full text-left px-3 py-1.5 rounded-lg text-xs transition ${reason === r.value ? "bg-red-50 text-red-700 border border-red-200" : "bg-white text-gray-600 border border-gray-100 hover:border-gray-300"}`}>
                {r.label}
              </button>
            ))}
          </div>
          {reason === "other" && (
            <textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Please describe the issue…"
              className="w-full p-2 border border-gray-200 rounded-lg text-xs mb-2 outline-none focus:border-brand-500 resize-none" rows={2} maxLength={500} />
          )}
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={!reason || submitting}
              className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg font-medium disabled:opacity-50 hover:bg-red-600 transition">
              {submitting ? "Sending…" : "Submit Report"}
            </button>
            <button onClick={() => { setOpen(false); setReason(""); setDetail(""); }}
              className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs rounded-lg font-medium hover:bg-gray-200 transition">Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
COMPONENT_EOF

cat > src/components/ReviewSortFilter.tsx << 'COMPONENT_EOF'
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function ReviewSortFilter({ courses, currentSort, currentCourse }: {
  courses: { id: string; code: string }[]; currentSort: string; currentCourse: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const sorts = [
    { key: "newest", label: "Newest" }, { key: "oldest", label: "Oldest" },
    { key: "highest", label: "Highest Rated" }, { key: "lowest", label: "Lowest Rated" },
  ];

  return (
    <div className="flex flex-col gap-3 mb-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {sorts.map((s) => (
          <button key={s.key} onClick={() => update("sort", s.key === "newest" ? null : s.key)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition ${currentSort === s.key ? "bg-brand-500 text-white" : "bg-brand-50 text-gray-500 border border-brand-100"}`}>
            {s.label}
          </button>
        ))}
      </div>
      {courses.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => update("course", null)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition ${!currentCourse ? "bg-brand-500 text-white" : "bg-brand-50 text-gray-500 border border-brand-100"}`}>All Courses</button>
          {courses.map((c) => (
            <button key={c.id} onClick={() => update("course", c.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition ${currentCourse === c.id ? "bg-brand-500 text-white" : "bg-brand-50 text-gray-500 border border-brand-100"}`}>{c.code}</button>
          ))}
        </div>
      )}
    </div>
  );
}
COMPONENT_EOF

# ============================================================
# DONE
# ============================================================
echo ""
echo "✅ Upgrade complete! Files written:"
echo ""
echo "  Config:"
echo "    next.config.js"
echo "    src/middleware.ts"
echo ""
echo "  Database:"
echo "    supabase/migrations/002_upgrade_v2.sql"
echo ""
echo "  API Routes (new + replaced):"
echo "    src/app/api/search/route.ts"
echo "    src/app/api/professor/route.ts"
echo "    src/app/api/review/route.ts"
echo "    src/app/api/my-reviews/route.ts        ← NEW"
echo "    src/app/api/report/route.ts             ← NEW"
echo "    src/app/api/admin/stats/route.ts"
echo "    src/app/api/admin/review-action/route.ts"
echo ""
echo "  Pages (new + replaced):"
echo "    src/app/page.tsx"
echo "    src/app/search/page.tsx"
echo "    src/app/c/[courseSlug]/page.tsx          ← NEW"
echo "    src/app/my-reviews/page.tsx              ← NEW"
echo ""
echo "  Components:"
echo "    src/components/ReportButton.tsx          ← NEW"
echo "    src/components/ReviewSortFilter.tsx      ← NEW"
echo ""
echo "  Lib:"
echo "    src/lib/moderation.ts"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "NEXT STEPS:"
echo ""
echo "  1. Run the migration in Supabase SQL Editor:"
echo "     Copy supabase/migrations/002_upgrade_v2.sql"
echo "     → Supabase Dashboard → SQL Editor → Run"
echo ""
echo "  2. Refresh the materialized view:"
echo "     SELECT refresh_trending();"
echo ""
echo "  3. (Optional) Set up auto-refresh cron:"
echo "     Enable pg_cron extension, then run:"
echo "     SELECT cron.schedule('refresh-trending',"
echo "       '*/10 * * * *', 'SELECT refresh_trending()');"
echo ""
echo "  4. Test locally:  npm run dev"
echo "  5. Deploy:        npx vercel --prod"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
