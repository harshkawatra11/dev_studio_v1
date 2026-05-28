/**
 * ORM Agent — generates the model file.
 *
 * Second in the pipeline. Receives the migration SQL from the Database Agent
 * as context so it can build model functions that match the new schema.
 */

const BaseAgent          = require('./base-agent');
const { getAgentLayers } = require('../layers');
const { buildORMPrompt } = require('../prompts/layer-prompts');

const layer = getAgentLayers().find(l => l.id === 'model');

module.exports = new BaseAgent(layer, buildORMPrompt);
