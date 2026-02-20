"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAnonUserHash } from "@/lib/anon-identity";
import { fmtRating } from "@/lib/utils";

type MyReview = {
  id: string; rating_quality: number; rating_difficulty: number; would_take_again: boolean | null;
  tags: string[]; comment: string; display_status: string; status_label: string;
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
      default: return "bg-gray-50 text-gray-500 border-gray-200";
    }
  };

  const qc = (v: number) => v >= 4 ? "text-green-600" : v >= 3 ? "text-amber-600" : "text-red-600";

  return (
    <div className="px-5 pb-10">
      <div className="pt-4 flex items-center gap-3 mb-6">
        <Link href="/" className="text-gray-400 text-lg">←</Link>
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
            <div key={r.id} className="bg-white rounded-2xl border border-brand-100 p-4">
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
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${statusStyle(r.display_status)}`}>{r.status_label}</span>
              </div>
              <div className="flex items-center gap-4 mb-2">
                <span className="text-sm">Quality: <span className={`font-bold ${qc(r.rating_quality)}`}>{fmtRating(r.rating_quality)}</span></span>
                <span className="text-sm">Difficulty: <span className="font-bold text-gray-700">{fmtRating(r.rating_difficulty)}</span></span>
                {r.would_take_again !== null && <span className="text-xs text-gray-500">{r.would_take_again ? "👍 Would retake" : "👎 Wouldn't retake"}</span>}
              </div>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
