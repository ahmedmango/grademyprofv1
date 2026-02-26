"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAnonUserHash } from "@/lib/anon-identity";
import { fmtRating } from "@/lib/utils";
import { VALID_TAGS } from "@/lib/constants";

const LETTER_GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F", "W"];
const CLASSIFICATION_GRADES = ["Distinction", "Merit", "Credit", "Pass", "Fail"];
const ALL_GRADES = [...LETTER_GRADES, ...CLASSIFICATION_GRADES];

type MyReview = {
  id: string; professor_id: string; course_id: string;
  rating_quality: number; rating_difficulty: number; would_take_again: boolean | null;
  grade_received: string | null; tags: string[]; comment: string;
  display_status: string; status_label: string;
  created_at: string; semester_window: string;
  professors: { name_en: string; slug: string } | null;
  courses: { code: string; title_en: string } | null;
  universities: { name_en: string } | null;
};

export default function MyReviewsPage() {
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const hash = await getAnonUserHash();
        const res = await fetch("/api/my-reviews", { headers: { "x-anon-user-hash": hash } });
        if (res.ok) { const data = await res.json(); setReviews(data.reviews); }
        else setError("Failed to load your reviews");
      } catch { setError("Connection failed"); }
      setLoading(false);
    })();
  }, []);

  const statusStyle = (status: string) => {
    switch (status) {
      case "live": return "bg-green-50 text-green-700 border-green-200";
      case "pending": case "flagged": return "bg-amber-50 text-amber-700 border-amber-200";
      case "removed": return "bg-red-50 text-red-600 border-red-200";
      default: return "bg-gray-50 text-gray-500 border-gray-200";
    }
  };

  const qc = (v: number) => v >= 4 ? "text-green-600" : v >= 3 ? "text-amber-600" : "text-red-600";

  return (
    <div className="px-5 pb-10">
      <div className="pt-4 flex items-center gap-3 mb-6">
        <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all duration-150 active:scale-90" style={{ color: "var(--accent)" }}>←</Link>
        <span className="text-xs text-gray-400">Back to Home</span>
      </div>

      <h1 className="font-display text-2xl font-extrabold text-brand-600 mb-1">My Reviews</h1>
      <p className="text-sm text-gray-500 mb-6">Track the status of your submitted ratings. Reviews go live after moderation.</p>

      {loading ? (
        <div className="text-center py-16 text-gray-400"><div className="text-2xl mb-2 animate-pulse">📝</div><p className="text-sm">Loading your reviews…</p></div>
      ) : error ? (
        <div className="text-center py-16 text-red-400"><p className="text-sm">{error}</p></div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">✍️</div>
          <h3 className="font-display text-lg font-bold text-brand-600 mb-1">No reviews yet</h3>
          <p className="text-sm text-gray-500 mb-5">Your ratings help hundreds of students pick the right professor.</p>
          <Link href="/search" className="inline-block px-6 py-3 bg-brand-500 text-white rounded-xl font-semibold text-sm hover:bg-brand-600 transition">Find a Professor to Rate</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} statusStyle={statusStyle} qc={qc}
              onUpdated={(updated) => setReviews((prev) => prev.map((rv) => rv.id === updated.id ? { ...rv, ...updated } : rv))} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review: r, statusStyle, qc, onUpdated }: {
  review: MyReview;
  statusStyle: (s: string) => string;
  qc: (v: number) => string;
  onUpdated: (updated: Partial<MyReview> & { id: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editQuality, setEditQuality] = useState(r.rating_quality);
  const [editDifficulty, setEditDifficulty] = useState(r.rating_difficulty);
  const [editWouldTakeAgain, setEditWouldTakeAgain] = useState(r.would_take_again);
  const [editGrade, setEditGrade] = useState(r.grade_received || "");
  const [editTags, setEditTags] = useState<string[]>(r.tags || []);
  const [editComment, setEditComment] = useState(r.comment || "");

  const canEdit = r.display_status !== "removed";

  const toggleTag = (tag: string) => {
    setEditTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 3 ? [...prev, tag] : prev
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setEditError("");
    try {
      const hash = await getAnonUserHash();
      const res = await fetch("/api/review", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-anon-user-hash": hash },
        body: JSON.stringify({
          review_id: r.id,
          rating_quality: editQuality,
          rating_difficulty: editDifficulty,
          would_take_again: editWouldTakeAgain,
          grade_received: editGrade,
          tags: editTags,
          comment: editComment.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onUpdated({
          id: r.id,
          rating_quality: editQuality,
          rating_difficulty: editDifficulty,
          would_take_again: editWouldTakeAgain,
          grade_received: editGrade,
          tags: editTags,
          comment: editComment.trim(),
        });
        setEditing(false);
      } else {
        setEditError(data.error || "Failed to save changes");
      }
    } catch {
      setEditError("Connection failed");
    }
    setSaving(false);
  };

  const qualityLabel = (v: number) => v <= 1 ? "Awful" : v <= 2 ? "Poor" : v <= 3 ? "OK" : v <= 4 ? "Good" : "Amazing";
  const difficultyLabel = (v: number) => v <= 1 ? "Very Easy" : v <= 2 ? "Easy" : v <= 3 ? "Medium" : v <= 4 ? "Hard" : "Very Difficult";

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border-2 border-brand-200 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm text-brand-900">{r.professors?.name_en}</div>
            <div className="text-xs text-brand-500 font-medium mt-0.5">{r.courses?.code} · {r.universities?.name_en}</div>
          </div>
          <button onClick={() => { setEditing(false); setEditError(""); }}
            className="text-xs font-semibold text-gray-400 hover:text-gray-600">Cancel</button>
        </div>

        {editError && <div className="p-2.5 rounded-xl text-xs text-red-600 bg-red-50 border border-red-100">{editError}</div>}

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2 text-gray-500">
            Quality — {qualityLabel(editQuality)}
          </label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} onClick={() => setEditQuality(v)}
                className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                style={editQuality === v ? { background: "var(--accent)", color: "#fff" } : { background: "#f5f5f5", color: "#666" }}>{v}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2 text-gray-500">
            Difficulty — {difficultyLabel(editDifficulty)}
          </label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} onClick={() => setEditDifficulty(v)}
                className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                style={editDifficulty === v ? { background: "var(--accent)", color: "#fff" } : { background: "#f5f5f5", color: "#666" }}>{v}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2 text-gray-500">Would take again?</label>
          <div className="flex gap-1.5">
            {[true, false].map((v) => (
              <button key={String(v)} onClick={() => setEditWouldTakeAgain(v)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                style={editWouldTakeAgain === v ? { background: "var(--accent)", color: "#fff" } : { background: "#f5f5f5", color: "#666" }}>
                {v ? "👍 Yes" : "👎 No"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2 text-gray-500">Grade</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_GRADES.map((g) => (
              <button key={g} onClick={() => setEditGrade(g)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={editGrade === g ? { background: "var(--accent)", color: "#fff" } : { background: "#f5f5f5", color: "#666" }}>{g}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2 text-gray-500">Tags (up to 3)</label>
          <div className="flex flex-wrap gap-1.5">
            {VALID_TAGS.map((tag) => (
              <button key={tag} onClick={() => toggleTag(tag)}
                className="px-2.5 py-1 rounded-md text-[10px] font-medium transition-all"
                style={editTags.includes(tag) ? { background: "var(--accent)", color: "#fff" } : { background: "#f5f5f5", color: "#666" }}>{tag}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2 text-gray-500">Comment</label>
          <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)}
            placeholder="What should other students know?" rows={3} maxLength={1000}
            autoCorrect="off" autoCapitalize="off" spellCheck={false}
            className="w-full p-3 rounded-xl text-sm resize-none outline-none border border-gray-200" />
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#fff" }}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-brand-100 p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <Link href={`/p/${r.professors?.slug}`} className="font-semibold text-sm text-brand-900 hover:text-brand-500 transition">
            {r.professors?.name_en || "Unknown Professor"}
          </Link>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-brand-500 font-medium">{r.courses?.code}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-400">{r.universities?.name_en}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button onClick={() => setEditing(true)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:text-brand-500 hover:border-brand-200 transition">
              Edit
            </button>
          )}
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${statusStyle(r.display_status)}`}>{r.status_label}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 mb-2">
        <span className="text-sm">Quality: <span className={`font-bold ${qc(r.rating_quality)}`}>{fmtRating(r.rating_quality)}</span></span>
        <span className="text-sm">Difficulty: <span className="font-bold text-gray-700">{fmtRating(r.rating_difficulty)}</span></span>
        {r.would_take_again !== null && <span className="text-xs text-gray-500">{r.would_take_again ? "👍 Would retake" : "👎 Wouldn't retake"}</span>}
      </div>
      {r.grade_received && (
        <div className="text-xs text-gray-500 mb-2">Grade: <span className="font-semibold">{r.grade_received}</span></div>
      )}
      {r.tags?.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-2">{r.tags.map((t) => (
          <span key={t} className="text-[10px] text-brand-500 bg-brand-50 px-2 py-0.5 rounded-md">{t}</span>
        ))}</div>
      )}
      {r.comment && <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{r.comment}</p>}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
        <span className="text-[10px] text-gray-400">{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        <span className="text-[10px] text-gray-400">{r.semester_window}</span>
      </div>
      {(r.display_status === "pending" || r.display_status === "flagged") && (
        <div className="mt-2 p-2.5 bg-amber-50/50 rounded-lg border border-amber-100">
          <p className="text-[11px] text-amber-700 leading-relaxed">⏳ Your review is being checked by our moderation team. Most reviews are approved within 24 hours.</p>
        </div>
      )}
      {r.display_status === "removed" && (
        <div className="mt-2 p-2.5 bg-red-50/50 rounded-lg border border-red-100">
          <p className="text-[11px] text-red-600 leading-relaxed">This review was rejected by our moderation team. It may have violated our community guidelines. You can submit a new review for this professor.</p>
        </div>
      )}
    </div>
  );
}
