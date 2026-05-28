import { useEffect, useRef } from 'react';

const STEP_STYLES = {
  SCAN:     { bg: 'rgba(0,212,255,0.08)',   color: '#00d4ff', label: 'SCAN'     },
  GENERATE: { bg: 'rgba(124,58,237,0.08)',  color: '#a78bfa', label: 'GEN'      },
  VALIDATE: { bg: 'rgba(245,158,11,0.08)',  color: '#f59e0b', label: 'VALIDATE' },
  AGENT:    { bg: 'rgba(0,212,255,0.06)',   color: '#00d4ff', label: 'AGENT'    },
  CODEX:    { bg: 'rgba(16,185,129,0.06)',  color: '#6ee7b7', label: 'CODEX'    },
  ERROR:    { bg: 'rgba(239,68,68,0.08)',   color: '#fca5a5', label: 'ERROR'    },
};

const AGENTS = [
  { id: 'database', name: 'Database', shortName: 'DB', color: '#00d4ff' },
  { id: 'model', name: 'ORM', shortName: 'ORM', color: '#10b981' },
  { id: 'api', name: 'API', shortName: 'API', color: '#f59e0b' },
  { id: 'frontend', name: 'Frontend', shortName: 'UI', color: '#a78bfa' },
];

export default function ThinkingConsole({ steps, agentEvents = [], agentStates = {}, isRunning, error, changes, isFullHeight }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [steps]);

  return (
    <div style={{
      flex:          1,
      display:       'flex',
      flexDirection: 'column',
      background:    '#000000',
      overflow:      'hidden',
      borderTop:     isFullHeight ? 'none' : '1px solid #1e2d3d',
      minHeight:     0,
    }}>
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '8px 12px',
        borderBottom:   '1px solid #1e2d3d',
        background:     '#0d1117',
        flexShrink:     0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#64748b', letterSpacing: '0.1em' }}>
            AGENT PIPELINE
          </span>
          {isRunning && <PulsingDot />}
        </div>
        <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#64748b' }}>
          {steps.length} events
        </span>
      </div>

      <AgentPipeline agentStates={agentStates} changes={changes} isRunning={isRunning} />

      <div style={{ flex: 1, overflow: 'auto', padding: '10px 0' }}>
        {steps.length === 0 && !error && (
          <div style={{
            padding:   '20px 12px',
            fontFamily:"'JetBrains Mono', monospace",
            fontSize:  11,
            color:     '#2a3f55',
            fontStyle: 'italic',
          }}>
            Awaiting feature intent...
          </div>
        )}

        {steps.map((step, i) => (
          <ConsoleRow key={i} step={step} />
        ))}

        {isRunning && (
          <div style={{
            padding:    '3px 12px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize:   11,
            color:      '#2a3f55',
          }}>
            <span style={{ animation: 'blink 1s step-end infinite' }}>█</span>
          </div>
        )}

        {!isRunning && changes && !error && (
          <div style={{
            margin:       '6px 8px',
            padding:      '8px 12px',
            background:   'rgba(16,185,129,0.06)',
            border:       '1px solid rgba(16,185,129,0.15)',
            borderRadius: 6,
            fontFamily:   "'JetBrains Mono', monospace",
            fontSize:     11,
            color:        '#10b981',
            animation:    'fadeIn 0.3s ease-out',
          }}>
            ✓ All four agents completed — {Object.keys(changes).length} files generated
          </div>
        )}

        {error && (
          <div style={{
            margin:       '4px 8px',
            padding:      '6px 10px',
            background:   'rgba(239,68,68,0.08)',
            border:       '1px solid rgba(239,68,68,0.15)',
            borderRadius: 5,
            fontFamily:   "'JetBrains Mono', monospace",
            fontSize:     11,
            color:        '#fca5a5',
          }}>
            ✕ {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function ConsoleRow({ step }) {
  const style = STEP_STYLES[step.step] || STEP_STYLES.CODEX;
  const badgeColor = step.agentColor || style.color;

  // Dim output lines so they don't clutter the important status transitions
  const isOutput = step.status === 'output';

  return (
    <div style={{
      display:    'flex',
      alignItems: 'flex-start',
      gap:        8,
      padding:    '3px 12px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize:   11,
      lineHeight: 1.6,
      opacity:    isOutput ? 0.6 : 1,
    }}>
      <span style={{ color: '#2a3f55', flexShrink: 0, paddingTop: 1, minWidth: 64 }}>
        {step.timestamp}
      </span>
      <span style={{
        padding:       '0px 6px',
        borderRadius:  3,
        background:    step.step === 'AGENT' ? `${badgeColor}14` : style.bg,
        color:         badgeColor,
        fontSize:      9,
        fontWeight:    700,
        flexShrink:    0,
        letterSpacing: '0.08em',
        alignSelf:     'flex-start',
        marginTop:     3,
        minWidth:      54,
        textAlign:     'center',
      }}>
        {step.agentShortName || style.label}
      </span>
      <span style={{ color: '#64748b', flex: 1, wordBreak: 'break-all' }}>
        {step.agentName ? `${step.agentName}: ${step.message}` : step.message}
      </span>
    </div>
  );
}

function AgentPipeline({ agentStates, changes, isRunning }) {
  return (
    <div style={{
      display:      'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap:          8,
      padding:      '12px 12px 0',
      background:   '#000000',
      borderBottom: '1px solid #111820',
      flexShrink:   0,
    }}>
      {AGENTS.map((agent, idx) => {
        const state  = agentStates[agent.id] || { status: 'idle' };
        const status = state.status;

        const isActive    = status === 'start' || status === 'thinking' || status === 'running';
        const isDone      = status === 'completed';
        const isSkipped   = status === 'skipped';
        const isError     = status === 'error';
        const isWaiting   = status === 'idle' && isRunning;

        // Status label
        let statusLabel = 'idle';
        if (isWaiting)  statusLabel = 'waiting';
        if (status === 'start')    statusLabel = 'init...';
        if (status === 'thinking') statusLabel = 'thinking';
        if (status === 'running')  statusLabel = 'streaming';
        if (isDone)     statusLabel = state.elapsed ? `done (${state.elapsed}s)` : 'done';
        if (isSkipped)  statusLabel = 'skipped';
        if (isError)    statusLabel = 'failed';

        // Colors
        let dotColor  = '#1e2d3d';
        let textColor = '#64748b';
        let bgColor   = '#060a0f';
        let borderColor = '#1e2d3d';

        if (isWaiting) {
          dotColor = '#1e2d3d';
          textColor = '#2a3f55';
        }
        if (isActive) {
          dotColor    = agent.color;
          textColor   = agent.color;
          bgColor     = `${agent.color}14`;
          borderColor = `${agent.color}44`;
        }
        if (isDone) {
          dotColor    = '#10b981';
          textColor   = agent.color;
          bgColor     = 'rgba(16,185,129,0.06)';
          borderColor = `${agent.color}44`;
        }
        if (isError) {
          dotColor    = '#ef4444';
          textColor   = '#fca5a5';
          bgColor     = 'rgba(239,68,68,0.06)';
          borderColor = 'rgba(239,68,68,0.3)';
        }
        if (isSkipped) {
          dotColor  = '#64748b';
          textColor = '#64748b';
        }

        // Connection line between agents (except last)
        const showConnector = idx < AGENTS.length - 1;

        return (
          <div
            key={agent.id}
            style={{
              padding:      '12px 10px',
              borderRadius: 8,
              background:   bgColor,
              border:       `1px solid ${borderColor}`,
              minWidth:     0,
              position:     'relative',
              transition:   'all 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: dotColor,
                boxShadow: isActive ? `0 0 10px ${agent.color}` : 'none',
                transition: 'all 0.3s ease',
              }} />
              <span style={{
                color:      textColor,
                fontSize:   12,
                fontWeight: 800,
                fontFamily: "'JetBrains Mono', monospace",
                overflow:   'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                transition: 'color 0.3s ease',
              }}>
                {agent.shortName}
              </span>
            </div>
            <div style={{
              color: '#94a3b8',
              fontSize: 11,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {agent.name}
            </div>
            <div style={{
              color: isError ? '#fca5a5' : isDone ? '#10b981' : isActive ? agent.color : '#2a3f55',
              fontSize: 10,
              marginTop: 4,
              fontFamily: "'JetBrains Mono', monospace",
              transition: 'color 0.3s ease',
            }}>
              {statusLabel}
            </div>

            {/* File count badge */}
            {isDone && state.files && state.files.length > 0 && (
              <div style={{
                position:     'absolute',
                top:          -4,
                right:        -4,
                width:        16,
                height:       16,
                borderRadius: '50%',
                background:   '#10b981',
                color:        '#000',
                fontSize:     9,
                fontWeight:   800,
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                fontFamily:   "'JetBrains Mono', monospace",
                animation:    'fadeIn 0.3s ease-out',
              }}>
                {state.files.length}
              </div>
            )}

            {/* Active shimmer bar */}
            {isActive && (
              <div style={{
                position:     'absolute',
                bottom:       0,
                left:         4,
                right:        4,
                height:       2,
                borderRadius: 1,
                background:   `linear-gradient(90deg, transparent, ${agent.color}, transparent)`,
                backgroundSize: '200% 100%',
                animation:    'shimmer 1.5s linear infinite',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PulsingDot() {
  return (
    <span style={{
      display:      'inline-block',
      width:        6,
      height:       6,
      borderRadius: '50%',
      background:   '#00d4ff',
      animation:    'pulse 1.5s infinite',
    }} />
  );
}
