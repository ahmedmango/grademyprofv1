"use client";

import { useState, Suspense, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

type ProfEntry = { nameEn: string; nameAr: string };

function SuggestForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = searchParams.get("type") || "professor";
  const universityId = searchParams.get("university") || "";
  const universityName = searchParams.get("universityName") || "";

  // --- Multi-professor state ---
  const [professors, setProfessors] = useState<ProfEntry[]>([{ nameEn: "", nameAr: "" }]);
  const [activeIdx, setActiveIdx] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  // --- Single-item state (course / university) ---
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [extra, setExtra] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successCount, setSuccessCount] = useState(0);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<{ name: string; ok: boolean; msg: string }[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [professors.length]);

  const updateProf = (idx: number, field: keyof ProfEntry, value: string) => {
    setProfessors((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const addAnother = () => {
    const current = professors[activeIdx];
    if (!current.nameEn.trim() || current.nameEn.trim().length < 2) {
      setError("Enter at least 2 characters before adding another");
      return;
    }
    setError("");
    setProfessors((prev) => [...prev, { nameEn: "", nameAr: "" }]);
    setActiveIdx(professors.length);
  };

  const removeProf = (idx: number) => {
    if (professors.length <= 1) return;
    const next = professors.filter((_, i) => i !== idx);
    setProfessors(next);
    setActiveIdx(Math.min(activeIdx, next.length - 1));
  };

  const handleSubmitProfessors = async () => {
    const valid = professors.filter((p) => p.nameEn.trim().length >= 2);
    if (valid.length === 0) { setError("Add at least one professor name"); return; }
    setSubmitting(true);
    setError("");

    const res: { name: string; ok: boolean; msg: string }[] = [];
    let okCount = 0;

    for (const p of valid) {
      try {
        const resp = await fetch("/api/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "professor",
            name_en: p.nameEn.trim(),
            name_ar: p.nameAr.trim() || undefined,
            university_id: universityId || undefined,
          }),
        });
        const data = await resp.json();
        if (resp.ok) {
          res.push({ name: p.nameEn.trim(), ok: true, msg: "Added" });
          okCount++;
        } else {
          res.push({ name: p.nameEn.trim(), ok: false, msg: data.error || "Failed" });
        }
      } catch {
        res.push({ name: p.nameEn.trim(), ok: false, msg: "Connection failed" });
      }
    }

    setResults(res);
    setSuccessCount(okCount);
    setDone(true);
    setSubmitting(false);
  };

  const handleSubmitSingle = async () => {
    if (!nameEn.trim() || nameEn.trim().length < 2) { setError("Name must be at least 2 characters"); return; }
    setSubmitting(true);
    setError("");
    try {
      const resp = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name_en: nameEn.trim(), name_ar: nameAr.trim() || undefined, university_id: universityId || undefined, extra: extra.trim() || undefined }),
      });
      const data = await resp.json();
      if (resp.ok) { setSuccessCount(1); setDone(true); }
      else { setError(data.error || "Failed to submit"); }
    } catch { setError("Connection failed"); }
    setSubmitting(false);
  };

  // --- Done screen ---
  if (done) {
    const isProfessor = type === "professor";
    return (
      <div className="px-5 pb-10 pt-12 max-w-md mx-auto animate-fade-up">
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "#22C55E20" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="font-display text-xl font-bold mb-2" style={{ color: "var(--accent)" }}>
            {isProfessor
              ? successCount === 1 ? "Professor Added!" : `${successCount} Professors Added!`
              : type === "course" ? "Course Suggested!" : "University Suggested!"}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {isProfessor ? "You can now rate them!" : "Our team will review and add it shortly."}
          </p>
        </div>

        {isProfessor && results.length > 1 && (
          <div className="mb-6 space-y-2">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl text-xs"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                {r.ok ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                )}
                <span className="flex-1 font-semibold" style={{ color: "var(--text-primary)" }}>{r.name}</span>
                <span style={{ color: r.ok ? "#22C55E" : "#EF4444" }}>{r.msg}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={() => router.back()} className="px-5 py-2.5 rounded-xl text-sm font-semibold card-flat">
            ← Go Back
          </button>
          <Link href="/" className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--accent)", color: "#fff" }}>
            Home
          </Link>
        </div>
      </div>
    );
  }

  const labels: Record<string, { title: string; placeholder: string }> = {
    professor: { title: "Add Professors", placeholder: "Professor name (English)" },
    course: { title: "Suggest a Course", placeholder: "Course title (English)" },
    university: { title: "Suggest a University", placeholder: "University name (English)" },
  };
  const { title, placeholder } = labels[type] || labels.professor;

  // --- Professor multi-add UI ---
  if (type === "professor") {
    const validCount = professors.filter((p) => p.nameEn.trim().length >= 2).length;

    return (
      <div className="px-5 pb-10 pt-8 max-w-md mx-auto">
        <h1 className="font-display text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{title}</h1>
        {universityName && <p className="text-xs mb-5" style={{ color: "var(--text-tertiary)" }}>at {universityName}</p>}

        <div className="space-y-2.5">
          {professors.map((p, idx) => {
            const isActive = idx === activeIdx;
            const hasName = p.nameEn.trim().length >= 2;

            if (!isActive) {
              return (
                <div key={idx}
                  className="flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                  onClick={() => setActiveIdx(idx)}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: hasName ? "#22C55E20" : "var(--accent-soft)", color: hasName ? "#22C55E" : "var(--accent)" }}>
                    {hasName ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>
                  <span className="flex-1 text-sm font-semibold truncate" style={{ color: hasName ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                    {p.nameEn.trim() || "Untitled professor"}
                  </span>
                  {professors.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); removeProf(idx); }}
                      className="text-xs p-1 rounded-lg transition-all hover:bg-red-50"
                      style={{ color: "var(--text-tertiary)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div key={idx} className="rounded-xl p-4 space-y-3 animate-fade-up"
                style={{ background: "var(--bg-surface)", border: "1.5px solid var(--accent)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                    Professor {idx + 1}
                  </span>
                  {professors.length > 1 && (
                    <button onClick={() => removeProf(idx)}
                      className="text-[10px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
                      Remove
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Name (English) *</label>
                  <input value={p.nameEn} onChange={(e) => updateProf(idx, "nameEn", e.target.value)} placeholder={placeholder}
                    autoFocus
                    className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                    style={{ background: "var(--bg-surface-alt)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Name (Arabic) — optional</label>
                  <input value={p.nameAr} onChange={(e) => updateProf(idx, "nameAr", e.target.value)} placeholder="الاسم بالعربي" dir="rtl"
                    className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                    style={{ background: "var(--bg-surface-alt)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
              </div>
            );
          })}
        </div>

        <div ref={bottomRef} />

        <button onClick={addAnother}
          className="w-full mt-3 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] flex items-center justify-center gap-1.5"
          style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px dashed var(--accent)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add another professor
        </button>

        {error && <div className="mt-3 p-3 rounded-xl text-sm" style={{ background: "#7F1D1D30", color: "var(--rating-low)" }}>{error}</div>}

        <button onClick={handleSubmitProfessors} disabled={submitting || validCount === 0}
          className="w-full mt-4 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#fff" }}>
          {submitting ? "Adding…" : validCount <= 1 ? "Add Professor" : `Add ${validCount} Professors`}
        </button>

        <div className="mt-6 text-center">
          <Link href="/" className="text-xs" style={{ color: "var(--text-tertiary)" }}>← Back to Home</Link>
        </div>
      </div>
    );
  }

  // --- Single-item UI (course / university) ---
  return (
    <div className="px-5 pb-10 pt-8 max-w-md mx-auto">
      <h1 className="font-display text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{title}</h1>
      {universityName && <p className="text-xs mb-6" style={{ color: "var(--text-tertiary)" }}>at {universityName}</p>}

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Name (English) *</label>
          <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder={placeholder}
            className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Name (Arabic) — optional</label>
          <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="الاسم بالعربي" dir="rtl"
            className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </div>
        {type === "course" && (
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Course Code *</label>
            <input value={extra} onChange={(e) => setExtra(e.target.value.toUpperCase())} placeholder="e.g. CS101"
              className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </div>
        )}
        {error && <div className="p-3 rounded-xl text-sm" style={{ background: "#7F1D1D30", color: "var(--rating-low)" }}>{error}</div>}
        <button onClick={handleSubmitSingle} disabled={submitting || !nameEn.trim()}
          className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#fff" }}>
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </div>
      <div className="mt-6 text-center">
        <Link href="/" className="text-xs" style={{ color: "var(--text-tertiary)" }}>← Back to Home</Link>
      </div>
    </div>
  );
}

export default function SuggestPage() {
  return (
    <Suspense fallback={<div className="px-5 py-12 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>Loading…</div>}>
      <SuggestForm />
    </Suspense>
  );
}
