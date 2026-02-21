#!/bin/bash
# ============================================================
# GradeMyProfessor v4.2 — RMP-style Professor UI
# 1. Uni page: big colored quality box + text stats
# 2. Prof page: big overall rating + distribution chart
# 3. Review cards: colored quality block + grey difficulty
# Run from project root: bash fixes4_2.sh
# ============================================================

set -e

echo "🎯 GradeMyProfessor v4.2 — Professor UI Overhaul"
echo "=================================================="

if [ ! -f "package.json" ]; then
  echo "❌ Run this from the project root"
  exit 1
fi

# ============================================================
# 1. UNI PAGE CLIENT — Big colored box + text stats
# ============================================================
echo "🏫 Rewriting university professor list..."

cat > src/app/u/\[universitySlug\]/UniClientContent.tsx << 'UNICLIENT_EOF'
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

function qualityColor(v: number): string {
  if (v >= 4) return "#22C55E";
  if (v >= 3) return "#EAB308";
  if (v >= 2) return "#F97316";
  return "#EF4444";
}

function qualityBg(v: number): string {
  if (v >= 4) return "#22C55E20";
  if (v >= 3) return "#EAB30820";
  if (v >= 2) return "#F9731620";
  return "#EF444420";
}

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
      {/* Search within this uni */}
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

      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="section-label">
          {search.trim() ? `${filtered.length} results` : "Professors"}
        </div>
        <Link href={`/suggest?type=professor&university=${uniId}&universityName=${encodeURIComponent(uniName)}`}
          className="text-[10px] font-semibold transition-all active:scale-95"
          style={{ color: "var(--accent)" }}>
          + Add professor
        </Link>
      </div>

      {/* Professor cards — RMP style */}
      <div className="space-y-3 stagger-children">
        {filtered.map((p: any) => {
          const agg = p.aggregates_professor;
          const avgQ = Number(agg?.avg_quality || agg?.[0]?.avg_quality || 0);
          const avgD = Number(agg?.avg_difficulty || agg?.[0]?.avg_difficulty || 0);
          const count = agg?.review_count || agg?.[0]?.review_count || 0;
          const retake = Number(agg?.would_take_again_pct || agg?.[0]?.would_take_again_pct || 0);
          const topTags = agg?.top_tags || agg?.[0]?.top_tags || [];

          return (
            <Link key={p.id} href={`/p/${p.slug}`}
              className="flex gap-3.5 p-3 rounded-xl transition-all duration-200 active:scale-[0.98]"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>

              {/* Left — big colored quality box */}
              <div className="shrink-0 flex flex-col items-center">
                {count > 0 ? (
                  <>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
                      Quality
                    </div>
                    <div
                      className="w-[56px] h-[56px] rounded-lg flex items-center justify-center"
                      style={{ background: qualityBg(avgQ) }}
                    >
                      <span className="text-[22px] font-extrabold font-display" style={{ color: qualityColor(avgQ) }}>
                        {avgQ.toFixed(1)}
                      </span>
                    </div>
                    <div className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                      {count} {count === 1 ? "rating" : "ratings"}
                    </div>
                  </>
                ) : (
                  <div className="w-[56px] h-[56px] rounded-lg flex items-center justify-center" style={{ background: "var(--border)" }}>
                    <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>N/A</span>
                  </div>
                )}
              </div>

              {/* Right — name, dept, stats */}
              <div className="flex-1 min-w-0 py-0.5">
                <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{p.name_en}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  {p.departments?.name_en}
                </div>

                {count > 0 && (
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                      {Math.round(retake)}%
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                      would take again
                    </span>
                    <span className="text-[10px] mx-1" style={{ color: "var(--border)" }}>|</span>
                    <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                      {avgD.toFixed(1)}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                      level of difficulty
                    </span>
                  </div>
                )}

                {topTags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {topTags.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="pill">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
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

echo "  ✅ University professor list rewritten (RMP style)"

# ============================================================
# 2. PROFESSOR PAGE (SERVER) — Fetch + pass data
# ============================================================
echo "📝 Updating professor page (server)..."

cat > src/app/p/\[professorSlug\]/page.tsx << 'PROF_EOF'
import { createServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import RateButton from "@/components/RateButton";
import Link from "next/link";
import ProfessorClientContent from "./ProfessorClientContent";

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

  const agg = (prof as any).aggregates_professor || {
    review_count: 0, avg_quality: 0, avg_difficulty: 0,
    would_take_again_pct: 0, rating_dist: {}, tag_dist: {}, top_tags: []
  };
  const dept = (prof as any).departments;
  const uni = (prof as any).universities;
  const courses = ((prof as any).professor_courses || []).map((pc: any) => pc.courses).filter(Boolean);

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating_quality, rating_difficulty, would_take_again, tags, comment, grade_received, created_at, courses ( code )")
    .eq("professor_id", prof.id)
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="pb-28">
      <div className="px-5 pt-4 flex items-center gap-3 mb-4">
        <Link href={uni ? `/u/${uni.slug}` : "/"} style={{ color: "var(--text-tertiary)" }} className="text-lg transition-all active:scale-90">←</Link>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{uni?.name_en}</span>
      </div>

      <ProfessorClientContent
        profName={prof.name_en}
        profSlug={prof.slug}
        profId={prof.id}
        deptName={dept?.name_en || ""}
        uniName={uni?.name_en || ""}
        uniSlug={uni?.slug || ""}
        avgQuality={Number(agg.avg_quality)}
        avgDifficulty={Number(agg.avg_difficulty)}
        wouldTakeAgainPct={Number(agg.would_take_again_pct)}
        reviewCount={agg.review_count || 0}
        ratingDist={agg.rating_dist || {}}
        topTags={agg.top_tags || []}
        tagDist={agg.tag_dist || {}}
        courses={courses}
        reviews={reviews || []}
      />
    </div>
  );
}
PROF_EOF

echo "  ✅ Professor page (server) updated"

# ============================================================
# 3. PROFESSOR CLIENT CONTENT — Big rating + distribution + reviews
# ============================================================
echo "📝 Rewriting professor client content..."

cat > src/app/p/\[professorSlug\]/ProfessorClientContent.tsx << 'PROFCLIENT_EOF'
"use client";

import RateButton from "@/components/RateButton";
import Link from "next/link";

function qualityColor(v: number): string {
  if (v >= 4) return "#22C55E";
  if (v >= 3) return "#EAB308";
  if (v >= 2) return "#F97316";
  return "#EF4444";
}

function qualityBg(v: number): string {
  if (v >= 4) return "#22C55E20";
  if (v >= 3) return "#EAB30820";
  if (v >= 2) return "#F9731620";
  return "#EF444420";
}

function difficultyBg(): string {
  return "var(--bg-surface)";
}

const GRADE_COLORS: Record<string, string> = {
  "A+": "#16A34A", "A": "#16A34A", "A-": "#22C55E",
  "B+": "#65A30D", "B": "#CA8A04", "B-": "#D97706",
  "C+": "#EA580C", "C": "#DC2626", "C-": "#DC2626",
  "D+": "#B91C1C", "D": "#B91C1C", "F": "#991B1B",
  "W": "#6B7280", "IP": "#6B7280",
};

const DIST_LABELS: { key: string; label: string; value: number }[] = [
  { key: "5", label: "Awesome", value: 5 },
  { key: "4", label: "Great", value: 4 },
  { key: "3", label: "Good", value: 3 },
  { key: "2", label: "OK", value: 2 },
  { key: "1", label: "Awful", value: 1 },
];

export default function ProfessorClientContent({
  profName,
  profSlug,
  profId,
  deptName,
  uniName,
  uniSlug,
  avgQuality,
  avgDifficulty,
  wouldTakeAgainPct,
  reviewCount,
  ratingDist,
  topTags,
  tagDist,
  courses,
  reviews,
}: {
  profName: string;
  profSlug: string;
  profId: string;
  deptName: string;
  uniName: string;
  uniSlug: string;
  avgQuality: number;
  avgDifficulty: number;
  wouldTakeAgainPct: number;
  reviewCount: number;
  ratingDist: Record<string, number>;
  topTags: string[];
  tagDist: Record<string, number>;
  courses: any[];
  reviews: any[];
}) {
  const maxDist = Math.max(...DIST_LABELS.map((d) => ratingDist[d.key] || 0), 1);

  return (
    <>
      {/* Hero section — big rating + name + stats */}
      <div className="px-5 mb-5">
        {/* Overall quality */}
        {reviewCount > 0 && (
          <div className="mb-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[48px] font-extrabold font-display leading-none" style={{ color: qualityColor(avgQuality) }}>
                {avgQuality.toFixed(1)}
              </span>
              <span className="text-base font-semibold" style={{ color: "var(--text-tertiary)" }}>/ 5</span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              Overall Quality Based on <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>{reviewCount} {reviewCount === 1 ? "rating" : "ratings"}</span>
            </p>
          </div>
        )}

        {/* Professor name */}
        <h1 className="font-display text-2xl font-extrabold leading-tight mb-1" style={{ color: "var(--text-primary)" }}>
          {profName}
        </h1>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {deptName && <>{deptName} · </>}
          <Link href={`/u/${uniSlug}`} className="underline" style={{ color: "var(--text-tertiary)" }}>{uniName}</Link>
        </p>

        {/* Stats row */}
        {reviewCount > 0 && (
          <div className="flex items-center gap-3 mt-4">
            <div>
              <div className="text-2xl font-extrabold font-display" style={{ color: "var(--text-primary)" }}>
                {Math.round(wouldTakeAgainPct)}%
              </div>
              <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Would take again</div>
            </div>
            <div className="w-px h-8" style={{ background: "var(--border)" }} />
            <div>
              <div className="text-2xl font-extrabold font-display" style={{ color: "var(--text-primary)" }}>
                {avgDifficulty.toFixed(1)}
              </div>
              <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Level of Difficulty</div>
            </div>
          </div>
        )}
      </div>

      {/* Rating Distribution */}
      {reviewCount > 0 && (
        <div className="px-5 mb-5">
          <div className="p-4 rounded-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs font-bold mb-3" style={{ color: "var(--text-primary)" }}>Rating Distribution</div>
            <div className="space-y-2">
              {DIST_LABELS.map((d) => {
                const count = ratingDist[d.key] || 0;
                const pct = maxDist > 0 ? (count / maxDist) * 100 : 0;
                return (
                  <div key={d.key} className="flex items-center gap-2">
                    <div className="text-[10px] font-medium w-[52px] text-right" style={{ color: "var(--text-tertiary)" }}>
                      {d.label} {d.value}
                    </div>
                    <div className="flex-1 h-4 rounded-sm overflow-hidden" style={{ background: "var(--border)" }}>
                      <div
                        className="h-full rounded-sm transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: "var(--accent)",
                          minWidth: count > 0 ? "4px" : "0",
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold w-6 text-right" style={{ color: "var(--text-primary)" }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Top Tags */}
      {topTags.length > 0 && (
        <div className="px-5 mb-5">
          <div className="text-xs font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            {profName.split(" ").pop()}&apos;s Top Tags
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topTags.map((tag: string) => (
              <span key={tag} className="pill-lg">{tag.toUpperCase()}</span>
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
        <div className="section-label mb-3">{reviewCount} {reviewCount === 1 ? "Student Rating" : "Student Ratings"}</div>
        <div className="space-y-3">
          {reviews.map((r: any) => (
            <div key={r.id} className="p-4 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              {/* Quality + Difficulty blocks side by side */}
              <div className="flex gap-3 mb-3">
                {/* Quality block */}
                <div className="shrink-0">
                  <div className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
                    Quality
                  </div>
                  <div
                    className="w-[52px] h-[52px] rounded-lg flex items-center justify-center"
                    style={{ background: qualityBg(r.rating_quality) }}
                  >
                    <span className="text-xl font-extrabold font-display" style={{ color: qualityColor(r.rating_quality) }}>
                      {Number(r.rating_quality).toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Difficulty block — neutral/grey */}
                <div className="shrink-0">
                  <div className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
                    Difficulty
                  </div>
                  <div
                    className="w-[52px] h-[52px] rounded-lg flex items-center justify-center"
                    style={{ background: "var(--border)", opacity: 0.7 }}
                  >
                    <span className="text-xl font-extrabold font-display" style={{ color: "var(--text-primary)" }}>
                      {Number(r.rating_difficulty).toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Course + date + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    {r.courses?.code && (
                      <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{r.courses.code}</span>
                    )}
                    <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                      {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>

                  {/* Meta line */}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                    {r.would_take_again !== null && (
                      <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                        Would Take Again: <strong style={{ color: "var(--text-primary)" }}>{r.would_take_again ? "Yes" : "No"}</strong>
                      </span>
                    )}
                    {r.grade_received && (
                      <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                        Grade: <strong style={{ color: GRADE_COLORS[r.grade_received] || "var(--text-primary)" }}>{r.grade_received}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Comment */}
              {r.comment && (
                <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--text-primary)" }}>{r.comment}</p>
              )}

              {/* Tags */}
              {r.tags?.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {r.tags.map((tag: string) => (
                    <span key={tag} className="pill-lg">{tag.toUpperCase()}</span>
                  ))}
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

      {/* Rate CTA */}
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

echo "  ✅ Professor client content rewritten (RMP style)"

# ============================================================
# 4. CSS — Larger pill style for tags
# ============================================================
echo "🎨 Adding pill-lg class..."

if ! grep -q "pill-lg" src/app/globals.css 2>/dev/null; then
cat >> src/app/globals.css << 'CSS_EOF'

/* Large tag pill (RMP style) */
.pill-lg {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
}
CSS_EOF
echo "  ✅ pill-lg class added"
else
echo "  ⏭️  Already exists"
fi

echo ""
echo "✅ v4.2 done!"
echo ""
echo "  CHANGED FILES:"
echo "    src/app/u/[universitySlug]/UniClientContent.tsx  — RMP-style prof cards"
echo "    src/app/p/[professorSlug]/page.tsx               — Server data fetch"
echo "    src/app/p/[professorSlug]/ProfessorClientContent.tsx — Full RMP layout"
echo "    src/app/globals.css                              — pill-lg class"
echo ""
echo "  npm run dev → check:"
echo "    → Uni page: big colored quality boxes"
echo "    → Prof page: huge rating + distribution chart + tags"
echo "    → Reviews: quality/difficulty blocks + course + date + comment"
