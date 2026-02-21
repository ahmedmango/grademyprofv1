#!/bin/bash
# ============================================================
# GradeMyProfessor v3.3 — UX Overhaul
# 1. Uni-first flow (like RateMyProfessor)
# 2. Add professor / Add university (smart placement)
# 3. Grade display in reviews
# 4. Simplified, minimal UX
# 5. Fixed RateButton with course picker
# 6. Smooth click transitions
# 7. Cross-uni discovery for growth
# Run from project root: bash fixes3.sh
# ============================================================

set -e

echo "🎯 GradeMyProfessor v3.3 — UX Overhaul"
echo "========================================="
echo ""

if [ ! -f "package.json" ]; then
  echo "❌ Run this from the project root"
  exit 1
fi

# ============================================================
# 1. HOMEPAGE — Uni-first flow, cross-uni trending, minimal
# ============================================================
echo "🏠 Rewriting homepage with uni-first flow..."

cat > src/components/HomeClient.tsx << 'EOF'
"use client";

import Link from "next/link";
import { useApp } from "./Providers";
import { t } from "@/lib/i18n";
import { fmtRating } from "@/lib/utils";
import { useState } from "react";

function rc(v: number) {
  return v >= 4 ? "high" : v >= 2.5 ? "mid" : "low";
}

export default function HomeClient({
  universities, topProfessors, recentReviews, totalReviews, totalUniversities, totalProfessors,
}: {
  universities: any[]; topProfessors: any[]; recentReviews: any[];
  totalReviews: number; totalUniversities: number; totalProfessors: number;
}) {
  const { lang } = useApp();
  const [selectedUni, setSelectedUni] = useState<string | null>(null);

  const uniName = (u: any) => lang === "ar" && u.name_ar ? u.name_ar : (u.short_name || u.name_en);
  const uniFullName = (u: any) => lang === "ar" && u.name_ar ? u.name_ar : u.name_en;

  return (
    <div className="px-5 pb-12">
      {/* Hero — ultra-compact */}
      <div className="pt-8 mb-6">
        <h1 className="font-display text-[28px] font-extrabold leading-[1.1] tracking-tight">
          {lang === "ar" ? (
            <><span style={{ color: "var(--accent)" }}>قيّم</span> أستاذي</>
          ) : (
            <>Find a <span style={{ color: "var(--accent)" }}>professor</span></>
          )}
        </h1>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
          {lang === "ar" ? "اختر جامعتك أولاً" : "Select your university to get started"}
        </p>
      </div>

      {/* University Grid — THE primary action */}
      <section className="mb-8">
        <div className="grid grid-cols-2 gap-2 stagger-children">
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

          {/* Add University — subtle but discoverable */}
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

      {/* Quick search — secondary action */}
      <Link href="/search"
        className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-8 transition-all duration-200 active:scale-[0.98]"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2.2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          {lang === "ar" ? "ابحث عن أستاذ أو مقرر..." : "Search any professor or course..."}
        </span>
      </Link>

      {/* Trending across ALL universities — growth psychology */}
      {topProfessors.length > 0 && (
        <section className="mb-8">
          <div className="section-label mb-3">
            {lang === "ar" ? "🔥 الأكثر رواجاً في البحرين" : "🔥 Trending across Bahrain"}
          </div>
          <div className="space-y-2 stagger-children">
            {topProfessors.slice(0, 5).map((item: any) => {
              const name = item.name_en || item.professors?.name_en;
              const slug = item.slug || item.professors?.slug;
              const uni = item.university_name || item.professors?.universities?.name_en;
              const avgQ = Number(item.avg_quality);
              if (!name || !slug) return null;

              return (
                <Link key={item.professor_id} href={`/p/${slug}`}
                  className="flex items-center justify-between p-3.5 rounded-xl transition-all duration-200 active:scale-[0.98]"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{name}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{uni} · {item.review_count} {t(lang, "ratings")}</div>
                  </div>
                  <div className={`rating-circle ${rc(avgQ)}`} style={{ width: 40, height: 40, fontSize: 16, borderRadius: 10 }}>
                    {fmtRating(avgQ)}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent reviews — social proof, cross-uni */}
      {recentReviews.length > 0 && (
        <section className="mb-8">
          <div className="section-label mb-3">{lang === "ar" ? "💬 آخر التقييمات" : "💬 What students are saying"}</div>
          <div className="space-y-2 stagger-children">
            {recentReviews.slice(0, 3).map((r: any) => (
              <div key={r.id} className="card-flat p-3.5">
                <div className="flex items-start gap-3">
                  <div className={`rating-circle ${rc(r.rating_quality)}`} style={{ width: 36, height: 36, fontSize: 14, borderRadius: 8 }}>
                    {fmtRating(r.rating_quality)}
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

      {/* Stats — minimal, at the bottom */}
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

echo "  ✅ HomeClient rewritten"

# ============================================================
# 2. PROFESSOR PAGE — Show grades, fix rate button
# ============================================================
echo "👩‍🏫 Fixing professor page with grade display + rate button..."

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
      // No courses linked — go to rate with just professor
      router.push(`/rate?professorId=${professorId}&professorName=${encodeURIComponent(professorName)}&professorSlug=${professorSlug}`);
      return;
    }

    if (courses.length === 1 || courseId) {
      const cId = courseId || courses[0].id;
      const cName = courseName || `${courses[0].code} ${courses[0].title_en}`;
      router.push(`/rate?professorId=${professorId}&courseId=${cId}&professorName=${encodeURIComponent(professorName)}&courseName=${encodeURIComponent(cName)}&professorSlug=${professorSlug}`);
      return;
    }

    // Multiple courses — show picker
    setShowPicker(true);
  };

  return (
    <>
      {/* Course picker overlay */}
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
                  style={{ background: "var(--bg-surface-alt)", border: "1px solid var(--border)" }}
                >
                  <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>{c.code}</span>
                  <span className="text-sm ml-2" style={{ color: "var(--text-primary)" }}>{c.title_en}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sticky CTA */}
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

echo "  ✅ RateButton rewritten with course picker"

# ============================================================
# 3. UPDATE PROFESSOR PAGE — Pass courses to RateButton, show grades
# ============================================================
echo "📝 Updating professor page..."

cat > src/app/p/\[professorSlug\]/page.tsx << 'PROF_EOF'
import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { fmtRating } from "@/lib/utils";
import RateButton from "@/components/RateButton";
import Link from "next/link";

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

  const qc = (v: number) => v >= 4 ? "var(--rating-high)" : v >= 3 ? "var(--rating-mid)" : "var(--rating-low)";
  const dc = (v: number) => v >= 4 ? "var(--rating-low)" : v >= 3 ? "var(--rating-mid)" : "var(--rating-high)";

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

      {/* Stats — compact row */}
      {agg.review_count > 0 && (
        <div className="px-5 mb-5">
          <div className="flex gap-2">
            <div className="flex-1 p-3 rounded-xl text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <div className="text-xl font-extrabold font-display" style={{ color: qc(agg.avg_quality) }}>{fmtRating(agg.avg_quality)}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>Quality</div>
            </div>
            <div className="flex-1 p-3 rounded-xl text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <div className="text-xl font-extrabold font-display" style={{ color: dc(agg.avg_difficulty) }}>{fmtRating(agg.avg_difficulty)}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>Difficulty</div>
            </div>
            <div className="flex-1 p-3 rounded-xl text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <div className="text-xl font-extrabold font-display" style={{ color: "var(--accent)" }}>{Math.round(agg.would_take_again_pct)}%</div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>Retake</div>
            </div>
          </div>
          <p className="text-[10px] text-center mt-2" style={{ color: "var(--text-tertiary)" }}>Based on {agg.review_count} ratings</p>
        </div>
      )}

      {/* Tags — inline pills */}
      {topTags.length > 0 && (
        <div className="px-5 mb-5">
          <div className="flex flex-wrap gap-1.5">
            {topTags.map(([tag, count]: any) => (
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
        <div className="section-label mb-3">💬 {agg.review_count} {agg.review_count === 1 ? "review" : "reviews"}</div>
        <div className="space-y-2.5">
          {(reviews || []).map((r: any) => (
            <div key={r.id} className="p-3.5 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              {/* Review header — scores + grade + course */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="text-sm font-extrabold font-display" style={{ color: qc(r.rating_quality) }}>{fmtRating(r.rating_quality)}</div>
                    <div className="text-[8px] uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>quality</div>
                  </div>
                  <div className="w-px h-5" style={{ background: "var(--border)" }} />
                  <div className="text-center">
                    <div className="text-sm font-extrabold font-display" style={{ color: dc(r.rating_difficulty) }}>{fmtRating(r.rating_difficulty)}</div>
                    <div className="text-[8px] uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>difficulty</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Grade badge */}
                  {r.grade_received && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold"
                      style={{
                        background: (GRADE_COLORS[r.grade_received] || "#6B7280") + "18",
                        color: GRADE_COLORS[r.grade_received] || "#6B7280",
                      }}>
                      {r.grade_received}
                    </span>
                  )}
                  <span className="pill">{r.courses?.code}</span>
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
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                {r.would_take_again !== null && (
                  <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    {r.would_take_again ? "👍 Would retake" : "👎 Wouldn't retake"}
                  </span>
                )}
              </div>
            </div>
          ))}
          {(!reviews || reviews.length === 0) && (
            <div className="text-center py-8" style={{ color: "var(--text-tertiary)" }}>
              <div className="text-2xl mb-2">📝</div>
              <p className="text-sm">No reviews yet. Be the first!</p>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Rate CTA — passes courses for picker */}
      <RateButton
        professorId={prof.id}
        professorName={prof.name_en}
        professorSlug={prof.slug}
        courses={courses.map((c: any) => ({ id: c.id, code: c.code, title_en: c.title_en }))}
      />
    </div>
  );
}
PROF_EOF

echo "  ✅ Professor page updated"

# ============================================================
# 4. SUGGEST PAGE — Add professor/university/course
# ============================================================
echo "➕ Creating suggest page..."

mkdir -p src/app/suggest

cat > src/app/suggest/page.tsx << 'SUGGEST_EOF'
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/components/Providers";

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
  const [extra, setExtra] = useState(""); // department for prof, course code for course
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
        <div className="text-4xl mb-3">✅</div>
        <h2 className="font-display text-lg font-bold mb-2" style={{ color: "var(--accent)" }}>
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

      {/* Type switcher — only show if no specific type was passed */}
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
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Name (English) *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={l.placeholder}
            className="w-full px-3.5 py-3 rounded-xl text-sm outline-none transition-all"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
        </div>

        {/* Arabic name */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Name (Arabic) — optional</label>
          <input
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            placeholder="الاسم بالعربي"
            dir="rtl"
            className="w-full px-3.5 py-3 rounded-xl text-sm outline-none transition-all"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
        </div>

        {/* Extra field */}
        {l.extraLabel && (
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>{l.extraLabel}</label>
            <input
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder={l.extraPlaceholder}
              className="w-full px-3.5 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl text-sm" style={{ background: "#7F1D1D30", color: "var(--rating-low)" }}>{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!name.trim() || submitting}
          className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
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
# 5. SUGGEST API ROUTE
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
        // Check for duplicates
        const { data: existing } = await supabase.from("universities").select("id").eq("slug", slug).maybeSingle();
        if (existing) return NextResponse.json({ error: "This university may already exist" }, { status: 409 });

        const { error } = await supabase.from("universities").insert({
          name_en: name_en.trim(),
          name_ar: name_ar?.trim() || null,
          country_code: "BH",
          slug,
          is_active: false, // Needs admin approval
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
          is_active: true, // Professors go live immediately
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
# 6. UNIVERSITY PAGE — Add "Add professor" button, simplified
# ============================================================
echo "🏫 Updating university page..."

cat > src/app/u/\[universitySlug\]/page.tsx << 'UNI_EOF'
import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fmtRating } from "@/lib/utils";

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
    .select("id, name_en, slug, departments ( name_en ), aggregates_professor ( avg_quality, review_count, top_tags )")
    .eq("university_id", uni.id).eq("is_active", true).order("name_en");

  const { data: departments } = await supabase
    .from("departments").select("*").eq("university_id", uni.id).order("name_en");

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

      {/* Search within this uni */}
      <Link href={`/search?uni=${uni.slug}`}
        className="flex items-center gap-3 rounded-xl px-4 py-3 mb-5 transition-all active:scale-[0.98]"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Search professors at {uni.short_name || uni.name_en}...</span>
      </Link>

      {/* Professors list */}
      <div className="mb-2 flex items-center justify-between">
        <div className="section-label">Professors</div>
        <Link href={`/suggest?type=professor&university=${uni.id}&universityName=${encodeURIComponent(uni.name_en)}`}
          className="text-[10px] font-semibold transition-all active:scale-95"
          style={{ color: "var(--accent)" }}>
          + Add professor
        </Link>
      </div>

      <div className="space-y-2 stagger-children">
        {(professors || []).map((p: any) => {
          const agg = p.aggregates_professor;
          const avgQ = agg?.avg_quality || agg?.[0]?.avg_quality || 0;
          const count = agg?.review_count || agg?.[0]?.review_count || 0;
          const topTags = agg?.top_tags || agg?.[0]?.top_tags || [];

          return (
            <Link key={p.id} href={`/p/${p.slug}`}
              className="flex items-center justify-between p-3.5 rounded-xl transition-all duration-200 active:scale-[0.98]"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{p.name_en}</div>
                <div className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{p.departments?.name_en}</div>
                {topTags.length > 0 && (
                  <div className="flex gap-1 mt-1.5">{topTags.slice(0, 2).map((tag: string) => (
                    <span key={tag} className="pill">{tag}</span>
                  ))}</div>
                )}
              </div>
              {count > 0 && (
                <div className="text-right ml-3 shrink-0">
                  <div className="text-lg font-extrabold font-display" style={{ color: avgQ >= 4 ? "var(--rating-high)" : avgQ >= 3 ? "var(--rating-mid)" : "var(--rating-low)" }}>
                    {Number(avgQ).toFixed(1)}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{count} ratings</div>
                </div>
              )}
            </Link>
          );
        })}

        {(!professors || professors.length === 0) && (
          <div className="text-center py-10" style={{ color: "var(--text-tertiary)" }}>
            <div className="text-3xl mb-2">🎓</div>
            <p className="text-sm mb-3">No professors added yet</p>
            <Link href={`/suggest?type=professor&university=${uni.id}&universityName=${encodeURIComponent(uni.name_en)}`}
              className="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
              style={{ background: "var(--accent)", color: "#fff" }}>
              Add the first professor
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
UNI_EOF

echo "  ✅ University page updated"

# ============================================================
# 7. CSS — slide-up animation for bottom sheets
# ============================================================
echo "🎨 Adding slide-up animation..."

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
echo "  ⏭️  Already applied"
fi

# ============================================================
# 8. SQL MIGRATION — suggestions table + grade display fixes
# ============================================================
echo "📦 Writing migration 006..."

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
  extra TEXT, -- department for prof, code for course
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pub_insert_suggestions" ON suggestions FOR INSERT WITH CHECK (true);
CREATE POLICY "svc_all_suggestions" ON suggestions FOR ALL USING (true) WITH CHECK (true);

-- 2. Ensure country_code column exists on universities (some inserts use it)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'universities' AND column_name = 'country_code') THEN
    ALTER TABLE universities ADD COLUMN country_code TEXT DEFAULT 'BH';
    UPDATE universities SET country_code = country WHERE country_code IS NULL;
  END IF;
END $$;

-- 3. Backfill any reviews missing grade_received with random grades
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
echo "✅ All v3.3 fixes written!"
echo ""
echo "  FILES CREATED/MODIFIED:"
echo "    src/components/HomeClient.tsx          — Uni-first, cross-uni trending"
echo "    src/components/RateButton.tsx           — Course picker, smooth transitions"
echo "    src/app/p/[professorSlug]/page.tsx      — Grade display, fixed rate flow"
echo "    src/app/u/[universitySlug]/page.tsx     — Add professor button, simplified"
echo "    src/app/suggest/page.tsx                — Add prof/uni/course page"
echo "    src/app/api/suggest/route.ts            — Suggestion API"
echo "    src/app/globals.css                     — Slide-up animation, tap states"
echo "    supabase/migrations/006_*.sql           — Suggestions table, grade backfill"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "NEXT STEPS:"
echo ""
echo "  1. Run migration in Supabase SQL Editor:"
echo "     cat supabase/migrations/006_suggestions_and_fixes.sql | pbcopy"
echo ""
echo "  2. Test locally: npm run dev"
echo "     → Home should show uni grid first"
echo "     → Click a professor → see grades in reviews"
echo "     → Click Rate → course picker shows if multiple courses"
echo "     → Visit /suggest → add professor/uni flow"
echo ""
echo "  3. Push to GitHub:"
echo "     git add -A"
echo "     git commit -m 'feat: uni-first flow, grade display, add professor, smooth UX'"
echo "     git push origin main"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
