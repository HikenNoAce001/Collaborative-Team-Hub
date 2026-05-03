<div align="center">

# Team Hub

**A real-time collaborative workspace — announcements, goals, action items, presence, audit log, and analytics.**

Built with **Express 5** + **Next.js 16** + **Prisma 7** + **Socket.io 4** + **PostgreSQL**

[![Node](https://img.shields.io/badge/Node-22-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?logo=socketdotio&logoColor=white)](https://socket.io)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

**Live demo →** [teamhub-pulse.up.railway.app](https://teamhub-pulse.up.railway.app)
**API docs →** [/api/docs](https://collaborative-team-hub-api.up.railway.app/api/docs)

</div>

---

## Demo Login

Open the live URL and sign in with any of the seeded users:

| Email | Password | Role |
| --- | --- | --- |
| `demo@team-hub.test` | `Demo1234` | Admin |
| `sarah.designer@team-hub.test` | `Demo1234` | Member |
| `jamie.dev@team-hub.test` | `Demo1234` | Member |
| `alex.pm@team-hub.test` | `Demo1234` | Member |

Open two browsers with different accounts to see real-time presence, kanban moves, and notifications sync live.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                       Client (Browser)                           │
│                Next.js 16 App Router + React 19                  │
│         TanStack Query (server state) ← Zustand (UI state)       │
│                  Tiptap · dnd-kit · Recharts                     │
└──────────────────────┬───────────────────────────────────────────┘
                       │ same-origin /api/*  +  /socket.io/*
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│            Next.js Server (rewrites + SSR auth gate)             │
│   /api/:path*       →  forwarded to Express API server-side      │
│   /socket.io/:path* →  forwarded for socket.io polling           │
│   (auth cookie lives on web origin → cross-domain PSL workaround)│
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Express 5 API  (modules per domain)             │
│                                                                  │
│  ┌────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │  Auth  │  │Workspaces│  │  Goals   │  │   Action Items    │   │
│  │  JWT   │  │ + Members│  │+Milestones│  │  (Kanban + List)  │   │
│  └────────┘  └──────────┘  └──────────┘  └───────────────────┘   │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────────┐  │
│  │Announcements │  │ Notifications  │  │  Analytics + CSV     │  │
│  │+Reactions+   │  │  + Audit Log   │  │     export           │  │
│  │ Comments     │  │                │  │                      │  │
│  └──────────────┘  └────────────────┘  └──────────────────────┘  │
│                                                                  │
│   middleware: requireAuth · requireWorkspaceRole · validate(zod) │
└──────────────────────┬─────────────────────────┬─────────────────┘
                       │                         │
                       ▼                         ▼
        ┌────────────────────────────┐  ┌────────────────────┐
        │ Prisma 7 + @prisma/adapter │  │   Socket.io 4      │
        │  PostgreSQL 16             │  │  workspace rooms   │
        │  + migrations              │  │  + per-user rooms  │
        └────────────────────────────┘  └────────────────────┘
```

### Auth Flow

```
Login ──► POST /api/auth/login ──► API sets:
                                     at  cookie (15min, httpOnly, SameSite=None)
                                     rt  cookie (30d,  httpOnly, path=/auth)

API call ──► same-origin via Next.js proxy ──► 401? ──► /auth/refresh (rotate)
                                                            │
                                                     refresh fails? ──► /login
```

### Real-time Flow

```
socket.connect() ──► Next.js proxy ──► API socket.io middleware
                                          │
                                  reads `at` cookie ──► verify JWT
                                          │
                              join `user:{userId}` room
                                          │
                          client emits `workspace:join`
                                          │
                              join `workspace:{wsId}` room
                                          │
              server broadcasts `presence:update` to that room
              server emits `notification:created` to `user:` room
              server emits `goal:updated`/`reaction:added`/etc.
                  to `workspace:` room on every state change
```

---

## Feature Map

| Domain | Highlights |
| --- | --- |
| **Auth** | JWT in `httpOnly` cookies. Refresh-token rotation with `RefreshToken` table (hashed at rest). Bcrypt cost 12. Rate limit 10/min on `/auth/*`. |
| **Workspaces** | Multi-tenant with per-workspace `ADMIN`/`MEMBER` roles. Invitations via tokenized links (7-day expiry). Email fallback to console log. |
| **Goals** | Status machine (`DRAFT` → `ON_TRACK` / `AT_RISK` → `COMPLETED`). Milestones with progress bars. Activity feed cursor-paginated. |
| **Action Items** | Kanban (4 columns, dnd-kit) with **optimistic** drop. List view with sortable columns and URL-persisted filters. |
| **Announcements** | Tiptap rich-text → server-side `sanitize-html`. Pin/unpin. Per-emoji reactions, flat comments, `@mentions` with autocomplete. |
| **Real-time** | Workspace rooms broadcast every state change. Presence dots (5s leave detection). Per-user rooms for notifications. |
| **Notifications** | Bell badge with unread count. Click to navigate to source (announcement/comment). Two kinds: `mention`, `reaction`. |
| **Analytics** | Dashboard widgets (active goals, completed-this-week, overdue). Recharts completion line chart. CSV export. |
| **Audit Log** | Every mutation writes one immutable row in the same transaction. Filter by actor / action / entity / date range. CSV export. |
| **Bonus** | `next-themes` dark/light, `cmdk` ⌘K palette, Swagger UI at `/api/docs`. |

---

## Tech Stack

| Layer | Choice |
| --- | --- |
| **API** | Node 22, Express 5, ESM, async route handlers |
| **ORM** | Prisma 7 (`prisma-client-js`) + `@prisma/adapter-pg` |
| **Database** | PostgreSQL 16 |
| **Auth** | `jsonwebtoken`, `bcryptjs`, refresh-token rotation |
| **Real-time** | `socket.io` 4 (polling transport in prod for proxy compatibility) |
| **Validation** | Zod 4 — shared schemas in `packages/schemas` |
| **Rich text** | `sanitize-html` server-side, `@tiptap/react` client-side |
| **Storage** | Cloudinary for avatars (multipart via `multer`) |
| **Docs** | `swagger-ui-express` + JSDoc-derived OpenAPI |
| **Frontend** | Next.js 16 App Router, React 19, Tailwind 4, JSDoc (no TS) |
| **Data** | TanStack Query 5 (server), Zustand 5 (UI) |
| **UI** | dnd-kit, Recharts, lucide-react, sonner, cmdk, next-themes |
| **Monorepo** | pnpm 9 workspaces + Turbo |
| **Deploy** | Railway (API + Web + Postgres plugin), Dockerfile per service |

---

## Quick Start

### Prerequisites

- **Node 22** (`node -v`)
- **pnpm 9** (`corepack enable && corepack prepare pnpm@9.12.1 --activate`)
- **Docker** (only for the local Postgres container; skip if you have your own)

### One-time setup

```bash
git clone https://github.com/HikenNoAce001/Collaborative-Team-Hub.git team-hub
cd team-hub
pnpm install

# Local Postgres
docker compose up -d

# API env
cp apps/api/.env.example apps/api/.env
# Generate two random secrets and paste into JWT_ACCESS_SECRET / JWT_REFRESH_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Web env
cp apps/web/.env.example apps/web/.env.local

# Migrate + seed
pnpm --filter @team-hub/api db:migrate
pnpm --filter @team-hub/api db:seed:dev
```

### Run

```bash
pnpm dev        # turbo runs both API (:4000) and Web (:3000)
```

Open [http://localhost:3000](http://localhost:3000), sign in with any seeded user above.

### Useful scripts

```bash
pnpm --filter @team-hub/api db:reset           # wipe + migrate + seed (prod data)
pnpm --filter @team-hub/api db:reset:dev       # wipe + migrate + dev data (richer)
pnpm --filter @team-hub/api db:studio          # Prisma Studio
pnpm --filter @team-hub/api dev                # API only
pnpm --filter @team-hub/web dev                # Web only
pnpm lint                                      # turbo lint across packages
```

---

## API Routes

### Auth

| Method | Route | Description |
| --- | --- | --- |
| POST | `/auth/register` | Create account, auto-login |
| POST | `/auth/login` | Credentials → cookies |
| POST | `/auth/refresh` | Rotate refresh + access tokens |
| POST | `/auth/logout` | Revoke refresh, clear cookies |
| GET  | `/auth/me` | Current user |
| PATCH | `/users/me` | Update name |
| POST | `/users/me/avatar` | Upload avatar to Cloudinary |

### Workspaces & Members

| Method | Route | Access |
| --- | --- | --- |
| GET   | `/workspaces` | Auth |
| POST  | `/workspaces` | Auth (creator → admin) |
| PATCH | `/workspaces/:id` | Admin |
| DELETE| `/workspaces/:id` | Admin |
| GET   | `/workspaces/:id/members` | Member |
| PATCH | `/workspaces/:id/members/:userId` | Admin (role change) |
| DELETE| `/workspaces/:id/members/:userId` | Admin |
| POST  | `/workspaces/:id/invitations` | Admin |
| POST  | `/invitations/accept` | Auth |

### Goals & Milestones

| Method | Route | Access |
| --- | --- | --- |
| GET   | `/workspaces/:id/goals` | Member · filters: `status`, `ownerId`, `q`, page |
| POST  | `/workspaces/:id/goals` | Member |
| GET   | `/goals/:id` | Member · returns goal + milestones + last 20 updates |
| PATCH | `/goals/:id` | Owner / Admin |
| DELETE| `/goals/:id` | Owner / Admin |
| POST  | `/goals/:id/milestones` | Owner / Admin |
| PATCH | `/milestones/:id` | Owner / Admin |
| GET   | `/goals/:id/updates` | Member · cursor-paginated |
| POST  | `/goals/:id/updates` | Member |

### Action Items

| Method | Route | Access |
| --- | --- | --- |
| GET   | `/workspaces/:id/action-items` | Member · filters: `status`, `assigneeId`, `priority`, `goalId`, `q` |
| POST  | `/workspaces/:id/action-items` | Member |
| PATCH | `/action-items/:id` | Member |
| DELETE| `/action-items/:id` | Member |

### Announcements

| Method | Route | Access |
| --- | --- | --- |
| GET   | `/workspaces/:id/announcements` | Member · pinned-first, with reaction breakdown |
| POST  | `/workspaces/:id/announcements` | Admin |
| PATCH | `/announcements/:id` | Admin |
| DELETE| `/announcements/:id` | Admin |
| POST  | `/announcements/:id/reactions` | Member · `{ emoji }` |
| DELETE| `/announcements/:id/reactions/:emoji` | Member |
| GET   | `/announcements/:id/comments` | Member · cursor-paginated |
| POST  | `/announcements/:id/comments` | Member · `{ body, mentionUserIds[] }` |
| PATCH | `/comments/:commentId` | Author |
| DELETE| `/comments/:commentId` | Author / Admin |

### Notifications, Analytics, Audit

| Method | Route | Access |
| --- | --- | --- |
| GET   | `/notifications` | Auth |
| PATCH | `/notifications/:id/read` | Auth |
| PATCH | `/notifications/read-all` | Auth |
| GET   | `/workspaces/:id/analytics/summary` | Member |
| GET   | `/workspaces/:id/analytics/completions?period=12w` | Member |
| GET   | `/workspaces/:id/export.csv?type=goals\|action-items\|all` | Member |
| GET   | `/workspaces/:id/audit-logs` | Admin · filters: `actorId`, `action`, `entityType`, `from`, `to` |
| GET   | `/workspaces/:id/audit-logs/export.csv` | Admin |

Full schema + request/response shapes at **[`/api/docs`](https://collaborative-team-hub-api.up.railway.app/api/docs)** (Swagger UI).

---

## Real-time Events

Server → Client (subscribed via socket.io rooms):

| Event | Room | Payload |
| --- | --- | --- |
| `presence:update` | `workspace:${id}` | `{ workspaceId, online: string[] }` |
| `goal:created` / `goal:updated` / `goal:deleted` | `workspace:${id}` | `{ workspaceId, goal }` |
| `action-item:created` / `:updated` / `:deleted` | `workspace:${id}` | `{ workspaceId, item }` |
| `announcement:created` / `:updated` / `:deleted` | `workspace:${id}` | `{ workspaceId, announcement }` |
| `reaction:added` / `reaction:removed` | `workspace:${id}` | `{ workspaceId, announcementId, reaction }` |
| `comment:created` / `:updated` / `:deleted` | `workspace:${id}` | `{ workspaceId, announcementId, comment }` |
| `notification:created` | `user:${id}` | `{ notification }` |

Client → Server: `workspace:join`, `workspace:leave` (after socket auth).

---

## Key Architectural Decisions

### 1. Next.js proxies the API and socket traffic

Railway serves both apps under `*.up.railway.app`, which is on the [Public Suffix List](https://publicsuffix.org/) — so the API and web origins are **separate registrable domains** and the auth cookie can't be shared. Solution: rewrite `/api/:path*` and `/socket.io/:path*` through Next.js to the API server-side. Cookies stay on the web origin and the proxy forwards them. ([`apps/web/next.config.mjs`](apps/web/next.config.mjs))

### 2. Polling-only socket.io transport in production

Next.js HTTP rewrites don't proxy WebSocket upgrade handshakes reliably, so socket.io is pinned to long-polling (`transports: ['polling']`) in the client. ~1s latency for presence/events vs. instant — acceptable for the app, deterministic across deploys. Local dev still gets WebSocket via the direct Vite-style connection. ([`apps/web/src/lib/socket.js`](apps/web/src/lib/socket.js))

### 3. Optimistic UI is centralized

Every mutation that has a visible user reaction (kanban drop, reactions, comments, status changes, pin) goes through TanStack Query's `onMutate` / `onError` / `onSettled` pattern with a snapshot-and-rollback helper. Reconciliation prefers the websocket payload; query invalidation is the safety net.

### 4. Audit log rides along in the same transaction

Mutating actions (CRUD on goals, items, announcements, members, invitations) write one `AuditLog` row inside the same `prisma.$transaction` as the state change. If the audit insert fails, the whole action rolls back — no orphaned mutations. The audit table has no `PATCH`/`DELETE` routes and no `updatedAt` column — it's append-only by design.

### 5. JSDoc instead of TypeScript on the frontend

The frontend is pure JavaScript (`.js` / `.jsx`) with JSDoc annotations sourced from the Zod schemas in `packages/schemas`. Editor IntelliSense works (`tsconfig.json` is `allowJs: true, checkJs: false, noEmit: true`) without committing to a TS toolchain.

### 6. Shared Zod schemas drive both ends

`packages/schemas` exports the canonical request schemas. The API runs them in a `validate()` middleware; the frontend feeds the same schema into `react-hook-form` via `@hookform/resolvers`. One source of truth — the recruiter sees the same field-level error message both sides.

### 7. Cursor pagination only where it matters

Activity feed and comment threads use cursor pagination (`?before=<id>`) because they grow indefinitely and users append. Everything else (goals, action items, announcements list, members) uses page/pageSize offset — simpler URL, easier filters, max page size 100.

### 8. Per-emoji reaction breakdown in one query

The announcements list returns each post with a `reactionsByEmoji: { '🚀': 3, '❤️': 1 }` map computed via a single `groupBy` over the visible page IDs — no per-row N+1 detail fetch. ([`apps/api/src/modules/announcements/service.js`](apps/api/src/modules/announcements/service.js))

---

## Project Structure

```
.
├── apps/
│   ├── api/                                  # Express + Prisma + Socket.io
│   │   ├── prisma/
│   │   │   ├── schema.prisma                 # Source of truth for the data model
│   │   │   ├── migrations/
│   │   │   ├── seed.js                       # Production demo seed (4 users, 1 workspace)
│   │   │   ├── seed.dev.js                   # Stress-test seed (8 users, 2 workspaces, 32 items)
│   │   │   └── seed-helpers.js
│   │   ├── src/
│   │   │   ├── server.js                     # http + io wire-up, listen
│   │   │   ├── app.js                        # Express app + middleware + routers
│   │   │   ├── env.js                        # zod-validated env loader
│   │   │   ├── db.js                         # PrismaClient singleton (with adapter-pg)
│   │   │   ├── lib/                          # tokens, cookies, cloudinary, sanitize, logger
│   │   │   ├── middleware/                   # auth, workspace-role, validate, error
│   │   │   ├── modules/                      # one folder per domain
│   │   │   │   ├── auth/                     # router · controller · service
│   │   │   │   ├── users/
│   │   │   │   ├── workspaces/
│   │   │   │   ├── invitations/
│   │   │   │   ├── goals/
│   │   │   │   ├── milestones/
│   │   │   │   ├── action-items/
│   │   │   │   ├── announcements/
│   │   │   │   ├── notifications/
│   │   │   │   ├── analytics/
│   │   │   │   └── audit/
│   │   │   ├── realtime/                     # io setup, rooms, emit helpers
│   │   │   └── docs/                         # OpenAPI spec
│   │   ├── Dockerfile
│   │   └── railway.json
│   └── web/                                  # Next.js 16 App Router
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/                   # /login · /register
│       │   │   ├── (app)/                    # /workspaces · /w/[id]/...
│       │   │   ├── layout.jsx
│       │   │   ├── providers.jsx             # query client + theme + toaster
│       │   │   └── globals.css               # Tailwind v4 entry
│       │   ├── components/                   # ui/ · workspace/ · ThemeToggle · CommandPalette
│       │   ├── features/                     # feature-scoped hooks + views
│       │   ├── lib/                          # api · socket · cn · optimistic
│       │   └── stores/                       # zustand UI stores
│       ├── next.config.mjs                   # /api + /socket.io rewrites
│       ├── Dockerfile
│       └── railway.json
├── packages/
│   ├── schemas/                              # Zod schemas shared between apps
│   ├── eslint-config/
│   └── prettier-config/
├── docker-compose.yml                        # Local Postgres
├── turbo.json
├── pnpm-workspace.yaml
└── README.md
```

---

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| **Login API returns 200 but page bounces back to `/login`** | Auth cookie didn't land on the web origin. In production this means the Next.js proxy isn't running — check `apps/web/next.config.mjs` rewrites and `NEXT_PUBLIC_API_URL` env. Locally clear `localhost` cookies and retry. |
| **`MODULE_NOT_FOUND: @prisma/client-runtime-utils`** | pnpm didn't hoist Prisma's transitive deps. Confirm `.npmrc` at the repo root contains `public-hoist-pattern[]=*@prisma/*` and re-run `pnpm install`. The Dockerfiles copy this file explicitly. |
| **`Unknown argument 'ip'` (or any other Prisma type error)** | Prisma client is stale after a migration. Run `pnpm --filter @team-hub/api db:generate`. The `db:migrate` script chains generate so this only happens when migrations are run by hand. |
| **No green presence dots in production** | Socket polling requests are 404'ing — engine.io requires the trailing slash on `/socket.io/`. Check that `next.config.mjs` has the explicit `'/socket.io' → '/socket.io/'` rewrite and `skipTrailingSlashRedirect: true`. |
| **Avatar upload fails silently** | `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` not set on the API. The rest of the app still works. |
| **`JWT_*_SECRET must be ≥ 32 chars`** at boot | Generate proper secrets: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. The env loader is strict. |
| **`Invalid environment configuration`** at boot | Missing or malformed env var caught by Zod. The error lists exactly which key is wrong — fix and restart. |
| **Local seed says `Can't reach database`** | Postgres container isn't up. `docker compose up -d` then retry. |
| **Production seed via `railway run` fails** | `DATABASE_URL` resolves to `postgres.railway.internal` which only exists inside Railway's network. Use `railway ssh` and run the seed inside the container instead. |

---

## Environment Variables

### `apps/api/.env`

| Var | Description |
| --- | --- |
| `NODE_ENV` | `development` / `production` / `test` |
| `PORT` | API listen port (default `4000`) |
| `DATABASE_URL` | Postgres connection string |
| `JWT_ACCESS_SECRET` | ≥ 32 hex chars |
| `JWT_REFRESH_SECRET` | ≥ 32 hex chars (different from access) |
| `ACCESS_TOKEN_TTL` | Default `15m` |
| `REFRESH_TOKEN_TTL` | Default `30d` |
| `CLIENT_URL` | Web origin (CORS allowlist + cookie scope) |
| `COOKIE_DOMAIN` | Optional explicit cookie domain |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Avatar upload (optional) |
| `RATE_LIMIT_AUTH_PER_MIN` | Default `10` |
| `ENABLE_SWAGGER` | Mounts `/api/docs` (default `true`) |

### `apps/web/.env.local`

| Var | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | API base URL (used at build time + by the rewrite proxy) |
| `NEXT_PUBLIC_SOCKET_URL` | Same as API URL in standard setups |
| `NEXT_PUBLIC_APP_NAME` | Brand string in the header |

`.env.example` files in each app document the full list.

---

## License

Built as a take-home assessment. Code is open for review.
