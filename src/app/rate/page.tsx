"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getAnonUserHash } from "@/lib/anon-identity";
import { useUser } from "@/components/UserProvider";
import { useGate } from "@/components/ReviewGate";
import { validateUsername, validateEmail, validatePassword } from "@/lib/validation";
import { VALID_TAGS } from "@/lib/constants";

const GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F", "W"];

function RateForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, login, register } = useUser();
  const { refresh: refreshGate } = useGate();

  const professorId = searchParams.get("professorId") || "";
  const professorName = searchParams.get("professorName") || "";
  const professorSlug = searchParams.get("professorSlug") || "";
  const uniId = searchParams.get("uniId") || "";

  // Course state
  const [courseCode, setCourseCode] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [existingCourses, setExistingCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  // Rating state
  const [step, setStep] = useState(1);
  const [quality, setQuality] = useState(0);
  const [difficulty, setDifficulty] = useState(0);
  const [wouldTakeAgain, setWouldTakeAgain] = useState<boolean | null>(null);
  const [grade, setGrade] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  // Auth state
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [autoApproved, setAutoApproved] = useState(false);

  // Fetch existing courses for this professor's university
  useEffect(() => {
    if (uniId) {
      fetch(`/api/search?q=&type=courses`)
        .then((r) => r.json())
        .then((data) => {
          if (data.courses) setExistingCourses(data.courses);
        })
        .catch(() => {});
    }
  }, [uniId]);

  const totalSteps = user ? 4 : 5;

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 3 ? [...prev, tag] : prev
    );
  };

  const canAdvance = () => {
    switch (step) {
      case 1: return courseCode.trim().length >= 2;
      case 2: return quality > 0 && difficulty > 0;
      case 3: return grade.length > 0;
      case 4: return true;
      case 5:
        if (authMode === "login") return email.length > 0 && password.length > 0;
        return username.length >= 3 && email.length > 0 && password.length >= 6 && confirmPassword.length > 0 && acceptedTerms;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");

    let userId = user?.id;

    // Auth step if not logged in
    if (!user && step === 5) {
      if (authMode === "register") {
        const uCheck = validateUsername(username);
        if (!uCheck.valid) { setError(uCheck.error!); setSubmitting(false); return; }
        const eCheck = validateEmail(email);
        if (!eCheck.valid) { setError(eCheck.error!); setSubmitting(false); return; }
        const pCheck = validatePassword(password);
        if (!pCheck.valid) { setError(pCheck.error!); setSubmitting(false); return; }
        if (password !== confirmPassword) { setError("Passwords do not match"); setSubmitting(false); return; }

        const anonHash = await getAnonUserHash();
        const result = await register({
          username: username.trim(), email: email.trim(), password,
          confirm_password: confirmPassword, accepted_terms: acceptedTerms, anon_user_hash: anonHash,
        });
        if (!result.success) { setError(result.error || "Registration failed"); setSubmitting(false); return; }
        const saved = sessionStorage.getItem("gmp_user");
        if (saved) userId = JSON.parse(saved).id;
      } else {
        const result = await login(email.trim(), password);
        if (!result.success) { setError(result.error || "Login failed"); setSubmitting(false); return; }
        const saved = sessionStorage.getItem("gmp_user");
        if (saved) userId = JSON.parse(saved).id;
      }
    }

    try {
      const hash = await getAnonUserHash();

      // First, create or find the course
      let courseId = selectedCourseId;
      if (!courseId) {
        const courseRes = await fetch("/api/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "course",
            name_en: courseTitle.trim() || courseCode.trim(),
            university_id: uniId,
            extra: courseCode.trim().toUpperCase(),
          }),
        });
        if (courseRes.ok) {
          // Find the course we just created
          const searchRes = await fetch(`/api/search?q=${encodeURIComponent(courseCode.trim())}&type=courses`);
          const searchData = await searchRes.json();
          const found = searchData.courses?.find((c: any) =>
            c.code.toUpperCase() === courseCode.trim().toUpperCase()
          );
          if (found) courseId = found.id;
        }
      }

      if (!courseId) {
        setError("Could not create course. Please try again.");
        setSubmitting(false);
        return;
      }

      // Link professor to course
      await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "link_professor_course", professor_id: professorId, course_id: courseId }),
      }).catch(() => {});

      // Submit the review
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-anon-user-hash": hash },
        body: JSON.stringify({
          professor_id: professorId, course_id: courseId,
          rating_quality: quality, rating_difficulty: difficulty,
          would_take_again: wouldTakeAgain, grade_received: grade,
          tags, comment: comment.trim(), user_id: userId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        // Clear gate cache and refresh — this unlocks ratings
        try {
          localStorage.removeItem("gmp_gate_status");
          localStorage.removeItem("gmp_review_count");
        } catch {}
        await refreshGate();
        setAutoApproved(data.auto_approved || false);
        setSuccess(true);
      } else {
        setError(data.error || "Failed to submit review");
      }
    } catch {
      setError("Connection failed. Please try again.");
    }
    setSubmitting(false);
  };

  // No professor selected
  if (!professorId) {
    return (
      <div className="px-5 pb-10 pt-8 text-center max-w-md mx-auto">
        <div className="text-4xl mb-3">✍️</div>
        <h1 className="font-display text-xl font-bold mb-2" style={{ color: "var(--accent)" }}>Rate a Professor</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          Find a professor first, then tap "Rate" on their profile page.
        </p>
        <Link href="/" className="inline-block px-6 py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--accent)", color: "#fff" }}>
          ← Back to Home
        </Link>
      </div>
    );
  }

  // Success
  if (success) {
    return (
      <div className="px-5 pb-10 pt-12 text-center max-w-md mx-auto animate-fade-up">
        <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "#22C55E20" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 className="font-display text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          {autoApproved ? "Review Published!" : "Review Submitted!"}
        </h2>
        <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
          {autoApproved
            ? "Your review is live. Thank you for helping fellow students!"
            : "Your review is pending moderation. Most reviews are approved within 24 hours."
          }
        </p>
        <p className="text-xs mb-6" style={{ color: "var(--accent)" }}>
          ✨ All ratings are now unlocked for you!
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          {professorSlug ? (
            <Link href={`/p/${professorSlug}`} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--accent)", color: "#fff" }}>
              View Professor →
            </Link>
          ) : (
            <Link href="/" className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--accent)", color: "#fff" }}>
              Browse Professors →
            </Link>
          )}
        </div>
      </div>
    );
  }

  const ratingLabel = (v: number) => v <= 1 ? "Awful" : v <= 2 ? "Poor" : v <= 3 ? "OK" : v <= 4 ? "Good" : "Amazing";

  return (
    <div className="px-5 pb-10 max-w-lg mx-auto">
      {/* Header */}
      <div className="pt-4 mb-5 flex items-center gap-3">
        <button onClick={() => step > 1 ? setStep(step - 1) : router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all duration-150 active:scale-90" style={{ color: "var(--accent)" }}>←</button>
        <div className="flex-1">
          <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{professorName}</div>
          {courseCode && <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{courseCode}</div>}
        </div>
        <div className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>Step {step}/{totalSteps}</div>
      </div>

      {/* Progress */}
      <div className="h-1 rounded-full mb-6" style={{ background: "var(--border)" }}>
        <div className="h-1 rounded-full transition-all duration-300" style={{ background: "var(--accent)", width: `${(step / totalSteps) * 100}%` }} />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: "#7F1D1D30", color: "var(--rating-low)" }}>{error}</div>
      )}

      {/* STEP 1: Course */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-up">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
              Which course did you take with {professorName}?
            </label>
            <p className="text-[10px] mb-3" style={{ color: "var(--text-tertiary)" }}>
              Enter the course code (e.g. CS101, ACCT200, ENG102)
            </p>
            <input
              value={courseCode}
              onChange={(e) => {
                setCourseCode(e.target.value.toUpperCase());
                setSelectedCourseId("");
              }}
              placeholder="Course code (e.g. CS101)"
              maxLength={20}
              className="w-full px-3.5 py-3 rounded-xl text-sm outline-none font-mono"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
              Course name (optional)
            </label>
            <input
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              placeholder="e.g. Introduction to Computer Science"
              className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>
        </div>
      )}

      {/* STEP 2: Quality + Difficulty */}
      {step === 2 && (
        <div className="space-y-6 animate-fade-up">
          <div>
            <label className="block text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
              Quality Rating * {quality > 0 && <span style={{ color: "var(--accent)" }}>— {ratingLabel(quality)}</span>}
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} onClick={() => setQuality(v)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                  style={quality === v ? { background: "var(--accent)", color: "#fff" } : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
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
                  style={difficulty === v ? { background: "var(--accent)", color: "#fff" } : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
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
                  style={wouldTakeAgain === v ? { background: "var(--accent)", color: "#fff" } : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  {v ? "👍 Yes" : "👎 No"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Grade */}
      {step === 3 && (
        <div className="animate-fade-up">
          <label className="block text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Grade Received *</label>
          <div className="flex flex-wrap gap-2">
            {GRADES.map((g) => (
              <button key={g} onClick={() => setGrade(g)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={grade === g ? { background: "var(--accent)", color: "#fff" } : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 4: Tags + Comment */}
      {step === 4 && (
        <div className="space-y-6 animate-fade-up">
          <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}>
            <span className="text-sm">💡</span>
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              <strong>Tip:</strong> Reviews with 30+ character comments get approved instantly.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Tags (pick up to 3)</label>
            <div className="flex flex-wrap gap-2">
              {VALID_TAGS.map((tag) => (
                <button key={tag} onClick={() => toggleTag(tag)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={tags.includes(tag) ? { background: "var(--accent)", color: "#fff" } : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Review (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What should other students know about this professor?"
              rows={4} maxLength={1000}
              className="w-full p-3.5 rounded-xl text-sm resize-none outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px]" style={{ color: comment.length >= 30 ? "var(--rating-high)" : "var(--text-tertiary)" }}>
                {comment.length >= 30 ? "✓ Eligible for instant approval" : `${30 - comment.length} more chars for instant approval`}
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{comment.length}/1000</span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Create account (only if not logged in) */}
      {step === 5 && !user && (
        <div className="space-y-4 animate-fade-up">
          <div className="text-center mb-2">
            <h3 className="font-display font-bold text-base" style={{ color: "var(--text-primary)" }}>Save your feedback</h3>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              Create an account to submit. Your review stays <strong style={{ color: "var(--accent)" }}>100% anonymous</strong>.
            </p>
          </div>

          <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
              Your username and email are <strong>never</strong> shown with your reviews.
            </p>
          </div>

          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-surface-alt)" }}>
            <button onClick={() => { setAuthMode("register"); setError(""); }}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
              style={authMode === "register" ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-secondary)" }}>
              New Account
            </button>
            <button onClick={() => { setAuthMode("login"); setError(""); }}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
              style={authMode === "login" ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-secondary)" }}>
              I have an account
            </button>
          </div>

          {authMode === "register" && (
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Username *</label>
              <input value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                placeholder="e.g. student_uob" maxLength={20}
                className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              <p className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>3-20 characters. Never shown publicly.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com"
              className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Password *</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters"
              className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </div>

          {authMode === "register" && (
            <>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Confirm Password *</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password"
                  className="w-full px-3.5 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              </div>
              <div className="flex items-start gap-3">
                <button onClick={() => setAcceptedTerms(!acceptedTerms)}
                  className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all"
                  style={{ borderColor: acceptedTerms ? "var(--accent)" : "var(--border)", background: acceptedTerms ? "var(--accent)" : "transparent" }}>
                  {acceptedTerms && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
                <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  I agree to the <Link href="/terms" className="underline" style={{ color: "var(--accent)" }}>Terms</Link> and <Link href="/privacy" className="underline" style={{ color: "var(--accent)" }}>Privacy Policy</Link>.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex gap-3">
        {step > 1 && (
          <button onClick={() => { setStep(step - 1); setError(""); }}
            className="flex-1 py-3 rounded-xl text-sm font-semibold card-flat">Back</button>
        )}
        {(user ? step < 4 : step < 5) ? (
          <button onClick={() => { setStep(step + 1); setError(""); }} disabled={!canAdvance()}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#fff" }}>
            Next →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting || !canAdvance()}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "var(--accent)", color: "#fff" }}>
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting…
              </>
            ) : "Submit Review ✓"}
          </button>
        )}
      </div>

      <div className="mt-6 text-center">
        <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>🛡️ Your review is 100% anonymous.</p>
      </div>
    </div>
  );
}

export default function RatePage() {
  return (
    <Suspense fallback={
      <div className="px-5 py-12 text-center">
        <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
      </div>
    }>
      <RateForm />
    </Suspense>
  );
}
