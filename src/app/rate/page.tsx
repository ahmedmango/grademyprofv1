"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getAnonUserHash } from "@/lib/anon-identity";
import { fmtRating } from "@/lib/utils";
import { useApp } from "@/components/Providers";
import { VALID_TAGS } from "@/lib/constants";

const GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F", "W"];

function RateForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { lang } = useApp();

  const professorId = searchParams.get("professorId") || "";
  const courseId = searchParams.get("courseId") || "";
  const professorName = searchParams.get("professorName") || "";
  const courseName = searchParams.get("courseName") || "";

  const [step, setStep] = useState(1);
  const [quality, setQuality] = useState(0);
  const [difficulty, setDifficulty] = useState(0);
  const [wouldTakeAgain, setWouldTakeAgain] = useState<boolean | null>(null);
  const [grade, setGrade] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // If no professor selected, redirect to search
  useEffect(() => {
    if (!professorId || !courseId) {
      // Don't redirect yet — maybe they came directly
    }
  }, [professorId, courseId]);

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 3 ? [...prev, tag] : prev
    );
  };

  const canAdvance = () => {
    switch (step) {
      case 1: return quality > 0 && difficulty > 0;
      case 2: return grade.length > 0;
      case 3: return true; // tags + comment optional
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const hash = await getAnonUserHash();
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-anon-user-hash": hash },
        body: JSON.stringify({
          professor_id: professorId,
          course_id: courseId,
          rating_quality: quality,
          rating_difficulty: difficulty,
          would_take_again: wouldTakeAgain,
          grade_received: grade,
          tags,
          comment: comment.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to submit review");
      }
    } catch {
      setError("Connection failed. Please try again.");
    }
    setSubmitting(false);
  };

  // No professor selected — show message
  if (!professorId || !courseId) {
    return (
      <div className="px-5 pb-10 pt-8 text-center">
        <div className="text-4xl mb-3">✍️</div>
        <h1 className="font-display text-xl font-bold mb-2" style={{ color: "var(--accent)" }}>Rate a Professor</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          Find a professor first, then tap "Rate" on their profile page.
        </p>
        <Link href="/search" className="inline-block px-6 py-3 rounded-xl text-sm font-semibold"
          style={{ background: "var(--accent)", color: "#fff" }}>
          Search Professors →
        </Link>
      </div>
    );
  }

  // Success!
  if (success) {
    return (
      <div className="px-5 pb-10 pt-12 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="font-display text-xl font-bold mb-2" style={{ color: "var(--accent)" }}>Review Submitted!</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          Your review is pending moderation and will go live within 24 hours. Thank you for helping fellow students!
        </p>
        <div className="flex gap-3 justify-center">
          <Link href={`/p/${searchParams.get("professorSlug") || ""}`}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold card-flat">
            ← Back to Professor
          </Link>
          <Link href="/my-reviews" className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "var(--accent)", color: "#fff" }}>
            My Reviews
          </Link>
        </div>
      </div>
    );
  }

  const ratingLabel = (v: number) => v <= 1 ? "Awful" : v <= 2 ? "Poor" : v <= 3 ? "OK" : v <= 4 ? "Good" : "Amazing";

  return (
    <div className="px-5 pb-10">
      <div className="pt-4 mb-5 flex items-center gap-3">
        <button onClick={() => step > 1 ? setStep(step - 1) : router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all duration-150 active:scale-90" style={{ color: "var(--accent)" }}>←</button>
        <div className="flex-1">
          <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{professorName}</div>
          <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{courseName}</div>
        </div>
        <div className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>Step {step}/3</div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full mb-6" style={{ background: "var(--border)" }}>
        <div className="h-1 rounded-full transition-all duration-300" style={{ background: "var(--accent)", width: `${(step / 3) * 100}%` }} />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: "#7F1D1D30", color: "var(--rating-low)" }}>
          {error}
        </div>
      )}

      {/* STEP 1: Ratings */}
      {step === 1 && (
        <div className="space-y-6 animate-fade-up">
          <div>
            <label className="block text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
              Quality Rating * {quality > 0 && <span style={{ color: "var(--accent)" }}>— {ratingLabel(quality)}</span>}
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} onClick={() => setQuality(v)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                  style={quality === v
                    ? { background: "var(--accent)", color: "#fff" }
                    : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
                  }>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
              Difficulty Rating * {difficulty > 0 && <span style={{ color: "var(--accent)" }}>— {ratingLabel(difficulty)}</span>}
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} onClick={() => setDifficulty(v)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                  style={difficulty === v
                    ? { background: "var(--accent)", color: "#fff" }
                    : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
                  }>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Would you take this professor again?</label>
            <div className="flex gap-2">
              {[true, false].map((v) => (
                <button key={String(v)} onClick={() => setWouldTakeAgain(v)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={wouldTakeAgain === v
                    ? { background: "var(--accent)", color: "#fff" }
                    : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
                  }>
                  {v ? "👍 Yes" : "👎 No"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Grade */}
      {step === 2 && (
        <div className="animate-fade-up">
          <label className="block text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
            Grade Received *
          </label>
          <div className="flex flex-wrap gap-2">
            {GRADES.map((g) => (
              <button key={g} onClick={() => setGrade(g)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={grade === g
                  ? { background: "var(--accent)", color: "#fff" }
                  : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
                }>
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: Tags + Comment */}
      {step === 3 && (
        <div className="space-y-6 animate-fade-up">
          <div>
            <label className="block text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
              Tags (pick up to 3)
            </label>
            <div className="flex flex-wrap gap-2">
              {VALID_TAGS.map((tag) => (
                <button key={tag} onClick={() => toggleTag(tag)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={tags.includes(tag)
                    ? { background: "var(--accent)", color: "#fff" }
                    : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }
                  }>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
              Review (optional but helpful!)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What should other students know about this professor?"
              rows={4}
              maxLength={1000}
              className="w-full p-3.5 rounded-xl text-sm resize-none outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
            <div className="text-right text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>{comment.length}/1000</div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex gap-3">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)}
            className="flex-1 py-3 rounded-xl text-sm font-semibold card-flat">
            Back
          </button>
        )}
        {step < 3 ? (
          <button onClick={() => setStep(step + 1)} disabled={!canAdvance()}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#fff" }}>
            Next →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting || !canAdvance()}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#fff" }}>
            {submitting ? "Submitting…" : "Submit Review ✓"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function RatePage() {
  return (
    <Suspense fallback={<div className="px-5 py-12 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>Loading…</div>}>
      <RateForm />
    </Suspense>
  );
}
