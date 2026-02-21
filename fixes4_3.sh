#!/bin/bash
# ============================================================
# GradeMyProfessor v4.3 — Quick Fixes
# 1. Fix light/dark mode toggle icons + logic
# 2. Tag ring colors: green (good), purple (neutral), red (bad)
# 3. Rating distribution: remove numbers from Y axis labels
# Run from project root: bash fixes4_3.sh
# ============================================================

set -e

echo "🔧 GradeMyProfessor v4.3 — Quick Fixes"
echo "========================================"

if [ ! -f "package.json" ]; then
  echo "❌ Run this from the project root"
  exit 1
fi

# ============================================================
# 1. THEME TOGGLE — Fix icon/logic + new icons
# ============================================================
echo "🌓 Fixing theme toggle..."

# Find existing ThemeToggle component
THEME_FILE=$(find src -name "ThemeToggle*" -o -name "themeToggle*" -o -name "theme-toggle*" 2>/dev/null | head -1)

if [ -z "$THEME_FILE" ]; then
  # Check for it inside other files
  THEME_FILE=$(grep -rl "ThemeToggle\|theme-toggle" src/components/ 2>/dev/null | head -1)
fi

if [ -z "$THEME_FILE" ]; then
  # Check Providers or layout for inline theme logic
  THEME_FILE=$(grep -rl "setTheme\|toggleTheme\|dark-mode\|theme.*moon\|theme.*sun" src/ 2>/dev/null | head -1)
fi

echo "  Found theme logic in: ${THEME_FILE:-'not found, creating new'}"

# Create a clean ThemeToggle component regardless
cat > src/components/ThemeToggle.tsx << 'EOF'
"use client";

import { useApp } from "./Providers";

export default function ThemeToggle() {
  const { theme, setTheme } = useApp();

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        /* Sun icon — shown in dark mode, click to go light */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        /* Moon icon — shown in light mode, click to go dark */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}
EOF

echo "  ✅ ThemeToggle component written"

# Also fix Providers if it has wrong theme logic
# Patch the Providers to ensure theme state works correctly
PROVIDERS_FILE=$(find src -name "Providers*" -path "*/components/*" | head -1)

if [ -n "$PROVIDERS_FILE" ]; then
  echo "  Checking $PROVIDERS_FILE for theme logic..."
  
  # Check if theme/setTheme are already in context
  if grep -q "setTheme" "$PROVIDERS_FILE"; then
    echo "  ✅ Providers already has setTheme"
  else
    echo "  ⚠️  May need manual check — ensure Providers exports theme + setTheme"
  fi
fi

# ============================================================
# 2. TAG COLORS — Green (good), Purple (neutral), Red (bad)
# ============================================================
echo "🏷️  Adding tag color classification..."

cat > src/lib/tagColors.ts << 'EOF'
// Tag classification: good (green ring), neutral (purple ring), bad (red ring)

const GOOD_TAGS = new Set([
  "Amazing Lectures",
  "Inspirational",
  "Caring",
  "Respected",
  "Accessible Outside Class",
  "Clear Grading",
  "Gives Good Feedback",
  "Hilarious",
  "Get Ready To Read",
  "Graded By Few Things",
  "Extra Credit",
  "Would Take Again",
]);

const BAD_TAGS = new Set([
  "Tough Grader",
  "Get Ready To Read",
  "Skip Class? You Won't Pass.",
  "Lots Of Homework",
  "Test Heavy",
  "Lecture Heavy",
  "So Many Papers",
  "Beware Of Pop Quizzes",
  "Unfair Grading",
  "Boring",
  "Disorganized",
  "Rude",
  "No Feedback",
]);

// Everything else is neutral (purple)

export type TagSentiment = "good" | "neutral" | "bad";

export function getTagSentiment(tag: string): TagSentiment {
  const normalized = tag.trim();
  if (GOOD_TAGS.has(normalized)) return "good";
  if (BAD_TAGS.has(normalized)) return "bad";
  return "neutral";
}

export function getTagStyles(sentiment: TagSentiment) {
  switch (sentiment) {
    case "good":
      return {
        borderColor: "#22C55E",
        color: "#22C55E",
        background: "#22C55E12",
      };
    case "bad":
      return {
        borderColor: "#EF4444",
        color: "#EF4444",
        background: "#EF444412",
      };
    case "neutral":
    default:
      return {
        borderColor: "#A78BFA",
        color: "#A78BFA",
        background: "#A78BFA12",
      };
  }
}
EOF

echo "  ✅ Tag color system created"

# ============================================================
# 3. UPDATE PROFESSOR CLIENT — Use tag colors + fix dist labels
# ============================================================
echo "📝 Updating professor page with tag colors + fixed labels..."

cat > src/app/p/\[professorSlug\]/ProfessorClientContent.tsx << 'PROFCLIENT_EOF'
"use client";

import RateButton from "@/components/RateButton";
import Link from "next/link";
import { getTagSentiment, getTagStyles } from "@/lib/tagColors";

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

const GRADE_COLORS: Record<string, string> = {
  "A+": "#16A34A", "A": "#16A34A", "A-": "#22C55E",
  "B+": "#65A30D", "B": "#CA8A04", "B-": "#D97706",
  "C+": "#EA580C", "C": "#DC2626", "C-": "#DC2626",
  "D+": "#B91C1C", "D": "#B91C1C", "F": "#991B1B",
  "W": "#6B7280", "IP": "#6B7280",
};

const DIST_LABELS = [
  { key: "5", label: "Awesome" },
  { key: "4", label: "Great" },
  { key: "3", label: "Good" },
  { key: "2", label: "OK" },
  { key: "1", label: "Awful" },
];

function TagPill({ tag }: { tag: string }) {
  const sentiment = getTagSentiment(tag);
  const styles = getTagStyles(sentiment);
  return (
    <span
      className="inline-block px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
      style={{
        border: `1.5px solid ${styles.borderColor}`,
        color: styles.color,
        background: styles.background,
      }}
    >
      {tag}
    </span>
  );
}

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
      {/* Hero — big rating + name + stats */}
      <div className="px-5 mb-5">
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

        <h1 className="font-display text-2xl font-extrabold leading-tight mb-1" style={{ color: "var(--text-primary)" }}>
          {profName}
        </h1>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {deptName && <>{deptName} · </>}
          <Link href={`/u/${uniSlug}`} className="underline" style={{ color: "var(--text-tertiary)" }}>{uniName}</Link>
        </p>

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

      {/* Rating Distribution — no numbers on Y axis */}
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
                    <div className="text-[10px] font-medium w-[48px] text-right" style={{ color: "var(--text-tertiary)" }}>
                      {d.label}
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

      {/* Top Tags — colored rings */}
      {topTags.length > 0 && (
        <div className="px-5 mb-5">
          <div className="text-xs font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            {profName.split(" ").pop()}&apos;s Top Tags
          </div>
          <div className="flex flex-wrap gap-2">
            {topTags.map((tag: string) => (
              <TagPill key={tag} tag={tag} />
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
              {/* Quality + Difficulty blocks */}
              <div className="flex gap-3 mb-3">
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

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    {r.courses?.code && (
                      <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{r.courses.code}</span>
                    )}
                    <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                      {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
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

              {/* Tags — colored rings */}
              {r.tags?.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {r.tags.map((tag: string) => (
                    <TagPill key={tag} tag={tag} />
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

echo "  ✅ Professor page updated with tag colors + fixed dist labels"

# ============================================================
# 4. UPDATE UNI CLIENT — Use tag colors there too
# ============================================================
echo "🏫 Updating uni page tags..."

cat > src/app/u/\[universitySlug\]/UniClientContent.tsx << 'UNICLIENT_EOF'
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { getTagSentiment, getTagStyles } from "@/lib/tagColors";

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

function TagPill({ tag }: { tag: string }) {
  const sentiment = getTagSentiment(tag);
  const styles = getTagStyles(sentiment);
  return (
    <span
      className="inline-block px-2.5 py-1 rounded-full text-[9px] font-semibold uppercase tracking-wide"
      style={{
        border: `1.5px solid ${styles.borderColor}`,
        color: styles.color,
        background: styles.background,
      }}
    >
      {tag}
    </span>
  );
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

              <div className="flex-1 min-w-0 py-0.5">
                <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{p.name_en}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  {p.departments?.name_en}
                </div>
                {count > 0 && (
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{Math.round(retake)}%</span>
                    <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>would take again</span>
                    <span className="text-[10px] mx-1" style={{ color: "var(--border)" }}>|</span>
                    <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{avgD.toFixed(1)}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>level of difficulty</span>
                  </div>
                )}
                {topTags.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {topTags.slice(0, 3).map((tag: string) => (
                      <TagPill key={tag} tag={tag} />
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

echo "  ✅ Uni page tags updated with colors"

# ============================================================
# DONE
# ============================================================
echo ""
echo "✅ v4.3 done!"
echo ""
echo "  FILES CREATED/CHANGED:"
echo "    src/components/ThemeToggle.tsx                    — Fixed icons + logic"
echo "    src/lib/tagColors.ts                             — Tag sentiment colors"
echo "    src/app/p/[professorSlug]/ProfessorClientContent.tsx — Colored tags + dist fix"
echo "    src/app/u/[universitySlug]/UniClientContent.tsx   — Colored tags"
echo ""
echo "  NOTE: Make sure your Providers.tsx exports 'theme' and 'setTheme'"
echo "  in the context, and that ThemeToggle is imported in your layout/nav."
echo ""
echo "  npm run dev → check:"
echo "    → Sun shows in dark mode, moon in light mode"
echo "    → Tags: green ring = good, purple = neutral, red = bad"
echo "    → Distribution chart: 'Awesome, Great, Good, OK, Awful' (no numbers)"
