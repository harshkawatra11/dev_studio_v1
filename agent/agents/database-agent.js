/**
 * Database Agent — generates the SQL migration file.
 *
 * This is the first agent in the pipeline. It receives no upstream context;
 * it reads only the existing schema.sql for awareness of current tables.
 */

const BaseAgent             = require('./base-agent');
const { getAgentLayers }    = require('../layers');
const { buildDatabasePrompt } = require('../prompts/layer-prompts');

const layer = getAgentLayers().find(l => l.id === 'database');

module.exports = new BaseAgent(layer, buildDatabasePrompt);
