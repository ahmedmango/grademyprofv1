"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAnonUserHash } from "@/lib/anon-identity";
import { fmtRating } from "@/lib/utils";
import { VALID_TAGS } from "@/lib/constants";
import { useUser } from "@/components/UserProvider";

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
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState("");
  const { user, loading: userLoading } = useUser();

  useEffect(() => {
    if (userLoading || !user) return; // wait for auth; don't fetch if not logged in
    setFetchLoading(true);
    (async () => {
      try {
        const hash = await getAnonUserHash();
        const headers: Record<string, string> = {
          "x-anon-user-hash": hash,
          "x-user-id": user.id,
        };
        const res = await fetch("/api/my-reviews", { headers });
        if (res.ok) { const data = await res.json(); setReviews(data.reviews); }
        else setError("Failed to load your reviews");
      } catch { setError("Connection failed"); }
      setFetchLoading(false);
    })();
  }, [user?.id, userLoading]);

  const statusStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case "live": return { background: "#22C55E18", color: "#16A34A", border: "1px solid #22C55E40" };
      case "pending": case "flagged": return { background: "#F59E0B18", color: "#D97706", border: "1px solid #F59E0B40" };
      case "removed": return { background: "#EF444418", color: "#DC2626", border: "1px solid #EF444440" };
      default: return { background: "var(--border)", color: "var(--text-tertiary)", border: "1px solid var(--border)" };
    }
  };

  const qColor = (v: number) => v >= 4 ? "#22C55E" : v >= 3 ? "#EAB308" : "#EF4444";

  return (
    <div className="px-5 pb-10">
      <div className="pt-4 flex items-center gap-3 mb-6">
        <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all duration-150 active:scale-90" style={{ color: "var(--accent)" }}>←</Link>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Back to Home</span>
      </div>

      <h1 className="font-display text-2xl font-extrabold mb-1" style={{ color: "var(--accent)" }}>My Reviews</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Track the status of your submitted ratings. Reviews go live after moderation.</p>

      {userLoading ? (
        <div className="text-center py-16" style={{ color: "var(--text-tertiary)" }}>
          <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
          <p className="text-sm">Loading…</p>
        </div>
      ) : !user ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🔒</div>
          <h3 className="font-display text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>Login required</h3>
          <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>Sign in to see the reviews you've submitted.</p>
          <Link href="/auth" className="inline-block px-6 py-3 rounded-xl font-semibold text-sm transition" style={{ background: "var(--accent)", color: "#fff" }}>Sign In →</Link>
        </div>
      ) : fetchLoading ? (
        <div className="text-center py-16" style={{ color: "var(--text-tertiary)" }}><div className="text-2xl mb-2 animate-pulse">📝</div><p className="text-sm">Loading your reviews…</p></div>
      ) : error ? (
        <div className="text-center py-16" style={{ color: "#EF4444" }}><p className="text-sm">{error}</p></div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">✍️</div>
          <h3 className="font-display text-lg font-bold mb-1" style={{ color: "var(--accent)" }}>No reviews yet</h3>
          <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>Your ratings help hundreds of students pick the right professor.</p>
          <Link href="/search" className="inline-block px-6 py-3 rounded-xl font-semibold text-sm transition" style={{ background: "var(--accent)", color: "#fff" }}>Find a Professor to Rate</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} statusStyle={statusStyle} qColor={qColor}
              onUpdated={(updated) => setReviews((prev) => prev.map((rv) => rv.id === updated.id ? { ...rv, ...updated } : rv))} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review: r, statusStyle, qColor, onUpdated }: {
  review: MyReview;
  statusStyle: (s: string) => React.CSSProperties;
  qColor: (v: number) => string;
  onUpdated: (updated: Partial<MyReview> & { id: string }) => void;
}) {
  const { user } = useUser();
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
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-anon-user-hash": hash,
      };
      if (user?.id) headers["x-user-id"] = user.id;

      const res = await fetch("/api/review", {
        method: "PUT",
        headers,
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
          // If the review was live, it's now back under moderation
          ...(data.went_to_moderation ? { display_status: "pending", status_label: "Under Review" } : {}),
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
      <div className="rounded-2xl p-4 space-y-4" style={{ background: "var(--bg-surface)", border: "2px solid var(--accent)" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{r.professors?.name_en}</div>
            <div className="text-xs font-medium mt-0.5" style={{ color: "var(--accent)" }}>{r.courses?.code} · {r.universities?.name_en}</div>
          </div>
          <button onClick={() => { setEditing(false); setEditError(""); }}
            className="text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>Cancel</button>
        </div>

        {r.display_status === "live" && (
          <div className="p-2.5 rounded-xl text-xs" style={{ color: "#D97706", background: "#F59E0B15", border: "1px solid #F59E0B40" }}>
            ⚠️ Saving changes will send this review back under moderation until approved.
          </div>
        )}

        {editError && <div className="p-2.5 rounded-xl text-xs" style={{ color: "#DC2626", background: "#EF444415", border: "1px solid #EF444430" }}>{editError}</div>}

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
            Quality — {qualityLabel(editQuality)}
          </label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} onClick={() => setEditQuality(v)}
                className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                style={editQuality === v ? { background: "var(--accent)", color: "#fff" } : { background: "var(--border)", color: "var(--text-secondary)" }}>{v}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
            Difficulty — {difficultyLabel(editDifficulty)}
          </label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} onClick={() => setEditDifficulty(v)}
                className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                style={editDifficulty === v ? { background: "var(--accent)", color: "#fff" } : { background: "var(--border)", color: "var(--text-secondary)" }}>{v}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>Would take again?</label>
          <div className="flex gap-1.5">
            {[true, false].map((v) => (
              <button key={String(v)} onClick={() => setEditWouldTakeAgain(v)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                style={editWouldTakeAgain === v ? { background: "var(--accent)", color: "#fff" } : { background: "var(--border)", color: "var(--text-secondary)" }}>
                {v ? "👍 Yes" : "👎 No"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>Grade</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_GRADES.map((g) => (
              <button key={g} onClick={() => setEditGrade(g)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={editGrade === g ? { background: "var(--accent)", color: "#fff" } : { background: "var(--border)", color: "var(--text-secondary)" }}>{g}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>Tags (up to 3)</label>
          <div className="flex flex-wrap gap-1.5">
            {VALID_TAGS.map((tag) => (
              <button key={tag} onClick={() => toggleTag(tag)}
                className="px-2.5 py-1 rounded-md text-[10px] font-medium transition-all"
                style={editTags.includes(tag) ? { background: "var(--accent)", color: "#fff" } : { background: "var(--border)", color: "var(--text-secondary)" }}>{tag}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>Comment</label>
          <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)}
            placeholder="What should other students know?" rows={3} maxLength={1000}
            className="w-full p-3 rounded-xl text-sm resize-none outline-none"
            style={{ background: "var(--bg-page)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
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
    <div className="rounded-2xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <Link href={`/p/${r.professors?.slug}`} className="font-semibold text-sm transition" style={{ color: "var(--text-primary)" }}>
            {r.professors?.name_en || "Unknown Professor"}
          </Link>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>{r.courses?.code}</span>
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>·</span>
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{r.universities?.name_en}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button onClick={() => setEditing(true)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full transition"
              style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              Edit
            </button>
          )}
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={statusStyle(r.display_status)}>{r.status_label}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 mb-2">
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Quality: <span className="font-bold" style={{ color: qColor(r.rating_quality) }}>{fmtRating(r.rating_quality)}</span></span>
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Difficulty: <span className="font-bold" style={{ color: "var(--text-primary)" }}>{fmtRating(r.rating_difficulty)}</span></span>
        {r.would_take_again !== null && <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{r.would_take_again ? "👍 Would retake" : "👎 Wouldn't retake"}</span>}
      </div>
      {r.grade_received && (
        <div className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>Grade: <span className="font-semibold">{r.grade_received}</span></div>
      )}
      {r.tags?.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-2">{r.tags.map((t) => (
          <span key={t} className="text-[10px] px-2 py-0.5 rounded-md" style={{ color: "var(--accent)", background: "var(--accent-soft)" }}>{t}</span>
        ))}</div>
      )}
      {r.comment && <p className="text-sm leading-relaxed line-clamp-3" style={{ color: "var(--text-primary)" }}>{r.comment}</p>}
      <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
        <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{r.semester_window}</span>
      </div>
      {(r.display_status === "pending" || r.display_status === "flagged") && (
        <div className="mt-2 p-2.5 rounded-lg" style={{ background: "#F59E0B15", border: "1px solid #F59E0B30" }}>
          <p className="text-[11px] leading-relaxed" style={{ color: "#D97706" }}>⏳ Your review is being checked by our moderation team. Most reviews are approved within 24 hours.</p>
        </div>
      )}
      {r.display_status === "removed" && (
        <div className="mt-2 p-2.5 rounded-lg" style={{ background: "#EF444415", border: "1px solid #EF444430" }}>
          <p className="text-[11px] leading-relaxed" style={{ color: "#DC2626" }}>This review was rejected by our moderation team. It may have violated our community guidelines. You can submit a new review for this professor.</p>
        </div>
      )}
    </div>
  );
}
