"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getAnonUserHash } from "@/lib/anon-identity";
import { useUser } from "@/components/UserProvider";
import { useGate } from "@/components/ReviewGate";
import { validateUsername, validateEmail, validatePassword } from "@/lib/validation";
import { VALID_TAGS } from "@/lib/constants";
import { PasswordStrengthBar, PasswordMatchIndicator } from "@/components/PasswordStrength";

const ADJS = ["blazing","cosmic","frozen","ghost","midnight","phantom","quantum","silent","solar","swift","turbo","ultra","neon","rouge","velvet"];
const NOUNS = ["blade","coder","falcon","hawk","nova","panda","pixel","shark","storm","tiger","wolf","echo","glitch","orbit","signal"];
function generateUsername() {
  const a = ADJS[Math.floor(Math.random() * ADJS.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${a}_${n}${num}`;
}

const LETTER_GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F", "W"];
const CLASSIFICATION_GRADES = ["Distinction", "Merit", "Credit", "Pass", "Fail"];

function RateForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, login, register } = useUser();
  const { refresh: refreshGate } = useGate();

  const professorId = searchParams.get("professorId") || "";
  const professorName = searchParams.get("professorName") || "";
  const professorSlug = searchParams.get("professorSlug") || "";
  const uniId = searchParams.get("uniId") || "";
  const preselectedCourseId = searchParams.get("courseId") || "";
  const preselectedCourseName = searchParams.get("courseName") || "";

  const [existingCourses, setExistingCourses] = useState<{ id: string; code: string; title_en: string }[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(preselectedCourseId || "");
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const hasCoursePreselected = !!preselectedCourseId;
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!professorId) return;
    setLoadingCourses(true);
    fetch(`/api/professor-courses?professorId=${professorId}`)
      .then((r) => r.json())
      .then((d) => setExistingCourses(d.courses || []))
      .catch(() => {})
      .finally(() => setLoadingCourses(false));
  }, [professorId, hasCoursePreselected]);

  const selectCourse = (id: string) => {
    setSelectedCourseId((prev) => (prev === id ? "" : id));
    setNewCourseCode("");
    setNewCourseTitle("");
    setShowAddCourse(false);
  };
  const [quality, setQuality] = useState(0);
  const [difficulty, setDifficulty] = useState(0);
  const [wouldTakeAgain, setWouldTakeAgain] = useState<boolean | null>(null);
  const [grade, setGrade] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [autoApproved, setAutoApproved] = useState(false);
  const [usernameTaken, setUsernameTaken] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const usernameTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (username.length < 3) { setUsernameTaken(null); return; }
    setCheckingUsername(true);
    clearTimeout(usernameTimer.current);
    usernameTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-username?u=${encodeURIComponent(username.trim())}`);
        if (res.ok) { const d = await res.json(); setUsernameTaken(!d.available); }
      } catch {}
      setCheckingUsername(false);
    }, 400);
    return () => clearTimeout(usernameTimer.current);
  }, [username]);

  const maxStep = user ? 4 : 5;
  const displayProgress = step / maxStep;

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 3 ? [...prev, tag] : prev
    );
  };

  const canAdvance = () => {
    switch (step) {
      case 1: return !!selectedCourseId || newCourseCode.trim().length >= 2;
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
    if (!user) {
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
        if (result.user) userId = result.user.id;
      } else {
        const result = await login(email.trim(), password);
        if (!result.success) { setError(result.error || "Login failed"); setSubmitting(false); return; }
        if (result.user) userId = result.user.id;
      }
    }

    try {
      const hash = await getAnonUserHash();

      let courseIdToSubmit = selectedCourseId;

      if (!courseIdToSubmit && newCourseCode.trim().length >= 2) {
        const courseRes = await fetch("/api/create-course", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            course_code: newCourseCode.trim(),
            course_title: newCourseTitle.trim() || undefined,
            professor_id: professorId,
          }),
        });
        const courseData = await courseRes.json();
        if (!courseRes.ok || !courseData.course_id) {
          setError(courseData.error || "Could not create course. Please try again.");
          setSubmitting(false);
          return;
        }
        courseIdToSubmit = courseData.course_id;
      }

      if (!courseIdToSubmit) {
        setError("Please select or add a course.");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-anon-user-hash": hash },
        body: JSON.stringify({
          professor_id: professorId, course_id: courseIdToSubmit,
          rating_quality: quality, rating_difficulty: difficulty,
          would_take_again: wouldTakeAgain, grade_received: grade,
          tags, comment: comment.trim(), user_id: userId,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        try { localStorage.removeItem("gmp_gate_status"); localStorage.removeItem("gmp_review_count"); } catch {}
        await refreshGate();
        setAutoApproved(!!data.auto_approved);
        setSuccess(true);
      } else {
        setError(data.error || "Failed to submit review");
      }
    } catch {
      setError("Connection failed. Please try again.");
    }
    setSubmitting(false);
  };

  if (!professorId) {
    return (
      <div className="px-5 pb-10 pt-8 text-center rate-form-container">
        <div className="text-4xl mb-3">✍️</div>
        <h1 className="font-display text-xl font-bold mb-2" style={{ color: "var(--accent)" }}>Rate a Professor</h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Find a professor first, then tap "Rate" on their profile page.</p>
        <Link href="/" className="inline-block px-6 py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--accent)", color: "#fff" }}>← Back to Home</Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="px-5 pb-10 pt-12 text-center rate-form-container animate-fade-up">
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
            : "Your review is pending moderation. Most reviews are approved within 24 hours."}
        </p>
        <p className="text-xs mb-6 font-semibold" style={{ color: "var(--accent)" }}>All ratings are now unlocked for you!</p>
        <div className="flex gap-3 justify-center flex-wrap">
          {professorSlug ? (
            <Link href={`/p/${professorSlug}`} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--accent)", color: "#fff" }}>View Professor →</Link>
          ) : (
            <Link href="/" className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--accent)", color: "#fff" }}>Browse Professors →</Link>
          )}
        </div>
      </div>
    );
  }

  const qualityLabel = (v: number) => v <= 1 ? "Awful" : v <= 2 ? "Poor" : v <= 3 ? "OK" : v <= 4 ? "Good" : "Amazing";
  const difficultyLabel = (v: number) => v <= 1 ? "Very Easy" : v <= 2 ? "Easy" : v <= 3 ? "Medium" : v <= 4 ? "Hard" : "Very Difficult";

  return (
    <div className="px-5 pb-10 rate-form-container">
      {/* Header */}
      <div className="pt-4 mb-5 flex items-center gap-3">
        <button onClick={() => step > 1 ? setStep(step - 1) : router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-lg transition-all duration-150 active:scale-90" style={{ color: "var(--accent)" }}>←</button>
        <div className="flex-1">
          <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{professorName}</div>
          {(selectedCourseId || newCourseCode || preselectedCourseName) && (
            <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {preselectedCourseName ||
                (selectedCourseId && existingCourses.find((c) => c.id === selectedCourseId)?.code) ||
                (newCourseCode && `New: ${newCourseCode}`) ||
                ""}
            </div>
          )}
        </div>
        <div className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>Step {step}/{maxStep}</div>
      </div>

      <div className="h-1 rounded-full mb-6" style={{ background: "var(--border)" }}>
        <div className="h-1 rounded-full transition-all duration-300" style={{ background: "var(--accent)", width: `${displayProgress * 100}%` }} />
      </div>

      {error && <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: "#7F1D1D30", color: "var(--rating-low)" }}>{error}</div>}

      {/* STEP 1: Course Selection */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-up">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
              Which course did you take with {professorName}?
            </label>
            <p className="text-[10px] mb-3" style={{ color: "var(--text-tertiary)" }}>
              Select one course, or add a new one if it isn&apos;t listed.
            </p>
          </div>

          {loadingCourses && (
            <div className="flex items-center gap-2 py-3" style={{ color: "var(--text-tertiary)" }}>
              <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
              <span className="text-xs">Loading courses...</span>
            </div>
          )}

          {existingCourses.length > 0 && (
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
                Known courses
              </label>
              <div className="flex flex-wrap gap-2">
                {existingCourses.map((c) => {
                  const isSelected = selectedCourseId === c.id;
                  return (
                    <button key={c.id} onClick={() => selectCourse(c.id)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
                      style={isSelected
                        ? { background: "var(--accent)", color: "#fff" }
                        : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }
                      }>
                      {isSelected && <span className="mr-1">✓</span>}
                      {c.code}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {existingCourses.length > 0 && !showAddCourse && (
            <button onClick={() => { setShowAddCourse(true); setSelectedCourseId(""); }}
              className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97] flex items-center justify-center gap-1.5"
              style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px dashed var(--accent)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add a different course
            </button>
          )}

          {(showAddCourse || existingCourses.length === 0) && (
            <div className="space-y-3">
              {existingCourses.length > 0 && (
                <div className="h-px w-full" style={{ background: "var(--border)" }} />
              )}
              <label className="block text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                {existingCourses.length > 0 ? "New course" : "Course code or name"}
              </label>
              <input value={newCourseCode}
                onChange={(e) => { setNewCourseCode(e.target.value.toUpperCase()); setSelectedCourseId(""); }}
                placeholder="Code or name (e.g. CS101 or Intro to CS)" maxLength={50}
                className="w-full px-3.5 py-3 rounded-xl text-[16px] outline-none"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              <input value={newCourseTitle} onChange={(e) => setNewCourseTitle(e.target.value.toUpperCase())}
                placeholder="Full course name (optional)"
                className="w-full px-3.5 py-3 rounded-xl text-[16px] outline-none"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
            </div>
          )}

          {(selectedCourseId || newCourseCode.trim().length >= 2) && (
            <div className="p-2.5 rounded-xl text-[11px] font-semibold text-center" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              {selectedCourseId
                ? `Reviewing ${existingCourses.find((c) => c.id === selectedCourseId)?.code || "selected course"}`
                : `Adding new course: ${newCourseCode}`}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Quality + Difficulty */}
      {step === 2 && (
        <div className="space-y-6 animate-fade-up">
          <div>
            <label className="block text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Quality Rating * {quality > 0 && <span style={{ color: "var(--accent)" }}>— {qualityLabel(quality)}</span>}</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} onClick={() => setQuality(v)} className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                  style={quality === v ? { background: "var(--accent)", color: "#fff" } : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>{v}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Difficulty Rating * {difficulty > 0 && <span style={{ color: "var(--accent)" }}>— {difficultyLabel(difficulty)}</span>}</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} onClick={() => setDifficulty(v)} className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                  style={difficulty === v ? { background: "var(--accent)", color: "#fff" } : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>{v}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Would you take this professor again?</label>
            <div className="flex gap-2">
              {[true, false].map((v) => (
                <button key={String(v)} onClick={() => setWouldTakeAgain(v)} className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={wouldTakeAgain === v ? { background: "var(--accent)", color: "#fff" } : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>{v ? "👍 Yes" : "👎 No"}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Grade */}
      {step === 3 && (
        <div className="animate-fade-up space-y-5">
          <div>
            <label className="block text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Letter Grade *</label>
            <div className="flex flex-wrap gap-2">
              {LETTER_GRADES.map((g) => (
                <button key={g} onClick={() => setGrade(g)} className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={grade === g ? { background: "var(--accent)", color: "#fff" } : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>{g}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="h-px w-full mb-4" style={{ background: "var(--border)" }} />
            <label className="block text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Or Classification Grade</label>
            <div className="flex flex-wrap gap-2">
              {CLASSIFICATION_GRADES.map((g) => (
                <button key={g} onClick={() => setGrade(g)} className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={grade === g ? { background: "var(--accent)", color: "#fff" } : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>{g}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Tags + Comment */}
      {step === 4 && (
        <div className="space-y-6 animate-fade-up">
          <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}>
            <span className="text-sm">💡</span>
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}><strong>Tip:</strong> Reviews with 30+ character comments get approved instantly.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Tags (pick up to 3)</label>
            <div className="flex flex-wrap gap-2">
              {VALID_TAGS.map((tag) => (
                <button key={tag} onClick={() => toggleTag(tag)} className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={tags.includes(tag) ? { background: "var(--accent)", color: "#fff" } : { background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>{tag}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Review (optional)</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="What should other students know about this professor?" rows={4} maxLength={1000}
              className="w-full p-3.5 rounded-xl text-sm resize-none outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
            <div className="flex justify-between mt-1">
              <span className="text-[10px]" style={{ color: comment.length >= 30 ? "var(--rating-high)" : "var(--text-tertiary)" }}>
                {comment.length >= 30 ? "✓ Eligible for instant approval" : `${30 - comment.length} more chars for instant approval`}
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{comment.length}/1000</span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: Auth (only if not logged in) */}
      {step === 5 && !user && (
        <div className="space-y-4 animate-fade-up">
          <div className="text-center mb-2">
            <h3 className="font-display font-bold text-base" style={{ color: "var(--text-primary)" }}>Save your feedback</h3>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Create an account to submit. Your review stays <strong style={{ color: "var(--accent)" }}>100% anonymous</strong>.</p>
          </div>

          <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>Your username and email are <strong>never</strong> shown with your reviews.</p>
          </div>

          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-surface-alt)" }}>
            <button onClick={() => { setAuthMode("register"); setError(""); }}
              className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all"
              style={authMode === "register" ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-secondary)" }}>New Account</button>
            <button onClick={() => { setAuthMode("login"); setError(""); }}
              className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all"
              style={authMode === "login" ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-secondary)" }}>I have an account</button>
          </div>

          {authMode === "register" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Username *</label>
                <button type="button" onClick={() => setUsername(generateUsername())}
                  className="text-[11px] font-semibold flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all active:scale-95"
                  style={{ color: "var(--accent)", background: "var(--accent-soft)" }}>
                  🎲 Generate
                </button>
              </div>
              <input value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))} placeholder="e.g. ghost_hawk42" maxLength={20}
                className="w-full px-3.5 py-3 rounded-xl text-[16px] outline-none"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              <div className="flex items-center gap-1 mt-1">
                {checkingUsername && username.length >= 3 && (
                  <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Checking...</span>
                )}
                {!checkingUsername && usernameTaken === false && username.length >= 3 && (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span className="text-[10px] font-semibold" style={{ color: "#22C55E" }}>Available</span>
                  </>
                )}
                {!checkingUsername && usernameTaken === true && (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    <span className="text-[10px] font-semibold" style={{ color: "#EF4444" }}>Username taken</span>
                  </>
                )}
                {username.length < 3 && <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>3-20 characters. Never shown publicly.</span>}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>{authMode === "login" ? "Username or Email *" : "Email *"}</label>
            <input type={authMode === "login" ? "text" : "email"} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={authMode === "login" ? "Username or email" : "your@email.com"}
              className="w-full px-3.5 py-3 rounded-xl text-[16px] outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Password *</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters"
              className="w-full px-3.5 py-3 rounded-xl text-[16px] outline-none"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
            {authMode === "register" && <PasswordStrengthBar password={password} />}
          </div>

          {authMode === "register" && (
            <>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Confirm Password *</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password"
                  className="w-full px-3.5 py-3 rounded-xl text-[16px] outline-none"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                <PasswordMatchIndicator password={password} confirm={confirmPassword} />
              </div>
              <div className="flex items-start gap-3">
                <button onClick={() => setAcceptedTerms(!acceptedTerms)}
                  className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all"
                  style={{ borderColor: acceptedTerms ? "var(--accent)" : "var(--border)", background: acceptedTerms ? "var(--accent)" : "transparent" }}>
                  {acceptedTerms && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
                <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>I agree to the <Link href="/terms" className="underline" style={{ color: "var(--accent)" }}>Terms</Link> and <Link href="/privacy" className="underline" style={{ color: "var(--accent)" }}>Privacy Policy</Link>.</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex gap-3">
        {step > 1 && (
          <button onClick={() => { setStep(step - 1); setError(""); }} className="flex-1 py-3 rounded-xl text-sm font-semibold card-flat">Back</button>
        )}
        {step < maxStep ? (
          <button onClick={() => { setStep(step + 1); setError(""); }} disabled={!canAdvance()}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#fff" }}>Next →</button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting || !canAdvance()}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#fff" }}>
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting…
              </span>
            ) : "Submit Review ✓"}
          </button>
        )}
      </div>

      <div className="mt-6 text-center">
        <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Your review is 100% anonymous.</p>
      </div>
    </div>
  );
}

export default function RatePage() {
  return (
    <Suspense fallback={<div className="px-5 py-12 text-center"><div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} /></div>}>
      <RateForm />
    </Suspense>
  );
}
