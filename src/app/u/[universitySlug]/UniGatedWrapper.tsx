"use client";

import { useGate } from "@/components/ReviewGate";
import UniClientContent from "./UniClientContent";
import Link from "next/link";

export default function UniGatedWrapper(props: {
  uniId: string; uniName: string; uniShortName: string | null; uniSlug: string; professors: any[];
}) {
  const { isUnlocked, loading, reviewCount, approvedCount } = useGate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
      </div>
    );
  }

  if (isUnlocked) return <UniClientContent {...props} />;

  const hasSubmitted = reviewCount > 0;
  const waitingApproval = hasSubmitted && approvedCount < 1;

  return (
    <>
      {/* Gate banner */}
      <div className="mb-5 p-4 rounded-2xl" style={{ background: "var(--accent-soft)", border: "1px solid var(--accent)" }}>
        <div className="flex items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <div className="flex-1">
            {waitingApproval ? (
              <>
                <p className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Your rating is under review</p>
                <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>
                  Once approved, all ratings unlock. Most reviews are approved within 24 hours.
                </p>
                <Link href="/my-reviews" className="inline-block mt-2 text-[10px] font-semibold underline" style={{ color: "var(--accent)" }}>
                  Check status →
                </Link>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold" style={{ color: "var(--accent)" }}>Rate 1 professor to unlock all ratings</p>
                <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>
                  Pick any professor below and share your experience.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Professor list — tap goes directly to /rate */}
      <div className="space-y-3">
        {props.professors.map((p: any) => {
          const rateUrl = `/rate?professorId=${p.id}&professorName=${encodeURIComponent(p.name_en)}&professorSlug=${p.slug}&uniId=${props.uniId}`;
          return (
            <Link key={p.id} href={waitingApproval ? `/p/${p.slug}` : rateUrl}
              className="flex gap-3.5 p-3 rounded-xl transition-all duration-200 active:scale-[0.98]"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <div className="shrink-0 flex flex-col items-center">
                <div className="w-[56px] h-[56px] rounded-full flex items-center justify-center" style={{ border: "2px solid var(--border)", background: "var(--bg-surface-alt)" }}>
                  {waitingApproval ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0 py-0.5">
                <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{p.name_en}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{p.departments?.name_en}</div>
                <div className="text-[10px] mt-2 font-semibold" style={{ color: "var(--accent)" }}>
                  {waitingApproval ? "⏳ Pending approval" : "✍️ Tap to rate & unlock →"}
                </div>
              </div>
            </Link>
          );
        })}

        {props.professors.length === 0 && (
          <div className="text-center py-10" style={{ color: "var(--text-tertiary)" }}>
            <div className="text-3xl mb-2">🎓</div>
            <p className="text-sm mb-3">No professors added yet</p>
            <Link href={`/suggest?type=professor&university=${props.uniId}&universityName=${encodeURIComponent(props.uniName)}`}
              className="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
              style={{ background: "var(--accent)", color: "#fff" }}>
              Add the first professor
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
