"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function SuggestForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = searchParams.get("type") || "professor";
  const universityId = searchParams.get("university") || "";
  const universityName = searchParams.get("universityName") || "";

  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [extra, setExtra] = useState(""); // course code
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!nameEn.trim() || nameEn.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name_en: nameEn.trim(),
          name_ar: nameAr.trim() || undefined,
          university_id: universityId || undefined,
          extra: extra.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to submit");
      }
    } catch {
      setError("Connection failed");
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="px-5 pb-10 pt-12 text-center max-w-md mx-auto">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="font-display text-xl font-bold mb-2" style={{ color: "var(--accent)" }}>
          {type === "professor" ? "Professor Added!" : type === "course" ? "Course Suggested!" : "University Suggested!"}
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          {type === "professor"
            ? "The professor has been added. You can now rate them!"
            : "Our team will review and add it shortly."
          }
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold card-flat">
            ← Go Back
          </button>
          <Link href="/" className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "var(--accent)", color: "#fff" }}>
            Home
          </Link>
        </div>
      </div>
    );
  }

  const labels: Record<string, { title: string; placeholder: string }> = {
    professor: { title: "Add a Professor", placeholder: "Professor name (English)" },
    course: { title: "Suggest a Course", placeholder: "Course title (English)" },
    university: { title: "Suggest a University", placeholder: "University name (English)" },
  };

  const { title, placeholder } = labels[type] || labels.professor;

  return (
    <div className="px-5 pb-10 pt-8 max-w-md mx-auto">
      <h1 className="font-display text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{title}</h1>
      {universityName && (
        <p className="text-xs mb-6" style={{ color: "var(--text-tertiary)" }}>at {universityName}</p>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Name (English) *</label>
          <input
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Name (Arabic) — optional</label>
          <input
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            placeholder="الاسم بالعربي"
            dir="rtl"
            className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
        </div>

        {type === "course" && (
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Course Code *</label>
            <input
              value={extra}
              onChange={(e) => setExtra(e.target.value.toUpperCase())}
              placeholder="e.g. CS101"
              className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl text-sm" style={{ background: "#7F1D1D30", color: "var(--rating-low)" }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || !nameEn.trim()}
          className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
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
