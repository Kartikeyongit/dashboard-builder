# Free deployment guide (Render + Neon)

This guide deploys Dashboard Builder using free tiers only:

| Piece | Service | Free tier notes |
|-------|---------|-----------------|
| PostgreSQL | [Neon](https://neon.tech) | Project sleeps when idle; wakes on connect. |
| Backend API (Go/Docker) | [Render](https://render.com) | Free web service sleeps after ~15 minutes of inactivity. |
| Frontend (static React) | [Render](https://render.com) | Free static site, global CDN, no sleep. |

**Redis is not required.** The backend runs in single-instance mode using
in-process pub/sub for live widget updates and an in-process scheduler lock.
That is exactly what the free Render tier needs, because it runs one instance.
Redis is only useful later if you scale to multiple backend instances.

Everything below stays within those free plans. No credit card is required for
the free tiers at the time of writing, but check each provider's current terms.

---

## 1. Create the database (Neon)

1. Sign in to Neon and create a project (for example `dashboard-builder`).
2. Copy the **pooled** connection string. It looks like:
   ```
   postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/neondb
   ```
3. Append `?sslmode=require`:
   ```
   postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require
   ```
4. Keep this as `DB_URL`. Migrations run automatically on backend startup.

> Neon's free plan has a storage and compute-hour limit. A demo dashboard uses
> very little of either.

---

## 2. Deploy everything with the Blueprint (recommended)

The repository contains [`render.yaml`](./render.yaml), which creates both
services and wires their URLs together automatically.

1. Push this repository to GitHub.
2. In Render: **New → Blueprint**, connect the repository, and apply it.
3. Render reads `render.yaml` and prompts for three secrets:

   | Variable | Value |
   |----------|-------|
   | `DB_URL` | Neon connection string with `?sslmode=require` |
   | `JWT_SECRET` | 32+ random characters (`openssl rand -base64 48`) |
   | `ENCRYPTION_KEY` | exactly 64 hex characters (`openssl rand -hex 32`) |

4. Deploy. Render creates:
   - `dashboard-builder-api` — Docker web service, health check `/healthz`
   - `dashboard-builder-web` — static site, SPA rewrite to `/index.html`

### How the URLs are wired

`render.yaml` uses Render's built-in `RENDER_EXTERNAL_URL` via `fromService`:

- The backend's `FRONTEND_URL` is set to the static site's URL (CORS + share links).
- The frontend's `VITE_API_URL` is set to the backend's URL.

`VITE_API_URL` may be either an origin (`https://api.example.com`) or a full API
base (`https://api.example.com/api/v1`). The frontend normalizes both forms and
appends `/api/v1` when it is missing, so the Blueprint's origin-only value works
without any manual edit.

If you rename either service, re-sync the Blueprint so the references update.

If a URL is not populated after the first deploy (for example `VITE_API_URL` is
empty), set it manually in the service's **Environment** tab and redeploy:
`VITE_API_URL` = the backend origin, `FRONTEND_URL` = the static site origin.

### Optional: demo data

The Blueprint does not set `SEED_SECRET`, so `/api/v1/seed` stays disabled. To
load demo data, add `SEED_SECRET` to the backend service in the Render dashboard,
redeploy, then call once:
```
https://<your-backend>.onrender.com/api/v1/seed?token=YOUR_SEED_SECRET
```
Then log in with the seeded demo credentials printed in the README.

---

## 3. Deploy manually instead (alternative)

Use this only if you do not want a Blueprint. Create the two services by hand.

### Backend (Render Web Service)

1. In Render: **New → Web Service**, connect the repository.
2. Settings:
   - **Runtime**: Docker
   - **Root Directory**: `backend`
   - **Dockerfile Path**: `Dockerfile`
   - **Health Check Path**: `/healthz`
3. Environment variables:

   | Variable | Value |
   |----------|-------|
   | `DB_URL` | Neon connection string with `?sslmode=require` |
   | `JWT_SECRET` | 32+ random characters (`openssl rand -base64 48`) |
   | `ENCRYPTION_KEY` | exactly 64 hex characters (`openssl rand -hex 32`) |
   | `FRONTEND_URL` | your static site URL (set after creating it) |
   | `SEED_SECRET` | optional; leave empty to disable `/api/v1/seed` |
   | `PORT` | `8080` (the image already sets this) |

   Do **not** set `REDIS_URL`. Leaving it empty is the supported free setup.
   The image already sets `MIGRATIONS_DIR`, so do not set that either.

4. Deploy. Wait for `/healthz` to return 200 and note the backend URL, for
   example `https://dashboard-builder-api.onrender.com`.

### Frontend (Render Static Site)

1. In Render: **New → Static Site**, connect the same repository.
2. Settings:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm ci && npm run build`
   - **Publish Directory**: `dist`
3. Environment variable:
   - `VITE_API_URL` = `https://<your-backend>.onrender.com` (origin is enough)
     or `https://<your-backend>.onrender.com/api/v1` (both work).
4. Add a rewrite rule so client-side routes work:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: Rewrite

### Wire the two together

Set the backend's `FRONTEND_URL` to the static site URL (no trailing slash) and
redeploy. `FRONTEND_URL` controls CORS **and** the share links returned by
`POST /dashboards/:id/share`. If it is wrong, login and sharing will fail.

### If the Render build fails

The most common cause is the Dockerfile path. With **Root Directory** set to
`backend`, the Dockerfile path must be `Dockerfile`, not `backend/Dockerfile`.
If you leave Root Directory empty (repo root), use `backend/Dockerfile`
instead. Use one combination consistently:

| Root Directory | Dockerfile Path |
|----------------|-----------------|
| `backend` | `Dockerfile` |
| *(empty)* | `backend/Dockerfile` |

### If the service builds but does not start

- Check the deploy logs for `Configuration error: ...`. The backend refuses to
  start with a missing `DB_URL`, a `JWT_SECRET` shorter than 32 characters, or
  an `ENCRYPTION_KEY` that is not exactly 64 hex characters.
- Make sure the Neon URL ends with `?sslmode=require`.
- Do not set `REDIS_URL` to an expired or sleeping Redis instance. Leave it
  empty; the backend does not require Redis.

#### Logs still mention `upstash.io` or `Redis connection failed`

Render keeps environment variables that are not listed in `render.yaml`, so an
old `REDIS_URL` from a previous setup survives even after you remove it from the
file. Fix it in the dashboard:

1. Open the backend service → **Environment**.
2. Delete the `REDIS_URL` variable (or set it to an empty value).
3. Save and redeploy.

If you use the Blueprint, re-sync it: `render.yaml` now sets `REDIS_URL` to an
empty string explicitly, which clears the stale value. The backend also falls
back to single-instance mode if a configured Redis is unreachable, so a stale
URL can no longer prevent startup.

---

## 4. Create the first account

1. Open the frontend URL and register.
2. The first user of an organization is created with the `admin` role, so
   editing, sharing, and datasource management are enabled.
3. Add a datasource, write a query, and add widgets to a dashboard.

---

## Optional: Redis for multiple instances

The free Render tier runs one instance, so you do not need Redis. If you later
scale to two or more backend instances, set `REDIS_URL` to any Redis-compatible
service (for example a self-hosted Redis or a paid always-on instance). The
backend then uses Redis pub/sub and a distributed scheduler lock instead of the
in-process versions. No code changes are required.

---

## Roles

| Role | Can read | Can create/edit/delete content |
|------|----------|-------------------------------|
| `admin` | yes | yes |
| `editor` | yes | yes |
| `viewer` | yes | no |

The frontend hides edit controls for viewers, and the backend enforces the same
rules with `RequireRole("admin", "editor")`. Never rely on the UI alone.

---

## Free-tier behaviour to expect

- **Backend cold starts**: the free Render web service sleeps after inactivity.
  The first request after sleeping can take 30–60 seconds.
- **WebSocket reconnects**: the client retries every 3 seconds, so live updates
  resume automatically after a cold start.
- **Neon autosuspend**: the first query after idle may be slightly slower.
- **Scheduler**: it only refreshes dashboards that someone currently has open,
  and uses jitter to avoid bursts. No external service is involved.
- **No paid email/auth/AI**: invites and alerts are webhook-based; AI features
  are bring-your-own-key and not part of this deployment.

---

## Security checklist

- Never commit `backend/.env`. Use `backend/.env.example` as the template.
- Rotate any secret that was ever committed to git history, then purge history
  (`git filter-repo` or the BFG Repo-Cleaner) before making the repo public.
- Generate fresh values for `JWT_SECRET` and `ENCRYPTION_KEY` per environment.
  Rotating `ENCRYPTION_KEY` makes existing datasource passwords unreadable; you
  must re-enter them.
- Use a read-only database user for datasource connections whenever possible.
  The app also opens read-only transactions and rejects non-read-only SQL.
- Restrict the Neon credentials to this project only.

---

## Alternative: run everything locally

```bash
docker compose up -d          # PostgreSQL (Redis is optional)
cp backend/.env.example backend/.env
# fill in DB_URL, JWT_SECRET, ENCRYPTION_KEY
# leave REDIS_URL empty for single-instance mode
cd backend && go run ./cmd/api
cd frontend && npm install && npm run dev
```

See `README.md` for the full local setup.
