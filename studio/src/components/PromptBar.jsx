export default function PromptBar({ feature, setFeature, mode, setMode, onSynthesize, isRunning, onCancel }) {

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey && !isRunning) {
      e.preventDefault();
      onSynthesize();
    }
  }

  return (
    <div style={{
      padding:      '12px 16px',
      background:   '#0d1117',
      borderBottom: '1px solid #1e2d3d',
      flexShrink:   0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: '#64748b', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em' }}>
          WHAT FEATURE WOULD YOU LIKE TO BUILD?
        </span>
        <ModeToggle mode={mode} setMode={setMode} isRunning={isRunning} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            value={feature}
            onChange={e => setFeature(e.target.value)}
            onKeyDown={handleKey}
            placeholder="e.g. Add a referral system where new users claim a code and receive $15.00 credit..."
            disabled={isRunning}
            style={{
              width:        '100%',
              padding:      '9px 14px',
              paddingRight: feature.length > 0 ? 42 : 14,
              background:   '#111820',
              border:       '1px solid #1e2d3d',
              borderRadius: 8,
              color:        '#e2e8f0',
              fontSize:     13,
              fontFamily:   "'DM Sans', sans-serif",
              transition:   'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = '#00d4ff'}
            onBlur={e  => e.target.style.borderColor = '#1e2d3d'}
          />
          {feature.length > 0 && (
            <div style={{
              position:      'absolute',
              right:         12,
              top:           '50%',
              transform:     'translateY(-50%)',
              fontSize:      10,
              fontFamily:    "'JetBrains Mono', monospace",
              color:         feature.length > 120 ? '#f59e0b' : '#2a3f55',
              pointerEvents: 'none',
            }}>
              {feature.length}
            </div>
          )}
        </div>

        {isRunning ? (
          <button
            onClick={onCancel}
            style={{
              padding:      '9px 18px',
              background:   'rgba(239,68,68,0.1)',
              border:       '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8,
              color:        '#fca5a5',
              fontSize:     13,
              fontWeight:   600,
              whiteSpace:   'nowrap',
              fontFamily:   "'DM Sans', sans-serif",
            }}
          >
            ✕ Cancel
          </button>
        ) : (
          <button
            onClick={onSynthesize}
            disabled={!feature.trim()}
            className={feature.trim() ? 'btn-ready' : ''}
            style={{
              padding:       '9px 18px',
              background:    feature.trim() ? undefined : '#1e2d3d',
              border:        'none',
              borderRadius:  8,
              color:         feature.trim() ? '#000' : '#64748b',
              fontSize:      13,
              fontWeight:    700,
              whiteSpace:    'nowrap',
              fontFamily:    "'DM Sans', sans-serif",
              transition:    'all 0.15s',
            }}
          >
            ▶ Synthesize Slice
          </button>
        )}
      </div>
    </div>
  );
}

function ModeToggle({ mode, setMode, isRunning }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '3px', background: '#111820', borderRadius: 8, border: '1px solid #1e2d3d' }}>
      {['demo', 'live'].map(m => (
        <button
          key={m}
          onClick={() => !isRunning && setMode(m)}
          style={{
            padding:       '3px 10px',
            borderRadius:  6,
            fontSize:      11,
            fontFamily:    "'JetBrains Mono', monospace",
            fontWeight:    600,
            letterSpacing: '0.05em',
            color:         mode === m ? (m === 'demo' ? '#000' : '#fff') : '#64748b',
            background:    mode === m ? (m === 'demo' ? '#10b981' : '#7c3aed') : 'transparent',
            transition:    'all 0.15s',
            opacity:       isRunning ? 0.6 : 1,
          }}
        >
          {m === 'demo' ? '🛡 Demo' : '⚡ Live AI'}
        </button>
      ))}
    </div>
  );
}
