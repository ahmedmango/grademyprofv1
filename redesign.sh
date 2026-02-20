#!/bin/bash
# ============================================================
# GradeMyProfessor v3 — UI Redesign
# Complete visual overhaul: new colors, dark mode, EN/AR, fonts
# Run from the project root: bash redesign.sh
# ============================================================

set -e

echo "🎨 GradeMyProfessor v3 — UI Redesign"
echo "======================================"
echo ""

if [ ! -f "package.json" ]; then
  echo "❌ Run this from the project root"
  exit 1
fi

# ============================================================
# 1. TAILWIND CONFIG — New design tokens
# ============================================================
echo "🎨 Writing new tailwind.config.ts..."

cat > tailwind.config.ts << 'EOF'
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        arabic: ["var(--font-arabic)", "system-ui", "sans-serif"],
      },
      colors: {
        surface: {
          DEFAULT: "var(--bg-surface)",
          alt: "var(--bg-surface-alt)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          soft: "var(--accent-soft)",
        },
        rating: {
          high: "var(--rating-high)",
          mid: "var(--rating-mid)",
          low: "var(--rating-low)",
        },
        // Keep brand- aliases for backward compat during migration
        brand: {
          50: "var(--accent-soft)",
          100: "var(--border)",
          300: "var(--border-hover)",
          400: "var(--accent)",
          500: "var(--accent)",
          600: "var(--accent)",
          900: "var(--text-primary)",
        },
      },
      backgroundColor: {
        page: "var(--bg-primary)",
      },
      textColor: {
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        tertiary: "var(--text-tertiary)",
      },
      borderColor: {
        DEFAULT: "var(--border)",
        hover: "var(--border-hover)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
EOF

# ============================================================
# 2. GLOBALS.CSS — Design system tokens + dark mode
# ============================================================
echo "🖌️  Writing globals.css..."

cat > src/app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ============================================================
   DESIGN TOKENS — GradeMyProfessor v3
   Warm, data-forward, campus intelligence aesthetic
   ============================================================ */

:root {
  /* Backgrounds */
  --bg-primary: #FAFAF8;
  --bg-surface: #FFFFFF;
  --bg-surface-alt: #F4F2EE;

  /* Text */
  --text-primary: #1A1A1A;
  --text-secondary: #6B6B6B;
  --text-tertiary: #9B9B9B;

  /* Accent — warm red-orange */
  --accent: #D95030;
  --accent-hover: #C44528;
  --accent-soft: #FDF0ED;

  /* Ratings */
  --rating-high: #2D8A56;
  --rating-mid: #D4890A;
  --rating-low: #C93B3B;

  /* Borders */
  --border: #E8E5DF;
  --border-hover: #D1CCC4;

  /* Misc */
  --shadow-card: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
  --shadow-card-hover: 0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
  --radius-card: 14px;
  --radius-pill: 8px;
  --radius-full: 9999px;
}

.dark {
  --bg-primary: #111110;
  --bg-surface: #1C1C1A;
  --bg-surface-alt: #252523;

  --text-primary: #EDEDEC;
  --text-secondary: #9B9B9B;
  --text-tertiary: #6B6B6B;

  --accent: #F06B58;
  --accent-hover: #E85A45;
  --accent-soft: #2A1F1D;

  --rating-high: #4ADE80;
  --rating-mid: #FBBF24;
  --rating-low: #F87171;

  --border: #2E2E2C;
  --border-hover: #3E3E3B;

  --shadow-card: 0 1px 3px rgba(0,0,0,0.2);
  --shadow-card-hover: 0 4px 12px rgba(0,0,0,0.3);
}

/* ============================================================
   BASE STYLES
   ============================================================ */

html {
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-body), system-ui, sans-serif;
  transition: background-color 0.2s ease, color 0.2s ease;
}

/* RTL support */
[dir="rtl"] {
  text-align: right;
}

/* ============================================================
   UTILITY CLASSES
   ============================================================ */

.card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  transition: all 0.2s ease;
}

.card:hover {
  border-color: var(--border-hover);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-1px);
}

.card-flat {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
}

.pill {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 500;
  background: var(--accent-soft);
  color: var(--accent);
}

.section-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

/* Rating circle */
.rating-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 20px;
  flex-shrink: 0;
}
.rating-circle.high { background: #ECFDF5; color: var(--rating-high); }
.rating-circle.mid  { background: #FFFBEB; color: var(--rating-mid); }
.rating-circle.low  { background: #FEF2F2; color: var(--rating-low); }

.dark .rating-circle.high { background: #14532D40; }
.dark .rating-circle.mid  { background: #78350F40; }
.dark .rating-circle.low  { background: #7F1D1D40; }

/* Smooth focus states */
input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

/* Hide scrollbar for horizontal scroll areas */
.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

/* Stagger children animation */
.stagger-children > * {
  animation: fade-up 0.35s ease-out both;
}
.stagger-children > *:nth-child(1) { animation-delay: 0.02s; }
.stagger-children > *:nth-child(2) { animation-delay: 0.06s; }
.stagger-children > *:nth-child(3) { animation-delay: 0.10s; }
.stagger-children > *:nth-child(4) { animation-delay: 0.14s; }
.stagger-children > *:nth-child(5) { animation-delay: 0.18s; }
.stagger-children > *:nth-child(6) { animation-delay: 0.22s; }
.stagger-children > *:nth-child(7) { animation-delay: 0.26s; }
.stagger-children > *:nth-child(8) { animation-delay: 0.30s; }

@keyframes fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
EOF

# ============================================================
# 3. i18n DICTIONARY
# ============================================================
echo "🌐 Writing i18n dictionary..."

mkdir -p src/lib

cat > src/lib/i18n.ts << 'EOF'
export type Lang = "en" | "ar";

const dict = {
  en: {
    brand: "Grade My Professor",
    brand_short: "GMP",
    tagline: "Student-powered professor ratings across Bahrain",
    search_placeholder: "Search professor or course code…",
    universities: "Universities",
    trending: "Trending",
    my_reviews: "My Reviews",
    rate_professor: "Rate a Professor",
    reviews: "reviews",
    ratings: "ratings",
    quality: "Quality",
    difficulty: "Difficulty",
    would_take_again: "Would take again",
    retake: "retake",
    no_ratings: "No ratings yet",
    search_tips: "Search Tips",
    tip_professor: "Type a professor name to see their ratings",
    tip_course: "Search by course code (e.g. ITCS 114)",
    tip_browse: "Or browse by university from the home page",
    recent: "Recent",
    courses: "Courses",
    professors: "Professors",
    no_results: "No results for",
    try_different: "Try a different spelling or course code",
    browse_instead: "Browse by university instead",
    registration_title: "Registration Season",
    registration_desc: "Search your course codes now and find the best professors before seats fill up.",
    earn_rewards: "Earn Rewards",
    rewards_desc: "Write 5 honest reviews and get rewarded",
    start_rating: "Start Rating",
    back: "Back",
    stats_reviews: "reviews",
    stats_universities: "universities",
    stats_professors: "professors rated",
    light: "Light",
    dark: "Dark",
    system: "System",
  },
  ar: {
    brand: "قيّم أستاذي",
    brand_short: "قيّم",
    tagline: "تقييمات الطلاب للأساتذة في البحرين",
    search_placeholder: "ابحث عن أستاذ أو رمز المقرر…",
    universities: "الجامعات",
    trending: "الأكثر رواجاً",
    my_reviews: "تقييماتي",
    rate_professor: "قيّم أستاذ",
    reviews: "تقييمات",
    ratings: "تقييمات",
    quality: "الجودة",
    difficulty: "الصعوبة",
    would_take_again: "سآخذه مرة أخرى",
    retake: "إعادة",
    no_ratings: "لا توجد تقييمات بعد",
    search_tips: "نصائح البحث",
    tip_professor: "اكتب اسم الأستاذ لمشاهدة تقييماته",
    tip_course: "ابحث برمز المقرر (مثل ITCS 114)",
    tip_browse: "أو تصفح حسب الجامعة",
    recent: "الأخيرة",
    courses: "المقررات",
    professors: "الأساتذة",
    no_results: "لا توجد نتائج لـ",
    try_different: "جرب كتابة مختلفة أو رمز مقرر آخر",
    browse_instead: "تصفح حسب الجامعة",
    registration_title: "موسم التسجيل",
    registration_desc: "ابحث عن رموز مقرراتك الآن واعثر على أفضل الأساتذة",
    earn_rewards: "اربح مكافآت",
    rewards_desc: "اكتب 5 تقييمات صادقة واحصل على مكافأة",
    start_rating: "ابدأ التقييم",
    back: "رجوع",
    stats_reviews: "تقييم",
    stats_universities: "جامعة",
    stats_professors: "أستاذ مقيّم",
    light: "فاتح",
    dark: "داكن",
    system: "النظام",
  },
} as const;

export type DictKey = keyof typeof dict.en;

export function t(lang: Lang, key: DictKey): string {
  return dict[lang]?.[key] || dict.en[key] || key;
}

export function getDir(lang: Lang): "ltr" | "rtl" {
  return lang === "ar" ? "rtl" : "ltr";
}
EOF

# ============================================================
# 4. THEME + LANG PROVIDER (Client Component)
# ============================================================
echo "🎛️  Writing ThemeProvider..."

cat > src/components/Providers.tsx << 'EOF'
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Lang } from "@/lib/i18n";

type Theme = "light" | "dark" | "system";

interface AppContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  resolvedTheme: "light" | "dark";
}

const AppContext = createContext<AppContextType>({
  theme: "system",
  setTheme: () => {},
  lang: "en",
  setLang: () => {},
  resolvedTheme: "light",
});

export function useApp() {
  return useContext(AppContext);
}

export function Providers({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [lang, setLangState] = useState<Lang>("en");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // Initialize from localStorage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("gmp_theme") as Theme;
      const savedLang = localStorage.getItem("gmp_lang") as Lang;
      if (savedTheme) setThemeState(savedTheme);
      if (savedLang) setLangState(savedLang);
    } catch {}
  }, []);

  // Apply theme
  useEffect(() => {
    const apply = () => {
      let resolved: "light" | "dark" = "light";
      if (theme === "dark") resolved = "dark";
      else if (theme === "system") {
        resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      document.documentElement.classList.toggle("dark", resolved === "dark");
      setResolvedTheme(resolved);
    };

    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { if (theme === "system") apply(); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  // Apply lang/dir
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem("gmp_theme", t); } catch {}
  };

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("gmp_lang", l); } catch {}
  };

  return (
    <AppContext.Provider value={{ theme, setTheme, lang, setLang, resolvedTheme }}>
      {children}
    </AppContext.Provider>
  );
}
EOF

# ============================================================
# 5. HEADER COMPONENT — Theme toggle + Lang toggle
# ============================================================
echo "📐 Writing Header component..."

cat > src/components/Header.tsx << 'EOF'
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
EOF

# ============================================================
# 6. LAYOUT.TSX — Font loading + providers
# ============================================================
echo "📄 Writing layout.tsx..."

cat > src/app/layout.tsx << 'EOF'
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/Providers";
import Header from "@/components/Header";
import "./globals.css";

/* Font: General Sans — geometric, modern, opinionated display font */
/* Fallback to system font if not available */
const generalSans = localFont({
  src: [
    { path: "../fonts/GeneralSans-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/GeneralSans-Semibold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/GeneralSans-Bold.woff2", weight: "700", style: "normal" },
    { path: "../fonts/GeneralSans-Extrabold.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const inter = localFont({
  src: [
    { path: "../fonts/Inter-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Inter-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Inter-Semibold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/Inter-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Grade My Professor — Bahrain",
  description: "Student-powered professor ratings across Bahrain. Anonymous, honest, helpful.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://grademyprofessor.bh"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF8" },
    { media: "(prefers-color-scheme: dark)", color: "#111110" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        {/* Inline script to prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const t = localStorage.getItem('gmp_theme');
            const d = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme:dark)').matches);
            if (d) document.documentElement.classList.add('dark');
            const l = localStorage.getItem('gmp_lang');
            if (l === 'ar') { document.documentElement.lang = 'ar'; document.documentElement.dir = 'rtl'; }
          } catch {}
        `}} />
        {/* Arabic font from Google */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `:root { --font-arabic: 'IBM Plex Sans Arabic', system-ui, sans-serif; } [dir="rtl"] body { font-family: var(--font-arabic); }` }} />
      </head>
      <body className={`${generalSans.variable} ${inter.variable} font-body min-h-screen bg-page`}>
        <Providers>
          <div className="max-w-lg mx-auto">
            <Header />
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
EOF

# ============================================================
# 7. HOMEPAGE — Complete redesign
# ============================================================
echo "🏠 Writing redesigned homepage..."

cat > src/app/page.tsx << 'PAGEOF'
import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import HomeClient from "@/components/HomeClient";

export const revalidate = 120;

export default async function HomePage() {
  const supabase = createServerClient();

  const [uniResult, reviewCountResult] = await Promise.all([
    supabase.from("universities").select("*").eq("is_active", true).order("name_en"),
    supabase.from("reviews").select("*", { count: "exact", head: true }).eq("status", "live"),
  ]);

  const universities = uniResult.data || [];
  const totalReviews = reviewCountResult.count || 0;

  // Trending professors
  let topProfessors: any[] = [];
  const { data: mvData } = await supabase.from("mv_trending_professors" as any).select("*").limit(6);
  if (mvData && mvData.length > 0) {
    topProfessors = mvData;
  } else {
    const { data } = await supabase.from("aggregates_professor")
      .select("*, professors ( id, name_en, slug, departments ( name_en ), universities ( name_en, slug ) )")
      .order("review_count", { ascending: false }).limit(6);
    topProfessors = data || [];
  }

  // Recent reviews for social proof
  const { data: recentReviews } = await supabase.from("reviews")
    .select("id, rating_quality, comment, created_at, professors ( name_en, slug ), universities ( name_en )")
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .limit(5);

  // Count unique professors
  const { count: profCount } = await supabase.from("professors")
    .select("*", { count: "exact", head: true }).eq("is_active", true);

  return (
    <HomeClient
      universities={universities}
      topProfessors={topProfessors}
      recentReviews={recentReviews || []}
      totalReviews={totalReviews}
      totalUniversities={universities.length}
      totalProfessors={profCount || 0}
    />
  );
}
PAGEOF

# ============================================================
# 8. HOME CLIENT COMPONENT
# ============================================================
echo "🏠 Writing HomeClient..."

cat > src/components/HomeClient.tsx << 'EOF'
"use client";

import Link from "next/link";
import { useApp } from "./Providers";
import { t } from "@/lib/i18n";
import { fmtRating } from "@/lib/utils";

function ratingClass(v: number) {
  return v >= 4 ? "high" : v >= 2.5 ? "mid" : "low";
}

function ratingColor(v: number) {
  return v >= 4 ? "var(--rating-high)" : v >= 2.5 ? "var(--rating-mid)" : "var(--rating-low)";
}

export default function HomeClient({
  universities, topProfessors, recentReviews, totalReviews, totalUniversities, totalProfessors,
}: {
  universities: any[]; topProfessors: any[]; recentReviews: any[];
  totalReviews: number; totalUniversities: number; totalProfessors: number;
}) {
  const { lang } = useApp();

  return (
    <div className="px-5 pb-12">
      {/* Hero */}
      <div className="pt-10 mb-8">
        <h1 className="font-display text-[32px] font-extrabold leading-[1.1] tracking-tight">
          <span style={{ color: "var(--accent)" }}>{lang === "ar" ? "قيّم" : "Grade"}</span>{" "}
          {lang === "ar" ? "أستاذي" : "My Professor"}
        </h1>
        <p className="text-secondary text-sm mt-2.5 leading-relaxed max-w-xs">
          {t(lang, "tagline")}
        </p>
      </div>

      {/* Search bar */}
      <Link href="/search"
        className="flex items-center gap-3 rounded-2xl px-4 py-3.5 mb-4 transition"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2.2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <span className="text-tertiary text-sm">{t(lang, "search_placeholder")}</span>
      </Link>

      {/* Stats strip */}
      <div className="flex items-center justify-center gap-6 mb-8 py-2">
        <div className="text-center">
          <div className="font-display font-extrabold text-lg" style={{ color: "var(--accent)" }}>{totalReviews}+</div>
          <div className="text-tertiary text-[10px] uppercase tracking-wider font-medium">{t(lang, "stats_reviews")}</div>
        </div>
        <div className="w-px h-6" style={{ background: "var(--border)" }} />
        <div className="text-center">
          <div className="font-display font-extrabold text-lg">{totalUniversities}</div>
          <div className="text-tertiary text-[10px] uppercase tracking-wider font-medium">{t(lang, "stats_universities")}</div>
        </div>
        <div className="w-px h-6" style={{ background: "var(--border)" }} />
        <div className="text-center">
          <div className="font-display font-extrabold text-lg">{totalProfessors}</div>
          <div className="text-tertiary text-[10px] uppercase tracking-wider font-medium">{t(lang, "stats_professors")}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2.5 mb-8">
        <Link href="/my-reviews"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition card-flat"
          style={{ color: "var(--text-secondary)" }}
        >
          {t(lang, "my_reviews")}
        </Link>
        <Link href="/search"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {t(lang, "rate_professor")}
        </Link>
      </div>

      {/* Trending Professors */}
      {topProfessors.length > 0 && (
        <section className="mb-8">
          <div className="section-label mb-3">🔥 {t(lang, "trending")}</div>
          <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1 stagger-children">
            {topProfessors.map((item: any) => {
              const name = lang === "ar" ? (item.name_ar || item.name_en || item.professors?.name_en) : (item.name_en || item.professors?.name_en);
              const slug = item.slug || item.professors?.slug;
              const uni = item.university_name || item.professors?.universities?.name_en;
              const avgQ = Number(item.avg_quality);
              if (!name || !slug) return null;

              return (
                <Link key={item.professor_id} href={`/p/${slug}`}
                  className="flex-shrink-0 w-36 p-3.5 rounded-2xl transition"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div className={`rating-circle ${ratingClass(avgQ)} mb-2.5`}>
                    {fmtRating(avgQ)}
                  </div>
                  <div className="font-display font-bold text-sm leading-tight line-clamp-2" style={{ color: "var(--text-primary)" }}>
                    {name}
                  </div>
                  <div className="text-[10px] mt-1 line-clamp-1" style={{ color: "var(--text-tertiary)" }}>
                    {uni}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    {item.review_count} {t(lang, "ratings")}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Universities */}
      <section className="mb-8">
        <div className="section-label mb-3">{t(lang, "universities")}</div>
        <div className="flex flex-wrap gap-2 stagger-children">
          {universities.map((u: any) => (
            <Link key={u.id} href={`/u/${u.slug}`}
              className="px-3.5 py-2 rounded-xl text-xs font-medium transition"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              {lang === "ar" && u.name_ar ? u.name_ar : u.name_en}
            </Link>
          ))}
        </div>
      </section>

      {/* Rewards CTA */}
      <section className="mb-8">
        <div className="p-5 rounded-2xl text-center" style={{ background: "var(--accent-soft)", border: "1px solid var(--border)" }}>
          <div className="text-xl mb-1.5">🎁</div>
          <div className="font-display font-bold text-sm" style={{ color: "var(--accent)" }}>{t(lang, "earn_rewards")}</div>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {t(lang, "rewards_desc")}
          </p>
          <Link href="/search"
            className="inline-block mt-3 px-5 py-2 rounded-lg text-xs font-semibold transition"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {t(lang, "start_rating")} →
          </Link>
        </div>
      </section>

      {/* Recent Reviews (social proof) */}
      {recentReviews.length > 0 && (
        <section className="mb-4">
          <div className="section-label mb-3">💬 {lang === "ar" ? "آخر التقييمات" : "Recent Reviews"}</div>
          <div className="space-y-2 stagger-children">
            {recentReviews.slice(0, 3).map((r: any) => (
              <div key={r.id} className="card-flat p-3.5">
                <div className="flex items-start gap-3">
                  <div className={`rating-circle ${ratingClass(r.rating_quality)}`} style={{ width: 36, height: 36, fontSize: 14, borderRadius: 8 }}>
                    {fmtRating(r.rating_quality)}
                  </div>
                  <div className="flex-1 min-w-0">
                    {r.comment && (
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-primary)" }}>
                        "{r.comment}"
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Link href={`/p/${r.professors?.slug}`} className="text-[10px] font-semibold" style={{ color: "var(--accent)" }}>
                        {r.professors?.name_en}
                      </Link>
                      <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                        · {r.universities?.name_en}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
EOF

# ============================================================
# 9. DOWNLOAD FONTS
# ============================================================
echo "📦 Setting up fonts..."

mkdir -p src/fonts

# Create a font download script
cat > src/fonts/download-fonts.sh << 'FONTEOF'
#!/bin/bash
# Download General Sans from Fontshare API
echo "Downloading General Sans..."
cd "$(dirname "$0")"

# General Sans
curl -sL "https://api.fontshare.com/v2/css?f[]=general-sans@500,600,700,800&display=swap" -o /dev/null 2>/dev/null

# If fonts aren't downloadable, create placeholder woff2 files
# The layout.tsx has fallbacks to system-ui so the app will work regardless
for weight in Medium Semibold Bold Extrabold; do
  if [ ! -f "GeneralSans-${weight}.woff2" ]; then
    echo "Note: GeneralSans-${weight}.woff2 not found. Using system font fallback."
    # Create empty placeholder so Next.js doesn't error
    touch "GeneralSans-${weight}.woff2"
  fi
done

for variant in Regular Medium Semibold Bold; do
  if [ ! -f "Inter-${variant}.woff2" ]; then
    echo "Note: Inter-${variant}.woff2 not found. Using system font fallback."
    touch "Inter-${variant}.woff2"
  fi
done
FONTEOF

chmod +x src/fonts/download-fonts.sh

# Create placeholder font files so Next.js can build
for weight in Medium Semibold Bold Extrabold; do
  touch "src/fonts/GeneralSans-${weight}.woff2" 2>/dev/null || true
done
for variant in Regular Medium Semibold Bold; do
  touch "src/fonts/Inter-${variant}.woff2" 2>/dev/null || true
done

# ============================================================
# 10. UPDATE LAYOUT TO USE GOOGLE FONTS INSTEAD (simpler)
# ============================================================
# Actually, let's use Google Fonts which is simpler and doesn't need woff2 files
echo "📄 Switching to Google Fonts approach (simpler)..."

cat > src/app/layout.tsx << 'EOF'
import type { Metadata, Viewport } from "next";
import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
import Header from "@/components/Header";
import "./globals.css";

/* Display font: Plus Jakarta Sans — geometric, modern, with personality */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

/* Body font: DM Sans — clean, readable, slightly warmer than Inter */
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Grade My Professor — Bahrain",
  description: "Student-powered professor ratings across Bahrain. Anonymous, honest, helpful.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://grademyprofessor.bh"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF8" },
    { media: "(prefers-color-scheme: dark)", color: "#111110" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const t = localStorage.getItem('gmp_theme');
            const d = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme:dark)').matches);
            if (d) document.documentElement.classList.add('dark');
            const l = localStorage.getItem('gmp_lang');
            if (l === 'ar') { document.documentElement.lang = 'ar'; document.documentElement.dir = 'rtl'; }
          } catch {}
        `}} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `:root { --font-arabic: 'IBM Plex Sans Arabic', system-ui, sans-serif; } [dir="rtl"] body { font-family: var(--font-arabic); }` }} />
      </head>
      <body className={`${jakarta.variable} ${dmSans.variable} font-body min-h-screen bg-page`}>
        <Providers>
          <div className="max-w-lg mx-auto">
            <Header />
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
EOF

# Clean up placeholder fonts
rm -rf src/fonts 2>/dev/null || true

# ============================================================
# DONE
# ============================================================
echo ""
echo "✅ v3 Redesign files written!"
echo ""
echo "  FILES CREATED/REPLACED:"
echo "    tailwind.config.ts       — New design tokens + dark mode"
echo "    src/app/globals.css      — CSS variables, light/dark themes"
echo "    src/app/layout.tsx       — Font loading, providers, theme script"
echo "    src/app/page.tsx         — Redesigned homepage (server)"
echo "    src/lib/i18n.ts          — EN/AR translation dictionary"
echo "    src/components/Providers.tsx   — Theme + Language context"
echo "    src/components/Header.tsx      — Sticky header with toggles"
echo "    src/components/HomeClient.tsx  — Homepage client component"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "NEXT STEPS:"
echo ""
echo "  1. Run:  bash redesign.sh"
echo "  2. Run:  npm run dev"
echo "  3. Check localhost:3000 — you should see the new design"
echo "  4. Toggle dark mode with the moon/sun icon"
echo "  5. Toggle Arabic with the عربي button"
echo "  6. Deploy: npx vercel --prod"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
