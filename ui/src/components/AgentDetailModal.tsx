import { useState } from 'react';
import type { Agent } from '../types';
import { LEVELS, BADGES, STAT_LABELS, STAT_KEYS, EMOJI_OPTIONS, ROOMS, HAIR_STYLES, HAIR_COLORS, SUIT_COLORS, ACCESSORIES } from '../data/constants';
import { RadarChart } from './RadarChart';
import { calcCompatibility } from '../hooks/useCompanyStore';

interface Props {
  agent: Agent;
  allAgents: Agent[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Agent>) => void;
}

type Tab = 'status' | 'visual' | 'settings' | 'role' | 'badges' | 'compatibility';

export function AgentDetailModal({ agent, allAgents, onClose, onUpdate }: Props) {
  const hasRoleSettings = !!(agent.secretarySettings || agent.marketingSettings || agent.hrSettings || agent.prSettings || agent.uxResearchSettings);
  const [tab, setTab] = useState<Tab>('status');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(agent);

  const levelInfo = LEVELS.find(l => l.level === agent.level) ?? LEVELS[0];
  const nextLevel = LEVELS.find(l => l.requiredExp > agent.exp);
  const expProgress = nextLevel
    ? Math.round(((agent.exp - levelInfo.requiredExp) / (nextLevel.requiredExp - levelInfo.requiredExp)) * 100)
    : 100;
  const allBadges = BADGES.filter(b => agent.badges.includes(b.id) || agent.secretBadges.includes(b.id));

  const handleSave = () => { onUpdate(agent.id, form); setEditing(false); };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'status', label: 'ステータス' },
    { id: 'visual', label: 'ビジュアル' },
    { id: 'settings', label: '基本設定' },
    ...(hasRoleSettings ? [{ id: 'role' as Tab, label: '役職設定' }] : []),
    { id: 'badges', label: 'バッジ' },
    { id: 'compatibility', label: '相性' },
  ];

  const S = { accent: '#3b82f6', muted: '#6b7394', border: '#262a38', surface: '#181b25', surfaceLight: '#1e2230' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#181b25] border border-[#262a38] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/40"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-4 p-6 border-b border-[#262a38]">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl"
            style={{ background: `${S.accent}10` }}>
            {agent.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{agent.name}</h2>
              <span className="text-sm opacity-50">{agent.title}</span>
              <span className="text-xs">{agent.visual.gender === 'female' ? '♀' : '♂'}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: `${S.accent}15`, color: S.accent }}>Lv.{agent.level}</span>
              <span className="text-xs" style={{ color: S.muted }}>{levelInfo.rank} — {levelInfo.title}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-white/5">{agent.model}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${expProgress}%`, background: `linear-gradient(to right, ${S.accent}, #60a5fa)` }} />
              </div>
              <span className="text-xs" style={{ color: S.muted }}>{agent.exp} / {nextLevel?.requiredExp ?? '∞'}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-2xl opacity-30 hover:opacity-80 transition cursor-pointer">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#262a38] px-2 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium transition cursor-pointer whitespace-nowrap
                ${tab === t.id ? 'text-blue-400 border-b-2 border-blue-400' : 'opacity-40 hover:opacity-70'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* STATUS TAB */}
          {tab === 'status' && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <RadarChart stats={agent.stats} size={220} />
                <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                  {STAT_KEYS.map(k => (
                    <div key={k} className="flex justify-between px-3 py-1.5 bg-white/[0.03] rounded-lg">
                      <span style={{ color: S.muted }}>{STAT_LABELS[k]}</span>
                      <span className="font-bold">{agent.stats[k]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                {[
                  ['性格・口調', agent.personality],
                  ['専門知識', agent.expertise],
                  ['部署', agent.dept],
                  ['配置', ROOMS.find(r => r.id === agent.room)?.label ?? agent.room],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <h4 className="text-xs font-semibold mb-1" style={{ color: S.muted }}>{label}</h4>
                    <p className="text-sm">{value}</p>
                  </div>
                ))}
                <div>
                  <h4 className="text-xs font-semibold mb-1" style={{ color: S.muted }}>ツール権限</h4>
                  <div className="flex flex-wrap gap-1">
                    {agent.tools.map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded bg-white/5">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VISUAL TAB */}
          {tab === 'visual' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold block mb-2" style={{ color: S.muted }}>性別</label>
                  <div className="flex gap-2">
                    {(['male', 'female'] as const).map(g => (
                      <button key={g}
                        onClick={() => { const u = { ...form, visual: { ...form.visual, gender: g } }; setForm(u); onUpdate(agent.id, { visual: u.visual }); }}
                        className={`flex-1 py-2 rounded-lg text-sm cursor-pointer transition
                          ${form.visual.gender === g ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-400/30' : 'bg-white/[0.03] hover:bg-white/[0.06]'}`}>
                        {g === 'male' ? '♂ 男性' : '♀ 女性'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-2" style={{ color: S.muted }}>配置部屋</label>
                  <select value={form.room}
                    onChange={e => { const u = { ...form, room: e.target.value as Agent['room'] }; setForm(u); onUpdate(agent.id, { room: u.room }); }}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm">
                    {ROOMS.map(r => <option key={r.id} value={r.id}>{r.icon} {r.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-2" style={{ color: S.muted }}>髪型</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {HAIR_STYLES.map(h => (
                    <button key={h.id}
                      onClick={() => { const u = { ...form, visual: { ...form.visual, hairStyle: h.id } }; setForm(u); onUpdate(agent.id, { visual: u.visual }); }}
                      className={`px-2 py-1.5 rounded text-xs cursor-pointer transition
                        ${form.visual.hairStyle === h.id ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-400/30' : 'bg-white/[0.03] hover:bg-white/[0.06]'}`}>
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-2" style={{ color: S.muted }}>髪色</label>
                <div className="flex gap-2">
                  {HAIR_COLORS.map(c => (
                    <button key={c.id}
                      onClick={() => { const u = { ...form, visual: { ...form.visual, hairColor: c.id } }; setForm(u); onUpdate(agent.id, { visual: u.visual }); }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs cursor-pointer transition
                        ${form.visual.hairColor === c.id ? 'ring-1 ring-blue-400/30' : ''}`}
                      style={{ background: `${c.id}20` }}>
                      <span className="w-3 h-3 rounded-full" style={{ background: c.id }} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-2" style={{ color: S.muted }}>スーツ色</label>
                <div className="flex gap-2 flex-wrap">
                  {SUIT_COLORS.map(c => (
                    <button key={c.id}
                      onClick={() => { const u = { ...form, visual: { ...form.visual, suitColor: c.id } }; setForm(u); onUpdate(agent.id, { visual: u.visual }); }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs cursor-pointer transition
                        ${form.visual.suitColor === c.id ? 'ring-1 ring-blue-400/30' : ''}`}
                      style={{ background: `${c.id}20` }}>
                      <span className="w-3 h-3 rounded-full border border-white/10" style={{ background: c.id }} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-2" style={{ color: S.muted }}>アクセサリー</label>
                <div className="flex gap-2 flex-wrap">
                  {ACCESSORIES.map(a => (
                    <button key={a.id}
                      onClick={() => { const u = { ...form, visual: { ...form.visual, accessory: a.id } }; setForm(u); onUpdate(agent.id, { visual: u.visual }); }}
                      className={`px-3 py-1.5 rounded text-xs cursor-pointer transition
                        ${form.visual.accessory === a.id ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-400/30' : 'bg-white/[0.03] hover:bg-white/[0.06]'}`}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* BASIC SETTINGS TAB */}
          {tab === 'settings' && (
            <div className="space-y-4">
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="px-4 py-2 rounded-lg font-semibold cursor-pointer text-sm"
                  style={{ background: `${S.accent}15`, color: S.accent, border: `1px solid ${S.accent}30` }}>
                  編集モード
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs" style={{ color: S.muted }}>アイコン</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {EMOJI_OPTIONS.map(e => (
                          <button key={e} onClick={() => setForm({ ...form, icon: e })}
                            className={`text-xl p-1 rounded cursor-pointer ${form.icon === e ? 'bg-blue-500/20 ring-1 ring-blue-400' : 'hover:bg-white/5'}`}>
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { key: 'name', label: '名前' },
                        { key: 'title', label: '役職' },
                        { key: 'dept', label: '部署' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="text-xs" style={{ color: S.muted }}>{f.label}</label>
                          <input value={(form as unknown as Record<string, string>)[f.key]}
                            onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5 text-sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs" style={{ color: S.muted }}>性格・口調</label>
                    <textarea value={form.personality} onChange={e => setForm({ ...form, personality: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5 text-sm h-20" />
                  </div>
                  <div>
                    <label className="text-xs" style={{ color: S.muted }}>専門知識</label>
                    <textarea value={form.expertise} onChange={e => setForm({ ...form, expertise: e.target.value })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5 text-sm h-20" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs" style={{ color: S.muted }}>モデル</label>
                      <select value={form.model} onChange={e => setForm({ ...form, model: e.target.value as Agent['model'] })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5 text-sm">
                        <option value="opus">opus</option><option value="sonnet">sonnet</option><option value="haiku">haiku</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs" style={{ color: S.muted }}>最大ターン数: {form.maxTurns}</label>
                      <input type="range" min={5} max={50} value={form.maxTurns}
                        onChange={e => setForm({ ...form, maxTurns: Number(e.target.value) })} className="w-full" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs" style={{ color: S.muted }}>能力値</label>
                    <div className="space-y-2 mt-1">
                      {STAT_KEYS.map(k => (
                        <div key={k} className="flex items-center gap-2">
                          <span className="text-xs w-16" style={{ color: S.muted }}>{STAT_LABELS[k]}</span>
                          <input type="range" min={0} max={100} value={form.stats[k]}
                            onChange={e => setForm({ ...form, stats: { ...form.stats, [k]: Number(e.target.value) } })}
                            className="flex-1" />
                          <span className="text-xs w-8 text-right font-bold">{form.stats[k]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer text-sm font-semibold">保存</button>
                    <button onClick={() => { setForm(agent); setEditing(false); }}
                      className="px-4 py-2 bg-white/5 rounded-lg cursor-pointer text-sm">キャンセル</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ROLE-SPECIFIC SETTINGS TAB */}
          {tab === 'role' && (
            <div className="space-y-5">
              {agent.secretarySettings && (
                <>
                  <h3 className="text-sm font-bold" style={{ color: S.accent }}>秘書設定</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs block mb-1" style={{ color: S.muted }}>監視対象</label>
                      <select value={form.secretarySettings?.monitorTarget ?? 'ceo'}
                        onChange={e => setForm({ ...form, secretarySettings: { ...form.secretarySettings!, monitorTarget: e.target.value } })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm">
                        {allAgents.filter(a => a.id !== agent.id).map(a => <option key={a.id} value={a.id}>{a.icon} {a.name} {a.title}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs block mb-1" style={{ color: S.muted }}>報告頻度</label>
                      <select value={form.secretarySettings?.reportFrequency ?? 'realtime'}
                        onChange={e => setForm({ ...form, secretarySettings: { ...form.secretarySettings!, reportFrequency: e.target.value as 'realtime' | 'hourly' | 'daily' } })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm">
                        <option value="realtime">リアルタイム</option><option value="hourly">1時間ごと</option><option value="daily">1日ごと</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs block mb-1" style={{ color: S.muted }}>アドバイスレベル</label>
                      <select value={form.secretarySettings?.adviceLevel ?? 'active'}
                        onChange={e => setForm({ ...form, secretarySettings: { ...form.secretarySettings!, adviceLevel: e.target.value as 'passive' | 'active' | 'aggressive' } })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm">
                        <option value="passive">控えめ</option><option value="active">積極的</option><option value="aggressive">強力</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-3 py-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.secretarySettings?.proxyAuthority ?? false}
                          onChange={e => setForm({ ...form, secretarySettings: { ...form.secretarySettings!, proxyAuthority: e.target.checked } })} />
                        <span className="text-sm">オーナー代理の指示出し権限</span>
                      </label>
                    </div>
                  </div>
                  <button onClick={() => onUpdate(agent.id, { secretarySettings: form.secretarySettings })}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer text-sm font-semibold">保存</button>
                </>
              )}

              {agent.marketingSettings && (
                <>
                  <h3 className="text-sm font-bold" style={{ color: S.accent }}>マーケティング部長設定</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.marketingSettings?.autoGatherEnabled ?? false}
                          onChange={e => setForm({ ...form, marketingSettings: { ...form.marketingSettings!, autoGatherEnabled: e.target.checked } })} />
                        <span className="text-sm">待機中の自動情報収集</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.marketingSettings?.webSearchEnabled ?? false}
                          onChange={e => setForm({ ...form, marketingSettings: { ...form.marketingSettings!, webSearchEnabled: e.target.checked } })} />
                        <span className="text-sm">Web検索</span>
                      </label>
                    </div>
                    <div>
                      <label className="text-xs block mb-1" style={{ color: S.muted }}>収集間隔（分）: {form.marketingSettings?.gatherInterval ?? 30}</label>
                      <input type="range" min={5} max={120} value={form.marketingSettings?.gatherInterval ?? 30}
                        onChange={e => setForm({ ...form, marketingSettings: { ...form.marketingSettings!, gatherInterval: Number(e.target.value) } })}
                        className="w-full" />
                    </div>
                    <div>
                      <label className="text-xs block mb-1" style={{ color: S.muted }}>収集トピック（カンマ区切り）</label>
                      <textarea value={form.marketingSettings?.gatherTopics?.join(', ') ?? ''}
                        onChange={e => setForm({ ...form, marketingSettings: { ...form.marketingSettings!, gatherTopics: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm h-16" />
                    </div>
                    <div>
                      <label className="text-xs block mb-1" style={{ color: S.muted }}>DB保存先</label>
                      <input value={form.marketingSettings?.dbPath ?? ''}
                        onChange={e => setForm({ ...form, marketingSettings: { ...form.marketingSettings!, dbPath: e.target.value } })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <button onClick={() => onUpdate(agent.id, { marketingSettings: form.marketingSettings })}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer text-sm font-semibold">保存</button>
                </>
              )}

              {agent.prSettings && (
                <>
                  <h3 className="text-sm font-bold" style={{ color: S.accent }}>広報部長設定</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.prSettings?.internalNewsEnabled ?? false}
                          onChange={e => setForm({ ...form, prSettings: { ...form.prSettings!, internalNewsEnabled: e.target.checked } })} />
                        <span className="text-sm">社内ニュース自動配信</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.prSettings?.evolutionMode ?? false}
                          onChange={e => setForm({ ...form, prSettings: { ...form.prSettings!, evolutionMode: e.target.checked } })} />
                        <span className="text-sm">通知品質の自動進化</span>
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.prSettings?.digestEnabled ?? false}
                          onChange={e => setForm({ ...form, prSettings: { ...form.prSettings!, digestEnabled: e.target.checked } })} />
                        <span className="text-sm">日次ダイジェスト生成</span>
                      </label>
                    </div>
                    <div>
                      <label className="text-xs block mb-1" style={{ color: S.muted }}>オーナーへの報告頻度</label>
                      <select value={form.prSettings?.reportToOwner ?? 'realtime'}
                        onChange={e => setForm({ ...form, prSettings: { ...form.prSettings!, reportToOwner: e.target.value as 'realtime' | 'hourly' | 'daily' } })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm">
                        <option value="realtime">リアルタイム</option>
                        <option value="hourly">1時間ごと</option>
                        <option value="daily">1日1回</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs block mb-1" style={{ color: S.muted }}>通知フォーマット</label>
                      <select value={form.prSettings?.notifyFormat ?? 'visual'}
                        onChange={e => setForm({ ...form, prSettings: { ...form.prSettings!, notifyFormat: e.target.value as 'summary' | 'detailed' | 'visual' } })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm">
                        <option value="summary">サマリー</option>
                        <option value="detailed">詳細</option>
                        <option value="visual">ビジュアル</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs block mb-1" style={{ color: S.muted }}>追跡トピック（カンマ区切り）</label>
                      <textarea value={form.prSettings?.trackTopics?.join(', ') ?? ''}
                        onChange={e => setForm({ ...form, prSettings: { ...form.prSettings!, trackTopics: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm h-16" />
                    </div>
                  </div>
                  <button onClick={() => onUpdate(agent.id, { prSettings: form.prSettings })}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer text-sm font-semibold">保存</button>
                </>
              )}

              {agent.uxResearchSettings && (
                <>
                  <h3 className="text-sm font-bold" style={{ color: S.accent }}>UXリサーチ部長設定</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.uxResearchSettings?.userTestingEnabled ?? false}
                          onChange={e => setForm({ ...form, uxResearchSettings: { ...form.uxResearchSettings!, userTestingEnabled: e.target.checked } })} />
                        <span className="text-sm">ユーザーテスト実施</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.uxResearchSettings?.competitorUxTracking ?? false}
                          onChange={e => setForm({ ...form, uxResearchSettings: { ...form.uxResearchSettings!, competitorUxTracking: e.target.checked } })} />
                        <span className="text-sm">競合UX追跡</span>
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.uxResearchSettings?.accessibilityAudit ?? false}
                          onChange={e => setForm({ ...form, uxResearchSettings: { ...form.uxResearchSettings!, accessibilityAudit: e.target.checked } })} />
                        <span className="text-sm">アクセシビリティ監査</span>
                      </label>
                    </div>
                    <div>
                      <label className="text-xs block mb-1" style={{ color: S.muted }}>ペルソナ数: {form.uxResearchSettings?.personaCount ?? 5}</label>
                      <input type="range" min={1} max={20} value={form.uxResearchSettings?.personaCount ?? 5}
                        onChange={e => setForm({ ...form, uxResearchSettings: { ...form.uxResearchSettings!, personaCount: Number(e.target.value) } })}
                        className="w-full" />
                    </div>
                    <div>
                      <label className="text-xs block mb-1" style={{ color: S.muted }}>調査手法（カンマ区切り）</label>
                      <textarea value={form.uxResearchSettings?.researchMethods?.join(', ') ?? ''}
                        onChange={e => setForm({ ...form, uxResearchSettings: { ...form.uxResearchSettings!, researchMethods: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm h-16" />
                    </div>
                    <div>
                      <label className="text-xs block mb-1" style={{ color: S.muted }}>インサイト保存先</label>
                      <input value={form.uxResearchSettings?.insightDb ?? ''}
                        onChange={e => setForm({ ...form, uxResearchSettings: { ...form.uxResearchSettings!, insightDb: e.target.value } })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <button onClick={() => onUpdate(agent.id, { uxResearchSettings: form.uxResearchSettings })}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer text-sm font-semibold">保存</button>
                </>
              )}

              {agent.hrSettings && (
                <>
                  <h3 className="text-sm font-bold" style={{ color: S.accent }}>人事部長設定</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.hrSettings?.trainingEnabled ?? false}
                          onChange={e => setForm({ ...form, hrSettings: { ...form.hrSettings!, trainingEnabled: e.target.checked } })} />
                        <span className="text-sm">社員教育モード</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.hrSettings?.scoutEnabled ?? false}
                          onChange={e => setForm({ ...form, hrSettings: { ...form.hrSettings!, scoutEnabled: e.target.checked } })} />
                        <span className="text-sm">外部スカウトモード</span>
                      </label>
                    </div>
                    <div>
                      <label className="text-xs block mb-1" style={{ color: S.muted }}>教育重点分野（カンマ区切り）</label>
                      <textarea value={form.hrSettings?.trainingFocus?.join(', ') ?? ''}
                        onChange={e => setForm({ ...form, hrSettings: { ...form.hrSettings!, trainingFocus: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm h-16" />
                    </div>
                    <div>
                      <label className="text-xs block mb-1" style={{ color: S.muted }}>スカウト基準</label>
                      <textarea value={form.hrSettings?.scoutCriteria ?? ''}
                        onChange={e => setForm({ ...form, hrSettings: { ...form.hrSettings!, scoutCriteria: e.target.value } })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm h-16" />
                    </div>
                    <div>
                      <label className="text-xs block mb-1" style={{ color: S.muted }}>最大採用数: {form.hrSettings?.maxRecruits ?? 3}</label>
                      <input type="range" min={1} max={10} value={form.hrSettings?.maxRecruits ?? 3}
                        onChange={e => setForm({ ...form, hrSettings: { ...form.hrSettings!, maxRecruits: Number(e.target.value) } })}
                        className="w-full" />
                    </div>
                  </div>
                  <button onClick={() => onUpdate(agent.id, { hrSettings: form.hrSettings })}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer text-sm font-semibold">保存</button>
                </>
              )}
            </div>
          )}

          {/* BADGES TAB */}
          {tab === 'badges' && (
            <div>
              {allBadges.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {allBadges.map(b => (
                    <div key={b.id} className="flex flex-col items-center p-3 bg-white/[0.03] rounded-lg">
                      <span className="text-3xl mb-1">{b.icon}</span>
                      <span className="text-xs font-bold">{b.name}</span>
                      <span className="text-[10px] opacity-40">{b.description}</span>
                      <div className="text-[10px] text-yellow-400 mt-1">{'★'.repeat(b.rarity)}{'☆'.repeat(5 - b.rarity)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center opacity-30 py-8">まだバッジを獲得していません</p>
              )}
              <div className="mt-6">
                <h4 className="text-xs font-semibold mb-2" style={{ color: S.muted }}>未獲得バッジ</h4>
                <div className="grid grid-cols-4 gap-2">
                  {BADGES.filter(b => !agent.badges.includes(b.id) && b.category !== 'secret').map(b => (
                    <div key={b.id} className="flex flex-col items-center p-2 bg-white/[0.02] rounded-lg opacity-25">
                      <span className="text-xl">{b.icon}</span>
                      <span className="text-[10px]">{b.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* COMPATIBILITY TAB */}
          {tab === 'compatibility' && (
            <div className="space-y-2">
              {allAgents.filter(a => a.id !== agent.id).map(other => {
                const score = calcCompatibility(agent, other);
                const mark = score >= 85 ? '◎' : score >= 65 ? '○' : '△';
                const color = score >= 85 ? '#22c55e' : score >= 65 ? '#eab308' : '#ef4444';
                return (
                  <div key={other.id} className="flex items-center gap-3 p-2.5 bg-white/[0.03] rounded-lg">
                    <span className="text-xl">{other.icon}</span>
                    <span className="text-sm flex-1">{other.name} {other.title}</span>
                    <span className="text-xs">{other.visual.gender === 'female' ? '♀' : '♂'}</span>
                    <span className="text-lg font-bold" style={{ color }}>{mark}</span>
                    <span className="text-sm opacity-50 w-12 text-right">{score}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
