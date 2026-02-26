"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserProvider";
import { getAnonUserHash } from "@/lib/anon-identity";
import Link from "next/link";
import AppleLogo from "@/components/AppleLogo";
import { PasswordStrengthBar, PasswordMatchIndicator } from "@/components/PasswordStrength";

const ADJS = ["blazing","cosmic","frozen","ghost","midnight","phantom","quantum","silent","solar","swift","turbo","ultra","neon","rouge","velvet"];
const NOUNS = ["blade","coder","falcon","hawk","nova","panda","pixel","shark","storm","tiger","wolf","echo","glitch","orbit","signal"];
function generateUsername() {
  const a = ADJS[Math.floor(Math.random() * ADJS.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${a}_${n}${num}`;
}

export default function AuthPage() {
  const router = useRouter();
  const { login, register } = useUser();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    if (mode === "register") {
      if (!acceptedTerms) {
        setError("You must accept the Terms of Service and Privacy Policy");
        setLoading(false);
        return;
      }
      const anonHash = await getAnonUserHash();
      const result = await register({
        username: username.trim(),
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
        accepted_terms: acceptedTerms,
        anon_user_hash: anonHash,
      });
      if (result.success) {
        router.push("/");
      } else {
        setError(result.error || "Registration failed");
      }
    } else {
      const result = await login(email.trim(), password);
      if (result.success) {
        router.push("/");
      } else {
        setError(result.error || "Login failed");
      }
    }
    setLoading(false);
  };

  return (
    <div className="px-5 pb-10 pt-8 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <AppleLogo size={32} />
          <span className="font-display text-xl font-extrabold" style={{ color: "var(--text-primary)" }}>
            Grade<span style={{ color: "var(--accent)" }}>My</span>Prof
          </span>
        </div>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          {mode === "register" ? "Create your anonymous account" : "Welcome back"}
        </p>
      </div>

      {/* Anonymity guarantee */}
      <div className="mb-6 p-4 rounded-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "var(--accent-soft)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Your identity is protected</p>
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
              Your ratings are <strong style={{ color: "var(--accent)" }}>100% anonymous</strong>. Your username and email are never shown with your reviews. We use them only to verify you're a real student and to notify you when your rating is approved.
            </p>
          </div>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: "var(--bg-surface-alt)" }}>
        <button
          onClick={() => { setMode("register"); setError(""); }}
          className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all"
          style={mode === "register"
            ? { background: "var(--accent)", color: "#fff" }
            : { color: "var(--text-secondary)" }
          }
        >
          Create Account
        </button>
        <button
          onClick={() => { setMode("login"); setError(""); }}
          className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all"
          style={mode === "login"
            ? { background: "var(--accent)", color: "#fff" }
            : { color: "var(--text-secondary)" }
          }
        >
          Sign In
        </button>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {mode === "register" && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Username *</label>
              <button type="button" onClick={() => setUsername(generateUsername())}
                className="text-[11px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-lg transition-all active:scale-95"
                style={{ color: "var(--accent)", background: "var(--accent-soft)" }}>
                🎲 Generate
              </button>
            </div>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
              placeholder="e.g. ghost_hawk42"
              maxLength={20}
              className="w-full px-3.5 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
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
              {username.length < 3 && <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>3-20 characters. Letters, numbers, underscore, dot only.</span>}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
            {mode === "login" ? "Username or Email *" : "Email *"}
          </label>
          <input
            type={mode === "login" ? "text" : "email"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={mode === "login" ? "Username or email" : "your@email.com"}
            className="w-full px-3.5 py-3 rounded-xl text-sm outline-none transition-all"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
            Password *
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="w-full px-3.5 py-3 rounded-xl text-sm outline-none transition-all"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          {mode === "register" && <PasswordStrengthBar password={password} />}
        </div>

        {mode === "register" && (
          <>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Confirm Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full px-3.5 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
              <PasswordMatchIndicator password={password} confirm={confirmPassword} />
            </div>

            {/* Terms & Conditions */}
            <div className="flex items-start gap-3 pt-2">
              <button
                onClick={() => setAcceptedTerms(!acceptedTerms)}
                className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all"
                style={{
                  borderColor: acceptedTerms ? "var(--accent)" : "var(--border)",
                  background: acceptedTerms ? "var(--accent)" : "transparent",
                }}
              >
                {acceptedTerms && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                I agree to the{" "}
                <Link href="/terms" className="underline" style={{ color: "var(--accent)" }}>Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="underline" style={{ color: "var(--accent)" }}>Privacy Policy</Link>.
                I understand my reviews are anonymous and my personal information will never be shared.
              </p>
            </div>
          </>
        )}

        {error && (
          <div className="p-3 rounded-xl text-sm" style={{ background: "#7F1D1D30", color: "var(--rating-low)" }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || (mode === "register" && !acceptedTerms)}
          className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {loading ? "Please wait..." : mode === "register" ? "Create Account" : "Sign In"}
        </button>
      </div>
    </div>
  );
}
