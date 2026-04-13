import { useState, useCallback, useRef, useEffect } from 'react';

const RELAY_URL = 'http://localhost:3939';

export type JobStatus = 'idle' | 'connecting' | 'running' | 'done' | 'error';

export interface LogLine {
  time: number;
  text: string;
  stream: 'stdout' | 'stderr' | 'system';
}

export interface RelayState {
  connected: boolean;
  jobId: string | null;
  status: JobStatus;
  lines: LogLine[];
  elapsed: number;
  error: string | null;
}

export function useRelay() {
  const [connected, setConnected] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus>('idle');
  const [lines, setLines] = useState<LogLine[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Health check
  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch(`${RELAY_URL}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) { setConnected(true); return true; }
    } catch { /* ignore */ }
    setConnected(false);
    return false;
  }, []);

  // Poll connection
  useEffect(() => {
    checkConnection();
    const iv = setInterval(checkConnection, 5000);
    return () => clearInterval(iv);
  }, [checkConnection]);

  // Start elapsed timer
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // Execute command
  const execute = useCallback(async (type: string, args: Record<string, string | number>) => {
    setLines([]);
    setError(null);
    setStatus('connecting');
    setElapsed(0);

    try {
      const res = await fetch(`${RELAY_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, args }),
      });
      if (!res.ok) throw new Error('Relay server error');
      const { id } = await res.json();
      setJobId(id);
      setStatus('running');
      startTimer();

      // SSE stream
      const evtSource = new EventSource(`${RELAY_URL}/stream/${id}`);
      evtSource.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.text === '__DONE__') {
          evtSource.close();
          stopTimer();
          return;
        }
        if (data.text?.startsWith('__STATUS__:')) {
          const s = data.text.replace('__STATUS__:', '');
          setStatus(s === 'done' ? 'done' : 'error');
          if (s === 'error') setError('プロセスが異常終了しました');
          return;
        }
        setLines(prev => [...prev, data]);
      };
      evtSource.onerror = () => {
        evtSource.close();
        stopTimer();
      };
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : '接続に失敗しました');
      stopTimer();
    }
  }, [startTimer, stopTimer]);

  const reset = useCallback(() => {
    setJobId(null);
    setStatus('idle');
    setLines([]);
    setElapsed(0);
    setError(null);
    stopTimer();
  }, [stopTimer]);

  return { connected, jobId, status, lines, elapsed, error, execute, reset, checkConnection };
}
