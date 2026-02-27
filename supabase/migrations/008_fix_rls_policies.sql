-- ============================================================
-- Migration 008: Fix RLS policy security gap + review_votes RLS
-- ============================================================
--
-- Problem: The svc_* policies created in 001 and 006 were intended
-- for the service role, but they have no TO clause. PostgreSQL applies
-- policies to ALL roles when no TO clause is specified. Since the
-- service role bypasses RLS entirely (it never evaluates policies),
-- these policies only ever apply to the anon role — inadvertently
-- granting the anon key full read/write access to sensitive tables.
--
-- Fix: Drop all svc_* policies. The service role does not need them.
-- Each table retains its pub_read_* policy for legitimate anon reads.
-- ============================================================

-- Drop svc_* policies from migration 001
DROP POLICY IF EXISTS "svc_all_reviews"       ON reviews;
DROP POLICY IF EXISTS "svc_all_reports"       ON reports;
DROP POLICY IF EXISTS "svc_all_aggregates"    ON aggregates_professor;
DROP POLICY IF EXISTS "svc_all_rate_limits"   ON rate_limits;
DROP POLICY IF EXISTS "svc_all_admin_users"   ON admin_users;

-- Drop svc_* policy from migration 006
DROP POLICY IF EXISTS "svc_all_suggestions"   ON suggestions;

-- ============================================================
-- review_votes: Enable RLS (table was created without it in the
-- create_review_votes migration). All access goes through API
-- routes that use the service key, which bypasses RLS.
-- Anon key has no direct access to this table.
-- ============================================================
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;

-- No policies needed: service role bypasses RLS for all vote
-- operations (GET counts, POST vote). Block direct anon access.
