const express                              = require('express');
const cors                                 = require('cors');
const path                                 = require('path');
const fs                                   = require('fs');
const { orchestrate }                      = require('./orchestrator');
const { applyMigration, resetGeneratedTables, resetGeneratedComponents } = require('./applier');
const { snapshotDir, SANDBOX }             = require('./parser');
const { getAgentLayers, enrichChanges, buildAgentEvents } = require('./layers');

const app  = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const CACHE = path.join(__dirname, 'cache');

// ─── Helpers ────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

function slugify(feature) {
  return feature
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function readCacheJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(`Cache file is corrupted: ${path.basename(filePath)}. Delete it and re-run in Live mode.`);
  }
}

function loadCache(feature) {
  const primarySlug = slugify(feature);

  // Exact slug match
  const exactPath = path.join(CACHE, `${primarySlug}.json`);
  if (fs.existsSync(exactPath)) {
    return readCacheJSON(exactPath);
  }

  // Fuzzy fallback — match against `feature` field of any cache file
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
    `Run in Live AI mode first to generate the cache, then switch to Demo mode.`
  );
}

function saveCache(feature, changes) {
  const filePath = path.join(CACHE, `${slugify(feature)}.json`);
  const payload  = { feature, generatedAt: new Date().toISOString(), changes };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function getGeneratedFiles() {
  return fs.readdirSync(SANDBOX).filter(f =>
    f.endsWith('.migration.sql') ||
    f.endsWith('.model.js')      ||
    f.endsWith('.routes.js')     ||
    f.endsWith('.component.jsx')
  );
}

// ─── Endpoints ──────────────────────────────────────────────────────────────

/**
 * GET /api/synthesize?feature=...&mode=demo|live
 * SSE endpoint — streams per-agent lifecycle events.
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

  try {
    let changes;

    // ── Coordinator start ──
    emit('agent', {
      agentId: 'coordinator',
      agentName: 'Coordinator',
      agentShortName: 'PLAN',
      color: '#00d4ff',
      status: 'running',
      message: 'Decomposing feature request into four layer agents'
    });

    if (mode === 'demo') {
      // ── DEMO MODE: simulate four-agent pipeline with cached data ──
      const cached = loadCache(feature);
      changes = enrichChanges(cached.changes);

      const layers = getAgentLayers();
      const filesByLayer = {};

      // Group cached files by layer
      for (const [filename, info] of Object.entries(changes)) {
        const layer = layers.find(l => filename.endsWith(l.filePattern) || filename.includes(l.filePattern));
        if (layer) {
          if (!filesByLayer[layer.id]) filesByLayer[layer.id] = [];
          filesByLayer[layer.id].push(filename);
        }
      }

      // Simulate each agent running sequentially
      for (const layer of layers) {
        const agentFiles = filesByLayer[layer.id] || [];

        // Agent start
        emit('agent', {
          agentId: layer.id,
          agentName: layer.name,
          agentShortName: layer.shortName,
          color: layer.color,
          status: 'start',
          message: `${layer.name} is initializing...`
        });
        await sleep(300);

        // Agent thinking
        emit('agent', {
          agentId: layer.id,
          agentName: layer.name,
          agentShortName: layer.shortName,
          color: layer.color,
          status: 'thinking',
          message: `${layer.name} is generating ${layer.description.toLowerCase()}...`
        });

        // Simulate some Codex output lines
        const thinkingLines = [
          `Reading sandbox context for ${layer.description.toLowerCase()}`,
          `Analyzing feature requirements`,
          `Generating code artifact`,
        ];
        for (const line of thinkingLines) {
          await sleep(250);
          emit('agent', {
            agentId: layer.id,
            agentName: layer.name,
            agentShortName: layer.shortName,
            color: layer.color,
            status: 'output',
            message: line
          });
        }

        await sleep(400);

        // Agent complete — emit the files this agent produced
        if (agentFiles.length > 0) {
          emit('agent', {
            agentId: layer.id,
            agentName: layer.name,
            agentShortName: layer.shortName,
            color: layer.color,
            status: 'completed',
            files: agentFiles,
            message: `${layer.name} produced ${agentFiles.length} artifact${agentFiles.length === 1 ? '' : 's'}`
          });

          // Emit incremental file events so frontend can show tabs appearing
          for (const filename of agentFiles) {
            emit('file-ready', {
              filename,
              agentId: layer.id,
              agentName: layer.name,
              agentColor: layer.color,
              change: changes[filename]
            });
          }
        } else {
          emit('agent', {
            agentId: layer.id,
            agentName: layer.name,
            agentShortName: layer.shortName,
            color: layer.color,
            status: 'skipped',
            message: `${layer.name} did not receive a matching artifact`
          });
        }

        await sleep(200);
      }

    } else {
      // ── LIVE MODE: real four-agent Codex CLI pipeline ──

      changes = await orchestrate(feature, async (agentId, event, data) => {
        const layer = getAgentLayers().find(l => l.id === agentId);
        if (!layer) return;

        emit('agent', {
          agentId:        layer.id,
          agentName:      layer.name,
          agentShortName: layer.shortName,
          color:          layer.color,
          status:         event,     // 'start' | 'thinking' | 'output' | 'complete' | 'error'
          message:        data.message,
          files:          data.files || [],
          elapsed:        data.elapsed || null
        });

        // Emit incremental file events when an agent completes
        if (event === 'complete' && data.files && data.files.length > 0) {
          // We need to emit file-ready with the change data but we don't have
          // it here yet — the orchestrator will return the full changes. Instead,
          // we let the complete event carry the file list.
        }

        return sleep(30);
      });

      // Save to cache for future demo mode runs
      try { saveCache(feature, changes); } catch (_) {}
    }

    // ── Coordinator complete ──
    emit('agent', {
      agentId: 'coordinator',
      agentName: 'Coordinator',
      agentShortName: 'DONE',
      color: '#10b981',
      status: 'completed',
      message: `All four agents finished — ${Object.keys(changes).length} files generated`
    });
    emit('complete', { changes });
    res.end();

  } catch (err) {
    emit('agent-error', { message: err.message });
    res.end();
  }
});

/**
 * POST /api/apply
 * Body: { changes: { ... } }
 */
app.post('/api/apply', (req, res) => {
  const { changes } = req.body;

  if (!changes || typeof changes !== 'object') {
    return res.status(400).json({ error: 'changes object is required' });
  }

  try {
    const result = applyMigration(changes);

    // Signal sandbox to mount newly-written route files (non-blocking).
    fetch('http://localhost:5000/api/reload', { method: 'POST' }).catch(() => {});

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/reset
 * Body: { tables: ['reviews', 'referrals'] }
 */
app.post('/api/reset', (req, res) => {
  try {
    const { tables = ['reviews', 'referrals', 'ratings'] } = req.body || {};

    const generated = getGeneratedFiles();
    let removed = 0;
    for (const f of generated) {
      fs.unlinkSync(path.join(SANDBOX, f));
      removed++;
    }

    resetGeneratedTables(tables);
    resetGeneratedComponents();

    // Tell the sandbox to drop any cached generated routers.
    fetch('http://localhost:5000/api/reload', { method: 'POST' }).catch(() => {});

    res.json({ success: true, filesRemoved: removed, tablesDropped: tables });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/files
 */
app.get('/api/files', (req, res) => {
  try {
    const snapshot  = snapshotDir(SANDBOX);
    const generated = getGeneratedFiles();
    res.json({
      all:      Object.keys(snapshot),
      generated,
      baseline: ['schema.sql', 'db.js', 'server.js']
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, mode: 'four-agent' });
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Agent Engine running at http://localhost:${PORT}`);
  console.log(`Mode: Four-Agent Pipeline (Database → ORM → API → Frontend)`);
  console.log(`Sandbox path: ${SANDBOX}`);
});
