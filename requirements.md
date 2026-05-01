# REQUIREMENTS.md

The "what to build". Source of truth for scope. If a feature isn't here,
it isn't in scope.

---

## A. Locked decisions

| Decision            | Choice                                                                               |
| ------------------- | ------------------------------------------------------------------------------------ |
| Advanced feature #1 | **Optimistic UI** (TanStack Query mutations)                                         |
| Advanced feature #2 | **Audit log** (immutable, filterable, CSV export)                                    |
| Bonus features      | Dark/light theme, ⌘K palette, Swagger at `/api/docs`                                 |
| Stretch bonus       | Email invitations (Nodemailer), minimal Jest tests                                   |
| Package manager     | pnpm 9                                                                               |
| Auth tokens         | JWT in `httpOnly` cookies; refresh rotation                                          |
| Real-time           | Socket.io 4 with workspace rooms + per-user rooms                                    |
| Rich text           | Tiptap → sanitized HTML stored in Postgres `text`                                    |
| Demo seed           | 1 workspace, 3 users (1 admin + 2 members), 3 goals, 6 action items, 2 announcements |

> **If we run out of time, drop in this order:** stretch bonus →
> ⌘K palette → email → tests → Swagger UI (keep the spec, drop the UI route).
> Never drop: any item in §B–§I.

---

## B. Authentication

### B.1 Register

**As** a new user **I want** to create an account **so that** I can use the app.

- `POST /auth/register` — body `{ email, password, name }`
- Email unique (case-insensitive), valid format
- Password: ≥ 8 chars, ≥ 1 letter + ≥ 1 number (Zod-validated, same on FE)
- Bcrypt hash (cost 12)
- On success: issue access + refresh cookies, return `{ user }`
- Errors: 409 if email taken, 422 on validation

### B.2 Login

- `POST /auth/login` — body `{ email, password }`
- Generic error message on failure (no "user not found" leak)
- 200 with `{ user }`, sets cookies
- Rate limit: 10 attempts/min per IP

### B.3 Refresh

- `POST /auth/refresh` — reads `rt` cookie
- Verifies, looks up `RefreshToken` row by hashed token, checks `revokedAt`
- Rotates: revokes old, issues new pair
- Returns `{ user }`

### B.4 Logout

- `POST /auth/logout` — revokes the current refresh token, clears cookies
- 204

### B.5 Me

- `GET /auth/me` — returns the authenticated user, 401 if not

### B.6 Profile

- `PATCH /users/me` — name only (email change out of scope)
- `POST /users/me/avatar` — multipart `file`, ≤ 2 MB, jpeg/png/webp, uploads
  to Cloudinary folder `team-hub/avatars/`, stores returned secure URL
- 422 on size/format violations

### Acceptance

- Register → automatic login → land on `/workspaces`
- Refresh on access expiry happens once, transparently
- Logout works in same tab and is enforced server-side (token revoked)
- Avatar appears in nav within 1s of upload (optimistic + reconcile)

---

## C. Workspaces

### C.1 Create / list / switch

**As** any authenticated user **I want** to create or join workspaces.

- `GET /workspaces` — workspaces I'm a member of
- `POST /workspaces` — body `{ name, description?, accentColor? }` (hex `#RRGGBB`, default `#6366F1`)
- Creator is auto-added as `ADMIN`
- `GET /workspaces/:id` — full workspace + my role
- `PATCH /workspaces/:id` — admin only — name, description, accentColor
- `DELETE /workspaces/:id` — admin only — confirms by typed name on FE; cascades

### C.2 Members

- `GET /workspaces/:id/members` — list with role + online state (online comes from socket presence)
- `PATCH /workspaces/:id/members/:userId` — change role (admin only, can't demote yourself if last admin)
- `DELETE /workspaces/:id/members/:userId` — remove (admin only, can't remove last admin)

### C.3 Invitations

- `POST /workspaces/:id/invitations` — body `{ email, role }` (admin only)
- Generates random 32-byte token, stores hash, sets 7-day expiry
- Stretch bonus: emails the invite link via Nodemailer
- `GET /workspaces/:id/invitations` — pending invites (admin)
- `DELETE /invitations/:id` — revoke (admin)
- `POST /invitations/accept` — body `{ token }` — must be authenticated; creates membership; deletes invitation in same transaction; writes audit entry
- 410 if expired, 404 if not found, 409 if already a member

### Acceptance

- Workspace switcher in top-left shows all workspaces with their accent dot
- Creating a workspace → automatic switch → empty-state UI on dashboard
- Inviting a member → pending invite shows up in members list
- Member acceptance flow works end-to-end with the link from the API response

---

## D. Goals & Milestones

### D.1 Goals

- Fields: `title`, `description?` (plain text), `ownerId` (workspace member),
  `dueDate?`, `status` ∈ `DRAFT | ON_TRACK | AT_RISK | COMPLETED`, `createdAt`, `updatedAt`
- `GET /workspaces/:id/goals` — paginated, filter by `?status=`, `?ownerId=`,
  `?q=` (title contains, case-insensitive)
- `POST /workspaces/:id/goals` — any member; creator is owner if not specified
- `GET /goals/:id` — full goal with milestones + last 20 activity entries
- `PATCH /goals/:id` — owner OR admin
- `DELETE /goals/:id` — owner OR admin

### D.2 Milestones

- Fields: `title`, `progress` 0–100 integer, `createdAt`
- Goal's overall progress = average of milestone progress; if 0 milestones, derive from status
- `POST /goals/:id/milestones` — owner or admin
- `PATCH /milestones/:id` — owner or admin
- `DELETE /milestones/:id`

### D.3 Activity feed (per goal)

- `GET /goals/:id/updates` — cursor-paginated newest first (`?before=<id>`)
- `POST /goals/:id/updates` — body `{ body }` (markdown-light or plain text)
- Updates auto-generated on status change and milestone progress change
  (server-side, in the same transaction)

### Acceptance

- Goal detail page renders title, owner avatar, due date, status pill,
  milestone list with progress bars, activity feed
- Editing milestone progress updates the goal's overall progress in
  realtime for everyone in the workspace
- Status transitions emit `goal:updated` over socket

---

## E. Action Items

### E.1 CRUD

- Fields: `title`, `description?`, `assigneeId?`, `priority` ∈
  `LOW | MEDIUM | HIGH | URGENT`, `status` ∈ `TODO | IN_PROGRESS | REVIEW | DONE`,
  `dueDate?`, `goalId?` (parent goal link)
- `GET /workspaces/:id/action-items` — paginated; filters: `status`, `assigneeId`,
  `priority`, `goalId`, `q`
- `POST /workspaces/:id/action-items`
- `PATCH /action-items/:id`
- `DELETE /action-items/:id`

### E.2 Views

- **Kanban**: 4 columns (TODO, IN_PROGRESS, REVIEW, DONE), DnD via dnd-kit
  - Optimistic status update on drop
  - Server reconciles via `action-item:updated` socket event
- **List**: sortable by `dueDate`, `priority`, `assignee`, `status`, with same filters

### Acceptance

- View toggle persists per workspace in Zustand
- DnD between columns updates status, persists, broadcasts
- Filter combinations work and update URL query string (shareable links)

---

## F. Announcements

### F.1 Authoring

- Admin-only create/edit/delete
- `POST /workspaces/:id/announcements` — body `{ title, body, pinned? }`
- `body` is **Tiptap HTML** — sanitized server-side with `sanitize-html`
  (allow: `p, h1-h3, strong, em, u, s, code, pre, blockquote, ul, ol, li, a, img`)
- `PATCH /announcements/:id` — admin
- `DELETE /announcements/:id` — admin
- `PATCH /announcements/:id/pin` — admin — toggles pinned

### F.2 Reactions & comments

- `POST /announcements/:id/reactions` body `{ emoji }` — any member; one row per (user, announcement, emoji); idempotent
- `DELETE /announcements/:id/reactions/:emoji`
- `GET /announcements/:id/comments` — paginated newest first
- `POST /announcements/:id/comments` — body `{ body, mentionUserIds? }`
- Mentions trigger notifications (§G.3)

### F.3 Feed

- `GET /workspaces/:id/announcements` — pinned first, then newest
  - Returns counts: `reactionCount` (by emoji), `commentCount`
- Real-time push of `announcement:created`, `reaction:added/removed`, `comment:created`

### Acceptance

- Tiptap editor with toolbar (bold, italic, lists, link, code, image)
- Pin toggles a 📌 indicator and re-sorts feed
- Emoji picker with 6 default reactions; clicking your own removes it
- Comments visible inline with author avatar + relative time

---

## G. Real-time & Activity

### G.1 Live updates

Socket events documented in CLAUDE.md §7. Concrete coverage:

- New goal/action-item/announcement appears without refresh
- Status changes update kanban + lists in place
- Reaction/comment counts increment live

### G.2 Presence

- On socket connect after `workspace:join`, server adds user to a Redis-less
  in-memory map `Map<workspaceId, Set<userId>>` (single instance is fine for assessment)
- On disconnect, remove and broadcast `presence:update` with current online list
- UI renders green dot on member avatars in the workspace member sidebar

### G.3 @Mentions → notifications

- Comments allow `@user` syntax; FE resolves via member search; included as `mentionUserIds[]`
- Server validates each mentionedUserId is a workspace member
- Server creates a `Notification` row per mention and emits `notification:created` to each `user:${id}` room
- Notification bell in header shows unread count; dropdown lists last 20

### Acceptance

- Two browsers logged in as different members of the same workspace see
  every other's actions within 500ms
- Closing one tab reflects in the presence list within 5s
- @mention → bell badge increments → click to mark read → badge clears

---

## H. Analytics

### H.1 Dashboard stats

- Total goals (active, i.e. not `DRAFT`)
- Action items completed this week (status `DONE`, `updatedAt` ≥ start of ISO week)
- Overdue count: `dueDate < now` AND status not `DONE`/`COMPLETED`
- Implemented as a single endpoint: `GET /workspaces/:id/analytics/summary`

### H.2 Goal completion chart

- `GET /workspaces/:id/analytics/completions?period=12w` — returns
  `[{ weekStart, completed }]` for last 12 weeks
- Recharts `LineChart` with brand color from workspace accent

### H.3 CSV export

- `GET /workspaces/:id/export.csv?type=goals|action-items|all`
- Streams CSV (fast-csv or hand-rolled writer); filename
  `team-hub-${workspaceSlug}-${type}-${YYYYMMDD}.csv`
- Columns documented in ARCHITECTURE.md

### Acceptance

- Dashboard widgets render under 200ms after data is available
- Chart redraws when workspace switches
- CSV downloads instantly and opens cleanly in Excel + Sheets

---

## I. Advanced features (chosen)

### I.1 Optimistic UI

Applies to:

- Status changes on action items (Kanban DnD + List status select)
- Reactions on announcements (toggle)
- Comment creation
- Goal status / milestone progress updates
- Pin/unpin announcement

For each: TanStack Query `useMutation` with `onMutate` snapshot,
`onError` rollback + toast, `onSettled` invalidate. Reconciliation
prefers websocket payloads; query invalidation is the safety net.

A `useOptimisticMutation(queryKey, mutationFn, applyOptimistic)`
helper centralizes the pattern in `apps/web/src/lib/optimistic.js`.

**Demo points to show in the video:**

- Drag a card to "DONE" with the API offline → see rollback toast + revert
- Toggle a reaction in two tabs → both reflect instantly + reconcile

### I.2 Audit log

- Every state-changing action on goals, action-items, announcements,
  members, invitations writes one `AuditLog` row in the same transaction
- Schema: `id, workspaceId, actorId, action, entityType, entityId, before, after, ip?, createdAt`
- `action` ∈ `CREATE | UPDATE | DELETE | PIN | UNPIN | INVITE | ACCEPT_INVITE | REVOKE_INVITE | ROLE_CHANGE | REMOVE_MEMBER`
- `before`/`after` are `Json` (Prisma) — store only changed fields, max 4 KB
- `GET /workspaces/:id/audit-log` — admin only — filterable by:
  `actorId`, `action`, `entityType`, `from`, `to` — paginated 50/page
- `GET /workspaces/:id/audit-log/export.csv` — same filters
- UI: timeline view with collapsible rows showing diffs; admin-only menu item

**Immutability:** no `PATCH`/`DELETE` routes. Records ride along with
their parent transaction so a failed write produces no audit entry.

---

## J. Bonus features (committed)

### J.1 Dark / light theme

- `next-themes` with system preference detection + persistence
- Theme toggle in header
- Tailwind v4 dark variant with CSS variables for tokens

### J.2 ⌘K command palette

- `cmdk` modal opens on `⌘K` / `Ctrl+K`
- Actions: switch workspace, create goal, create action item, jump to
  announcements, toggle theme, log out
- Fuzzy search across workspaces + goals + action items in the current
  workspace (uses already-cached query data — no extra API)

### J.3 OpenAPI / Swagger

- `swagger-jsdoc` reads JSDoc comments above each route
- `swagger-ui-express` mounted at `/api/docs` (disable in prod via env flag, or leave on for the demo)

### J.4 Stretch (drop first if time-constrained)

- Email invitations via Nodemailer + a free SMTP (e.g. Brevo/Sendgrid free) — falls back to console log if `SMTP_*` not set
- Jest + Supertest covering: `/auth/register`, `/auth/login`, `/auth/refresh`,
  workspace create + invite + accept happy path

---

## K. Permissions matrix

|                             | Anon | Member | Admin |
| --------------------------- | ---- | ------ | ----- |
| Register / login            | ✅   | —      | —     |
| List my workspaces          | —    | ✅     | ✅    |
| Create workspace            | —    | ✅     | ✅    |
| View workspace              | —    | ✅     | ✅    |
| Edit/delete workspace       | —    | —      | ✅    |
| Invite / remove members     | —    | —      | ✅    |
| Change member roles         | —    | —      | ✅    |
| Create goal / action item   | —    | ✅     | ✅    |
| Edit own goal / action item | —    | ✅     | ✅    |
| Edit anyone's goal / item   | —    | —      | ✅    |
| Post announcement           | —    | —      | ✅    |
| Pin announcement            | —    | —      | ✅    |
| React / comment             | —    | ✅     | ✅    |
| View audit log              | —    | —      | ✅    |
| Export CSV                  | —    | ✅     | ✅    |

---

## L. Out of scope (do not build)

- Email change / password reset
- Multi-factor auth
- Public/shared workspaces
- File attachments on goals/action items (only avatars are uploaded)
- Threaded replies (comments are flat)
- Search across all workspaces
- Mobile app
- Internationalization
- Time tracking / Pomodoro
- Webhooks / external integrations

---

## M. Definition of done (per feature)

A feature is done when:

1. All acceptance criteria pass manually in the deployed app
2. The relevant socket events fire and are consumed by the frontend
3. The relevant audit entries are written (if applicable)
4. Permissions enforce server-side (verified by sending requests as a non-member)
5. Loading + empty + error states are present on every page
6. Mobile width 375px renders without horizontal scroll
7. Dark mode looks intentional, not "default Tailwind dark"

---

## N. Demo seed contents

Visible to the recruiter when they log in as `demo@team-hub.test` / `Demo1234`:

- **Workspace:** "Acme Product Launch" (accent `#6366F1`)
- **Members:** demo (admin), sarah (member), dev (member)
- **Goals:**
  - "Ship v1 marketing site" (ON_TRACK, due in 2 weeks, 3 milestones at 100/60/20%)
  - "Hire 2 frontend engineers" (AT_RISK, due in 1 week)
  - "Q2 OKR review" (DRAFT)
- **Action items:** 6 across all four statuses, including 2 overdue
- **Announcements:**
  - 📌 "Welcome to Acme!" (pinned)
  - "Friday demos start at 4pm"
- A handful of reactions, 1 comment with a mention, 1 pre-existing notification

Run `pnpm --filter api db:seed` to (re)create.
