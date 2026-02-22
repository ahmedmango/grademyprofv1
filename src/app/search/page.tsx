"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useApp } from "@/components/Providers";
import { t } from "@/lib/i18n";

type SearchResults = {
  professors: any[];
  courses: any[];
  course_professors: any[];
  universities: any[];
};

export default function SearchPage() {
  const { lang } = useApp();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults>({ professors: [], courses: [], course_professors: [], universities: [] });
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    try { const saved = localStorage.getItem("gmp_recent_searches"); if (saved) setRecentSearches(JSON.parse(saved).slice(0, 5)); } catch {}
  }, []);

  useEffect(() => {
    if (q.trim().length < 1) { setResults({ professors: [], courses: [], course_professors: [], universities: [] }); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try { const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`); if (res.ok) setResults(await res.json()); } catch {}
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [q]);

  const saveRecentSearch = (term: string) => {
    try { const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5); localStorage.setItem("gmp_recent_searches", JSON.stringify(updated)); setRecentSearches(updated); } catch {}
  };

  const hasResults = results.professors.length > 0 || results.courses.length > 0 || results.course_professors.length > 0 || results.universities.length > 0;
  const qc = (v: number) => v >= 4 ? "text-green-600" : v >= 3 ? "text-amber-600" : "text-red-600";

  return (
    <div className="px-5 pb-10">
      <div className="pt-4 mb-5 flex items-center gap-3">
        <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all duration-150 active:scale-90" style={{ color: "var(--accent)" }}>←</Link>
        <div className="flex-1 flex items-center gap-2.5 rounded-xl px-4 py-3"
          style={{ background: "var(--accent-soft)", border: "2px solid var(--accent)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={t(lang, "search_placeholder")}
            className="flex-1 bg-transparent outline-none text-sm" style={{ color: "var(--text-primary)" }} />
          {q && <button onClick={() => setQ("")} style={{ color: "var(--text-tertiary)" }} className="text-sm">✕</button>}
        </div>
      </div>

      {/* Empty state */}
      {!q && !loading && (
        <div className="animate-fade-up">
          {recentSearches.length > 0 && (
            <div className="mb-6">
              <div className="section-label mb-3">{t(lang, "recent")}</div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <button key={term} onClick={() => setQ(term)}
                    className="pill">{term}</button>
                ))}
              </div>
            </div>
          )}
          <div className="card-flat p-5">
            <h3 className="font-display text-sm font-bold mb-3" style={{ color: "var(--accent)" }}>{t(lang, "search_tips")}</h3>
            <div className="space-y-2.5 text-xs" style={{ color: "var(--text-secondary)" }}>
              <div className="flex items-start gap-2"><span>🔤</span><span>{t(lang, "tip_professor")}</span></div>
              <div className="flex items-start gap-2"><span>📚</span><span>{t(lang, "tip_course")}</span></div>
              <div className="flex items-start gap-2"><span>🏫</span><span>{t(lang, "tip_browse")}</span></div>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="text-center py-8 text-sm animate-pulse" style={{ color: "var(--text-tertiary)" }}>Searching…</div>}

      {/* University results */}
      {results.universities.length > 0 && (
        <div className="mb-5 animate-fade-up">
          <div className="section-label mb-2">🏫 {t(lang, "universities")}</div>
          {results.universities.map((u: any) => (
            <Link key={u.id} href={`/u/${u.slug}`} onClick={() => saveRecentSearch(q.trim())}
              className="flex items-center gap-3 card-flat p-3.5 mb-2">
              <div className="flex-1">
                <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {lang === "ar" && u.name_ar ? u.name_ar : u.name_en}
                </div>
                {u.short_name && (
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{u.short_name}</span>
                )}
              </div>
              <span style={{ color: "var(--accent)" }}>→</span>
            </Link>
          ))}
        </div>
      )}

      {/* Course professor results */}
      {results.course_professors.length > 0 && (
        <div className="mb-5 animate-fade-up">
          <div className="section-label mb-2">👩‍🏫 {t(lang, "professors")} for this course</div>
          {results.course_professors.map((cp: any, i: number) => (
            <Link key={`${cp.professor_id}-${i}`} href={`/p/${cp.professor_slug}`} onClick={() => saveRecentSearch(q.trim())}
              className="flex items-center justify-between card-flat p-3.5 mb-2">
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{cp.professor_name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="pill">{cp.course_code}</span>
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{cp.department}</span>
                </div>
              </div>
              {cp.review_count > 0 && (
                <div className="text-right">
                  <div className={`text-lg font-extrabold font-display ${qc(cp.avg_quality)}`}>{Number(cp.avg_quality).toFixed(1)}</div>
                  <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{cp.review_count} {t(lang, "ratings")}</div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Course results */}
      {results.courses.length > 0 && (
        <div className="mb-5 animate-fade-up">
          <div className="section-label mb-2">📚 {t(lang, "courses")}</div>
          {results.courses.map((c: any) => (
            <Link key={c.id} href={`/c/${c.slug}`} onClick={() => saveRecentSearch(q.trim())}
              className="card-flat p-3.5 mb-2 block">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm" style={{ color: "var(--accent)" }}>{c.code}</span>
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>{c.title_en}</span>
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>{c.university_short || c.university} · {c.department || "General"}</div>
            </Link>
          ))}
        </div>
      )}

      {/* Professor results */}
      {results.professors.length > 0 && (
        <div className="animate-fade-up">
          <div className="section-label mb-2">👩‍🏫 {t(lang, "professors")}</div>
          {results.professors.map((p: any) => (
            <Link key={p.id} href={`/p/${p.slug}`} onClick={() => saveRecentSearch(q.trim())}
              className="flex items-center justify-between card-flat p-4 mb-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{p.name_en}</div>
                <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{p.department} · {p.university_short || p.university}</div>
                {p.top_tags && p.top_tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5">{p.top_tags.slice(0, 2).map((tag: string) => (
                    <span key={tag} className="pill">{tag}</span>
                  ))}</div>
                )}
              </div>
              {p.review_count > 0 && (
                <div className="text-right ml-3 shrink-0">
                  <div className={`text-lg font-extrabold font-display ${qc(p.avg_quality)}`}>{Number(p.avg_quality).toFixed(1)}</div>
                  <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{p.review_count} {t(lang, "ratings")}</div>
                  {p.would_take_again_pct !== null && p.would_take_again_pct > 0 && (
                    <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{Math.round(p.would_take_again_pct)}% {t(lang, "retake")}</div>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* No results */}
      {!loading && q.length > 0 && !hasResults && (
        <div className="text-center py-12 animate-fade-up">
          <div className="text-3xl mb-3">🔍</div>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{t(lang, "no_results")} "{q}"</p>
          <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>{t(lang, "try_different")}</p>
          <Link href="/" className="text-xs font-medium hover:underline" style={{ color: "var(--accent)" }}>{t(lang, "browse_instead")} →</Link>
        </div>
      )}
    </div>
  );
}
