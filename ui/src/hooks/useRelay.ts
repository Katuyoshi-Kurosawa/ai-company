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
  const reconnectedRef = useRef(false);
  const evtSourceRef = useRef<EventSource | null>(null);

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
  const startTimer = useCallback((startedAt?: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    startTimeRef.current = startedAt || Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // Close existing EventSource before opening a new one
  const closeStream = useCallback(() => {
    if (evtSourceRef.current) {
      evtSourceRef.current.close();
      evtSourceRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (evtSourceRef.current) evtSourceRef.current.close();
    };
  }, []);

  // SSEストリームに接続する共通関数
  const connectToStream = useCallback((id: string, startedAt?: number) => {
    closeStream(); // close any existing stream
    setJobId(id);
    setStatus('running');
    startTimer(startedAt);

    const evtSource = new EventSource(`${RELAY_URL}/stream/${id}`);
    evtSourceRef.current = evtSource;

    evtSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.text === '__DONE__') {
        evtSource.close();
        evtSourceRef.current = null;
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
      evtSourceRef.current = null;
      stopTimer();
      // Set error status only if we haven't received a __STATUS__ message
      setStatus(prev => prev === 'running' ? 'error' : prev);
      setError(prev => prev ?? '接続が切断されました');
    };
  }, [startTimer, stopTimer, closeStream]);

  // ページロード時に実行中ジョブを検出して再接続
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);

  useEffect(() => {
    if (reconnectedRef.current) return;
    reconnectedRef.current = true;

    (async () => {
      try {
        const res = await fetch(`${RELAY_URL}/active`, { signal: AbortSignal.timeout(2000) });
        if (!res.ok) return;
        const active = await res.json();
        if (active && active.id && active.status === 'running') {
          setActiveLabel(active.label || null);
          setActiveType(active.type || null);
          connectToStream(active.id, active.startedAt);
        }
      } catch { /* relay未起動なら無視 */ }
    })();
  }, [connectToStream]);

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

      // 多重実行防止: 409 → 既存ジョブに再接続
      if (res.status === 409) {
        const data = await res.json();
        if (data.activeJobId) {
          connectToStream(data.activeJobId, data.startedAt);
          return;
        }
        throw new Error(data.error || '既に実行中です');
      }

      if (!res.ok) throw new Error('Relay server error');
      const { id } = await res.json();
      connectToStream(id);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : '接続に失敗しました');
      stopTimer();
    }
  }, [connectToStream, stopTimer]);

  const reset = useCallback(() => {
    closeStream();
    setJobId(null);
    setStatus('idle');
    setLines([]);
    setElapsed(0);
    setError(null);
    stopTimer();
  }, [stopTimer, closeStream]);

  return { connected, jobId, status, lines, elapsed, error, execute, reset, checkConnection, activeLabel, activeType };
}
