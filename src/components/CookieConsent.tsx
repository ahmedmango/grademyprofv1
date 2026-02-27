"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const CONSENT_KEY = "gmp_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) setVisible(true);
    } catch {}
  }, []);

  const accept = () => {
    try { localStorage.setItem(CONSENT_KEY, "1"); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-5 pt-4"
      style={{
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border)",
        boxShadow: "0 -8px 24px rgba(0,0,0,0.10)",
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
      }}
    >
      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="flex-1 text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          We use local storage for your session, theme, and an anonymous device fingerprint (via FingerprintJS)
          to prevent duplicate reviews. No tracking cookies.{" "}
          <Link href="/privacy" className="underline font-medium" style={{ color: "var(--accent)" }}>
            Privacy Policy
          </Link>
        </p>
        <button
          onClick={accept}
          className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
