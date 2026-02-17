"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ professors: any[]; courses: any[] }>({ professors: [], courses: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (q.trim().length < 1) { setResults({ professors: [], courses: [] }); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) setResults(await res.json());
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="px-5 pb-10">
      <div className="pt-4 mb-5 flex items-center gap-3">
        <Link href="/" className="text-gray-400 text-lg">←</Link>
        <div className="flex-1 flex items-center gap-2.5 bg-brand-50/60 rounded-xl px-4 py-3 border-2 border-brand-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Professor name or course code…"
            className="flex-1 bg-transparent outline-none text-brand-900 text-sm placeholder:text-gray-400" />
          {q && <button onClick={() => setQ("")} className="text-gray-400 text-sm">✕</button>}
        </div>
      </div>

      {loading && <div className="text-center py-8 text-gray-400 text-sm">Searching…</div>}

      {results.courses.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">Courses</h2>
          {results.courses.map((c: any) => (
            <div key={c.id} className="bg-white rounded-xl p-3.5 mb-2 border border-brand-100 hover:border-brand-400 transition">
              <span className="font-semibold text-sm text-brand-500">{c.code}</span>
              <span className="text-sm text-gray-500 ml-2">{c.title_en}</span>
              <div className="text-xs text-gray-400 mt-1">{c.universities?.name_en}</div>
            </div>
          ))}
        </div>
      )}

      {results.professors.length > 0 && (
        <div>
          <h2 className="text-xs font-bold tracking-wider uppercase text-brand-500 mb-3">Professors</h2>
          {results.professors.map((p: any) => {
            const agg = p.aggregates_professor;
            const avgQ = agg?.avg_quality || agg?.[0]?.avg_quality || 0;
            const count = agg?.review_count || agg?.[0]?.review_count || 0;
            const qc = avgQ >= 4 ? "text-green-600" : avgQ >= 3 ? "text-amber-600" : "text-red-600";
            return (
              <Link key={p.id} href={`/p/${p.slug}`}
                className="flex items-center justify-between bg-white rounded-xl p-4 mb-2 border border-brand-100 hover:border-brand-400 transition">
                <div>
                  <div className="text-sm font-semibold text-brand-900">{p.name_en}</div>
                  <div className="text-xs text-gray-400">{p.departments?.name_en} · {p.universities?.name_en}</div>
                </div>
                {count > 0 && (
                  <div className="text-right">
                    <div className={`text-lg font-extrabold font-display ${qc}`}>{Number(avgQ).toFixed(1)}</div>
                    <div className="text-[10px] text-gray-400">{count} ratings</div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {!loading && q.length > 0 && results.professors.length === 0 && results.courses.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-3xl mb-3">🔍</div>
          <p className="text-sm">No results for &ldquo;{q}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
