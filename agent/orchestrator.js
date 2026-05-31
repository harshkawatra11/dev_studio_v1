/**
 * orchestrator.js — Four-Agent Sequential Pipeline
 *
 * Each agent independently spawns its own Codex CLI process.
 * Downstream agents receive upstream output as context.
 *
 * Pipeline:  Database → ORM → API → Frontend
 */

const databaseAgent = require('./agents/database-agent');
const ormAgent      = require('./agents/orm-agent');
const apiAgent      = require('./agents/api-agent');
const frontendAgent = require('./agents/frontend-agent');
const { enrichChanges } = require('./layers');

const AGENTS = [
  { agent: databaseAgent, id: 'database', contextKey: 'migration', extractKey: null },
  { agent: ormAgent,      id: 'model',    contextKey: 'model',     extractKey: 'migration' },
  { agent: apiAgent,      id: 'api',      contextKey: 'routes',    extractKey: 'model' },
  { agent: frontendAgent, id: 'frontend', contextKey: 'component', extractKey: 'routes' },
];

// In-memory store for retry/rerun support (E4)
let _lastRun = null;

function slugify(feature) {
  return feature
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function extractContent(changes) {
  const entries = Object.values(changes);
  return entries.length > 0 ? entries[0].generated : '';
}

/**
 * Run a single agent in the pipeline.
 * Returns { enrichedChanges } and mutates context with the agent's output.
 */
async function _runAgent(agentDef, feature, slug, context, onAgent, signal) {
  const { agent, id, contextKey, extractKey } = agentDef;
  const startTime = Date.now();

  if (signal?.aborted) throw Object.assign(new Error('Cancelled'), { cancelled: true });

  await onAgent(id, 'start', { message: `${agent.layer.name} is initializing...` });

  if (signal?.aborted) throw Object.assign(new Error('Cancelled'), { cancelled: true });

  const agentContext = {};
  if (extractKey && context[extractKey]) {
    agentContext[extractKey] = context[extractKey];
  }

  await onAgent(id, 'thinking', {
    message: `${agent.layer.name} is generating ${agent.layer.description.toLowerCase()}...`
  });

  const layerChanges = await agent.run(feature, slug, agentContext, line => {
    onAgent(id, 'output', { message: line });
  }, signal);

  const elapsed    = ((Date.now() - startTime) / 1000).toFixed(1);
  const fileCount  = Object.keys(layerChanges).length;
  const enriched   = enrichChanges(layerChanges);

  if (fileCount === 0) {
    await onAgent(id, 'skipped', {
      message:      `${agent.layer.name} completed but produced no files (${elapsed}s)`,
      files:        [],
      elapsed,
      layerChanges: {}
    });
  } else {
    context[contextKey] = extractContent(layerChanges);
    await onAgent(id, 'complete', {
      message:      `${agent.layer.name} produced ${fileCount} artifact${fileCount === 1 ? '' : 's'} (${elapsed}s)`,
      files:        Object.keys(layerChanges),
      elapsed,
      layerChanges: enriched
    });
  }

  return enriched;
}

/**
 * Run the full four-agent pipeline.
 *
 * @param {string}      feature  — user's feature request
 * @param {Function}    onAgent  — (agentId, event, data) => void
 * @param {AbortSignal} [signal] — cancel token
 * @returns {Promise<Object>} — merged changes from all four agents, enriched with layer metadata
 */
async function orchestrate(feature, onAgent, signal) {
  const slug       = slugify(feature);
  const context    = {};
  const allChanges = {};

  _lastRun = { feature, slug, context, allChanges };

  for (const agentDef of AGENTS) {
    if (signal?.aborted) break;

    try {
      const enriched = await _runAgent(agentDef, feature, slug, context, onAgent, signal);
      Object.assign(allChanges, enriched);
    } catch (err) {
      if (err.cancelled || signal?.aborted) break;

      const elapsed = '0.0';
      await onAgent(agentDef.id, 'error', {
        message: `${agentDef.agent.layer.name} failed: ${err.message}`,
        elapsed
      });
      throw new Error(`Pipeline halted: ${agentDef.agent.layer.name} failed — ${err.message}`);
    }
  }

  const totalFiles = Object.keys(allChanges).length;
  if (totalFiles === 0 && !signal?.aborted) {
    throw new Error('All agents completed but no files were generated. Check Codex CLI output.');
  }

  return allChanges; // already enriched per-layer in _runAgent
}

/**
 * Re-run a single agent, preserving upstream context from the last full run.
 * Used by the E4 retry/edit-and-rerun feature.
 *
 * @param {string}      agentId        — 'database' | 'model' | 'api' | 'frontend'
 * @param {string}      [featureOverride]
 * @param {Function}    onAgent
 * @param {AbortSignal} [signal]
 * @returns {Promise<Object>} — enriched changes from this agent only
 */
async function rerunAgent(agentId, featureOverride, onAgent, signal) {
  if (!_lastRun) throw new Error('No previous run to retry from. Run the full pipeline first.');

  const agentDef = AGENTS.find(a => a.id === agentId);
  if (!agentDef) throw new Error(`Unknown agent: "${agentId}"`);

  const feature = featureOverride || _lastRun.feature;
  const slug    = _lastRun.slug;

  // Build context from the last run, excluding this agent's layer and anything downstream
  const agentIdx = AGENTS.indexOf(agentDef);
  const frozenContext = {};
  for (let i = 0; i < agentIdx; i++) {
    const { contextKey } = AGENTS[i];
    if (_lastRun.context[contextKey]) frozenContext[contextKey] = _lastRun.context[contextKey];
  }

  const context = { ...frozenContext };
  const enriched = await _runAgent(agentDef, feature, slug, context, onAgent, signal);

  // Update last run with the new output
  if (agentDef.contextKey && context[agentDef.contextKey]) {
    _lastRun.context[agentDef.contextKey] = context[agentDef.contextKey];
  }
  Object.assign(_lastRun.allChanges, enriched);

  return enriched;
}

function getLastRun() {
  return _lastRun;
}

module.exports = { orchestrate, rerunAgent, getLastRun, slugify };
