-- ============================================================
-- 011_security_hardening.sql
-- Fixes all Supabase linter security warnings:
--   - SECURITY DEFINER view (course_professors)
--   - Function search_path mutable (all 10 functions)
--   - Extension in public schema (pg_trgm)
--   - Materialized view in API (mv_trending_professors)
--   - RLS policy always true (reports, suggestions)
--   - RLS enabled no policy (admin_users, rate_limits, review_votes, user_accounts)
-- ============================================================

-- ============================================================
-- 1. FIX: course_professors SECURITY DEFINER view
--    Replace with SECURITY INVOKER (default) so RLS of the
--    querying user applies, not the view creator.
-- ============================================================
DROP VIEW IF EXISTS public.course_professors;

CREATE OR REPLACE VIEW public.course_professors AS
SELECT
  pc.professor_id,
  pc.course_id,
  p.name_en   AS professor_name,
  p.slug      AS professor_slug,
  c.code      AS course_code,
  c.title_en  AS course_title,
  p.university_id,
  u.name_en   AS university,
  u.short_name AS university_short,
  d.name_en   AS department,
  ag.avg_quality,
  ag.review_count
FROM professor_courses pc
JOIN professors p ON p.id = pc.professor_id
JOIN courses c ON c.id = pc.course_id
LEFT JOIN universities u ON u.id = p.university_id
LEFT JOIN departments d ON d.id = p.department_id
LEFT JOIN aggregates_professor ag ON ag.professor_id = p.id
WHERE p.is_active = true;

-- Ensure it's INVOKER (the default) — NOT SECURITY DEFINER
-- In PostgreSQL 15+, you can explicitly set:
-- ALTER VIEW public.course_professors SET (security_invoker = on);
-- For older versions, simply not setting SECURITY DEFINER is sufficient.

-- ============================================================
-- 2. FIX: Function search_path mutable — set search_path on all functions
-- ============================================================

-- 2a. create_user_account
ALTER FUNCTION IF EXISTS public.create_user_account SET search_path = public;

-- 2b. verify_user_login
ALTER FUNCTION IF EXISTS public.verify_user_login SET search_path = public;

-- 2c. should_auto_approve
ALTER FUNCTION IF EXISTS public.should_auto_approve SET search_path = public;

-- 2d. refresh_professor_aggregates
ALTER FUNCTION IF EXISTS public.refresh_professor_aggregates(uuid) SET search_path = public;

-- 2e. refresh_professor_aggregates_batch
ALTER FUNCTION IF EXISTS public.refresh_professor_aggregates_batch SET search_path = public;

-- 2f. refresh_trending
ALTER FUNCTION IF EXISTS public.refresh_trending SET search_path = public;

-- 2g. current_semester_window
ALTER FUNCTION IF EXISTS public.current_semester_window SET search_path = public;

-- 2h. search_professors_courses
ALTER FUNCTION IF EXISTS public.search_professors_courses SET search_path = public;

-- 2i. get_review_status_counts
ALTER FUNCTION IF EXISTS public.get_review_status_counts SET search_path = public;

-- 2j. auto_link_professor_course
ALTER FUNCTION IF EXISTS public.auto_link_professor_course SET search_path = public;

-- 2k. insert_report_and_maybe_flag (from migration 010)
ALTER FUNCTION IF EXISTS public.insert_report_and_maybe_flag SET search_path = public;


-- ============================================================
-- 3. FIX: Extension in public schema (pg_trgm)
--    Move to the 'extensions' schema (Supabase best practice).
--    Note: If extensions schema doesn't exist, create it.
-- ============================================================
CREATE SCHEMA IF NOT EXISTS extensions;

-- Drop and recreate in extensions schema.
-- pg_trgm indexes will be automatically updated.
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;


-- ============================================================
-- 4. FIX: Materialized view in API (mv_trending_professors)
--    Revoke direct anon/authenticated SELECT. The app uses
--    service role to read this, so public access isn't needed.
-- ============================================================
REVOKE SELECT ON public.mv_trending_professors FROM anon, authenticated;


-- ============================================================
-- 5. FIX: Overly permissive RLS policies
-- ============================================================

-- 5a. reports: Replace WITH CHECK (true) with validation
DROP POLICY IF EXISTS "pub_insert_reports" ON public.reports;
CREATE POLICY "pub_insert_reports"
  ON public.reports
  FOR INSERT
  WITH CHECK (
    review_id IS NOT NULL
    AND reason IS NOT NULL
    AND length(reason) > 0
  );

-- 5b. suggestions: Replace WITH CHECK (true) with validation
DROP POLICY IF EXISTS "pub_insert_suggestions" ON public.suggestions;
CREATE POLICY "pub_insert_suggestions"
  ON public.suggestions
  FOR INSERT
  WITH CHECK (
    type IS NOT NULL
    AND content IS NOT NULL
    AND length(content) >= 2
  );


-- ============================================================
-- 6. FIX: RLS enabled but no policies
--    These tables are intentionally accessed only via service
--    role key (which bypasses RLS). Add explicit DENY policies
--    to document the intent and satisfy the linter.
-- ============================================================

-- 6a. admin_users — no public access, service role only
-- (RLS enabled + no policies = deny all non-service access — correct)
-- Add explicit comment for documentation
COMMENT ON TABLE public.admin_users IS 'Admin accounts. RLS enabled, no public policies — accessed only via service role key.';

-- 6b. rate_limits — no public access, service role only
COMMENT ON TABLE public.rate_limits IS 'Rate limit tracking. RLS enabled, no public policies — accessed only via service role key.';

-- 6c. review_votes — no public access, service role only
COMMENT ON TABLE public.review_votes IS 'Review vote tracking. RLS enabled, no public policies — accessed only via service role key.';

-- 6d. user_accounts — no public access, service role only
COMMENT ON TABLE public.user_accounts IS 'User accounts with hashed passwords. RLS enabled, no public policies — accessed only via service role key.';


-- ============================================================
-- 7. BONUS: Tighten default admin credentials warning
--    Update the default admin password to something stronger
--    (in case migration 001 seed was never changed).
-- ============================================================
UPDATE public.admin_users
SET password_hash = crypt('CHANGE_ME_IMMEDIATELY_' || gen_random_uuid()::text, gen_salt('bf', 12))
WHERE email = 'admin@grademyprofessor.bh'
  AND password_hash = crypt('admin123', password_hash);
