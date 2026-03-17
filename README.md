# Tenant Panel

A lightweight admin panel for managing my RAG API deployment. Built with Go (Gin) on the backend and Vue.js 2 + Ant Design Vue on the frontend, no build step required.

---

## Features

- **Dashboard** — live site stats, server status, queue snapshot (auto-refreshes every 10s)
- **Site Management** — view all sites, toggle active/inactive, change plan, create new sites, regenerate API keys, reset message logs or vector chunks, configure per-site LLM credentials
- **Queue Monitor** — track upload jobs with live status polling every 5s, retry failed jobs

---

## Tech Stack

| Layer | Choice |
|---|---|
| Router | [Gin](https://github.com/gin-gonic/gin) |
| Frontend | Vue.js 2 + Ant Design Vue 1.7.8 (CDN) |
| Auth | gin-contrib/sessions (cookie store) |
| Storage | GORM + SQLite (panel settings + tracked jobs) |
| Assets | Go `embed.FS` (binary includes all HTML/JS) |

---

## Quick Start

### With Docker (recommended)

1. Copy the env file and fill in your values:

```sh
cp .env.example .env
```

2. Start the panel:

```sh
docker compose up --build
```

3. Open **http://localhost:9005** and log in with your `PANEL_SECRET`.

---

### Without Docker

Requirements: Go 1.21+, gcc (for SQLite CGO)

```sh
go mod tidy
go run .
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `RAG_API_URL` | `http://localhost:8000` | URL of your RAG API |
| `ADMIN_SECRET` | _(empty)_ | Forwarded as `X-Admin-Secret` to the RAG API |
| `PANEL_SECRET` | `changeme` | Password to log into this panel |
| `PORT` | `9005` | Port the panel listens on |
| `DB_PATH` | `./rag-panel.db` | SQLite database path |

> **Note:** When running via Docker, use `http://host.docker.internal:8000` as `RAG_API_URL` to reach a RAG API running on your host machine.

---

## Project Structure

```
tenant-panel/
├── main.go
├── config/config.go          # env var loading
├── database/db.go            # GORM init + session key persistence
├── logger/logger.go
├── web/
│   ├── web.go                # Gin router + embed.FS
│   ├── controller/           # HTTP handlers (sites, queue, server, auth)
│   ├── service/
│   │   ├── rag_client.go     # typed HTTP client for all RAG API calls
│   │   └── job_tracker.go    # SQLite-backed job tracking
│   ├── entity/               # GORM models (Setting, TrackedJob)
│   ├── middleware/auth.go    # session auth guard
│   ├── session/session.go    # cookie store helpers
│   ├── html/                 # login.html + index.html (SPA shell)
│   └── assets/js/            # Vue components + Axios API client
├── Dockerfile
└── docker-compose.yml
```

---

## Panel API Routes

### Server

| Method | Path | Description |
|---|---|---|
| `GET` | `/panel/api/server/status` | RAG server health |

### Sites

| Method | Path | Description |
|---|---|---|
| `GET` | `/panel/api/sites` | List all sites |
| `POST` | `/panel/api/sites` | Create a new site (returns API key once) |
| `POST` | `/panel/api/sites/:id/active` | Activate or deactivate — body: `{ "is_active": bool }` |
| `POST` | `/panel/api/sites/:id/plan` | Update site plan |
| `PATCH` | `/panel/api/sites/:id/llm` | Set per-site LLM provider, model, and API key |
| `POST` | `/panel/api/sites/:id/regenerate-key` | Issue a new API key, invalidates the old one |
| `POST` | `/panel/api/sites/:id/reset` | Clear message logs and/or vector chunks — body: `{ "messages": bool, "files": bool }` |

### Queue

| Method | Path | Description |
|---|---|---|
| `GET` | `/panel/api/queue` | Get tracked jobs with live status |
| `POST` | `/panel/api/queue/:job_id/track` | Start tracking a job |
| `POST` | `/panel/api/queue/:job_id/retry` | Retry a failed job |

---

## 👩🏼‍💻Author

**Fatima R.**
- Backend Software Developer | AI Enthusiast
- LinkedIn: [linkedin.com/in/frostami](https://www.linkedin.com/in/frostami/)

---

## ⭐ Star this repo if you find it useful!

If this project saved you time or helped you build something cool, consider buying me a coffee, it keeps the projects coming!

<p align="center">
  <a href="https://buymeacoffee.com/ForetoldFatima">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" width="150" alt="Buy Me A Coffee">
  </a>
</p>