/**
 * Single source of truth for agent identity across the Studio frontend.
 * Import from here — never hardcode agent names/colors in components.
 */

export const AGENTS = [
  { id: 'database', name: 'Database Agent', shortName: 'DB',  color: '#00d4ff', order: 0 },
  { id: 'model',    name: 'ORM Agent',      shortName: 'ORM', color: '#10b981', order: 1 },
  { id: 'api',      name: 'API Agent',      shortName: 'API', color: '#f59e0b', order: 2 },
  { id: 'frontend', name: 'Frontend Agent', shortName: 'UI',  color: '#a78bfa', order: 3 },
];

export const AGENT_MAP = Object.fromEntries(AGENTS.map(a => [a.id, a]));

export const AGENT_ORDER = Object.fromEntries(AGENTS.map(a => [a.id, a.order]));

export const INITIAL_AGENT_STATE = Object.fromEntries(
  AGENTS.map(a => [a.id, { status: 'idle', messages: [], files: [], elapsed: null }])
);
