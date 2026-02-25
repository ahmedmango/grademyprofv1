"use client";

import { useState, useMemo } from "react";
import { useGate } from "@/components/ReviewGate";
import UniClientContent from "./UniClientContent";
import Link from "next/link";
import { smartMatch } from "@/lib/smartSearch";

export default function UniGatedWrapper(props: {
  uniId: string; uniName: string; uniShortName: string | null; uniSlug: string; professors: any[];
}) {
  const { isUnlocked, loading, reviewCount, approvedCount } = useGate();
  const [search, setSearch] = useState("");

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

  const filtered = useMemo(() => {
    const list = search.trim()
      ? props.professors.filter((p: any) => smartMatch(search, p.name_en, p.departments?.name_en))
      : [...props.professors];
    return list.sort((a: any, b: any) => {
      const ac = a.aggregates_professor?.review_count ?? a.aggregates_professor?.[0]?.review_count ?? 0;
      const bc = b.aggregates_professor?.review_count ?? b.aggregates_professor?.[0]?.review_count ?? 0;
      if (ac > 0 && bc === 0) return -1;
      if (ac === 0 && bc > 0) return 1;
      return a.name_en.localeCompare(b.name_en);
    });
  }, [search, props.professors]);

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

      {/* Search bar */}
      <div className="relative mb-4">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2.2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search professors at ${props.uniShortName || props.uniName}...`}
          className="w-full pl-10 pr-4 py-3 rounded-xl text-xs outline-none transition-all"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="section-label">{search.trim() ? `${filtered.length} results` : "Professors"}</div>
        <Link href={`/suggest?type=professor&university=${props.uniId}&universityName=${encodeURIComponent(props.uniName)}`}
          className="text-[10px] font-semibold transition-all active:scale-95" style={{ color: "var(--accent)" }}>
          + Add professor
        </Link>
      </div>

      {/* Professor list — tap goes directly to /rate */}
      <div className="space-y-3">
        {filtered.map((p: any) => {
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
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0 py-0.5">
                <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{p.name_en}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{p.departments?.name_en}</div>
                <div className="text-[10px] mt-2 font-semibold" style={{ color: "var(--accent)" }}>
                  {waitingApproval ? "⏳ Pending approval" : "Tap to rate & unlock →"}
                </div>
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && search.trim() && (
          <div className="text-center py-8" style={{ color: "var(--text-tertiary)" }}>
            <p className="text-sm mb-1">No professors match &ldquo;{search}&rdquo;</p>
            <p className="text-[11px] mb-3" style={{ color: "var(--text-tertiary)" }}>Can&apos;t find who you&apos;re looking for?</p>
            <Link href={`/suggest?type=professor&university=${props.uniId}&universityName=${encodeURIComponent(props.uniName)}`}
              className="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
              style={{ background: "var(--accent)", color: "#fff" }}>
              + Add this professor
            </Link>
          </div>
        )}

        {filtered.length === 0 && !search.trim() && (
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
