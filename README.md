# GradeMyProfessor Bahrain

> **What Students Say** — Anonymous professor ratings by real students across Bahrain universities.

## Architecture

- **Frontend**: Next.js 14 (App Router) + TypeScript + TailwindCSS
- **Backend**: Next.js API Routes + Supabase (Postgres + RLS)
- **Moderation**: All reviews default to `pending` — moderators must approve before they go live
- **Auth**: Anonymous device fingerprint for students, simple token auth for admin

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url> && cd grade-my-professor-bh
npm install

# 2. Set up Supabase
#    - Create project at supabase.com
#    - Run supabase/migrations/001_initial_schema.sql in the SQL Editor
#    - Copy project URL and keys

# 3. Configure environment
cp .env.local.example .env.local
# Edit .env.local with your Supabase keys

# 4. Run development server
npm run dev
# Open http://localhost:3000
```

## Moderation Flow

**Every review goes through moderation before becoming public:**

1. Student submits a rating → status is set to `pending`
2. Auto-scan checks for profanity, doxxing, defamation → `removed` or `flagged` if detected
3. Moderator reviews at `/admin/moderation`:
   - **Approve** → status becomes `live`, aggregates are refreshed
   - **Reject** → status becomes `removed`
   - **Shadow** → hidden from public but user thinks it's posted
   - **Flag** → marked for senior moderator review
4. Bulk actions available: select multiple reviews and approve/reject at once

## Admin Console (`/admin`)

| Page | Purpose |
|------|---------|
| `/admin` | Dashboard with status counts, today's reviews, top professors |
| `/admin/moderation` | Review queue with tabs (Pending, Flagged, Live, Shadow, Removed) |
| `/admin/entities` | CRUD management for universities, departments, professors, courses |

**Login**: Use the admin email + ADMIN_SECRET from `.env.local`

Default admin: `admin@grademyprofessor.bh` / secret from env

## API Routes

### Public
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/search?q=` | Search professors and courses |
| GET | `/api/professor?slug=` | Professor profile + reviews |
| POST | `/api/review` | Submit a review (requires `x-anon-user-hash` header) |

### Admin (requires `Authorization: Bearer <secret>:<email>`)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/mod-queue?status=pending` | Get moderation queue |
| POST | `/api/admin/review-action` | Single review action (approve/reject/shadow/flag) |
| PUT | `/api/admin/review-action` | Bulk action on up to 50 reviews |
| GET | `/api/admin/stats` | Dashboard statistics |
| CRUD | `/api/admin/universities` | Manage universities |
| CRUD | `/api/admin/professors` | Manage professors |
| CRUD | `/api/admin/courses` | Manage courses |
| CRUD | `/api/admin/departments` | Manage departments |

## Anti-Abuse Protections

- **Rate limiting**: 10 reviews/day per user, 5/hour per IP
- **Duplicate prevention**: 1 review per professor+course per semester
- **Content scanning**: Profanity filter, doxxing pattern detection, defamation detection
- **Brigading detection**: Flags spikes of 5+ reviews on same professor in 5 minutes
- **0.5-increment ratings**: Quality and difficulty on 0.5–5.0 scale

## File Structure

```
src/
├── app/
│   ├── page.tsx                    # Home (SSR)
│   ├── search/page.tsx             # Search (client)
│   ├── u/[universitySlug]/page.tsx # University page (SSR)
│   ├── p/[professorSlug]/page.tsx  # Professor profile (SSR + SEO)
│   ├── rate/page.tsx               # 5-step rating flow (client)
│   ├── admin/
│   │   ├── page.tsx                # Admin dashboard
│   │   ├── moderation/page.tsx     # Moderation queue
│   │   └── entities/page.tsx       # CRUD management
│   └── api/                        # All API routes
├── lib/
│   ├── supabase/                   # Server + client Supabase clients
│   ├── moderation.ts               # Content scanning rules
│   ├── admin-auth.ts               # Admin authentication
│   ├── anon-identity.ts            # Device fingerprint hashing
│   ├── constants.ts                # Tags, rate limits, enums
│   └── utils.ts                    # Formatting, colors, helpers
└── components/
    └── RateButton.tsx              # Sticky CTA component
```

## Deployment

```bash
# Deploy to Vercel
npx vercel

# Add env vars in Vercel dashboard:
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, ADMIN_SECRET
```

## Database

Run `supabase/migrations/001_initial_schema.sql` which creates:
- 10 tables with proper foreign keys and constraints
- RLS policies (public read for live content, service role for writes)
- Full-text search indexes
- Aggregate refresh function
- 8 seeded Bahrain universities + departments for UoB and AUBH
- Default admin user
