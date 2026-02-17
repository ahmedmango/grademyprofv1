"use client";

import { useState, useEffect, useCallback } from "react";

type Review = {
  id: string;
  rating_quality: number;
  rating_difficulty: number;
  would_take_again: boolean | null;
  tags: string[];
  comment: string;
  status: string;
  toxicity_score: number;
  risk_flags: Record<string, boolean>;
  created_at: string;
  professors: { id: string; name_en: string; slug: string } | null;
  courses: { id: string; code: string; title_en: string } | null;
  universities: { id: string; name_en: string; slug: string } | null;
};

export default function ModerationPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("pending");
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const authHeader = useCallback(() => {
    const email = sessionStorage.getItem("admin_email");
    const secret = sessionStorage.getItem("admin_secret");
    return `Bearer ${secret}:${email}`;
  }, []);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    const res = await fetch(`/api/admin/mod-queue?status=${tab}&page=${page}`, {
      headers: { Authorization: authHeader() },
    });
    if (res.ok) {
      const data = await res.json();
      setReviews(data.reviews);
      setTotalPages(data.total_pages);
      setStatusCounts(data.status_counts || {});
    }
    setLoading(false);
  }, [tab, page, authHeader]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const performAction = async (reviewId: string, action: string) => {
    setActionLoading(reviewId);
    await fetch("/api/admin/review-action", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader() },
      body: JSON.stringify({ review_id: reviewId, action }),
    });
    setActionLoading(null);
    fetchQueue();
  };

  const bulkAction = async (action: string) => {
    if (selected.size === 0) return;
    setActionLoading("bulk");
    await fetch("/api/admin/review-action", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: authHeader() },
      body: JSON.stringify({ review_ids: Array.from(selected), action }),
    });
    setActionLoading(null);
    fetchQueue();
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === reviews.length) setSelected(new Set());
    else setSelected(new Set(reviews.map((r) => r.id)));
  };

  const tabs = [
    { key: "pending", label: "Pending", color: "bg-amber-500" },
    { key: "flagged", label: "Flagged", color: "bg-red-500" },
    { key: "live", label: "Live", color: "bg-green-500" },
    { key: "shadow", label: "Shadow", color: "bg-gray-400" },
    { key: "removed", label: "Removed", color: "bg-red-300" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Moderation Queue</h1>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{selected.size} selected</span>
            <button onClick={() => bulkAction("approve")} disabled={actionLoading === "bulk"}
              className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50">
              ✓ Approve All
            </button>
            <button onClick={() => bulkAction("reject")} disabled={actionLoading === "bulk"}
              className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50">
              ✕ Reject All
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              tab === t.key ? "bg-brand-500 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-brand-300"
            }`}
          >
            {t.label}
            {statusCounts[t.key] !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {statusCounts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">✨</div>
          <div>No {tab} reviews. {tab === "pending" ? "All caught up!" : ""}</div>
        </div>
      ) : (
        <>
          {/* Select all */}
          <div className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.size === reviews.length && reviews.length > 0}
              onChange={selectAll}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-500">Select all on this page</span>
          </div>

          {/* Review Cards */}
          <div className="space-y-3">
            {reviews.map((r) => (
              <ReviewModCard
                key={r.id}
                review={r}
                selected={selected.has(r.id)}
                onToggle={() => toggleSelect(r.id)}
                onAction={(action) => performAction(r.id, action)}
                loading={actionLoading === r.id}
                currentTab={tab}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg disabled:opacity-30"
              >
                ← Prev
              </button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReviewModCard({
  review, selected, onToggle, onAction, loading, currentTab,
}: {
  review: Review; selected: boolean; onToggle: () => void;
  onAction: (action: string) => void; loading: boolean; currentTab: string;
}) {
  const hasFlags = Object.keys(review.risk_flags || {}).length > 0;

  return (
    <div className={`bg-white rounded-xl border p-4 transition ${
      selected ? "border-brand-400 bg-brand-50/30" : hasFlags ? "border-red-200" : "border-gray-200"
    }`}>
      <div className="flex items-start gap-3">
        <input type="checkbox" checked={selected} onChange={onToggle} className="mt-1 rounded border-gray-300" />
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-brand-900">
                {review.professors?.name_en || "Unknown Prof"}
              </span>
              <span className="text-xs text-brand-500 bg-brand-50 px-2 py-0.5 rounded-md font-medium">
                {review.courses?.code || "—"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{review.universities?.name_en}</span>
              <span>·</span>
              <span>{new Date(review.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Scores */}
          <div className="flex items-center gap-4 mb-2">
            <span className="text-sm">
              Quality: <span className="font-bold" style={{ color: review.rating_quality >= 4 ? "#16A34A" : review.rating_quality >= 3 ? "#CA8A04" : "#DC2626" }}>
                {Number(review.rating_quality).toFixed(1)}
              </span>
            </span>
            <span className="text-sm">
              Difficulty: <span className="font-bold" style={{ color: review.rating_difficulty >= 4 ? "#DC2626" : review.rating_difficulty >= 3 ? "#CA8A04" : "#16A34A" }}>
                {Number(review.rating_difficulty).toFixed(1)}
              </span>
            </span>
            {review.would_take_again !== null && (
              <span className="text-sm">
                Would retake: <span className="font-medium">{review.would_take_again ? "Yes" : "No"}</span>
              </span>
            )}
          </div>

          {/* Tags */}
          {review.tags?.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-2">
              {review.tags.map((t) => (
                <span key={t} className="text-xs bg-brand-50 text-brand-500 px-2 py-0.5 rounded-md">{t}</span>
              ))}
            </div>
          )}

          {/* Comment */}
          {review.comment && (
            <p className="text-sm text-gray-700 leading-relaxed mb-2 whitespace-pre-wrap">{review.comment}</p>
          )}

          {/* Risk flags */}
          {hasFlags && (
            <div className="flex gap-1.5 flex-wrap mb-2">
              {Object.keys(review.risk_flags).map((flag) => (
                <span key={flag} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-md font-medium">
                  ⚠ {flag.replace(/_/g, " ")}
                </span>
              ))}
              <span className="text-xs text-red-400">
                Toxicity: {review.toxicity_score}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            {currentTab !== "live" && (
              <button onClick={() => onAction("approve")} disabled={loading}
                className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100 disabled:opacity-50 transition">
                ✓ Approve
              </button>
            )}
            {currentTab !== "removed" && (
              <button onClick={() => onAction("reject")} disabled={loading}
                className="px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 transition">
                ✕ Remove
              </button>
            )}
            {currentTab !== "shadow" && currentTab !== "removed" && (
              <button onClick={() => onAction("shadow")} disabled={loading}
                className="px-3 py-1.5 bg-gray-50 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50 transition">
                👁 Shadow
              </button>
            )}
            {currentTab !== "flagged" && currentTab !== "removed" && (
              <button onClick={() => onAction("flag")} disabled={loading}
                className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-100 disabled:opacity-50 transition">
                ⚑ Flag
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
