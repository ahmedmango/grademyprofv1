#!/bin/bash
# ============================================================
# GradeMyProfessor v4.1 — Simplified Homepage
# Just logo + search bar with uni dropdown (like RMP)
# Run from project root: bash fixes4_1.sh
# ============================================================

set -e

echo "🍎 GradeMyProfessor v4.1 — Clean Homepage"
echo "==========================================="

if [ ! -f "package.json" ]; then
  echo "❌ Run this from the project root"
  exit 1
fi

# ============================================================
# HOMEPAGE — Logo + Search bar only
# ============================================================
echo "🏠 Rewriting homepage..."

cat > src/components/HomeClient.tsx << 'EOF'
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "./Providers";
import AppleLogo from "./AppleLogo";

const POPULAR_SLUGS = ["aubh", "bahrain-polytechnic", "bibf"];

export default function HomeClient({
  universities, topProfessors, recentReviews, totalReviews, totalUniversities, totalProfessors,
}: {
  universities: any[]; topProfessors: any[]; recentReviews: any[];
  totalReviews: number; totalUniversities: number; totalProfessors: number;
}) {
  const { lang } = useApp();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Popular unis (top 3)
  const popular = universities.filter((u: any) =>
    POPULAR_SLUGS.includes(u.slug)
  );

  // Filter universities by search
  const filtered = query.trim()
    ? universities.filter((u: any) => {
        const q = query.toLowerCase();
        return (
          u.name_en.toLowerCase().includes(q) ||
          (u.short_name && u.short_name.toLowerCase().includes(q)) ||
          (u.name_ar && u.name_ar.includes(query))
        );
      })
    : [];

  // What to show in dropdown
  const showPopular = focused && !query.trim();
  const showFiltered = focused && query.trim() && filtered.length > 0;
  const showNoResults = focused && query.trim() && filtered.length === 0;
  const showDropdown = showPopular || showFiltered || showNoResults;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const goToUni = (slug: string) => {
    setFocused(false);
    setQuery("");
    router.push(`/u/${slug}`);
  };

  const uniDisplay = (u: any) => {
    const short = u.short_name;
    const full = u.name_en;
    return short ? { primary: short, secondary: full } : { primary: full, secondary: "" };
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-5">
      {/* Logo + brand */}
      <div className="flex items-center gap-2.5 mb-2">
        <AppleLogo size={40} />
        <h1 className="font-display text-[30px] font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Grade<span style={{ color: "var(--accent)" }}>My</span>Prof
        </h1>
      </div>
      <p className="text-sm mb-8" style={{ color: "var(--text-tertiary)" }}>
        {lang === "ar" ? "ابحث عن جامعتك" : "Find your university"}
      </p>

      {/* Search bar */}
      <div ref={wrapperRef} className="w-full max-w-md relative">
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-200"
          style={{
            background: "var(--bg-surface)",
            border: focused ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
            boxShadow: focused ? "0 0 0 3px var(--accent-soft)" : "none",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={focused ? "var(--accent)" : "var(--text-tertiary)"} strokeWidth="2.2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder={lang === "ar" ? "ابحث عن جامعتك..." : "Search for your university..."}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--text-primary)" }}
          />
          {query && (
            <button
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="text-xs transition-all active:scale-90"
              style={{ color: "var(--text-tertiary)" }}
            >✕</button>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div
            className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50 animate-dropdown"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
            }}
          >
            {/* Popular unis */}
            {showPopular && (
              <>
                <div className="px-4 pt-3 pb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                    {lang === "ar" ? "الأكثر شعبية" : "Popular"}
                  </span>
                </div>
                {popular.map((u: any) => {
                  const d = uniDisplay(u);
                  return (
                    <button
                      key={u.id}
                      onClick={() => goToUni(u.slug)}
                      className="w-full text-left px-4 py-3 flex items-center justify-between transition-all duration-150 active:scale-[0.98]"
                      style={{ borderTop: "1px solid var(--border)" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent-soft)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <div>
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{d.primary}</span>
                        {d.secondary && (
                          <span className="text-xs ml-2" style={{ color: "var(--text-tertiary)" }}>{d.secondary}</span>
                        )}
                      </div>
                      <span className="text-xs" style={{ color: "var(--accent)" }}>→</span>
                    </button>
                  );
                })}
                {/* Divider + all universities */}
                <div className="px-4 pt-2 pb-1.5" style={{ borderTop: "1px solid var(--border)" }}>
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                    {lang === "ar" ? "جميع الجامعات" : "All universities"}
                  </span>
                </div>
                {universities.filter((u: any) => !POPULAR_SLUGS.includes(u.slug)).map((u: any) => {
                  const d = uniDisplay(u);
                  return (
                    <button
                      key={u.id}
                      onClick={() => goToUni(u.slug)}
                      className="w-full text-left px-4 py-2.5 flex items-center justify-between transition-all duration-150 active:scale-[0.98]"
                      style={{ borderTop: "1px solid var(--border)" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent-soft)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <div>
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{d.primary}</span>
                        {d.secondary && (
                          <span className="text-xs ml-2" style={{ color: "var(--text-tertiary)" }}>{d.secondary}</span>
                        )}
                      </div>
                      <span className="text-xs" style={{ color: "var(--accent)" }}>→</span>
                    </button>
                  );
                })}
              </>
            )}

            {/* Search results */}
            {showFiltered && filtered.map((u: any) => {
              const d = uniDisplay(u);
              return (
                <button
                  key={u.id}
                  onClick={() => goToUni(u.slug)}
                  className="w-full text-left px-4 py-3 flex items-center justify-between transition-all duration-150 active:scale-[0.98]"
                  style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent-soft)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div>
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{d.primary}</span>
                    {d.secondary && (
                      <span className="text-xs ml-2" style={{ color: "var(--text-tertiary)" }}>{d.secondary}</span>
                    )}
                  </div>
                  <span className="text-xs" style={{ color: "var(--accent)" }}>→</span>
                </button>
              );
            })}

            {/* No results */}
            {showNoResults && (
              <div className="px-4 py-5 text-center">
                <p className="text-sm mb-2" style={{ color: "var(--text-tertiary)" }}>
                  No universities match &ldquo;{query}&rdquo;
                </p>
                <button
                  onClick={() => { setFocused(false); router.push("/suggest?type=university"); }}
                  className="text-xs font-semibold transition-all active:scale-95"
                  style={{ color: "var(--accent)" }}
                >
                  + Add your university
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subtle footer stats */}
      <div className="mt-12 flex items-center gap-4" style={{ color: "var(--text-tertiary)" }}>
        <span className="text-[10px]">{totalUniversities} universities</span>
        <span className="text-[10px]">·</span>
        <span className="text-[10px]">{totalProfessors} professors</span>
        <span className="text-[10px]">·</span>
        <span className="text-[10px]">{totalReviews}+ reviews</span>
      </div>
    </div>
  );
}
EOF

echo "  ✅ HomeClient rewritten"

# ============================================================
# CSS — Add dropdown animation
# ============================================================
echo "🎨 Adding dropdown animation..."

if ! grep -q "animate-dropdown" src/app/globals.css 2>/dev/null; then
cat >> src/app/globals.css << 'CSS_EOF'

/* Dropdown appear */
@keyframes dropdown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-dropdown {
  animation: dropdown 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
CSS_EOF
echo "  ✅ Dropdown animation added"
else
echo "  ⏭️  Already exists"
fi

echo ""
echo "✅ Done! Just the homepage changed."
echo ""
echo "  npm run dev → homepage is now logo + search bar"
echo "  Click search → popular unis dropdown (AUBH, Polytechnic, BIBF)"
echo "  Type to filter → all unis searchable"
echo "  No results → 'Add your university' link"
