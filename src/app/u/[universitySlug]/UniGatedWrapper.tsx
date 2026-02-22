"use client";

import { useGate } from "@/components/ReviewGate";
import ReviewGateBlock from "@/components/ReviewGate";
import UniClientContent from "./UniClientContent";

export default function UniGatedWrapper(props: {
  uniId: string; uniName: string; uniShortName: string | null; uniSlug: string; professors: any[];
}) {
  const { isUnlocked, loading } = useGate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  if (!isUnlocked) return <ReviewGateBlock />;
  return <UniClientContent {...props} />;
}
