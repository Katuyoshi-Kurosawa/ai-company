import { useState, useEffect, useRef } from 'react';
import type { Agent } from '../types';
import type { JobStatus, LogLine } from '../hooks/useRelay';
import { PixelCharacter } from './PixelCharacter';

interface Props {
  agents: Agent[];
  status: JobStatus;
  lines: LogLine[];
  elapsed: number;
  error: string | null;
  commandLabel: string;
  onClose: () => void;
}

function detectPhase(lines: LogLine[]): { phase: string; progress: number } {
  const joined = lines.map(l => l.text).join('\n');
  const phases = [
    { key: 'PHASE 1', phase: 'PHASE1: CEO計画＋マーケ＋CS＋企画', p: 10 },
    { key: '秘書部長', phase: '秘書部長がレビュー中...', p: 18 },
    { key: 'PHASE 2', phase: 'PHASE2: 要件定義＋R&D＋設計概要', p: 25 },
    { key: '要件レビュー', phase: '要件レビューMTG中...', p: 35 },
    { key: 'PHASE 3', phase: 'PHASE3: 詳細設計＋開発準備', p: 42 },
    { key: '設計レビュー', phase: '設計レビュー中...', p: 50 },
    { key: 'PHASE 4', phase: 'PHASE4: デザイン＋開発＋CS', p: 58 },
    { key: 'コードレビュー', phase: 'コードレビューMTG中...', p: 70 },
    { key: 'PHASE 5', phase: 'PHASE5: QA＋人事＋報告書ドラフト', p: 78 },
    { key: 'PHASE 6', phase: 'PHASE6: 報告書最終化＋PMサマリー', p: 88 },
    { key: 'CEO秘書', phase: 'CEO秘書が最終報告作成中...', p: 95 },
    { key: '全工程終了', phase: '完了!', p: 100 },
  ];
  let current = { phase: '準備中...', p: 3 };
  for (const ph of phases) {
    if (joined.includes(ph.key)) current = { phase: ph.phase, p: ph.p };
  }
  return { phase: current.phase, progress: current.p };
}

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `0:${String(sec).padStart(2, '0')}`;
}

// コンパクト版: ヘッダーに埋め込むインジケーター
export function ExecutionIndicator({ status, elapsed, onClick }: {
  status: JobStatus;
  elapsed: number;
  onClick: () => void;
}) {
  if (status === 'idle') return null;
  const isRunning = status === 'running' || status === 'connecting';
  const isDone = status === 'done';

  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all hover:scale-105"
      style={{
        background: isRunning ? 'rgba(99,102,241,0.15)' : isDone ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
        border: `1px solid ${isRunning ? 'rgba(99,102,241,0.3)' : isDone ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
      }}>
      <div className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-indigo-400 animate-pulse' : isDone ? 'bg-green-400' : 'bg-red-400'}`} />
      <span className="text-xs font-bold truncate max-w-32">
        {isRunning ? '実行中' : isDone ? '完了' : 'エラー'}
      </span>
      <span className="text-[10px] opacity-60 font-mono">{formatElapsed(elapsed)}</span>
    </button>
  );
}

// 下部パネル: スライドアップで表示
export function ExecutionPanel({ agents, status, lines, elapsed, error, commandLabel, onClose }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [showLog, setShowLog] = useState(false);
  const [activeAgentIdx, setActiveAgentIdx] = useState(0);
  const logEndRef = useRef<HTMLDivElement>(null);
  const { phase, progress } = detectPhase(lines);

  const isDone = status === 'done';
  const isError = status === 'error';
  const isRunning = status === 'running' || status === 'connecting';
  const activeAgent = agents[activeAgentIdx] ?? null;

  useEffect(() => {
    if (status !== 'running') return;
    const iv = setInterval(() => {
      setActiveAgentIdx(prev => (prev + 1) % Math.min(agents.length, 13));
    }, 2000);
    return () => clearInterval(iv);
  }, [status, agents.length]);

  useEffect(() => {
    if (showLog) logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines.length, showLog]);

  if (!expanded) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md"
        style={{ background: 'rgba(15,23,42,0.95)', borderColor: 'rgba(99,102,241,0.3)' }}>
        <button onClick={() => setExpanded(true)}
          className="w-full px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors">
          <div className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-indigo-400 animate-pulse' : isDone ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-sm font-bold">{phase}</span>
          <span className="text-xs opacity-50 font-mono">{formatElapsed(elapsed)}</span>
          <div className="flex-1 mx-4">
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
            </div>
          </div>
          <span className="text-xs opacity-40">▲ 展開</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md"
      style={{
        background: 'rgba(15,23,42,0.97)',
        borderColor: isRunning ? 'rgba(99,102,241,0.4)' : isDone ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)',
        boxShadow: `0 -4px 30px ${isRunning ? 'rgba(99,102,241,0.1)' : isDone ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}`,
      }}>
      <style>{`
        @keyframes progressPulse { 0%,100% { opacity:1 } 50% { opacity:0.6 } }
        @keyframes slideUpPanel { from { transform:translateY(100%) } to { transform:translateY(0) } }
      `}</style>

      {/* Header bar */}
      <div className="px-4 py-2 flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full shrink-0 ${isRunning ? 'bg-indigo-400 animate-pulse' : isDone ? 'bg-green-400' : 'bg-red-400'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white truncate">{commandLabel}</span>
            <span className="text-xs text-white/40 font-mono">{formatElapsed(elapsed)}</span>
          </div>
          <div className="text-xs text-white/50 mt-0.5">{phase}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowLog(!showLog)}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] text-white/60 cursor-pointer transition-colors">
            {showLog ? 'ログ ▼' : 'ログ ▲'} ({lines.length})
          </button>
          <button onClick={() => setExpanded(false)}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] text-white/60 cursor-pointer transition-colors">
            最小化
          </button>
          {(isDone || isError) && (
            <button onClick={onClose}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] text-white/60 cursor-pointer transition-colors">
              閉じる
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-2">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${progress}%`,
              background: isDone ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                : isError ? 'linear-gradient(90deg, #ef4444, #f87171)'
                : 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)',
              animation: isRunning ? 'progressPulse 2s ease-in-out infinite' : undefined,
            }}
          />
        </div>
      </div>

      {/* Agent avatars row */}
      <div className="px-4 pb-3 flex items-center gap-1 overflow-x-auto">
        {agents.slice(0, 13).map(a => {
          const isActive = activeAgent?.id === a.id;
          return (
            <div key={a.id}
              className={`flex flex-col items-center shrink-0 transition-all duration-500 px-1
                ${isActive && isRunning ? 'scale-110 opacity-100' : 'opacity-30 scale-90'}`}>
              <div className={isActive && isRunning ? 'animate-bounce' : ''}>
                <PixelCharacter visual={a.visual} size="sm" active={true} />
              </div>
              <span className="text-[8px] text-white/50 mt-0.5 truncate w-8 text-center">{a.name.split(' ')[0]}</span>
            </div>
          );
        })}

        {/* Status message on the right */}
        <div className="ml-auto pl-4 shrink-0">
          {isDone && (
            <div className="flex items-center gap-2 text-green-400">
              <span className="text-2xl">🏆</span>
              <div>
                <div className="text-sm font-bold">完了!</div>
                <div className="text-[10px] text-green-400/60">{lines.length}行の出力</div>
              </div>
            </div>
          )}
          {isError && (
            <div className="flex items-center gap-2 text-red-400">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="text-sm font-bold">エラー</div>
                <div className="text-[10px] text-red-400/60">{error}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Log panel (expandable) */}
      {showLog && (
        <div className="border-t border-white/10 max-h-52 overflow-y-auto px-4 py-2 font-mono text-xs leading-relaxed bg-black/40">
          {lines.map((line, i) => (
            <div key={i}
              className={`py-0.5 ${line.stream === 'stderr' ? 'text-red-400/80' : 'text-green-300/70'}`}>
              <span className="text-white/20 mr-2 select-none">{String(i + 1).padStart(3)}</span>
              {line.text}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}
    </div>
  );
}
