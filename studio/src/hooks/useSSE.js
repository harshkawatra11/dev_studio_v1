import { useState, useRef, useCallback, useEffect } from 'react';
import { buildSynthesizeURL, buildRerunURL } from '../lib/api';
import { INITIAL_AGENT_STATE } from '../lib/agents';

export function useSSE() {
  const [steps,       setSteps]       = useState([]);
  const [agentEvents, setAgentEvents] = useState([]);
  const [agentStates, setAgentStates] = useState(INITIAL_AGENT_STATE);
  const [changes,     setChanges]     = useState(null);
  const [isRunning,   setIsRunning]   = useState(false);
  const [error,       setError]       = useState(null);
  const esRef             = useRef(null);
  const handledErrorRef   = useRef(false);
  const lastFeatureRef    = useRef(null);
  const lastModeRef       = useRef(null);

  // Close EventSource on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
    };
  }, []);

  function _openSSE(url) {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }

    setSteps([]);
    setAgentEvents([]);
    setAgentStates({ ...INITIAL_AGENT_STATE });
    setError(null);
    setIsRunning(true);
    handledErrorRef.current = false;

    const es = new EventSource(url);
    esRef.current = es;

    const AGENT_URL = import.meta.env.VITE_AGENT_URL || 'http://localhost:4000';

    const ts = () => new Date().toLocaleTimeString('en-US', {
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    // Legacy step events
    es.addEventListener('step', e => {
      try {
        const data = JSON.parse(e.data);
        setSteps(prev => [...prev, { ...data, timestamp: ts() }]);
      } catch (err) { console.warn('[SSE] step parse error', err); }
    });

    // Agent lifecycle events
    es.addEventListener('agent', e => {
      try {
        const data  = JSON.parse(e.data);
        const event = { ...data, timestamp: ts() };

        setAgentEvents(prev => [...prev, event]);

        if (data.agentId && data.agentId !== 'coordinator') {
          setAgentStates(prev => {
            const agentState = prev[data.agentId] || { status: 'idle', messages: [], files: [], elapsed: null };
            const updated    = { ...agentState };

            if (['start', 'thinking', 'completed', 'error', 'skipped'].includes(data.status)) {
              updated.status = data.status;
            }
            if (data.status === 'output') {
              updated.status   = 'running';
              updated.messages = [...agentState.messages, data.message];
            }
            if (data.files && data.files.length > 0) updated.files   = data.files;
            if (data.elapsed)                         updated.elapsed = data.elapsed;

            return { ...prev, [data.agentId]: updated };
          });
        }

        setSteps(prev => [...prev, {
          step:           'AGENT',
          message:        event.message,
          agentName:      event.agentName,
          agentShortName: event.agentShortName,
          agentColor:     event.color,
          agentId:        event.agentId,
          status:         event.status,
          timestamp:      event.timestamp,
        }]);
      } catch (err) { console.warn('[SSE] agent parse error', err); }
    });

    // Incremental file-ready events — merge as they arrive
    es.addEventListener('file-ready', e => {
      try {
        const data = JSON.parse(e.data);
        setChanges(prev => ({
          ...(prev || {}),
          [data.filename]: {
            ...data.change,
            agentId:   data.agentId,
            agentName: data.agentName,
            agentColor:data.agentColor,
          }
        }));
      } catch (err) { console.warn('[SSE] file-ready parse error', err); }
    });

    // Pipeline complete — set final changes (overwrites incremental state with authoritative payload)
    es.addEventListener('complete', e => {
      try {
        const data = JSON.parse(e.data);
        setChanges(data.changes || null);
      } catch (err) { console.warn('[SSE] complete parse error', err); }
      setIsRunning(false);
      es.close();
      esRef.current = null;
    });

    // Agent-level error
    es.addEventListener('agent-error', e => {
      handledErrorRef.current = true;
      try {
        const data = JSON.parse(e.data);
        setError(data.message || 'Generation failed');
      } catch {
        setError('Connection to agent lost');
      }
      setIsRunning(false);
      es.close();
      esRef.current = null;
    });

    // Transport error
    es.onerror = () => {
      if (handledErrorRef.current) return;
      setError(`Agent connection failed. Is the agent running at ${AGENT_URL}?`);
      setIsRunning(false);
      es.close();
      esRef.current = null;
    };
  }

  const synthesize = useCallback((feature, mode) => {
    lastFeatureRef.current = feature;
    lastModeRef.current    = mode;
    setChanges(null);
    _openSSE(buildSynthesizeURL(feature, mode));
  }, []);

  const retry = useCallback(() => {
    if (!lastFeatureRef.current) return;
    setChanges(null);
    _openSSE(buildSynthesizeURL(lastFeatureRef.current, lastModeRef.current || 'demo'));
  }, []);

  const rerunAgent = useCallback((agentId) => {
    _openSSE(buildRerunURL(agentId, lastFeatureRef.current));
  }, []);

  const cancel = useCallback(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setSteps([]);
    setAgentEvents([]);
    setAgentStates({ ...INITIAL_AGENT_STATE });
    setChanges(null);
    setError(null);
    setIsRunning(false);
  }, []);

  return {
    steps, agentEvents, agentStates, changes,
    isRunning, error,
    synthesize, retry, rerunAgent, cancel, reset,
  };
}
