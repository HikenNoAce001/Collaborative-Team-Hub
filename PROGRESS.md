# PROGRESS

Living log of execution against `ROADMAP.md`. Updated after every phase commit.

> **Legend:** ✅ done · ⏳ in progress · 🔲 pending · ⏭️ deferred to cut list

---

## Phase flow

```mermaid
flowchart LR
    classDef done fill:#22c55e,color:#fff,stroke:#16a34a,stroke-width:2px
    classDef wip fill:#f59e0b,color:#fff,stroke:#d97706,stroke-width:2px
    classDef pending fill:#e5e7eb,color:#374151,stroke:#9ca3af

    subgraph D0[Day 0 — Foundation]
      P01[0.1 Repo bootstrap]
      P02[0.2 Docker + envs]
      P03[0.3 API skeleton]
      P04[0.4 Prisma + migration]
      P05[0.5 Web skeleton]
      P06[0.6 Shared schemas pkg]
    end

    subgraph D1[Day 1 — Core features]
      P11[1.1 Auth E2E]
      P12[1.2 Workspaces + invites]
      P13[1.3 Goals + milestones]
      P14[1.4 Action items + kanban]
      P15[1.5 Announcements + comments]
    end

    subgraph D2[Day 2 — Realtime, advanced, deploy]
      P21[2.1 Realtime wiring]
      P22[2.2 Mentions + notifications]
      P23[2.3 Analytics + CSV]
      P24[2.4 Optimistic UI]
      P25[2.5 Audit log]
      P26[2.6 Dark + cmdK]
      P27[2.7 Swagger]
      P28[2.8 Polish]
      P29[2.9 Deploy + seed]
      P210[2.10 README + video]
    end

    P01 --> P02 --> P03 --> P04 --> P05 --> P06
    P06 --> P11 --> P12 --> P13 --> P14 --> P15
    P15 --> P21 --> P22 --> P23 --> P24 --> P25
    P25 --> P26 --> P27 --> P28 --> P29 --> P210

    class P01,P02,P03,P04 done
    class P05 wip
    class P06,P11,P12,P13,P14,P15,P21,P22,P23,P24,P25,P26,P27,P28,P29,P210 pending
```

---

## Phase 0.1 + 0.2 — Repo bootstrap & Docker ✅

**Commit:** `1bc836b` — `chore(repo): bootstrap turborepo monorepo`

**What we did:**
1. Initialized git on `main`, set repo-local author identity.
2. Verified npm-latest for the locked stack; bumped CLAUDE.md table for Tiptap 3 / Recharts 3 / Sonner 2.
3. Wrote root `package.json`, `pnpm-workspace.yaml`, `turbo.json` (Turbo 2 task syntax).
4. Wrote root tooling: `.gitignore`, `.editorconfig`, `.prettierrc.json` (+ tailwind plugin), `.prettierignore`, `.nvmrc` (Node 22).
5. Scaffolded 5 workspace folders: `apps/api`, `apps/web`, `packages/{schemas,eslint-config,prettier-config}` with placeholder `package.json` + workspace links.
6. Wrote shared ESLint flat configs (`base`/`node`/`next`) and Prettier config in `packages/`.
7. `docker-compose.yml` — Postgres 16 (named volume) + maildev (opt-in via `--profile mail`).
8. `.env.example` for both apps with all required keys.
9. Added `README.md` overview pointing at the four spec docs.

**Verified:** `pnpm install` resolves all 6 workspaces; `pnpm list -r --depth -1` lists root + api + web + 3 packages.

**Files added** (27 files, 3088 insertions):
- root configs (8): `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `.editorconfig`, `.prettierrc.json`, `.prettierignore`, `.nvmrc`
- workspace placeholders (10): `apps/{api,web}/package.json`, `apps/{api,web}/.env.example`, `packages/*/package.json`, `packages/eslint-config/{base,node,next}.js`, `packages/prettier-config/index.json`, `packages/schemas/src/index.js`
- infra (1): `docker-compose.yml`
- docs (5): `README.md`, `Claude.md`, `requirements.md`, `ARCHITECTURE.md`, `ROADMAP.md`

---

## Phase 0.3 — API skeleton ✅

**Commit:** `b207371` — `feat(api): bootstrap express server with health check`

**Sub-steps:**
1. Generated 64-char hex JWT access + refresh secrets via `crypto.randomBytes(32)`, wrote them into gitignored `apps/api/.env`.
2. Brought up Postgres via `docker compose up -d db` (healthy, port 5432).
3. Installed Phase 0.3 runtime deps: `express@^5.2.1`, `helmet@^8.1.0`, `cors@^2.8.5`, `cookie-parser@^1.4.7`, `zod@^4.4.1`, `pino@^10.3.1`, `pino-http@^11.0.0`, `pino-pretty@^13.1.3`.
4. Wrote `src/env.js` — Zod-validated env loader; preprocesses `'' → undefined` so `.env` empty fields don't break optional coercions; throws on boot if invalid.
5. Wrote `src/lib/errors.js` — `AppError` class + named factories (`BadRequest`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`, `Gone`, `Validation`).
6. Wrote `src/lib/logger.js` — pino with redact paths for cookies, auth headers, password fields, `*.email`; pino-pretty in dev only.
7. Wrote `src/middleware/error.js` — envelope formatter for `ZodError` → 422, `AppError` → mapped status, fallback → 500 (no stack in prod per CLAUDE.md §9).
8. Wrote `src/app.js` — Express 5 app: helmet, CORS allowlisted to `CLIENT_URL` with `credentials:true`, JSON 1mb, cookieParser, pino-http (skips `/health` log noise), `GET /health`, then 404 + error handlers last.
9. Wrote `src/server.js` — `http.createServer` + listen + graceful SIGINT/SIGTERM with 10s force-kill timer + unhandledRejection/uncaughtException hooks.
10. Wrote `apps/api/eslint.config.js` re-exporting `@team-hub/eslint-config/node`.

**Verified by user:**
```
$ curl -i http://localhost:4000/health
HTTP/1.1 200 OK
{"ok":true,"name":"@team-hub/api","version":"0.1.0","env":"development","uptimeSec":36}

$ curl -i http://localhost:4000/nope
HTTP/1.1 404 Not Found
{"error":{"code":"NOT_FOUND","message":"Route GET /nope not found"}}
```
All Helmet headers present (CSP, HSTS, X-Frame-Options, …); CORS scoped to `http://localhost:3000` with `Access-Control-Allow-Credentials: true`.

**Boot bug found and fixed:** `SMTP_PORT=` (empty) was coerced to `0` and failed `.positive()`. Fix: top-level preprocessor in `env.js` maps `'' → undefined` for all keys before validation.

---

## Phase 0.4 — Prisma schema + initial migration ✅

**Migration:** `20260501105147_init` applied; 15 tables created (14 models + `_prisma_migrations`).

**Files written:**
- `apps/api/prisma/schema.prisma` — full schema per ARCHITECTURE.md §4 (5 enums + 14 models with compound indexes).
- `apps/api/src/db.js` — `PrismaClient` singleton with `@prisma/adapter-pg` + hot-reload guard for `node --watch`.
- `apps/api/prisma/seed.js` — no-op shell until Phase 1.x.

**Sub-steps done:**
1. Hit Node-version blocker on `prisma` dev install (Prisma 7 needs Node ≥ 22.12, local was 22.2). Resolved via `brew upgrade node@22` → 22.22.2.
2. Installed `@prisma/client@^7.8.0`, `@prisma/adapter-pg@^7.8.0`, `pg@^8.13.1` as runtime; `prisma@^7.8.0` as dev.
3. Wrote schema + db.js + seed.js.
4. Hit Prisma 7 schema break: `url` is no longer allowed in `datasource db { … }`. Moved it to a new `apps/api/prisma.config.js` (using `defineConfig` from `prisma/config`) and installed `dotenv` so that file can read `DATABASE_URL` from `apps/api/.env` at config-load time. Schema datasource block is now provider-only.

**Provider deviation from CLAUDE.md** (logged in CLAUDE.md + ARCHITECTURE.md):
CLAUDE.md initially specced the new `prisma-client` provider. After inspecting the installed CLI build (`prisma@7.8.0/build/index.js`), the provider registry is:
```
{ PrismaClientJs: "prisma-client-js",  PrismaClientTs: "prisma-client" }
```
The new `prisma-client` provider is TS-only (internally named `PrismaClientTs`) and would require a TS build step or `--experimental-strip-types` to consume from our pure-JS ESM backend. We use the **`prisma-client-js`** provider instead — still fully supported in Prisma 7, emits JS, works with `@prisma/adapter-pg` for the Rust-free driver path. CLAUDE.md and ARCHITECTURE.md updated to match.

**Verified by user:** `pnpm --filter @team-hub/api db:migrate --name init` ran clean; `\dt` returned all 15 expected tables (`ActionItem`, `Announcement`, `AuditLog`, `Comment`, `Goal`, `GoalUpdate`, `Invitation`, `Milestone`, `Notification`, `Reaction`, `RefreshToken`, `User`, `Workspace`, `WorkspaceMember`, `_prisma_migrations`). `prisma generate` emitted the JS client to `apps/api/src/generated/prisma/`. Seed no-op fired.

---

## Up next

- Phase 0.5 — Web skeleton (Next 16 + Tailwind v4 + providers + axios refresh interceptor)
- Phase 0.6 — Shared Zod schemas package
- Phase 1.1 — Auth end-to-end

See `ROADMAP.md` for the full execution plan and `requirements.md` §A for the locked decisions and cut list.
