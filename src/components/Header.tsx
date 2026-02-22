"use client";

import Link from "next/link";
import { useApp } from "./Providers";

export default function Header() {
  const { theme, setTheme, lang, setLang, resolvedTheme } = useApp();

  const cycleTheme = () => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  const toggleLang = () => {
    setLang(lang === "en" ? "ar" : "en");
  };

  return (
    <header className="sticky top-0 z-50 px-5 py-3 flex items-center justify-between bg-page/80 backdrop-blur-lg border-b" style={{ borderColor: "var(--border)" }}>
      <Link href="/" className="font-display font-extrabold text-lg tracking-tight" style={{ color: "var(--accent)" }}>
        {lang === "ar" ? "قيّم" : "GMP"}
      </Link>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleLang}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          style={{
            background: "var(--bg-surface-alt)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          {lang === "en" ? "عربي" : "EN"}
        </button>

        <button
          onClick={cycleTheme}
          className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-90 cursor-pointer"
          style={{
            background: "var(--bg-surface-alt)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
          title={`Theme: ${theme}`}
          aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {resolvedTheme === "dark" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
