"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { getTagSentiment, getTagStyles } from "@/lib/tagColors";
import AppleLogo from "@/components/AppleLogo";

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

      {/* Professor cards */}
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

              {/* Left — quality box or apple icon */}
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
                  <>
                    <div className="w-[56px] h-[56px] rounded-full flex items-center justify-center" style={{ border: "2px solid var(--accent)", background: "var(--accent-soft, rgba(217,80,48,0.08))" }}>
                      <AppleLogo size={24} color="var(--accent)" />
                    </div>
                    <div className="text-[8px] mt-1 text-center leading-tight font-medium" style={{ color: "var(--text-tertiary)" }}>
                      No ratings
                    </div>
                  </>
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
