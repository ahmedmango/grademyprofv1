"use client";

import { useApp } from "./Providers";

export default function ThemeToggle() {
  const { theme, setTheme } = useApp();
  const isDark = theme === "dark";

  const handleToggle = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try { localStorage.setItem("theme", next); } catch {}
  };

  // In light mode → show MOON (click to go dark)
  // In dark mode → show SUN (click to go light)
  // Colors: black in light mode, white in dark mode (via currentColor)

  return (
    <button
      onClick={handleToggle}
      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        color: "var(--text-primary)",
      }}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        /* SUN — shown in dark mode, click goes to light */
        <svg width="18" height="18" viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="18"/>
          <rect x="47" y="5" width="6" height="18" rx="3"/>
          <rect x="47" y="77" width="6" height="18" rx="3"/>
          <rect x="77" y="47" width="18" height="6" rx="3"/>
          <rect x="5" y="47" width="18" height="6" rx="3"/>
          <rect x="73.5" y="19.5" width="6" height="18" rx="3" transform="rotate(45 76.5 28.5)"/>
          <rect x="20.5" y="62.5" width="6" height="18" rx="3" transform="rotate(45 23.5 71.5)"/>
          <rect x="62.5" y="73.5" width="18" height="6" rx="3" transform="rotate(45 71.5 76.5)"/>
          <rect x="19.5" y="20.5" width="18" height="6" rx="3" transform="rotate(45 28.5 23.5)"/>
        </svg>
      ) : (
        /* MOON — shown in light mode, click goes to dark */
        <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M72 52.6C72 71.8 56.4 87.4 37.2 87.4C23.3 87.4 11.3 79.4 5.3 67.8C9.8 70.2 15 71.5 20.5 71.5C39.7 71.5 55.3 55.9 55.3 36.7C55.3 27.8 52 19.7 46.5 13.5C61.2 16.5 72 33.2 72 52.6Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="4"
          />
        </svg>
      )}
    </button>
  );
}
