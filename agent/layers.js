const AGENT_LAYERS = [
  {
    id: 'database',
    name: 'Database Agent',
    shortName: 'DB',
    filePattern: '.migration.sql',
    color: '#00d4ff',
    description: 'Designs additive SQLite schema changes'
  },
  {
    id: 'model',
    name: 'ORM Agent',
    shortName: 'ORM',
    filePattern: '.model.js',
    color: '#10b981',
    description: 'Creates better-sqlite3 model functions'
  },
  {
    id: 'api',
    name: 'API Agent',
    shortName: 'API',
    filePattern: '.routes.js',
    color: '#f59e0b',
    description: 'Wires Express JSON routes'
  },
  {
    id: 'frontend',
    name: 'Frontend Agent',
    shortName: 'UI',
    filePattern: '.component.jsx',
    color: '#a78bfa',
    description: 'Builds the React sandbox component'
  }
];

const FALLBACK_LAYER = {
  id: 'unknown',
  name: 'Coordinator',
  shortName: 'SYS',
  color: '#64748b',
  description: 'Coordinates generated artifacts'
};

function getLayerForFile(filename) {
  return AGENT_LAYERS.find(layer => filename.endsWith(layer.filePattern)) || FALLBACK_LAYER;
}

function enrichChanges(changes = {}) {
  const enriched = {};

  for (const [filename, info] of Object.entries(changes)) {
    const layer = getLayerForFile(filename);
    enriched[filename] = {
      ...info,
      agentId: layer.id,
      agentName: layer.name,
      agentShortName: layer.shortName,
      agentColor: layer.color,
      layerDescription: layer.description
    };
  }

  return enriched;
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
      agentId: layer.id,
      agentName: layer.name,
      agentShortName: layer.shortName,
      color: layer.color,
      status: files.length ? 'completed' : 'skipped',
      files,
      message: files.length
        ? `${layer.name} produced ${files.length} artifact${files.length === 1 ? '' : 's'}`
        : `${layer.name} did not receive a matching artifact`
    };
  });
}

function getAgentLayers() {
  return AGENT_LAYERS;
}

module.exports = { getAgentLayers, getLayerForFile, enrichChanges, buildAgentEvents };
