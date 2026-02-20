"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

type SearchResults = {
  professors: any[];
  courses: any[];
  course_professors: any[];
};

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults>({ professors: [], courses: [], course_professors: [] });
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    try { const saved = localStorage.getItem("gmp_recent_searches"); if (saved) setRecentSearches(JSON.parse(saved).slice(0, 5)); } catch {}
  }, []);

  useEffect(() => {
    if (q.trim().length < 1) { setResults({ professors: [], courses: [], course_professors: [] }); return; }
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

  const hasResults = results.professors.length > 0 || results.courses.length > 0 || results.course_professors.length > 0;
  const qc = (v: number) => v >= 4 ? "text-green-600" : v >= 3 ? "text-amber-600" : "text-red-600";

  return (
    <div className="px-5 pb-10">
      <div className="pt-4 mb-5 flex items-center gap-3">
        <Link href="/" className="text-gray-400 text-lg">←</Link>
        <div className="flex-1 flex items-center gap-2.5 bg-brand-50/60 rounded-xl px-4 py-3 border-2 border-brand-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Professor name or course code…"
            className="flex-1 bg-transparent outline-none text-brand-900 text-sm placeholder:text-gray-400" />
          {q && <button onClick={() => setQ("")} className="text-gray-400 text-sm">✕</button>}
        </div>
      </div>

      {!q && !loading && (
        <div className="animate-fade-up">
          {recentSearches.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-bold tracking-wider uppercase text-gray-400 mb-3">Recent</h2>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <button key={term} onClick={() => setQ(term)}
                    className="px-3 py-1.5 bg-brand-50 text-brand-500 text-xs font-medium rounded-lg border border-brand-100 hover:border-brand-300 transition">{term}</button>
                ))}
              </div>
            </div>
          )}
          <div className="bg-brand-50/40 rounded-2xl p-5 border border-brand-100">
            <h3 className="font-display text-sm font-bold text-brand-600 mb-3">Search Tips</h3>
            <div className="space-y-2.5 text-xs text-gray-600">
              <div className="flex items-start gap-2"><span className="text-brand-400 mt-0.5">🔤</span><span>Type a <span className="font-medium text-brand-500">professor name</span> to see their ratings and reviews</span></div>
              <div className="flex items-start gap-2"><span className="text-brand-400 mt-0.5">📚</span><span>Search by <span className="font-medium text-brand-500">course code</span> (e.g. CS 301) to see all professors who teach it</span></div>
              <div className="flex items-start gap-2"><span className="text-brand-400 mt-0.5">🏫</span><span>Or <Link href="/" className="text-brand-500 font-medium underline">browse by university</Link> from the home page</span></div>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="text-center py-8 text-gray-400 text-sm animate-pulse">Searching…</div>}

      {results.course_professors.length > 0 && (
        <div className="mb-6 animate-fade-up">
          <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">👩‍🏫 Professors for this course</h2>
          {results.course_professors.map((cp: any, i: number) => (
            <Link key={`${cp.professor_id}-${i}`} href={`/p/${cp.professor_slug}`} onClick={() => saveRecentSearch(q.trim())}
              className="flex items-center justify-between bg-white rounded-xl p-3.5 mb-2 border border-brand-100 hover:border-brand-400 transition">
              <div>
                <div className="text-sm font-semibold text-brand-900">{cp.professor_name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-brand-500 font-medium bg-brand-50 px-1.5 py-0.5 rounded">{cp.course_code}</span>
                  <span className="text-xs text-gray-400">{cp.department}</span>
                </div>
              </div>
              {cp.review_count > 0 && (
                <div className="text-right">
                  <div className={`text-lg font-extrabold font-display ${qc(cp.avg_quality)}`}>{Number(cp.avg_quality).toFixed(1)}</div>
                  <div className="text-[10px] text-gray-400">{cp.review_count} ratings</div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {results.courses.length > 0 && (
        <div className="mb-6 animate-fade-up">
          <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">Courses</h2>
          {results.courses.map((c: any) => (
            <Link key={c.id} href={`/c/${c.slug}`} onClick={() => saveRecentSearch(q.trim())}
              className="block bg-white rounded-xl p-3.5 mb-2 border border-brand-100 hover:border-brand-400 transition">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-brand-500">{c.code}</span>
                <span className="text-sm text-gray-600">{c.title_en}</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">{c.university} · {c.department || "General"}</div>
            </Link>
          ))}
        </div>
      )}

      {results.professors.length > 0 && (
        <div className="animate-fade-up">
          <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">Professors</h2>
          {results.professors.map((p: any) => (
            <Link key={p.id} href={`/p/${p.slug}`} onClick={() => saveRecentSearch(q.trim())}
              className="flex items-center justify-between bg-white rounded-xl p-4 mb-2 border border-brand-100 hover:border-brand-400 transition">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-brand-900">{p.name_en}</div>
                <div className="text-xs text-gray-400">{p.department} · {p.university}</div>
                {p.top_tags && p.top_tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5">{p.top_tags.slice(0, 2).map((tag: string) => (
                    <span key={tag} className="text-[10px] text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">{tag}</span>
                  ))}</div>
                )}
              </div>
              {p.review_count > 0 && (
                <div className="text-right ml-3 shrink-0">
                  <div className={`text-lg font-extrabold font-display ${qc(p.avg_quality)}`}>{Number(p.avg_quality).toFixed(1)}</div>
                  <div className="text-[10px] text-gray-400">{p.review_count} ratings</div>
                  {p.would_take_again_pct !== null && p.would_take_again_pct > 0 && (
                    <div className="text-[10px] text-gray-400">{Math.round(p.would_take_again_pct)}% retake</div>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {!loading && q.length > 0 && !hasResults && (
        <div className="text-center py-12 text-gray-400 animate-fade-up">
          <div className="text-3xl mb-3">🔍</div>
          <p className="text-sm font-medium mb-1">No results for &ldquo;{q}&rdquo;</p>
          <p className="text-xs text-gray-400 mb-4">Try a different spelling or course code</p>
          <Link href="/" className="text-xs text-brand-500 font-medium hover:underline">Browse by university instead →</Link>
        </div>
      )}
    </div>
  );
}
