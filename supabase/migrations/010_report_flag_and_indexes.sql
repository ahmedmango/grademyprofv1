-- Atomic report-insert + auto-flag RPC (eliminates race between count and update)
CREATE OR REPLACE FUNCTION insert_report_and_maybe_flag(
  p_review_id UUID,
  p_reason    TEXT,
  p_detail    TEXT DEFAULT ''
) RETURNS VOID AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO reports (review_id, reason, detail)
  VALUES (p_review_id, p_reason::report_reason, p_detail);

  SELECT count(*) INTO v_count
  FROM reports
  WHERE review_id = p_review_id;

  IF v_count >= 3 THEN
    UPDATE reviews
    SET status = 'flagged', updated_at = now()
    WHERE id = p_review_id AND status = 'live';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Partial index for user_id lookups (WHERE user_id IS NOT NULL)
CREATE INDEX IF NOT EXISTS idx_reviews_user_id
  ON reviews (user_id)
  WHERE user_id IS NOT NULL;
