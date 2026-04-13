import { useState } from 'react';
import type { Agent } from '../types';
import type { RelayState } from '../hooks/useRelay';
import { PixelCharacter } from './PixelCharacter';

interface Props {
  agents: Agent[];
  theme: { bg: string; surface: string; border: string; text: string; muted: string };
  relay: RelayState & {
    execute: (type: string, args: Record<string, string | number>) => void;
    reset: () => void;
    checkConnection: () => Promise<boolean>;
  };
  onExecute: (label: string) => void;
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

type Mode = 'select' | 'company' | 'mtg';

export function CommandCenter({ agents, theme, relay, onExecute }: Props) {
  const [mode, setMode] = useState<Mode>('select');

  // 全工程
  const [companyTheme, setCompanyTheme] = useState('');

  // MTG
  const [mtgType, setMtgType] = useState('kickoff');
  const [mtgAgenda, setMtgAgenda] = useState('');
  const [mtgRounds, setMtgRounds] = useState(3);
  const [mtgConflict, setMtgConflict] = useState('chair');

  const handleCompanyStart = () => {
    if (!companyTheme.trim()) return;
    relay.execute('company', { theme: companyTheme });
    onExecute(`全工程実行: ${companyTheme}`);
  };

  const handleMtgStart = () => {
    if (!mtgAgenda.trim()) return;
    relay.execute('mtg', { type: mtgType, agenda: mtgAgenda, rounds: mtgRounds, conflict: mtgConflict });
    const label = MTG_TYPES.find(t => t.id === mtgType)?.label ?? mtgType;
    onExecute(`${label}: ${mtgAgenda}`);
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Connection status + mode select */}
      <div className="w-72 shrink-0 space-y-4">
        {/* Connection */}
        <div className="rounded-xl p-4"
          style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-3 h-3 rounded-full ${relay.connected ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-red-400 shadow-lg shadow-red-400/50'}`} />
            <span className="font-bold text-sm">
              {relay.connected ? 'リレー接続中' : 'リレー未接続'}
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
          <h3 className="text-xs font-bold opacity-40 uppercase tracking-wider">実行モード</h3>
          {[
            { id: 'company' as const, icon: '🏢', label: '全工程実行', desc: 'テーマを入力して全エージェントで開発' },
            { id: 'mtg' as const, icon: '💬', label: 'MTG開催', desc: '議題を設定して会議を実行' },
          ].map(m => (
            <button key={m.id}
              onClick={() => setMode(m.id)}
              disabled={!relay.connected}
              className={`w-full text-left p-3 rounded-lg cursor-pointer transition-all
                ${mode === m.id ? 'bg-indigo-500/15 ring-1 ring-indigo-400/40' : 'bg-white/5 hover:bg-white/10'}
                ${!relay.connected ? 'opacity-30 cursor-not-allowed' : ''}`}>
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

        {/* Team preview */}
        <div className="rounded-xl p-4"
          style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
          <h3 className="text-xs font-bold opacity-40 uppercase tracking-wider mb-3">実行チーム</h3>
          <div className="grid grid-cols-5 gap-2">
            {agents.slice(0, 15).map(a => (
              <div key={a.id} className="flex flex-col items-center">
                <PixelCharacter visual={a.visual} size="sm" active={a.active} />
                <span className="text-[8px] mt-0.5 truncate w-full text-center" style={{ color: theme.muted }}>
                  {a.name.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Config form */}
      <div className="flex-1 rounded-xl"
        style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
        {mode === 'select' && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4" style={{ color: theme.muted }}>
              <div className="text-6xl">🚀</div>
              <h2 className="text-xl font-bold" style={{ color: theme.text }}>指示室</h2>
              <p className="text-sm">左メニューから実行モードを選択してください</p>
              {!relay.connected && (
                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-400">
                  まず <code className="bg-black/30 px-1.5 py-0.5 rounded font-mono">node relay.js</code> を起動してください
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'company' && (
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">全工程実行</h2>
              <p className="text-sm" style={{ color: theme.muted }}>
                テーマを入力すると、全エージェントが協力して開発を進めます
              </p>
            </div>

            <div>
              <label className="text-sm font-bold block mb-2">テーマ / 指示</label>
              <textarea
                value={companyTheme}
                onChange={e => setCompanyTheme(e.target.value)}
                placeholder="例: 顧客ランク別割引機能を追加したい"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-base h-32 resize-none focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition-all"
              />
            </div>

            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="text-xs font-bold opacity-40 mb-2">実行フロー</h4>
              <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: theme.muted }}>
                {['秘書整理', '企画', '設計', 'UI設計', '開発', 'QA', 'MTG', '資料', '広報', 'CEO確認'].map((step, i) => (
                  <span key={step} className="flex items-center gap-1">
                    {i > 0 && <span className="text-white/20">→</span>}
                    <span className="bg-white/10 px-2 py-0.5 rounded">{step}</span>
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={handleCompanyStart}
              disabled={!companyTheme.trim() || !relay.connected}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold text-lg
                hover:from-indigo-600 hover:to-purple-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer
                transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40">
              🚀 実行開始
            </button>
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

            {/* MTG Type */}
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

            {/* Agenda */}
            <div>
              <label className="text-sm font-bold block mb-2">議題</label>
              <textarea
                value={mtgAgenda}
                onChange={e => setMtgAgenda(e.target.value)}
                placeholder="議題を入力..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-base h-24 resize-none focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
              />
            </div>

            {/* Options */}
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
    </div>
  );
}
