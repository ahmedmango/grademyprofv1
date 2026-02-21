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

