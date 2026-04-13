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

// フェーズ検出（ログからフェーズ名を推測）
function detectPhase(lines: LogLine[]): { phase: string; progress: number } {
  const joined = lines.map(l => l.text).join('\n');
  const phases = [
    { key: '秘書', phase: '秘書がタスク整理中...', p: 10 },
    { key: '企画', phase: '企画部が要件定義中...', p: 20 },
    { key: '設計', phase: '設計部がアーキテクチャ構築中...', p: 30 },
    { key: 'デザイン', phase: 'デザイン部がUI設計中...', p: 40 },
    { key: '開発', phase: '開発部が実装中...', p: 55 },
    { key: 'QA', phase: 'QA部がレビュー中...', p: 70 },
    { key: 'MTG', phase: '会議中...', p: 80 },
    { key: '資料', phase: '資料作成中...', p: 85 },
    { key: '広報', phase: '広報部がレポート作成中...', p: 90 },
    { key: 'CEO', phase: 'CEO最終確認中...', p: 95 },
  ];
  let current = { phase: '準備中...', p: 5 };
  for (const ph of phases) {
    if (joined.includes(ph.key)) current = { phase: ph.phase, p: ph.p };
  }
  return { phase: current.phase, progress: current.p };
}

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}分${sec}秒` : `${sec}秒`;
}

// パーティクル
function Particles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 3,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div key={p.id}
          className="absolute rounded-full opacity-30"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            background: `hsl(${220 + Math.random() * 40}, 80%, 70%)`,
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

// 働いているエージェント表示
function WorkingAgents({ agents, activeAgentId }: { agents: Agent[]; activeAgentId: string | null }) {
  return (
    <div className="flex flex-wrap justify-center gap-4 max-w-xl">
      {agents.slice(0, 10).map(a => {
        const isActive = activeAgentId === a.id;
        return (
          <div key={a.id}
            className={`flex flex-col items-center transition-all duration-500 ${isActive ? 'scale-110' : 'opacity-40 scale-90'}`}>
            <div className={`relative ${isActive ? 'animate-bounce' : ''}`}>
              <PixelCharacter visual={a.visual} size="md" active={true} />
              {isActive && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping" />
              )}
            </div>
            <span className={`text-[10px] mt-1 transition-colors ${isActive ? 'text-white font-bold' : 'text-white/40'}`}>
              {a.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// 成功演出
function SuccessEffect() {
  const emojis = ['🎉', '✨', '🌟', '💫', '🎊', '⭐'];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {emojis.map((e, i) => (
        <div key={i} className="absolute text-4xl"
          style={{
            left: `${10 + i * 15}%`,
            animation: `confetti 1.5s ease-out ${i * 0.1}s forwards`,
          }}>
          {e}
        </div>
      ))}
    </div>
  );
}

export function ExecutionOverlay({ agents, status, lines, elapsed, error, commandLabel, onClose }: Props) {
  const [showLog, setShowLog] = useState(false);
  const [activeAgentIdx, setActiveAgentIdx] = useState(0);
  const logEndRef = useRef<HTMLDivElement>(null);
  const { phase, progress } = detectPhase(lines);

  // Rotate active agent
  useEffect(() => {
    if (status !== 'running') return;
    const iv = setInterval(() => {
      setActiveAgentIdx(prev => (prev + 1) % Math.min(agents.length, 10));
    }, 2000);
    return () => clearInterval(iv);
  }, [status, agents.length]);

  // Auto-scroll log
  useEffect(() => {
    if (showLog) logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines.length, showLog]);

  const isDone = status === 'done';
  const isError = status === 'error';
  const isRunning = status === 'running' || status === 'connecting';
  const activeAgent = agents[activeAgentIdx] ?? null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Style injection */}
      <style>{`
        @keyframes float {
          from { transform: translateY(0) scale(1); opacity: 0.3; }
          to   { transform: translateY(-30px) scale(1.5); opacity: 0; }
        }
        @keyframes confetti {
          0%   { transform: translateY(50vh) rotate(0deg) scale(0); opacity: 1; }
          100% { transform: translateY(-20vh) rotate(720deg) scale(1); opacity: 0; }
        }
        @keyframes progressPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      {/* Backdrop */}
      <div className="absolute inset-0"
        style={{
          background: isDone
            ? 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)'
            : isError
              ? 'linear-gradient(135deg, #1a0a0a 0%, #3a1515 50%, #1a0a0a 100%)'
              : 'linear-gradient(135deg, #0f172a 0%, #1a1040 30%, #0d1b2a 70%, #0f172a 100%)',
          backgroundSize: '400% 400%',
          animation: isRunning ? 'gradientShift 8s ease infinite' : undefined,
        }}
      />
      {isRunning && <Particles />}
      {isDone && <SuccessEffect />}

      {/* Main content */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-8 gap-6">

        {/* Command label */}
        <div className="text-sm text-white/40 tracking-wider uppercase font-mono">
          {commandLabel}
        </div>

        {/* Status icon / animation */}
        {isRunning && (
          <>
            <WorkingAgents agents={agents} activeAgentId={activeAgent?.id ?? null} />
            <div className="text-center mt-2">
              <p className="text-xl font-bold text-white animate-pulse">{phase}</p>
              <p className="text-sm text-white/50 mt-1">経過: {formatElapsed(elapsed)}</p>
            </div>
          </>
        )}

        {isDone && (
          <div className="text-center" style={{ animation: 'slideUp 0.5s ease-out' }}>
            <div className="text-7xl mb-4">🏆</div>
            <h2 className="text-3xl font-black text-white mb-2">完了!</h2>
            <p className="text-white/60">
              {formatElapsed(elapsed)}で処理が完了しました
            </p>
            <p className="text-sm text-white/40 mt-1">{lines.length}件のログ出力</p>
          </div>
        )}

        {isError && (
          <div className="text-center" style={{ animation: 'slideUp 0.5s ease-out' }}>
            <div className="text-7xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-red-400 mb-2">エラーが発生しました</h2>
            <p className="text-white/60 text-sm">{error}</p>
          </div>
        )}

        {/* Progress bar */}
        {isRunning && (
          <div className="w-80 max-w-full">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)',
                  animation: 'progressPulse 2s ease-in-out infinite',
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-white/30">
              <span>0%</span>
              <span>{progress}%</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {/* Toggle log button */}
        <button
          onClick={() => setShowLog(!showLog)}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white/70 cursor-pointer transition-colors">
          {showLog ? 'ログを隠す' : 'ログを表示'} ({lines.length})
        </button>

        {/* Close button (only when done/error) */}
        {(isDone || isError) && (
          <button
            onClick={onClose}
            className="px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold text-lg cursor-pointer transition-colors shadow-lg shadow-indigo-500/30">
            閉じる
          </button>
        )}
      </div>

      {/* Log panel (slide up from bottom) */}
      {showLog && (
        <div className="relative h-64 border-t border-white/10 bg-black/80 backdrop-blur-sm">
          <div className="absolute top-0 left-0 right-0 px-4 py-2 bg-black/50 border-b border-white/10 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : isDone ? 'bg-blue-400' : 'bg-red-400'}`} />
            <span className="text-xs text-white/50 font-mono">output</span>
            <span className="text-xs text-white/30 ml-auto">{lines.length} lines</span>
          </div>
          <div className="h-full overflow-y-auto pt-9 px-4 pb-2 font-mono text-xs leading-relaxed">
            {lines.map((line, i) => (
              <div key={i}
                className={`py-0.5 ${line.stream === 'stderr' ? 'text-red-400/80' : 'text-green-300/70'}`}
                style={{ animation: 'slideUp 0.2s ease-out' }}>
                <span className="text-white/20 mr-2 select-none">{String(i + 1).padStart(3)}</span>
                {line.text}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
