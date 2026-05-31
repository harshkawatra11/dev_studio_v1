/**
 * layers.js — agent layer definitions, enrichment, and per-agent write-scope guards.
 */

const path = require('path');
const { getTarget } = require('./target');

const AGENT_LAYERS = [
  {
    id:          'database',
    name:        'Database Agent',
    shortName:   'DB',
    filePattern: '.migration.sql',
    color:       '#00d4ff',
    description: 'Designs additive SQLite schema changes',
    writeDir:    null,   // null = root of target (resolved at runtime)
    readGlobs:   ['schema.sql'],
  },
  {
    id:          'model',
    name:        'ORM Agent',
    shortName:   'ORM',
    filePattern: '.model.js',
    color:       '#10b981',
    description: 'Creates better-sqlite3 model functions',
    writeDir:    null,
    readGlobs:   ['db.js'],
  },
  {
    id:          'api',
    name:        'API Agent',
    shortName:   'API',
    filePattern: '.routes.js',
    color:       '#f59e0b',
    description: 'Wires Express JSON routes',
    writeDir:    null,
    readGlobs:   ['server.js'],
  },
  {
    id:          'frontend',
    name:        'Frontend Agent',
    shortName:   'UI',
    filePattern: '.component.jsx',
    color:       '#a78bfa',
    description: 'Builds the React sandbox component',
    writeDir:    'client/src/generated',
    readGlobs:   [],
  },
];

// Runtime layer-map overrides (E3 flagship)
let _layerMapOverrides = {};

const FALLBACK_LAYER = {
  id:          'unknown',
  name:        'Coordinator',
  shortName:   'SYS',
  color:       '#64748b',
  description: 'Coordinates generated artifacts',
};

function getAgentLayers() {
  return AGENT_LAYERS.map(l => ({
    ...l,
    ...(_layerMapOverrides[l.id] || {}),
  }));
}

function setLayerMapOverrides(overrides) {
  _layerMapOverrides = overrides || {};
}

function getLayerMapOverrides() {
  return _layerMapOverrides;
}

function getLayerForFile(filename) {
  const layers = getAgentLayers();
  return layers.find(layer => filename.endsWith(layer.filePattern)) || FALLBACK_LAYER;
}

function enrichChanges(changes = {}) {
  const enriched = {};
  for (const [filename, info] of Object.entries(changes)) {
    const layer = getLayerForFile(filename);
    enriched[filename] = {
      ...info,
      agentId:          layer.id,
      agentName:        layer.name,
      agentShortName:   layer.shortName,
      agentColor:       layer.color,
      layerDescription: layer.description,
    };
  }
  return enriched;
}

/**
 * Check whether a file path is within the declared write scope for an agent.
 * Returns true if allowed, false if blocked.
 */
function isWithinWriteScope(filename, agentId) {
  const layers = getAgentLayers();
  const layer  = layers.find(l => l.id === agentId);
  if (!layer || !layer.writeDir) return true; // null writeDir = root allowed

  const target   = getTarget();
  const writeAbs = path.resolve(target, layer.writeDir);
  const fileAbs  = path.resolve(target, filename);
  return fileAbs.startsWith(writeAbs + path.sep) || fileAbs === writeAbs;
}

function buildAgentEvents(changes = {}) {
  const filesByLayer = new Map();
  for (const filename of Object.keys(changes)) {
    const layer = getLayerForFile(filename);
    if (!filesByLayer.has(layer.id)) filesByLayer.set(layer.id, []);
    filesByLayer.get(layer.id).push(filename);
  }

  return AGENT_LAYERS.map(layer => {
    const files = filesByLayer.get(layer.id) || [];
    return {
      agentId:       layer.id,
      agentName:     layer.name,
      agentShortName:layer.shortName,
      color:         layer.color,
      status:        files.length ? 'completed' : 'skipped',
      files,
      message:       files.length
        ? `${layer.name} produced ${files.length} artifact${files.length === 1 ? '' : 's'}`
        : `${layer.name} did not receive a matching artifact`,
    };
  });
}

module.exports = {
  getAgentLayers,
  setLayerMapOverrides,
  getLayerMapOverrides,
  getLayerForFile,
  enrichChanges,
  isWithinWriteScope,
  buildAgentEvents,
};
