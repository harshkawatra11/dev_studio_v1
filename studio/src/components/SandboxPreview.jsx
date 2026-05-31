import { useState } from 'react';
import { exportSlice } from '../lib/api';

export default function SandboxPreview({ iframeRef, changes, applyStatus, applyError, onApply, feature }) {
  const hasChanges  = changes && Object.keys(changes).length > 0;
  const isApplied   = applyStatus === 'applied';
  const isApplying  = applyStatus === 'applying';
  const isApplyErr  = applyStatus === 'error';
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [exporting,    setExporting]    = useState(false);
  const [exportDone,   setExportDone]   = useState(false);

  async function handleExport() {
    if (!changes || exporting) return;
    setExporting(true);
    try {
      const { patch, prBody, filename, prFilename } = await exportSlice(changes, feature);

      // Download patch file
      const blob1 = new Blob([patch], { type: 'text/plain' });
      const a1 = document.createElement('a');
      a1.href = URL.createObjectURL(blob1);
      a1.download = filename;
      a1.click();
      URL.revokeObjectURL(a1.href);

      // Download PR.md file
      const blob2 = new Blob([prBody], { type: 'text/markdown' });
      const a2 = document.createElement('a');
      a2.href = URL.createObjectURL(blob2);
      a2.download = prFilename;
      a2.click();
      URL.revokeObjectURL(a2.href);

      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (err) {
      console.error('[export]', err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', background: '#0d1117', borderBottom: '1px solid #1e2d3d', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#64748b', letterSpacing: '0.08em' }}>
            SANDBOX APP VIEW
          </span>
          <LiveIndicator />
        </div>
        <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#64748b' }}>
          localhost:5001
        </span>
      </div>

      {/* iframe */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {!iframeLoaded && (
          <div style={{
            position: 'absolute', inset: 0, background: '#000000',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2a3f55', zIndex: 1, gap: 12,
          }}>
            <IframeSpinner />
            Loading sandbox...
          </div>
        )}
        <iframe
          ref={iframeRef}
          src="http://localhost:5001"
          onLoad={() => setIframeLoaded(true)}
          sandbox="allow-same-origin allow-scripts allow-forms"
          style={{ width: '100%', height: '100%', background: '#000000' }}
          title="Sandbox App"
        />
      </div>

      {/* URL bar */}
      <div style={{ padding: '4px 12px', background: '#000000', borderTop: '1px solid #1e2d3d', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: '#2a3f55', fontFamily: "'JetBrains Mono', monospace" }}>URL</span>
        <span style={{ fontSize: 10, color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>http://localhost:5001</span>
      </div>

      {/* Action bar */}
      <div style={{ padding: '10px 12px', background: '#0d1117', borderTop: '1px solid #1e2d3d', flexShrink: 0 }}>
        {isApplied ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <AppliedBadge />
            <button
              onClick={handleExport}
              disabled={exporting}
              aria-label="Export slice as patch and PR description"
              style={{
                width: '100%', padding: '7px',
                background: exportDone ? 'rgba(16,185,129,0.08)' : 'rgba(0,212,255,0.06)',
                border: `1px solid ${exportDone ? 'rgba(16,185,129,0.2)' : 'rgba(0,212,255,0.15)'}`,
                borderRadius: 8,
                color: exportDone ? '#10b981' : '#00d4ff',
                fontSize: 11, fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                transition: 'all 0.15s',
              }}
            >
              {exporting ? '⟳ Exporting...' : exportDone ? '✓ Downloaded' : '↓ Export Slice (.patch + PR.md)'}
            </button>
          </div>
        ) : (
          <div>
            <button
              onClick={onApply}
              disabled={!hasChanges || isApplying}
              aria-label="Apply slice to sandbox"
              style={{
                width: '100%', padding: '8px',
                background: hasChanges && !isApplying ? 'linear-gradient(135deg, #7c3aed, #5b21b6)' : '#1e2d3d',
                border: 'none', borderRadius: isApplyErr ? '8px 8px 0 0' : 8,
                color: hasChanges && !isApplying ? '#fff' : '#64748b',
                fontSize: 12, fontWeight: 700,
                fontFamily: "'DM Sans', sans-serif",
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {isApplying ? <><Spinner /> Applying Slice...</> : <>▶ Apply Slice to Sandbox</>}
            </button>
            {isApplyErr && applyError && (
              <div style={{
                padding: '5px 10px', fontSize: 10,
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                borderTop: 'none', borderRadius: '0 0 8px 8px',
                color: '#fca5a5', fontFamily: "'JetBrains Mono', monospace",
              }}>
                {applyError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LiveIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
      <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: '#10b981' }}>LIVE</span>
    </div>
  );
}

function AppliedBadge() {
  return (
    <div style={{
      width: '100%', padding: '8px',
      background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
      borderRadius: 8, color: '#10b981', fontSize: 12, fontWeight: 700,
      fontFamily: "'DM Sans', sans-serif", textAlign: 'center',
    }}>
      ✓ Slice Applied — Sandbox Updated
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 10, height: 10,
      border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff',
      borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite',
    }} />
  );
}

function IframeSpinner() {
  return (
    <span style={{
      width: 16, height: 16,
      border: '2px solid #1e2d3d', borderTopColor: '#00d4ff',
      borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite',
    }} />
  );
}
