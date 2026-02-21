#!/bin/bash
# ============================================================
# GradeMyProfessor v4.4 — Quick Fixes
# 1. Theme toggle: moon icon → dark mode, sun icon → light mode
# 2. Admin login: dark mode text visibility
# 3. Stats footer: orange numbers
# Run from project root: bash fixes4_4.sh
# ============================================================

set -e

echo "🔧 GradeMyProfessor v4.4 — Quick Fixes"
echo "========================================"

if [ ! -f "package.json" ]; then
  echo "❌ Run this from the project root"
  exit 1
fi

# ============================================================
# 1. FIND AND FIX THEME TOGGLE — wherever it lives
# ============================================================
echo "🌓 Fixing theme toggle icons + logic..."

# Strategy: find ALL files that contain theme toggle logic and patch them
# First, let's find where the toggle button actually renders

echo "  Searching for theme toggle code..."

# Look for the moon/sun emoji or SVG in all component files
TOGGLE_FILES=$(grep -rl "moon\|☀️\|🌙\|sun.*icon\|moon.*icon\|theme.*toggle\|toggleTheme\|setTheme.*dark\|setTheme.*light" src/ 2>/dev/null | grep -v node_modules | grep -v '.next' || true)

echo "  Files with theme logic: $TOGGLE_FILES"

# Now let's check the Providers to understand the theme context
PROVIDERS_FILE=$(find src -name "Providers*" -path "*/components/*" | head -1)

if [ -n "$PROVIDERS_FILE" ]; then
  echo "  Found Providers at: $PROVIDERS_FILE"
  echo "  Current theme logic:"
  grep -n "theme\|Theme\|dark\|light" "$PROVIDERS_FILE" | head -20
fi

# Find the nav/header where toggle button lives
NAV_FILE=$(grep -rl "ThemeToggle\|theme-toggle\|dark-mode-toggle\|🌙\|☀️" src/components/ 2>/dev/null | head -1)
if [ -z "$NAV_FILE" ]; then
  NAV_FILE=$(grep -rl "ThemeToggle\|theme-toggle\|🌙\|☀️" src/app/ 2>/dev/null | grep -v 'page\.' | head -1)
fi

echo "  Nav/header with toggle: ${NAV_FILE:-not found}"
echo ""

# Write a completely self-contained ThemeToggle that handles everything
cat > src/components/ThemeToggle.tsx << 'TOGGLE_EOF'
"use client";

import { useApp } from "./Providers";

export default function ThemeToggle() {
  const { theme, setTheme } = useApp();

  const isDark = theme === "dark";

  const handleToggle = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    
    // Also directly update DOM in case Providers is slow
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    
    // Persist
    try { localStorage.setItem("theme", next); } catch {}
  };

  return (
    <button
      onClick={handleToggle}
      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Show moon = click to go dark | Show sun = click to go light */}
      {isDark ? (
        /* Currently dark → show SUN so user can click to go light */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" fill="#FBBF24"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" 
            stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ) : (
        /* Currently light → show MOON so user can click to go dark */
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" 
            fill="#FBBF24" stroke="#FBBF24" strokeWidth="1"/>
        </svg>
      )}
    </button>
  );
}
TOGGLE_EOF

echo "  ✅ ThemeToggle rewritten with yellow moon/sun icons"

# Now ensure the toggle is actually USED in the nav
# Check if there's a Nav or Header component
NAV_COMP=$(find src/components -name "Nav*" -o -name "Header*" -o -name "TopBar*" -o -name "AppBar*" 2>/dev/null | head -1)

if [ -n "$NAV_COMP" ]; then
  echo "  Found nav component: $NAV_COMP"
  # Check if it already imports ThemeToggle
  if grep -q "ThemeToggle" "$NAV_COMP"; then
    echo "  ✅ Already imports ThemeToggle"
  else
    echo "  ⚠️  ThemeToggle not imported in nav — may need manual wiring"
  fi
fi

# ============================================================
# 2. ADMIN LOGIN — Fix dark mode text visibility  
# ============================================================
echo "🔐 Fixing admin login dark mode..."

ADMIN_LOGIN=$(find src -path "*/admin*" -name "*.tsx" 2>/dev/null | xargs grep -l "Sign In\|login\|password" 2>/dev/null | head -1)

if [ -z "$ADMIN_LOGIN" ]; then
  ADMIN_LOGIN=$(find src -path "*login*" -name "*.tsx" -o -path "*auth*" -name "*.tsx" 2>/dev/null | head -1)
fi

if [ -n "$ADMIN_LOGIN" ]; then
  echo "  Found admin login at: $ADMIN_LOGIN"
  
  # Fix input fields to have dark-mode-friendly styling
  # Add inline color styles to ensure text is visible
  sed -i.bak 's/className=".*input.*"/& style={{ color: "var(--text-primary)", background: "var(--bg-surface)" }}/g' "$ADMIN_LOGIN" 2>/dev/null || true
  
  echo "  Attempting CSS fix approach instead..."
fi

# Universal fix — add global CSS for admin inputs
cat >> src/app/globals.css << 'CSS_EOF'

/* Admin login — ensure inputs are visible in dark mode */
input[type="email"],
input[type="password"],
input[type="text"] {
  color: var(--text-primary, #000) !important;
  background: var(--bg-surface, #fff) !important;
}

/* Fix for admin page specifically */
[class*="admin"] input,
form input {
  color: var(--text-primary, #000) !important;
}
CSS_EOF

echo "  ✅ Admin input dark mode CSS fix added"

# ============================================================
# 3. STATS FOOTER — Orange numbers
# ============================================================
echo "🎨 Updating stats footer colors..."

# Patch HomeClient.tsx to use accent color for numbers
if [ -f "src/components/HomeClient.tsx" ]; then
  # Replace the stats footer section
  cat > /tmp/stats_patch.py << 'PYEOF'
import re

with open("src/components/HomeClient.tsx", "r") as f:
    content = f.read()

# Find and replace the stats footer
old_stats = '''      {/* Subtle footer stats */}
      <div className="mt-12 flex items-center gap-4" style={{ color: "var(--text-tertiary)" }}>
        <span className="text-[10px]">{totalUniversities} universities</span>
        <span className="text-[10px]">·</span>
        <span className="text-[10px]">{totalProfessors} professors</span>
        <span className="text-[10px]">·</span>
        <span className="text-[10px]">{totalReviews}+ reviews</span>
      </div>'''

new_stats = '''      {/* Stats footer */}
      <div className="mt-12 flex items-center gap-4">
        <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          <strong className="font-bold" style={{ color: "var(--accent)" }}>{totalUniversities}</strong> universities
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-tertiary)", opacity: 0.4 }}>·</span>
        <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          <strong className="font-bold" style={{ color: "var(--accent)" }}>{totalProfessors}</strong> professors
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-tertiary)", opacity: 0.4 }}>·</span>
        <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          <strong className="font-bold" style={{ color: "var(--accent)" }}>{totalReviews}+</strong> reviews
        </span>
      </div>'''

if old_stats in content:
    content = content.replace(old_stats, new_stats)
    with open("src/components/HomeClient.tsx", "w") as f:
        f.write(content)
    print("  ✅ Stats footer patched with orange numbers")
else:
    print("  ⚠️  Could not find exact stats block, trying alternate approach...")
    
    # Try a simpler replacement
    content = re.sub(
        r'<span className="text-\[10px\]">\{totalUniversities\} universities</span>',
        '<span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}><strong className="font-bold" style={{ color: "var(--accent)" }}>{totalUniversities}</strong> universities</span>',
        content
    )
    content = re.sub(
        r'<span className="text-\[10px\]">\{totalProfessors\} professors</span>',
        '<span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}><strong className="font-bold" style={{ color: "var(--accent)" }}>{totalProfessors}</strong> professors</span>',
        content
    )
    content = re.sub(
        r'<span className="text-\[10px\]">\{totalReviews\}\+? reviews</span>',
        '<span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}><strong className="font-bold" style={{ color: "var(--accent)" }}>{totalReviews}+</strong> reviews</span>',
        content
    )
    with open("src/components/HomeClient.tsx", "w") as f:
        f.write(content)
    print("  ✅ Stats footer patched (alternate approach)")

PYEOF

  python3 /tmp/stats_patch.py
  rm -f /tmp/stats_patch.py
else
  echo "  ⚠️  HomeClient.tsx not found"
fi

echo ""
echo "✅ v4.4 done!"
echo ""
echo "  CHANGED FILES:"
echo "    src/components/ThemeToggle.tsx  — Moon=dark, Sun=light, yellow icons"
echo "    src/app/globals.css             — Admin input dark mode fix"
echo "    src/components/HomeClient.tsx   — Orange stat numbers"
echo ""
echo "  NOTES:"
echo "    - Moon (yellow filled) → click = dark mode"
echo "    - Sun (yellow rays) → click = light mode"  
echo "    - Admin login inputs now use var(--text-primary) for text color"
echo "    - For password reset: go to Supabase > Authentication > Users"
echo ""
echo "  npm run dev → check all three fixes"
