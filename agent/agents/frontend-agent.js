/**
 * Frontend Agent — generates the React component file.
 *
 * Fourth and final in the pipeline. Receives the routes code from the API Agent
 * as context so it knows which endpoints to call and what data shapes to expect.
 */

const BaseAgent               = require('./base-agent');
const { getAgentLayers }      = require('../layers');
const { buildFrontendPrompt } = require('../prompts/layer-prompts');

const layer = getAgentLayers().find(l => l.id === 'frontend');

module.exports = new BaseAgent(layer, buildFrontendPrompt);
