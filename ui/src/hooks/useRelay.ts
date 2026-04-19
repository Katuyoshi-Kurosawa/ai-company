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
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [stalled, setStalled] = useState(false);
  const lastLineTimeRef = useRef<number>(Date.now());

  // Refs for avoiding stale closures
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const evtSourceRef = useRef<EventSource | null>(null);
  const statusRef = useRef<JobStatus>('idle');
  const reconnectedRef = useRef(false); // true = successfully reconnected OR confirmed no active job
  const mountedRef = useRef(true);

  // Keep statusRef in sync
  useEffect(() => { statusRef.current = status; }, [status]);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Timer management ──────────────────────────────────────

  const startTimer = useCallback((startedAt?: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    startTimeRef.current = startedAt || Date.now();
    timerRef.current = setInterval(() => {
      if (mountedRef.current) {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
    setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // ── EventSource management ────────────────────────────────

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

  // ── SSEストリームに接続する共通関数 ────────────────────────

  const connectToStream = useCallback((id: string, startedAt?: number) => {
    closeStream();
    setJobId(id);
    setStatus('running');
    setError(null);
    startTimer(startedAt);

    console.log(`[relay] SSE接続開始: ${id}`);
    const evtSource = new EventSource(`${RELAY_URL}/stream/${id}`);
    evtSourceRef.current = evtSource;
    let receivedStatus = false;

    evtSource.onopen = () => {
      console.log(`[relay] SSE接続成功: ${id}`);
    };

    evtSource.onmessage = (e) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(e.data);
        if (data.text === '__DONE__') {
          console.log(`[relay] SSE完了シグナル受信: ${id}`);
          evtSource.close();
          evtSourceRef.current = null;
          stopTimer();
          return;
        }
        if (data.text?.startsWith('__STATUS__:')) {
          receivedStatus = true;
          const s = data.text.replace('__STATUS__:', '');
          setStatus(s === 'done' ? 'done' : 'error');
          if (s === 'error') {
            // 直前のstderrメッセージがあればそれをエラー内容に使う
            setLines(prev => {
              const lastStderr = [...prev].reverse().find(l => l.stream === 'stderr');
              setError(lastStderr?.text || 'プロセスが異常終了しました');
              return prev;
            });
          }
          return;
        }
        setLines(prev => [...prev, data]);
        lastLineTimeRef.current = Date.now();
        setStalled(false);
      } catch (err) {
        console.warn('[relay] SSEメッセージパースエラー:', err);
      }
    };

    // 停滞検知タイマー（3分ログなしで警告）
    const stallCheckInterval = setInterval(() => {
      if (statusRef.current !== 'running') {
        clearInterval(stallCheckInterval);
        return;
      }
      const silentMs = Date.now() - lastLineTimeRef.current;
      if (silentMs >= 180_000) { // 3分
        setStalled(true);
      }
    }, 30_000);

    evtSource.onerror = () => {
      clearInterval(stallCheckInterval);
      console.warn(`[relay] SSEエラー: ${id}, receivedStatus=${receivedStatus}, currentStatus=${statusRef.current}`);
      evtSource.close();
      evtSourceRef.current = null;
      stopTimer();
      if (!mountedRef.current) return;
      // __STATUS__メッセージを受信済みならstatusは既に更新済み、errorにしない
      if (!receivedStatus && statusRef.current === 'running') {
        setStatus('error');
        setError('接続が切断されました');
      }
    };
  }, [startTimer, stopTimer, closeStream]);

  // ── Health check + 再接続 ─────────────────────────────────
  // health checkが成功した時に、まだ再接続チェックしていなければ/activeを確認する

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch(`${RELAY_URL}/health`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) { setConnected(false); return false; }
      setConnected(true);

      // まだ再接続チェックしていない + idle状態 → /active を確認
      if (!reconnectedRef.current && statusRef.current === 'idle') {
        try {
          console.log('[relay] アクティブジョブ確認中...');
          const activeRes = await fetch(`${RELAY_URL}/active`, { signal: AbortSignal.timeout(2000) });
          if (activeRes.ok) {
            const active = await activeRes.json();
            if (active && active.id && active.status === 'running') {
              console.log(`[relay] アクティブジョブ検出: ${active.id} (${active.label})`);
              if (mountedRef.current) {
                setActiveLabel(active.label || null);
                setActiveType(active.type || null);
                connectToStream(active.id, active.startedAt);
              }
              reconnectedRef.current = true;
            } else {
              // アクティブジョブなし → 次回チェック不要
              console.log('[relay] アクティブジョブなし');
              reconnectedRef.current = true;
            }
          }
          // fetchが失敗した場合はreconnectedRefをtrueにしない → 次のhealth checkで再試行
        } catch {
          console.warn('[relay] /active取得失敗、次回再試行');
          // reconnectedRef.current は false のまま → 次の health check で再試行
        }
      }

      return true;
    } catch { /* ignore */ }
    setConnected(false);
    return false;
  }, [connectToStream]);

  // Health checkポーリング
  useEffect(() => {
    checkConnection();
    const iv = setInterval(checkConnection, 5000);
    return () => clearInterval(iv);
  }, [checkConnection]);

  // ── Execute command ────────────────────────────────────────

  const execute = useCallback(async (type: string, args: Record<string, string | number | string[]>) => {
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

  // ── Abort (ジョブ中断) ────────────────────────────────────

  const abort = useCallback(async () => {
    if (!jobId) return;
    try {
      await fetch(`${RELAY_URL}/abort/${jobId}`, { method: 'POST' });
    } catch {
      console.warn('[relay] 中断リクエスト失敗');
    }
  }, [jobId]);

  // ── Reset ──────────────────────────────────────────────────

  const reset = useCallback(() => {
    closeStream();
    setJobId(null);
    setStatus('idle');
    setLines([]);
    setElapsed(0);
    setError(null);
    stopTimer();
    setStalled(false);
    // reset後に新しいジョブが始まる可能性があるので再接続チェックを有効化
    reconnectedRef.current = false;
  }, [stopTimer, closeStream]);

  return { connected, jobId, status, lines, elapsed, error, execute, reset, abort, checkConnection, activeLabel, activeType, stalled };
}
