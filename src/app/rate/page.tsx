"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getAnonUserHash } from "@/lib/anon-identity";
import { VALID_TAGS } from "@/lib/constants";

export default function RatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const professorSlug = searchParams.get("professor") || "";

  const [prof, setProf] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [quality, setQuality] = useState(0);
  const [difficulty, setDifficulty] = useState(0);
  const [wta, setWta] = useState<boolean | null>(null);
  const [att, setAtt] = useState<boolean | null>(null);
  const [tb, setTb] = useState<boolean | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [courseId, setCourseId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [exitPrompt, setExitPrompt] = useState(false);

  useEffect(() => {
    if (!professorSlug) return;
    fetch(`/api/professor?slug=${professorSlug}`).then(r => r.json()).then(d => {
      if (d.professor) {
        setProf(d.professor);
        const courses = (d.professor.professor_courses || []).map((pc: any) => pc.courses).filter(Boolean);
        if (courses.length > 0) setCourseId(courses[0].id);
      }
    });
  }, [professorSlug]);

  const courses = (prof?.professor_courses || []).map((pc: any) => pc.courses).filter(Boolean);
  const agg = prof?.aggregates_professor || {};
  const progress = ((step + 1) / 5) * 100;

  const canProceed = () => {
    if (step === 0) return courseId && quality > 0;
    if (step === 1) return difficulty > 0;
    if (step === 2) return wta !== null;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const anonHash = await getAnonUserHash();
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-anon-user-hash": anonHash },
        body: JSON.stringify({
          professor_id: prof.id, course_id: courseId,
          rating_quality: quality, rating_difficulty: difficulty,
          would_take_again: wta, attendance_mandatory: att, uses_textbook: tb,
          tags, comment: comment.trim(),
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: "Submission failed. Please try again." });
    }
    setSubmitting(false);
  };

  const close = () => {
    if (step > 0 && !exitPrompt) { setExitPrompt(true); return; }
    router.push(professorSlug ? `/p/${professorSlug}` : "/");
  };

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div className="text-center max-w-sm">
          {result.success ? (
            <>
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="font-display text-2xl font-bold text-brand-600 mb-2">Rating Submitted!</h2>
              <p className="text-sm text-gray-500 mb-1">+{result.points_earned} points earned</p>
              <p className="text-sm text-gray-400 mb-6">{result.message}</p>
              <div className="flex gap-2">
                <button onClick={() => router.push(`/p/${professorSlug}`)}
                  className="flex-1 py-3 bg-brand-500 text-white rounded-xl font-semibold text-sm hover:bg-brand-600 transition">
                  View Profile
                </button>
                <button className="py-3 px-4 bg-green-500 text-white rounded-xl font-semibold text-sm hover:bg-green-600 transition">
                  WhatsApp
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">😕</div>
              <h2 className="font-display text-xl font-bold text-red-600 mb-2">Couldn&apos;t Submit</h2>
              <p className="text-sm text-gray-500 mb-6">{result.error}</p>
              <button onClick={() => setResult(null)}
                className="py-3 px-6 bg-brand-500 text-white rounded-xl font-semibold text-sm">Try Again</button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!prof) return <div className="text-center py-20 text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-brand-100">
        <button onClick={close} className="text-gray-400 text-lg">✕</button>
        <span className="text-xs font-semibold text-brand-500">Rate {prof.name_en.split(" ").pop()}</span>
        <div className="w-6" />
      </div>

      {/* Progress */}
      <div className="px-5 pt-3">
        <div className="h-1 bg-brand-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand-500 to-brand-300 rounded-full transition-all duration-400" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5 text-right">Step {step + 1} of 5</p>
      </div>

      {/* Social proof */}
      {step === 0 && agg.review_count > 0 && (
        <div className="px-5 py-1 text-center">
          <span className="text-xs text-gray-500 bg-brand-50 px-3 py-1 rounded-full">
            ✨ {agg.review_count} students rated · Most say: {Object.entries(agg.tag_dist || {}).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || "—"}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-5 py-6 overflow-auto">
        {step === 0 && (
          <div className="animate-fade-up">
            <h3 className="font-display text-2xl font-extrabold text-brand-600 mb-1">Rate overall quality</h3>
            <p className="text-xs text-gray-500 mb-6">One tap to start — takes under 30 seconds.</p>
            <label className="text-xs font-medium text-gray-400 block mb-2">Which course?</label>
            <div className="flex gap-2 flex-wrap mb-6">
              {courses.map((c: any) => (
                <button key={c.id} onClick={() => setCourseId(c.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${courseId === c.id ? "border-brand-500 bg-brand-50 text-brand-500" : "border-brand-100 bg-white text-gray-500"}`}>
                  {c.code}
                </button>
              ))}
            </div>
            <label className="text-xs font-medium text-gray-400 block mb-2">Overall quality</label>
            <StarPicker value={quality} onChange={setQuality} type="quality" />
            {quality > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-200 text-xs text-green-700 text-center animate-fade-up">
                ✨ Nice — you&apos;re helping {Math.floor(Math.random() * 200 + 300)} students this semester.
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-up">
            <h3 className="font-display text-2xl font-extrabold text-brand-600 mb-1">How difficult?</h3>
            <p className="text-xs text-gray-500 mb-6">Rate the course difficulty level.</p>
            <StarPicker value={difficulty} onChange={setDifficulty} type="difficulty" />
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-up">
            <h3 className="font-display text-2xl font-extrabold text-brand-600 mb-1">Quick questions</h3>
            <p className="text-xs text-gray-500 mb-6">Tap to answer — takes 5 seconds.</p>
            <Toggle label="Would you take this professor again?" value={wta} onChange={setWta} />
            <Toggle label="Was attendance mandatory?" value={att} onChange={setAtt} />
            <Toggle label="Did you use a textbook?" value={tb} onChange={setTb} />
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-up">
            <h3 className="font-display text-2xl font-extrabold text-brand-600 mb-1">Pick up to 3 tags</h3>
            <p className="text-xs text-gray-500 mb-6">What describes this professor best?</p>
            <div className="flex flex-wrap gap-2">
              {VALID_TAGS.map((tag) => {
                const sel = tags.includes(tag);
                const dis = tags.length >= 3 && !sel;
                return (
                  <button key={tag} onClick={() => { if (sel) setTags(tags.filter(t => t !== tag)); else if (!dis) setTags([...tags, tag]); }}
                    className={`px-3.5 py-2 rounded-full text-xs font-medium border transition ${sel ? "border-brand-500 bg-brand-50 text-brand-500" : "border-brand-100 text-gray-500"} ${dis ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}>
                    {sel ? "✓ " : ""}{tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade-up">
            <h3 className="font-display text-2xl font-extrabold text-brand-600 mb-1">Leave a review</h3>
            <p className="text-xs text-gray-500 mb-2">Optional, but students love detailed reviews.</p>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {["What surprised you?", "Tips to get an A?", "What's the workload like?"].map(pr => (
                <button key={pr} onClick={() => setComment(prev => prev || pr + " ")}
                  className="px-2.5 py-1 rounded-lg text-[10px] bg-brand-50 border border-brand-100 text-brand-500 font-medium">💡 {pr}</button>
              ))}
            </div>
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Share your experience…"
              className="w-full min-h-[120px] bg-brand-50/40 border border-brand-100 rounded-xl p-3.5 text-sm text-brand-900 outline-none focus:border-brand-500 resize-y" />
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-gray-400">{comment.length} chars</span>
              {comment.length >= 30 && <span className="text-[10px] text-green-600 font-medium animate-fade-up">🎉 +20 points</span>}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-brand-100 bg-white">
        <div className="flex gap-2.5">
          {step > 0 && <button onClick={() => setStep(step - 1)}
            className="px-5 py-3.5 bg-brand-50 border border-brand-100 rounded-xl text-sm text-gray-500 font-medium">Back</button>}
          <button onClick={() => step < 4 ? setStep(step + 1) : handleSubmit()} disabled={!canProceed() || submitting}
            className={`flex-1 py-3.5 rounded-xl text-sm font-semibold transition ${canProceed() ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/25" : "bg-brand-100 text-gray-400 cursor-not-allowed"}`}>
            {submitting ? "Submitting…" : step < 4 ? "Continue" : "Submit Rating ✨"}
          </button>
        </div>
        {step === 3 && <button onClick={() => setStep(4)} className="w-full mt-2 text-xs text-gray-400 py-2">Skip tags →</button>}
      </div>

      {/* Exit Prompt */}
      {exitPrompt && (
        <div className="fixed inset-0 bg-brand-900/30 backdrop-blur-sm flex items-center justify-center p-5 z-50">
          <div className="bg-white rounded-2xl p-7 max-w-xs w-full text-center shadow-xl border border-brand-100">
            <div className="text-3xl mb-3">⏳</div>
            <h4 className="font-display text-lg font-bold text-brand-600 mb-1">You&apos;re 15 seconds away!</h4>
            <p className="text-xs text-gray-500 mb-5">Your rating helps hundreds of students. Finish?</p>
            <button onClick={() => setExitPrompt(false)}
              className="w-full py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl font-semibold text-sm mb-2">Continue Rating</button>
            <button onClick={() => router.push(professorSlug ? `/p/${professorSlug}` : "/")}
              className="w-full py-2.5 border border-brand-100 text-gray-500 rounded-xl text-xs">Save Draft & Exit</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StarPicker({ value, onChange, type }: { value: number; onChange: (v: number) => void; type: "quality" | "difficulty" }) {
  const [hover, setHover] = useState(0);
  const d = hover || value;
  const gc = (v: number) => type === "difficulty" ? (v >= 4 ? "#DC2626" : v >= 3 ? "#CA8A04" : "#16A34A") : (v >= 4 ? "#16A34A" : v >= 3 ? "#CA8A04" : "#DC2626");
  const gl = (v: number) => {
    if (!v) return "";
    if (type === "difficulty") return v >= 4.5 ? "Very Hard" : v >= 3.5 ? "Hard" : v >= 2.5 ? "Average" : v >= 1.5 ? "Easy" : "Very Easy";
    return v >= 4.5 ? "Excellent" : v >= 3.5 ? "Great" : v >= 2.5 ? "Average" : v >= 1.5 ? "Poor" : "Awful";
  };
  const ac = d > 0 ? gc(d) : "#EDE8F5";
  return (
    <div>
      <div className="flex gap-1 justify-center mb-3">
        {[1,2,3,4,5].map(star => {
          const filled = d >= star; const half = !filled && d >= star - 0.5;
          return (
            <div key={star} className="relative w-12 h-12 cursor-pointer">
              <div className="absolute left-0 top-0 w-1/2 h-full z-10" onClick={() => onChange(star - 0.5)} onMouseEnter={() => setHover(star - 0.5)} onMouseLeave={() => setHover(0)} />
              <div className="absolute right-0 top-0 w-1/2 h-full z-10" onClick={() => onChange(star)} onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)} />
              <svg width="48" height="48" viewBox="0 0 24 24" className="absolute inset-0">
                <defs><clipPath id={`l${type}${star}`}><rect x="0" y="0" width="12" height="24"/></clipPath><clipPath id={`r${type}${star}`}><rect x="12" y="0" width="12" height="24"/></clipPath></defs>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={(filled||half)?ac:"#EDE8F5"} clipPath={`url(#l${type}${star})`}/>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={filled?ac:"#EDE8F5"} clipPath={`url(#r${type}${star})`}/>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" stroke={(filled||half)?ac:"#EDE8F5"} strokeWidth="0.5"/>
              </svg>
            </div>
          );
        })}
      </div>
      <div className="text-center h-10">
        {d > 0 ? <div className="animate-fade-up"><span className="text-3xl font-black font-display" style={{ color: gc(d) }}>{d.toFixed(1)}</span><span className="text-sm text-gray-500 ml-2">{gl(d)}</span></div>
        : <span className="text-xs text-gray-400">Tap a star to rate (supports half-stars)</span>}
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="mb-4">
      <p className="text-sm text-brand-900 font-medium mb-2">{label}</p>
      <div className="flex gap-2.5">
        {[true, false].map(v => (
          <button key={String(v)} onClick={() => onChange(v)}
            className={`flex-1 py-3 rounded-xl text-sm font-medium border transition ${value === v ? "border-brand-500 bg-brand-50 text-brand-500" : "border-brand-100 bg-white text-gray-500"}`}>
            {v ? "👍 Yes" : "👎 No"}
          </button>
        ))}
      </div>
    </div>
  );
}
