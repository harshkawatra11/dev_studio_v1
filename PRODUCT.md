# Workbench Studio v1.2 — Product & Architecture Document

This is the source of truth for the entire project.

---

## What This Product Is

Workbench Studio v1.2 is a **Natural Language Schema Migration tool** built for the **OpenAI × Outskill Builder Hackathon**.

A developer types a plain-English feature request — for example, "Add a ratings and reviews system" — and the tool automatically generates a full vertical slice across four layers of a real codebase:

1. A SQL database migration
2. A JavaScript ORM model
3. Express.js API routes
4. A React UI component stub

What makes v1.2 different from v1.1 is the **Four-Agent Architecture**. Instead of a single Codex CLI call generating all four files at once, v1.2 decomposes the task into **four independent specialist agents** — one per layer — each spawning its own Codex CLI process. Each downstream agent receives the output of the upstream agent as context, creating a true multi-agent pipeline where each agent is an expert in its own domain.

This is not a chatbot. It is not a single-call code generator. It is a coordinated **multi-agent system** that generates working, multi-layer code changes across an entire codebase from a single natural language prompt.

---

## Why Four Agents — The Architecture Decision

### The Problem With One Agent

In v1.1, a single Codex CLI process received a monolithic prompt asking it to generate four different types of files simultaneously. This had critical weaknesses:

- **No domain expertise.** The single prompt mixed SQL schema design, JavaScript modeling patterns, Express routing conventions, and React component architecture into one instruction set. Codex had to context-switch between four completely different paradigms in a single generation pass.
- **No feedback loop.** The model layer was generated without knowing the exact shape of the migration. The routes layer was generated without knowing what model functions exist. The React component was generated without knowing the route endpoints. Every layer was guessing about the others.
- **Cosmetic multi-agent.** The v1.1 UI showed four agent cards in the pipeline, but they were retroactively labeled after the single Codex call finished — purely decorative.
- **All-or-nothing failure.** If Codex made an error in one layer (e.g., wrong table name in the model), it corrupted all four files because they were generated in one shot with no validation between layers.

### The Four-Agent Solution

v1.2 runs **four independent Codex CLI processes in sequence**. Each agent:

1. Receives a **layer-specific prompt** focused on exactly one file type
2. Gets the **generated output from upstream agents** injected as context
3. Spawns its own `codex exec` process independently
4. Returns only the files matching its layer pattern
5. Streams its own Codex CLI stdout to the Studio in real time

The pipeline runs sequentially: **Database → ORM → API → Frontend**. Each downstream agent knows exactly what was built above it because the code is passed inline.

```
User Prompt: "Add a ratings and reviews system"
         │
         ▼
┌─────────────────┐
│   COORDINATOR   │  Decomposes the request, starts the pipeline
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ DATABASE AGENT  │  Reads: schema.sql
│  (codex exec)   │  Creates: {slug}.migration.sql
└────────┬────────┘
         │  migration SQL passed as context ↓
         ▼
┌─────────────────┐
│   ORM AGENT     │  Reads: db.js + migration SQL from Database Agent
│  (codex exec)   │  Creates: {slug}.model.js
└────────┬────────┘
         │  model code passed as context ↓
         ▼
┌─────────────────┐
│   API AGENT     │  Reads: server.js + model code from ORM Agent
│  (codex exec)   │  Creates: {slug}.routes.js
└────────┬────────┘
         │  routes code passed as context ↓
         ▼
┌─────────────────┐
│ FRONTEND AGENT  │  Reads: routes code from API Agent
│  (codex exec)   │  Creates: client/src/generated/{slug}.component.jsx
└────────┬────────┘
         │
         ▼
   ┌───────────┐
   │ COMPLETE  │  All four files merged, enriched, sent to Studio
   └───────────┘
```

### What This Achieves

- **Real specialization.** Each prompt is 40–60% shorter and completely focused. The Database Agent only thinks about SQL. The Frontend Agent only thinks about React.
- **Contextual accuracy.** The ORM Agent sees the exact table schema that was just created, so model functions match perfectly. The API Agent sees the exact model exports, so route handlers call real functions. The Frontend Agent sees the exact route endpoints, so fetch calls use real URLs.
- **Granular failure.** If the API Agent fails, you know exactly which layer broke. The Database and ORM outputs are preserved. You can fix and retry one agent without re-running the whole pipeline.
- **Real-time transparency.** The Studio UI shows each agent's Codex CLI output streaming independently with true status transitions (init → thinking → streaming → done), not cosmetic labels applied after the fact.

---

## The AI Engine — Codex CLI

**The hackathon explicitly requires Codex CLI.** The agent does not call the OpenAI HTTP API directly. Each of the four layer agents spawns Codex CLI as a local child process.

### How Codex CLI Differs From the API

The OpenAI HTTP API returns code strings. Codex CLI is different — it reads the codebase and writes files directly to disk. This changes the entire orchestration model:

- **API approach:** Agent → OpenAI API → code string → agent writes file
- **Codex CLI approach:** Agent → spawns Codex CLI in sandbox directory → Codex reads existing files and writes new ones → agent detects what changed → sends diffs to Studio

### In the Four-Agent Architecture

Each agent spawns its own independent `codex exec` process:

```
Database Agent  → spawn('node', [codex.js, 'exec', ...]) → writes .migration.sql
ORM Agent       → spawn('node', [codex.js, 'exec', ...]) → writes .model.js
API Agent       → spawn('node', [codex.js, 'exec', ...]) → writes .routes.js
Frontend Agent  → spawn('node', [codex.js, 'exec', ...]) → writes .component.jsx
```

Each process runs with `cwd` set to the sandbox directory. Each reads the existing codebase as context automatically. Each has its own snapshot-before / snapshot-after cycle to detect exactly what file it produced.

### Installation

Codex CLI must be installed globally on the machine running the project:

```bash
npm install -g @openai/codex
```

Verify it is working before any development session:

```bash
codex --version
```

### Flags Used

- `exec` — non-interactive execution mode (v0.133+)
- `--dangerously-bypass-approvals-and-sandbox` — the v0.133 equivalent of legacy `--full-auto`. Required for programmatic use.
- `--skip-git-repo-check` — allows running inside `sandbox/` which is not a git repo
- `-` — reads the prompt from stdin to avoid CLI escaping issues with multi-line content
- The process always runs with `cwd` set to the sandbox directory so Codex CLI automatically reads the existing codebase as context.

---

## The Three Applications

This is a monorepo containing three completely separate Node.js applications that run simultaneously via `concurrently`.

### 1. The Sandbox App — Port 5000

A fake but realistic e-commerce SaaS application that serves as the target codebase. It exists to be extended by Codex CLI. Built with Express.js, better-sqlite3, and a vanilla HTML and JS frontend.

It has three tables: users, products, and orders. It is seeded with realistic product data on startup. This is the "before" state. After Codex CLI runs and the user clicks Apply Slice, the sandbox becomes the "after" state with the new feature live and usable.

### 2. The Agent Engine — Port 4000

A Node.js and Express server that orchestrates the **four-agent pipeline**. It does the following:

1. Receives the feature request from the Studio
2. Runs the Coordinator to decompose the task
3. Spawns four sequential Codex CLI processes — one per layer agent
4. Passes each upstream agent's output as context to the downstream agent
5. Streams every line of every agent's Codex CLI stdout to the frontend via Server-Sent Events
6. Merges all four agents' outputs into a unified changes object
7. Sends those file diffs to the Studio on completion

The Agent Engine never serves HTML. It is a pure JSON and SSE API.

### 3. Workbench Studio — Port 3000

The main user interface. Built with React 18, Vite 5, and TailwindCSS. A dark-mode three-panel developer workspace:

- **Left panel:** file tree of active code layers and pre-built demo scenario buttons
- **Center panel:** Monaco Editor diff viewer showing exactly what each agent created, with before and after views. Tabs appear in pipeline order (DB → ORM → API → UI) with staggered entrance animation as each agent completes.
- **Right panel (top):** iframe showing the live sandbox app at localhost:5000
- **Right panel (bottom):** Agent Pipeline console showing real-time per-agent status with animated progress bars, file count badges, elapsed times, and raw Codex CLI output streamed per agent

---

## The Four Agents — In Detail

### Agent Identity

| Agent | ID | Short | File Pattern | Color | Domain |
|---|---|---|---|---|---|
| Database Agent | `database` | DB | `.migration.sql` | `#00d4ff` | SQL schema design |
| ORM Agent | `model` | ORM | `.model.js` | `#10b981` | better-sqlite3 model functions |
| API Agent | `api` | API | `.routes.js` | `#f59e0b` | Express JSON routes |
| Frontend Agent | `frontend` | UI | `.component.jsx` | `#a78bfa` | React sandbox component |

### Agent Lifecycle

Every agent goes through these states, streamed to the Studio in real time:

```
idle → start → thinking → output (repeating) → completed
                                              → error (halts pipeline)
                                              → skipped (no matching file produced)
```

### Context Passing — The Chain of Knowledge

This is the critical innovation. Each downstream agent receives the literal generated code from the upstream agent as inline context in its prompt:

| Agent | Reads from sandbox | Receives as inline context |
|---|---|---|
| Database Agent | `schema.sql` | — (first in chain) |
| ORM Agent | `db.js` | The migration SQL from Database Agent |
| API Agent | `server.js` | The model code from ORM Agent |
| Frontend Agent | — | The routes code from API Agent |

This means:
- The ORM Agent sees `CREATE TABLE reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, ...)` from the Database Agent, so it writes `db.prepare('INSERT INTO reviews (user_id, ...) VALUES (?, ...)')` with exact column names.
- The API Agent sees `module.exports = { listReviews, createReview, ... }` from the ORM Agent, so it writes `const model = require('./slug.model'); model.listReviews()` with exact function names.
- The Frontend Agent sees `router.get('/', ...)` and `router.post('/', ...)` from the API Agent, so it writes `fetch('/api/slug')` with the exact endpoint pattern.

### Error Handling — Hard Stop on First Failure

If any agent in the pipeline fails (Codex CLI exits non-zero, or no matching file is detected), the pipeline halts immediately:

```
Database Agent ✓ → ORM Agent ✓ → API Agent ✕ FAILED → Frontend Agent ⊘ SKIPPED
```

The error message identifies exactly which agent failed and why. The Studio UI shows the failed agent card in red with the error message. This is a deliberate design choice — continuing with incomplete context would produce garbage downstream.

---

## Tech Stack — Do Not Deviate

| Layer | Technology | Reason |
|---|---|---|
| AI Engine | Codex CLI — @openai/codex (global) | Hackathon requirement |
| Multi-Agent Pipeline | Sequential child processes + context passing | Four independent Codex CLI invocations |
| Studio Frontend | React 18 + Vite 5 | SPA, no SSR needed, fast HMR |
| Styling | TailwindCSS 3 | Utility-first, dark mode, fast |
| Code Diff Display | Monaco Editor (@monaco-editor/react) | VS Code-quality diff view |
| Agent Backend | Node.js 20 + Express 4 | Simple, SSE-friendly |
| Real-time Streaming | Server-Sent Events (SSE) | Native browser EventSource, no extra dependencies |
| Sandbox Database | better-sqlite3 | Synchronous, file-based, no setup |
| File Change Detection | Directory snapshot diff (custom) | Before and after comparison per agent |
| Multi-server Runner | concurrently + nodemon | One command starts all three servers |

---

## Repo Structure

Every file has a designated location. Do not create files outside this structure without strong reason.

```
workbench-studio/
├── sandbox/
│   ├── schema.sql                  — initial DB schema (users, products, orders)
│   ├── db.js                       — better-sqlite3 connection, schema init, seed data
│   ├── server.js                   — Express app with CRUD routes for all tables
│   ├── client/                     — React frontend for the sandbox app (Vite)
│   └── public/
│       └── index.html              — product listing UI in vanilla HTML and JS
│
├── agent/
│   ├── index.js                    — Express server entry point, port 4000, SSE endpoint
│   ├── orchestrator.js             — four-agent sequential pipeline, context passing
│   ├── parser.js                   — snapshots sandbox dir before/after each agent runs
│   ├── applier.js                  — runs SQL migration from the generated .sql file
│   ├── layers.js                   — agent layer definitions, enrichment, event builders
│   ├── agents/
│   │   ├── base-agent.js           — shared class: snapshot → spawn codex → diff → return
│   │   ├── database-agent.js       — Database Agent instance (SQL migration)
│   │   ├── orm-agent.js            — ORM Agent instance (model functions)
│   │   ├── api-agent.js            — API Agent instance (Express routes)
│   │   └── frontend-agent.js       — Frontend Agent instance (React component)
│   ├── prompts/
│   │   ├── feature.prompt.js       — legacy monolithic prompt (preserved, unused)
│   │   └── layer-prompts.js        — four layer-specific prompt builders
│   └── cache/
│       ├── add-a-ratings-and-reviews-system.json  — pre-generated offline response
│       └── add-a-referral-system.json             — pre-generated offline response
│
├── studio/
│   ├── src/
│   │   ├── App.jsx                 — root layout, three-panel structure
│   │   ├── components/
│   │   │   ├── Sidebar.jsx         — file tree and demo idea buttons
│   │   │   ├── DiffExplorer.jsx    — Monaco diff viewer with pipeline-ordered tabs
│   │   │   ├── SandboxPreview.jsx  — iframe wrapper with Apply Slice button
│   │   │   ├── ThinkingConsole.jsx — per-agent pipeline display with real-time states
│   │   │   └── PromptBar.jsx       — feature input and Synthesize button
│   │   ├── hooks/
│   │   │   └── useSSE.js           — EventSource with per-agent state tracking
│   │   └── lib/
│   │       └── api.js              — fetch wrappers for agent API endpoints
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── package.json                    — root scripts using concurrently
├── .env                            — OPENAI_API_KEY (never commit)
├── .gitignore
└── PRODUCT.md                      — this file
```

---

## The Pipeline — Step by Step

This is the core of the product. Every engineer on this project must understand it completely.

### Step 1 — COORDINATE

The Coordinator emits a start event and begins decomposing the feature request into four layer tasks. It creates the slug from the feature name and initializes the context accumulator.

### Step 2 — DATABASE AGENT

The Database Agent reads `schema.sql` from the sandbox and receives the feature request. Its prompt is focused exclusively on SQL schema design:

```
Create exactly ONE file: {slug}.migration.sql
- CREATE TABLE IF NOT EXISTS only
- No DROP, no ALTER, additive only
- INTEGER PRIMARY KEY AUTOINCREMENT
- REFERENCES constraints where appropriate
```

It spawns `codex exec`, snapshots before/after, and returns only files matching `.migration.sql`. The generated SQL content is stored in the context accumulator.

### Step 3 — ORM AGENT

The ORM Agent reads `db.js` and receives the migration SQL from Step 2 as inline context. Its prompt:

```
Create exactly ONE file: {slug}.model.js
- const db = require('./db')
- CRUD functions using db.prepare()
- JOINs to users/products where relevant
- module.exports = { ...functions }
```

The model code is stored in the context accumulator.

### Step 4 — API AGENT

The API Agent reads `server.js` and receives the model code from Step 3. Its prompt:

```
Create exactly ONE file: {slug}.routes.js
- const router = require('express').Router()
- Import the model file
- GET and POST routes minimum
- JSON responses, try/catch error handling
- module.exports = router
```

The routes code is stored in the context accumulator.

### Step 5 — FRONTEND AGENT

The Frontend Agent receives the routes code from Step 4. Its prompt:

```
Create exactly ONE file: client/src/generated/{slug}.component.jsx
- React functional component with useState, useEffect
- fetch('/api/{slug}') for API calls
- List display + creation form
- Inline styles, light theme
- Self-contained, no external imports
```

### Step 6 — MERGE & DELIVER

The orchestrator merges all four agents' changes into a unified `changes` object, enriches each file with agent metadata (id, name, color, shortName), and sends the complete payload to the Studio via the `complete` SSE event.

### Step 7 — APPLY (user-triggered)

When the user clicks Apply Slice in the Studio, the Studio posts to `/api/apply`. The applier locates the generated `.migration.sql` file, runs it against `sandbox.db`, writes all other generated files to disk, and responds with success. The Studio then reloads the sandbox iframe to show the live updated app.

---

## SSE Event Protocol

The `/api/synthesize` endpoint streams events in this exact sequence:

```
event: agent
data: { agentId: "coordinator", status: "running", message: "Decomposing..." }

event: agent
data: { agentId: "database", status: "start", message: "Database Agent is initializing..." }

event: agent
data: { agentId: "database", status: "thinking", message: "Database Agent is generating..." }

event: agent
data: { agentId: "database", status: "output", message: "Reading sandbox context..." }
... (multiple output events with raw Codex CLI lines)

event: agent
data: { agentId: "database", status: "completed", files: ["slug.migration.sql"], elapsed: "2.1" }

event: file-ready
data: { filename: "slug.migration.sql", agentId: "database", agentColor: "#00d4ff", change: {...} }

... (same sequence for model, api, frontend agents)

event: agent
data: { agentId: "coordinator", status: "completed", message: "All four agents finished" }

event: complete
data: { changes: { "slug.migration.sql": {...}, "slug.model.js": {...}, ... } }
```

### Agent Status Values

| Status | Meaning |
|---|---|
| `start` | Agent is initializing, about to build its prompt |
| `thinking` | Codex CLI has been spawned, waiting for output |
| `output` | Raw line from Codex CLI stdout/stderr |
| `completed` | Agent finished, files detected, elapsed time recorded |
| `error` | Agent failed — pipeline halts |
| `skipped` | Agent completed but produced no matching files |

---

## The Layer-Specific Prompts

Each agent has its own prompt builder in `agent/prompts/layer-prompts.js`. The key design principles:

### Prompt Isolation

Each prompt asks Codex to create **exactly one file**. It explicitly states: "Do not create any other files. Do not modify existing files." This prevents Codex from accidentally generating files that belong to another agent.

### Context Injection

Downstream agents receive upstream output as a clearly-labeled section:

```
THE DATABASE MIGRATION THAT WAS JUST CREATED FOR THIS FEATURE:
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ...
);
```

This is not a reference to a file path — it is the literal code inlined into the prompt. This ensures Codex sees the exact content regardless of file system state.

### Sandbox File Reading

Each prompt also reads relevant baseline files from the sandbox:
- Database Agent reads `schema.sql` (existing schema awareness)
- ORM Agent reads `db.js` (connection pattern awareness)
- API Agent reads `server.js` (routing pattern awareness)
- Frontend Agent reads nothing from sandbox (only needs upstream routes)

---

## The BaseAgent Class

`agent/agents/base-agent.js` is the shared engine that all four agents use. It encapsulates:

1. **Codex CLI resolution** — finds the `codex.js` script on disk, bypassing `.cmd` shim issues on Windows
2. **Snapshot before** — reads all sandbox files into a `{ filename: content }` map
3. **Process spawn** — launches `codex exec` with the agent's prompt piped via stdin
4. **Output streaming** — forwards every stdout/stderr line to the `onOutput` callback
5. **Snapshot after** — re-reads sandbox files and diffs against the before snapshot
6. **Layer filtering** — returns only files matching this agent's `filePattern` (e.g., `.migration.sql` for the Database Agent)

Each agent module (`database-agent.js`, `orm-agent.js`, etc.) simply creates a `new BaseAgent(layer, promptBuilder)` instance.

---

## Core Implementation Files

### agent/orchestrator.js

```javascript
const databaseAgent = require('./agents/database-agent');
const ormAgent      = require('./agents/orm-agent');
const apiAgent      = require('./agents/api-agent');
const frontendAgent = require('./agents/frontend-agent');

const AGENTS = [
  { agent: databaseAgent, id: 'database', contextKey: 'migration', extractKey: null },
  { agent: ormAgent,      id: 'model',    contextKey: 'model',     extractKey: 'migration' },
  { agent: apiAgent,      id: 'api',      contextKey: 'routes',    extractKey: 'model' },
  { agent: frontendAgent, id: 'frontend', contextKey: 'component', extractKey: 'routes' },
];

async function orchestrate(feature, onAgent) {
  const context = {};     // accumulates upstream outputs
  const allChanges = {};

  for (const { agent, id, contextKey, extractKey } of AGENTS) {
    await onAgent(id, 'start', { ... });
    await onAgent(id, 'thinking', { ... });

    // Build upstream context for this agent
    const agentContext = {};
    if (extractKey && context[extractKey]) {
      agentContext[extractKey] = context[extractKey];
    }

    // Run the agent
    const layerChanges = await agent.run(feature, slug, agentContext, line => {
      onAgent(id, 'output', { message: line });
    });

    // Store output for downstream agents
    context[contextKey] = extractContent(layerChanges);
    Object.assign(allChanges, layerChanges);

    await onAgent(id, 'complete', { files: Object.keys(layerChanges) });
  }

  return enrichChanges(allChanges);
}
```

### agent/agents/base-agent.js

```javascript
class BaseAgent {
  constructor(layer, buildPrompt) {
    this.layer       = layer;
    this.buildPrompt = buildPrompt;
  }

  async run(feature, slug, context, onOutput) {
    const before  = snapshotDir(SANDBOX);
    const prompt  = this.buildPrompt(feature, slug, context);

    await this._spawnCodex(prompt, onOutput);

    const after      = snapshotDir(SANDBOX);
    const allDiff    = diffSnapshots(before, after);
    const layerOnly  = filterByPattern(allDiff, this.layer.filePattern);

    return layerOnly;
  }
}
```

### agent/agents/database-agent.js (pattern for all four)

```javascript
const BaseAgent             = require('./base-agent');
const { getAgentLayers }    = require('../layers');
const { buildDatabasePrompt } = require('../prompts/layer-prompts');

const layer = getAgentLayers().find(l => l.id === 'database');
module.exports = new BaseAgent(layer, buildDatabasePrompt);
```

### studio/src/hooks/useSSE.js

```javascript
// Tracks per-agent state independently
const INITIAL_AGENT_STATE = {
  database: { status: 'idle', messages: [], files: [], elapsed: null },
  model:    { status: 'idle', messages: [], files: [], elapsed: null },
  api:      { status: 'idle', messages: [], files: [], elapsed: null },
  frontend: { status: 'idle', messages: [], files: [], elapsed: null },
};

export function useSSE() {
  const [agentStates, setAgentStates] = useState(INITIAL_AGENT_STATE);

  // On 'agent' events: update per-agent state machine
  // On 'file-ready' events: incrementally merge files into changes
  // On 'complete' events: set final changes, stop running
}
```

---

## Offline Demo Cache

Cache files remain backward-compatible with the v1.1 format. The structure mirrors exactly what the live orchestrator returns. In demo mode, the agent engine simulates the four-agent pipeline by emitting lifecycle events for each agent with realistic timing, sourced from the cached changes.

```json
{
  "feature": "Add a ratings and reviews system",
  "generatedAt": "2025-05-28T00:00:00.000Z",
  "changes": {
    "add-a-ratings-and-reviews-system.migration.sql": {
      "original": "",
      "generated": "CREATE TABLE IF NOT EXISTS reviews ...",
      "isNew": true
    },
    "add-a-ratings-and-reviews-system.model.js": { ... },
    "add-a-ratings-and-reviews-system.routes.js": { ... },
    "client/src/generated/add-a-ratings-and-reviews-system.component.jsx": { ... }
  }
}
```

In demo mode, each cached file is associated with its agent by file pattern, and the pipeline simulation emits:
1. Agent start → thinking → three simulated output lines → completed
2. A `file-ready` event per file
3. Realistic delays between agents (300ms start, 250ms per output line, 400ms thinking, 200ms between agents)

Generate cache files by running the live pipeline once per demo scenario after the orchestrator is working. Save the `changes` object to the corresponding JSON file. Never rely on live generation during a presentation.

---

## The Thinking Console — Behavior

The ThinkingConsole component now has two sections:

### Agent Pipeline Grid

A 4-column grid showing each agent's real-time state:

- **Idle** (dark background, grey dot) — waiting for its turn
- **Init** (agent color background) — agent is building its prompt
- **Thinking** (agent color, shimmer bar) — Codex CLI is spawned, waiting for output
- **Streaming** (agent color, shimmer bar, output lines in log) — Codex is generating
- **Done** (green dot, elapsed time, file count badge) — agent produced its artifact
- **Failed** (red dot, red background) — agent errored, pipeline halted
- **Skipped** (grey) — agent completed but no file matched

Each agent card also shows:
- A pulsing indicator badge with file count (appears on completion)
- An animated shimmer bar along the bottom edge while active
- Elapsed time in seconds when complete

### Event Log

Below the grid, a scrollable monospace log shows every event with:
- Timestamp
- Agent badge (colored, short name)
- Message content
- Output lines from Codex are visually dimmed to reduce noise

---

## Environment Variables

```
OPENAI_API_KEY=sk-...        — used by Codex CLI for authentication
VITE_AGENT_URL=http://localhost:4000  — agent URL for the Studio (must be prefixed VITE_)
```

Add `.env` to `.gitignore` immediately. Never commit it.

---

## Root package.json Scripts

```json
{
  "name": "workbench-studio",
  "version": "1.2.0",
  "scripts": {
    "dev":            "concurrently \"npm run sandbox\" \"npm run sandbox-client\" \"npm run agent\" \"npm run studio\"",
    "sandbox":        "cd sandbox && node server.js",
    "sandbox-client": "cd sandbox/client && npm run dev",
    "agent":          "cd agent && nodemon index.js",
    "studio":         "cd studio && npm run dev"
  },
  "devDependencies": {
    "concurrently": "^8.2.0",
    "nodemon": "^3.0.0"
  }
}
```

---

## Critical Constraints — Never Violate

**Use Codex CLI, not the OpenAI HTTP API.** Each agent spawns `codex exec` as a child process. The `openai` npm SDK is never used for code generation.

**Always run Codex CLI with `cwd` set to the sandbox directory.** This is how Codex reads the existing codebase as context automatically.

**Always use `--dangerously-bypass-approvals-and-sandbox` flag.** Without it, Codex CLI waits for user approval and hangs the entire pipeline.

**Each agent creates exactly one file.** The prompt explicitly instructs: "Create exactly ONE file. Do not create any other files." This prevents agents from stepping on each other's territory.

**Downstream agents must receive upstream context.** Never run an agent without passing the output of its upstream agent. The ORM Agent without the migration SQL will generate wrong column names. The API Agent without the model code will import nonexistent functions.

**Pipeline halts on first failure.** If any agent errors, stop immediately. Do not attempt to continue with missing context — it produces garbage.

**Never use ALTER TABLE or DROP TABLE in the Database Agent prompt.** All SQL must be additive only.

**Never instruct any agent to modify existing files.** The prompt must explicitly say: "Do not modify any existing files."

**Never use Next.js.** The Studio is React plus Vite only.

**Never use Socket.io.** Real-time communication is Server-Sent Events only.

**Never commit `.env`.** Verify it is in `.gitignore` before the first push.

**The primary demo scenario is always "Add a ratings and reviews system."** The happy path for this exact input must work flawlessly every single time with all four agents completing successfully.

---

## Ports — Fixed

| Application | Port |
|---|---|
| Workbench Studio | 3000 |
| Agent Engine | 4000 |
| Sandbox App (server) | 5000 |
| Sandbox App (client) | 5001 |

The Studio's `vite.config.js` must proxy `/api` requests to `localhost:4000` to avoid CORS issues in development.

---

## Smoke Test Before Every Demo Session

Run these in order. If any step fails, do not present.

1. `npm run dev` from root starts four processes with no errors
2. `localhost:3000` loads the Workbench Studio UI with four agent cards visible in the pipeline
3. `localhost:5000` loads the sandbox e-commerce API with product data
4. Clicking "Add Ratings & Reviews" in the sidebar pre-fills the prompt bar
5. Switching to Demo mode and clicking Synthesize Slice triggers the four-agent pipeline:
   - Database Agent card transitions: idle → init → thinking → done
   - ORM Agent card transitions: idle → init → thinking → done
   - API Agent card transitions: idle → init → thinking → done
   - Frontend Agent card transitions: idle → init → thinking → done
6. Four file tabs appear in the Monaco diff explorer in pipeline order (DB → ORM → API → UI) with staggered entrance animation
7. Each tab shows the correct agent badge (DB / ORM / API / UI) with the agent's color
8. Clicking Apply Slice runs the migration and reloads the sandbox iframe
9. A review can be submitted in the sandbox and persists after page refresh
10. Clicking Reset Sandbox removes all generated files and restores the original state

---

## Future Scope

The current version of Workbench Studio operates on a controlled, pre-configured sandbox application. This is intentional for the hackathon context — it proves the concept cleanly without introducing the complexity of arbitrary real-world codebases. The architecture, however, is deliberately designed to scale beyond this constraint.

The following capabilities represent the natural evolution of this product into a general-purpose multi-agent code generation platform.

### Real Codebase Connectivity

**v1.x (Current):** The tool is hardwired to the local `sandbox/` directory — a fixed Express + SQLite app that exists solely to be a generation target.

**Future:** A developer should be able to point Workbench Studio at any codebase they are actively working in:

- **Local folder connection** — A directory picker allows the user to select any project folder on their machine. The agent engine reads from and writes to this live codebase directly, not a synthetic sandbox.
- **GitHub repository integration** — Workbench Studio connects to a GitHub repo via OAuth, clones it into a managed working directory, runs the four-agent pipeline against it, and presents the output as a pull request diff ready to open. No local setup required.
- **Project type detection** — On connection, the tool scans the target codebase to infer its stack (e.g., Express + Prisma + Next.js, or FastAPI + SQLAlchemy + React), and selects the appropriate set of agent prompt templates automatically.

### Manual Layer Mapping

**v1.x (Current):** The four layers — database, model, API, frontend — are hardwired to specific file patterns (`.migration.sql`, `.model.js`, `.routes.js`, `.component.jsx`) inside the controlled sandbox.

**Future:** In a real codebase, these layers may live anywhere and follow any naming convention. The user should be able to declare the mapping explicitly before running the pipeline:

```
Database Layer  →  /db/migrations/
ORM Layer       →  /src/models/
API Layer       →  /src/routes/
Frontend Layer  →  /src/components/features/
```

Each agent reads and writes only within its declared layer directory. This makes the tool codebase-agnostic — it can target a Django project, a Laravel monolith, a NestJS API, or any other stack by remapping the four slots.

### Per-Agent File Access Control

**v1.x (Current):** Each agent has implicit access to the full sandbox directory via the snapshot mechanism — it reads everything, writes one file, and the diff isolates what changed.

**Future:** In a production codebase with sensitive files, this is unacceptable. Each agent should be granted an explicit, auditable access manifest:

| Agent | Read Access | Write Access |
|---|---|---|
| Database Agent | `/db/schema.sql`, `/db/migrations/` | `/db/migrations/` only |
| ORM Agent | `/db/migrations/`, `/src/models/` | `/src/models/` only |
| API Agent | `/src/models/`, `/src/routes/` | `/src/routes/` only |
| Frontend Agent | `/src/routes/`, `/src/components/` | `/src/components/features/` only |

The user configures this access manifest in the Studio before running a synthesis. The agent engine enforces it — any file write outside the declared write scope is rejected and reported as a constraint violation, not silently allowed. This gives engineering teams confidence that the tool cannot accidentally overwrite production configuration, environment files, or shared utilities.

### What This Unlocks

These three capabilities together transform Workbench Studio from a hackathon demo into a production developer tool:

1. **Any stack, any codebase** — not just the one e-commerce sandbox app
2. **Safe to run in real projects** — file access is bounded and auditable
3. **PR-ready output** — generate against a real repo and ship a review-ready diff, not a local file write

The four-agent pipeline architecture built in v1.2 is the foundation that makes all of this possible. The agents are already independent, already context-aware, already layer-isolated. Connecting them to a real codebase is an infrastructure change, not an architectural one.

---

## Definition of Done

The project is complete when all ten smoke test steps pass from a cold start on a machine that has never run the project before, and each agent card in the pipeline shows real, independent lifecycle transitions — not cosmetic labels applied after a single Codex call.