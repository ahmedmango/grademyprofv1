"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import RateButton from "@/components/RateButton";
import ReviewVoteButtons, { useReviewVotes } from "@/components/ReviewVoteButtons";
import { useUser } from "@/components/UserProvider";
import { useApp } from "@/components/Providers";
import { t } from "@/lib/i18n";
import Link from "next/link";
import { getTagSentiment, getTagStyles } from "@/lib/tagColors";
import { getGradeClassification, getClassificationColor, getClassificationBg } from "@/lib/gradeClassification";

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
  "Distinction": "#16A34A", "Merit": "#2563EB", "Pass": "#CA8A04", "Fail": "#DC2626",
};

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

function GradeClassificationBadge({ grade, isRtl }: { grade: string; isRtl: boolean }) {
  const classification = getGradeClassification(grade);
  if (!classification) return null;
  const color = getClassificationColor(classification);
  const bg = getClassificationBg(classification);
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${isRtl ? "mr-1.5" : "ml-1.5"}`}
      style={{ color, background: bg }}
    >
      {classification}
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
  semesters,
  activeSemester,
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
  semesters: string[];
  activeSemester: string | null;
}) {
  const { lang } = useApp();
  const isRtl = lang === "ar";
  const router = useRouter();

  function formatSemester(sw: string): string {
    const [year, season] = sw.split("-");
    const label = season === "spring" ? "Spring" : season === "summer" ? "Summer" : "Fall";
    return `${label} ${year}`;
  }

  const DIST_LABELS = [
    { key: "5", label: t(lang, "dist_awesome") },
    { key: "4", label: t(lang, "dist_great") },
    { key: "3", label: t(lang, "dist_good") },
    { key: "2", label: t(lang, "dist_ok") },
    { key: "1", label: t(lang, "dist_awful") },
  ];

  const maxDist = Math.max(...DIST_LABELS.map((d) => ratingDist[d.key] || 0), 1);
  const reviewIds = reviews.map((r: any) => r.id);
  const { counts, userVotes, setCounts, setUserVotes } = useReviewVotes(reviewIds);
  const { user } = useUser();

  const handleVote = useCallback(async (reviewId: string, vote: "up" | "down") => {
    if (!user) return;
    const prev = userVotes[reviewId];
    const prevCounts = { ...(counts[reviewId] || { up: 0, down: 0 }) };

    const newUserVotes = { ...userVotes };
    const newCounts = { ...counts, [reviewId]: { ...prevCounts } };
    if (prev === vote) {
      delete newUserVotes[reviewId];
      newCounts[reviewId][vote]--;
    } else {
      if (prev) newCounts[reviewId][prev as "up" | "down"]--;
      newCounts[reviewId][vote]++;
      newUserVotes[reviewId] = vote;
    }
    setUserVotes(newUserVotes);
    setCounts(newCounts);

    try {
      await fetch("/api/review-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_id: reviewId, vote, user_id: user.id }),
      });
    } catch {
      setUserVotes({ ...userVotes, [reviewId]: prev || "" });
      setCounts({ ...counts, [reviewId]: prevCounts });
    }
  }, [user, userVotes, counts, setCounts, setUserVotes]);

  const dateLocale = isRtl ? "ar-BH" : "en-US";
  const arrow = isRtl ? "←" : "→";

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
              {t(lang, "overall_quality")} <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>{reviewCount} {reviewCount === 1 ? t(lang, "rating") : t(lang, "ratings")}</span>
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
              <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{t(lang, "would_take_again")}</div>
            </div>
            <div className="w-px h-8" style={{ background: "var(--border)" }} />
            <div>
              <div className="text-2xl font-extrabold font-display" style={{ color: "var(--text-primary)" }}>
                {avgDifficulty.toFixed(1)}
              </div>
              <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{t(lang, "level_of_difficulty")}</div>
            </div>
          </div>
        )}
      </div>

      {/* Rating Distribution */}
      {reviewCount > 0 && (
        <div className="px-5 mb-5">
          <div className="p-4 rounded-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs font-bold mb-3" style={{ color: "var(--text-primary)" }}>{t(lang, "rating_distribution")}</div>
            <div className="space-y-2">
              {DIST_LABELS.map((d) => {
                const count = ratingDist[d.key] || 0;
                const pct = maxDist > 0 ? (count / maxDist) * 100 : 0;
                return (
                  <div key={d.key} className="flex items-center gap-2">
                    <div className={`text-[10px] font-medium w-[48px] ${isRtl ? "text-left" : "text-right"}`} style={{ color: "var(--text-tertiary)" }}>
                      {d.label}
                    </div>
                    <div className="flex-1 h-4 rounded-sm overflow-hidden" style={{ background: "var(--border)" }}>
                      <div
                        className="h-full rounded-sm transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: "var(--accent)",
                          minWidth: count > 0 ? "4px" : "0",
                          marginInlineStart: isRtl ? "auto" : undefined,
                        }}
                      />
                    </div>
                    <span className={`text-xs font-bold w-6 ${isRtl ? "text-left" : "text-right"}`} style={{ color: "var(--text-primary)" }}>
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
            {isRtl
              ? `${t(lang, "top_tags")} — ${profName.split(" ").pop()}`
              : `${profName.split(" ").pop()}\u2019s ${t(lang, "top_tags")}`}
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
                className="px-2.5 py-2 rounded-lg text-xs font-medium transition-all active:scale-95"
                style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                {c.code}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="px-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="section-label">{activeSemester ? reviews.length : reviewCount} {(activeSemester ? reviews.length : reviewCount) === 1 ? t(lang, "student_rating") : t(lang, "student_ratings")}</div>
        </div>

        {/* Semester filter */}
        {semesters.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 -mx-1 px-1 scrollbar-none">
            <button
              onClick={() => router.push(`/p/${profSlug}`)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
              style={!activeSemester ? {
                background: "var(--accent)",
                color: "#fff",
                border: "1.5px solid var(--accent)",
              } : {
                background: "transparent",
                color: "var(--text-tertiary)",
                border: "1.5px solid var(--border)",
              }}
            >
              All
            </button>
            {semesters.map((sw) => (
              <button
                key={sw}
                onClick={() => router.push(`/p/${profSlug}?semester=${sw}`)}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                style={activeSemester === sw ? {
                  background: "var(--accent)",
                  color: "#fff",
                  border: "1.5px solid var(--accent)",
                } : {
                  background: "transparent",
                  color: "var(--text-tertiary)",
                  border: "1.5px solid var(--border)",
                }}
              >
                {formatSemester(sw)}
              </button>
            ))}
          </div>
        )}


        <div className="space-y-3 mt-1">
          {reviews.map((r: any) => {
            const classification = r.grade_received ? getGradeClassification(r.grade_received) : null;
            return (
              <div key={r.id} className="p-4 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                {/* Quality + Difficulty blocks */}
                <div className="flex gap-3 mb-3">
                  <div className="shrink-0">
                    <div className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
                      {t(lang, "quality")}
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
                      {t(lang, "difficulty")}
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
                    <div className="flex items-center justify-between gap-2">
                      {r.courses?.code && (
                        <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{r.courses.code}</span>
                      )}
                      <div className="flex items-center gap-2 shrink-0">
                        {r.semester_window && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                            {formatSemester(r.semester_window)}
                          </span>
                        )}
                        <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                          {new Date(r.created_at).toLocaleDateString(dateLocale, { month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                      {r.would_take_again !== null && (
                        <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                          {t(lang, "would_take_again_review")}: <strong style={{ color: "var(--text-primary)" }}>{r.would_take_again ? t(lang, "yes") : t(lang, "no_word")}</strong>
                        </span>
                      )}
                      {r.grade_received && (
                        <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                          {t(lang, "grade")}: <strong className={isRtl ? "mr-0.5" : "ml-0.5"} style={{ color: GRADE_COLORS[r.grade_received] || "var(--text-primary)" }}>{r.grade_received}</strong>
                          {classification && <GradeClassificationBadge grade={r.grade_received} isRtl={isRtl} />}
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
                      <TagPill key={tag} tag={tag} />
                    ))}
                  </div>
                )}

                <ReviewVoteButtons
                  reviewId={r.id}
                  upCount={counts[r.id]?.up || 0}
                  downCount={counts[r.id]?.down || 0}
                  userVote={userVotes[r.id] || null}
                  onVote={handleVote}
                />
              </div>
            );
          })}

          {reviews.length === 0 && (
            <div className="text-center py-8" style={{ color: "var(--text-tertiary)" }}>
              <div className="text-2xl mb-2">📝</div>
              <p className="text-sm">{t(lang, "no_reviews")}</p>
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
