import { useState } from 'react';
import type { Agent } from '../types';
import { LEVELS, BADGES, STAT_LABELS, STAT_KEYS, EMOJI_OPTIONS } from '../data/constants';
import { RadarChart } from './RadarChart';
import { calcCompatibility } from '../hooks/useCompanyStore';

interface Props {
  agent: Agent;
  allAgents: Agent[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Agent>) => void;
}

export function AgentDetailModal({ agent, allAgents, onClose, onUpdate }: Props) {
  const [tab, setTab] = useState<'status' | 'settings' | 'badges' | 'compatibility'>('status');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(agent);

  const levelInfo = LEVELS.find(l => l.level === agent.level) ?? LEVELS[0];
  const nextLevel = LEVELS.find(l => l.requiredExp > agent.exp);
  const expProgress = nextLevel
    ? Math.round(((agent.exp - levelInfo.requiredExp) / (nextLevel.requiredExp - levelInfo.requiredExp)) * 100)
    : 100;

  const allBadges = BADGES.filter(b => agent.badges.includes(b.id) || agent.secretBadges.includes(b.id));

  const handleSave = () => {
    onUpdate(agent.id, form);
    setEditing(false);
  };

  const tabs = [
    { id: 'status', label: 'ステータス' },
    { id: 'settings', label: '設定' },
    { id: 'badges', label: 'バッジ' },
    { id: 'compatibility', label: '相性' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="bg-[#1a1a24] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-4 p-6 border-b border-white/10">
          <span className="text-5xl">{agent.icon}</span>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{agent.name} {agent.title}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-indigo-400 font-bold">Lv.{agent.level}</span>
              <span className="text-sm opacity-60">{levelInfo.rank} — {levelInfo.title}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-white/10">{agent.model}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                  style={{ width: `${expProgress}%` }} />
              </div>
              <span className="text-xs opacity-40">
                {agent.exp} / {nextLevel?.requiredExp ?? '???'} EXP
              </span>
            </div>
          </div>
          <button onClick={onClose}
            className="text-2xl opacity-40 hover:opacity-100 transition-opacity cursor-pointer">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {tabs.map(t => (
            <button key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors cursor-pointer
                ${tab === t.id ? 'text-indigo-400 border-b-2 border-indigo-400' : 'opacity-50 hover:opacity-80'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {tab === 'status' && (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <RadarChart stats={agent.stats} size={220} />
                <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                  {STAT_KEYS.map(k => (
                    <div key={k} className="flex justify-between px-2 py-1 bg-white/5 rounded">
                      <span className="opacity-60">{STAT_LABELS[k]}</span>
                      <span className="font-bold">{agent.stats[k]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold opacity-40 mb-1">性格・口調</h4>
                  <p className="text-sm">{agent.personality}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold opacity-40 mb-1">専門知識</h4>
                  <p className="text-sm">{agent.expertise}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold opacity-40 mb-1">部署</h4>
                  <p className="text-sm">{agent.dept}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold opacity-40 mb-1">ツール権限</h4>
                  <div className="flex flex-wrap gap-1">
                    {agent.tools.map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded bg-white/10">{t}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold opacity-40 mb-1">出力ファイル</h4>
                  <code className="text-sm text-indigo-400">{agent.outputFile}</code>
                </div>
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <div className="space-y-4">
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors cursor-pointer">
                  編集
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs opacity-40">アイコン</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {EMOJI_OPTIONS.map(e => (
                          <button key={e}
                            onClick={() => setForm({ ...form, icon: e })}
                            className={`text-xl p-1 rounded cursor-pointer ${form.icon === e ? 'bg-indigo-500/30 ring-1 ring-indigo-400' : 'hover:bg-white/10'}`}>
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs opacity-40">名前</label>
                        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs opacity-40">役職</label>
                        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs opacity-40">部署</label>
                        <input value={form.dept} onChange={e => setForm({ ...form, dept: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs opacity-40">性格・口調</label>
                    <textarea value={form.personality} onChange={e => setForm({ ...form, personality: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm h-20" />
                  </div>
                  <div>
                    <label className="text-xs opacity-40">専門知識</label>
                    <textarea value={form.expertise} onChange={e => setForm({ ...form, expertise: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm h-20" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs opacity-40">モデル</label>
                      <select value={form.model} onChange={e => setForm({ ...form, model: e.target.value as Agent['model'] })}
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm">
                        <option value="opus">opus</option>
                        <option value="sonnet">sonnet</option>
                        <option value="haiku">haiku</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs opacity-40">最大ターン数: {form.maxTurns}</label>
                      <input type="range" min={5} max={50} value={form.maxTurns}
                        onChange={e => setForm({ ...form, maxTurns: Number(e.target.value) })}
                        className="w-full" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs opacity-40">能力値</label>
                    <div className="space-y-2 mt-1">
                      {STAT_KEYS.map(k => (
                        <div key={k} className="flex items-center gap-2">
                          <span className="text-xs w-16 opacity-60">{STAT_LABELS[k]}</span>
                          <input type="range" min={0} max={100} value={form.stats[k]}
                            onChange={e => setForm({
                              ...form,
                              stats: { ...form.stats, [k]: Number(e.target.value) },
                            })}
                            className="flex-1" />
                          <span className="text-xs w-8 text-right">{form.stats[k]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSave}
                      className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors cursor-pointer">
                      保存
                    </button>
                    <button onClick={() => { setForm(agent); setEditing(false); }}
                      className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors cursor-pointer">
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'badges' && (
            <div>
              {allBadges.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {allBadges.map(b => (
                    <div key={b.id} className="flex flex-col items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-3xl mb-1">{b.icon}</span>
                      <span className="text-xs font-bold">{b.name}</span>
                      <span className="text-[10px] opacity-40">{b.description}</span>
                      <div className="text-[10px] text-yellow-400 mt-1">
                        {'★'.repeat(b.rarity)}{'☆'.repeat(5 - b.rarity)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center opacity-40 py-8">まだバッジを獲得していません</p>
              )}
              <div className="mt-6">
                <h4 className="text-xs font-bold opacity-40 mb-2">未獲得バッジ</h4>
                <div className="grid grid-cols-4 gap-2">
                  {BADGES.filter(b => !agent.badges.includes(b.id) && b.category !== 'secret').map(b => (
                    <div key={b.id} className="flex flex-col items-center p-2 bg-white/5 rounded-lg opacity-30">
                      <span className="text-xl">{b.icon}</span>
                      <span className="text-[10px]">{b.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'compatibility' && (
            <div className="space-y-2">
              {allAgents.filter(a => a.id !== agent.id).map(other => {
                const score = calcCompatibility(agent, other);
                const mark = score >= 85 ? '◎' : score >= 65 ? '○' : '△';
                const color = score >= 85 ? 'text-green-400' : score >= 65 ? 'text-yellow-400' : 'text-red-400';
                return (
                  <div key={other.id}
                    className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                    <span className="text-xl">{other.icon}</span>
                    <span className="text-sm flex-1">{other.name} {other.title}</span>
                    <span className={`text-lg font-bold ${color}`}>{mark}</span>
                    <span className="text-sm opacity-60 w-12 text-right">{score}%</span>
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
