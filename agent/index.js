const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');

const { orchestrate, rerunAgent, getLastRun, slugify } = require('./orchestrator');
const { applyMigration, resetGeneratedTables, resetGeneratedComponents } = require('./applier');
const { snapshotDir, SANDBOX }  = require('./parser');
const { getAgentLayers, enrichChanges, setLayerMapOverrides, getLayerMapOverrides } = require('./layers');
const { getTarget, setTarget, resetTarget, getTargetInfo } = require('./target');

const app  = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const CACHE = path.join(__dirname, 'cache');

// ─── Helpers ────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

function readCacheJSON(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (err) { throw new Error(`Cache file is corrupted: ${path.basename(filePath)}. Delete it and re-run in Live mode.`); }
}

function loadCache(feature) {
  const primarySlug = slugify(feature);
  const exactPath   = path.join(CACHE, `${primarySlug}.json`);
  if (fs.existsSync(exactPath)) return readCacheJSON(exactPath);

  const cacheFiles = fs.readdirSync(CACHE).filter(f => f.endsWith('.json'));
  const needle = primarySlug.replace(/-/g, ' ').split(' ').slice(0, 3).join(' ');
  for (const file of cacheFiles) {
    const cached = readCacheJSON(path.join(CACHE, file));
    if (cached.feature && cached.feature.toLowerCase().includes(needle)) {
      console.log(`[cache] Fuzzy match: "${feature}" → ${file}`);
      return cached;
    }
  }
  throw new Error(
    `No offline cache found for: "${feature}"\n` +
    `Available cache files: ${cacheFiles.join(', ')}\n` +
    `Run in Live AI mode to generate the cache, then switch to Demo mode.`
  );
}

function saveCache(feature, changes) {
  const filePath = path.join(CACHE, `${slugify(feature)}.json`);
  fs.writeFileSync(filePath, JSON.stringify({ feature, generatedAt: new Date().toISOString(), changes }, null, 2));
}

function getGeneratedFiles() {
  return fs.readdirSync(SANDBOX).filter(f =>
    f.endsWith('.migration.sql') ||
    f.endsWith('.model.js')      ||
    f.endsWith('.routes.js')     ||
    f.endsWith('.component.jsx')
  );
}

/** Parse CREATE TABLE names from all generated .migration.sql files in target */
function discoverGeneratedTables() {
  const tables = new Set();
  try {
    const target = getTarget();
    const files  = fs.readdirSync(target).filter(f => f.endsWith('.migration.sql'));
    for (const file of files) {
      const sql = fs.readFileSync(path.join(target, file), 'utf8');
      const matches = [...sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`']?(\w+)["`']?/gi)];
      for (const m of matches) tables.add(m[1]);
    }
  } catch { /* target may not have any migration files */ }
  return [...tables];
}

/** Non-blocking reload of sandbox routes. Returns a warning on failure. */
async function signalSandboxReload() {
  try {
    const res = await fetch('http://localhost:5000/api/reload', { method: 'POST' });
    if (!res.ok) return 'Sandbox reload returned an error — you may need to manually refresh.';
    return null;
  } catch {
    return 'Could not reach sandbox (localhost:5000) — verify it is running.';
  }
}

// ─── SSE endpoint ────────────────────────────────────────────────────────────

/**
 * GET /api/synthesize?feature=...&mode=demo|live
 * Streams per-agent lifecycle events via Server-Sent Events.
 */
app.get('/api/synthesize', async (req, res) => {
  const { feature, mode = 'demo' } = req.query;

  if (!feature || !feature.trim()) {
    return res.status(400).json({ error: 'feature query parameter is required' });
  }

  res.setHeader('Content-Type',      'text/event-stream');
  res.setHeader('Cache-Control',     'no-cache');
  res.setHeader('Connection',        'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const emit = (event, data) => {
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch (_) {}
  };

  // Cancel support — abort when client disconnects
  const ac = new AbortController();
  req.on('close', () => ac.abort());

  try {
    let changes;

    emit('agent', {
      agentId: 'coordinator', agentName: 'Coordinator', agentShortName: 'PLAN',
      color: '#00d4ff', status: 'running',
      message: 'Decomposing feature request into four layer agents'
    });

    if (mode === 'demo') {
      // ── DEMO MODE: simulate four-agent pipeline with cached data ──
      const cached = loadCache(feature);
      changes = enrichChanges(cached.changes);

      const layers = getAgentLayers();
      const filesByLayer = {};
      for (const [filename] of Object.entries(changes)) {
        const layer = layers.find(l => filename.endsWith(l.filePattern));
        if (layer) {
          if (!filesByLayer[layer.id]) filesByLayer[layer.id] = [];
          filesByLayer[layer.id].push(filename);
        }
      }

      for (const layer of layers) {
        if (ac.signal.aborted) break;
        const agentFiles = filesByLayer[layer.id] || [];

        emit('agent', { agentId: layer.id, agentName: layer.name, agentShortName: layer.shortName, color: layer.color, status: 'start',    message: `${layer.name} is initializing...` });
        await sleep(300);
        emit('agent', { agentId: layer.id, agentName: layer.name, agentShortName: layer.shortName, color: layer.color, status: 'thinking', message: `${layer.name} is generating ${layer.description.toLowerCase()}...` });

        for (const line of ['Reading sandbox context', 'Analyzing feature requirements', 'Generating code artifact']) {
          await sleep(250);
          emit('agent', { agentId: layer.id, agentName: layer.name, agentShortName: layer.shortName, color: layer.color, status: 'output', message: line });
        }
        await sleep(400);

        if (agentFiles.length > 0) {
          emit('agent', { agentId: layer.id, agentName: layer.name, agentShortName: layer.shortName, color: layer.color, status: 'completed', files: agentFiles, message: `${layer.name} produced ${agentFiles.length} artifact${agentFiles.length === 1 ? '' : 's'}` });
          for (const filename of agentFiles) {
            emit('file-ready', { filename, agentId: layer.id, agentName: layer.name, agentColor: layer.color, change: changes[filename] });
          }
        } else {
          emit('agent', { agentId: layer.id, agentName: layer.name, agentShortName: layer.shortName, color: layer.color, status: 'skipped', message: `${layer.name} did not receive a matching artifact` });
        }
        await sleep(200);
      }

    } else {
      // ── LIVE MODE: real four-agent Codex CLI pipeline ──

      changes = await orchestrate(feature, async (agentId, event, data) => {
        const layer = getAgentLayers().find(l => l.id === agentId);
        if (!layer) return;

        // Normalize 'complete' → 'completed' for the frontend state machine
        const status = event === 'complete' ? 'completed' : event;

        emit('agent', {
          agentId:        layer.id,
          agentName:      layer.name,
          agentShortName: layer.shortName,
          color:          layer.color,
          status,
          message:        data.message,
          files:          data.files   || [],
          elapsed:        data.elapsed || null,
        });

        // Emit incremental file-ready events so the DiffExplorer tabs appear as each agent finishes
        if (event === 'complete' && data.layerChanges) {
          for (const [filename, change] of Object.entries(data.layerChanges)) {
            emit('file-ready', {
              filename,
              agentId:   layer.id,
              agentName: layer.name,
              agentColor:layer.color,
              change,
            });
          }
        }

        return sleep(30);
      }, ac.signal);

      if (!ac.signal.aborted) {
        try { saveCache(feature, changes); } catch (_) {}
      }
    }

    if (!ac.signal.aborted) {
      emit('agent', {
        agentId: 'coordinator', agentName: 'Coordinator', agentShortName: 'DONE',
        color: '#10b981', status: 'completed',
        message: `All four agents finished — ${Object.keys(changes || {}).length} files generated`
      });
      emit('complete', { changes: changes || {} });
    }

    res.end();

  } catch (err) {
    if (!ac.signal.aborted) {
      emit('agent-error', { message: err.message });
    }
    res.end();
  }
});

// ─── Apply Slice ─────────────────────────────────────────────────────────────

app.post('/api/apply', async (req, res) => {
  const { changes } = req.body;
  if (!changes || typeof changes !== 'object') {
    return res.status(400).json({ error: 'changes object is required' });
  }
  try {
    const result = applyMigration(changes);
    const reloadWarning = await signalSandboxReload();
    res.json({ success: true, ...result, reloadWarning });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Reset Sandbox ───────────────────────────────────────────────────────────

app.post('/api/reset', async (req, res) => {
  try {
    // Discover tables dynamically; fall back to body-provided list then hardcoded defaults
    const discovered = discoverGeneratedTables();
    const { tables: bodyTables = [] } = req.body || {};
    const fallback = ['reviews', 'referrals', 'ratings'];
    const tables   = discovered.length ? discovered : (bodyTables.length ? bodyTables : fallback);

    // Delete generated files with per-file error handling (Windows EBUSY safety)
    const generated = getGeneratedFiles();
    let removed = 0;
    const skipped = [];
    for (const f of generated) {
      try {
        fs.unlinkSync(path.join(SANDBOX, f));
        removed++;
      } catch (e) {
        skipped.push({ file: f, reason: e.message });
      }
    }

    resetGeneratedTables(tables);
    resetGeneratedComponents();

    const reloadWarning = await signalSandboxReload();

    res.json({
      success: true,
      filesRemoved: removed,
      filesSkipped: skipped.length ? skipped : undefined,
      tablesDropped: tables,
      reloadWarning,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Export Slice (E2) ───────────────────────────────────────────────────────

/**
 * GET /api/export?feature=...
 * Returns a downloadable package: unified diff patch + PR description.
 */
app.post('/api/export', (req, res) => {
  const { changes, feature } = req.body;
  if (!changes || typeof changes !== 'object') {
    return res.status(400).json({ error: 'changes object is required' });
  }

  try {
    const slug        = slugify(feature || 'generated-feature');
    const featureLabel = feature || 'Generated Feature';
    const files       = Object.entries(changes);

    // Build unified diff patch
    let patch = `From: Workbench Studio v1.2\nSubject: [PATCH] ${featureLabel}\n\n`;
    let addedTotal = 0;

    for (const [filename, { original, generated }] of files) {
      const origLines = (original || '').split('\n');
      const genLines  = (generated || '').split('\n');
      const added     = genLines.filter(l => l.trim()).length;
      const removed   = origLines.filter(l => l.trim()).length;
      addedTotal     += added;

      patch += `diff --git a/${filename} b/${filename}\n`;
      if (!original) {
        patch += `new file mode 100644\n--- /dev/null\n+++ b/${filename}\n`;
        patch += `@@ -0,0 +1,${genLines.length} @@\n`;
        patch += genLines.map(l => `+${l}`).join('\n') + '\n';
      } else {
        patch += `--- a/${filename}\n+++ b/${filename}\n`;
        patch += `@@ -1,${origLines.length} +1,${genLines.length} @@\n`;
        patch += origLines.map(l => `-${l}`).join('\n') + '\n';
        patch += genLines.map(l => `+${l}`).join('\n') + '\n';
      }
      patch += '\n';
    }

    // Build PR description
    const fileLines = files.map(([f, { agentShortName }]) => `- \`${f}\` *(${agentShortName || 'GEN'})*`).join('\n');
    const prBody =
`# ${featureLabel}

Generated by **Workbench Studio v1.2** — OpenAI × Outskill Hackathon

## What This Adds

${fileLines}

**+${addedTotal} lines** across ${files.length} files — one complete vertical slice.

## How It Was Generated

1. **Database Agent** → SQL migration (additive schema)
2. **ORM Agent** → better-sqlite3 model functions (using migration context)
3. **API Agent** → Express.js JSON routes (using model context)
4. **Frontend Agent** → React component (using routes context)

Each agent ran independently via **OpenAI Codex CLI** and received the upstream agent's output as context.

## Apply

\`\`\`bash
git apply ${slug}.patch
# then run the SQL migration against your database
\`\`\`

---
*Generated with [Workbench Studio](https://github.com/your-repo) — multi-agent NL schema migration tool*
`;

    res.json({ patch, prBody, filename: `${slug}.patch`, prFilename: `${slug}-PR.md` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Agent Retry / Rerun (E4) ────────────────────────────────────────────────

/**
 * POST /api/rerun-agent
 * Body: { agentId, feature?, promptOverride? }
 * Streams SSE for the single re-run agent.
 */
app.get('/api/rerun-agent', async (req, res) => {
  const { agentId, feature } = req.query;
  if (!agentId) return res.status(400).json({ error: 'agentId is required' });

  res.setHeader('Content-Type',      'text/event-stream');
  res.setHeader('Cache-Control',     'no-cache');
  res.setHeader('Connection',        'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const emit = (event, data) => {
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch (_) {}
  };

  const ac = new AbortController();
  req.on('close', () => ac.abort());

  try {
    const layerChanges = await rerunAgent(agentId, feature || null, async (id, event, data) => {
      const layer = getAgentLayers().find(l => l.id === id);
      if (!layer) return;
      const status = event === 'complete' ? 'completed' : event;
      emit('agent', { agentId: layer.id, agentName: layer.name, agentShortName: layer.shortName, color: layer.color, status, message: data.message, files: data.files || [], elapsed: data.elapsed || null });
      if (event === 'complete' && data.layerChanges) {
        for (const [filename, change] of Object.entries(data.layerChanges)) {
          emit('file-ready', { filename, agentId: layer.id, agentName: layer.name, agentColor: layer.color, change });
        }
      }
      return sleep(30);
    }, ac.signal);

    if (!ac.signal.aborted) {
      emit('complete', { changes: layerChanges });
    }
    res.end();
  } catch (err) {
    if (!ac.signal.aborted) emit('agent-error', { message: err.message });
    res.end();
  }
});

// ─── Layer Map (E3) ──────────────────────────────────────────────────────────

app.get('/api/layer-map', (req, res) => {
  res.json({ layers: getAgentLayers(), overrides: getLayerMapOverrides() });
});

app.post('/api/layer-map', (req, res) => {
  try {
    const { overrides } = req.body;
    setLayerMapOverrides(overrides || {});
    res.json({ success: true, layers: getAgentLayers() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Target Management (E1) ──────────────────────────────────────────────────

app.get('/api/target', (req, res) => {
  res.json(getTargetInfo());
});

app.post('/api/target', (req, res) => {
  try {
    const { dir } = req.body;
    if (!dir) return res.status(400).json({ error: 'dir is required' });
    const info = setTarget(dir);
    res.json({ success: true, ...getTargetInfo() });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/target/reset', (req, res) => {
  resetTarget();
  res.json({ success: true, ...getTargetInfo() });
});

// ─── Files + Health ──────────────────────────────────────────────────────────

app.get('/api/files', (req, res) => {
  try {
    const snapshot  = snapshotDir(SANDBOX);
    const generated = getGeneratedFiles();
    res.json({ all: Object.keys(snapshot), generated, baseline: ['schema.sql', 'db.js', 'server.js'] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, mode: 'four-agent', ...getTargetInfo() });
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Agent Engine running at http://localhost:${PORT}`);
  console.log(`Mode: Four-Agent Pipeline (Database → ORM → API → Frontend)`);
  console.log(`Sandbox path: ${SANDBOX}`);
});
