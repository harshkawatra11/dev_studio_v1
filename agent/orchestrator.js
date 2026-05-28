/**
 * orchestrator.js — Four-Agent Sequential Pipeline
 *
 * Replaces the old monolithic single-Codex-call approach with a genuine
 * four-agent system.  Each agent independently spawns its own Codex CLI
 * process, and downstream agents receive upstream output as context.
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

function slugify(feature) {
  return feature
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Extract the generated file content from a layer's changes object.
 * Returns the `generated` field of the first (usually only) file.
 */
function extractContent(changes) {
  const entries = Object.values(changes);
  return entries.length > 0 ? entries[0].generated : '';
}

/**
 * Run the four-agent pipeline.
 *
 * @param {string}   feature  — user's feature request
 * @param {Function} onAgent  — (agentId, event, data) => Promise<void>
 *                               event: 'start' | 'output' | 'complete' | 'error'
 * @returns {Promise<Object>} — merged changes from all four agents, enriched with layer metadata
 */
async function orchestrate(feature, onAgent) {
  const slug      = slugify(feature);
  const context   = {};  // accumulates upstream outputs: { migration: '...', model: '...', routes: '...' }
  const allChanges = {};

  for (const { agent, id, contextKey, extractKey } of AGENTS) {
    const startTime = Date.now();

    // Notify: agent starting
    await onAgent(id, 'start', {
      message: `${agent.layer.name} is initializing...`
    });

    try {
      // Build the upstream context for this agent
      const agentContext = {};
      if (extractKey && context[extractKey]) {
        agentContext[extractKey] = context[extractKey];
      }

      // Notify: agent thinking (Codex is running)
      await onAgent(id, 'thinking', {
        message: `${agent.layer.name} is generating ${agent.layer.description.toLowerCase()}...`
      });

      // Run the agent's Codex CLI invocation
      const layerChanges = await agent.run(feature, slug, agentContext, line => {
        onAgent(id, 'output', { message: line });
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const fileCount = Object.keys(layerChanges).length;

      if (fileCount === 0) {
        // Agent completed but produced no matching files — this is a soft error
        await onAgent(id, 'complete', {
          message: `${agent.layer.name} completed but produced no files (${elapsed}s)`,
          files: [],
          elapsed
        });
      } else {
        // Store the generated content for downstream agents
        context[contextKey] = extractContent(layerChanges);

        // Merge into the master changes object
        Object.assign(allChanges, layerChanges);

        await onAgent(id, 'complete', {
          message: `${agent.layer.name} produced ${fileCount} artifact${fileCount === 1 ? '' : 's'} (${elapsed}s)`,
          files: Object.keys(layerChanges),
          elapsed
        });
      }

    } catch (err) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      await onAgent(id, 'error', {
        message: `${agent.layer.name} failed: ${err.message}`,
        elapsed
      });
      // Hard stop on first failure
      throw new Error(`Pipeline halted: ${agent.layer.name} failed — ${err.message}`);
    }
  }

  const totalFiles = Object.keys(allChanges).length;
  if (totalFiles === 0) {
    throw new Error('All agents completed but no files were generated. Check Codex CLI output.');
  }

  return enrichChanges(allChanges);
}

module.exports = { orchestrate };
