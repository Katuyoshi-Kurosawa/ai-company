import { useState } from 'react';
import type React from 'react';
import type { Company, ThemeType } from '../types';
import { THEMES } from '../data/constants';
import { useTTSContext } from '../context/TTSContext';

declare const __BUILD_TIME__: string;

interface Props {
  companies: Company[];
  activeCompanyId: string;
  onSelect: (id: string) => void;
  onAdd: (name: string, industry: string, icon: string) => void;
  onDelete: (id: string) => void;
  onThemeChange: (theme: ThemeType) => void;
  currentTheme: ThemeType;
}

function SectionCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-5 space-y-4 bg-white/5 border border-white/10">
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <h3 className="font-bold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function CompanyManager({ companies, activeCompanyId, onSelect, onAdd, onDelete, onThemeChange, currentTheme }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [icon, setIcon] = useState('🏢');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const tts = useTTSContext();
  const [slackWebhook, setSlackWebhook] = useState(
    () => localStorage.getItem('ai-company-slack-webhook') ?? ''
  );
  const [slackSaved, setSlackSaved] = useState(false);

  const handleSaveSlack = () => {
    localStorage.setItem('ai-company-slack-webhook', slackWebhook);
    setSlackSaved(true);
    setTimeout(() => setSlackSaved(false), 2000);
  };

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name, industry, icon);
    setName('');
    setIndustry('');
    setIcon('🏢');
    setShowForm(false);
  };

  return (
    <div className="space-y-4">

      {/* 🏢 会社管理 */}
      <SectionCard icon="🏢" title="会社管理">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {companies.map(c => (
            <button key={c.id}
              onClick={() => onSelect(c.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors cursor-pointer
                ${c.id === activeCompanyId ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-400/50' : 'bg-white/5 hover:bg-white/10'}`}>
              <span>{c.icon}</span>
              <span>{c.name}</span>
            </button>
          ))}
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
            + 新規作成
          </button>
        </div>
        {showForm && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs opacity-40">アイコン</label>
                <input value={icon} onChange={e => setIcon(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-2xl text-center" />
              </div>
              <div>
                <label className="text-xs opacity-40">会社名</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="AI開発株式会社"
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm" />
              </div>
              <div>
                <label className="text-xs opacity-40">業種</label>
                <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="ソフトウェア開発"
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 cursor-pointer text-sm">
                作成
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 cursor-pointer text-sm">
                キャンセル
              </button>
            </div>
          </div>
        )}
        {companies.length > 1 && (
          <div>
            {confirmDelete === activeCompanyId ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-400">この会社を削除しますか？</span>
                <button onClick={() => { onDelete(activeCompanyId); setConfirmDelete(null); }}
                  className="px-3 py-1 bg-red-500 text-white rounded text-xs cursor-pointer">削除</button>
                <button onClick={() => setConfirmDelete(null)}
                  className="px-3 py-1 bg-white/10 rounded text-xs cursor-pointer">キャンセル</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(activeCompanyId)}
                className="text-xs text-red-400/60 hover:text-red-400 cursor-pointer">
                この会社を削除...
              </button>
            )}
          </div>
        )}
      </SectionCard>

      {/* 🎨 テーマ */}
      <SectionCard icon="🎨" title="テーマ">
        <div className="flex flex-wrap gap-2">
          {(Object.entries(THEMES) as [ThemeType, typeof THEMES[ThemeType]][]).map(([key, t]) => (
            <button key={key}
              onClick={() => onThemeChange(key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs cursor-pointer transition-colors
                ${currentTheme === key ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-400/50' : 'bg-white/5 hover:bg-white/10'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* 🔔 通知 */}
      <SectionCard icon="🔔" title="通知">
        <p className="text-xs opacity-40 leading-relaxed">
          実行完了後に最終報告書をSlackへ送信できます。Incoming Webhook URLを設定してください。
        </p>
        <div>
          <label className="text-xs opacity-40 block mb-1">Slack Webhook URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={slackWebhook}
              onChange={e => setSlackWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-1.5 text-xs font-mono"
            />
            <button
              onClick={handleSaveSlack}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                slackSaved ? 'bg-green-500/20 text-green-400' : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'
              }`}>
              {slackSaved ? '保存済み' : '保存'}
            </button>
          </div>
        </div>
        {slackWebhook && (
          <p className="text-[10px] text-green-400/70">
            Webhook URL設定済み。指示室の実行時に「Slackに送信」オプションが表示されます。
          </p>
        )}
      </SectionCard>

      {/* 🔊 音声 (TTS) */}
      {tts.state.available && (
        <SectionCard icon="🔊" title="音声 (TTS)">
          <div className="flex items-center justify-between">
            <span className="text-sm opacity-60">読み上げ機能</span>
            <button
              onClick={() => tts.updateSettings({ enabled: !tts.settings.enabled })}
              className={`relative inline-flex w-10 h-5 rounded-full transition-colors cursor-pointer ${
                tts.settings.enabled ? 'bg-indigo-500' : 'bg-white/20'
              }`}
              aria-label={tts.settings.enabled ? 'TTS無効化' : 'TTS有効化'}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                tts.settings.enabled ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
          {tts.settings.enabled && (
            <div className="space-y-3">
              <div>
                <label className="text-xs opacity-40 block mb-1">音量: {Math.round(tts.settings.volume * 100)}%</label>
                <input type="range" min="0" max="1" step="0.05" value={tts.settings.volume}
                  onChange={e => tts.updateSettings({ volume: Number(e.target.value) })}
                  className="w-full accent-indigo-400" />
              </div>
              <div>
                <label className="text-xs opacity-40 block mb-1">女性の声</label>
                <select value={tts.settings.femaleVoiceName ?? ''}
                  onChange={e => tts.updateSettings({ femaleVoiceName: e.target.value || null })}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-xs">
                  <option value="">自動 (Kyoko / Haruka)</option>
                  {tts.availableVoices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs opacity-40 block mb-1">男性の声</label>
                <select value={tts.settings.maleVoiceName ?? ''}
                  onChange={e => tts.updateSettings({ maleVoiceName: e.target.value || null })}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-xs">
                  <option value="">自動 (Otoya / Ichiro)</option>
                  {tts.availableVoices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
                </select>
              </div>
              <p className="text-[10px] opacity-30 leading-relaxed">
                macOS: Kyoko（女）/ Otoya（男）、Windows: Haruka / Ichiro
              </p>
            </div>
          )}
        </SectionCard>
      )}

      {/* ℹ️ システム情報 */}
      <SectionCard icon="ℹ️" title="システム情報">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs opacity-40">ビルドバージョン</span>
            <div className="text-sm font-mono mt-0.5">
              {typeof __BUILD_TIME__ !== 'undefined'
                ? new Date(__BUILD_TIME__).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
                : 'dev'}
            </div>
          </div>
          <button
            onClick={async () => {
              // SW全解除
              if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map(r => r.unregister()));
              }
              // 全キャッシュ削除
              if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
              }
              // クエリパラメータでキャッシュバスト強制リロード
              location.replace(location.pathname + '?v=' + Date.now());
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/15 text-emerald-400 rounded-lg hover:bg-emerald-500/25 cursor-pointer text-sm font-medium transition-colors ring-1 ring-emerald-400/30">
            <span>↻</span> 最新版に更新
          </button>
        </div>
      </SectionCard>

    </div>
  );
}
