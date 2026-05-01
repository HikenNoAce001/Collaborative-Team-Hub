# HANDOFF — Team Hub

> Pick-up doc for any coding agent (Claude, GLM, Cursor, …) continuing this
> assessment. Read this first, then `CLAUDE.md` (operating manual),
> `requirements.md` (scope), `ARCHITECTURE.md` (why), `ROADMAP.md`
> (sequencing), `PROGRESS.md` (per-phase log), `COMPLIANCE.md` (rubric verification).

Authored 2026-05-01. Backend feature-complete; frontend not started.

---

## 1. Where we are

| Layer    | Status                                                                                |
| -------- | ------------------------------------------------------------------------------------- |
| Backend  | **100% feature surface** for §B–§I of `requirements.md`. 13/13 backend phases shipped. |
| Frontend | **0% — not started.** No `apps/web/src/` files yet. Phase 0.5 onwards.                 |
| Deploy   | Local dev only. Railway not yet provisioned.                                          |
| Demo seed| Stub only (`apps/api/prisma/seed.js` is a no-op).                                     |
| README   | Repo overview only — setup/run docs not written.                                      |
| Video    | Not recorded.                                                                         |

**Repo:** `git remote -v` already configured. Branch: `main`. Several commits ahead of origin — **not pushed**. Push policy: only when the user explicitly says so.

---

## 2. What runs right now

```bash
docker compose up -d db                  # Postgres 16 on :5432
pnpm install                             # workspaces resolve cleanly
pnpm --filter @team-hub/api db:migrate   # one migration: 20260501105147_init (15 tables)
pnpm --filter @team-hub/api dev          # api on :4000

# Smoke
curl localhost:4000/health
open  http://localhost:4000/api/docs     # Swagger UI for the whole API
```

Verifier scripts (executable, in `tmp/` — gitignored):

```
tmp/verify-1.3-1.5.sh    # goals + milestones + activity + action items + announcements + reactions + comments + sanitize
tmp/verify-2.1-2.2-2.5.sh # realtime + mention notifications + audit log
tmp/verify-2.3-2.7.sh    # analytics + CSV exports + Swagger
```

Each is `set -euo pipefail`, registers fresh per-run users (timestamp-suffixed emails), uses a `cj()` curl wrapper (`--fail-with-body`) so any unexpected 4xx/5xx aborts with the API's error envelope. Realtime test uses `tmp/ws-listen.mjs` + the workspace-root `socket.io-client` devDep.

---

## 3. Stack — pinned

Backend (`apps/api`):
- Node 22.22.2 (Active LTS, Prisma 7 needs ≥ 22.12)
- Express 5.2 + Helmet + CORS + cookie-parser + pino-http
- Prisma **7** with `prisma-client-js` provider (NOT `prisma-client` — that's TS-only) + `@prisma/adapter-pg`
- Socket.io 4.8 — auth via `at` cookie on the upgrade request
- jsonwebtoken 9 + **bcryptjs** (not native `bcrypt` — see §6 for why)
- Zod 4, sanitize-html 2, swagger-ui-express 5
- ESM (`"type": "module"`); imports include `.js` extensions

Frontend (`apps/web`) — **deps to install when starting Phase 0.5**:
- Next 16 + React 19, Tailwind v4 (CSS-based config — no `tailwind.config.js`)
- TanStack Query 5, Zustand 5, axios, react-hook-form + `@hookform/resolvers/zod`
- Tiptap 3 (current major), dnd-kit, recharts 3 (current major), sonner 2, lucide-react
- next-themes (dark mode), cmdk (⌘K palette), socket.io-client 4.8
- **Frontend is JavaScript only.** No `.ts/.tsx`. JSDoc for type hints. `tsconfig.json` allowed only for editor IntelliSense (`allowJs: true, checkJs: false, noEmit: true`).

Tooling: pnpm 9, Turbo 2.9.

---

## 4. Repository map (current)

```
apps/api/
  src/
    server.js                    # http + socket.io, listen, graceful shutdown
    app.js                       # express wiring (helmet, CORS, cookieParser, routes, swagger)
    env.js                       # zod-validated env (throws on boot if invalid)
    db.js                        # PrismaClient singleton (+ hot-reload guard)
    docs/openapi.js              # hand-rolled OpenAPI 3.0 spec (40+ paths, 14 tags)
    realtime/
      io.js                      # attachIo(), socket auth, presence via room membership
      emit.js                    # emitToWorkspace / emitToUser helpers
    lib/
      tokens.js cookies.js sanitize.js logger.js errors.js invitation-token.js
    middleware/
      auth.js validate.js workspace-role.js rate-limit.js error.js
    modules/
      auth/ users/ workspaces/ invitations/
      goals/ milestones/ action-items/
      announcements/ notifications/
      audit/ analytics/
      # each: service.js (logic + prisma) · controller.js (req/res + emit hooks) · router.js (path → mw → controller)
  prisma/
    schema.prisma                # 14 models + 5 enums; provider = "prisma-client-js"
    migrations/20260501105147_init/
    seed.js                      # NO-OP — Phase N below
  prisma.config.js               # Prisma 7: DATABASE_URL moved out of schema; loaded here

apps/web/                        # SCAFFOLD ONLY — package.json + .env.example exist; no src/

packages/
  schemas/src/                   # @team-hub/schemas — Zod, ESM, JS only
    enums.js auth.js workspace.js goal.js action-item.js announcement.js audit.js notification.js index.js
  eslint-config/  prettier-config/

docker-compose.yml               # Postgres 16 named volume + maildev (--profile mail)
turbo.json  pnpm-workspace.yaml  package.json
.env.example  apps/api/.env.example  apps/web/.env.example
```

---

## 5. Conventions

Read `CLAUDE.md` for the full operating manual. Highlights:

- **Per-domain shape.** `module/{service.js, controller.js, router.js}`. Routers wire path → middleware → controller. Controllers do not call Prisma. Services do.
- **Validation.** `validate(schema, 'body'|'query'|'params')` — schemas live in `@team-hub/schemas`. **Don't validate inline.**
- **Workspace scope.** `requireWorkspaceMember(paramName)` and `requireWorkspaceRole('ADMIN', paramName)` factories load the membership row and reject with 403.
- **Multi-write atomicity.** Anything writing more than one row uses `prisma.$transaction(async (tx) => …)`. Audit-log writes ride inside the same `tx`.
- **Realtime emit.** Controllers `emitToWorkspace(wsId, event, payload)` *after* `res.json(...)` so a slow socket can't slow the HTTP response.
- **Errors.** Throw `AppError` factories (`NotFound`, `Forbidden`, `Conflict`, `Gone`, `Validation`, `Unauthorized`, `BadRequest`). Error middleware turns them into the canonical `{ error: { code, message, details? } }` envelope.
- **Cookies.** Access token `at` (15m, Path=/), refresh token `rt` (30d, Path=/auth, hashed-at-rest, rotated on every use).
- **Commits.** Conventional Commits, **single-line subject only by default**. Scopes: `repo`, `api`, `web`, `schemas`. Senior tone — no junior tells, no "WIP", no "fix bug", no apology hedging.
- **Don't push.** `git push` only when the user names it in the same turn.

---

## 6. Gotchas / lessons already learned

These already bit us; the fixes are merged. Don't redo them.

1. **Prisma 7 provider:** the new `prisma-client` provider is TypeScript-only. Use `prisma-client-js` (still fully supported, emits JS). Documented in `CLAUDE.md` §2 and `ARCHITECTURE.md`.
2. **Prisma 7 datasource URL:** moved out of `schema.prisma` into `prisma.config.js` (`defineConfig` from `prisma/config`). Schema `datasource db {}` block is provider-only.
3. **bcrypt → bcryptjs:** native `bcrypt`'s prebuilt binary breaks after `brew upgrade node@22` (icu4c version mismatch). `bcryptjs` is pure JS, same async API.
4. **pnpm + Prisma 7 client:** the generated client at `src/generated/prisma/runtime/client.js` does flat `require('@prisma/client-runtime-utils')`. Solved by `.npmrc` `public-hoist-pattern[]=*@prisma/*`.
5. **Refresh token uniqueness:** `signRefresh` adds a random `jti` claim so two refresh tokens for the same user in the same second produce different sha256 hashes (no `RefreshToken.tokenHash` unique-constraint conflicts).
6. **Express 5 `req.query` getter:** assigning `req.query = parsed` throws `TypeError: Cannot set property query` in strict mode. The `validate` middleware uses `Object.defineProperty(req, source, {value, writable, configurable, enumerable})` to override the getter.
7. **AuditLog cascade:** `AuditLog.workspaceId` cascades on Workspace delete, so a "DELETE Workspace" audit row gets reaped along with the workspace. Workspace deletion intentionally skips audit; pino-http captures the request.

---

## 7. What's left — do these in order

### Phase 0.5 — Web skeleton (~45 min)

Install the frontend deps listed in §3. Set up `apps/web/src/`:
- `app/layout.jsx` + `providers.jsx` (TanStack provider, ThemeProvider from next-themes, Sonner Toaster)
- `app/globals.css` — `@import "tailwindcss";` + CSS variables for theme tokens
- `lib/api.js` — axios with `baseURL` from env, `withCredentials: true`, single 401 → `/auth/refresh` → retry interceptor; redirect to `/login` on second failure
- `lib/socket.js` — `io(API_URL, { withCredentials: true })` lazy singleton; `useSocket(workspaceId)` hook that runs `workspace:join`/`workspace:leave`
- `lib/cn.js` — `clsx` + `tailwind-merge` helper
- `stores/useWorkspaceStore.js` — Zustand with persist; current workspace id only

### Phases 1.1–1.5 (frontend)

- **Auth** — `(auth)/login` + `(auth)/register` with RHF + `@hookform/resolvers/zod` consuming `loginSchema`/`registerSchema` from `@team-hub/schemas`. On success, push to `/workspaces`.
- **Workspaces dashboard** — `(app)/workspaces` lists user's memberships with accent dots; new-workspace dialog.
- **Per-workspace shell** — `(app)/w/[id]/layout.jsx` with sidebar (members + presence dots), top bar (workspace switcher, theme toggle, notification bell, avatar menu).
- **Goals page** — list + detail with milestone progress bars + activity feed (cursor pagination, "Load older").
- **Action items page** — Kanban (dnd-kit, optimistic move) + List view toggle (Zustand-persisted).
- **Announcements page** — Tiptap editor (admin only), reactions, comments with mention dropdown.

TanStack Query keys: `[domain, workspaceId, ...filters]`. Forms reuse the shared Zod schemas. Socket events reconcile cache via `queryClient.setQueryData` (no extra refetch).

### Phase 2.4 — Optimistic UI (advanced feature #1)

`apps/web/src/lib/optimistic.js` ships `useOptimisticMutation({ queryKey, mutator, optimisticUpdate })` that wraps TanStack `useMutation` with `onMutate`/`onError`/`onSettled` per `CLAUDE.md` §8. Apply to: action-item status drag, reaction toggle, comment create, goal status, milestone progress, pin toggle. **Demo points to show in the video** are listed in `requirements.md` §I.1.

### Phase 2.6 — Dark mode + ⌘K

`next-themes` + `cmdk`. Actions: switch workspace, create goal, create item, jump to announcements, toggle theme, log out. Fuzzy search over already-cached query data — no extra API.

### Phase 2.8 — Polish

Loading + empty + error states on every page (DoD §M.5). Mobile 375px no horizontal scroll (§M.6). Intentional dark mode (§M.7).

### Phase 2.9 — Deploy + seed

Two Railway services + Postgres plugin. Build `apps/api/prisma/seed.js` per `requirements.md` §N: workspace "Acme Product Launch", users `demo@team-hub.test`/`Demo1234` admin + sarah + dev members, 3 goals, 6 items (2 overdue), 2 announcements (1 pinned), reactions + 1 mention comment + 1 notification. Idempotent (upserts).

### Phase 2.10 — README + 5-min walkthrough video

README sections: setup on a fresh machine, env vars (point at `.env.example`), live URL, demo creds, 5-min walkthrough script, architecture summary (point at `ARCHITECTURE.md`), evaluation rubric (point at `requirements.md` + `COMPLIANCE.md`).

---

## 8. Kickoff prompt for the next agent

Paste this into the new agent's first turn (adjust the phase number if you want a smaller bite first):

> I'm continuing the Team Hub take-home assessment from a previous coding session. The backend is feature-complete and committed on `main`. The frontend hasn't been started.
>
> Read these files in order before doing anything: `HANDOFF.md`, `CLAUDE.md`, `requirements.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `PROGRESS.md`, `COMPLIANCE.md`. They are the source of truth — `HANDOFF.md` summarizes state, `CLAUDE.md` is the operating manual, `requirements.md` is the locked scope, `COMPLIANCE.md` shows what's already passing vs. what's left.
>
> Today's goal: ship **Phase 0.5 (web skeleton)** plus **Phase 1.1 frontend (login + register pages)**. The api dev server runs at `http://localhost:4000`; the OpenAPI spec is at `/api/docs`. Frontend is **JavaScript only — no TypeScript** (use JSDoc for type hints). Tailwind v4 with CSS-based config. TanStack Query for server state, Zustand for UI state. Forms use react-hook-form + the shared Zod schemas in `@team-hub/schemas`.
>
> Conventional commits, single-line subject, senior tone. Don't push. Don't run `pnpm dev` yourself — hand it to me with the command and I'll run it so I see the logs. When you finish a phase, save a curl/playwright/manual verifier under `tmp/verify-<phase>.sh`, append a section to `PROGRESS.md`, then commit each phase as its own conventional commit.
>
> Start by reading `HANDOFF.md` and confirming the plan back to me before writing code.

---

## 9. Useful one-liners

```bash
# Reset local DB (dev only)
docker compose down -v && docker compose up -d db
pnpm --filter @team-hub/api db:migrate

# Regenerate Prisma client after schema changes
pnpm --filter @team-hub/api db:generate

# Look up a Prisma error code
# P2002 unique constraint  ·  P2025 record not found  ·  P2003 FK violation

# Generate fresh JWT secrets if .env is missing them
node -e "console.log('JWT_ACCESS_SECRET=' + require('node:crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('node:crypto').randomBytes(32).toString('hex'))"
```
