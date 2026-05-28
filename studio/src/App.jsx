import { useState, useRef, useCallback, useEffect } from 'react';
import Sidebar         from './components/Sidebar';
import PromptBar       from './components/PromptBar';
import DiffExplorer    from './components/DiffExplorer';
import SandboxPreview  from './components/SandboxPreview';
import ThinkingConsole from './components/ThinkingConsole';
import { useSSE }      from './hooks/useSSE';
import { applySlice, resetSandbox, getFiles } from './lib/api';

export default function App() {
  const { steps, agentEvents, agentStates, changes, isRunning, error, synthesize, cancel, reset } = useSSE();

  const [feature,     setFeature]     = useState('');
  const [mode,        setMode]        = useState('demo');
  const [activeFile,  setActiveFile]  = useState(null);
  const [applyStatus, setApplyStatus] = useState(null);
  const [files,       setFiles]       = useState({ all: [], generated: [], baseline: [] });
  const sandboxRef = useRef(null);

  const demoIdeas = [
    { label: 'Add Ratings & Reviews', value: 'Add a ratings and reviews system', color: '#00d4ff' },
    { label: 'Add Referral System',   value: 'Add a referral system',            color: '#7c3aed' },
  ];

  function handleSynthesize() {
    if (!feature.trim() || isRunning) return;
    setApplyStatus(null);
    setActiveFile(null);
    synthesize(feature.trim(), mode);
  }

  function handleDemoIdea(value) {
    setFeature(value);
    reset();
    setApplyStatus(null);
    setActiveFile(null);
  }

  async function handleApply() {
    if (!changes) return;
    setApplyStatus('applying');
    try {
      await applySlice(changes);
      setApplyStatus('applied');
      if (sandboxRef.current) sandboxRef.current.src = sandboxRef.current.src;
      const updated = await getFiles();
      setFiles(updated);
    } catch (_) {
      setApplyStatus('error');
    }
  }

  async function handleReset() {
    try {
      await resetSandbox();
      reset();
      setApplyStatus(null);
      setActiveFile(null);
      setFeature('');
      if (sandboxRef.current) sandboxRef.current.src = sandboxRef.current.src;
      const updated = await getFiles();
      setFiles(updated);
    } catch (_) {}
  }

  if (changes && !activeFile) {
    const firstFile = Object.keys(changes)[0];
    if (firstFile) setActiveFile(firstFile);
  }

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      height:        '100vh',
      background:    '#000000',
      color:         '#e2e8f0',
      fontFamily:    "'DM Sans', sans-serif",
      overflow:      'hidden',
    }}>
      <Header onReset={handleReset} isRunning={isRunning} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          demoIdeas={demoIdeas}
          onSelectIdea={handleDemoIdea}
          changes={changes}
          activeFile={activeFile}
          onSelectFile={setActiveFile}
          files={files}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid #1e2d3d' }}>
          <PromptBar
            feature={feature}
            setFeature={setFeature}
            mode={mode}
            setMode={setMode}
            onSynthesize={handleSynthesize}
            isRunning={isRunning}
            onCancel={cancel}
          />
          <DiffExplorer
            changes={changes}
            activeFile={activeFile}
            onSelectFile={setActiveFile}
            onSelectIdea={handleDemoIdea}
          />
        </div>

        <div style={{ width: 500, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: (changes && !isRunning) ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <SandboxPreview
              iframeRef={sandboxRef}
              changes={changes}
              applyStatus={applyStatus}
              onApply={handleApply}
            />
          </div>
          <ThinkingConsole
            steps={steps}
            agentEvents={agentEvents}
            agentStates={agentStates}
            isRunning={isRunning}
            error={error}
            changes={changes}
            isFullHeight={!changes || isRunning}
          />
        </div>
      </div>
    </div>
  );
}

function Header({ onReset, isRunning }) {
  return (
    <header style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '0 20px',
      height:         52,
      background:     '#0d1117',
      borderBottom:   '1px solid #1e2d3d',
      flexShrink:     0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 26, height: 26,
            background:   'linear-gradient(135deg, #00d4ff, #7c3aed)',
            borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13,
          }}>⚡</div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: '0.05em' }}>
            WORKBENCH STUDIO
          </span>
          <span style={{
            fontSize: 10, padding: '2px 7px',
            background:    'rgba(0,212,255,0.08)',
            border:        '1px solid rgba(0,212,255,0.15)',
            borderRadius:  100,
            color:         '#00d4ff',
            fontFamily:    "'JetBrains Mono', monospace",
            letterSpacing: '0.05em',
          }}>v1.2</span>
        </div>
        <AgentStatus />
      </div>

      <button
        onClick={onReset}
        disabled={isRunning}
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        6,
          padding:    '5px 12px',
          background: 'rgba(239,68,68,0.08)',
          border:     '1px solid rgba(239,68,68,0.2)',
          borderRadius: 6,
          color:      '#fca5a5',
          fontSize:   12,
          fontFamily: "'JetBrains Mono', monospace",
          opacity:    isRunning ? 0.5 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        ↺ Reset Sandbox
      </button>
    </header>
  );
}

function AgentStatus() {
  const [connected, setConnected] = useState(null);
  const AGENT_URL = import.meta.env.VITE_AGENT_URL || 'http://localhost:4000';

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`${AGENT_URL}/api/health`);
        if (!cancelled) setConnected(res.ok);
      } catch {
        if (!cancelled) setConnected(false);
      }
    };
    check();
    const interval = setInterval(check, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [AGENT_URL]);

  if (connected === null) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        width: 6, height: 6,
        borderRadius: '50%',
        background: connected ? '#10b981' : '#ef4444',
        boxShadow:  connected ? '0 0 6px #10b981' : '0 0 6px #ef4444',
      }} />
      <span style={{
        fontSize:      10,
        fontFamily:    "'JetBrains Mono', monospace",
        color:         connected ? '#10b981' : '#ef4444',
        letterSpacing: '0.05em',
      }}>
        {connected ? 'AGENT CONNECTED' : 'AGENT OFFLINE'}
      </span>
    </div>
  );
}
