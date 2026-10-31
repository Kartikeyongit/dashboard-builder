# 📊 Dashboard Builder

A production‑ready, real‑time dashboard builder inspired by Retool and Grafana.  
Connect databases, write SQL, and design live dashboards with drag‑and‑drop widgets – all through a modern UI.

> **Note** · This project no longer publishes a public demo. Run it locally or
> deploy your own instance with [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## ✨ Features

- 🔗 **Connect databases** – PostgreSQL and MySQL via a UI; credentials encrypted at rest.
- 🧩 **Drag‑&‑drop builder** – Arrange charts, tables, and metric cards on a grid; auto‑saving layout.
- 👁️ **Read‑only view mode** – Open any dashboard at `/dashboards/:id` for a clean, distraction‑free view with fullscreen and refresh controls.
- 🎛️ **Dashboard filters** – Add date, number, text, or dropdown filters and reference them in SQL as `{{filter_id}}`; values are bound as real SQL parameters, never interpolated.
- 🖱️ **Cross‑filtering** – Click a bar or pie slice to set the dashboard filter for that dimension; every widget using the filter reloads, and the URL updates so the view stays shareable.
- 📤 **CSV export** – Download table and metric widgets as CSV, including the active filter values.
- 📑 **Duplicate dashboards** – Copy a dashboard and all of its widgets in one click; saved queries are shared.
- ✍️ **SQL editor** – Monaco editor with schema autocomplete, query execution, and sandboxed validation.
- 🔄 **Real‑time updates** – WebSocket push with in-process pub/sub (optional Redis for multi-instance deployments); dashboards refresh automatically on a schedule.
- ⚡ **Fast dashboards** – Widget queries run in parallel with bounded concurrency, identical queries are deduplicated, and a short‑lived in‑process cache absorbs repeated refreshes.
- 🧳 **Small initial bundle** – Routes are lazy‑loaded; Monaco, AG Grid, and ECharts load only on the pages that need them.
- 🔗 **Shareable links** – Read‑only public URLs with optional password protection and expiry.
- 👥 **Multi‑tenant** – Organizations, users, and role‑based access (admin/editor/viewer).
- 🛡️ **Secure** – JWT authentication, rate limiting, SQL sandbox (read‑only, row limits, timeouts).
- 📦 **Seed data** – 200 customers, 1000 orders, 500 events, 2800 metrics, and 30+ queries across 6 dashboards.

---

## 🛠 Tech Stack

| Layer       | Technology |
|-------------|------------|
| **Frontend** | React 19, Vite, TypeScript, Redux Toolkit, React Router, Monaco Editor, ECharts, AG Grid, react‑grid‑layout, framer‑motion, react‑loading‑skeleton, react‑error‑boundary |
| **Backend**  | Go 1.25, Fiber (HTTP framework), gorilla/websocket, in-process pub/sub (optional Redis), pgxpool, Prometheus metrics, godotenv, zap (structured logger) |
| **Database** | PostgreSQL (app data); Redis only if you scale to multiple instances |
| **Infra**    | Docker, Render (backend + static site), Neon (PostgreSQL) |
| **Testing**  | Vitest, Cypress, React Testing Library |

---

## 🏗 Architecture

```
Client (React) ←→ Nginx / Render Proxy ←→ Go API Server (Fiber)
                            │
               ┌────────────┴────────────┐
               │  WebSocket Hub          │
               │  Scheduler              │
               └────────────┬────────────┘
                            │
               ┌────────────┴────────────┐
               │  PostgreSQL             │
               │  (Redis optional)       │
               └─────────────────────────┘
```

- The **API** handles REST and WebSocket connections.
- The **scheduler** polls dashboards with a refresh interval and pushes results to connected clients through the in-process hub. If `REDIS_URL` is set, it uses Redis pub/sub instead so multiple instances share updates.
- The **frontend** subscribes to live updates for each dashboard using WebSockets.

---

## 📁 Project Structure

```
dashboard-builder/
├── backend/                    # Go module
│   ├── cmd/
│   │   ├── api/               # Main server entry
│   │   └── seed/              # Database seeder
│   ├── internal/
│   │   ├── api/               # Handlers, middleware, router
│   │   │   ├── handler/       # Route handlers
│   │   │   └── middleware/    # Auth, org, request ID middleware
│   │   ├── datasource/        # Pool manager, SQL validator, executor
│   │   ├── db/                # Migrations, PostgreSQL & Redis connection
│   │   ├── model/             # Domain structs
│   │   ├── repository/        # Database access
│   │   ├── scheduler/         # Dashboard refresh scheduler
│   │   ├── seed/              # Seed data logic
│   │   ├── service/           # Business logic
│   │   └── ws/                # WebSocket hub, client, Redis subscriber
│   └── pkg/                   # Shared utilities (crypto, logger)
├── frontend/                  # React + Vite
│   ├── public/
│   ├── src/
│   │   ├── api/               # Axios client, WebSocket manager
│   │   ├── assets/            # Images, icons
│   │   ├── components/
│   │   │   ├── auth/          # Login, Register
│   │   │   ├── dashboard/     # DashboardView, DashboardEditor, DashboardList, filters, widgets
│   │   │   ├── datasource/    # DatasourceList, DatasourceForm
│   │   │   ├── home/          # Home page
│   │   │   ├── layout/        # AppShell
│   │   │   ├── query/         # QueryEditor, QueryList
│   │   │   └── viewer/        # SharedDashboardView
│   │   ├── hooks/             # Custom hooks (useDashboardSocket)
│   │   ├── store/             # Redux slices (auth, datasource, query, dashboard, toast)
│   │   ├── types/             # TypeScript interfaces
│   │   ├── utils/             # CSV, filter URL, layout, permission helpers
│   │   ├── animations.ts      # Framer motion variants
│   │   ├── hooks.ts           # Shared hooks
│   │   └── theme.ts           # MUI theme config
│   ├── Dockerfile             # Frontend container (Nginx)
│   └── nginx-frontend.conf    # Nginx config for SPA
└── docker-compose.yml         # Local development environment
```

---

## 💻 Local Development

### Prerequisites

- Go 1.25+ (or 1.22 with toolchain)
- Node.js 18+
- Docker (for PostgreSQL; Redis is optional)
- [Docker Compose](https://docs.docker.com/compose/) (v2+)

### 1. Start infrastructure

```bash
cd dashboard-builder
docker compose up -d
```

This launches PostgreSQL (localhost:5432). Redis is optional and only needed if
you want to simulate multiple backend instances:

```bash
docker compose --profile redis up -d
```

### 2. Configure environment

Create `backend/.env` from the template:

```bash
cp backend/.env.example backend/.env
```

Then fill in at least these values:

```env
DB_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/dashboard_builder?sslmode=disable
# Optional. Leave empty for single-instance mode (recommended).
REDIS_URL=
JWT_SECRET=replace-with-at-least-32-random-characters
ENCRYPTION_KEY=replace-with-64-hex-characters
PORT=8080
FRONTEND_URL=http://localhost:5173
```

Generate production values with `openssl rand -base64 48` (JWT) and
`openssl rand -hex 32` (encryption). The backend refuses to start if they are
missing or too weak.

### 3. Run the backend

```bash
cd backend
go mod tidy
go run cmd/api/main.go
```

Migrations run automatically on startup.

Seed the database with sample data:

```bash
go run cmd/seed/main.go
```

### 4. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173 and log in with `admin@acme.com` / `password123`.

### 5. Run the tests

```bash
cd frontend
npm test                 # unit tests (Vitest)
npm run build            # type-check + production bundle
```

The production smoke test renders a seeded dashboard and its editor in a real
browser. It catches bundler-only failures (such as a CommonJS/ESM interop issue
that does not reproduce in the dev server). With the backend on `:8099`, a
seeded local database, and a production build pointed at that API:

```bash
cd frontend
VITE_API_URL=http://127.0.0.1:8099/api/v1 npm run build
npm run preview -- --port 4173
npm run test:e2e         # in another terminal
```

---

## 🚀 Deployment

A complete, zero-cost deployment guide is in **[DEPLOYMENT.md](./DEPLOYMENT.md)**.
It covers Neon (PostgreSQL) and Render (backend Docker service + static
frontend), including environment variables, health checks, roles, and free-tier
caveats. Redis is not required.

The fastest path is the included Render Blueprint (`render.yaml`): in Render
choose **New → Blueprint**, connect the repo, and provide the three secrets.
The Blueprint creates both services and wires `FRONTEND_URL` and
`VITE_API_URL` automatically.

Quick summary:

- **Backend** – Render Web Service (Dockerfile in `backend/`)
  - Environment: `DB_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `FRONTEND_URL`, `SEED_SECRET`
  - Leave `REDIS_URL` empty (single-instance mode)
- **Frontend** – Render Static Site (publish directory `dist`)
  - Env var: `VITE_API_URL`
- **Database** – Neon free PostgreSQL (`?sslmode=require`)
- **Seed** – Optional one-time call to `/api/v1/seed?token=YOUR_SEED_SECRET`

### Health & Monitoring Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /healthz` | Health check (returns 200) |
| `GET /readyz` | Readiness check (pings DB, and Redis only if configured) |
| `GET /metrics` | Prometheus metrics (fiberprometheus) |

---

## 📡 API Reference

All API routes are prefixed with `/api/v1`.

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Log in, returns JWT |
| `POST` | `/auth/refresh` | Refresh JWT token |

### Datasources (protected)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/datasources` | List all datasources |
| `POST` | `/datasources` | Create a datasource |
| `GET` | `/datasources/:id` | Get datasource details |
| `PUT` | `/datasources/:id` | Update a datasource |
| `DELETE` | `/datasources/:id` | Delete a datasource |
| `POST` | `/datasources/:id/test` | Test datasource connection |
| `GET` | `/datasources/:id/schema` | Get database schema |

### Queries (protected)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/queries` | List all queries |
| `POST` | `/queries` | Create a query |
| `GET` | `/queries/:id` | Get query details |
| `PUT` | `/queries/:id` | Update a query |
| `DELETE` | `/queries/:id` | Delete a query |
| `POST` | `/queries/execute` | Execute ad-hoc SQL |
| `POST` | `/queries/:id/execute` | Execute a saved query |

### Dashboards & Widgets (protected)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/dashboards` | List all dashboards |
| `POST` | `/dashboards` | Create a dashboard |
| `GET` | `/dashboards/:id` | Get dashboard details |
| `PUT` | `/dashboards/:id` | Update a dashboard |
| `DELETE` | `/dashboards/:id` | Delete a dashboard |
| `POST` | `/dashboards/:id/duplicate` | Duplicate a dashboard and its widgets |
| `GET` | `/dashboards/:id/full` | Get dashboard with all widgets (accepts `f_<filter>` query params) |
| `POST` | `/dashboards/:dashboardId/widgets` | Add widget to dashboard |
| `PUT` | `/dashboards/:dashboardId/widgets/:id` | Update widget |
| `DELETE` | `/dashboards/:dashboardId/widgets/:id` | Delete widget |

### Sharing (public)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/dashboards/:id/share` | Create share link (protected) |
| `GET` | `/share/:token` | Get shared dashboard (public) |
| `POST` | `/share/:token/verify` | Verify share link password (public) |

### WebSockets (public + protected)

| Path | Description |
|------|-------------|
| `GET` `/api/v1/ws` | Real-time dashboard updates (authenticated) |
| `GET` `/api/v1/ws/share` | Real-time updates for shared dashboards (public) |

### User

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/me` | Get current user's organization ID |

---

### Dashboard filters

Filters are defined per dashboard (open a dashboard → **Filters**) and referenced in any widget query with a named placeholder:

```sql
SELECT date_trunc('day', created_at) AS day, SUM(total) AS revenue
FROM orders
WHERE created_at >= {{start_date}}
  AND created_at < {{end_date}}
  AND status = {{status}}
GROUP BY 1
ORDER BY 1;
```

Supported types are `text`, `number`, `date`, and `select`. Each filter can define a default value; `select` filters also need a comma-separated list of options.

- Values are bound as real SQL parameters (`$1`, `$2`, … for PostgreSQL; `?` for MySQL), never concatenated into the statement.
- Placeholders inside strings, quoted identifiers, and comments are left untouched.
- Active values are stored in the URL as `f_<filter_id>` (for example `?f_start_date=2026-01-01&f_status=paid`), so filtered views can be bookmarked or shared.
- Clearing a filter sends an explicit empty value, which overrides its default; the widget query then runs without that parameter.
- If a query references a filter that has no value and no default, that widget shows an error instead of running with a missing parameter.

#### Cross-filtering

Clicking a bar or pie slice sets the dashboard filter whose id (or label) matches the chart's first result column. A chart returning `country, COUNT(*)` drives a filter with id `country` or label `Country`; every widget that references `{{country}}` then reloads with the clicked value.

- Clicking the same value again clears the filter back to its configured default.
- Charts whose first column has no matching filter show a one-time hint instead of changing the dashboard.
- Cross-filtering is available in the authenticated dashboard view. Public share links continue to use the dashboard's default filter values.
- The URL is updated with the normal `f_<filter_id>` parameter, so a cross-filtered view can be bookmarked or shared.

---

## 🧪 Quick Start (Demo)

After local setup or deployment:

1. Register or log in.
2. **Datasources** → The internal PostgreSQL is already connected.
3. **Queries** → Browse 30+ pre‑built SQL queries.
4. **Dashboards** → Open "Sales Overview" or any of the six dashboards in **View** mode.
5. **Add Widgets** → Open the editor and drag charts/tables onto the grid and resize them.
6. **Filters** → Add a date or dropdown filter and reference it as `{{filter_id}}` in a widget query.
7. **Export** → Use the **CSV** button on any table or metric widget.
8. **Share** → Generate a read‑only link for any dashboard.

---

## 🔐 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_URL` | PostgreSQL connection string | `postgres://user:pass@host/db` |
| `REDIS_URL` | Optional. Leave empty for single-instance in-process pub/sub; set only for multiple backend instances | *(empty)* |
| `JWT_SECRET` | Secret for signing JWTs (32+ characters, required) | `a-long-random-string-at-least-32-chars` |
| `ENCRYPTION_KEY` | 32‑byte hex key for AES‑GCM (must be 64 hex chars, required) | `0123...def` |
| `PORT` | Backend server port (default `8080`) | `8080` |
| `DASHBOARD_CACHE_TTL_SECONDS` | In‑process saved‑query cache TTL in seconds; `0` disables it | `15` |
| `DASHBOARD_QUERY_CONCURRENCY` | Maximum widget queries executed at once per dashboard load | `6` |
| `FRONTEND_URL` | Allowed CORS origin | `https://myfrontend.onrender.com` |
| `SEED_SECRET` | Token to trigger database seeding via HTTP | `a1b2c3d4` (only needed once) |
| `SEED_DEMO_PASSWORD` | Password for seeded demo users (8+ chars). Required when seeding a hosted database; the local default is refused there | `a-strong-unique-password` |
| `MIGRATIONS_DIR` | Path to SQL migration files | `/etc/dashboard/migrations` |
| `VITE_API_URL` | Backend API URL (frontend build‑time) | `https://api.onrender.com/api/v1` |
| `VITE_WS_URL` | Optional WebSocket override; derived from `VITE_API_URL` by default | `wss://api.onrender.com/api/v1/ws` |

`backend/.env` is gitignored. Start from `backend/.env.example` and never commit
real credentials. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the security checklist.

---

## 🤝 Contributing

Contributions are welcome! This project was built as a learning exercise, but PRs for improvements, bug fixes, or new features are appreciated.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Open a pull request with a clear description.

---

## 📄 License

MIT © Kartikey Gautam

---

Built with ❤️ using Go, React, and a lot of coffee.
