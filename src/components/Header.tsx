"use client";

import Link from "next/link";
import { useApp } from "./Providers";
import { t } from "@/lib/i18n";
import { useState } from "react";

export default function Header() {
  const { theme, setTheme, lang, setLang, resolvedTheme } = useApp();
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const cycleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
    setShowThemeMenu(false);
  };

  const toggleLang = () => {
    setLang(lang === "en" ? "ar" : "en");
  };

  const themeIcon = resolvedTheme === "dark" ? "🌙" : "☀️";
  const themeLabel = theme === "system" ? (resolvedTheme === "dark" ? "🌙" : "☀️") : themeIcon;

  return (
    <header className="sticky top-0 z-50 px-5 py-3 flex items-center justify-between bg-page/80 backdrop-blur-lg border-b" style={{ borderColor: "var(--border)" }}>
      <Link href="/" className="font-display font-extrabold text-lg tracking-tight" style={{ color: "var(--accent)" }}>
        {lang === "ar" ? "قيّم" : "GMP"}
      </Link>

      <div className="flex items-center gap-2">
        {/* Language toggle */}
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

        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors"
          style={{
            background: "var(--bg-surface-alt)",
            border: "1px solid var(--border)",
          }}
          title={`Theme: ${theme}`}
        >
          {themeLabel}
        </button>
      </div>
    </header>
  );
}
