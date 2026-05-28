import { useState, useRef, useCallback } from 'react';
import { buildSynthesizeURL } from '../lib/api';

/**
 * Four-agent SSE hook.
 *
 * Tracks per-agent state independently:
 *   idle → start → thinking → [output...] → completed | error | skipped
 *
 * Also supports incremental file-ready events so the DiffExplorer can show
 * tabs appearing as each agent finishes.
 */

const INITIAL_AGENT_STATE = {
  database: { status: 'idle', messages: [], files: [], elapsed: null },
  model:    { status: 'idle', messages: [], files: [], elapsed: null },
  api:      { status: 'idle', messages: [], files: [], elapsed: null },
  frontend: { status: 'idle', messages: [], files: [], elapsed: null },
};

export function useSSE() {
  const [steps,       setSteps]       = useState([]);
  const [agentEvents, setAgentEvents] = useState([]);
  const [agentStates, setAgentStates] = useState(INITIAL_AGENT_STATE);
  const [changes,     setChanges]     = useState(null);
  const [isRunning,   setIsRunning]   = useState(false);
  const [error,       setError]       = useState(null);
  const esRef = useRef(null);
  const handledErrorRef = useRef(false);

  const synthesize = useCallback((feature, mode) => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    setSteps([]);
    setAgentEvents([]);
    setAgentStates({ ...INITIAL_AGENT_STATE });
    setChanges(null);
    setError(null);
    setIsRunning(true);
    handledErrorRef.current = false;

    const url = buildSynthesizeURL(feature, mode);
    const es  = new EventSource(url);
    esRef.current = es;

    const ts = () => new Date().toLocaleTimeString('en-US', {
      hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    // ── Step events (legacy compat) ──
    es.addEventListener('step', e => {
      try {
        const data = JSON.parse(e.data);
        setSteps(prev => [...prev, { ...data, timestamp: ts() }]);
      } catch (_) {}
    });

    // ── Agent lifecycle events ──
    es.addEventListener('agent', e => {
      try {
        const data = JSON.parse(e.data);
        const event = { ...data, timestamp: ts() };

        // Append to event log
        setAgentEvents(prev => [...prev, event]);

        // Update per-agent state
        if (data.agentId && data.agentId !== 'coordinator') {
          setAgentStates(prev => {
            const agentState = prev[data.agentId] || { status: 'idle', messages: [], files: [], elapsed: null };
            const updated = { ...agentState };

            if (data.status === 'start' || data.status === 'thinking' || data.status === 'completed' || data.status === 'error' || data.status === 'skipped') {
              updated.status = data.status;
            }

            if (data.status === 'output') {
              updated.status = 'running';
              updated.messages = [...agentState.messages, data.message];
            }

            if (data.files && data.files.length > 0) {
              updated.files = data.files;
            }

            if (data.elapsed) {
              updated.elapsed = data.elapsed;
            }

            return { ...prev, [data.agentId]: updated };
          });
        }

        // Also push into the step log for the ThinkingConsole
        setSteps(prev => [...prev, {
          step: 'AGENT',
          message: event.message,
          agentName: event.agentName,
          agentShortName: event.agentShortName,
          agentColor: event.color,
          agentId: event.agentId,
          status: event.status,
          timestamp: event.timestamp
        }]);
      } catch (_) {}
    });

    // ── Incremental file-ready events ──
    es.addEventListener('file-ready', e => {
      try {
        const data = JSON.parse(e.data);
        // Merge individual file into changes as they arrive
        setChanges(prev => ({
          ...(prev || {}),
          [data.filename]: {
            ...data.change,
            agentId: data.agentId,
            agentName: data.agentName,
            agentColor: data.agentColor,
          }
        }));
      } catch (_) {}
    });

    // ── Pipeline complete ──
    es.addEventListener('complete', e => {
      try {
        const data = JSON.parse(e.data);
        setChanges(data.changes);
      } catch (_) {}
      setIsRunning(false);
      es.close();
      esRef.current = null;
    });

    // ── Agent error ──
    es.addEventListener('agent-error', e => {
      handledErrorRef.current = true;
      try {
        const data = JSON.parse(e.data);
        setError(data.message || 'Generation failed');
      } catch (_) {
        setError('Connection to agent lost');
      }
      setIsRunning(false);
      es.close();
      esRef.current = null;
    });

    // ── Transport error ──
    es.onerror = () => {
      if (handledErrorRef.current) return;
      setError('Agent connection failed. Is the agent running on port 4000?');
      setIsRunning(false);
      es.close();
      esRef.current = null;
    };
  }, []);

  const cancel = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
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
    steps,
    agentEvents,
    agentStates,
    changes,
    isRunning,
    error,
    synthesize,
    cancel,
    reset
  };
}
