import { useState, useMemo } from 'react';
import type { ExecutionRecord, ExecutionAction, ReviewData, ReviewSuggestion } from '../hooks/useExecutionHistory';
import { FilePreviewModal } from './FilePreviewModal';

interface Props {
  records: ExecutionRecord[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onRetry?: (record: ExecutionRecord) => void;
  theme: { bg: string; surface: string; border: string; text: string; muted: string };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'たった今';
  if (min < 60) return `${min}分前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  return `${d}日前`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; label: string; icon: string }> = {
    running: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', label: '実行中', icon: '⏳' },
    done: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: '成功', icon: '✅' },
    error: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'エラー', icon: '❌' },
  };
  const s = styles[status] ?? styles.error;
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${s.bg} ${s.text}`}>
      <span>{s.icon}</span> {s.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { icon: string; label: string; color: string }> = {
    company: { icon: '🏢', label: '全工程', color: 'bg-indigo-500/15 text-indigo-300' },
    mtg: { icon: '💬', label: 'MTG', color: 'bg-amber-500/15 text-amber-300' },
    escalation: { icon: '📨', label: '相談', color: 'bg-cyan-500/15 text-cyan-300' },
  };
  const t = map[type] ?? map.company;
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.color}`}>
      {t.icon} {t.label}
    </span>
  );
}

function ActionIcon({ type }: { type: ExecutionAction['type'] }) {
  const icons: Record<string, { icon: string; color: string }> = {
    start: { icon: '🚀', color: 'bg-indigo-500/30' },
    phase: { icon: '📋', color: 'bg-violet-500/30' },
    agent: { icon: '👤', color: 'bg-blue-500/30' },
    file: { icon: '📄', color: 'bg-emerald-500/30' },
    slack: { icon: '💬', color: 'bg-amber-500/30' },
    mtg: { icon: '🗣️', color: 'bg-orange-500/30' },
    done: { icon: '🏆', color: 'bg-emerald-500/40' },
    error: { icon: '⚠️', color: 'bg-red-500/30' },
  };
  const i = icons[type] ?? { icon: '·', color: 'bg-white/10' };
  return (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${i.color}`}>
      {i.icon}
    </div>
  );
}

function ActionTimeline({ actions, theme }: { actions: ExecutionAction[]; theme: Props['theme'] }) {
  return (
    <div className="relative pl-4">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-3 bottom-3 w-px" style={{ background: theme.border }} />
      <div className="space-y-2">
        {actions.map((a, i) => (
          <div key={i} className="flex items-center gap-3 relative">
            <ActionIcon type={a.type} />
            <div className="flex-1 min-w-0">
              <span className={`text-xs ${a.type === 'done' ? 'text-emerald-400 font-bold' : a.type === 'error' ? 'text-red-400' : 'text-white/80'}`}>
                {a.label}
              </span>
            </div>
            <span className="text-[9px] font-mono shrink-0" style={{ color: theme.muted }}>
              {formatTime(a.time)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Stats summary across all records ── */
function OverallStats({ records, theme }: { records: ExecutionRecord[]; theme: Props['theme'] }) {
  const stats = useMemo(() => {
    const total = records.length;
    const success = records.filter(r => r.status === 'done').length;
    const failed = records.filter(r => r.status === 'error').length;
    const totalFiles = records.reduce((s, r) => s + r.files.length, 0);
    const durations = records.filter(r => r.durationSec != null).map(r => r.durationSec!);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
    const totalDuration = durations.reduce((a, b) => a + b, 0);
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
    return { total, success, failed, totalFiles, avgDuration, totalDuration, successRate };
  }, [records]);

  if (records.length === 0) return null;

  return (
    <div className="grid grid-cols-4 gap-2 px-4 py-3 border-b" style={{ borderColor: theme.border }}>
      <div className="text-center">
        <div className="text-lg font-bold">{stats.total}</div>
        <div className="text-[9px]" style={{ color: theme.muted }}>総実行</div>
      </div>
      <div className="text-center">
        <div className={`text-lg font-bold ${stats.successRate >= 80 ? 'text-emerald-400' : stats.successRate >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
          {stats.successRate}%
        </div>
        <div className="text-[9px]" style={{ color: theme.muted }}>成功率</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold">{stats.totalFiles}</div>
        <div className="text-[9px]" style={{ color: theme.muted }}>生成ファイル</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold">{stats.avgDuration ? formatDuration(stats.avgDuration) : '-'}</div>
        <div className="text-[9px]" style={{ color: theme.muted }}>平均所要</div>
      </div>
    </div>
  );
}

/* ── Record card in list ── */
function RecordCard({ record, selected, onClick, theme }: {
  record: ExecutionRecord; selected: boolean; onClick: () => void; theme: Props['theme'];
}) {
  const r = record;
  const agentCount = r.actions.filter(a => a.type === 'agent' && a.label.includes('開始')).length;
  const phaseCount = r.actions.filter(a => a.type === 'phase').length;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b cursor-pointer transition-all
        ${selected ? 'bg-indigo-500/10 border-l-2 border-l-indigo-400' : 'hover:bg-white/5 border-l-2 border-l-transparent'}`}
      style={{ borderBottomColor: theme.border }}>
      {/* Top row: badges + time */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <TypeBadge type={r.type} />
        <StatusBadge status={r.status} />
        <span className="text-[10px] ml-auto" style={{ color: theme.muted }}>
          {relativeTime(r.startedAt)}
        </span>
      </div>

      {/* Label */}
      <div className="text-sm font-bold truncate mb-1.5">{r.label || '(無題)'}</div>

      {/* Stats row */}
      <div className="flex items-center gap-2 flex-wrap">
        {r.durationSec != null && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 inline-flex items-center gap-1" style={{ color: theme.muted }}>
            ⏱ {formatDuration(r.durationSec)}
          </span>
        )}
        {r.files.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 inline-flex items-center gap-1" style={{ color: theme.muted }}>
            📄 {r.files.length}
          </span>
        )}
        {agentCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 inline-flex items-center gap-1" style={{ color: theme.muted }}>
            👤 {agentCount}名
          </span>
        )}
        {phaseCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 inline-flex items-center gap-1" style={{ color: theme.muted }}>
            📋 {phaseCount}P
          </span>
        )}
        {r.slackSent && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">
            💬 Slack
          </span>
        )}
      </div>

      {/* Duration bar */}
      {r.durationSec != null && r.status === 'done' && (
        <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-emerald-400/40"
            style={{ width: `${Math.min(100, (r.durationSec / 600) * 100)}%` }} />
        </div>
      )}
    </button>
  );
}

/* ── Grade badge ── */
function GradeBadge({ grade }: { grade: string }) {
  const styles: Record<string, string> = {
    S: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-lg shadow-yellow-500/30',
    A: 'bg-gradient-to-r from-emerald-400 to-green-500 text-black shadow-lg shadow-emerald-500/30',
    B: 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-lg shadow-blue-500/30',
    C: 'bg-gradient-to-r from-orange-400 to-amber-500 text-black shadow-lg shadow-orange-500/30',
    D: 'bg-gradient-to-r from-red-400 to-rose-500 text-white shadow-lg shadow-red-500/30',
  };
  return (
    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black ${styles[grade] ?? styles.D}`}>
      {grade}
    </div>
  );
}

/* ── Agent performance bar ── */
function AgentBar({ agent, maxDuration, theme }: {
  agent: { id: string; name: string; status: string; model: string; maxTurns: number; duration: number };
  maxDuration: number;
  theme: Props['theme'];
}) {
  const statusColors: Record<string, { bar: string; badge: string; label: string }> = {
    ok: { bar: 'bg-emerald-500/60', badge: 'bg-emerald-500/20 text-emerald-400', label: '完了' },
    maxturns: { bar: 'bg-amber-500/60', badge: 'bg-amber-500/20 text-amber-400', label: 'ターン上限' },
    timeout: { bar: 'bg-orange-500/60', badge: 'bg-orange-500/20 text-orange-400', label: 'タイムアウト' },
    error: { bar: 'bg-red-500/60', badge: 'bg-red-500/20 text-red-400', label: 'エラー' },
  };
  const s = statusColors[agent.status] ?? statusColors.error;
  const widthPct = maxDuration > 0 ? Math.min(100, (agent.duration / maxDuration) * 100) : 0;
  const displayName = agent.name.replace(/[🚀🍸👔💼📊🔬⚡🎯🛡️✨📝🎨💡🗡️]/g, '').trim().split(' ').slice(0, 2).join(' ');

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold truncate">{displayName}</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${s.badge}`}>{s.label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0" style={{ color: theme.muted }}>
          <span className="font-mono">{formatDuration(agent.duration)}</span>
          <span className="text-[9px] opacity-60">{agent.model}</span>
        </div>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${s.bar} transition-all`} style={{ width: `${widthPct}%` }} />
      </div>
    </div>
  );
}

/* ── Suggestion card ── */
function SuggestionCard({ suggestion, theme }: { suggestion: ReviewSuggestion; theme: Props['theme'] }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  const severityStyles: Record<string, string> = {
    success: 'border-emerald-500/30 bg-emerald-500/5',
    info: 'border-blue-500/30 bg-blue-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    critical: 'border-red-500/30 bg-red-500/5',
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(suggestion.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-lg border p-3 ${severityStyles[suggestion.severity] ?? severityStyles.info}`}>
      <div className="flex items-start gap-2">
        <span className="text-lg shrink-0">{suggestion.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold mb-0.5">{suggestion.title}</div>
          <div className="text-[11px] leading-relaxed" style={{ color: theme.muted }}>{suggestion.desc}</div>
          {suggestion.prompt && (
            <div className="mt-2">
              <button
                onClick={() => setShowPrompt(!showPrompt)}
                className="text-[10px] px-2 py-1 bg-white/10 hover:bg-white/15 rounded cursor-pointer transition-colors font-medium inline-flex items-center gap-1">
                {showPrompt ? '▼' : '▶'} 改善プロンプト
              </button>
              {showPrompt && (
                <div className="mt-2 relative">
                  <code className="block bg-black/40 text-green-400 text-[11px] px-3 py-2.5 rounded-lg font-mono break-all leading-relaxed">
                    {suggestion.prompt}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="absolute top-1.5 right-1.5 text-[9px] px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded cursor-pointer transition-colors">
                    {copied ? '✓ コピー済' : '📋 コピー'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Review panel ── */
function ReviewPanel({ review, theme }: { review: ReviewData; theme: Props['theme'] }) {
  const maxDuration = Math.max(...review.agents.map(a => a.duration), 1);

  return (
    <div className="space-y-5">
      {/* Header with grade */}
      <div className="flex items-center gap-4">
        <GradeBadge grade={review.grade} />
        <div>
          <div className="text-lg font-bold">パフォーマンスレビュー</div>
          <div className="text-xs" style={{ color: theme.muted }}>
            成功率 {review.successRate}% / {review.total}エージェント / {formatDuration(review.totalDuration)}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: '成功', value: review.success, color: 'text-emerald-400' },
          { label: 'ターン上限', value: review.maxturns, color: review.maxturns > 0 ? 'text-amber-400' : 'text-white/30' },
          { label: 'タイムアウト', value: review.timeouts, color: review.timeouts > 0 ? 'text-orange-400' : 'text-white/30' },
          { label: 'エラー', value: review.errors, color: review.errors > 0 ? 'text-red-400' : 'text-white/30' },
          { label: '合計', value: review.total, color: 'text-white' },
        ].map(s => (
          <div key={s.label} className="p-2 rounded-lg bg-white/5 text-center">
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[9px]" style={{ color: theme.muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Agent performance */}
      {review.agents.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: theme.muted }}>
            エージェント別パフォーマンス
          </h4>
          <div className="space-y-2.5">
            {review.agents.map(a => (
              <AgentBar key={a.id} agent={a} maxDuration={maxDuration} theme={theme} />
            ))}
          </div>
        </div>
      )}

      {/* Improvement suggestions */}
      {review.suggestions.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: theme.muted }}>
            改善提案
          </h4>
          <div className="space-y-2">
            {review.suggestions.map((s, i) => (
              <SuggestionCard key={i} suggestion={s} theme={theme} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Detail panel ── */
function DetailPanel({ record, onDelete, onRetry, onPreview, theme }: {
  record: ExecutionRecord; onDelete: () => void; onRetry?: () => void; onPreview: (path: string) => void; theme: Props['theme'];
}) {
  const r = record;
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'files' | 'review'>(r.review ? 'review' : 'overview');

  const agentEvents = r.actions.filter(a => a.type === 'agent');
  const agents = useMemo(() => {
    const map = new Map<string, { name: string; started?: string; completed?: string }>();
    for (const ev of agentEvents) {
      const name = ev.label.replace(/ (開始|完了)$/, '');
      const entry = map.get(name) || { name };
      if (ev.label.endsWith('開始')) entry.started = ev.time;
      if (ev.label.endsWith('完了')) entry.completed = ev.time;
      map.set(name, entry);
    }
    return [...map.values()];
  }, [agentEvents]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center gap-2 mb-1.5">
          <TypeBadge type={r.type} />
          <StatusBadge status={r.status} />
        </div>
        <h2 className="text-base font-bold mb-1 break-all">{r.label || '(無題)'}</h2>
        <div className="flex items-center justify-between">
          <div className="text-[10px] flex items-center gap-3" style={{ color: theme.muted }}>
            <span>{formatDate(r.startedAt)}</span>
            {r.finishedAt && <span>→ {formatDate(r.finishedAt)}</span>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onRetry && r.status !== 'running' && (
              <button onClick={onRetry}
                className="text-[10px] px-2 py-1 bg-indigo-500/15 text-indigo-400 rounded hover:bg-indigo-500/25 cursor-pointer transition-colors font-bold">
                🔄 再実行
              </button>
            )}
            <button onClick={onDelete}
              className="text-[10px] px-2 py-1 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 cursor-pointer transition-colors">
              🗑
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-2 p-4 border-b" style={{ borderColor: theme.border }}>
        <div className="p-2.5 rounded-lg bg-white/5 text-center">
          <div className="text-base font-bold">
            {r.durationSec != null ? formatDuration(r.durationSec) : '-'}
          </div>
          <div className="text-[9px] mt-0.5" style={{ color: theme.muted }}>所要時間</div>
        </div>
        <div className="p-2.5 rounded-lg bg-white/5 text-center">
          <div className="text-base font-bold">{r.files.length}</div>
          <div className="text-[9px] mt-0.5" style={{ color: theme.muted }}>ファイル</div>
        </div>
        <div className="p-2.5 rounded-lg bg-white/5 text-center">
          <div className="text-base font-bold">{agents.length}</div>
          <div className="text-[9px] mt-0.5" style={{ color: theme.muted }}>参加者</div>
        </div>
        <div className="p-2.5 rounded-lg bg-white/5 text-center">
          <div className="text-base font-bold">{r.logLineCount}</div>
          <div className="text-[9px] mt-0.5" style={{ color: theme.muted }}>ログ行</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b" style={{ borderColor: theme.border }}>
        {[
          ...(r.review ? [{ id: 'review' as const, label: 'レビュー', icon: '🏆' }] : []),
          { id: 'overview' as const, label: '概要', icon: '📊' },
          { id: 'timeline' as const, label: 'タイムライン', icon: '📋' },
          { id: 'files' as const, label: `ファイル (${r.files.length})`, icon: '📄' },
        ].map(tab => (
          <button key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-[11px] font-medium cursor-pointer transition-colors
              ${activeTab === tab.id ? 'bg-indigo-500/10 text-indigo-300 border-b-2 border-indigo-400' : 'hover:bg-white/5 text-white/50'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'review' && r.review && (
          <ReviewPanel review={r.review} theme={theme} />
        )}

        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Error */}
            {r.errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-start gap-2">
                <span className="text-base">⚠️</span>
                <span>{r.errorMessage}</span>
              </div>
            )}

            {/* Agent participation */}
            {agents.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: theme.muted }}>
                  参加エージェント
                </h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {agents.map((a, i) => {
                    const dur = a.started && a.completed
                      ? Math.round((new Date(a.completed).getTime() - new Date(a.started).getTime()) / 1000)
                      : null;
                    return (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 text-xs">
                        <span className={`w-2 h-2 rounded-full ${a.completed ? 'bg-emerald-400' : a.started ? 'bg-indigo-400 animate-pulse' : 'bg-white/20'}`} />
                        <span className="flex-1 truncate font-medium">{a.name}</span>
                        {dur != null && (
                          <span className="text-[9px] font-mono" style={{ color: theme.muted }}>
                            {formatDuration(dur)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Output directory */}
            {r.outputDir && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: theme.muted }}>
                  出力先
                </h4>
                <code className="block bg-black/30 text-emerald-400 text-[11px] px-3 py-2 rounded-lg font-mono">
                  {r.outputDir}
                </code>
              </div>
            )}

            {/* Args */}
            {Object.keys(r.args).length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: theme.muted }}>
                  実行パラメータ
                </h4>
                <div className="bg-white/5 rounded-lg p-3 space-y-1">
                  {Object.entries(r.args).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-[10px] w-20 shrink-0" style={{ color: theme.muted }}>{k}</span>
                      <span className="truncate">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Slack */}
            {r.slackSent && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400">
                <span>💬</span>
                <span>Slack通知送信済み</span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          r.actions.length > 0 ? (
            <ActionTimeline actions={r.actions} theme={theme} />
          ) : (
            <div className="text-center py-8 text-sm" style={{ color: theme.muted }}>
              タイムラインデータなし
            </div>
          )
        )}

        {activeTab === 'files' && (
          r.files.length > 0 ? (
            <div className="space-y-1.5">
              {r.files.map((f, i) => {
                const name = f.split('/').pop() || f;
                const isMarkdown = name.endsWith('.md');
                const isJson = name.endsWith('.json');
                return (
                  <button key={i}
                    onClick={() => onPreview(f)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 bg-white/5 hover:bg-indigo-500/15 rounded-lg cursor-pointer transition-all group text-left">
                    <span className="text-xl">
                      {isMarkdown ? '📝' : isJson ? '📊' : name.endsWith('.html') ? '🌐' : name.endsWith('.sql') ? '🗄️' : '📄'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium group-hover:text-indigo-300 transition-colors truncate">{name}</div>
                      <div className="text-[10px] font-mono truncate" style={{ color: theme.muted }}>{f}</div>
                    </div>
                    <span className="text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 px-2 py-1 bg-indigo-500/20 rounded">
                      表示
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-sm" style={{ color: theme.muted }}>
              生成ファイルなし
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ── Main component ── */
export function ExecutionHistory({ records, onDelete, onClearAll, onRetry, theme }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(records[0]?.id ?? null);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'done' | 'error'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'company' | 'mtg' | 'escalation'>('all');
  const [search, setSearch] = useState('');
  // 選択中のレコードが消えた or 未選択なら直近を自動選択
  const selected = records.find(r => r.id === selectedId) ?? records[0] ?? null;

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchLabel = r.label.toLowerCase().includes(q);
        const matchArgs = Object.values(r.args).some(v => String(v).toLowerCase().includes(q));
        const matchFiles = r.files.some(f => f.toLowerCase().includes(q));
        const matchActions = r.actions.some(a => a.label.toLowerCase().includes(q));
        if (!matchLabel && !matchArgs && !matchFiles && !matchActions) return false;
      }
      return true;
    });
  }, [records, statusFilter, typeFilter, search]);

  return (
    <div className="flex gap-4 h-full min-w-0">
      {/* List */}
      <div className="w-[360px] shrink-0 rounded-xl flex flex-col"
        style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
          <h3 className="font-bold text-sm">実行履歴</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: theme.muted }}>
              {filtered.length !== records.length ? `${filtered.length}/${records.length}件` : `${records.length}件`}
            </span>
            {records.length > 0 && (
              <button onClick={onClearAll}
                className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 cursor-pointer transition-colors">
                全削除
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <OverallStats records={records} theme={theme} />

        {/* Search & Filters */}
        {records.length > 0 && (
          <div className="px-3 py-2 border-b space-y-1.5" style={{ borderColor: theme.border }}>
            {/* Search */}
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30 text-xs">🔍</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="キーワード検索..."
                className="w-full pl-7 pr-7 py-1.5 rounded-lg bg-white/5 text-xs text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-indigo-400/50"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs cursor-pointer">
                  ✕
                </button>
              )}
            </div>
            {/* Status filter */}
            <div className="flex gap-1">
              {[
                { id: 'all' as const, label: 'すべて' },
                { id: 'done' as const, label: '✅ 成功' },
                { id: 'error' as const, label: '❌ エラー' },
              ].map(f => (
                <button key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2 py-1 rounded text-[10px] cursor-pointer transition-colors
                    ${statusFilter === f.id ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                  {f.label}
                </button>
              ))}
            </div>
            {/* Type filter */}
            <div className="flex gap-1">
              {[
                { id: 'all' as const, label: '全種別' },
                { id: 'company' as const, label: '🏢 全工程' },
                { id: 'mtg' as const, label: '💬 MTG' },
                { id: 'escalation' as const, label: '📨 相談' },
              ].map(f => (
                <button key={f.id}
                  onClick={() => setTypeFilter(f.id)}
                  className={`px-2 py-1 rounded text-[10px] cursor-pointer transition-colors
                    ${typeFilter === f.id ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Records list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full" style={{ color: theme.muted }}>
              <div className="text-center space-y-2 py-12">
                <span className="text-4xl block">📋</span>
                <p className="text-sm">{records.length === 0 ? 'まだ実行履歴がありません' : '該当する履歴なし'}</p>
                <p className="text-xs">指示を実行すると履歴が記録されます</p>
              </div>
            </div>
          ) : (
            filtered.map(r => (
              <RecordCard key={r.id} record={r} selected={selectedId === r.id}
                onClick={() => setSelectedId(r.id)} theme={theme} />
            ))
          )}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 min-w-0 rounded-xl overflow-hidden"
        style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        {selected ? (
          <DetailPanel
            record={selected}
            onDelete={() => { onDelete(selected.id); setSelectedId(null); }}
            onRetry={onRetry ? () => onRetry(selected) : undefined}
            onPreview={setPreviewFile}
            theme={theme}
          />
        ) : (
          <div className="h-full flex items-center justify-center" style={{ color: theme.muted }}>
            <div className="text-center space-y-2 py-12">
              <span className="text-4xl block">📋</span>
              <p className="text-sm">履歴を選択すると詳細が表示されます</p>
            </div>
          </div>
        )}
      </div>

      {/* File preview modal */}
      {previewFile && (
        <FilePreviewModal filePath={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
}
