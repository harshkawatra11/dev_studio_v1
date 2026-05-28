/**
 * API Agent — generates the Express routes file.
 *
 * Third in the pipeline. Receives the model code from the ORM Agent as context
 * so it knows which functions to import and call.
 */

const BaseAgent          = require('./base-agent');
const { getAgentLayers } = require('../layers');
const { buildAPIPrompt } = require('../prompts/layer-prompts');

const layer = getAgentLayers().find(l => l.id === 'api');

module.exports = new BaseAgent(layer, buildAPIPrompt);
