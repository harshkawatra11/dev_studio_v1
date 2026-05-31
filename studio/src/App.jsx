import { useState, useRef, useCallback, useEffect } from 'react';
import Sidebar         from './components/Sidebar';
import PromptBar       from './components/PromptBar';
import DiffExplorer    from './components/DiffExplorer';
import SandboxPreview  from './components/SandboxPreview';
import ThinkingConsole from './components/ThinkingConsole';
import ErrorBoundary   from './components/ErrorBoundary';
import { useSSE }      from './hooks/useSSE';
import { applySlice, resetSandbox, getFiles, getTarget, setTarget, resetTargetAPI } from './lib/api';

export default function App() {
  const {
    steps, agentEvents, agentStates, changes,
    isRunning, error,
    synthesize, retry, rerunAgent, cancel, reset,
  } = useSSE();

  const [feature,      setFeature]      = useState('');
  const [mode,         setMode]         = useState('demo');
  const [activeFile,   setActiveFile]   = useState(null);
  const [applyStatus,  setApplyStatus]  = useState(null); // null | 'applying' | 'applied' | 'error'
  const [applyError,   setApplyError]   = useState(null);
  const [files,        setFiles]        = useState({ all: [], generated: [], baseline: [] });
  const [targetInfo,   setTargetInfo]   = useState(null);
  const sandboxRef = useRef(null);

  const demoIdeas = [
    { label: 'Add Ratings & Reviews', value: 'Add a ratings and reviews system', color: '#00d4ff' },
    { label: 'Add Referral System',   value: 'Add a referral system',            color: '#7c3aed' },
  ];

  // Auto-select first file when changes arrive — only when no file is active
  useEffect(() => {
    if (changes && !activeFile) {
      const firstFile = Object.keys(changes)[0];
      if (firstFile) setActiveFile(firstFile);
    }
  }, [changes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch target info on mount
  useEffect(() => {
    getTarget().then(setTargetInfo).catch(() => {});
  }, []);

  function handleSynthesize() {
    if (!feature.trim() || isRunning) return;
    setApplyStatus(null);
    setApplyError(null);
    setActiveFile(null);
    synthesize(feature.trim(), mode);
  }

  function handleDemoIdea(value) {
    setFeature(value);
    reset();
    setApplyStatus(null);
    setApplyError(null);
    setActiveFile(null);
  }

  async function handleApply() {
    if (!changes) return;
    setApplyStatus('applying');
    setApplyError(null);
    try {
      const result = await applySlice(changes);
      setApplyStatus('applied');
      if (result.reloadWarning) console.warn('[apply]', result.reloadWarning);
      // Reload the sandbox iframe
      if (sandboxRef.current) {
        const src = sandboxRef.current.src;
        sandboxRef.current.src = '';
        setTimeout(() => { if (sandboxRef.current) sandboxRef.current.src = src; }, 100);
      }
      const updated = await getFiles();
      setFiles(updated);
    } catch (err) {
      setApplyStatus('error');
      setApplyError(err.message);
    }
  }

  async function handleReset() {
    try {
      await resetSandbox();
      reset();
      setApplyStatus(null);
      setApplyError(null);
      setActiveFile(null);
      setFeature('');
      if (sandboxRef.current) {
        const src = sandboxRef.current.src;
        sandboxRef.current.src = '';
        setTimeout(() => { if (sandboxRef.current) sandboxRef.current.src = src; }, 100);
      }
      const updated = await getFiles();
      setFiles(updated);
    } catch (err) {
      console.error('[reset]', err.message);
    }
  }

  async function handleSetTarget(dir) {
    try {
      await setTarget(dir);
      const info = await getTarget();
      setTargetInfo(info);
    } catch (err) {
      alert(`Could not connect to folder: ${err.message}`);
    }
  }

  async function handleResetTarget() {
    try {
      await resetTargetAPI();
      const info = await getTarget();
      setTargetInfo(info);
    } catch { /* ignore */ }
  }

  return (
    <ErrorBoundary title="Studio crashed — refresh to recover">
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: '100vh', background: '#000000', color: '#e2e8f0',
        fontFamily: "'DM Sans', sans-serif", overflow: 'hidden',
      }}>
        <Header
          onReset={handleReset}
          isRunning={isRunning}
          targetInfo={targetInfo}
          onSetTarget={handleSetTarget}
          onResetTarget={handleResetTarget}
        />

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
            <ErrorBoundary title="Diff explorer error">
              <DiffExplorer
                changes={changes}
                activeFile={activeFile}
                onSelectFile={setActiveFile}
                onSelectIdea={handleDemoIdea}
              />
            </ErrorBoundary>
          </div>

          <div style={{ width: 500, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {(changes && !isRunning) && (
              <SandboxPreview
                iframeRef={sandboxRef}
                changes={changes}
                applyStatus={applyStatus}
                applyError={applyError}
                onApply={handleApply}
                feature={feature}
              />
            )}
            <ThinkingConsole
              steps={steps}
              agentEvents={agentEvents}
              agentStates={agentStates}
              isRunning={isRunning}
              error={error}
              onRetry={retry}
              onRerunAgent={rerunAgent}
              changes={changes}
              isFullHeight={!changes || isRunning}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function Header({ onReset, isRunning, targetInfo, onSetTarget, onResetTarget }) {
  const [showTargetInput, setShowTargetInput] = useState(false);
  const [targetDir, setTargetDir] = useState('');

  function submitTarget(e) {
    e.preventDefault();
    if (!targetDir.trim()) return;
    onSetTarget(targetDir.trim());
    setTargetDir('');
    setShowTargetInput(false);
  }

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', height: 52,
      background: '#0d1117', borderBottom: '1px solid #1e2d3d', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 26, height: 26,
            background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
            borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
          }}>⚡</div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: '0.05em' }}>
            WORKBENCH STUDIO
          </span>
          <span style={{
            fontSize: 10, padding: '2px 7px',
            background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)',
            borderRadius: 100, color: '#00d4ff', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em',
          }}>v1.2</span>
        </div>
        <AgentStatus />

        {/* Target indicator (E1) */}
        {targetInfo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {targetInfo.isCustom && (
              <div style={{
                fontSize: 10, padding: '2px 8px',
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: 100, color: '#f59e0b',
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em',
              }}>
                ⚠ CUSTOM TARGET: {targetInfo.label}
              </div>
            )}
            {!showTargetInput ? (
              <button
                onClick={() => setShowTargetInput(true)}
                title="Connect a local folder as the target codebase"
                style={{
                  fontSize: 10, padding: '2px 8px',
                  background: 'rgba(0,212,255,0.05)', border: '1px solid #1e2d3d',
                  borderRadius: 100, color: '#64748b',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {targetInfo.isCustom ? '✕ Back to Sandbox' : '📂 Connect Folder'}
              </button>
            ) : (
              <form onSubmit={submitTarget} style={{ display: 'flex', gap: 4 }}>
                <input
                  autoFocus
                  value={targetDir}
                  onChange={e => setTargetDir(e.target.value)}
                  placeholder="C:\path\to\project"
                  style={{
                    padding: '2px 8px', fontSize: 11,
                    background: '#111820', border: '1px solid #2a3f55',
                    borderRadius: 4, color: '#e2e8f0', width: 200,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                />
                <button type="submit" style={{ fontSize: 11, padding: '2px 8px', background: '#1e2d3d', border: '1px solid #2a3f55', borderRadius: 4, color: '#00d4ff' }}>Connect</button>
                <button type="button" onClick={() => { setShowTargetInput(false); if (targetInfo.isCustom) onResetTarget(); }} style={{ fontSize: 11, padding: '2px 8px', background: 'transparent', border: '1px solid #1e2d3d', borderRadius: 4, color: '#64748b' }}>✕</button>
              </form>
            )}
          </div>
        )}
      </div>

      <button
        onClick={onReset}
        disabled={isRunning}
        aria-label="Reset Sandbox"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 6, color: '#fca5a5', fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
          opacity: isRunning ? 0.5 : 1, transition: 'opacity 0.15s',
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }} title={connected ? 'Agent engine is online' : 'Agent engine is offline'}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#10b981' : '#ef4444', boxShadow: connected ? '0 0 6px #10b981' : '0 0 6px #ef4444' }} />
      <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: connected ? '#10b981' : '#ef4444', letterSpacing: '0.05em' }}>
        {connected ? 'AGENT CONNECTED' : 'AGENT OFFLINE'}
      </span>
    </div>
  );
}
