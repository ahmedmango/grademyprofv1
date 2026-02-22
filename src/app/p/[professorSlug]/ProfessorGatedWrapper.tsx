"use client";

import { useGate } from "@/components/ReviewGate";
import ProfessorClientContent from "./ProfessorClientContent";
import RateButton from "@/components/RateButton";
import Link from "next/link";

export default function ProfessorGatedWrapper(props: {
  profName: string; profSlug: string; profId: string; deptName: string;
  uniName: string; uniSlug: string; avgQuality: number; avgDifficulty: number;
  wouldTakeAgainPct: number; reviewCount: number; ratingDist: Record<string, number>;
  topTags: string[]; tagDist: Record<string, number>; courses: any[]; reviews: any[];
}) {
  const { isUnlocked, loading, reviewCount: userReviewCount } = useGate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  // Fully unlocked
  if (isUnlocked) return <ProfessorClientContent {...props} />;

  // Locked — show name, dept, courses, Rate button. Hide scores/reviews.
  const remaining = Math.max(0, 3 - userReviewCount);

  return (
    <>
      {/* Professor name + dept */}
      <div className="px-5 mb-5">
        <h1 className="font-display text-2xl font-extrabold leading-tight mb-1" style={{ color: "var(--text-primary)" }}>
          {props.profName}
        </h1>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {props.deptName && <>{props.deptName} · </>}
          <Link href={`/u/${props.uniSlug}`} className="underline" style={{ color: "var(--text-tertiary)" }}>{props.uniName}</Link>
        </p>
      </div>

      {/* Courses — visible so they can pick one to rate */}
      {props.courses.length > 0 && (
        <div className="px-5 mb-5">
          <div className="flex gap-1.5 flex-wrap">
            {props.courses.map((c: any) => (
              <span key={c.id}
                className="px-2.5 py-1 rounded-lg text-xs font-medium"
                style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                {c.code}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Locked ratings section */}
      <div className="px-5 mb-5">
        <div className="p-6 rounded-2xl text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--accent-soft)", border: "2px solid var(--accent)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <h3 className="font-display font-bold text-base mb-1" style={{ color: "var(--text-primary)" }}>
            Ratings &amp; reviews are locked
          </h3>
          <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
            Rate <strong style={{ color: "var(--accent)" }}>{remaining} more</strong> {remaining === 1 ? "professor" : "professors"} to unlock all ratings across the platform.
          </p>

          {/* Progress */}
          <div className="max-w-[200px] mx-auto mb-4">
            <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--text-tertiary)" }}>
              <span>{userReviewCount} / 3</span>
              <span>{Math.round((userReviewCount / 3) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full transition-all" style={{ background: "var(--accent)", width: `${(userReviewCount / 3) * 100}%` }} />
            </div>
          </div>

          <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
            Start by rating {props.profName.split(" ").pop()} below ↓
          </p>
        </div>
      </div>

      {/* Blurred placeholder for what they're missing */}
      <div className="px-5 mb-5">
        <div className="section-label mb-3" style={{ filter: "blur(3px)", userSelect: "none" }}>
          {props.reviewCount} Student Ratings
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", filter: "blur(6px)", userSelect: "none" }}>
              <div className="flex gap-3 mb-3">
                <div className="w-[52px] h-[52px] rounded-lg" style={{ background: "var(--border)" }} />
                <div className="flex-1">
                  <div className="h-3 w-20 rounded" style={{ background: "var(--border)" }} />
                  <div className="h-2 w-32 rounded mt-2" style={{ background: "var(--border)" }} />
                </div>
              </div>
              <div className="h-3 w-full rounded mb-1" style={{ background: "var(--border)" }} />
              <div className="h-3 w-3/4 rounded" style={{ background: "var(--border)" }} />
            </div>
          ))}
        </div>
      </div>

      {/* Rate button — ALWAYS available */}
      <RateButton
        professorId={props.profId}
        professorName={props.profName}
        professorSlug={props.profSlug}
        courses={props.courses.map((c: any) => ({ id: c.id, code: c.code, title_en: c.title_en }))}
      />
    </>
  );
}
