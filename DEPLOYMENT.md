# Free deployment guide (Render + Neon + Upstash)

This guide deploys Dashboard Builder to free tiers only:

| Piece | Service | Free tier notes |
|-------|---------|-----------------|
| PostgreSQL | [Neon](https://neon.tech) | Project sleeps when idle; wakes on connect. |
| Redis | [Upstash](https://upstash.com) | Serverless Redis with a monthly command quota. Use the TLS `rediss://` URL. |
| Backend API (Go/Docker) | [Render](https://render.com) | Free web service sleeps after ~15 minutes of inactivity. |
| Frontend (static React) | [Render](https://render.com) | Free static site, global CDN, no sleep. |

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

## 2. Create Redis (Upstash)

1. Create an Upstash Redis database in the region closest to your Render region.
2. Open the database and copy the **TLS** connection string:
   ```
   rediss://default:PASSWORD@xxx.upstash.io:6379
   ```
3. Keep this as `REDIS_URL`.

> The scheduler only publishes while someone has a dashboard open, so idle
> command usage stays near zero.

## 3. Deploy the backend (Render Web Service)

1. Push this repository to GitHub.
2. In Render: **New → Web Service**, connect the repository.
3. Settings:
   - **Runtime**: Docker
   - **Root directory**: `backend`
   - **Dockerfile path**: `backend/Dockerfile` (or `Dockerfile` relative to root)
   - **Health check path**: `/healthz`
4. Environment variables:

   | Variable | Value |
   |----------|-------|
   | `DB_URL` | Neon connection string with `?sslmode=require` |
   | `REDIS_URL` | Upstash `rediss://...` URL |
   | `JWT_SECRET` | 32+ random characters (`openssl rand -base64 48`) |
   | `ENCRYPTION_KEY` | exactly 64 hex characters (`openssl rand -hex 32`) |
   | `FRONTEND_URL` | your frontend URL (set after step 4) |
   | `SEED_SECRET` | optional; leave empty to disable `/api/v1/seed` |
   | `PORT` | `8080` (the image already sets this) |

5. Deploy. Wait for `/healthz` to return 200 and note the backend URL, for
   example `https://dashboard-builder-api.onrender.com`.

> The image sets `MIGRATIONS_DIR`, so do not set it manually on Render.

## 4. Deploy the frontend (Render Static Site)

1. In Render: **New → Static Site**, connect the same repository.
2. Settings:
   - **Root directory**: `frontend`
   - **Build command**: `npm ci && npm run build`
   - **Publish directory**: `dist`
3. Environment variable:
   - `VITE_API_URL` = `https://<your-backend>.onrender.com/api/v1`
4. Add a rewrite rule so client-side routes work:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: Rewrite

## 5. Wire the two together

1. Copy the static site URL, for example
   `https://dashboard-builder-web.onrender.com`.
2. In the backend service, set `FRONTEND_URL` to exactly that URL (no trailing
   slash) and redeploy.

`FRONTEND_URL` controls CORS **and** the share links returned by
`POST /dashboards/:id/share`. If it is wrong, login and sharing will fail.

## 6. Create the first account

1. Open the frontend URL and register.
2. The first user of an organization is created with the `admin` role, so
   editing, sharing, and datasource management are enabled.
3. Add a datasource, write a query, and add widgets to a dashboard.

To load demo data instead, set `SEED_SECRET` and call once:
```
https://<your-backend>.onrender.com/api/v1/seed?token=YOUR_SEED_SECRET
```
Then log in with the seeded demo credentials printed in the README.

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
- **Upstash quota**: the scheduler skips dashboards nobody is viewing and uses a
  Redis lock plus jitter, which keeps command usage low.
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
- Restrict the Neon and Upstash credentials to this project only.

---

## Alternative: run everything locally

```bash
docker compose up -d          # PostgreSQL + Redis
cp backend/.env.example backend/.env
# fill in DB_URL, REDIS_URL, JWT_SECRET, ENCRYPTION_KEY
cd backend && go run ./cmd/api
cd frontend && npm install && npm run dev
```

See `README.md` for the full local setup.
