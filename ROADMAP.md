# ROADMAP.md

The 2.5-day execution plan. ~16 work hours total. Stay on the budget.
If a phase runs 50%+ over, jump to the cut list and reassess at the end.

Convention: each phase ends with a **commit checkpoint**. A clean commit
log is part of the grade.

---

## Day 0 — Foundation (target: 4h)

### Phase 0.1 — Repo bootstrap (45m)
- [ ] `pnpm dlx create-turbo@latest team-hub` (or scaffold manually)
- [ ] Strip TS examples; confirm `pnpm-workspace.yaml`, `turbo.json`, root `package.json`
- [ ] Create `apps/api`, `apps/web`, `packages/schemas`, `packages/eslint-config`, `packages/prettier-config`
- [ ] Drop in `CLAUDE.md`, `REQUIREMENTS.md`, `ARCHITECTURE.md`, `ROADMAP.md`
- [ ] `.gitignore`, `.editorconfig`, root `.prettierrc.json`, root `eslint.config.js`
- [ ] First commit: `chore(repo): bootstrap turborepo monorepo`

### Phase 0.2 — Docker + DB (30m)
- [ ] `docker-compose.yml` with `postgres:16-alpine` (and optional `maildev`)
- [ ] `apps/api/.env.example`, `apps/web/.env.example`
- [ ] `docker compose up -d db` and confirm connection
- [ ] Commit: `chore(repo): add local docker-compose for postgres`

### Phase 0.3 — API skeleton (1h)
- [ ] `apps/api/package.json` with `"type": "module"`, scripts, deps from CLAUDE.md
- [ ] `src/env.js` (Zod-validated env)
- [ ] `src/app.js` — express, helmet, cors, cookieParser, json, request logger, error handler
- [ ] `src/server.js` — http server + io attachment + listen
- [ ] `src/lib/errors.js` — `AppError` class
- [ ] `src/middleware/error.js` — error envelope formatter
- [ ] `GET /health` returning `{ ok: true, version }`
- [ ] Confirm `pnpm --filter api dev` boots
- [ ] Commit: `feat(api): bootstrap express server with health check`

### Phase 0.4 — Prisma + first migration + seed shell (1h)
- [ ] `prisma/schema.prisma` per ARCHITECTURE.md §4
- [ ] `pnpm --filter api db:migrate -- --name init`
- [ ] `src/db.js` — PrismaClient singleton with `@prisma/adapter-pg`
- [ ] `prisma/seed.js` — empty function plus npm script
- [ ] Commit: `feat(api): add prisma schema and initial migration`

### Phase 0.5 — Web skeleton (45m)
- [ ] `apps/web/package.json` per CLAUDE.md
- [ ] `next.config.mjs`, `jsconfig.json` with `@/*` alias
- [ ] `src/app/layout.jsx`, `src/app/page.jsx` (redirect to `/login`), `globals.css` (Tailwind v4 entry)
- [ ] `src/app/providers.jsx` — TanStack Query, Toaster, ThemeProvider (next-themes)
- [ ] `src/lib/api.js` — axios instance with `withCredentials: true` + 401 refresh interceptor
- [ ] `src/lib/socket.js` — socket factory keyed by workspace
- [ ] `src/lib/cn.js`
- [ ] Confirm `pnpm --filter web dev` boots, blank page renders
- [ ] Commit: `feat(web): bootstrap next 16 app router with tailwind v4`

### Phase 0.6 — Shared schemas package (30m)
- [ ] `packages/schemas/src/index.js` exporting auth + workspace + goal + action-item Zod schemas
- [ ] Wire to both apps via workspace: protocol
- [ ] Commit: `feat(schemas): add shared zod schemas package`

**Day 0 checkpoint:** `pnpm dev` brings up both apps, DB up, /health returns 200.

---

## Day 1 — Core features (target: 8h)

### Phase 1.1 — Auth end-to-end (2h)
- [ ] Backend: register, login, refresh (rotation), logout, me
- [ ] Tokens lib (`signAccess`, `signRefresh`, `verifyAccess`, `hashRefresh`)
- [ ] `requireAuth` middleware
- [ ] Frontend: `/login`, `/register` pages with React Hook Form + Zod
- [ ] `useAuth` hook + Zustand store with the user
- [ ] Protected layout `(app)/layout.jsx` redirects to `/login` if no `me`
- [ ] Commit: `feat(api): implement jwt auth with refresh rotation` and `feat(web): add login and register flows`

### Phase 1.2 — Workspaces + members + invites (1h45m)
- [ ] Backend routes per spec; `requireWorkspaceMember`, `requireWorkspaceRole`
- [ ] Frontend: `/workspaces` list + create modal; `/w/[id]/layout.jsx` shell w/ sidebar
- [ ] Members page + invite modal
- [ ] Accept-invite page (`/invite/[token]`)
- [ ] Commit: `feat(api): add workspace, member, and invitation endpoints` + `feat(web): add workspace switcher and members page`

### Phase 1.3 — Goals + milestones + activity (1h30m)
- [ ] Backend CRUD + nested milestone routes + activity feed (cursor pagination)
- [ ] Auto-generated activity entries on status / progress changes
- [ ] Frontend: goals list, goal detail page with milestones + activity
- [ ] Commit: `feat: implement goals, milestones, and activity feed`

### Phase 1.4 — Action items (kanban + list) (1h30m)
- [ ] Backend CRUD + filters
- [ ] Frontend: dnd-kit kanban; list view; toggle stored in Zustand
- [ ] Filters update URL query string
- [ ] Commit: `feat: add action items with kanban and list views`

### Phase 1.5 — Announcements + reactions + comments (1h15m)
- [ ] Backend: CRUD with sanitize-html, pin toggle, reactions (idempotent), comments
- [ ] Frontend: Tiptap editor in admin-only modal; feed with pin sort; emoji picker; comment thread
- [ ] Commit: `feat: add announcements with reactions and comments`

**Day 1 checkpoint:** A user can register, create a workspace, invite a
member, create goals/items/announcements, and react/comment. No real-time yet.

---

## Day 2 — Real-time, advanced, bonus, deploy (target: 6h+ buffer)

### Phase 2.1 — Real-time wiring (1h)
- [ ] Server: io middleware reads `at` cookie; `workspace:join` joins room; presence map; emit functions
- [ ] Server: emit on every domain write (goal, item, announcement, reaction, comment)
- [ ] Client: `useWorkspaceSocket` hook subscribes and updates TanStack Query cache via `setQueryData`
- [ ] Presence list in members sidebar with green dot
- [ ] Commit: `feat(realtime): add socket.io presence and live updates`

### Phase 2.2 — Mentions + notifications (45m)
- [ ] Backend: parse mentions, validate membership, insert Notification rows in transaction, emit `notification:created`
- [ ] Frontend: bell with unread count, dropdown list, mark-read
- [ ] Commit: `feat: add mentions and notifications`

### Phase 2.3 — Analytics + CSV (45m)
- [ ] Backend: summary endpoint, weekly completions endpoint, CSV streamer
- [ ] Frontend: dashboard widgets, Recharts line chart, export menu
- [ ] Commit: `feat: add analytics dashboard and csv export`

### Phase 2.4 — Optimistic UI (30m — most pieces are already in mutations)
- [ ] Extract `useOptimisticMutation` helper
- [ ] Apply to: action item status, reactions, pin/unpin, milestone progress
- [ ] Demo failure path: toast on rollback
- [ ] Commit: `feat: implement optimistic ui across mutations`

### Phase 2.5 — Audit log (1h)
- [ ] Helper `recordAudit(tx, { actorId, workspaceId, action, entityType, entityId, before, after })`
- [ ] Wire into every state-changing controller (in the same transaction)
- [ ] Backend: GET + filter + CSV
- [ ] Frontend: admin-only `/w/:id/audit` timeline with filter chips
- [ ] Commit: `feat: add immutable audit log with filterable timeline`

### Phase 2.6 — Bonus: dark theme + ⌘K palette (45m)
- [ ] next-themes wired into providers; toggle in header
- [ ] Tailwind v4 dark variant tokens in globals.css
- [ ] cmdk palette with the actions listed in REQUIREMENTS §J.2
- [ ] Commit: `feat: add dark mode and command palette`

### Phase 2.7 — Bonus: Swagger docs (30m)
- [ ] swagger-jsdoc config with route comments
- [ ] swagger-ui-express at `/api/docs`
- [ ] Commit: `docs(api): expose openapi specification at /api/docs`

### Phase 2.8 — Polish pass (45m)
- [ ] Empty states, loading skeletons, error boundaries
- [ ] Mobile sweep at 375px, 768px
- [ ] Toast for every mutation outcome
- [ ] Avatar fallbacks
- [ ] 404 page
- [ ] Remove every `console.log`
- [ ] Commit: `style: polish empty/loading/error states across app`

### Phase 2.9 — Deploy + seed (1h)
- [ ] Push to GitHub (public repo)
- [ ] Railway: create project, link repo, add Postgres plugin
- [ ] Service 1 (api): set env vars, deploy. Confirm `/health`.
- [ ] Run `db:seed` against prod (one-shot Railway run)
- [ ] Service 2 (web): set env vars, deploy. Confirm login as demo.
- [ ] Update CORS allowlist with the actual web URL
- [ ] Smoke test all flows on prod
- [ ] Commit: `chore(deploy): production env configuration`

### Phase 2.10 — README + walkthrough video (45m)
- [ ] Final README per submission checklist (live URLs, demo creds, env, advanced features chosen, known limitations)
- [ ] Record 4-min Loom: register → create workspace → invite → goals/items/announcements → real-time in two windows → optimistic rollback → audit log → CSV export → dark mode → ⌘K
- [ ] Commit: `docs(readme): final submission documentation`

---

## Cut list (drop in this order if behind)

1. Stretch: Jest tests (drop entirely)
2. Stretch: Email invitations (fall back to "copy link")
3. ⌘K palette (keep theme toggle)
4. Swagger UI (keep the JSDoc comments anyway, drop the `/api/docs` route)
5. Recharts chart (keep the summary widgets)
6. Audit log CSV export (keep the timeline UI)

What we **never** drop:
- Auth + protected routes + token refresh
- Workspaces + invites + roles
- Goals + milestones + action items + announcements
- Real-time updates + presence
- @mentions + notifications
- Optimistic UI (it's our chosen advanced feature)
- Audit log (other chosen advanced feature) — degrade UI before backend
- CSV export of workspace data (analytics §H requires it)
- Mobile responsiveness
- The deploy + seeded demo + video

---

## Daily summary template

At the end of each day, write to a file `daily-log.md` (not committed):

```
## Day N — YYYY-MM-DD
Done:
- ...
Skipped:
- ... (reason)
Blockers:
- ...
Tomorrow's first task:
- ...
```

This is for the human, not for Claude Code.

---

## Time triggers

If you hit any of these, stop and reassess:

- **Day 0 didn't finish by EOD:** drop Bonus J.4 (email + tests) entirely.
- **Day 1 ends without announcements working:** re-prioritize, do real-time on Day 2 morning before audit log.
- **Day 2 lunch and audit log not started:** drop ⌘K and Swagger UI immediately, free 75 minutes.
- **Day 2.5 lunch and not deployed:** stop building features, deploy what you have, then improve.

The recruiter sees a deployed, working v0.9 better than a half-deployed v1.0.
