const BASE = import.meta.env.VITE_AGENT_URL || 'http://localhost:4000';

export async function applySlice(changes) {
  const res = await fetch(`${BASE}/api/apply`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ changes })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Apply failed');
  }
  return res.json();
}

export async function resetSandbox(tables = ['reviews', 'referrals', 'ratings']) {
  const res = await fetch(`${BASE}/api/reset`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ tables })
  });
  if (!res.ok) throw new Error('Reset failed');
  return res.json();
}

export async function getFiles() {
  const res = await fetch(`${BASE}/api/files`);
  if (!res.ok) throw new Error('Failed to fetch files');
  return res.json();
}

export function buildSynthesizeURL(feature, mode) {
  const params = new URLSearchParams({ feature, mode });
  return `${BASE}/api/synthesize?${params.toString()}`;
}
