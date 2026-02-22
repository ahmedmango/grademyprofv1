"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useApp } from "@/components/Providers";
import AppleLogo from "@/components/AppleLogo";

type SuggestType = "professor" | "university" | "course";

function SuggestForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { lang } = useApp();

  const initialType = (searchParams.get("type") as SuggestType) || "professor";
  const uniId = searchParams.get("university") || "";
  const uniName = searchParams.get("universityName") || "";

  const [type, setType] = useState<SuggestType>(initialType);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [extra, setExtra] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name_en: name.trim(),
          name_ar: nameAr.trim() || null,
          university_id: uniId || null,
          extra: extra.trim() || null,
        }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to submit");
      }
    } catch {
      setError("Connection failed");
    }
    setSubmitting(false);
  };

  if (done) {
    return (
      <div className="px-5 pb-10 pt-12 text-center">
        <AppleLogo size={48} color="var(--rating-high)" />
        <h2 className="font-display text-lg font-bold mt-3 mb-2" style={{ color: "var(--accent)" }}>
          {type === "university" ? "University" : type === "professor" ? "Professor" : "Course"} Suggested!
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          Our team will review and add it shortly.
        </p>
        <button onClick={() => router.back()}
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
          style={{ background: "var(--accent)", color: "#fff" }}>
          ← Go Back
        </button>
      </div>
    );
  }

  const labels: Record<SuggestType, { title: string; placeholder: string; extraLabel?: string; extraPlaceholder?: string }> = {
    professor: {
      title: "Add a Professor",
      placeholder: "e.g. Dr. Ahmed Al-Khalifa",
      extraLabel: "Department (optional)",
      extraPlaceholder: "e.g. Computer Science",
    },
    university: {
      title: "Add a University",
      placeholder: "e.g. Bahrain University College",
    },
    course: {
      title: "Add a Course",
      placeholder: "e.g. Data Structures",
      extraLabel: "Course Code",
      extraPlaceholder: "e.g. CS 201",
    },
  };

  const l = labels[type];

  return (
    <div className="px-5 pb-10">
      <div className="pt-4 mb-5 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all duration-150 active:scale-90" style={{ color: "var(--accent)" }}>←</button>
        <h1 className="font-display font-bold text-base" style={{ color: "var(--text-primary)" }}>{l.title}</h1>
      </div>

      {uniName && type !== "university" && (
        <div className="mb-4 px-3 py-2 rounded-lg text-xs" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
          at {uniName}
        </div>
      )}

      {!searchParams.get("type") && (
        <div className="flex gap-1.5 mb-5">
          {(["professor", "course", "university"] as const).map((t) => (
            <button key={t} onClick={() => setType(t)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={type === t
                ? { background: "var(--accent)", color: "#fff" }
                : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
              }>
              {t === "professor" ? "Professor" : t === "course" ? "Course" : "University"}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Name (English) *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={l.placeholder}
            className="w-full px-3.5 py-3 rounded-xl text-sm outline-none transition-all"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Name (Arabic) — optional</label>
          <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="الاسم بالعربي" dir="rtl"
            className="w-full px-3.5 py-3 rounded-xl text-sm outline-none transition-all"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </div>
        {l.extraLabel && (
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>{l.extraLabel}</label>
            <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder={l.extraPlaceholder}
              className="w-full px-3.5 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </div>
        )}
        {error && (
          <div className="p-3 rounded-xl text-sm" style={{ background: "#7F1D1D30", color: "var(--rating-low)" }}>{error}</div>
        )}
        <button onClick={handleSubmit} disabled={!name.trim() || submitting}
          className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#fff" }}>
          {submitting ? "Submitting..." : "Submit Suggestion"}
        </button>
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
