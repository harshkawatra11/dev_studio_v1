# Workbench Studio v1.2

Natural Language Schema Migration — OpenAI × Outskill Builder Hackathon

## What It Does

Type a plain-English feature request. Workbench Studio generates a complete vertical slice across four layers of a real codebase — SQL migration, ORM model, Express API routes, and a live React UI component — powered by **OpenAI Codex CLI** (spawned locally; this is not the OpenAI HTTP API). One sentence. Four files. Live in seconds.

## Demo

[Insert demo video link here]

## Architecture

Four applications run simultaneously via one `npm run dev`:

| App                | Port  | Stack                                    | Role                                                        |
|--------------------|-------|------------------------------------------|-------------------------------------------------------------|
| Workbench Studio   | 3000  | React 18 + Vite 5 + Tailwind v4 + Monaco | The dark IDE-style cockpit — prompt bar, diff viewer, console, sandbox iframe |
| Agent Engine       | 4000  | Node 20 + Express 4                      | Orchestrates Codex CLI as a child process; streams progress via SSE |
| Sandbox API        | 5000  | Express 5 + better-sqlite3               | The target codebase — products / orders / users + dynamic mount of generated routes |
| Sandbox Client     | 5001  | React 18 + Vite 5 + Tailwind v3          | The light-themed ShopBase app rendered inside the Studio iframe; dynamically imports generated `.component.jsx` files |

The Studio iframe points at `:5001`. The Sandbox Client's Vite dev server proxies all `/api` requests to the Sandbox API on `:5000`. The Agent calls Codex CLI as a subprocess with `cwd` set to `sandbox/` so Codex reads the existing schema as context.

## Prerequisites

- Node.js **v20 or higher** (`node --version`)
- **Codex CLI installed globally** and authenticated:
  ```bash
  npm install -g @openai/codex
  codex --version   # must return a version number
  ```
  Codex CLI manages its own auth — no API key is needed in this project.

## Setup

```bash
git clone <repo-url> dev_studio_v1
cd dev_studio_v1

# Install root + each subapp (the root package only contains the dev runner)
npm install
cd sandbox        && npm install && cd ..
cd sandbox/client && npm install && cd ../..
cd agent          && npm install && cd ..
cd studio         && npm install && cd ..

# Start all four servers
npm run dev
```

Then open **http://localhost:3000** (the Studio). The Sandbox app is visible inside the Studio's right-hand iframe and is also directly reachable at http://localhost:5001.

## Demo Scenarios

Two pre-built scenarios ship as offline cache so a presentation never depends on the network:

- **Add a ratings and reviews system** — generates a `reviews` table, model, REST endpoints, and a star-rating React component
- **Add a referral system** — generates a `referrals` table with code generation, redemption endpoints, and a UI

Both are reachable from the sidebar in Demo mode (no Codex CLI call). Switch the prompt-bar toggle to **Live AI** to invoke Codex CLI against your own feature request.

### What Apply Slice actually does

1. Runs the generated SQL migration against `sandbox/sandbox.db`.
2. Writes the model + routes files into `sandbox/` so Express dynamically mounts them at `/api/<table_name>` and `/api/<feature-slug>`.
3. Writes the React component into `sandbox/client/src/generated/`, which the Sandbox Client's `FeatureSlot` picks up via `import.meta.glob` and renders inside a "JUST ADDED" card.

Reset Sandbox drops the generated tables, deletes the generated files, and unmounts everything.

## Project Structure

```
dev_studio_v1/
├── studio/             # Workbench Studio (React) — :3000
├── agent/              # Agent Engine (Express + Codex CLI orchestrator) — :4000
│   ├── orchestrator.js # spawns `node <codex.js> exec ...` as subprocess
│   ├── parser.js       # before/after directory snapshot diffing
│   ├── applier.js      # runs migrations, writes files to sandbox + sandbox/client
│   ├── prompts/        # feature.prompt.js → Codex instruction
│   └── cache/          # offline cache for demo scenarios
├── sandbox/            # Sandbox API (Express + SQLite) — :5000
│   ├── server.js       # static + dynamic-route dispatcher + /api/features
│   ├── schema.sql      # users, products, orders
│   └── client/         # Sandbox Client (React + Vite) — :5001
│       └── src/
│           ├── components/   # Header, ProductGrid, OrdersTab, UsersTab, CartPanel, FeatureSlot
│           └── generated/    # where Codex-generated .component.jsx files land
├── PRODUCT.md          # original product/architecture spec
└── package.json        # root: concurrently runs all four apps
```

## Tech Stack

React 18 · Vite 5 · TailwindCSS (v4 in Studio, v3 in Sandbox Client) · Monaco Editor · Node.js 20 · Express 4/5 · better-sqlite3 · OpenAI Codex CLI · Server-Sent Events · `concurrently` + `nodemon`

## License

MIT — see [`LICENSE`](./LICENSE).
