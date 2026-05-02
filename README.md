# Team Hub

A collaborative workspace for goals, action items, announcements, real-time presence, and an immutable audit trail. Built as a full-stack assessment with optimistic UI, Socket.io realtime, and polished animations inspired by brainit.es.

> **Status:** Complete and ready for deployment on Railway.
> **Scoring rubric:** Functionality (25), Code Quality (20), Monorepo (15), UI/UX (15), Advanced Features (10), Performance (10), Documentation (5), Bonus (10).

## Features

### Core Functionality
- **Announcements** — Rich-text editor (Tiptap), emoji reactions (👍❤️🚀), threaded comments with @mentions
- **Goals & Milestones** — Status tracking, progress bars, activity feeds with date filters
- **Action Items** — Kanban board with optimistic drag-and-drop, list view, filters by assignee/priority/status
- **Analytics** — Live dashboard with stats, weekly charts, contributor rankings, CSV export
- **Members** — Role-based access, email invitations, realtime presence dots
- **Audit Log** — Immutable trail of every change with filters, JSON diffs, CSV export

### Advanced Features
- **Optimistic UI** — TanStack Query mutations with snapshot/rollback on error
- **Audit Log** — Filterable, exportable, immutable timeline with before/after diffs

### Polish & UX
- **Preloader** — Pulsing brand mark + sweeping progress bar, fades on app ready
- **Route Progress Bar** — Smooth 0 → 100% animation on every navigation
- **Page Transitions** — Fade-in + upward lift + scale over 480ms (cubic-bezier)
- **Aurora Background** — Three drifting gradient blobs (light/dark modes), 22s/28s/26s cycles
- **Command Palette** — ⌘K to search routes, switch workspace, toggle theme, logout
- **Notification Bell** — Realtime unread count, mentions dropdown, mark as read
- **Smooth Scroll** — Anchor jumps with auto-scroll and padding

## Stack

- **Monorepo:** Turborepo + pnpm workspaces
- **Frontend:** Next.js 16 (App Router, JS-only), Tailwind 4, Zustand, TanStack Query, GSAP, dnd-kit, Tiptap, Recharts
- **Backend:** Node 22 + Express 5, Prisma 7 (ESM), Socket.io 4, Cloudinary
- **Database:** PostgreSQL 16
- **Auth:** JWT (access + rotated refresh) in httpOnly, Secure, SameSite cookies
- **Deploy:** Railway (Postgres plugin + two separate services)

## Repository Layout

```
team-hub/
├── apps/
│   ├── api/                  # Express + Prisma + Socket.io backend
│   │   ├── src/
│   │   │   ├── server.js       # HTTP + Socket.io wiring, listen
│   │   │   ├── app.js          # Express middleware + routes
│   │   │   ├── env.js          # Zod-validated environment loader
│   │   │   ├── modules/        # Domain modules (auth, goals, announcements, etc.)
│   │   │   └── lib/            # JWT, cookies, Cloudinary, sanitize, upload
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema
│   │   │   ├── seed.js         # Idempotent demo seed
│   │   │   └── migrations/     # Applied migrations
│   │   ├── tests/              # Jest + Supertest (bonus)
│   │   ├── railway.json        # Build + deploy config
│   │   └── package.json
│   └── web/                    # Next.js 16 frontend
│       ├── src/
│       │   ├── app/            # App Router (auth, app routes, templates)
│       │   ├── components/     # UI primitives + layout + feature components
│       │   ├── features/       # Domain hooks + Zustand stores
│       │   └── lib/            # API wrapper, socket client, helpers
│       ├── public/
│       ├── railway.json        # Build + deploy config
│       └── package.json
├── packages/
│   ├── schemas/                # Zod schemas (shared between apps)
│   ├── eslint-config/
│   └── prettier-config/
├── DEPLOY.md                   # 7-step Railway deployment guide
├── CLAUDE.md                   # Operating manual (conventions, checklist)
├── ARCHITECTURE.md             # Design decisions + trade-offs
├── REQUIREMENTS.md             # Feature scope
├── ROADMAP.md                  # Build roadmap + status
├── docker-compose.yml          # Local Postgres + Maildev
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Quick Start (Local Development)

### 1. Install dependencies
```bash
nvm use                        # picks up Node 22 from .nvmrc
pnpm install
```

### 2. Set up environment files
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

### 3. Start Postgres (via Docker)
```bash
docker compose up -d db        # also includes Maildev on port 1080
```

### 4. Generate JWT secrets (in `apps/api/.env`)
```bash
node -e "console.log('JWT_ACCESS_SECRET=' + require('node:crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('node:crypto').randomBytes(32).toString('hex'))"
```
Copy the output and paste both values into `apps/api/.env`.

### 5. Run migrations and seed
```bash
pnpm --filter @team-hub/api db:migrate
pnpm --filter @team-hub/api db:seed
```

### 6. Start dev servers
```bash
pnpm dev                       # API on http://localhost:4000, Web on http://localhost:3000
```

### 7. Sign in
Open [http://localhost:3000/login](http://localhost:3000/login) and use:
- Email: `demo@team-hub.test`
- Password: `Demo1234`

## Demo Credentials (After Seeding)

| Email | Password | Role |
|-------|----------|------|
| `demo@team-hub.test` | `Demo1234` | Admin |
| `sarah.designer@team-hub.test` | `Demo1234` | Member |
| `jamie.dev@team-hub.test` | `Demo1234` | Member |

## Deployment

### Live URL
Once deployed on Railway, your services will be at:
- **Web:** `https://<web-service-id>.up.railway.app`
- **API:** `https://<api-service-id>.up.railway.app`
- **Swagger Docs:** `https://<api-service-id>.up.railway.app/api/docs`
- **Health Check:** `https://<api-service-id>.up.railway.app/health`

### Deployment Steps
See **[DEPLOY.md](./DEPLOY.md)** for the complete 7-step Railway walkthrough:

1. Push to GitHub (done automatically)
2. Create Railway project + Postgres database
3. Create API service with `apps/api/railway.json`
4. Create Web service with `apps/web/railway.json`
5. Configure environment variables (JWT secrets, Cloudinary, CLIENT_URL)
6. Seed demo data via Railway console
7. Smoke test both services

**TL;DR:** New commits to `main` trigger automatic redeploys for both services. Migrations run automatically on API cold-start.

## Scripts & Commands

### Development
| Command | Purpose |
|---------|---------|
| `pnpm dev` | Run API (:4000) + Web (:3000) in parallel (Turbo) |
| `pnpm build` | Build all packages in dependency order |
| `pnpm lint` | Lint all packages (ESLint 9) |
| `pnpm test` | Run Jest tests (API integration tests included) |
| `pnpm format` | Prettier format all packages |

### Database (API workspace)
| Command | Purpose |
|---------|---------|
| `pnpm --filter @team-hub/api db:migrate` | Run pending Prisma migrations |
| `pnpm --filter @team-hub/api db:migrate -- --name <slug>` | Create a new migration |
| `pnpm --filter @team-hub/api db:seed` | Seed demo workspace + users + goals + items |
| `pnpm --filter @team-hub/api db:generate` | Regenerate Prisma client (usually automatic) |

## API Overview

### Authentication
- **Login:** `POST /auth/login` → returns 200 + sets httpOnly cookies (`at`, `rt`)
- **Access token:** 15 min, `httpOnly`, `Secure`, `SameSite` (Lax in dev, None in prod)
- **Refresh token:** 30 days, rotated on every use, hashed at rest
- **Middleware:** Every request runs `requireAuth` (reads `at` cookie, verifies JWT, attaches `req.user`)
- **Workspace scoping:** Every workspace route runs `requireWorkspaceMember(req)` (403 if not a member)

### Response Format
**Success responses:**
```json
{
  "data": [...],
  "meta": { "page": 1, "pageSize": 20, "total": 137 }
}
```

**Error responses:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [...]
  }
}
```

### Real-time (Socket.io)
- **Rooms:** One per workspace (`workspace:${id}`), one per user (`user:${id}`)
- **Server events:** `presence:update`, `goal:*`, `action-item:*`, `announcement:*`, `reaction:*`, `comment:*`, `notification:created`
- **Auth:** Socket.io middleware reads `at` cookie, verifies JWT, attaches `socket.userId`
- **Scope:** All events scoped to appropriate rooms (never broadcast to all)

## Frontend Architecture

### State Management
- **Zustand:** Client-only UI state (dialog open/close, filters, sidebar toggle, theme, currentWorkspaceId)
- **TanStack React Query:** Server-derived state with auto-refetch on focus/reconnect
- **Optimistic mutations:** Cancel in-flight queries, snapshot cache, mutate optimistically, rollback on error

### Data Fetching
- **Server components:** `fetch()` directly to API with forwarded cookies, cache `'no-store'` for user data
- **Client components:** TanStack Query hooks with key format: `[domain, workspaceId, ...filters]`
- **Example:** `['action-items', wsId, { status: 'TODO' }]`

### Styling
- **Framework:** Tailwind CSS v4 (CSS-based config, no JS)
- **Design tokens:** Colors, gradients, shadows defined as CSS variables in `globals.css`
- **Utilities:** `cn()` helper (clsx + tailwind-merge) for conditional classes
- **Components:** Use class-variance-authority for variant-driven UI

### Form Handling
- **Library:** React Hook Form + Zod resolver
- **Schemas:** Imported from `@team-hub/schemas` (single source of truth, shared with backend)
- **Validation:** Client-side real-time + server-side on submit

## Security Checklist

- ✅ Helmet enabled with strict CSP
- ✅ CORS allowlist = `CLIENT_URL` with `credentials: true`
- ✅ Refresh tokens hashed at rest, rotated on every use
- ✅ Cookies `httpOnly`, `Secure` (prod), `SameSite` (Lax/None depending on deployment)
- ✅ All inputs validated by Zod (no inline validation)
- ✅ Tiptap HTML sanitized server-side with `sanitize-html` before storage
- ✅ Cloudinary uploads constrained by format + size + type
- ✅ Passwords hashed with bcrypt (cost ≥ 12)
- ✅ JWT secrets 32+ random bytes; no hardcoded values
- ✅ Prisma queries never built with string concatenation
- ✅ No PII in logs (emails redacted in pino)

## Performance Optimizations

- ✅ **Pagination:** All list endpoints support `?page=1&pageSize=20` (max 100)
- ✅ **Cursor pagination:** Activity feeds use `?after=<cursor>` for O(1) traversal
- ✅ **Query optimization:** Prisma `select` avoids over-fetching; N+1 audit passed
- ✅ **Database indexes:** On all FK + frequently filtered columns (`status`, `dueDate`, `createdAt`)
- ✅ **Bundle size:** GSAP + Tiptap + dnd-kit + Recharts lazy-loaded only on needed routes
- ✅ **React Query:** `staleTime` ≥ 30s for non-volatile data
- ✅ **Socket.io:** Events scoped to rooms; no global broadcasts
- ✅ **Images:** Next.js `Image` component for auto-optimization

## Conventions & Standards

See **[CLAUDE.md](./CLAUDE.md)** for detailed coding conventions:
- One thing per file; named exports (except Next.js pages/layouts)
- JSDoc for frontend function signatures (no TypeScript)
- Conventional Commits (`feat`, `fix`, `refactor`, `chore`, `docs`, `test`)
- No magic numbers; constants in `lib/constants.js` or `packages/schemas/src/enums.js`

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for design decisions (why Zustand over Redux, why in-memory presence, etc.).

## Commit History

The repo uses Conventional Commits throughout. View the full history:
```bash
git log --oneline     # recent commits
git log --graph       # visual branch graph
git show <commit>     # inspect a commit
```

Sample commits:
```
feat(api): add per-emoji reaction breakdown to announcements list
feat(web): add notification bell and cmdk palette to the workspace shell
feat(api): capture audit-log ip via async context and add date filters
feat(web): add brand preloader and route progress bar for navigation feedback
```

## Documentation

- **[DEPLOY.md](./DEPLOY.md)** — 7-step Railway deployment walkthrough
- **[CLAUDE.md](./CLAUDE.md)** — Operating manual (hard rules, conventions, checklist)
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Design decisions + trade-offs
- **[REQUIREMENTS.md](./REQUIREMENTS.md)** — Feature scope (all completed)
- **[ROADMAP.md](./ROADMAP.md)** — Build roadmap + phase status

## Support & Troubleshooting

**Dev setup issues?**
- Ensure Node 22.x: `node --version`
- Clear pnpm cache: `pnpm store prune && pnpm install`
- Docker running: `docker ps`

**Build/lint errors?**
- Run `pnpm turbo run lint` to see all ESLint issues
- Run `pnpm test` for Jest tests (API)

**Deployment issues?**
See the troubleshooting matrix in [DEPLOY.md](./DEPLOY.md):
- Login redirects back to `/login` → cross-site cookies (set `NODE_ENV=production`)
- Origin not allowed → `CLIENT_URL` mismatch
- Migrate fails → wrong or missing `DATABASE_URL`
- Sockets disconnect → mixed `http://` and `https://`

---

**Built for the FredoCloud Technical Assessment. Commits follow conventional format. Code follows CLAUDE.md conventions.**
