# Workbench Studio v1.2 → Final Product Plan

## Context

The MVP (Phases 0–6 from the Architect's Build Guide) is complete and functional:
the four-agent Codex CLI pipeline (Database → ORM → API → Frontend) runs in both
**Demo** (cached) and **Live** (real `codex exec`) modes, streams over SSE, and the
Studio renders a three-panel IDE with Monaco diffs, a live sandbox iframe, and an
agent pipeline console. Apply Slice / Reset Sandbox work for the primary demo.

This plan turns that MVP into a **final, demo-bulletproof product** plus **four flagship
features**. Decisions confirmed with the user:

- **Goal:** demo polish + flagship features. **All focus areas** in scope.
- **Live AI mode must work end-to-end** (Codex CLI installed), with demo cache as fallback.
- **Build all four flagships**, including **Local Folder Connection** — but **additive and opt-in only**. The app **boots with the sandbox hardwired as default**. Local folder is a switchable target that must not remove or weaken the sandbox path until the user confirms it works.

Verified findings are grounded in the actual files (paths/lines below).

---

## Workstream A — Live Pipeline Correctness (highest priority)

The live pipeline runs, but several gaps make it fragile vs. the spec.

1. **Live-mode `file-ready` events are a no-op** — [agent/index.js:234-239](agent/index.js#L234-L239)
   is an empty stub, so in Live mode diff tabs only appear at the end (on `complete`),
   while Demo mode streams them incrementally ([index.js:192-201](agent/index.js#L192-L201)).
   **Fix:** have the orchestrator callback carry the per-agent `changes` for the layer
   that just completed. Change [orchestrator.js:97-101](agent/orchestrator.js#L97-L101) to
   pass `layerChanges` (enriched) in the `complete` event data; then [index.js](agent/index.js)
   emits a `file-ready` per file using that data. Reuse [enrichChanges](agent/layers.js#L48)
   per-file so each file gets `agentColor`/`agentId` like Demo mode.

2. **Error/skip events not enriched in live mode** — the live callback passes the raw
   `event` string and `data.message` only ([index.js:223-232](agent/index.js#L223-L232)).
   `error` halts but the Studio agent card won't get colored/labeled like Demo. **Fix:**
   map `complete`→`completed` and ensure `error`/`skipped` statuses flow with layer
   color/shortName (the layer lookup at [index.js:220](agent/index.js#L220) already exists —
   just include status normalization). Also emit a real `thinking` is already done in
   [orchestrator.js:71](agent/orchestrator.js#L71) ✓.

3. **Zero-file completion should be `skipped`, not `complete`** —
   [orchestrator.js:83-89](agent/orchestrator.js#L83-L89) emits `complete` with empty files.
   **Fix:** emit `skipped` so the Studio state machine ([useSSE.js:76](studio/src/hooks/useSSE.js#L76))
   shows the correct state.

4. **Exit-code `null` silently succeeds** — [base-agent.js:118](agent/agents/base-agent.js#L118)
   treats `code === null` (killed by signal) as success. **Fix:** reject on `null` unless
   we initiated a cancel; surface "Codex was terminated" to the user.

5. **Loose file-pattern matching** — the `.includes()` fallback at
   [base-agent.js:74](agent/agents/base-agent.js#L74) and [index.js:128](agent/index.js#L128)
   can misattribute files (e.g. `x.migration.sql.bak`). **Fix:** use `.endsWith()` only.

6. **Cancel does not kill the Codex child process** — [useSSE.js cancel](studio/src/hooks/useSSE.js#L163)
   only closes the EventSource; the server keeps spawning agents. **Fix:** track the active
   child process in the request scope, add a `req.on('close', ...)` handler in
   [index.js synthesize](agent/index.js#L88) to `proc.kill()` the running agent and abort the loop.

---

## Workstream B — Apply / Reset Robustness

1. **Apply has no transaction** — [applier.js:22-29](agent/applier.js#L22-L29) runs
   `db.exec(migration)` then writes files with no atomicity. **Fix:** wrap migration in a
   `db.transaction()`; only write model/routes/component files **after** the migration
   commits. On any failure, write nothing and return a clear error.

2. **Nested file paths are flattened** — [applier.js:34,42](agent/applier.js#L34-L42) uses
   `path.basename()`, dropping subdirectories. Fine for the flat sandbox, but breaks the
   Local-Folder flagship. **Fix:** preserve the relative path under the target root (only
   `.component.jsx` is special-cased to `client/src/generated/`); guard against `..`
   traversal (write-scope check, see Workstream E).

3. **Reset uses hardcoded table names** — [index.js:295](agent/index.js#L295) and the
   default `['reviews','referrals','ratings']`. **Fix:** discover generated tables by
   parsing `CREATE TABLE` names out of the generated `.migration.sql` files present in the
   target (or persist applied-table names to a small `.workbench-state.json`), then drop those.
   Keep the hardcoded list only as a final fallback.

4. **Windows file-lock on unlink** — [index.js:300](agent/index.js#L300) /
   [applier.js:69](agent/applier.js#L69) `unlinkSync` can throw `EBUSY`. **Fix:** wrap each
   unlink in try/catch, collect failures, report which files could not be removed instead of
   aborting the whole reset.

5. **Fire-and-forget reload** — [index.js:281,308](agent/index.js#L281) ignore failures.
   **Fix:** await the reload, and if the sandbox is unreachable include a `reloadWarning`
   in the response so the Studio can surface "applied, but sandbox didn't refresh."

---

## Workstream C — Studio UI/UX Polish

Files: [studio/src/App.jsx](studio/src/App.jsx), [components/*.jsx](studio/src/components/),
[hooks/useSSE.js](studio/src/hooks/useSSE.js), [index.css](studio/src/index.css).

1. **Error boundary** — add a top-level `ErrorBoundary` wrapping the three panels in
   [App.jsx](studio/src/App.jsx), and a local fallback around the Monaco `DiffEditor`
   ([DiffExplorer.jsx:121-148](studio/src/components/DiffExplorer.jsx#L121-L148)) so a malformed
   `changes` entry can't white-screen the app.

2. **SSE retry + accurate error copy** — add a **Retry** action on error in
   [useSSE.js onerror](studio/src/hooks/useSSE.js#L154); make the message use the configured
   agent URL instead of hardcoded "port 4000" ([useSSE.js:156](studio/src/hooks/useSSE.js#L156)).
   Stop swallowing parse errors silently ([useSSE.js:58,108,125,133,146](studio/src/hooks/useSSE.js#L108))
   — log via `console.warn`.

3. **`activeFile` auto-select bug** — move the inline select at
   [App.jsx:66-69](studio/src/App.jsx#L66-L69) into a proper `useEffect` keyed on `changes`.

4. **Loading states** — spinner for the sandbox iframe while it loads
   ([SandboxPreview.jsx:55-61](studio/src/components/SandboxPreview.jsx#L55-L61)), and a
   skeleton/"loading editor" state while Monaco initializes.

5. **Polish + correctness** — fix the shimmer/blink animation class bindings
   ([PromptBar.jsx:84](studio/src/components/PromptBar.jsx#L84),
   [ThinkingConsole.jsx:84](studio/src/components/ThinkingConsole.jsx#L84)); update stale
   sidebar copy ([Sidebar.jsx:95-96](studio/src/components/Sidebar.jsx#L95-L96)); set
   `sandbox="allow-same-origin allow-scripts"` on the iframe.

6. **Accessibility (light pass)** — `aria-label` on icon buttons and file tabs, make
   clickable file rows keyboard-focusable, visible focus ring. (Full responsive/mobile and
   dark-mode toggle are explicitly **out of scope** — this is a desktop demo tool; note in PR.)

7. **Single source of truth for agent config** — extract the duplicated agent
   name/color maps ([useSSE.js:14-19](studio/src/hooks/useSSE.js#L14), ThinkingConsole, DiffExplorer)
   into one `studio/src/lib/agents.js` constant.

---

## Workstream D — Sandbox App Polish

Files: [sandbox/server.js](sandbox/server.js), [sandbox/db.js](sandbox/db.js),
[sandbox/client/src/components/*](sandbox/client/src/components/).

1. **Loading / empty / error states** for ProductGrid, OrdersTab, UsersTab, Header —
   replace `.catch(() => {})` with visible "Failed to load / Retry" and "No data yet"
   placeholders.
2. **FeatureSlot reliability** — the hardcoded `2000ms` Vite-rebuild wait
   ([FeatureSlot.jsx:65](sandbox/client/src/components/FeatureSlot.jsx#L65)) should become a
   retry-with-backoff loop against the glob map (try a few times, then show a clean error
   with a Retry button instead of a permanent dead card).
3. **Remove dead referral code** from the example component
   ([add-a-ratings-and-reviews-system.component.jsx:86-94,152-159](sandbox/client/src/generated/add-a-ratings-and-reviews-system.component.jsx)).
4. **Cart persistence** — persist cart to `localStorage` ([App.jsx:13](sandbox/client/src/App.jsx#L13))
   so an iframe reload during the demo doesn't empty it; fix toast/CartPanel overlap.
5. **Graceful DB close** on `SIGINT`/`SIGTERM` in [db.js](sandbox/db.js).

---

## Workstream E — Flagship Features

Build all four. **Local Folder is additive and OFF by default** — sandbox stays hardwired.

### E1. Configurable Target Root (foundation for Local Folder) + Local Folder Connection
The entire engine hardcodes the sandbox path: [parser.js:4](agent/parser.js#L4) `SANDBOX`,
imported by [base-agent.js:13](agent/agents/base-agent.js#L13) (spawn `cwd`) and
[applier.js:4](agent/applier.js#L4).

- Introduce `agent/target.js`: `getTarget()` / `setTarget(path)` with **default = the
  existing sandbox path**. Replace direct `SANDBOX` use in `snapshotDir`/`diffSnapshots`
  calls, the spawn `cwd` ([base-agent.js:96](agent/agents/base-agent.js#L96)), and applier
  with `getTarget()`. Keep `SANDBOX` exported so nothing else breaks.
- New endpoints: `POST /api/target` (set/validate an absolute local dir; reject if it
  doesn't exist), `GET /api/target` (returns current target + whether it's the sandbox),
  `POST /api/target/reset` (back to sandbox).
- Studio: a **"Target: Sandbox ▾"** control in the header — default shows `Sandbox
  (built-in)`; "Connect Local Folder…" lets the user paste/enter an absolute path. A clear
  banner indicates when a non-sandbox target is active, with a one-click "Back to Sandbox".
- **Guardrail:** when target ≠ sandbox, Apply must respect per-agent write scope (E3) and
  never auto-run migrations against a real DB without explicit confirm. Until the user signs
  off, the **default boot state is always sandbox** and the iframe still points at :5001.

### E2. PR-Ready Diff Export (self-contained, demo-safe)
- New `agent/export.js` + `GET /api/export?format=patch|zip` that turns the current
  `changes` into (a) a unified diff (`*.patch`, `git apply`-able) and (b) a generated
  `PR.md` (title from feature, file list, +/- counts, description).
- Studio: an **"Export Slice"** button next to Apply in
  [SandboxPreview.jsx](studio/src/components/SandboxPreview.jsx) (or the diff toolbar) that
  downloads the bundle. Reuse `changes` already in `useSSE`.

### E3. Per-Agent Layer Mapping + Write-Scope Guards
- Extend [layers.js](agent/layers.js) layer objects with `readGlobs` / `writeDir`
  (defaults reproduce today's sandbox behavior). Add an in-memory mapping overridable via
  `POST /api/layer-map`.
- Enforce in the applier and in `base-agent` diff filtering: a file written outside the
  agent's `writeDir` is **rejected and reported** as a constraint violation (per spec
  PRODUCT.md "Per-Agent File Access Control"), not silently applied.
- Studio: a collapsible **"Layer Mapping"** panel (in Sidebar) showing the 4 slots →
  directories; editable only when a local folder target is active, read-only for sandbox.

### E4. Agent Retry / Edit-and-Rerun
- Orchestrator: extract the per-agent run into a callable `runSingleAgent(agentId, feature,
  upstreamContext, onAgent)` reusing the existing loop body in
  [orchestrator.js:55-113](agent/orchestrator.js#L55-L113). Persist the last run's
  accumulated `context` (migration/model/routes) in server memory keyed by feature/session.
- New `POST /api/rerun-agent` `{ agentId, feature, promptOverride? }` that re-runs **only**
  that layer with preserved upstream context and (optionally) an edited prompt, re-emitting
  SSE for that one agent and a fresh `file-ready`.
- Studio: on a failed/!completed agent card in
  [ThinkingConsole.jsx](studio/src/components/ThinkingConsole.jsx), show **Retry** and
  **Edit prompt & rerun** actions.

---

## Suggested Sequencing

1. **A** (live correctness) — unblocks reliable Live demo. 
2. **B** (apply/reset) — needed before any real-target work. 
3. **C + D** (polish) — can proceed in parallel. 
4. **E2** (export) and **E4** (retry) — self-contained, low risk. 
5. **E3** (layer mapping/guards) — prerequisite safety for E1. 
6. **E1** (local folder) last — additive, opt-in, sandbox stays default until user confirms.

---

## Verification

**Smoke (must pass cold, per PRODUCT.md §"Smoke Test"):**
- `npm run dev` starts all four servers (Studio :3000, Agent :4000, Sandbox API :5000, Client :5001).
- Demo "Add ratings & reviews": four agent cards transition idle→init→thinking→done, four
  tabs appear staggered in DB→ORM→API→UI order, Apply runs migration + reloads iframe, a
  review persists after refresh, Reset restores original state.

**Workstream A (Live):** with Codex CLI installed, run a novel feature in **Live AI** mode and
confirm tabs now appear **incrementally** (not just at the end), a forced agent failure shows
a red enriched card and halts, and Cancel actually kills the Codex process (check no orphan
`node`/codex process; Task Manager / `Get-Process`).

**Workstream B:** Apply with a deliberately broken migration → no files written, clear error,
DB unchanged. Reset after generating a feature with a non-default table name → that table is
dropped (table discovery works). Reset while sandbox holds a file lock → reports the locked
file, doesn't crash.

**Workstream C/D:** kill the agent server mid-run → Studio shows error + working Retry. Load
Studio with sandbox API down → iframe spinner then graceful message; sandbox tabs show
loading/empty/error states; cart survives an iframe reload.

**Flagships:**
- E2: Export produces a `git apply`-able patch + readable `PR.md`.
- E3: force an agent to write outside its `writeDir` → rejected and reported.
- E4: fail the API agent, hit Retry → only the API agent reruns with DB+ORM context intact.
- E1: app **boots in Sandbox mode by default**; connecting a throwaway local folder runs the
  pipeline against it and writes only within mapped write scopes; "Back to Sandbox" fully
  restores default behavior. Do **not** treat Local Folder as done until the user verifies it.

**Always update** the offline cache (re-run live once per demo scenario, save `changes`) so
Demo mode reflects the final output before presenting.
