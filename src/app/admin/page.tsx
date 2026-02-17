"use client";

import { useState, useEffect } from "react";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const email = sessionStorage.getItem("admin_email");
    const secret = sessionStorage.getItem("admin_secret");
    const res = await fetch("/api/admin/stats", {
      headers: { Authorization: `Bearer ${secret}:${email}` },
    });
    if (res.ok) setStats(await res.json());
    setLoading(false);
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading...</div>;
  if (!stats) return <div className="text-center py-20 text-red-400">Failed to load stats</div>;

  const sc = stats.status_counts || {};

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-900 mb-6">Dashboard</h1>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Pending", value: sc.pending || 0, color: "text-amber-600 bg-amber-50 border-amber-200" },
          { label: "Flagged", value: sc.flagged || 0, color: "text-red-600 bg-red-50 border-red-200" },
          { label: "Live", value: sc.live || 0, color: "text-green-600 bg-green-50 border-green-200" },
          { label: "Shadow", value: sc.shadow || 0, color: "text-gray-600 bg-gray-50 border-gray-200" },
          { label: "Removed", value: sc.removed || 0, color: "text-red-400 bg-red-50 border-red-100" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm opacity-75">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-brand-900 mb-3">Today</h3>
          <div className="text-3xl font-bold text-brand-500">{stats.reviews_today}</div>
          <div className="text-sm text-gray-500 mt-1">reviews submitted today</div>
          <div className="mt-3 text-sm text-gray-500">
            Total: <span className="font-medium text-brand-900">{stats.total_reviews}</span> reviews all time
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-brand-900 mb-3">Action Needed</h3>
          <div className="text-3xl font-bold text-amber-500">{sc.pending || 0}</div>
          <div className="text-sm text-gray-500 mt-1">reviews awaiting moderation</div>
          {(sc.flagged || 0) > 0 && (
            <div className="mt-2 text-sm text-red-500 font-medium">
              ⚠️ {sc.flagged} flagged for priority review
            </div>
          )}
          <a
            href="/admin/moderation"
            className="inline-block mt-3 text-sm text-brand-500 font-medium hover:underline"
          >
            Go to moderation →
          </a>
        </div>
      </div>

      {/* Top Professors */}
      {stats.top_professors?.length > 0 && (
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-brand-900 mb-4">Top Professors by Review Count</h3>
          <div className="space-y-2">
            {stats.top_professors.slice(0, 5).map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <span className="font-medium text-sm">{p.professors?.name_en || "—"}</span>
                </div>
                <div className="text-sm text-gray-500">
                  {p.review_count} reviews · {Number(p.avg_quality).toFixed(1)} avg
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
