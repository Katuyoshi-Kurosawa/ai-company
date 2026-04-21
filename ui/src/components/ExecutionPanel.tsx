import { useState, useEffect, useRef, useMemo } from 'react';
import type { Agent } from '../types';
import type { JobStatus, LogLine } from '../hooks/useRelay';
import { PixelCharacter } from './PixelCharacter';
import { FilePreviewModal } from './FilePreviewModal';

const RELAY_URL = 'http://localhost:3939';

interface Props {
  agents: Agent[];
  status: JobStatus;
  lines: LogLine[];
  elapsed: number;
  error: string | null;
  commandLabel: string;
  outputDir: string | null;
  onClose: () => void;
  onAbort?: () => void;
  stalled?: boolean;
}

function detectPhase(lines: LogLine[]): { phase: string; progress: number } {
  const joined = lines.map(l => l.text).join('\n');
  const phases = [
    // v5 軽量モード
    { key: '軽量モード', phase: '軽量: 秘書が応答中...', p: 50 },
    // v5 中量モード
    { key: '中量PHASE 1', phase: '中量1: 計画＋調査', p: 20 },
    { key: '中量PHASE 2', phase: '中量2: 企画＋成果物作成', p: 60 },
    // v5 重量モード (3フェーズ構成)
    { key: 'PHASE 1', phase: 'PHASE1: 調査・計画（4並列）', p: 15 },
    { key: 'PHASE 2', phase: 'PHASE2: 要件＋R&D＋設計＋レビュー', p: 40 },
    { key: 'PHASE 3', phase: 'PHASE3: 実装＋QA＋評価＋報告', p: 65 },
    { key: 'QA＋最終報告', phase: 'QA＋最終報告', p: 85 },
    { key: '最終報告', phase: '最終報告作成中...', p: 90 },
    // 共通
    { key: '全工程終了', phase: '完了!', p: 100 },
    { key: '軽量モード完了', phase: '完了!', p: 100 },
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

// ログから現在アクティブなエージェントと最新アクティビティを検出
function detectLiveStatus(lines: LogLine[], agents: Agent[]): {
  activeAgents: { id: string; name: string; status: 'running' | 'done' | 'warning' | 'error' }[];
  currentActivity: string;
  latestAgent: string | null;
} {
  const agentStates = new Map<string, 'running' | 'done' | 'warning' | 'error'>();
  let currentActivity = '準備中...';
  let latestAgent: string | null = null;

  for (const line of lines) {
    const txt = line.text;

    // エージェント開始検出
    if (txt.includes('🚀') && txt.includes('開始')) {
      const match = txt.match(/🚀\s*(.+?)\s*開始/);
      if (match) {
        const name = match[1].trim();
        // エージェントIDを名前からマッチ
        const agent = agents.find(a => name.includes(a.name.split(' ')[0]) || name.includes(a.name));
        const key = agent?.id ?? name;
        agentStates.set(key, 'running');
        latestAgent = key;
        currentActivity = `${name} が作業中...`;
      }
    }

    // エージェント正常完了
    if (txt.includes('✅') && txt.includes('正常完了')) {
      const match = txt.match(/✅\s*(.+?)\s*正常完了/);
      if (match) {
        const name = match[1].trim();
        const agent = agents.find(a => name.includes(a.name.split(' ')[0]) || name.includes(a.name));
        const key = agent?.id ?? name;
        agentStates.set(key, 'done');
      }
    }

    // ターン上限
    if (txt.includes('⚠️') && txt.includes('ターン上限')) {
      const match = txt.match(/⚠️\s*(.+?)\s*ターン上限/);
      if (match) {
        const name = match[1].trim();
        const agent = agents.find(a => name.includes(a.name.split(' ')[0]) || name.includes(a.name));
        const key = agent?.id ?? name;
        agentStates.set(key, 'warning');
      }
    }

    // タイムアウト
    if (txt.includes('⏰') && txt.includes('タイムアウト')) {
      const match = txt.match(/⏰\s*(.+?)\s*タイムアウト/);
      if (match) {
        const name = match[1].trim();
        const agent = agents.find(a => name.includes(a.name.split(' ')[0]) || name.includes(a.name));
        const key = agent?.id ?? name;
        agentStates.set(key, 'warning');
      }
    }

    // エラー
    if (txt.includes('❌') && txt.includes('エ���ー終了')) {
      const match = txt.match(/❌\s*(.+?)\s*エラー終了/);
      if (match) {
        const name = match[1].trim();
        const agent = agents.find(a => name.includes(a.name.split(' ')[0]) || name.includes(a.name));
        const key = agent?.id ?? name;
        agentStates.set(key, 'error');
      }
    }

    // フェーズ進行
    if (txt.includes('━━━') || txt.includes('PHASE')) {
      const clean = txt.replace(/[━\[\]]/g, '').replace(/\[[\d:]+\]/, '').trim();
      if (clean) currentActivity = clean;
    }

    // EXP付与（タスク完了のサイン）
    if (txt.includes('💫') && txt.includes('EXP')) {
      // latest activity update
    }

    // レビュー・完了
    if (txt.includes('パフォーマンスレビュー')) {
      currentActivity = 'パフォーマンスレビュー生成中...';
    }
    if (txt.includes('全工程終了') || txt.includes('🎉')) {
      currentActivity = '全工程完了!';
    }
  }

  // 現在runningなエージェントがいれば最新のアクティビティを更新
  const running = [...agentStates.entries()].filter(([, s]) => s === 'running');
  if (running.length > 0) {
    const names = running.map(([key]) => {
      const agent = agents.find(a => a.id === key);
      return agent ? agent.name.split(' ')[0] : key;
    });
    if (names.length <= 3) {
      currentActivity = `${names.join('、')} が作業中...`;
    } else {
      currentActivity = `${names.slice(0, 2).join('、')} 他${names.length - 2}名が作業中...`;
    }
  }

  const activeAgents = [...agentStates.entries()].map(([id, status]) => {
    const agent = agents.find(a => a.id === id);
    return { id, name: agent?.name ?? id, status };
  });

  return { activeAgents, currentActivity, latestAgent };
}

// ログから直近の思考・作業内容を抽出（ノイズ除外）
function extractThoughts(lines: LogLine[], agents: Agent[]): {
  agentId: string | null;
  agentName: string;
  agentIcon: string;
  thoughts: string[];
}[] {
  // ノイズ行のパターン
  const NOISE = /^(\s*$|╔|╚|║|─|━|═|┌|└|│|├|╭|╰|⎿|⎡|⎣|\[[\d:]+\]|__REVIEW|__SLACK|__STATUS|__DONE)/;
  const SYSTEM_LINE = /^(\[[\d:]+\]\s*)?(🚀|✅|⚠️|⏰|❌|💫|📊|📁|📌|🏢|🎉|🏁|📝|🔧)/;
  const META_LINE = /^(Error:|Warning:|Reached max turns|Usage:|Model:|Cost:|\s*\d+[.\d]*\s*(tokens?|input|output))/i;

  const result: { agentId: string | null; agentName: string; agentIcon: string; thoughts: string[] }[] = [];
  let currentAgent: { id: string | null; name: string; icon: string } = { id: null, name: '', icon: '🤖' };
  let currentThoughts: string[] = [];

  const flushAgent = () => {
    if (currentThoughts.length > 0 && currentAgent.name) {
      // 既存エントリにマージ or 新規追加
      const existing = result.find(r => r.agentId === currentAgent.id);
      if (existing) {
        existing.thoughts = [...existing.thoughts, ...currentThoughts].slice(-8);
      } else {
        result.push({
          agentId: currentAgent.id,
          agentName: currentAgent.name,
          agentIcon: currentAgent.icon,
          thoughts: currentThoughts.slice(-8),
        });
      }
    }
    currentThoughts = [];
  };

  for (const line of lines) {
    const txt = line.text;

    // エージェント開始を検出 → 新しいエージェントに切替
    if (txt.includes('🚀') && txt.includes('開始')) {
      flushAgent();
      const match = txt.match(/🚀\s*(.+?)\s*開始/);
      if (match) {
        const fullName = match[1].trim();
        const agent = agents.find(a => fullName.includes(a.name.split(' ')[0]));
        currentAgent = {
          id: agent?.id ?? null,
          name: agent ? agent.name : fullName,
          icon: agent?.visual?.icon ?? '🤖',
        };
      }
      continue;
    }

    // エージェント完了 → flush
    if (txt.includes('✅') || txt.includes('⚠️') || txt.includes('❌') || txt.includes('⏰')) {
      if (txt.includes('完了') || txt.includes('ターン上限') || txt.includes('エラー終了') || txt.includes('タイムアウト')) {
        flushAgent();
        continue;
      }
    }

    // ノイズ除外
    if (NOISE.test(txt)) continue;
    if (SYSTEM_LINE.test(txt)) continue;
    if (META_LINE.test(txt)) continue;
    if (txt.length < 3) continue;

    // 意味のある行を思考として記録
    const cleaned = txt.replace(/^\[[\d:]+\]\s*/, '').trim();
    if (cleaned.length >= 3) {
      currentThoughts.push(cleaned);
    }
  }
  flushAgent();

  return result;
}

// コンパクト版: ヘッダーに埋め込むインジケーター
export function ExecutionIndicator({ status, elapsed, onClick, activity }: {
  status: JobStatus;
  elapsed: number;
  onClick: () => void;
  activity?: string;
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
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isRunning ? 'bg-indigo-400 animate-pulse' : isDone ? 'bg-green-400' : 'bg-red-400'}`} />
      <div className="flex flex-col items-start min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold">
            {isRunning ? '実行中' : isDone ? '完了' : 'エラー'}
          </span>
          <span className="text-[10px] opacity-60 font-mono">{formatElapsed(elapsed)}</span>
        </div>
        {isRunning && activity && (
          <span className="text-[9px] text-indigo-300/70 truncate max-w-40">{activity}</span>
        )}
      </div>
    </button>
  );
}

// 主要成果物を優先表示するためのソート
const FILE_PRIORITY: Record<string, number> = {
  'deliverable.md': 1,
  'secretary-report.md': 2,
  'report.md': 3,
  'requirements.md': 4,
  'design.md': 5,
  'qa-report.md': 6,
};

function fileIcon(name: string): string {
  if (name.endsWith('.md')) return '📝';
  if (name.endsWith('.json')) return '📊';
  if (name.endsWith('.html')) return '🌐';
  if (name.endsWith('.sql')) return '🗄️';
  return '📄';
}

// ライブ思考フィード
function LiveThoughtFeed({ lines, agents }: { lines: LogLine[]; agents: Agent[] }) {
  const feedRef = useRef<HTMLDivElement>(null);
  const thoughts = useMemo(() => extractThoughts(lines, agents), [lines, agents]);

  // 最新のアクティブエージェント（最後に思考があるもの）を取得
  const latestActive = thoughts.length > 0 ? thoughts[thoughts.length - 1] : null;
  // 完了済みエージェントの最新思考（直近3つ）
  const recentCompleted = thoughts.slice(-4, -1);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines.length]);

  if (!latestActive) return null;

  return (
    <div className="border-t border-white/10 bg-black/30">
      <div ref={feedRef} className="max-h-32 overflow-y-auto px-4 py-2 space-y-2">
        {/* 完了済みエージェントの要約（折りたたみ表示） */}
        {recentCompleted.map((entry, i) => (
          <div key={i} className="flex gap-2 opacity-40">
            <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] shrink-0 mt-0.5">
              ✓
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-white/50">{entry.agentName.split(' ')[0]}</span>
              <span className="text-[10px] text-white/30 ml-1.5 truncate block">
                {entry.thoughts[entry.thoughts.length - 1]?.slice(0, 80)}
              </span>
            </div>
          </div>
        ))}

        {/* アクティブエージェントの思考 */}
        <div className="flex gap-2.5">
          <div className="shrink-0 mt-1">
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-sm">
              {latestActive.agentIcon || '🤖'}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-indigo-300">{latestActive.agentName.split(' ')[0]}</span>
              <span className="text-[9px] text-white/30">思考中</span>
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
            <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
              {latestActive.thoughts.slice(-5).map((thought, i) => (
                <div key={i} className={`text-[11px] leading-relaxed ${
                  i === latestActive.thoughts.slice(-5).length - 1
                    ? 'text-white/80'
                    : 'text-white/40'
                }`}>
                  {thought.length > 120 ? thought.slice(0, 120) + '…' : thought}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 下部パネル: スライドアップで表示
export function ExecutionPanel({ agents, status, lines, elapsed, error, commandLabel, outputDir, onClose, onAbort, stalled }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [panelTab, setPanelTab] = useState<'none' | 'log' | 'files'>('none');
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const { phase, progress } = detectPhase(lines);
  const liveStatus = detectLiveStatus(lines, agents);

  const isDone = status === 'done';
  const isError = status === 'error';
  const isRunning = status === 'running' || status === 'connecting';

  // 完了時にファイル一覧を取得
  useEffect(() => {
    if (!isDone || !outputDir) return;
    (async () => {
      try {
        const res = await fetch(`${RELAY_URL}/files?dir=${encodeURIComponent(outputDir)}`);
        if (!res.ok) return;
        const data = await res.json();
        const sorted = (data.files as { name: string; size: number }[]).sort((a, b) => {
          const pa = FILE_PRIORITY[a.name] ?? 99;
          const pb = FILE_PRIORITY[b.name] ?? 99;
          return pa - pb;
        });
        setFiles(sorted);
      } catch { /* ignore */ }
    })();
  }, [isDone, outputDir]);

  useEffect(() => {
    if (panelTab === 'log') logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines.length, panelTab]);

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
          <div className="text-xs text-white/50 mt-0.5 flex items-center gap-2">
            <span>{phase}</span>
            {isRunning && liveStatus.currentActivity !== phase && (
              <>
                <span className="text-white/20">|</span>
                <span className="text-indigo-300/80 animate-pulse truncate">{liveStatus.currentActivity}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 成果物ボタン（完了時のみ） */}
          {isDone && files.length > 0 && (
            <button onClick={() => setPanelTab(panelTab === 'files' ? 'none' : 'files')}
              className={`px-2.5 py-1 rounded text-[10px] cursor-pointer transition-colors ${
                panelTab === 'files' ? 'bg-indigo-500/30 text-indigo-300' : 'bg-white/10 hover:bg-white/20 text-white/60'
              }`}>
              成果物 📄 ({files.length})
            </button>
          )}
          <button onClick={() => setPanelTab(panelTab === 'log' ? 'none' : 'log')}
            className={`px-2.5 py-1 rounded text-[10px] cursor-pointer transition-colors ${
              panelTab === 'log' ? 'bg-indigo-500/30 text-indigo-300' : 'bg-white/10 hover:bg-white/20 text-white/60'
            }`}>
            ログ ({lines.length})
          </button>
          {isRunning && onAbort && (
            <button onClick={onAbort}
              className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded text-[10px] cursor-pointer transition-colors font-bold">
              ⏹ 中断
            </button>
          )}
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

      {/* Stall alert */}
      {isRunning && stalled && (
        <div className="mx-4 mb-2 px-3 py-2 bg-amber-500/15 border border-amber-400/30 rounded-lg flex items-center gap-2">
          <span className="text-amber-400 text-sm">⚠️</span>
          <span className="text-xs text-amber-300 flex-1">
            3分以上ログ出力がありません。プロセスが停滞している可能性があります。
          </span>
          {onAbort && (
            <button onClick={onAbort}
              className="px-2 py-1 bg-red-500/30 hover:bg-red-500/50 text-red-300 rounded text-[10px] font-bold cursor-pointer transition-colors">
              中断する
            </button>
          )}
        </div>
      )}

      {/* Live thought feed (実行中のみ) */}
      {isRunning && lines.length > 0 && (
        <LiveThoughtFeed lines={lines} agents={agents} />
      )}

      {/* Agent avatars row */}
      <div className="px-4 pb-3 flex items-center gap-1 overflow-x-auto">
        {agents.slice(0, 13).map(a => {
          const liveAgent = liveStatus.activeAgents.find(la => la.id === a.id);
          const agentStatus = liveAgent?.status;
          const isActive = agentStatus === 'running';
          const isDoneAgent = agentStatus === 'done';
          const isWarning = agentStatus === 'warning';
          const isErrorAgent = agentStatus === 'error';
          const hasParticipated = !!agentStatus;

          return (
            <div key={a.id}
              className={`flex flex-col items-center shrink-0 transition-all duration-500 px-1
                ${isActive ? 'scale-110 opacity-100' : hasParticipated ? 'opacity-80 scale-95' : 'opacity-20 scale-90'}`}>
              <div className="relative">
                <div className={isActive ? 'animate-bounce' : ''}>
                  <PixelCharacter visual={a.visual} size="sm" active={true} />
                </div>
                {/* ステータスインジケーター */}
                {isDoneAgent && (
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center text-[7px] text-white font-bold shadow-lg shadow-emerald-500/50">✓</div>
                )}
                {isWarning && (
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center text-[7px] text-white font-bold shadow-lg shadow-amber-500/50">!</div>
                )}
                {isErrorAgent && (
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center text-[7px] text-white font-bold shadow-lg shadow-red-500/50">✕</div>
                )}
                {isActive && (
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-indigo-500 rounded-full animate-pulse shadow-lg shadow-indigo-500/50" />
                )}
              </div>
              <span className={`text-[8px] mt-0.5 truncate w-10 text-center ${
                isActive ? 'text-indigo-300 font-bold' : isDoneAgent ? 'text-emerald-400/60' : 'text-white/40'
              }`}>{a.name.split(' ')[0]}</span>
            </div>
          );
        })}

        {/* Status message on the right */}
        <div className="ml-auto pl-4 shrink-0">
          {isRunning && liveStatus.activeAgents.length > 0 && (
            <div className="text-right">
              <div className="text-[10px] text-indigo-300 font-bold">
                {liveStatus.activeAgents.filter(a => a.status === 'running').length}名 作業中
              </div>
              <div className="text-[9px] text-white/40">
                {liveStatus.activeAgents.filter(a => a.status === 'done').length}名 完了
                {liveStatus.activeAgents.filter(a => a.status === 'warning').length > 0 && (
                  <span className="text-amber-400"> / {liveStatus.activeAgents.filter(a => a.status === 'warning').length}名 警告</span>
                )}
              </div>
            </div>
          )}
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

      {/* Files panel */}
      {panelTab === 'files' && (
        <div className="border-t border-white/10 max-h-52 overflow-y-auto px-4 py-2 bg-black/40">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
            {files.map(f => (
              <button key={f.name}
                onClick={() => setPreviewFile(`${outputDir}/${f.name}`)}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-indigo-500/15 rounded-lg text-left cursor-pointer transition-colors group">
                <span className="text-base">{fileIcon(f.name)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white/80 truncate group-hover:text-indigo-300 transition-colors">{f.name}</div>
                  <div className="text-[10px] text-white/30">{(f.size / 1024).toFixed(1)}KB</div>
                </div>
                <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">表示</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Log panel */}
      {panelTab === 'log' && (
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

      {/* File preview modal */}
      {previewFile && (
        <FilePreviewModal filePath={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
}
