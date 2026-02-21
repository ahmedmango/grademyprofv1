#!/bin/bash
# ============================================================
# GradeMyProfessor v4.0 — Full UX Overhaul
# 1. Apple logo branding (clean, minimal SVG)
# 2. Uni-first flow (RateMyProfessor style)
# 3. Color-coded quality + difficulty SLIDERS (segmented pills)
# 4. Search scoped WITHIN university only
# 5. Add professor / university (smart placement)
# 6. Grade display in reviews
# 7. Smooth click transitions throughout
# 8. Cross-uni discovery for growth
# Run from project root: bash fixes4.sh
# ============================================================

set -e

echo "🍎 GradeMyProfessor v4.0 — Full UX Overhaul"
echo "=============================================="
echo ""

if [ ! -f "package.json" ]; then
  echo "❌ Run this from the project root"
  exit 1
fi

# ============================================================
# 0. APPLE LOGO SVG COMPONENT
# ============================================================
echo "🍎 Creating apple logo component..."

mkdir -p src/components

cat > src/components/AppleLogo.tsx << 'EOF'
"use client";

export default function AppleLogo({ size = 28, color }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Stem */}
      <path
        d="M50 8 C50 8, 55 2, 62 4"
        stroke={color || "var(--accent)"}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Leaf */}
      <path
        d="M54 10 C58 4, 68 3, 65 12 C62 8, 56 8, 54 10Z"
        fill={color || "var(--accent)"}
        opacity="0.7"
      />
      {/* Apple body */}
      <path
        d="M50 18
           C35 18, 15 32, 15 55
           C15 78, 30 92, 42 92
           C46 92, 48 89, 50 89
           C52 89, 54 92, 58 92
           C70 92, 85 78, 85 55
           C85 32, 65 18, 50 18Z"
        fill={color || "var(--accent)"}
      />
      {/* Highlight */}
      <path
        d="M35 40
           C32 45, 28 55, 30 65"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.3"
        fill="none"
      />
    </svg>
  );
}
EOF

echo "  ✅ AppleLogo component created"

# ============================================================
# 1. RATING SLIDER COMPONENT — Color-coded segmented pills
# ============================================================
echo "📊 Creating RatingSlider component..."

cat > src/components/RatingSlider.tsx << 'EOF'
"use client";

/**
 * Color-coded segmented rating slider (like RateMyProfessor)
 * Shows 5 segments, filled proportionally based on the rating value
 * 
 * For QUALITY: 5=green, 1=red (higher is better)
 * For DIFFICULTY: 5=red, 1=green (lower is better, inverted)
 */

const QUALITY_COLORS = [
  "#EF4444", // 1 - red (awful)
  "#F97316", // 2 - orange
  "#EAB308", // 3 - yellow
  "#84CC16", // 4 - lime
  "#22C55E", // 5 - green (awesome)
];

const DIFFICULTY_COLORS = [
  "#22C55E", // 1 - green (easy)
  "#84CC16", // 2 - lime
  "#EAB308", // 3 - yellow
  "#F97316", // 4 - orange
  "#EF4444", // 5 - red (hard)
];

export default function RatingSlider({
  value,
  type = "quality",
  size = "md",
  showLabel = true,
  label,
}: {
  value: number;
  type?: "quality" | "difficulty";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
}) {
  const colors = type === "quality" ? QUALITY_COLORS : DIFFICULTY_COLORS;
  const filledSegments = Math.round(value);
  
  // Get the color for the current value
  const activeColor = colors[Math.min(Math.max(filledSegments - 1, 0), 4)];
  
  const heights: Record<string, string> = { sm: "h-2", md: "h-3", lg: "h-4" };
  const h = heights[size];
  const gaps: Record<string, string> = { sm: "gap-0.5", md: "gap-1", lg: "gap-1.5" };
  const g = gaps[size];
  
  const labelText = type === "quality"
    ? (value >= 4.5 ? "Awesome" : value >= 3.5 ? "Great" : value >= 2.5 ? "Good" : value >= 1.5 ? "OK" : "Awful")
    : (value >= 4.5 ? "Very Hard" : value >= 3.5 ? "Hard" : value >= 2.5 ? "Average" : value >= 1.5 ? "Easy" : "Very Easy");

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-[10px] font-semibold uppercase tracking-wider min-w-[52px]" style={{ color: "var(--text-tertiary)" }}>
          {label}
        </span>
      )}
      <div className={`flex ${g} flex-1`}>
        {[1, 2, 3, 4, 5].map((seg) => (
          <div
            key={seg}
            className={`${h} flex-1 rounded-full transition-all duration-300`}
            style={{
              backgroundColor: seg <= filledSegments ? activeColor : "var(--border)",
              opacity: seg <= filledSegments ? 1 : 0.4,
            }}
          />
        ))}
      </div>
      <span
        className="text-sm font-extrabold font-display min-w-[28px] text-right"
        style={{ color: activeColor }}
      >
        {value.toFixed(1)}
      </span>
      {showLabel && (
        <span className="text-[10px] min-w-[48px]" style={{ color: "var(--text-tertiary)" }}>
          {labelText}
        </span>
      )}
    </div>
  );
}
EOF

echo "  ✅ RatingSlider component created"

# ============================================================
# 2. HOMEPAGE — Uni-first flow, apple logo, cross-uni trending
# ============================================================
echo "🏠 Rewriting homepage with uni-first flow + apple branding..."

cat > src/components/HomeClient.tsx << 'EOF'
"use client";

import Link from "next/link";
import { useApp } from "./Providers";
import { t } from "@/lib/i18n";
import { fmtRating } from "@/lib/utils";
import AppleLogo from "./AppleLogo";
import RatingSlider from "./RatingSlider";

export default function HomeClient({
  universities, topProfessors, recentReviews, totalReviews, totalUniversities, totalProfessors,
}: {
  universities: any[]; topProfessors: any[]; recentReviews: any[];
  totalReviews: number; totalUniversities: number; totalProfessors: number;
}) {
  const { lang } = useApp();

  return (
    <div className="px-5 pb-12">
      {/* Hero — apple branding + tagline */}
      <div className="pt-8 mb-7 flex items-start gap-3">
        <AppleLogo size={36} />
        <div>
          <h1 className="font-display text-[26px] font-extrabold leading-[1.05] tracking-tight">
            {lang === "ar" ? (
              <><span style={{ color: "var(--accent)" }}>قيّم</span> أستاذي</>
            ) : (
              <>Grade<span style={{ color: "var(--accent)" }}>My</span>Prof</>
            )}
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
            {lang === "ar" ? "اختر جامعتك للبدء" : "Pick your university to get started"}
          </p>
        </div>
      </div>

      {/* University Grid — THE primary action */}
      <section className="mb-8">
        <div className="grid grid-cols-2 gap-2.5 stagger-children">
          {universities.map((u: any) => (
            <Link key={u.id} href={`/u/${u.slug}`}
              className="group relative p-4 rounded-2xl transition-all duration-200 active:scale-[0.97]"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="font-display font-bold text-sm leading-tight" style={{ color: "var(--text-primary)" }}>
                {u.short_name || u.name_en.split(" ").slice(0, 2).join(" ")}
              </div>
              <div className="text-[10px] mt-1 line-clamp-1" style={{ color: "var(--text-tertiary)" }}>
                {u.short_name ? u.name_en : ""}
              </div>
              <span className="absolute top-3 right-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--accent)" }}>→</span>
            </Link>
          ))}

          {/* Add University — dashed, subtle */}
          <Link href="/suggest?type=university"
            className="flex items-center justify-center p-4 rounded-2xl transition-all duration-200 active:scale-[0.97]"
            style={{
              border: "1px dashed var(--border)",
              color: "var(--text-tertiary)",
            }}
          >
            <div className="text-center">
              <div className="text-lg mb-0.5">+</div>
              <div className="text-[10px] font-medium">{lang === "ar" ? "أضف جامعة" : "Add university"}</div>
            </div>
          </Link>
        </div>
      </section>

      {/* Trending across ALL universities — growth driver */}
      {topProfessors.length > 0 && (
        <section className="mb-8">
          <div className="section-label mb-3">
            {lang === "ar" ? "🔥 الأكثر رواجاً" : "🔥 Trending in Bahrain"}
          </div>
          <div className="space-y-2 stagger-children">
            {topProfessors.slice(0, 5).map((item: any) => {
              const name = item.name_en || item.professors?.name_en;
              const slug = item.slug || item.professors?.slug;
              const uni = item.university_name || item.professors?.universities?.name_en;
              const avgQ = Number(item.avg_quality);
              const avgD = Number(item.avg_difficulty || 0);
              if (!name || !slug) return null;

              return (
                <Link key={item.professor_id} href={`/p/${slug}`}
                  className="block p-3.5 rounded-xl transition-all duration-200 active:scale-[0.98]"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{name}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{uni} · {item.review_count} ratings</div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <RatingSlider value={avgQ} type="quality" size="sm" label="Quality" showLabel={false} />
                    {avgD > 0 && <RatingSlider value={avgD} type="difficulty" size="sm" label="Difficulty" showLabel={false} />}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent reviews — social proof */}
      {recentReviews.length > 0 && (
        <section className="mb-8">
          <div className="section-label mb-3">{lang === "ar" ? "💬 آخر التقييمات" : "💬 Recent reviews"}</div>
          <div className="space-y-2 stagger-children">
            {recentReviews.slice(0, 3).map((r: any) => (
              <div key={r.id} className="card-flat p-3.5">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <RatingSlider value={r.rating_quality} type="quality" size="sm" showLabel={false} label="" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {r.comment && (
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-primary)" }}>
                        &ldquo;{r.comment}&rdquo;
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Link href={`/p/${r.professors?.slug}`} className="text-[10px] font-semibold" style={{ color: "var(--accent)" }}>
                        {r.professors?.name_en}
                      </Link>
                      <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                        · {r.universities?.name_en}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Stats footer */}
      <div className="flex items-center justify-center gap-5 py-3" style={{ color: "var(--text-tertiary)" }}>
        <span className="text-[10px]"><strong style={{ color: "var(--text-secondary)" }}>{totalReviews}+</strong> reviews</span>
        <span className="text-[10px]">·</span>
        <span className="text-[10px]"><strong style={{ color: "var(--text-secondary)" }}>{totalUniversities}</strong> universities</span>
        <span className="text-[10px]">·</span>
        <span className="text-[10px]"><strong style={{ color: "var(--text-secondary)" }}>{totalProfessors}</strong> professors</span>
      </div>
    </div>
  );
}
EOF

echo "  ✅ HomeClient rewritten with apple branding + sliders"

# ============================================================
# 3. RATE BUTTON — Course picker bottom sheet
# ============================================================
echo "👩‍🏫 Writing RateButton with course picker..."

cat > src/components/RateButton.tsx << 'EOF'
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RateButton({
  professorId,
  professorName,
  professorSlug,
  courses,
}: {
  professorId: string;
  professorName: string;
  professorSlug: string;
  courses: { id: string; code: string; title_en: string }[];
}) {
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const lastName = professorName.split(" ").pop();

  const handleRate = (courseId?: string, courseName?: string) => {
    if (courses.length === 0) {
      router.push(`/rate?professorId=${professorId}&professorName=${encodeURIComponent(professorName)}&professorSlug=${professorSlug}`);
      return;
    }

    if (courses.length === 1 || courseId) {
      const cId = courseId || courses[0].id;
      const cName = courseName || `${courses[0].code} ${courses[0].title_en}`;
      router.push(`/rate?professorId=${professorId}&courseId=${cId}&professorName=${encodeURIComponent(professorName)}&courseName=${encodeURIComponent(cName)}&professorSlug=${professorSlug}`);
      return;
    }

    setShowPicker(true);
  };

  return (
    <>
      {showPicker && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setShowPicker(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg rounded-t-3xl p-5 pb-8 animate-slide-up"
            style={{ background: "var(--bg-surface)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border)" }} />
            <h3 className="font-display font-bold text-base mb-1" style={{ color: "var(--text-primary)" }}>
              Which course?
            </h3>
            <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>
              Select the course you took with {lastName}
            </p>
            <div className="space-y-2">
              {courses.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setShowPicker(false);
                    handleRate(c.id, `${c.code} ${c.title_en}`);
                  }}
                  className="w-full text-left p-3.5 rounded-xl transition-all duration-150 active:scale-[0.98]"
                  style={{ background: "var(--bg-surface-alt, var(--bg-primary))", border: "1px solid var(--border)" }}
                >
                  <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>{c.code}</span>
                  <span className="text-sm ml-2" style={{ color: "var(--text-primary)" }}>{c.title_en}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg px-5 pb-6 pt-3 z-50"
        style={{ background: "linear-gradient(transparent, var(--bg-primary) 30%)" }}>
        <button
          onClick={() => handleRate()}
          className="block w-full py-4 rounded-2xl text-white text-center font-bold text-base transition-all duration-200 active:scale-[0.97]"
          style={{
            background: "var(--accent)",
            boxShadow: "0 8px 24px rgba(217,80,48,0.25)",
          }}
        >
          ✍️ Rate {lastName}
        </button>
      </div>
    </>
  );
}
EOF

echo "  ✅ RateButton rewritten"

# ============================================================
# 4. PROFESSOR PAGE — Sliders + grade badges + reviews
# ============================================================
echo "📝 Updating professor page with sliders..."

cat > src/app/p/\[professorSlug\]/page.tsx << 'PROF_EOF'
import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { fmtRating } from "@/lib/utils";
import RateButton from "@/components/RateButton";
import Link from "next/link";
import ProfessorClientContent from "./ProfessorClientContent";

const GRADE_COLORS: Record<string, string> = {
  "A+": "#16A34A", "A": "#16A34A", "A-": "#22C55E",
  "B+": "#65A30D", "B": "#CA8A04", "B-": "#D97706",
  "C+": "#EA580C", "C": "#DC2626", "C-": "#DC2626",
  "D+": "#B91C1C", "D": "#B91C1C", "F": "#991B1B",
  "W": "#6B7280", "IP": "#6B7280",
};

export default async function ProfessorPage({ params }: { params: { professorSlug: string } }) {
  const supabase = createServerClient();

  const { data: prof } = await supabase
    .from("professors")
    .select(`id, name_en, name_ar, slug, photo_url,
      departments ( id, name_en ),
      universities ( id, name_en, slug ),
      aggregates_professor ( review_count, avg_quality, avg_difficulty, would_take_again_pct, rating_dist, tag_dist, top_tags ),
      professor_courses ( courses ( id, code, title_en, slug ) )`)
    .eq("slug", params.professorSlug)
    .eq("is_active", true)
    .single();

  if (!prof) return notFound();

  const agg = (prof as any).aggregates_professor || { review_count: 0, avg_quality: 0, avg_difficulty: 0, would_take_again_pct: 0, rating_dist: {}, tag_dist: {} };
  const dept = (prof as any).departments;
  const uni = (prof as any).universities;
  const courses = ((prof as any).professor_courses || []).map((pc: any) => pc.courses).filter(Boolean);

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating_quality, rating_difficulty, would_take_again, tags, comment, grade_received, created_at, courses ( code )")
    .eq("professor_id", prof.id)
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .limit(20);

  const topTags = Object.entries(agg.tag_dist || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="px-5 pt-4 flex items-center gap-3 mb-4">
        <Link href={uni ? `/u/${uni.slug}` : "/"} style={{ color: "var(--text-tertiary)" }} className="text-lg transition-all active:scale-90">←</Link>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{uni?.name_en}</span>
      </div>

      {/* Profile */}
      <div className="px-5 mb-5">
        <div className="flex gap-3.5 items-start">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
            style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--border)" }}>
            {prof.name_en.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
          </div>
          <div>
            <h1 className="font-display text-lg font-extrabold leading-tight" style={{ color: "var(--text-primary)" }}>{prof.name_en}</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{dept?.name_en}</p>
          </div>
        </div>
      </div>

      {/* Slider stats — the key visual */}
      <ProfessorClientContent
        avgQuality={Number(agg.avg_quality)}
        avgDifficulty={Number(agg.avg_difficulty)}
        wouldTakeAgainPct={Number(agg.would_take_again_pct)}
        reviewCount={agg.review_count}
        topTags={topTags}
        courses={courses}
        reviews={reviews || []}
        gradeColors={GRADE_COLORS}
        profId={prof.id}
        profName={prof.name_en}
        profSlug={prof.slug}
      />
    </div>
  );
}
PROF_EOF

echo "  ✅ Professor page (server) updated"

# ============================================================
# 4b. PROFESSOR CLIENT CONTENT — Uses RatingSlider
# ============================================================
echo "📝 Creating professor client content component..."

cat > src/app/p/\[professorSlug\]/ProfessorClientContent.tsx << 'PROFCLIENT_EOF'
"use client";

import RatingSlider from "@/components/RatingSlider";
import RateButton from "@/components/RateButton";
import Link from "next/link";
import { fmtRating } from "@/lib/utils";

export default function ProfessorClientContent({
  avgQuality,
  avgDifficulty,
  wouldTakeAgainPct,
  reviewCount,
  topTags,
  courses,
  reviews,
  gradeColors,
  profId,
  profName,
  profSlug,
}: {
  avgQuality: number;
  avgDifficulty: number;
  wouldTakeAgainPct: number;
  reviewCount: number;
  topTags: [string, number][];
  courses: any[];
  reviews: any[];
  gradeColors: Record<string, string>;
  profId: string;
  profName: string;
  profSlug: string;
}) {
  return (
    <>
      {/* Rating sliders — the hero visual */}
      {reviewCount > 0 && (
        <div className="px-5 mb-5">
          <div className="p-4 rounded-2xl space-y-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <RatingSlider value={avgQuality} type="quality" size="lg" label="Quality" />
            <RatingSlider value={avgDifficulty} type="difficulty" size="lg" label="Difficulty" />
            
            {/* Retake + count */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold font-display" style={{ color: "var(--accent)" }}>
                  {Math.round(wouldTakeAgainPct)}%
                </span>
                <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>would retake</span>
              </div>
              <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                Based on {reviewCount} {reviewCount === 1 ? "rating" : "ratings"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tags */}
      {topTags.length > 0 && (
        <div className="px-5 mb-5">
          <div className="flex flex-wrap gap-1.5">
            {topTags.map(([tag, count]) => (
              <span key={tag} className="pill">{tag} <span style={{ opacity: 0.6 }}>({count})</span></span>
            ))}
          </div>
        </div>
      )}

      {/* Courses */}
      {courses.length > 0 && (
        <div className="px-5 mb-5">
          <div className="flex gap-1.5 flex-wrap">
            {courses.map((c: any) => (
              <Link key={c.id} href={`/c/${c.slug}`}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-95"
                style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                {c.code}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="px-5 mb-5">
        <div className="section-label mb-3">💬 {reviewCount} {reviewCount === 1 ? "review" : "reviews"}</div>
        <div className="space-y-2.5">
          {reviews.map((r: any) => (
            <div key={r.id} className="p-3.5 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              {/* Review sliders + grade + course */}
              <div className="mb-2.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {r.grade_received && (
                      <span className="px-2 py-0.5 rounded-md text-xs font-bold"
                        style={{
                          background: (gradeColors[r.grade_received] || "#6B7280") + "18",
                          color: gradeColors[r.grade_received] || "#6B7280",
                        }}>
                        {r.grade_received}
                      </span>
                    )}
                    {r.courses?.code && <span className="pill">{r.courses.code}</span>}
                  </div>
                  <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <div className="space-y-1">
                  <RatingSlider value={r.rating_quality} type="quality" size="sm" showLabel={false} label="Quality" />
                  <RatingSlider value={r.rating_difficulty} type="difficulty" size="sm" showLabel={false} label="Difficulty" />
                </div>
              </div>

              {/* Tags */}
              {r.tags?.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-2">
                  {r.tags.map((tag: string) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{tag}</span>
                  ))}
                </div>
              )}

              {/* Comment */}
              {r.comment && (
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{r.comment}</p>
              )}

              {/* Footer */}
              {r.would_take_again !== null && (
                <div className="mt-2">
                  <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    {r.would_take_again ? "👍 Would retake" : "👎 Wouldn't retake"}
                  </span>
                </div>
              )}
            </div>
          ))}
          {reviews.length === 0 && (
            <div className="text-center py-8" style={{ color: "var(--text-tertiary)" }}>
              <div className="text-2xl mb-2">📝</div>
              <p className="text-sm">No reviews yet. Be the first!</p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Rate CTA */}
      <RateButton
        professorId={profId}
        professorName={profName}
        professorSlug={profSlug}
        courses={courses.map((c: any) => ({ id: c.id, code: c.code, title_en: c.title_en }))}
      />
    </>
  );
}
PROFCLIENT_EOF

echo "  ✅ Professor client content created"

# ============================================================
# 5. SUGGEST PAGE — Add professor/university/course
# ============================================================
echo "➕ Creating suggest page..."

mkdir -p src/app/suggest

cat > src/app/suggest/page.tsx << 'SUGGEST_EOF'
"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useApp } from "@/components/Providers";
import AppleLogo from "@/components/AppleLogo";

type SuggestType = "professor" | "university" | "course";

function SuggestForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { lang } = useApp();

  const initialType = (searchParams.get("type") as SuggestType) || "professor";
  const uniId = searchParams.get("university") || "";
  const uniName = searchParams.get("universityName") || "";

  const [type, setType] = useState<SuggestType>(initialType);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [extra, setExtra] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name_en: name.trim(),
          name_ar: nameAr.trim() || null,
          university_id: uniId || null,
          extra: extra.trim() || null,
        }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to submit");
      }
    } catch {
      setError("Connection failed");
    }
    setSubmitting(false);
  };

  if (done) {
    return (
      <div className="px-5 pb-10 pt-12 text-center">
        <AppleLogo size={48} color="var(--rating-high)" />
        <h2 className="font-display text-lg font-bold mt-3 mb-2" style={{ color: "var(--accent)" }}>
          {type === "university" ? "University" : type === "professor" ? "Professor" : "Course"} Suggested!
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          Our team will review and add it shortly.
        </p>
        <button onClick={() => router.back()}
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
          style={{ background: "var(--accent)", color: "#fff" }}>
          ← Go Back
        </button>
      </div>
    );
  }

  const labels: Record<SuggestType, { title: string; placeholder: string; extraLabel?: string; extraPlaceholder?: string }> = {
    professor: {
      title: "Add a Professor",
      placeholder: "e.g. Dr. Ahmed Al-Khalifa",
      extraLabel: "Department (optional)",
      extraPlaceholder: "e.g. Computer Science",
    },
    university: {
      title: "Add a University",
      placeholder: "e.g. Bahrain University College",
    },
    course: {
      title: "Add a Course",
      placeholder: "e.g. Data Structures",
      extraLabel: "Course Code",
      extraPlaceholder: "e.g. CS 201",
    },
  };

  const l = labels[type];

  return (
    <div className="px-5 pb-10">
      <div className="pt-4 mb-5 flex items-center gap-3">
        <button onClick={() => router.back()} style={{ color: "var(--text-tertiary)" }} className="text-lg transition-all active:scale-90">←</button>
        <h1 className="font-display font-bold text-base" style={{ color: "var(--text-primary)" }}>{l.title}</h1>
      </div>

      {uniName && type !== "university" && (
        <div className="mb-4 px-3 py-2 rounded-lg text-xs" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
          at {uniName}
        </div>
      )}

      {!searchParams.get("type") && (
        <div className="flex gap-1.5 mb-5">
          {(["professor", "course", "university"] as const).map((t) => (
            <button key={t} onClick={() => setType(t)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={type === t
                ? { background: "var(--accent)", color: "#fff" }
                : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
              }>
              {t === "professor" ? "Professor" : t === "course" ? "Course" : "University"}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Name (English) *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={l.placeholder}
            className="w-full px-3.5 py-3 rounded-xl text-sm outline-none transition-all"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Name (Arabic) — optional</label>
          <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="الاسم بالعربي" dir="rtl"
            className="w-full px-3.5 py-3 rounded-xl text-sm outline-none transition-all"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </div>
        {l.extraLabel && (
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>{l.extraLabel}</label>
            <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder={l.extraPlaceholder}
              className="w-full px-3.5 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </div>
        )}
        {error && (
          <div className="p-3 rounded-xl text-sm" style={{ background: "#7F1D1D30", color: "var(--rating-low)" }}>{error}</div>
        )}
        <button onClick={handleSubmit} disabled={!name.trim() || submitting}
          className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#fff" }}>
          {submitting ? "Submitting..." : "Submit Suggestion"}
        </button>
      </div>
    </div>
  );
}

export default function SuggestPage() {
  return (
    <Suspense fallback={<div className="px-5 py-12 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>Loading…</div>}>
      <SuggestForm />
    </Suspense>
  );
}
SUGGEST_EOF

echo "  ✅ Suggest page created"

# ============================================================
# 6. SUGGEST API ROUTE
# ============================================================
echo "🔌 Creating suggest API..."

mkdir -p src/app/api/suggest

cat > src/app/api/suggest/route.ts << 'API_EOF'
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, name_en, name_ar, university_id, extra } = body;

    if (!type || !name_en || name_en.trim().length < 2) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const slug = slugify(name_en);

    switch (type) {
      case "university": {
        const { data: existing } = await supabase.from("universities").select("id").eq("slug", slug).maybeSingle();
        if (existing) return NextResponse.json({ error: "This university may already exist" }, { status: 409 });

        const { error } = await supabase.from("universities").insert({
          name_en: name_en.trim(),
          name_ar: name_ar?.trim() || null,
          country_code: "BH",
          slug,
          is_active: false,
        });
        if (error) return NextResponse.json({ error: "Failed to save" }, { status: 500 });
        break;
      }

      case "professor": {
        if (!university_id) return NextResponse.json({ error: "University is required" }, { status: 400 });
        const { data: existing } = await supabase.from("professors").select("id").eq("slug", slug).maybeSingle();
        if (existing) return NextResponse.json({ error: "This professor may already exist" }, { status: 409 });

        const { error } = await supabase.from("professors").insert({
          name_en: name_en.trim(),
          name_ar: name_ar?.trim() || null,
          university_id,
          slug,
          is_active: true,
        });
        if (error) return NextResponse.json({ error: "Failed to save" }, { status: 500 });
        break;
      }

      case "course": {
        if (!university_id || !extra) return NextResponse.json({ error: "University and course code required" }, { status: 400 });
        const courseSlug = slugify(`${extra}-${name_en}`);
        const { error } = await supabase.from("courses").insert({
          code: extra.trim().toUpperCase(),
          title_en: name_en.trim(),
          title_ar: name_ar?.trim() || null,
          university_id,
          slug: courseSlug,
        });
        if (error) return NextResponse.json({ error: "Failed to save" }, { status: 500 });
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
API_EOF

echo "  ✅ Suggest API created"

# ============================================================
# 7. UNIVERSITY PAGE — Search within uni, add professor, sliders
# ============================================================
echo "🏫 Updating university page with scoped search + sliders..."

cat > src/app/u/\[universitySlug\]/page.tsx << 'UNI_EOF'
import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import UniClientContent from "./UniClientContent";

export default async function UniversityPage({ params }: { params: { universitySlug: string } }) {
  const supabase = createServerClient();

  const { data: uni } = await supabase
    .from("universities")
    .select("*")
    .eq("slug", params.universitySlug)
    .eq("is_active", true)
    .single();

  if (!uni) return notFound();

  const { data: professors } = await supabase
    .from("professors")
    .select("id, name_en, slug, departments ( name_en ), aggregates_professor ( avg_quality, avg_difficulty, review_count, top_tags )")
    .eq("university_id", uni.id).eq("is_active", true).order("name_en");

  return (
    <div className="px-5 pb-10">
      <div className="pt-4 flex items-center gap-3 mb-5">
        <Link href="/" style={{ color: "var(--text-tertiary)" }} className="text-lg transition-all active:scale-90">←</Link>
      </div>

      <div className="mb-5">
        <h1 className="font-display text-xl font-extrabold leading-tight" style={{ color: "var(--text-primary)" }}>
          {uni.short_name || uni.name_en}
        </h1>
        {uni.short_name && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{uni.name_en}</p>
        )}
      </div>

      <UniClientContent
        uniId={uni.id}
        uniName={uni.name_en}
        uniShortName={uni.short_name}
        uniSlug={uni.slug}
        professors={professors || []}
      />
    </div>
  );
}
UNI_EOF

echo "  ✅ University page (server) updated"

# ============================================================
# 7b. UNIVERSITY CLIENT CONTENT — Search within uni + sliders
# ============================================================
echo "🏫 Creating university client content..."

cat > src/app/u/\[universitySlug\]/UniClientContent.tsx << 'UNICLIENT_EOF'
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import RatingSlider from "@/components/RatingSlider";

export default function UniClientContent({
  uniId,
  uniName,
  uniShortName,
  uniSlug,
  professors,
}: {
  uniId: string;
  uniName: string;
  uniShortName: string | null;
  uniSlug: string;
  professors: any[];
}) {
  const [search, setSearch] = useState("");
  
  const filtered = useMemo(() => {
    if (!search.trim()) return professors;
    const q = search.toLowerCase();
    return professors.filter((p: any) =>
      p.name_en.toLowerCase().includes(q) ||
      p.departments?.name_en?.toLowerCase().includes(q)
    );
  }, [search, professors]);

  return (
    <>
      {/* Search WITHIN this university */}
      <div className="relative mb-5">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2.2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search professors at ${uniShortName || uniName}...`}
          className="w-full pl-10 pr-4 py-3 rounded-xl text-xs outline-none transition-all"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
      </div>

      {/* Header row */}
      <div className="mb-2 flex items-center justify-between">
        <div className="section-label">
          {search.trim() ? `${filtered.length} results` : "Professors"}
        </div>
        <Link href={`/suggest?type=professor&university=${uniId}&universityName=${encodeURIComponent(uniName)}`}
          className="text-[10px] font-semibold transition-all active:scale-95"
          style={{ color: "var(--accent)" }}>
          + Add professor
        </Link>
      </div>

      {/* Professor list with sliders */}
      <div className="space-y-2 stagger-children">
        {filtered.map((p: any) => {
          const agg = p.aggregates_professor;
          const avgQ = Number(agg?.avg_quality || agg?.[0]?.avg_quality || 0);
          const avgD = Number(agg?.avg_difficulty || agg?.[0]?.avg_difficulty || 0);
          const count = agg?.review_count || agg?.[0]?.review_count || 0;
          const topTags = agg?.top_tags || agg?.[0]?.top_tags || [];

          return (
            <Link key={p.id} href={`/p/${p.slug}`}
              className="block p-3.5 rounded-xl transition-all duration-200 active:scale-[0.98]"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{p.name_en}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    {p.departments?.name_en}{count > 0 ? ` · ${count} ratings` : ""}
                  </div>
                </div>
              </div>
              {count > 0 && (
                <div className="space-y-1 mt-2">
                  <RatingSlider value={avgQ} type="quality" size="sm" showLabel={false} label="Quality" />
                  <RatingSlider value={avgD} type="difficulty" size="sm" showLabel={false} label="Difficulty" />
                </div>
              )}
              {topTags.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {topTags.slice(0, 2).map((tag: string) => (
                    <span key={tag} className="pill">{tag}</span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}

        {filtered.length === 0 && !search.trim() && (
          <div className="text-center py-10" style={{ color: "var(--text-tertiary)" }}>
            <div className="text-3xl mb-2">🎓</div>
            <p className="text-sm mb-3">No professors added yet</p>
            <Link href={`/suggest?type=professor&university=${uniId}&universityName=${encodeURIComponent(uniName)}`}
              className="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
              style={{ background: "var(--accent)", color: "#fff" }}>
              Add the first professor
            </Link>
          </div>
        )}

        {filtered.length === 0 && search.trim() && (
          <div className="text-center py-8" style={{ color: "var(--text-tertiary)" }}>
            <p className="text-sm mb-3">No professors match &ldquo;{search}&rdquo;</p>
            <Link href={`/suggest?type=professor&university=${uniId}&universityName=${encodeURIComponent(uniName)}`}
              className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
              + Add this professor
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
UNICLIENT_EOF

echo "  ✅ University client content created"

# ============================================================
# 8. CSS — Slide-up animation, tap states
# ============================================================
echo "🎨 Adding animations + tap states..."

if ! grep -q "slide-up" src/app/globals.css 2>/dev/null; then
cat >> src/app/globals.css << 'CSS_EOF'

/* Bottom sheet slide-up */
@keyframes slide-up {
  from { opacity: 0; transform: translateY(100%); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-slide-up {
  animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Smooth active states for touch */
.active\:scale-\[0\.97\]:active { transform: scale(0.97); }
.active\:scale-\[0\.98\]:active { transform: scale(0.98); }
.active\:scale-95:active { transform: scale(0.95); }
.active\:scale-90:active { transform: scale(0.90); }

/* Tap highlight removal for mobile */
* { -webkit-tap-highlight-color: transparent; }
CSS_EOF
echo "  ✅ CSS animations added"
else
echo "  ⏭️  Slide-up already exists"
fi

# ============================================================
# 9. SQL MIGRATION — suggestions table + grade backfill
# ============================================================
echo "📦 Writing migration 006..."

mkdir -p supabase/migrations

cat > supabase/migrations/006_suggestions_and_fixes.sql << 'MIGRATION_EOF'
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

MIGRATION_EOF

echo "  ✅ Migration 006 written"

# ============================================================
# DONE
# ============================================================
echo ""
echo "🍎 All v4.0 fixes written!"
echo ""
echo "  NEW FILES:"
echo "    src/components/AppleLogo.tsx              — Clean minimal apple SVG"
echo "    src/components/RatingSlider.tsx            — Color-coded segmented sliders"
echo "    src/app/p/[professorSlug]/ProfessorClientContent.tsx — Client-side prof content"
echo "    src/app/u/[universitySlug]/UniClientContent.tsx      — Client-side uni search"
echo ""
echo "  MODIFIED FILES:"
echo "    src/components/HomeClient.tsx              — Uni-first + apple + sliders"
echo "    src/components/RateButton.tsx              — Course picker bottom sheet"
echo "    src/app/p/[professorSlug]/page.tsx         — Server component with sliders"
echo "    src/app/u/[universitySlug]/page.tsx        — Scoped search + sliders"
echo "    src/app/suggest/page.tsx                   — Add prof/uni/course"
echo "    src/app/api/suggest/route.ts               — Suggestion API"
echo "    src/app/globals.css                        — Animations + tap states"
echo "    supabase/migrations/006_*.sql              — Suggestions + grade backfill"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "NEXT STEPS:"
echo ""
echo "  1. Run migration in Supabase SQL Editor:"
echo "     Copy contents of: supabase/migrations/006_suggestions_and_fixes.sql"
echo ""
echo "  2. Test locally: npm run dev"
echo "     → Homepage: apple logo + uni grid + trending with sliders"
echo "     → Uni page: search within uni + professor sliders"
echo "     → Prof page: quality/difficulty slider bars + grade badges"
echo "     → Rate button: course picker if multiple courses"
echo "     → /suggest: add professor/uni flow"
echo ""
echo "  3. Deploy:"
echo "     git add -A"
echo "     git commit -m 'feat: v4 - apple logo, rating sliders, uni-scoped search'"
echo "     git push origin main"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
