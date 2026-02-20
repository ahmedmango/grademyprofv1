"use client";

import { useState } from "react";

const REASONS = [
  { value: "spam", label: "Spam or fake review" },
  { value: "offensive", label: "Offensive or hateful" },
  { value: "inaccurate", label: "Inaccurate information" },
  { value: "doxxing", label: "Contains personal information" },
  { value: "other", label: "Other" },
];

export default function ReportButton({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_id: reviewId, reason, detail: detail.trim() }),
      });
      if (res.ok) setDone(true);
    } catch {}
    setSubmitting(false);
  };

  if (done) return <span className="text-[10px] text-green-600">✓ Reported</span>;

  return (
    <>
      <button onClick={() => setOpen(!open)} className="text-[10px] text-gray-400 hover:text-red-400 transition" title="Report this review">⚑ Report</button>
      {open && (
        <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200 animate-fade-up">
          <p className="text-xs font-medium text-gray-700 mb-2">Why are you reporting this?</p>
          <div className="space-y-1.5 mb-3">
            {REASONS.map((r) => (
              <button key={r.value} onClick={() => setReason(r.value)}
                className={`block w-full text-left px-3 py-1.5 rounded-lg text-xs transition ${reason === r.value ? "bg-red-50 text-red-700 border border-red-200" : "bg-white text-gray-600 border border-gray-100 hover:border-gray-300"}`}>
                {r.label}
              </button>
            ))}
          </div>
          {reason === "other" && (
            <textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Please describe the issue…"
              className="w-full p-2 border border-gray-200 rounded-lg text-xs mb-2 outline-none focus:border-brand-500 resize-none" rows={2} maxLength={500} />
          )}
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={!reason || submitting}
              className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg font-medium disabled:opacity-50 hover:bg-red-600 transition">
              {submitting ? "Sending…" : "Submit Report"}
            </button>
            <button onClick={() => { setOpen(false); setReason(""); setDetail(""); }}
              className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs rounded-lg font-medium hover:bg-gray-200 transition">Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
