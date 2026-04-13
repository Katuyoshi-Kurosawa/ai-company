import { useState } from 'react';
import type { ExecutionRecord, ExecutionAction } from '../hooks/useExecutionHistory';

interface Props {
  records: ExecutionRecord[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    running: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', label: '実行中' },
    done: { bg: 'bg-green-500/20', text: 'text-green-400', label: '完了' },
    error: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'エラー' },
  };
  const s = styles[status] ?? styles.error;
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { icon: string; label: string }> = {
    company: { icon: '🏢', label: '全工程' },
    mtg: { icon: '💬', label: 'MTG' },
    escalation: { icon: '📨', label: '相談' },
  };
  const t = map[type] ?? map.company;
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10">
      {t.icon} {t.label}
    </span>
  );
}

function ActionIcon({ type }: { type: ExecutionAction['type'] }) {
  const icons: Record<string, string> = {
    start: '🚀', phase: '📋', agent: '👤', file: '📄',
    slack: '💬', mtg: '🗣️', done: '🏆', error: '⚠️',
  };
  return <span className="text-sm">{icons[type] ?? '·'}</span>;
}

function ActionTimeline({ actions, theme }: { actions: ExecutionAction[]; theme: Props['theme'] }) {
  return (
    <div className="space-y-1 max-h-60 overflow-y-auto">
      {actions.map((a, i) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          <span className="text-[10px] font-mono shrink-0 w-16 text-right" style={{ color: theme.muted }}>
            {formatTime(a.time)}
          </span>
          <div className="flex items-center gap-1 shrink-0 w-5 justify-center">
            <div className="w-px h-3" style={{ background: theme.border }} />
          </div>
          <ActionIcon type={a.type} />
          <span className={`flex-1 ${a.type === 'done' ? 'text-green-400 font-bold' : a.type === 'error' ? 'text-red-400' : ''}`}>
            {a.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ExecutionHistory({ records, onDelete, onClearAll, theme }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = records.find(r => r.id === selectedId);

  return (
    <div className="flex gap-4 h-full">
      {/* List */}
      <div className="w-96 shrink-0 rounded-xl flex flex-col"
        style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
          <h3 className="font-bold">指示履歴</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: theme.muted }}>{records.length}件</span>
            {records.length > 0 && (
              <button onClick={onClearAll}
                className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 cursor-pointer transition-colors">
                全削除
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {records.length === 0 ? (
            <div className="flex items-center justify-center h-full" style={{ color: theme.muted }}>
              <div className="text-center space-y-2 py-12">
                <span className="text-4xl block">📋</span>
                <p className="text-sm">まだ実行履歴がありません</p>
                <p className="text-xs">指示を実行すると履歴が記録されます</p>
              </div>
            </div>
          ) : (
            records.map(r => (
              <button key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`w-full text-left px-4 py-3 border-b cursor-pointer transition-colors
                  ${selectedId === r.id ? 'bg-indigo-500/10' : 'hover:bg-white/5'}`}
                style={{ borderColor: theme.border }}>
                <div className="flex items-center gap-2 mb-1">
                  <TypeBadge type={r.type} />
                  <StatusBadge status={r.status} />
                  <span className="text-[10px] ml-auto" style={{ color: theme.muted }}>
                    {formatDate(r.startedAt)}
                  </span>
                </div>
                <div className="text-sm font-bold truncate">{r.label}</div>
                <div className="flex items-center gap-3 mt-1 text-[10px]" style={{ color: theme.muted }}>
                  {r.durationSec != null && <span>⏱️ {formatDuration(r.durationSec)}</span>}
                  <span>📄 {r.files.length}ファイル</span>
                  {r.slackSent && <span>💬 Slack送信済</span>}
                  <span>📝 {r.logLineCount}行</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 rounded-xl overflow-y-auto"
        style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        {selected ? (
          <div className="p-5 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TypeBadge type={selected.type} />
                  <StatusBadge status={selected.status} />
                </div>
                <h2 className="text-lg font-bold">{selected.label}</h2>
              </div>
              <button onClick={() => { onDelete(selected.id); setSelectedId(null); }}
                className="text-xs px-3 py-1 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 cursor-pointer transition-colors">
                削除
              </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-white/5 text-center">
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: theme.muted }}>開始</div>
                <div className="text-sm font-bold">{formatDate(selected.startedAt)}</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 text-center">
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: theme.muted }}>所要時間</div>
                <div className="text-sm font-bold">
                  {selected.durationSec != null ? formatDuration(selected.durationSec) : '-'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 text-center">
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: theme.muted }}>出力ファイル</div>
                <div className="text-sm font-bold">{selected.files.length}件</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 text-center">
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: theme.muted }}>通知</div>
                <div className="text-sm font-bold">
                  {selected.slackSent ? (
                    <span className="text-green-400">Slack送信済</span>
                  ) : (
                    <span style={{ color: theme.muted }}>なし</span>
                  )}
                </div>
              </div>
            </div>

            {/* Error */}
            {selected.errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {selected.errorMessage}
              </div>
            )}

            {/* Output directory */}
            {selected.outputDir && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.muted }}>
                  出力ディレクトリ
                </h4>
                <code className="block bg-black/30 text-green-400 text-xs px-3 py-2 rounded font-mono break-all">
                  {selected.outputDir}
                </code>
              </div>
            )}

            {/* Files */}
            {selected.files.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.muted }}>
                  生成ファイル一覧
                </h4>
                <div className="space-y-1">
                  {selected.files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded text-xs font-mono">
                      <span className="text-base">
                        {f.endsWith('.md') ? '📝' : f.endsWith('.json') ? '📊' : f.endsWith('.html') ? '🌐' : f.endsWith('.sql') ? '🗄️' : '📄'}
                      </span>
                      <span className="flex-1 break-all">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Args */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.muted }}>
                実行パラメータ
              </h4>
              <div className="bg-white/5 rounded-lg p-3 space-y-1">
                {Object.entries(selected.args).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-xs">
                    <span className="font-bold w-20 shrink-0" style={{ color: theme.muted }}>{k}</span>
                    <span>{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            {selected.actions.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.muted }}>
                  実行タイムライン
                </h4>
                <div className="bg-white/5 rounded-lg p-3">
                  <ActionTimeline actions={selected.actions} theme={theme} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center" style={{ color: theme.muted }}>
            <div className="text-center space-y-2 py-12">
              <span className="text-4xl block">📋</span>
              <p className="text-sm">履歴を選択すると詳細が表示されます</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
