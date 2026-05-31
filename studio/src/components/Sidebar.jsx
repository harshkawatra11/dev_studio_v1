import { AGENTS } from '../lib/agents';

export default function Sidebar({ demoIdeas, onSelectIdea, changes, activeFile, onSelectFile, files }) {
  const generatedFiles = changes ? Object.keys(changes) : [];

  return (
    <aside style={{
      width: 240, background: '#0d1117', borderRight: '1px solid #1e2d3d',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
    }}>
      {/* Baseline files */}
      <div style={{ padding: '14px 14px 8px', borderBottom: '1px solid #1e2d3d' }}>
        <div style={{ fontSize: 10, color: '#64748b', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', marginBottom: 10 }}>
          CODEBASE SANDBOX
        </div>
        {['schema.sql', 'db.js', 'server.js', 'public/index.html'].map(f => (
          <FileRow key={f} name={f} isBaseline />
        ))}
      </div>

      {/* Active generated layers */}
      {generatedFiles.length > 0 && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e2d3d', animation: 'slideDown 0.3s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: '#64748b', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>
              ACTIVE CODE LAYERS
            </div>
            <span style={{
              fontSize: 9, padding: '1px 6px',
              background: 'rgba(124,58,237,0.12)', color: '#a78bfa',
              border: '1px solid rgba(124,58,237,0.2)', borderRadius: 3,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {generatedFiles.length} files
            </span>
          </div>
          {generatedFiles.map(f => (
            <FileRow
              key={f} name={f} isGenerated
              isActive={activeFile === f}
              agentColor={changes[f]?.agentColor}
              onClick={() => onSelectFile(f)}
            />
          ))}
        </div>
      )}

      {/* Demo ideas */}
      <div style={{ padding: '10px 14px', marginTop: 'auto' }}>
        <div style={{ fontSize: 10, color: '#64748b', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', marginBottom: 8 }}>
          DEMO IDEAS
        </div>
        {demoIdeas.map(idea => (
          <button
            key={idea.value}
            onClick={() => onSelectIdea(idea.value)}
            aria-label={`Use demo idea: ${idea.label}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '7px 10px', borderRadius: 6,
              background: 'transparent', border: `1px solid ${idea.color}22`,
              color: '#94a3b8', fontSize: 12, textAlign: 'left', marginBottom: 5,
              transition: 'all 0.15s', fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${idea.color}10`; e.currentTarget.style.color = '#e2e8f0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: idea.color, flexShrink: 0 }} />
            {idea.label}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid #1e2d3d', background: '#000000' }}>
        <div style={{ fontSize: 10, color: '#64748b', fontFamily: "'JetBrains Mono', monospace", marginBottom: 3 }}>
          POWERED BY
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>OpenAI Codex CLI</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          {AGENTS.map(a => (
            <span key={a.id} style={{
              fontSize: 9, padding: '1px 5px',
              background: `${a.color}14`, color: a.color,
              border: `1px solid ${a.color}33`, borderRadius: 3,
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
            }}>{a.shortName}</span>
          ))}
        </div>
      </div>
    </aside>
  );
}

function FileRow({ name, isBaseline, isGenerated, isActive, agentColor, onClick }) {
  const ext   = name.split('.').pop();
  const icons = { sql: '🗄', js: '📄', jsx: '⚛', json: '📋', html: '🌐', md: '📝' };
  const icon  = icons[ext] || '📄';
  const color = isActive ? (agentColor || '#00d4ff') : isGenerated ? '#a78bfa' : '#64748b';

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Select file ${name}` : undefined}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px',
        borderRadius: 5, cursor: onClick ? 'pointer' : 'default',
        background: isActive ? `${agentColor || '#00d4ff'}12` : 'transparent',
        border: isActive ? `1px solid ${agentColor || '#00d4ff'}25` : '1px solid transparent',
        marginBottom: 2, transition: 'all 0.1s', outline: 'none',
      }}
      onFocus={e => { if (onClick) e.currentTarget.style.outline = `1px solid ${agentColor || '#00d4ff'}44`; }}
      onBlur={e  => { e.currentTarget.style.outline = 'none'; }}
    >
      <span style={{ fontSize: 11 }}>{icon}</span>
      <span style={{
        fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
        color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
      }}>
        {name}
      </span>
      {isGenerated && (
        <span style={{ fontSize: 9, padding: '1px 5px', background: 'rgba(124,58,237,0.12)', color: '#a78bfa', borderRadius: 3, fontFamily: "'JetBrains Mono', monospace" }}>
          NEW
        </span>
      )}
    </div>
  );
}
