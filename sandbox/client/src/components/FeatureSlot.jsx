import React, { useState, useEffect, useCallback, useRef } from 'react';

// Vite must see all possible imports at build time to handle dynamic glob imports.
const generatedModules = import.meta.glob('../generated/*.component.jsx');

class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13, fontFamily: 'monospace' }}>
          <strong>Component Error:</strong> {this.state.error?.message || 'Unknown error'}
          <div style={{ marginTop: 8, fontSize: 11, color: '#ef4444' }}>
            Check the Workbench Studio diff viewer for syntax issues.
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: 8, padding: '3px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingSpinner() {
  return (
    <span style={{
      width: 14, height: 14,
      border: '2px solid #e2e8f0', borderTopColor: '#2563eb',
      borderRadius: '50%', display: 'inline-block',
      animation: 'spin 0.6s linear infinite', flexShrink: 0,
    }} />
  );
}

function FeatureCard({ feature }) {
  const [Component, setComponent] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const retryCount  = useRef(0);
  const maxRetries  = 8;
  const baseDelay   = 500; // ms, doubles each retry

  const load = useCallback(async () => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    const componentFile = feature.file.replace('.routes.js', '.component.jsx');
    const modulePath    = `../generated/${componentFile}`;

    // Retry with exponential backoff — wait for Vite HMR to pick up the new file
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (cancelled) return;

      const loader = generatedModules[modulePath];
      if (loader) {
        try {
          const mod = await loader();
          if (!cancelled) {
            setComponent(() => mod.default || Object.values(mod)[0]);
            setLoading(false);
          }
          return;
        } catch (err) {
          if (!cancelled) {
            setError(err.message);
            setLoading(false);
          }
          return;
        }
      }

      // Module not in glob map yet — wait and retry
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(1.6, attempt); // 500→800→1280→...
        await new Promise(r => setTimeout(r, delay));
      }
    }

    if (!cancelled) {
      setError(`Component file not found after ${maxRetries} retries: ${componentFile}. Reload the page if the file was just applied.`);
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, [feature.file]);

  useEffect(() => {
    const controller = { cancelled: false };
    (async () => {
      await load();
    })();
    return () => { controller.cancelled = true; };
  }, [load]);

  return (
    <div style={{
      background: '#fff', border: '1px solid #bfdbfe', borderLeft: '4px solid #2563eb',
      borderRadius: 12, marginBottom: 20, overflow: 'hidden', animation: 'slideIn 0.3s ease-out',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 18px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1e40af' }}>{feature.label}</span>
          <span style={{ fontSize: 9, padding: '2px 7px', background: '#dbeafe', color: '#1d4ed8', borderRadius: 100, fontWeight: 700, letterSpacing: '0.06em' }}>
            JUST ADDED
          </span>
        </div>
        <code style={{ fontSize: 11, color: '#64748b', background: '#f8fafc', padding: '3px 8px', borderRadius: 5, border: '1px solid #e2e8f0' }}>
          {feature.endpoint}
        </code>
      </div>

      <div style={{ padding: 18 }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
            <LoadingSpinner />
            Mounting generated component...
          </div>
        )}

        {error && (
          <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 12, fontFamily: 'monospace' }}>
            {error}
            <button
              onClick={() => { retryCount.current = 0; load(); }}
              style={{ marginLeft: 10, padding: '2px 8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        )}

        {Component && !loading && !error && (
          <ComponentErrorBoundary>
            <React.Suspense fallback={<LoadingSpinner />}>
              <Component />
            </React.Suspense>
          </ComponentErrorBoundary>
        )}
      </div>
    </div>
  );
}

export default function FeatureSlot() {
  const [features, setFeatures] = useState([]);
  const [loadError, setLoadError] = useState(null);

  const checkFeatures = useCallback(async () => {
    try {
      const res = await fetch('/api/features');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFeatures(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err.message);
    }
  }, []);

  useEffect(() => {
    checkFeatures();
    const interval = setInterval(checkFeatures, 4000);
    return () => clearInterval(interval);
  }, [checkFeatures]);

  if (loadError) {
    return (
      <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        Feature API unavailable: {loadError}
        <button onClick={checkFeatures} style={{ padding: '2px 8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>Retry</button>
      </div>
    );
  }

  if (!features.length) return null;

  return (
    <div style={{ marginBottom: 8 }}>
      {features.map(feature => (
        <FeatureCard key={feature.slug} feature={feature} />
      ))}
    </div>
  );
}
