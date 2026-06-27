# 📊 Dashboard Builder

A production‑ready, real‑time dashboard builder inspired by Retool and Grafana.  
Connect databases, write SQL, and design live dashboards with drag‑and‑drop widgets – all through a modern UI.

> **Live Demo** · `admin@acme.com` / `password123`  
> https://dashboard-frontend-kms5.onrender.com

---

## ✨ Features

- 🔗 **Connect databases** – PostgreSQL and MySQL via a UI; credentials encrypted at rest.
- 🧩 **Drag‑&‑drop builder** – Arrange charts, tables, and metric cards on a grid; auto‑saving layout.
- ✍️ **SQL editor** – Monaco editor with schema autocomplete, query execution, and sandboxed validation.
- 🔄 **Real‑time updates** – WebSocket + Redis pub/sub; dashboards refresh automatically on a schedule.
- 🔗 **Shareable links** – Read‑only public URLs with optional password protection and expiry.
- 👥 **Multi‑tenant** – Organizations, users, and role‑based access (admin/editor/viewer).
- 🛡️ **Secure** – JWT authentication, rate limiting, SQL sandbox (read‑only, row limits, timeouts).
- 📦 **Seed data** – 200 customers, 1000 orders, 500 events, 2800 metrics, and 30+ queries across 6 dashboards.

---

## 🛠 Tech Stack

| Layer       | Technology |
|-------------|------------|
| **Frontend** | React 19, Vite, TypeScript, Redux Toolkit, React Router, Monaco Editor, ECharts, AG Grid, react‑grid‑layout, framer‑motion, react‑loading‑skeleton, react‑error‑boundary |
| **Backend**  | Go 1.25, Fiber (HTTP framework), gorilla/websocket, Redis pub/sub, pgxpool, Prometheus metrics, godotenv, zap (structured logger) |
| **Database** | PostgreSQL (app data), Redis (caching / pub‑sub) |
| **Infra**    | Docker, Render (backend + static site), Upstash (Redis), Neon/Aiven (optional DB) |
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
               │  Redis                  │
               └─────────────────────────┘
```

- The **API** handles REST and WebSocket connections.
- The **scheduler** polls dashboards with a refresh interval and pushes results via Redis to all connected clients.
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
│   │   │   ├── dashboard/     # DashboardEditor, DashboardList
│   │   │   ├── datasource/    # DatasourceList, DatasourceForm
│   │   │   ├── home/          # Home page
│   │   │   ├── layout/        # AppShell
│   │   │   ├── query/         # QueryEditor, QueryList
│   │   │   └── viewer/        # SharedDashboardView
│   │   ├── hooks/             # Custom hooks (useDashboardSocket)
│   │   ├── store/             # Redux slices (auth, datasource, query, dashboard, toast)
│   │   ├── types/             # TypeScript interfaces
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
- Docker (for PostgreSQL & Redis)
- [Docker Compose](https://docs.docker.com/compose/) (v2+)

### 1. Start infrastructure

```bash
cd dashboard-builder
docker compose up -d
```

This launches PostgreSQL (localhost:5432) and Redis (localhost:6379).

### 2. Configure environment

Create `backend/.env`:

```env
DB_URL=postgres://postgres:12345@localhost:5432/dashboard_builder?sslmode=disable
REDIS_URL=localhost:6379
JWT_SECRET=dev-secret-change-me
ENCRYPTION_KEY=51054af2fd747341356a45792245fff6290c91036491eaa57467be5a3608d0d2
PORT=8080
FRONTEND_URL=http://localhost:5173
```

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

---

## 🚀 Deployment

The project is deployable on Render (free tier) with Upstash Redis:

- **Backend** – Render Web Service (Dockerfile in backend/)
  - Environment: `DB_URL`, `REDIS_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `FRONTEND_URL`, `SEED_SECRET`

- **Frontend** – Render Static Site (publish directory `dist`)
  - Env vars: `VITE_API_URL`, `VITE_WS_URL`

- **Redis** – Upstash free instance (copy `rediss://` URL)

- **Seed** – Visit `https://api.<your-domain>/api/v1/seed?token=YOUR_SEED_SECRET` once.

### Health & Monitoring Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /healthz` | Health check (returns 200) |
| `GET /readyz` | Readiness check (pings DB & Redis) |
| `GET /metrics` | Prometheus metrics (fiberprometheus) |

Full instructions are in the deployment section of the original documentation.

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
| `GET` | `/dashboards/:id/full` | Get dashboard with all widgets |
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

## 🧪 Quick Start (Demo)

After local setup or deployment:

1. Register or log in.
2. **Datasources** → The internal PostgreSQL is already connected.
3. **Queries** → Browse 30+ pre‑built SQL queries.
4. **Dashboards** → Open "Sales Overview" or any of the six dashboards.
5. **Add Widgets** → Drag charts/tables onto the grid and resize them.
6. **Share** → Generate a read‑only link for any dashboard.

---

## 🔐 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_URL` | PostgreSQL connection string | `postgres://user:pass@host/db` |
| `REDIS_URL` | Redis connection string (supports `redis://` or `rediss://`) | `rediss://:pass@host:port` |
| `JWT_SECRET` | Secret for signing JWTs | `a-random-string` |
| `ENCRYPTION_KEY` | 32‑byte hex key for AES‑GCM (must be 64 hex chars) | `0123...def` |
| `PORT` | Backend server port (default `8080`) | `8080` |
| `FRONTEND_URL` | Allowed CORS origin | `https://myfrontend.onrender.com` |
| `SEED_SECRET` | Token to trigger database seeding via HTTP | `a1b2c3d4` (only needed once) |
| `MIGRATIONS_DIR` | Path to SQL migration files | `/etc/dashboard/migrations` |
| `VITE_API_URL` | Backend API URL (frontend build‑time) | `https://api.onrender.com/api/v1` |
| `VITE_WS_URL` | WebSocket URL (frontend build‑time) | `wss://api.onrender.com/api/v1/ws` |

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
