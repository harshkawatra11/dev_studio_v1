const BASE = import.meta.env.VITE_AGENT_URL || 'http://localhost:4000';

async function _post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function _get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export const applySlice      = changes        => _post('/api/apply', { changes });
export const resetSandbox    = (tables = [])  => _post('/api/reset', { tables });
export const getFiles        = ()             => _get('/api/files');
export const getHealth       = ()             => _get('/api/health');

// Export (E2)
export const exportSlice     = (changes, feature) => _post('/api/export', { changes, feature });

// Retry / rerun agent (E4) — uses SSE, not JSON
export function buildRerunURL(agentId, feature) {
  const params = new URLSearchParams({ agentId, ...(feature ? { feature } : {}) });
  return `${BASE}/api/rerun-agent?${params.toString()}`;
}

// Target management (E1)
export const getTarget       = ()    => _get('/api/target');
export const setTarget       = dir   => _post('/api/target', { dir });
export const resetTargetAPI  = ()    => _post('/api/target/reset', {});

// Layer map (E3)
export const getLayerMap     = ()         => _get('/api/layer-map');
export const setLayerMap     = overrides  => _post('/api/layer-map', { overrides });

// SSE URL builder
export function buildSynthesizeURL(feature, mode) {
  const params = new URLSearchParams({ feature, mode });
  return `${BASE}/api/synthesize?${params.toString()}`;
}
