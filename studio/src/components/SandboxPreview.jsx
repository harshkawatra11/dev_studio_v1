import { useState } from 'react';

export default function SandboxPreview({ iframeRef, changes, applyStatus, onApply }) {

  const hasChanges       = changes && Object.keys(changes).length > 0;
  const isApplied        = applyStatus === 'applied';
  const isApplying       = applyStatus === 'applying';
  const [iframeLoaded, setIframeLoaded] = useState(false);

  return (
    <div style={{
      flex:          1,
      display:       'flex',
      flexDirection: 'column',
      overflow:      'hidden',
      minHeight:     0,
    }}>
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '8px 12px',
        background:     '#0d1117',
        borderBottom:   '1px solid #1e2d3d',
        flexShrink:     0,
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

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {!iframeLoaded && (
          <div style={{
            position:       'absolute',
            inset:          0,
            background:     '#000000',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontFamily:     "'JetBrains Mono', monospace",
            fontSize:       11,
            color:          '#2a3f55',
            zIndex:         1,
          }}>
            Loading sandbox...
          </div>
        )}
        <iframe
          ref={iframeRef}
          src="http://localhost:5001"
          onLoad={() => setIframeLoaded(true)}
          style={{ width: '100%', height: '100%', background: '#000000' }}
          title="Sandbox App"
        />
      </div>

      <div style={{
        padding:    '4px 12px',
        background: '#000000',
        borderTop:  '1px solid #1e2d3d',
        display:    'flex',
        alignItems: 'center',
        gap:        6,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 9, color: '#2a3f55', fontFamily: "'JetBrains Mono', monospace" }}>URL</span>
        <span style={{ fontSize: 10, color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>
          http://localhost:5001
        </span>
      </div>

      <div style={{
        padding:    '10px 12px',
        background: '#0d1117',
        borderTop:  '1px solid #1e2d3d',
        flexShrink: 0,
      }}>
        {isApplied ? (
          <AppliedBadge />
        ) : (
          <button
            onClick={onApply}
            disabled={!hasChanges || isApplying}
            style={{
              width:          '100%',
              padding:        '8px',
              background:     hasChanges && !isApplying ? 'linear-gradient(135deg, #7c3aed, #5b21b6)' : '#1e2d3d',
              border:         'none',
              borderRadius:   8,
              color:          hasChanges && !isApplying ? '#fff' : '#64748b',
              fontSize:       12,
              fontWeight:     700,
              fontFamily:     "'DM Sans', sans-serif",
              transition:     'all 0.15s',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            6,
            }}
          >
            {isApplying ? <><Spinner /> Applying Slice...</> : <>▶ Apply Slice to Sandbox</>}
          </button>
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
      width:        '100%',
      padding:      '8px',
      background:   'rgba(16,185,129,0.08)',
      border:       '1px solid rgba(16,185,129,0.2)',
      borderRadius: 8,
      color:        '#10b981',
      fontSize:     12,
      fontWeight:   700,
      fontFamily:   "'DM Sans', sans-serif",
      textAlign:    'center',
    }}>
      ✓ Slice Applied — Sandbox Updated
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      width:          10,
      height:         10,
      border:         '2px solid rgba(255,255,255,0.2)',
      borderTopColor: '#fff',
      borderRadius:   '50%',
      display:        'inline-block',
      animation:      'spin 0.6s linear infinite',
    }} />
  );
}
