# ARCHITECTURE.md

Decisions, structures, and contracts. Update this file when reality
diverges from the plan — never let it lie.

---

## 1. Why a monorepo, why Turborepo

The assessment requires it, but more importantly:

- **Shared Zod schemas** are the single source of truth for validation
  on both the API and the frontend forms. Without a monorepo, this is
  copy-paste-rot waiting to happen.
- **One install, one lockfile, one CI graph.** `pnpm install` resolves
  both apps; `turbo run build` builds them in dependency order with
  caching.
- **Atomic cross-cutting changes.** Adding a new field to `ActionItem`
  touches the Prisma schema, the API controller, the shared Zod schema,
  and the frontend form — one PR, one commit graph.

Turborepo specifically (over Nx) because the configuration footprint is
small, caching is automatic, and the grader can read `turbo.json` in
five seconds.

---

## 2. Workspace topology

```
team-hub
├── apps/api      depends on: @repo/schemas
├── apps/web      depends on: @repo/schemas
└── packages
    ├── schemas           (the Zod source of truth)
    ├── eslint-config     (shared eslint config)
    └── prettier-config   (shared prettier config)
```

`@repo/schemas` is **JavaScript**, ESM, with JSDoc `@typedef`s so
editor IntelliSense works in both apps without TypeScript builds.

`turbo.json` tasks: `dev`, `build`, `lint`, `test`, `db:migrate`, `db:seed`.
`build` depends on `^build` (i.e. dependencies build first). `dev` is
persistent and not cached.

---

## 3. Tech stack rationale

| Choice                          | Rationale                                                      |
|---------------------------------|----------------------------------------------------------------|
| Next.js 16 App Router           | Mandatory; we get RSC, streaming, route groups, server actions only when convenient |
| JavaScript (no TS) on FE        | Mandatory. We use JSDoc + jsconfig for IntelliSense.           |
| ESM on backend                  | Forced by Prisma 7. Modern Node fully supports it.             |
| Express 5                       | Mandatory; we benefit from native async error handling.        |
| Prisma 7 + PostgreSQL           | Mandatory; we use the `prisma-client-js` provider (JS output) with `@prisma/adapter-pg` for the Rust-free driver path. The newer `prisma-client` provider is TS-only and our backend is JS. |
| Socket.io 4                     | Mandatory; rooms model maps cleanly to workspaces.             |
| TanStack Query                  | Server-state cache → enables clean optimistic updates.         |
| Zustand                         | Mandatory; we use it strictly for UI state.                    |
| Tailwind 4 + cva                | Tailwind is mandatory; cva gives clean variant components.     |
| Tiptap                          | Best-in-class rich text; outputs JSON or HTML.                 |
| dnd-kit                         | Modern, accessible, light-weight DnD for the kanban.           |
| Recharts                        | Mandatory.                                                     |
| Cloudinary                      | Mandatory.                                                     |
| Railway                         | Mandatory.                                                     |
| Docker (local)                  | Postgres + maildev locally; reproducible across machines.      |

---

## 4. Database schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
  // Note: the newer `prisma-client` provider in Prisma 7 emits .ts files only
  // (the CLI internally names it `PrismaClientTs`). Our backend is pure JS ESM,
  // so we use the still-supported `prisma-client-js` provider which emits .js.
  // Both work with `@prisma/adapter-pg` for the Rust-free driver path.
}

datasource db {
  provider = "postgresql"
  // Prisma 7 removed `url` from datasource blocks — it now lives in
  // `apps/api/prisma.config.js` (datasource.url) for the migrate CLI.
  // The runtime PrismaClient gets the connection via the @prisma/adapter-pg
  // adapter we instantiate in src/db.js.
}

enum Role        { ADMIN MEMBER }
enum GoalStatus  { DRAFT ON_TRACK AT_RISK COMPLETED }
enum ItemStatus  { TODO IN_PROGRESS REVIEW DONE }
enum Priority    { LOW MEDIUM HIGH URGENT }
enum AuditAction { CREATE UPDATE DELETE PIN UNPIN INVITE ACCEPT_INVITE REVOKE_INVITE ROLE_CHANGE REMOVE_MEMBER }

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  name          String
  avatarUrl     String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  memberships    WorkspaceMember[]
  invitationsSent Invitation[]    @relation("InvitedBy")
  refreshTokens   RefreshToken[]
  goalsOwned      Goal[]          @relation("GoalOwner")
  itemsAssigned   ActionItem[]    @relation("ItemAssignee")
  announcements   Announcement[]
  comments        Comment[]
  reactions       Reaction[]
  goalUpdates     GoalUpdate[]
  notifications   Notification[]  @relation("NotificationRecipient")
  auditLogs       AuditLog[]
}

model RefreshToken {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash  String   @unique
  expiresAt  DateTime
  revokedAt  DateTime?
  createdAt  DateTime @default(now())

  @@index([userId])
}

model Workspace {
  id          String   @id @default(cuid())
  name        String
  description String?
  accentColor String   @default("#6366F1")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members      WorkspaceMember[]
  invitations  Invitation[]
  goals        Goal[]
  actionItems  ActionItem[]
  announcements Announcement[]
  auditLogs    AuditLog[]
}

model WorkspaceMember {
  id          String   @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  role        Role      @default(MEMBER)
  joinedAt    DateTime  @default(now())

  @@unique([workspaceId, userId])
  @@index([userId])
}

model Invitation {
  id          String   @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  email       String
  role        Role     @default(MEMBER)
  tokenHash   String   @unique
  expiresAt   DateTime
  invitedById String
  invitedBy   User     @relation("InvitedBy", fields: [invitedById], references: [id])
  createdAt   DateTime @default(now())

  @@index([workspaceId])
  @@index([email])
}

model Goal {
  id          String   @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  ownerId     String
  owner       User     @relation("GoalOwner", fields: [ownerId], references: [id])
  title       String
  description String?
  dueDate     DateTime?
  status      GoalStatus @default(DRAFT)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  milestones  Milestone[]
  updates     GoalUpdate[]
  actionItems ActionItem[]

  @@index([workspaceId, status])
  @@index([workspaceId, dueDate])
}

model Milestone {
  id        String  @id @default(cuid())
  goalId    String
  goal      Goal    @relation(fields: [goalId], references: [id], onDelete: Cascade)
  title     String
  progress  Int     @default(0)         // 0–100, validated in app
  createdAt DateTime @default(now())

  @@index([goalId])
}

model GoalUpdate {
  id        String  @id @default(cuid())
  goalId    String
  goal      Goal    @relation(fields: [goalId], references: [id], onDelete: Cascade)
  authorId  String
  author    User    @relation(fields: [authorId], references: [id])
  body      String
  kind      String  @default("post") // 'post' | 'status_change' | 'milestone_progress'
  meta      Json?
  createdAt DateTime @default(now())

  @@index([goalId, createdAt])
}

model ActionItem {
  id          String   @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  goalId      String?
  goal        Goal?    @relation(fields: [goalId], references: [id], onDelete: SetNull)
  title       String
  description String?
  assigneeId  String?
  assignee    User?    @relation("ItemAssignee", fields: [assigneeId], references: [id])
  priority    Priority @default(MEDIUM)
  status      ItemStatus @default(TODO)
  dueDate     DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([workspaceId, status])
  @@index([workspaceId, assigneeId])
  @@index([workspaceId, dueDate])
  @@index([goalId])
}

model Announcement {
  id          String   @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  authorId    String
  author      User     @relation(fields: [authorId], references: [id])
  title       String
  bodyHtml    String   // sanitized HTML
  pinned      Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  comments  Comment[]
  reactions Reaction[]

  @@index([workspaceId, pinned, createdAt])
}

model Reaction {
  id             String  @id @default(cuid())
  announcementId String
  announcement   Announcement @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  userId         String
  user           User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  emoji          String
  createdAt      DateTime @default(now())

  @@unique([announcementId, userId, emoji])
}

model Comment {
  id              String   @id @default(cuid())
  announcementId  String
  announcement    Announcement @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  authorId        String
  author          User     @relation(fields: [authorId], references: [id])
  body            String
  mentionUserIds  String[] @default([])
  createdAt       DateTime @default(now())

  @@index([announcementId, createdAt])
}

model Notification {
  id          String   @id @default(cuid())
  recipientId String
  recipient   User     @relation("NotificationRecipient", fields: [recipientId], references: [id], onDelete: Cascade)
  kind        String   // 'mention' | 'invitation' | 'goal_assigned' | ...
  payload     Json
  readAt      DateTime?
  createdAt   DateTime @default(now())

  @@index([recipientId, readAt, createdAt])
}

model AuditLog {
  id          String      @id @default(cuid())
  workspaceId String
  workspace   Workspace   @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  actorId     String
  actor       User        @relation(fields: [actorId], references: [id])
  action      AuditAction
  entityType  String       // 'Goal' | 'ActionItem' | 'Announcement' | 'Member' | 'Invitation'
  entityId    String
  before      Json?
  after       Json?
  createdAt   DateTime    @default(now())

  @@index([workspaceId, createdAt])
  @@index([workspaceId, action])
  @@index([workspaceId, entityType, entityId])
}
```

### Notes
- All FKs cascade or `SetNull` deliberately — no orphan rows.
- `@@unique([workspaceId, userId])` prevents duplicate memberships.
- `@@unique([announcementId, userId, emoji])` makes reactions idempotent.
- Compound indexes match the predicates in the analytics + filter queries.

---

## 5. API surface

REST. JSON. Cookies for auth. All routes prefixed `/api/v1` server-side
but the frontend uses `NEXT_PUBLIC_API_URL` directly and configures axios
with `withCredentials: true`.

```
# Auth
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me

# Users
PATCH  /users/me
POST   /users/me/avatar          (multipart)

# Workspaces
GET    /workspaces
POST   /workspaces
GET    /workspaces/:id
PATCH  /workspaces/:id
DELETE /workspaces/:id

# Members
GET    /workspaces/:id/members
PATCH  /workspaces/:id/members/:userId
DELETE /workspaces/:id/members/:userId

# Invitations
GET    /workspaces/:id/invitations
POST   /workspaces/:id/invitations
DELETE /invitations/:id
POST   /invitations/accept

# Goals
GET    /workspaces/:id/goals
POST   /workspaces/:id/goals
GET    /goals/:id
PATCH  /goals/:id
DELETE /goals/:id

# Milestones
POST   /goals/:id/milestones
PATCH  /milestones/:id
DELETE /milestones/:id

# Goal updates
GET    /goals/:id/updates
POST   /goals/:id/updates

# Action items
GET    /workspaces/:id/action-items
POST   /workspaces/:id/action-items
GET    /action-items/:id
PATCH  /action-items/:id
DELETE /action-items/:id

# Announcements
GET    /workspaces/:id/announcements
POST   /workspaces/:id/announcements
PATCH  /announcements/:id
DELETE /announcements/:id
PATCH  /announcements/:id/pin

# Reactions / comments
POST   /announcements/:id/reactions
DELETE /announcements/:id/reactions/:emoji
GET    /announcements/:id/comments
POST   /announcements/:id/comments

# Notifications
GET    /notifications
PATCH  /notifications/:id/read
PATCH  /notifications/read-all

# Analytics
GET    /workspaces/:id/analytics/summary
GET    /workspaces/:id/analytics/completions
GET    /workspaces/:id/export.csv

# Audit log
GET    /workspaces/:id/audit-log
GET    /workspaces/:id/audit-log/export.csv

# Health & docs
GET    /health
GET    /api/docs                  (Swagger UI)
```

---

## 6. Real-time topology

```
          Browser                       API (one Node process)
  ┌────────────────────┐         ┌────────────────────────┐
  │ socket.io-client   │ ◄──────►│  io = new Server(http) │
  │  rooms it joins:   │         │                        │
  │  - workspace:<wsId>│         │  In-memory:            │
  │  - user:<userId>   │         │   workspacePresence    │
  └────────────────────┘         │   = Map<wsId, Set<uid>>│
                                 └────────────────────────┘
```

- One Node instance is fine for the assessment (Railway 1 replica).
  No Redis adapter needed.
- Auth handshake: `io.use((socket, next) => verifyAtCookie(socket.request.headers.cookie))`
- `socket.on('workspace:join', ({ workspaceId }) => { /* check membership, join room, broadcast presence */ })`
- All domain emitters live in `apps/api/src/realtime/emit.js` and are
  called from controllers/services after the DB write.

---

## 7. Frontend route map (App Router)

```
src/app/
├── (auth)/
│   ├── login/page.jsx
│   └── register/page.jsx
├── (app)/
│   ├── layout.jsx                       # checks auth via /auth/me, renders shell
│   ├── workspaces/
│   │   ├── page.jsx                     # list / create
│   │   └── new/page.jsx                 # alt route, optional
│   └── w/
│       └── [workspaceId]/
│           ├── layout.jsx                # workspace shell w/ sidebar + topbar
│           ├── page.jsx                  # dashboard (analytics summary)
│           ├── goals/
│           │   ├── page.jsx
│           │   └── [goalId]/page.jsx
│           ├── action-items/
│           │   ├── page.jsx              # list + kanban toggle
│           │   └── [itemId]/page.jsx
│           ├── announcements/
│           │   ├── page.jsx
│           │   └── [announcementId]/page.jsx
│           ├── members/page.jsx
│           ├── audit/page.jsx            # admin only
│           └── settings/page.jsx         # admin only
├── api/                                  # NOT used for our domain API
└── layout.jsx                            # root
```

---

## 8. Auth flow

```
Register / Login
   │
   ▼
 POST /auth/{register|login}
   │ (validate)
   ▼
 issue access (15m) + refresh (30d)
   │
   ▼
 set httpOnly cookies, return user
```

```
Subsequent request
   │
   ▼
 axios → API with at cookie
   │
   ├─ 200 → done
   │
   └─ 401
        │
        ▼
      axios interceptor → POST /auth/refresh
        │
        ├─ 200 → retry original request
        │
        └─ 401 → redirect to /login
```

**Refresh token rotation** — every successful refresh:
1. SELECT RefreshToken WHERE tokenHash = sha256(rt) AND revokedAt IS NULL AND expiresAt > now()
2. UPDATE … SET revokedAt = now()
3. INSERT new RefreshToken
4. Set new cookies, return user

If step 1 fails: clear cookies, 401. (If a stolen token tries to reuse a
revoked one we'll get 401 as expected.)

---

## 9. Local development

`docker-compose up -d db` brings up Postgres 16 on `localhost:5432`. The
apps run on the host (`pnpm dev`) so HMR works fast. Optional `maildev`
service catches outbound emails for the bonus invite flow.

One-shot bootstrap:
```bash
pnpm install
docker compose up -d db
pnpm --filter api db:migrate
pnpm --filter api db:seed
pnpm dev          # turbo runs api + web in parallel
```

Frontend on `:3000`, API on `:4000`, Postgres on `:5432`.

---

## 10. Production deployment (Railway)

One Railway project containing three services:

```
[ Postgres (plugin) ]   ← injects DATABASE_URL into the API service
        ▲
        │
[ API (Node 22, Dockerfile)  ]   ← public URL: https://api.<...>.up.railway.app
        ▲
        │ NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SOCKET_URL
        │
[ Web (Node 22, Dockerfile)  ]   ← public URL: https://web.<...>.up.railway.app
```

Env reference is in the README.

CORS in API: `origin: process.env.CLIENT_URL, credentials: true`.
Cookies in API: `Secure: NODE_ENV === 'production'`, `SameSite: 'lax'`.
Both apps' Dockerfiles are multi-stage with a `pnpm install --frozen-lockfile`
in the build stage and a small runtime stage that only includes the build
output + production deps.

Migrations run on each API deploy via the Dockerfile `CMD`:
```
sh -c "node ./node_modules/prisma/build/index.js migrate deploy && node src/server.js"
```

---

## 11. CSV export shapes

Goals CSV columns:
`id, title, owner_email, status, due_date, created_at, milestone_count, milestone_avg_progress`

Action items CSV columns:
`id, title, status, priority, assignee_email, due_date, parent_goal_title, created_at, updated_at`

Audit log CSV columns:
`created_at, actor_email, action, entity_type, entity_id, summary`
where `summary` is a human-readable diff (`"status: TODO → DONE"`).

---

## 12. Things we deliberately don't do

- **No GraphQL.** REST is mandatory.
- **No tRPC.** Same.
- **No Redis.** One process; in-memory presence is fine for the assessment.
- **No background jobs.** Everything is synchronous in the request path.
- **No global state library.** TanStack Query + Zustand cover all needs.
- **No CSS-in-JS.** Tailwind 4 only.
- **No client-side polling.** Sockets handle live updates.
- **No micro-frontends.** It's one app.

If any of these would clearly buy us points, revisit; otherwise: scope discipline.
