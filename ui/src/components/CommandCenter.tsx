import { useState, useMemo, useEffect } from 'react';
import type { Agent } from '../types';
import type { RelayState } from '../hooks/useRelay';
import { AutoTextarea } from './AutoTextarea';
import type { FileAttachment } from './AutoTextarea';
import type { ExecutionRecord } from '../hooks/useExecutionHistory';
import { ExecutionHistory } from './ExecutionHistory';
import { RouteSelector } from './RouteSelector';
import { recommendRoutes } from '../lib/routeRecommender';
import type { RouteOption } from '../lib/routeRecommender';

interface Props {
  agents: Agent[];
  theme: { bg: string; surface: string; border: string; text: string; muted: string };
  relay: RelayState & {
    execute: (type: string, args: Record<string, string | number>) => void;
    reset: () => void;
    checkConnection: () => Promise<boolean>;
  };
  onExecute: (label: string, type: 'company' | 'mtg', args: Record<string, string | number | string[]>) => void;
  history: ExecutionRecord[];
  onDeleteHistory: (id: string) => void;
  onClearHistory: () => void;
}

const MTG_TYPES = [
  { id: 'kickoff', label: 'キックオフ', desc: 'プロジェクト立ち上げ' },
  { id: 'req-review', label: '要件レビュー', desc: '要件定義の確認' },
  { id: 'design-review', label: '設計レビュー', desc: 'アーキテクチャ確認' },
  { id: 'ui-review', label: 'UI/UXレビュー', desc: '画面デザイン確認' },
  { id: 'code-review', label: 'コードレビュー', desc: 'ソースコード確認' },
  { id: 'final-review', label: '最終レビュー', desc: '納品前の最終確認' },
  { id: 'brainstorm', label: 'ブレスト', desc: '自由なアイデア出し' },
];

type Mode = 'company' | 'mtg' | 'history';

export function CommandCenter({ agents, theme, relay, onExecute, history, onDeleteHistory, onClearHistory }: Props) {
  const [mode, setMode] = useState<Mode>('company');

  const [companyTheme, setCompanyTheme] = useState(
    () => localStorage.getItem('cc-draft-theme') ?? ''
  );
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [mtgType, setMtgType] = useState('kickoff');
  const [mtgAgenda, setMtgAgenda] = useState(
    () => localStorage.getItem('cc-draft-agenda') ?? ''
  );
  const [mtgRounds, setMtgRounds] = useState(3);
  const [mtgConflict, setMtgConflict] = useState('chair');

  // 下書きをlocalStorageに自動保存
  useEffect(() => {
    localStorage.setItem('cc-draft-theme', companyTheme);
  }, [companyTheme]);
  useEffect(() => {
    localStorage.setItem('cc-draft-agenda', mtgAgenda);
  }, [mtgAgenda]);
  const [sendToSlack, setSendToSlack] = useState(false);
  const [slackWebhook, setSlackWebhook] = useState('');

  useEffect(() => {
    setSlackWebhook(localStorage.getItem('ai-company-slack-webhook') ?? '');
  }, []);

  // テーマ入力に応じてルートを再計算
  const routes = useMemo(() => {
    if (!companyTheme.trim()) return [];
    return recommendRoutes(companyTheme, agents);
  }, [companyTheme, agents]);

  // ルート選択時の実行ハンドラ
  const handleRouteSelect = (route: RouteOption, requirementNotes?: string) => {
    if (!companyTheme.trim()) return;
    let fullTheme = companyTheme;
    if (attachedFiles.length > 0) {
      const fileSection = attachedFiles.map(f => `--- ${f.name} ---\n${f.content}`).join('\n\n');
      fullTheme += `\n\n【添付ファイル】\n${fileSection}`;
    }
    const theme_with_notes = requirementNotes
      ? `${fullTheme}\n\n【要件ポイント】\n${requirementNotes}`
      : fullTheme;
    const args: Record<string, string | number | string[]> = {
      theme: theme_with_notes,
      routeType: route.type,
      depth: route.depth,
      agents: route.agents.join(','),
      model: route.model,
      maxTurns: route.maxTurns,
    };
    if (sendToSlack && slackWebhook) args.slackWebhook = slackWebhook;
    relay.execute('company', args as Record<string, string | number>);
    onExecute(`${route.icon} ${route.label}: ${companyTheme}`, 'company', args);
    localStorage.removeItem('cc-draft-theme');
  };

  // 実行履歴から再実行
  const handleRetry = (record: ExecutionRecord) => {
    if (!relay.connected) return;
    const args = record.args as Record<string, string | number>;
    relay.execute(record.type, args);
    const baseLabel = record.label.replace(/^(🔄\s*再実行:\s*)+/, '');
    onExecute(`🔄 再実行: ${baseLabel}`, record.type as 'company' | 'mtg', record.args);
  };

  const handleMtgStart = () => {
    if (!mtgAgenda.trim()) return;
    const args = { type: mtgType, agenda: mtgAgenda, rounds: mtgRounds, conflict: mtgConflict };
    relay.execute('mtg', args);
    const label = MTG_TYPES.find(t => t.id === mtgType)?.label ?? mtgType;
    onExecute(`${label}: ${mtgAgenda}`, 'mtg', args);
    localStorage.removeItem('cc-draft-agenda');
  };

  return (
    <div className="flex gap-6 h-full min-w-0">
      {/* Left sidebar */}
      <div className="w-60 shrink-0 space-y-4">
        {/* Connection */}
        <div className="rounded-xl p-4"
          style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-3 h-3 rounded-full ${relay.connected ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-red-400 shadow-lg shadow-red-400/50'}`} />
            <span className="font-bold text-sm">
              {relay.connected ? 'リレー接続済み' : 'リレー未接続'}
            </span>
          </div>
          {!relay.connected && (
            <div className="space-y-2">
              <p className="text-xs" style={{ color: theme.muted }}>
                ターミナルで以下を実行してください:
              </p>
              <code className="block bg-black/30 text-green-400 text-xs px-3 py-2 rounded font-mono">
                node relay.js
              </code>
              <button
                onClick={() => relay.checkConnection()}
                className="w-full py-2 bg-white/10 hover:bg-white/20 rounded text-xs cursor-pointer transition-colors">
                再接続
              </button>
            </div>
          )}
          {relay.connected && (
            <p className="text-xs" style={{ color: theme.muted }}>
              localhost:3939 に接続済み。UIからコマンドを実行できます。
            </p>
          )}
        </div>

        {/* Mode select */}
        <div className="rounded-xl p-4 space-y-2"
          style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <h3 className="text-xs font-bold opacity-40 uppercase tracking-wider">メニュー</h3>
          {[
            { id: 'company' as const, icon: '🏢', label: '全工程実行', desc: 'テーマを入力して全エージェントで開発' },
            { id: 'mtg' as const, icon: '💬', label: 'MTG開催', desc: '議題を設定して会議を実行' },
            { id: 'history' as const, icon: '📋', label: `実行履歴 (${history.length})`, desc: '過去の実行結果を閲覧' },
          ].map(m => (
            <button key={m.id}
              onClick={() => setMode(m.id)}
              className={`w-full text-left p-3 rounded-lg cursor-pointer transition-all
                ${mode === m.id ? 'bg-indigo-500/15 ring-1 ring-indigo-400/40' : 'bg-white/5 hover:bg-white/10'}`}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{m.icon}</span>
                <div>
                  <div className="text-sm font-bold">{m.label}</div>
                  <div className="text-[10px]" style={{ color: theme.muted }}>{m.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

      </div>

      {/* Right: Content area */}
      {mode === 'history' ? (
        <div className="flex-1 min-w-0">
          <ExecutionHistory
            records={history}
            onDelete={onDeleteHistory}
            onClearAll={onClearHistory}
            onRetry={relay.connected ? handleRetry : undefined}
            theme={theme}
          />
        </div>
      ) : (
        <div className="flex-1 rounded-xl"
          style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>

          {mode === 'company' && (
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-1">全工程実行</h2>
                <p className="text-sm" style={{ color: theme.muted }}>
                  テーマを入力すると、実行ルートが表示されます
                </p>
              </div>

              <div>
                <label className="text-sm font-bold block mb-2">テーマ / 指示</label>
                <AutoTextarea
                  value={companyTheme}
                  onChange={v => setCompanyTheme(v)}
                  placeholder="例: 顧客ランク別割引機能を追加したい&#10;&#10;ファイルをペースト or ドラッグ＆ドロップで添付できます"
                  minRows={3}
                  maxRows={16}
                  onFiles={files => setAttachedFiles(prev => [...prev, ...files])}
                  autoFocus
                />
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {attachedFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-xs text-indigo-300">
                        <span>📄</span>
                        <span className="truncate max-w-[200px]">{f.name}</span>
                        <span className="text-white/30">({(f.size / 1024).toFixed(1)}KB)</span>
                        <button
                          onClick={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))}
                          className="ml-1 text-white/30 hover:text-red-400 transition cursor-pointer">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* リレー未接続の警告 */}
              {!relay.connected && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                  リレー未接続。ターミナルで <code className="bg-black/30 px-1.5 py-0.5 rounded font-mono text-xs">node relay.js</code> を起動してください
                </div>
              )}

              {/* テーマ未入力時のプレースホルダー */}
              {!companyTheme.trim() && (
                <div className="p-8 text-center rounded-lg bg-white/5">
                  <p className="text-sm" style={{ color: theme.muted }}>
                    テーマを入力すると実行ルートが表示されます
                  </p>
                </div>
              )}

              {/* Slack送信オプション（webhook設定済みの場合のみ表示） */}
              {slackWebhook && companyTheme.trim() && (
                <div className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ background: sendToSlack ? 'rgba(79,70,229,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${sendToSlack ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                  <button
                    onClick={() => setSendToSlack(v => !v)}
                    className={`relative inline-flex w-9 h-5 rounded-full transition-colors cursor-pointer shrink-0 ${sendToSlack ? 'bg-indigo-500' : 'bg-white/20'}`}
                    aria-label="Slackに送信"
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${sendToSlack ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <span>完了後にSlackへ送信</span>
                      {sendToSlack && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">ON</span>}
                    </div>
                    <div className="text-[10px] opacity-40 mt-0.5">
                      最終報告書（secretary-report.md）をSlackに送信します
                    </div>
                  </div>
                </div>
              )}

              {/* テーマ入力済みならRouteSelector表示 */}
              {companyTheme.trim() && routes.length > 0 && (
                <RouteSelector
                  agents={agents}
                  routes={routes}
                  theme={theme}
                  onSelect={handleRouteSelect}
                />
              )}
            </div>
          )}

          {mode === 'mtg' && (
            <div className="p-6 space-y-5">
              <div>
                <h2 className="text-xl font-bold mb-1">MTG開催</h2>
                <p className="text-sm" style={{ color: theme.muted }}>
                  議題と設定を入力して会議を開始します
                </p>
              </div>

              <div>
                <label className="text-sm font-bold block mb-2">MTG種別</label>
                <div className="grid grid-cols-4 gap-2">
                  {MTG_TYPES.map(t => (
                    <button key={t.id}
                      onClick={() => setMtgType(t.id)}
                      className={`p-2 rounded-lg text-xs cursor-pointer transition-all text-center
                        ${mtgType === t.id ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-400/50' : 'bg-white/5 hover:bg-white/10'}`}>
                      <div className="font-bold">{t.label}</div>
                      <div className="text-[10px] opacity-50 mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold block mb-2">議題</label>
                <AutoTextarea
                  value={mtgAgenda}
                  onChange={setMtgAgenda}
                  placeholder="議題を入力..."
                  minRows={2}
                  maxRows={8}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold block mb-1">ラウンド数</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min={2} max={10} value={mtgRounds}
                      onChange={e => setMtgRounds(Number(e.target.value))}
                      className="flex-1" />
                    <span className="text-lg font-bold w-8 text-center">{mtgRounds}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold block mb-1">対立解決</label>
                  <select value={mtgConflict} onChange={e => setMtgConflict(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm">
                    <option value="chair">議長判断</option>
                    <option value="majority">多数決</option>
                    <option value="consensus">全員合意</option>
                    <option value="both">両論併記</option>
                  </select>
                </div>
              </div>

              {!relay.connected && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                  リレー未接続。ターミナルで <code className="bg-black/30 px-1.5 py-0.5 rounded font-mono text-xs">node relay.js</code> を起動してください
                </div>
              )}
              <button
                onClick={handleMtgStart}
                disabled={!mtgAgenda.trim() || !relay.connected}
                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold text-lg
                  hover:from-indigo-600 hover:to-purple-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer
                  transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40">
                💬 MTG開始
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
