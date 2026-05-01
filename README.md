# Team Hub

Collaborative workspace for shared goals, announcements, and action items — built for the FredoCloud Technical Assessment.

> **Status:** scaffolded. See `ROADMAP.md` for the build plan and `REQUIREMENTS.md` for scope.

## Stack

- **Monorepo:** Turborepo + pnpm workspaces
- **Frontend:** Next.js 16 (App Router, JS-only), Tailwind 4, Zustand, TanStack Query
- **Backend:** Node 22 + Express 5, Prisma 7 (ESM), Socket.io 4
- **Database:** PostgreSQL 16
- **Auth:** JWT (access + rotated refresh) in httpOnly cookies
- **Storage:** Cloudinary
- **Deploy:** Railway (web + api as separate services)

## Workspaces

```
apps/
├── api/                  # Express + Prisma + Socket.io
└── web/                  # Next.js 16 App Router
packages/
├── schemas/              # Shared Zod schemas (single source of truth)
├── eslint-config/        # Shared ESLint flat config
└── prettier-config/      # Shared Prettier config
```

## Quick start

```bash
# Prerequisites: Node 22, pnpm 9, Docker
nvm use                   # picks up .nvmrc
pnpm install
docker compose up -d db
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm db:migrate           # once api is scaffolded
pnpm db:seed              # demo workspace + users
pnpm dev                  # turbo runs api (:4000) + web (:3000) in parallel
```

## Demo credentials (post-seed)

- `demo@team-hub.test` / `Demo1234` (admin)
- `sarah@team-hub.test` / `Demo1234` (member)
- `dev@team-hub.test` / `Demo1234` (member)

## Advanced features chosen

1. **Optimistic UI** — TanStack Query mutations with `onMutate` snapshot + rollback.
2. **Audit log** — immutable, filterable timeline with CSV export.

## Known limitations

- Single Node process; in-memory presence (no Redis adapter). Fine for one Railway replica.
- File uploads limited to avatars (no attachments on goals / action items).
- Email change and password reset are out of scope.

## Scripts

| Command            | What it does                                       |
| ------------------ | -------------------------------------------------- |
| `pnpm dev`         | Run api + web in parallel (turbo)                  |
| `pnpm build`       | Build all packages in dependency order             |
| `pnpm lint`        | Lint all packages                                  |
| `pnpm test`        | Run tests across all packages                      |
| `pnpm format`      | Prettier write across the repo                     |
| `pnpm db:migrate`  | Run Prisma migrations on the api workspace         |
| `pnpm db:seed`     | Seed the demo workspace                            |
| `pnpm db:generate` | Regenerate the Prisma client                       |

See `CLAUDE.md` for detailed conventions, `ARCHITECTURE.md` for design decisions, and `ROADMAP.md` for the execution plan.
