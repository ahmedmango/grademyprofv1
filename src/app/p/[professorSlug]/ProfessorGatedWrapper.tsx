"use client";

import { useGate } from "@/components/ReviewGate";
import ReviewGateBlock from "@/components/ReviewGate";
import ProfessorClientContent from "./ProfessorClientContent";

export default function ProfessorGatedWrapper(props: {
  profName: string; profSlug: string; profId: string; deptName: string;
  uniName: string; uniSlug: string; avgQuality: number; avgDifficulty: number;
  wouldTakeAgainPct: number; reviewCount: number; ratingDist: Record<string, number>;
  topTags: string[]; tagDist: Record<string, number>; courses: any[]; reviews: any[];
}) {
  const { isUnlocked, loading } = useGate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div>
        <div className="px-5 mb-5">
          <h1 className="font-display text-2xl font-extrabold leading-tight mb-1" style={{ color: "var(--text-primary)" }}>{props.profName}</h1>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{props.deptName && <>{props.deptName} · </>}{props.uniName}</p>
        </div>
        <ReviewGateBlock />
      </div>
    );
  }

  return <ProfessorClientContent {...props} />;
}
