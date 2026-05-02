# Deploy — Railway

Two services + one Postgres plugin in a single Railway project. The repo carries
both `apps/api/railway.json` and `apps/web/railway.json` so each service knows
how to build and start itself; you point the service at the right config file
and Railway does the rest.

> Time budget: ~25 minutes end-to-end if you have Railway, GitHub, and
> Cloudinary accounts ready.

---

## 0. Prerequisites

- A Railway account ([railway.app](https://railway.app)) — Hobby plan is fine.
- A public GitHub repo for this code.
- A free Cloudinary account ([cloudinary.com](https://cloudinary.com)) — for avatar uploads.
  Skip if you don't care about avatars; the route will return `503 CLOUDINARY_NOT_CONFIGURED` until creds exist.
- The local `pnpm-lock.yaml` is committed and matches `package.json` (it does).

---

## 1. Push to GitHub

```bash
git remote -v   # confirm origin points at your GitHub repo
git push -u origin main
```

---

## 2. Create the Railway project

1. Railway dashboard → **New Project** → **Empty Project**.
2. Inside the project → **+ New** → **Database** → **Add PostgreSQL**. Railway
   provisions Postgres and exposes it via `${{ Postgres.DATABASE_URL }}`. You'll
   reference that variable in the API service below.

---

## 3. Create the API service

1. Inside the same project → **+ New** → **GitHub Repo** → pick this repo.
2. Open the new service → **Settings**:
   - **Source · Root Directory:** leave blank (repo root). pnpm workspaces
     resolve from the lockfile at the root.
   - **Source · Watch Paths:** `apps/api/**`, `packages/**`, `pnpm-lock.yaml`,
     `apps/api/railway.json`.
   - **Service · Config Path:** `apps/api/railway.json`.
   - **Networking · Generate Domain** — note the URL (e.g. `team-hub-api-production-xxxx.up.railway.app`).
3. **Variables** tab — paste these. `DATABASE_URL` references the Postgres
   plugin via Railway's variable interpolation:

```
NODE_ENV=production
PORT=4000
LOG_LEVEL=info
DATABASE_URL=${{ Postgres.DATABASE_URL }}
JWT_ACCESS_SECRET=<run: node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))">
JWT_REFRESH_SECRET=<run again — must differ>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d
CLIENT_URL=https://<placeholder>.up.railway.app   # update after step 4
ENABLE_SWAGGER=true

# Optional — only if you want avatar uploads to work in prod:
CLOUDINARY_CLOUD_NAME=<your_cloud>
CLOUDINARY_API_KEY=<your_key>
CLOUDINARY_API_SECRET=<your_secret>
```

> **Generate the JWT secrets** locally:
> ```
> node -e "console.log('JWT_ACCESS_SECRET=' + require('node:crypto').randomBytes(32).toString('hex'))"
> node -e "console.log('JWT_REFRESH_SECRET=' + require('node:crypto').randomBytes(32).toString('hex'))"
> ```

4. **Deploy**. The build runs `pnpm install + db:generate`; the start command
   runs `db:migrate:deploy` (idempotent — applies pending migrations or no-ops)
   then boots the API. Health check at `/health` should go green within ~30 s.

---

## 4. Create the Web service

1. **+ New** → **GitHub Repo** → same repo.
2. **Settings**:
   - **Source · Root Directory:** blank.
   - **Source · Watch Paths:** `apps/web/**`, `packages/**`, `pnpm-lock.yaml`,
     `apps/web/railway.json`.
   - **Service · Config Path:** `apps/web/railway.json`.
   - **Networking · Generate Domain** — note this URL too.
3. **Variables**:

```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://<api-service-domain>.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://<api-service-domain>.up.railway.app
```

4. **Deploy**.

---

## 5. Close the loop on `CLIENT_URL`

Now that the web service has a domain, go back to the **API service · Variables**
and set:

```
CLIENT_URL=https://<web-service-domain>.up.railway.app
```

This is the value Express's `cors` middleware allows for `Origin` (with
`credentials: true`), so without this set correctly, login will fail with a
CORS error and no auth cookies will be set. Saving the variable triggers a
redeploy of the API.

---

## 6. Seed the demo data (one time)

The seed script populates the demo workspace, three demo users, three goals
with milestones, six action items, two announcements, and a mention
notification. Run it once against the deployed Postgres:

```bash
# Easiest: open the API service in Railway → "..." → Connect → Run a Command
pnpm --filter @team-hub/api db:seed
```

Demo credentials after seeding:

```
demo@team-hub.test / Demo1234       (admin)
sarah.designer@team-hub.test / Demo1234
jamie.dev@team-hub.test / Demo1234
```

---

## 7. Smoke test

- Open `https://<web-domain>.up.railway.app/login` → sign in as `demo@team-hub.test`.
- Confirm the workspace shell loads, sidebar shows three members, kanban shows
  the seeded items, an announcement is pinned, the notification bell has 1
  unread mention.
- Open `https://<api-domain>.up.railway.app/api/docs` for the Swagger spec.
- Open `https://<api-domain>.up.railway.app/health` — should return JSON with
  `ok: true`.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Login succeeds in the response, but the page redirects back to `/login` | Cross-site cookies blocked. | API `NODE_ENV` must be `production` so cookies are set with `SameSite=None; Secure`. |
| Login returns 401 with `Origin not allowed` | API `CLIENT_URL` doesn't match the web origin. | Update `CLIENT_URL` on the API service to the exact web URL (no trailing slash). |
| `prisma migrate deploy` fails on first boot | Missing or wrong `DATABASE_URL`. | Make sure the API service's `DATABASE_URL` references `${{ Postgres.DATABASE_URL }}`. |
| Web build complains about missing `@team-hub/schemas` | Root install didn't run. | `apps/web/railway.json`'s buildCommand is `pnpm install --frozen-lockfile && pnpm --filter @team-hub/web build`. Verify the **Config Path** is set in the Railway service settings. |
| Avatar upload returns `503 CLOUDINARY_NOT_CONFIGURED` | Cloudinary creds missing. | Add the three Cloudinary env vars to the API service or skip the feature. |
| Sockets disconnect immediately on the deployed app | Mixed `NEXT_PUBLIC_SOCKET_URL` (e.g. `http://` not `https://`). | Force `https://` for both `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL`. |

---

## Updating the demo

`git push` to `main` triggers two automatic redeploys (one per service). The
API container runs `prisma migrate deploy` on every cold-start, so new schema
migrations apply on the next deploy without manual intervention.
