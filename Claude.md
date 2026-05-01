# CLAUDE.md

This file is the operating manual for Claude Code on this repository. Read it
before doing anything. Re-read it whenever you context-switch between apps.

---

## 0. Project context (one paragraph)

We are building **Team Hub** — a full-stack collaborative workspace
(announcements, goals, milestones, action items, real-time presence,
analytics) — as a take-home assessment graded on functionality (25),
code quality (20), monorepo architecture (15), UI/UX (15), advanced
features (10), performance (10), and documentation (5), with up to 10
bonus points. Total budget: ~16 hours over 2.5 days. Two services
deployed on Railway behind one Postgres plugin. **Quality bar: production.
Schedule bar: ruthless.** Do not rebuild things that already work.

---

## 1. Hard rules — never violate

1. **Frontend is JavaScript only.** No `.ts` / `.tsx` files anywhere
   under `apps/web/`. Use **JSDoc** for type hints when useful.
   `tsconfig.json` is allowed only for editor IntelliSense (`allowJs: true`,
   `checkJs: false`, `noEmit: true`).
2. **Backend is ESM** (`"type": "module"` in `apps/api/package.json`).
   Prisma 7 is ESM-only. Use `import` / `export`, not `require`.
   File extensions in imports (e.g. `import x from './x.js'`).
3. **Never commit secrets.** All secrets come from environment variables.
   `.env.example` files are committed; `.env` files are not.
4. **Never store passwords in plain text.** Use `bcrypt` with cost ≥ 12.
5. **Never put access tokens in localStorage.** Refresh + access tokens
   live in `httpOnly`, `Secure`, `SameSite=Lax` cookies. The frontend
   never sees the JWT directly.
6. **Never trust client input.** Every API endpoint validates the body /
   params / query with the shared Zod schema in `packages/schemas/`.
7. **Never sanitize rich text on the frontend only.** Sanitize the HTML
   payload from Tiptap server-side with `sanitize-html` before persisting.
8. **Never block on a feature that isn't on the cut list.** If something
   is unclear, mark it `// TODO(scope):` and keep moving.

---

## 2. Tech stack — pinned versions

These are the versions to install. Don't drift.

### Backend (`apps/api`)

| Package                 | Version | Notes                                                               |
| ----------------------- | ------- | ------------------------------------------------------------------- |
| node                    | 22.x    | Active LTS                                                          |
| express                 | ^5.2.0  | Native async errors; no `next(err)` glue                            |
| @prisma/client + prisma | ^7.8.0  | **ESM only**. Use `prisma-client-js` provider (emits JS). The newer `prisma-client` provider is TypeScript-only and our backend is pure JS. |
| @prisma/adapter-pg      | ^7.8.0  | Required by Prisma 7's Rust-free client                             |
| socket.io               | ^4.8.3  | Server                                                              |
| jsonwebtoken            | ^9.0.2  |                                                                     |
| bcrypt                  | ^5.1.1  | Cost factor 12                                                      |
| cookie-parser           | ^1.4.7  |                                                                     |
| cors                    | ^2.8.5  |                                                                     |
| helmet                  | ^8.x    |                                                                     |
| zod                     | ^4.x    | Shared with frontend via workspace                                  |
| sanitize-html           | ^2.x    | Server-side rich-text sanitization                                  |
| multer                  | ^1.4.5  | Multipart for avatar/attachment upload                              |
| cloudinary              | ^2.x    | Storage                                                             |
| swagger-jsdoc           | ^6.x    | Bonus: `/api/docs`                                                  |
| swagger-ui-express      | ^5.x    |                                                                     |
| pino + pino-http        | latest  | Structured logs                                                     |
| dotenv                  | ^16.x   | Local only; Railway injects in prod                                 |
| jest + supertest (dev)  | latest  | Bonus: minimum coverage on auth + 1 path                            |

### Frontend (`apps/web`)

| Package                    | Version | Notes                                                       |
| -------------------------- | ------- | ----------------------------------------------------------- |
| next                       | ^16.2.4 | Turbopack default; App Router                               |
| react + react-dom          | ^19     | Required by Next 16                                         |
| tailwindcss                | ^4.x    | **CSS-based config**, no `tailwind.config.js`               |
| @tailwindcss/postcss       | ^4.x    |                                                             |
| zustand                    | ^5.x    | Client/UI state only                                        |
| @tanstack/react-query      | ^5.x    | Server state, caching, optimistic updates                   |
| socket.io-client           | ^4.8.3  |                                                             |
| axios                      | ^1.x    | Wrapped once in `lib/api.js` with 401 → refresh interceptor |
| react-hook-form            | ^7.x    | Forms                                                       |
| @hookform/resolvers + zod  | ^4.x    | Reuse schemas from `packages/schemas`                       |
| @tiptap/react + extensions | ^3.x    | Rich-text announcements (Tiptap 3 is current major)         |
| @dnd-kit/core + sortable   | ^6.x    | Kanban DnD                                                  |
| recharts                   | ^3.x    | Charts (Recharts 3 is current major)                        |
| date-fns                   | ^3.x    | Dates                                                       |
| lucide-react               | latest  | Icons                                                       |
| clsx + tailwind-merge      | latest  | `cn()` helper                                               |
| class-variance-authority   | ^0.7.x  | Variant-driven components                                   |
| sonner                     | ^2.x    | Toasts (Sonner 2 is current major)                          |
| cmdk                       | ^1.x    | Bonus: ⌘K palette                                           |
| next-themes                | ^0.4.x  | Bonus: dark/light                                           |

### Tooling (root)

| Package  | Version |
| -------- | ------- |
| turbo    | ^2.9.6  |
| pnpm     | 9.x     |
| eslint   | ^9.x    |
| prettier | ^3.x    |

---

## 3. Repository layout

```
team-hub/
├── apps/
│   ├── api/                    # Express + Prisma + Socket.io
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── seed.js
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   ├── server.js       # http + io wire-up, listen
│   │   │   ├── app.js          # express app, middleware, routes (no listen)
│   │   │   ├── env.js          # zod-validated env loader; throws on boot if invalid
│   │   │   ├── db.js           # PrismaClient singleton
│   │   │   ├── lib/            # tokens, cookies, cloudinary, mailer, sanitize
│   │   │   ├── middleware/     # auth, requireWorkspaceRole, error, requestLogger
│   │   │   ├── modules/        # one folder per domain — see below
│   │   │   │   ├── auth/       # router.js, controller.js, service.js, schemas.js (re-exports from @repo/schemas)
│   │   │   │   ├── users/
│   │   │   │   ├── workspaces/
│   │   │   │   ├── goals/
│   │   │   │   ├── milestones/
│   │   │   │   ├── action-items/
│   │   │   │   ├── announcements/
│   │   │   │   ├── notifications/
│   │   │   │   ├── analytics/
│   │   │   │   └── audit/
│   │   │   ├── realtime/       # io instance, rooms, presence, mention dispatch
│   │   │   └── docs/           # swagger spec
│   │   ├── tests/              # jest + supertest (bonus)
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── .env.example
│   └── web/
│       ├── src/
│       │   ├── app/            # Next App Router. Route groups:
│       │   │   ├── (auth)/     # /login /register
│       │   │   ├── (app)/      # /workspaces, /w/[id]/...
│       │   │   ├── api/        # ONLY for things that must run on Next (not for our domain API)
│       │   │   ├── globals.css # Tailwind v4 entry: @import "tailwindcss";
│       │   │   ├── layout.jsx
│       │   │   └── providers.jsx
│       │   ├── components/     # ui/, layout/, goals/, action-items/, ...
│       │   ├── features/       # feature-scoped hooks + zustand stores
│       │   ├── lib/            # api.js, socket.js, cn.js, formatters.js
│       │   └── stores/         # zustand stores (UI state only)
│       ├── public/
│       ├── Dockerfile
│       ├── jsconfig.json       # path aliases
│       ├── next.config.mjs
│       ├── package.json
│       └── .env.example
├── packages/
│   ├── schemas/                # Zod schemas shared between apps. ESM, JS only.
│   │   ├── src/index.js
│   │   └── package.json
│   ├── eslint-config/
│   └── prettier-config/
├── docker-compose.yml          # local Postgres (+ optional maildev)
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── README.md
├── CLAUDE.md
├── REQUIREMENTS.md
├── ARCHITECTURE.md
├── ROADMAP.md
└── .gitignore
```

The reasons each piece exists are in `ARCHITECTURE.md`. Don't introduce
new top-level folders without justifying them in that file first.

---

## 4. Coding conventions

### General

- **One thing per file.** Controllers don't talk to Prisma. Services do.
  Routers don't have logic. Routers wire path → middleware → controller.
- **Named exports only**, except for Next.js pages/layouts which require default.
- **No magic numbers / strings.** Constants in `apps/*/src/lib/constants.js`
  or in shared `packages/schemas/src/enums.js` if used on both sides.
- **Errors throw, success returns.** No mixed return shapes. Use the
  `AppError` class (see `apps/api/src/lib/errors.js`).

### JSDoc (frontend, since no TypeScript)

Every exported function gets a JSDoc block with `@param` and `@returns`
when types aren't obvious. Example:

```js
/**
 * @param {{ workspaceId: string, status?: 'TODO'|'IN_PROGRESS'|'REVIEW'|'DONE' }} params
 * @returns {Promise<import('@repo/schemas').ActionItem[]>}
 */
export async function listActionItems(params) {
  /* ... */
}
```

### Naming

- Files: `kebab-case.js` (e.g. `action-items.controller.js`)
- React components: `PascalCase.jsx` and exported as the file's name
- Hooks: `useThing.js` in `features/<domain>/hooks/`
- Zustand stores: `useThingStore.js`, one slice per domain, never global
- API routes: plural nouns (`/workspaces/:id/goals`), kebab-case for multi-word

### Commits — Conventional Commits, mandatory

```
feat(api): add invitation accept endpoint
fix(web): resolve kanban DnD drop on empty column
refactor(api): extract token rotation into authTokens lib
chore(repo): pin tailwind v4
docs(readme): add Railway env reference
test(api): cover refresh token rotation
```

Scopes: `api`, `web`, `schemas`, `repo`. One logical change per commit.
**No `wip` commits on `main`.**

---

## 5. API conventions

### Response envelopes

Success — return the resource directly when it's a single thing, or:

```json
{ "data": [...], "meta": { "page": 1, "pageSize": 20, "total": 137 } }
```

Error — always:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

HTTP status drives flow. `200` create-and-return, `201` only for genuine
new resource creation, `204` for delete, `401` unauthorized, `403`
forbidden, `404` not found, `409` conflict, `422` validation, `500` real
errors only.

### Auth

- Access token: 15 min, `httpOnly`, `Secure` in prod, `SameSite=Lax`,
  cookie name `at`.
- Refresh token: 30 days, **rotated on every refresh**, stored hashed
  (sha256) in `RefreshToken` table with `revokedAt`. Cookie name `rt`,
  path `/auth/refresh`.
- `requireAuth` middleware reads `at` cookie → verifies → attaches
  `req.user`. On 401, frontend interceptor calls `/auth/refresh` once,
  retries the original request, otherwise redirects to `/login`.

### Workspace scoping

Every workspace-scoped route runs `requireWorkspaceMember(req)` which:

1. Checks `req.user` exists
2. Looks up the workspace member row
3. Attaches `req.workspaceMember` ({ role, workspaceId, userId })
4. 403 if not a member

For admin-only actions add `requireWorkspaceRole('ADMIN')`.

### Validation

Every router uses a `validate(schema, 'body' | 'query' | 'params')`
middleware backed by shared Zod schemas. **Do not validate inline.**
The same schema is the source of truth for the frontend form.

---

## 6. Database conventions

- **Migrations are committed.** Run `pnpm --filter api db:migrate -- --name <slug>`
  for each schema change. Never edit a past migration.
- **Seed is idempotent.** `prisma/seed.js` upserts the demo workspace,
  demo users, and a small set of goals/items so the recruiter can log in
  immediately.
- **Use transactions for multi-write actions** (e.g. accept invitation
  = create member + delete invitation + write audit log = one `$transaction`).
- **Soft-delete only where the spec demands it.** Default to hard delete
  with `ON DELETE CASCADE` for child rows.
- **Indexes:** every foreign key, every column used in `WHERE` filters
  in the analytics queries (`status`, `dueDate`, `workspaceId+createdAt`).

---

## 7. Real-time conventions

### Rooms

- One room per workspace: `workspace:${workspaceId}`
- One room per user: `user:${userId}` (for personal notifications)

### Server events (server → client)

| Event                                 | Payload                                           |
| ------------------------------------- | ------------------------------------------------- |
| `presence:update`                     | `{ workspaceId, online: string[] }`               |
| `goal:created` / `goal:updated`       | `{ workspaceId, goal }`                           |
| `action-item:created` / `:updated`    | `{ workspaceId, item }`                           |
| `announcement:created`                | `{ workspaceId, announcement }`                   |
| `reaction:added` / `reaction:removed` | `{ workspaceId, announcementId, reaction }`       |
| `comment:created`                     | `{ workspaceId, comment }`                        |
| `notification:created`                | `{ notification }` — emitted only to `user:` room |

### Client events (client → server)

- `workspace:join` `{ workspaceId }` — joins room after auth handshake
- `workspace:leave` `{ workspaceId }`

### Auth handshake

Socket.io middleware reads the `at` cookie from the upgrade request,
verifies, and attaches `socket.userId`. Reject connections without a
valid token.

---

## 8. Frontend conventions

### Server vs Client components

- **Server by default.** Mark `'use client'` only when the file uses
  hooks, browser APIs, event handlers, or third-party client-only libs
  (Tiptap, dnd-kit, recharts).
- Layouts and the workspace shell stay server where possible.

### Data fetching

- Server components: fetch via `fetch()` directly to the API with the
  forwarded cookie. Cache `'no-store'` for user-specific data.
- Client components: **TanStack Query**. One query key convention:
  `[domain, workspaceId, ...filters]` e.g. `['action-items', wsId, { status: 'TODO' }]`.

### State split

- **Zustand** — client-only UI state (open dialogs, kanban filter,
  sidebar collapsed, current workspace id). Persist `currentWorkspaceId`
  in localStorage.
- **TanStack Query** — anything that came from the server.
- **No prop drilling deeper than 2 levels.** Lift to a store or query.

### Optimistic UI pattern (chosen advanced feature)

Use TanStack Query's `onMutate` / `onError` / `onSettled`:

1. Cancel in-flight queries for the affected key
2. Snapshot the previous cache value
3. Mutate the cache optimistically
4. On error, roll back from the snapshot + show a toast
5. On success, the websocket event reconciles (no extra refetch needed)

A reusable `useOptimisticMutation` helper lives in `lib/optimistic.js`.

### Forms

React Hook Form + Zod resolver, schemas imported from `@repo/schemas`.
Disable submit while pending. Show field errors from `formState.errors`.

### Styling

Tailwind v4 only. No CSS modules unless absolutely necessary. Use
`cn()` (clsx + tailwind-merge) for conditional classes. CSS variables
for theme tokens declared in `globals.css`.

---

## 9. Security checklist (run through before deploy)

- [ ] Helmet enabled with reasonable CSP
- [ ] CORS allowlist = `[CLIENT_URL]` in prod, with `credentials: true`
- [ ] Rate limiter on `/auth/*` (e.g. `express-rate-limit`, 10/min/ip)
- [ ] Bcrypt cost ≥ 12
- [ ] JWT secrets are 32+ random bytes (crypto.randomBytes(32).toString('hex'))
- [ ] Refresh tokens hashed at rest, rotated on every use, revoked on logout
- [ ] Cookies `httpOnly`, `Secure`, `SameSite=Lax`
- [ ] All inputs validated by Zod
- [ ] Tiptap HTML run through `sanitize-html` server-side
- [ ] Cloudinary uploads constrained by resource_type + max size + allowed formats
- [ ] No PII in logs (redact emails in pino)
- [ ] No `error.stack` in production responses
- [ ] Prisma queries never built with string concatenation; only Prisma API
- [ ] CSRF: cookies are `SameSite=Lax` and we use `Origin` check on state-changing routes

---

## 10. Performance checklist

- [ ] Every list endpoint paginated (`?page=1&pageSize=20`, max 100)
- [ ] Cursor pagination for activity feed (`?after=<cursor>`)
- [ ] Prisma `select` to avoid over-fetching; `include` only what's needed
- [ ] N+1 audit: announcements list includes counts via `_count`, not nested `findMany`
- [ ] Index audit (see §6)
- [ ] Next.js images use `next/image`
- [ ] React Query `staleTime` ≥ 30s for non-volatile data
- [ ] Socket events are scoped to rooms — never `io.emit(...)` to all
- [ ] Bundle: avoid heavy libs in shared layout (load Tiptap/Recharts only on routes that need them)

---

## 11. Workflow rules

1. **Plan before you type.** Before starting a phase, post a one-paragraph
   plan referencing the relevant section of `ROADMAP.md`.
2. **Touch one app at a time** unless the change is a contract change
   (then schemas package first, both apps after).
3. **Run lint + typecheck (jsdoc) before committing.** `pnpm turbo run lint`.
4. **Migrations get their own commit.** Never bundle schema changes
   with feature code.
5. **When something doesn't work after 2 reasonable attempts, stop.
   Read the error. Read the docs link in the error. Then try once more
   with a different approach. If still stuck, leave a `// TODO(blocked):`
   and move on — flag it in the daily summary.**
6. **Never `git push --force` to `main`.**
7. **Don't add a dependency to fix something a 20-line helper would
   solve.** The bundle size matters for the perf score.

---

## 12. Stop-and-ask rules

Surface to the user (don't silently improvise) when:

- A required env var is undefined
- The Cloudinary or Railway credentials are missing
- A migration would drop a column with data
- The advanced feature scope is unclear (e.g. "what's the audit log retention?")
- Time on a single subtask exceeds the roadmap estimate by 50%+

Otherwise: keep moving. Comment ambiguity with `// TODO(scope):` and
proceed with the most defensible interpretation.

---

## 13. The deliverable bar

The recruiter will judge this by:

1. **Logging in** to the seeded demo account on the live URL → must work first try.
2. **Five-minute video walkthrough** → every feature visible, no errors.
3. **Reading the README** → setup instructions reproducible on a fresh machine.
4. **Reading 3-5 random files** → consistent style, sensible names, no commented-out code, no console.logs.
5. **Looking at the commit log** → linear, conventional, tells a story.

Optimize for this experience, in that order.
