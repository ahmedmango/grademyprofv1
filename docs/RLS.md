# Row Level Security (RLS) — GradeMyProfessor

## How Access Works

All Next.js API routes use `createServiceClient()` which authenticates with
`SUPABASE_SERVICE_ROLE_KEY`. **The service role bypasses RLS entirely** — it
never evaluates any policy. This means:

- Every database write (reviews, votes, reports, aggregates, rate limits) is
  performed by the service role and is always allowed regardless of policies.
- RLS policies only restrict **direct anon-key access** (e.g., someone using
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` to query Supabase directly, bypassing the
  Next.js API layer).

The professor and course SSR pages use `createServerClient()` (anon key) for
read-only public data. All other pages use the service client via API routes.

---

## Policy Inventory

### `universities`
| Policy | Operation | Condition |
|--------|-----------|-----------|
| `pub_read_universities` | SELECT | `is_active = true` |

Anon key sees only active universities. Inactive universities are hidden.

---

### `departments`
| Policy | Operation | Condition |
|--------|-----------|-----------|
| `pub_read_departments` | SELECT | `true` |

All departments are publicly readable.

---

### `professors`
| Policy | Operation | Condition |
|--------|-----------|-----------|
| `pub_read_professors` | SELECT | `is_active = true` |

Anon key sees only active professors. Deactivated profiles are hidden.

---

### `courses`
| Policy | Operation | Condition |
|--------|-----------|-----------|
| `pub_read_courses` | SELECT | `true` |

All courses are publicly readable.

---

### `professor_courses`
| Policy | Operation | Condition |
|--------|-----------|-----------|
| `pub_read_prof_courses` | SELECT | `true` |

The join table is publicly readable.

---

### `reviews`
| Policy | Operation | Condition |
|--------|-----------|-----------|
| `pub_read_live_reviews` | SELECT | `status = 'live'` |
| `user_read_own_reviews` | SELECT | `anon_user_hash = current_setting('app.anon_user_hash', true)` |

Anon key can only SELECT reviews with `status = 'live'`. Pending, flagged,
shadow, and removed reviews are invisible to the anon key.

`user_read_own_reviews` relies on the app setting a per-request
`app.anon_user_hash` session variable — this is not currently wired up in the
Next.js service client, so in practice it has no effect. Reviews owned by a
user are fetched via the `/api/my-reviews` route (service key).

**No INSERT / UPDATE / DELETE policy** — anon key cannot write reviews directly.
All mutations go through `/api/review` (service key).

---

### `aggregates_professor`
| Policy | Operation | Condition |
|--------|-----------|-----------|
| `pub_read_aggregates` | SELECT | `true` |

Aggregate stats (avg rating, review count, etc.) are publicly readable.
No write policies — updates are done by `refresh_professor_aggregates()` via
the service key.

---

### `reports`
| Policy | Operation | Condition |
|--------|-----------|-----------|
| *(none)* | — | — |

No anon-key access to `reports`. All report operations go through
`/api/report` (service key). Report data never reaches the client.

---

### `admin_users`
| Policy | Operation | Condition |
|--------|-----------|-----------|
| *(none)* | — | — |

No anon-key access to `admin_users`. Admin credentials are verified
server-side via `/api/admin/auth` (service key). Admin sessions are
JWT-based and never expose database credentials.

---

### `rate_limits`
| Policy | Operation | Condition |
|--------|-----------|-----------|
| *(none)* | — | — |

No anon-key access to `rate_limits`. Rate-limit checks are enforced in
API routes using the service key.

---

### `suggestions`
| Policy | Operation | Condition |
|--------|-----------|-----------|
| `pub_insert_suggestions` | INSERT | `true` (no row-level check) |

Anon key can INSERT suggestions (user-submitted content). No SELECT —
suggestions are read by admins via the service key. No UPDATE/DELETE.

---

### `review_votes`
| Policy | Operation | Condition |
|--------|-----------|-----------|
| *(none)* | — | — |

RLS is enabled. No anon-key access. Vote counts and user vote state are
fetched via `/api/review-vote` (service key). Votes are cast via
`/api/review-vote` POST (service key, requires authenticated user session).

---

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| Attacker reads pending/flagged reviews directly via anon key | Blocked — `pub_read_live_reviews` restricts SELECT to `status = 'live'` |
| Attacker reads all admin credentials via anon key | Blocked — `admin_users` has no anon-key policies |
| Attacker reads all reports via anon key | Blocked — `reports` has no anon-key policies |
| Attacker reads vote data to identify users | Blocked — `review_votes` has RLS enabled with no anon policies |
| Attacker submits a review directly via anon key | Blocked — `reviews` has no INSERT policy for anon key |
| Attacker modifies review status via anon key | Blocked — `reviews` has no UPDATE/DELETE policy for anon key |
| Attacker floods rate_limits table via anon key | Blocked — `rate_limits` has no anon-key policies |
| API brute force on admin login | Mitigated — middleware enforces 5 req/min per IP via Upstash rate limiter |
| Weak dev JWT secrets in production | Mitigated — production logs `CRITICAL` error and returns empty string; verified via env var check |

---

## What Is NOT Protected by RLS

- **Service role access**: Service role bypasses all RLS. Any code running with
  the service key can read/write any row. Only the Next.js API layer (which we
  control) uses the service key.
- **Public aggregate data**: `aggregates_professor` is fully readable by anon.
  This is intentional — ratings are public.
- **Active professor/course/university data**: All publicly readable. Consistent
  with the product's purpose.

---

## Migrations

| Migration | RLS Changes |
|-----------|-------------|
| `001_initial_schema.sql` | Enabled RLS on all core tables; added `pub_read_*` and (now-dropped) `svc_*` policies |
| `002_upgrade_v2.sql` | Added `user_read_own_reviews` policy |
| `006_suggestions_and_fixes.sql` | Enabled RLS on `suggestions`; added `pub_insert_suggestions` and (now-dropped) `svc_all_suggestions` |
| `008_fix_rls_policies.sql` | Dropped all `svc_*` policies; enabled RLS on `review_votes` |
