# Workbench Studio

> **One sentence. Four files. Live in seconds.**  
> Natural Language Schema Migration — OpenAI × Outskill Builder Hackathon 2026

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node 20+](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![OpenAI Codex CLI](https://img.shields.io/badge/powered%20by-Codex%20CLI-412991)](https://github.com/openai/codex)

---

## What It Does

Type a plain-English feature request. Workbench Studio sends it through a **four-agent AI pipeline** — each agent specialising in one layer of your full-stack codebase — and streams the generated code back to a dark IDE-style UI in real time.

| Step | Agent | Output |
|------|-------|--------|
| 1 | **Database Agent** | SQL migration (`ALTER TABLE` / `CREATE TABLE`) |
| 2 | **ORM Agent** | Sequelize/SQLite model file, informed by the migration |
| 3 | **API Agent** | Express route file, informed by the model |
| 4 | **Frontend Agent** | React component, informed by the API routes |

Hit **Apply Slice** → the migration runs against the live SQLite database, the files land in the sandbox, and the sandbox app inside the Studio iframe updates instantly. Hit **Reset Sandbox** to revert everything and start again.

---

## Architecture

Six services run concurrently in development:

| Service | Port | Stack | Role |
|---------|------|-------|------|
| **Workbench Studio** | 3000 | React 19 · Vite 8 · Tailwind v4 · Monaco | Dark IDE cockpit — prompt bar, diff viewer, agent console, sandbox iframe |
| **Agent Engine** | 4000 | Node 20 · Express 5 | Orchestrates Codex CLI subprocesses; streams progress via SSE |
| **Sandbox API** | 5000 | Node 20 · Express 5 · better-sqlite3 | Target demo app backend — dynamically mounts generated routes |
| **Sandbox Client** | 5001 | React 18 · Vite 5 · Tailwind v3 | ShopBase demo app rendered inside the Studio iframe |
| **JobBoard API** | 4001 | Node 20 · Express 4 · Prisma · SQLite | Bonus app — full-stack job board / applicant tracker |
| **JobBoard Client** | 5173 | React 18 · Vite 5 · Tailwind v3 | Job board UI — candidate + employer dashboards |

> **Note:** The Agent Engine spawns OpenAI Codex CLI as a **local child process**. This is not the OpenAI HTTP API — no API key is needed in this repo. Codex CLI manages its own authentication.

---

## Prerequisites

### 1 — Node.js v20 or higher

```bash
node --version   # must print v20.x.x or higher
```

Download: https://nodejs.org/en/download

### 2 — OpenAI Codex CLI

Codex CLI is the AI engine that powers the four agents. Install it globally:

```bash
npm install -g @openai/codex
```

Verify it installed correctly:

```bash
codex --version
```

#### Authenticate Codex CLI

Codex CLI requires an OpenAI account. Run the interactive login:

```bash
codex login
```

This opens a browser window. Sign in with your OpenAI account. After login, Codex CLI stores a token locally — **no `.env` file or API key is needed in this project**.

To confirm authentication works:

```bash
codex "write a hello world function in JavaScript"
```

If it returns code, you are ready.

> **Tip:** If you are on a machine without a browser (e.g. a remote server), run `codex login --no-browser` and follow the printed instructions.

### 3 — Git

```bash
git --version
```

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/workbench-studio.git
cd workbench-studio

# 2. Install all dependencies (root + every subapp)
npm run install:all

# 3. Set up the JobBoard database (first-time only)
cd app/server
cp .env.example .env          # edit JWT secrets before production
npx prisma migrate dev --name init
npx prisma db seed
cd ../..

# 4. Start all four core services
npm run dev
```

Open **http://localhost:3000** — the Workbench Studio.

The demo sandbox app is embedded in the right-hand iframe and is also reachable directly at **http://localhost:5001**.

To also start the bonus JobBoard app:

```bash
# In a separate terminal
npm run jobboard
```

JobBoard UI → **http://localhost:5173**

---

## Installation Scripts Reference

```bash
npm run install:all      # installs root + sandbox + sandbox/client + agent + studio + app/server + app/client
npm run dev              # starts Studio (3000), Agent (4000), Sandbox API (5000), Sandbox Client (5001)
npm run jobboard         # starts JobBoard API (4001) + JobBoard Client (5173)
npm run build:all        # production build of Studio + Sandbox Client + JobBoard Client
```

---

## Demo Mode vs Live AI Mode

### Demo Mode (default — no Codex CLI required)

Two scenarios ship with **pre-built offline cache** so a presentation never depends on the network:

- **"Add a ratings and reviews system"** — `reviews` table, model, REST endpoints, star-rating React component
- **"Add a referral system"** — `referrals` table, code generation, redemption endpoints, referral UI

Select a scenario from the sidebar and press **Run** — all four agents replay instantly from cache.

### Live AI Mode

Toggle the **Live AI** switch in the prompt bar, type any feature request, and press **Run**. Codex CLI is invoked in real time against the actual sandbox codebase.

**Requirements for Live AI:**
- Codex CLI installed and authenticated (see [Prerequisites](#prerequisites))
- OpenAI account with Codex access

---

## Apply Slice & Reset Sandbox

### Apply Slice

1. Runs the generated SQL migration against `sandbox/sandbox.db` inside a transaction
2. Writes the model file, routes file, and React component into `sandbox/`
3. Express dynamically mounts the new routes at `/api/<feature-slug>`
4. The Sandbox Client's `FeatureSlot` picks up the new `.component.jsx` and renders a "JUST ADDED" card

### Reset Sandbox

1. Discovers and drops all generated tables
2. Deletes generated model, routes, and component files
3. Unmounts dynamic routes — sandbox returns to its original state

---

## Project Structure

```
workbench-studio/
├── studio/                     # Workbench Studio UI — :3000
│   ├── src/
│   │   ├── App.jsx             # root — prompt bar + three-panel layout
│   │   ├── components/         # AgentCard, DiffViewer, Console, SandboxFrame …
│   │   └── hooks/
│   │       └── useSSE.js       # SSE consumer — drives all UI state
│   └── vite.config.js
│
├── agent/                      # Agent Engine — :4000
│   ├── index.js                # Express SSE endpoint + Apply + Reset routes
│   ├── orchestrator.js         # runs agents sequentially, pipes events
│   ├── agents/
│   │   ├── base-agent.js       # spawns `codex exec`, snapshots FS, diffs output
│   │   ├── database-agent.js
│   │   ├── orm-agent.js
│   │   ├── api-agent.js
│   │   └── frontend-agent.js
│   ├── prompts/
│   │   ├── layer-prompts.js    # per-agent system prompts
│   │   └── feature.prompt.js  # user-facing instruction template
│   ├── parser.js               # before/after directory snapshot diffing
│   ├── applier.js              # atomic migration + file writes
│   ├── layers.js               # layer metadata (colors, short names, file patterns)
│   └── cache/                  # offline demo scenarios (JSON)
│
├── sandbox/                    # Sandbox API — :5000
│   ├── server.js               # static + dynamic route dispatcher
│   ├── schema.sql              # baseline: users, products, orders
│   ├── db.js                   # better-sqlite3 connection
│   └── client/                 # Sandbox Client — :5001
│       └── src/
│           ├── components/     # Header, ProductGrid, OrdersTab, CartPanel, FeatureSlot
│           └── generated/      # generated .component.jsx files land here
│
├── app/                        # Bonus: JobBoard App
│   ├── server/                 # JobBoard API — :4001 (Express + Prisma + SQLite)
│   │   ├── src/
│   │   │   ├── routes/         # auth, jobs, companies, applications, pipeline
│   │   │   └── middleware/     # JWT auth, role guard, error handler
│   │   └── prisma/
│   │       ├── schema.prisma   # User, Company, Job, Application, Interview, SavedJob
│   │       └── seed.ts         # demo data
│   └── client/                 # JobBoard UI — :5173 (React + TanStack Query + Zustand)
│       └── src/
│           ├── pages/          # Home, JobDetail, Login, Register, Candidate/*, Employer/*
│           ├── hooks/          # useJobs, useApplications, useAuth
│           └── stores/         # authStore, jobStore
│
├── .env.example                # root env template (VITE_AGENT_URL)
├── package.json                # root: concurrently scripts + install:all
├── PRODUCT.md                  # original product/architecture spec
└── LICENSE
```

---

## Deploying to Vercel

> **Important:** The Agent Engine (`agent/`) and Sandbox API (`sandbox/`) **cannot run on Vercel** — they spawn child processes (Codex CLI) and use a local SQLite file. For those, use a persistent Node server (Railway, Render, Fly.io).
>
> The **Studio UI** and **JobBoard Client** are Vite SPAs that deploy to Vercel with zero config.

### Deploy the Studio UI

```bash
cd studio
# Set environment variable in Vercel dashboard:
# VITE_AGENT_URL = https://your-agent-engine.railway.app
vercel --prod
```

Or connect the `studio/` directory as the Vercel project root via the Vercel dashboard.

### Deploy the JobBoard Client

```bash
cd app/client
# Set environment variable in Vercel dashboard:
# VITE_API_URL = https://your-jobboard-api.railway.app
vercel --prod
```

### Deploy the JobBoard API (Railway / Render)

The JobBoard API (`app/server`) uses Prisma with SQLite. It is a standard Node.js/Express app:

```bash
# Build
cd app/server
npm run build        # compiles TypeScript to dist/

# Start (production)
npm start            # node dist/index.js
```

Set these environment variables on your hosting platform:

```
PORT=4001
NODE_ENV=production
DATABASE_URL=file:./prod.db
JWT_ACCESS_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>
CLIENT_URL=https://your-jobboard-client.vercel.app
```

Run migrations before first start:

```bash
npx prisma migrate deploy
npx prisma db seed
```

---

## Environment Variables

### Root / Studio (`studio/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_AGENT_URL` | `http://localhost:4000` | Agent Engine base URL — override for remote deployments |

Copy `.env.example` → `studio/.env.local` if you change the agent port.

### JobBoard API (`app/server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | 4001 | Server port |
| `NODE_ENV` | development | `development` or `production` |
| `DATABASE_URL` | `file:./dev.db` | Prisma SQLite path (or PostgreSQL URL for scale) |
| `JWT_ACCESS_SECRET` | **yes** | Strong random string — change in production |
| `JWT_REFRESH_SECRET` | **yes** | Strong random string — change in production |
| `JWT_ACCESS_EXPIRY` | 15m | Access token TTL |
| `JWT_REFRESH_EXPIRY` | 7d | Refresh token TTL |
| `SMTP_HOST` | smtp.gmail.com | Email host (optional) |
| `SMTP_PORT` | 587 | Email port (optional) |
| `SMTP_USER` | — | Email account (optional) |
| `SMTP_PASS` | — | Email password/app-password (optional) |
| `CLIENT_URL` | `http://localhost:5173` | CORS allowed origin |

---

## Tech Stack

**Workbench Studio**
- React 19 · Vite 8 · Tailwind CSS v4 · Monaco Editor · Server-Sent Events

**Agent Engine**
- Node.js 20 · Express 5 · OpenAI Codex CLI · better-sqlite3 · `concurrently` · `nodemon`

**Sandbox App**
- React 18 · Vite 5 · Tailwind CSS v3 · Express 5 · better-sqlite3 · `import.meta.glob` (dynamic component loading)

**JobBoard App**
- React 18 · Vite 5 · Tailwind CSS v3 · TanStack Query v5 · Zustand · React Hook Form · Zod
- Express 4 · Prisma 5 · SQLite · bcryptjs · JSON Web Tokens · TypeScript

---

## Troubleshooting

**`codex: command not found`**  
Codex CLI is not on your PATH. Run `npm install -g @openai/codex` again, then restart your terminal.

**`Error: Codex is not authenticated`**  
Run `codex login` and complete the browser flow.

**Port already in use**  
Kill the process: `npx kill-port 3000 4000 5000 5001` (install with `npm install -g kill-port`).

**Sandbox iframe shows blank page**  
The Sandbox Client on `:5001` may not have started yet. Wait a few seconds for Vite to compile, then reload the Studio.

**Apply Slice fails with "SQLITE_ERROR"**  
The generated SQL may reference a column that already exists (e.g. you applied the same scenario twice). Click **Reset Sandbox** first.

**Live AI mode times out**  
Codex CLI may be slow on the first call (model warm-up). Wait up to 60 seconds. If it still fails, run `codex login` to refresh the token.

---

## License

MIT — see [`LICENSE`](./LICENSE).

---

*Built solo in 48 hours for the OpenAI × Outskill Builder Hackathon 2026.*
