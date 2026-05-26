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
| **Frontend** | React 18, Vite, TypeScript, Redux Toolkit, React Router, Monaco Editor, ECharts, AG Grid, react‑grid‑layout |
| **Backend**  | Go 1.25, Fiber (HTTP framework), gorilla/websocket, Redis pub/sub, pgxpool |
| **Database** | PostgreSQL (app data), Redis (caching / pub‑sub) |
| **Infra**    | Docker, Render (backend + static site), Upstash (Redis), Neon/Aiven (optional DB) |

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
│   │   ├── datasource/        # Pool manager, SQL validator, executor
│   │   ├── db/                # Migrations, PostgreSQL & Redis connection
│   │   ├── model/             # Domain structs
│   │   ├── repository/        # Database access
│   │   ├── scheduler/         # Dashboard refresh scheduler
│   │   ├── service/           # Business logic
│   │   └── ws/                # WebSocket hub & client
│   └── pkg/                   # Shared utilities (crypto, logger)
├── frontend/                  # React + Vite
│   ├── public/
│   └── src/
│       ├── api/               # Axios client, WebSocket manager
│       ├── components/        # UI pages and widgets
│       ├── hooks/             # Custom hooks (useDashboardSocket)
│       ├── store/             # Redux slices
│       └── types/             # TypeScript interfaces
└── docker-compose.yml         # Local development environment
```

---

## 💻 Local Development

### Prerequisites

- Go 1.25+ (or 1.22 with toolchain)
- Node.js 18+
- Docker (for PostgreSQL & Redis)
- [docker‑compose](https://docs.docker.com/compose/)

### 1. Start infrastructure

```bash
cd dashboard-builder
docker-compose up -d
```

This launches PostgreSQL (localhost:5432) and Redis (localhost:6379).

### 2. Configure environment

Create `backend/.env`:

```env
DB_URL=postgres://dashboard:devpass@localhost:5432/dashboard_builder?sslmode=disable
REDIS_URL=localhost:6379
JWT_SECRET=supersecret
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
PORT=8080
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

Full instructions are in the deployment section of the original documentation.

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
| `FRONTEND_URL` | Allowed CORS origin | `https://myfrontend.onrender.com` |
| `SEED_SECRET` | Token to trigger database seeding via HTTP | `a1b2c3d4` (only needed once) |
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
