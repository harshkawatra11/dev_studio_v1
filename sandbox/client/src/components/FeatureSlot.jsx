import React, { useState, useEffect, useCallback } from 'react';

// Vite must see all possible imports at build time to handle dynamic glob imports.
// The pattern below is relative to this file: ../generated/*.component.jsx
const generatedModules = import.meta.glob('../generated/*.component.jsx');

class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding:      16,
          background:   '#fef2f2',
          border:       '1px solid #fecaca',
          borderRadius: 8,
          color:        '#dc2626',
          fontSize:     13,
          fontFamily:   'monospace',
        }}>
          <strong>Component Error:</strong> {this.state.error?.message || 'Unknown error'}
          <div style={{ marginTop: 8, fontSize: 11, color: '#ef4444' }}>
            The generated component has an error. Check the diff explorer for syntax issues.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingSpinner() {
  return (
    <span style={{
      width:           14,
      height:          14,
      border:          '2px solid #e2e8f0',
      borderTopColor:  '#2563eb',
      borderRadius:    '50%',
      display:         'inline-block',
      animation:       'spin 0.6s linear infinite',
      flexShrink:      0,
    }} />
  );
}

function FeatureCard({ feature }) {
  const [Component, setComponent] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadComponent() {
      // Let Vite finish processing the freshly-written file before importing.
      await new Promise(r => setTimeout(r, 2000));
      if (cancelled) return;

      const componentFile = feature.file.replace('.routes.js', '.component.jsx');
      const modulePath    = `../generated/${componentFile}`;
      const loader        = generatedModules[modulePath];

      if (!loader) {
        setError(`Component not found: ${componentFile}`);
        setLoading(false);
        return;
      }

      try {
        const mod = await loader();
        if (!cancelled) {
          setComponent(() => mod.default || Object.values(mod)[0]);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    loadComponent();
    return () => { cancelled = true; };
  }, [feature.file]);

  return (
    <div style={{
      background:   '#fff',
      border:       '1px solid #bfdbfe',
      borderLeft:   '4px solid #2563eb',
      borderRadius: 12,
      marginBottom: 20,
      overflow:     'hidden',
      animation:    'slideIn 0.3s ease-out',
    }}>
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '12px 18px',
        background:     '#eff6ff',
        borderBottom:   '1px solid #bfdbfe',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1e40af' }}>
            {feature.label}
          </span>
          <span style={{
            fontSize:      9,
            padding:       '2px 7px',
            background:    '#dbeafe',
            color:         '#1d4ed8',
            borderRadius:  100,
            fontWeight:    700,
            letterSpacing: '0.06em',
          }}>
            JUST ADDED
          </span>
        </div>
        <code style={{
          fontSize:     11,
          color:        '#64748b',
          background:   '#f8fafc',
          padding:      '3px 8px',
          borderRadius: 5,
          border:       '1px solid #e2e8f0',
        }}>
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
          <div style={{
            padding:      12,
            background:   '#fef2f2',
            border:       '1px solid #fecaca',
            borderRadius: 8,
            color:        '#dc2626',
            fontSize:     12,
            fontFamily:   'monospace',
          }}>
            {error}
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

  const checkFeatures = useCallback(async () => {
    try {
      const data = await fetch('/api/features').then(r => r.json());
      setFeatures(data);
    } catch {
      // API not reachable — silently ignore
    }
  }, []);

  useEffect(() => {
    checkFeatures();
    const interval = setInterval(checkFeatures, 3000);
    return () => clearInterval(interval);
  }, [checkFeatures]);

  if (!features.length) return null;

  return (
    <div style={{ marginBottom: 8 }}>
      {features.map(feature => (
        <FeatureCard key={feature.slug} feature={feature} />
      ))}
    </div>
  );
}
