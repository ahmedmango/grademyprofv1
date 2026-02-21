#!/bin/bash
# ============================================================
# GradeMyProfessor v4.5.1 — Pre-push fixes
# 1. Unrated professors: apple icon with orange ring
# 2. Full aggregate refresh for ALL professors (not just new ones)
# Run from project root: bash fixes4_5_1.sh
# ============================================================

set -e

echo "🍎 GradeMyProfessor v4.5.1 — Pre-push fixes"
echo "=============================================="

if [ ! -f "package.json" ]; then
  echo "❌ Run this from the project root"
  exit 1
fi

# ============================================================
# 1. UNI CLIENT — Apple icon with orange ring for unrated
# ============================================================
echo "🍎 Adding apple icon for unrated professors..."

python3 << 'PYEOF'
with open("src/app/u/[universitySlug]/UniClientContent.tsx", "r") as f:
    content = f.read()

# Make sure AppleLogo is imported
if "AppleLogo" not in content:
    # Add import after existing imports
    content = content.replace(
        'import { getTagSentiment, getTagStyles } from "@/lib/tagColors";',
        'import { getTagSentiment, getTagStyles } from "@/lib/tagColors";\nimport AppleLogo from "@/components/AppleLogo";'
    )
    # If that import doesn't exist, try another anchor
    if "AppleLogo" not in content:
        content = content.replace(
            'import Link from "next/link";',
            'import Link from "next/link";\nimport AppleLogo from "@/components/AppleLogo";'
        )

# Now replace the N/A block with apple icon + orange ring
# Try multiple possible existing patterns

# Pattern 1: The "No Ratings Yet" text version
old_blocks = [
    # From v4.5 patch
    '''                  <div className="w-[56px] h-[56px] rounded-lg flex items-center justify-center" style={{ background: "var(--border)", opacity: 0.6 }}>
                    <span className="text-[8px] text-center leading-tight font-medium" style={{ color: "var(--text-tertiary)" }}>No<br/>Ratings<br/>Yet</span>
                  </div>''',
    # Original N/A version
    '''                  <div className="w-[56px] h-[56px] rounded-lg flex items-center justify-center" style={{ background: "var(--border)" }}>
                    <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>N/A</span>
                  </div>''',
]

new_block = '''                  <div className="w-[56px] h-[56px] rounded-full flex items-center justify-center" style={{ border: "2px solid var(--accent)", background: "var(--accent-soft, rgba(217,80,48,0.08))" }}>
                    <AppleLogo size={24} color="var(--accent)" />
                  </div>
                  <div className="text-[8px] mt-1 text-center leading-tight font-medium" style={{ color: "var(--text-tertiary)" }}>
                    No ratings
                  </div>'''

replaced = False
for old in old_blocks:
    if old in content:
        content = content.replace(old, new_block)
        replaced = True
        break

if not replaced:
    print("  ⚠️  Could not find exact N/A block. Trying regex approach...")
    import re
    # Try to find any N/A-like block
    pattern = r'<div className="w-\[56px\] h-\[56px\][^>]*>[\s\S]*?(?:N/A|No.*?Rating)[\s\S]*?</div>'
    match = re.search(pattern, content)
    if match:
        content = content[:match.start()] + new_block + content[match.end():]
        replaced = True
        print("  ✅ Replaced via regex")

if replaced:
    with open("src/app/u/[universitySlug]/UniClientContent.tsx", "w") as f:
        f.write(content)
    print("  ✅ Apple icon with orange ring added for unrated professors")
else:
    print("  ❌ Could not patch automatically. Manual edit needed.")

PYEOF

# ============================================================
# 2. SQL — Full aggregate refresh for ALL professors
# ============================================================
echo "📦 Writing full aggregate refresh SQL..."

cat > supabase/migrations/007b_refresh_all_aggregates.sql << 'SQL_EOF'
-- ============================================================
-- 007b: Refresh aggregates for ALL professors
-- Run this AFTER 007 to fix missing ratings on existing profs
-- ============================================================

-- Clear and rebuild all aggregates
TRUNCATE aggregates_professor;

INSERT INTO aggregates_professor (professor_id, review_count, avg_quality, avg_difficulty, would_take_again_pct, rating_dist, tag_dist, top_tags)
SELECT
  r.professor_id,
  COUNT(*)::int as review_count,
  ROUND(AVG(r.rating_quality), 2) as avg_quality,
  ROUND(AVG(r.rating_difficulty), 2) as avg_difficulty,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE r.would_take_again = true) / 
    NULLIF(COUNT(*) FILTER (WHERE r.would_take_again IS NOT NULL), 0), 
    1
  ) as would_take_again_pct,
  jsonb_build_object(
    '1', COUNT(*) FILTER (WHERE r.rating_quality >= 0.5 AND r.rating_quality < 1.5),
    '2', COUNT(*) FILTER (WHERE r.rating_quality >= 1.5 AND r.rating_quality < 2.5),
    '3', COUNT(*) FILTER (WHERE r.rating_quality >= 2.5 AND r.rating_quality < 3.5),
    '4', COUNT(*) FILTER (WHERE r.rating_quality >= 3.5 AND r.rating_quality < 4.5),
    '5', COUNT(*) FILTER (WHERE r.rating_quality >= 4.5)
  ) as rating_dist,
  (
    SELECT jsonb_object_agg(tag, cnt) FROM (
      SELECT tag, COUNT(*) as cnt
      FROM reviews r2, unnest(r2.tags) as tag
      WHERE r2.professor_id = r.professor_id AND r2.status = 'live'
      GROUP BY tag ORDER BY cnt DESC LIMIT 10
    ) t
  ) as tag_dist,
  (
    SELECT ARRAY_AGG(tag ORDER BY cnt DESC) FROM (
      SELECT tag, COUNT(*) as cnt
      FROM reviews r3, unnest(r3.tags) as tag
      WHERE r3.professor_id = r.professor_id AND r3.status = 'live'
      GROUP BY tag ORDER BY cnt DESC LIMIT 5
    ) t
  ) as top_tags
FROM reviews r
WHERE r.status = 'live'
GROUP BY r.professor_id
ON CONFLICT (professor_id) DO UPDATE SET
  review_count = EXCLUDED.review_count,
  avg_quality = EXCLUDED.avg_quality,
  avg_difficulty = EXCLUDED.avg_difficulty,
  would_take_again_pct = EXCLUDED.would_take_again_pct,
  rating_dist = EXCLUDED.rating_dist,
  tag_dist = EXCLUDED.tag_dist,
  top_tags = EXCLUDED.top_tags;

SQL_EOF

echo "  ✅ Full aggregate refresh SQL written"

echo ""
echo "✅ v4.5.1 done!"
echo ""
echo "  CHANGED:"
echo "    src/app/u/.../UniClientContent.tsx — Apple icon + orange ring for unrated"
echo "    supabase/migrations/007b_*.sql     — Full aggregate refresh for ALL profs"
echo ""
echo "  STEPS:"
echo "    1. bash fixes4_5_1.sh"
echo "    2. Run 007 migration first (new unis + data):"
echo "       cat supabase/migrations/007_new_universities_and_data.sql | pbcopy"
echo "    3. Then run 007b (aggregate refresh for ALL):"  
echo "       cat supabase/migrations/007b_refresh_all_aggregates.sql | pbcopy"
echo "    4. npm run dev → verify ratings show for existing profs"
echo "    5. git add -A && git commit && git push"
