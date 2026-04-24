import { useState, useEffect, useCallback, useRef } from 'react';

const RELAY_URL = 'http://localhost:3939';

interface JobInfo {
  id: string;
  type: string;
  label: string;
  status: string;
  startedAt: number;
  finishedAt: number | null;
  lineCount: number;
  stalled: boolean;
}

function formatElapsed(startedAt: number): string {
  const s = Math.floor((Date.now() - startedAt) / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

interface Props {
  /** 現在UIが接続中のジョブID（このジョブは除外して表示） */
  currentJobId: string | null;
  /** ジョブに接続する */
  onConnect: (jobId: string) => void;
}

export function BackgroundJobIndicator({ currentJobId, onConnect }: Props) {
  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [, setTick] = useState(0); // elapsed更新用
  const popRef = useRef<HTMLDivElement>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`${RELAY_URL}/jobs`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    poll();
    const iv = setInterval(poll, 3000);
    return () => clearInterval(iv);
  }, [poll]);

  // elapsed表示更新
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  // 外部クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const running = jobs.filter(j => j.status === 'running');
  const recentDone = jobs.filter(j => j.status !== 'running' && Date.now() - (j.finishedAt || j.startedAt) < 10 * 60 * 1000);

  if (running.length === 0 && recentDone.length === 0) return null;

  const handleAbort = async (id: string) => {
    try {
      await fetch(`${RELAY_URL}/abort/${id}`, { method: 'POST' });
      poll();
    } catch { /* ignore */ }
  };

  return (
    <div className="relative" ref={popRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all hover:scale-105"
        style={{
          background: running.length > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(100,116,139,0.15)',
          border: `1px solid ${running.length > 0 ? 'rgba(245,158,11,0.4)' : 'rgba(100,116,139,0.3)'}`,
        }}
      >
        {running.length > 0 && (
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        )}
        <span className="text-xs font-bold" style={{ color: running.length > 0 ? '#fbbf24' : '#94a3b8' }}>
          {running.length > 0 ? `${running.length} JOB` : `${recentDone.length} 完了`}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border backdrop-blur-xl z-50"
          style={{
            background: 'rgba(15,23,42,0.97)',
            borderColor: 'rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
          <div className="px-3 py-2 border-b text-xs font-bold" style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}>
            JOBS ({jobs.length})
          </div>
          <div className="max-h-64 overflow-y-auto">
            {running.map(job => {
              const isConnected = job.id === currentJobId;
              return (
                <div key={job.id} className="px-3 py-2.5 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'bg-indigo-400' : 'bg-amber-400'} animate-pulse`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate flex items-center gap-1.5">
                      {job.label || job.type}
                      {isConnected && <span className="text-[9px] px-1 py-0.5 bg-indigo-500/30 text-indigo-300 rounded">接続中</span>}
                    </div>
                    <div className="text-[10px] text-white/40 flex items-center gap-2">
                      <span>{job.type}</span>
                      <span className="font-mono">{formatElapsed(job.startedAt)}</span>
                      <span>{job.lineCount} lines</span>
                      {job.stalled && <span className="text-amber-400">停滞</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!isConnected && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onConnect(job.id); setOpen(false); }}
                        className="px-2 py-1 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 rounded text-[10px] cursor-pointer transition-colors font-bold"
                      >
                        接続
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAbort(job.id); }}
                      className="px-2 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded text-[10px] cursor-pointer transition-colors font-bold"
                    >
                      停止
                    </button>
                  </div>
                </div>
              );
            })}
            {recentDone.map(job => (
              <div key={job.id} className="px-3 py-2 border-b flex items-center gap-2 opacity-50" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${job.status === 'done' ? 'bg-green-400' : 'bg-red-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-white/60 truncate">{job.label || job.type}</div>
                  <div className="text-[10px] text-white/30">
                    {job.status === 'done' ? '完了' : 'エラー'} / {job.lineCount} lines
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
