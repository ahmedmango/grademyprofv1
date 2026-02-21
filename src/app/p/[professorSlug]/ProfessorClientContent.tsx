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
