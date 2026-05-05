import { useState } from 'react';
import type { Agent, Consultation } from '../types';
import { PixelCharacter } from './PixelCharacter';
import { TTSButton } from './TTSButton';

interface Props {
  agents: Agent[];
  theme: { bg: string; surface: string; border: string; text: string; muted: string };
}

// デモ用の相談データ
const DEMO_CONSULTATIONS: Consultation[] = [
  {
    id: 'c-001', timestamp: '2026-04-13T10:05:00Z', type: 'judgment', urgency: 'medium',
    from: 'developer', to: 'architect', subject: '割引計算ロジックの実装方針', status: 'approved',
  },
  {
    id: 'c-002', timestamp: '2026-04-13T10:30:00Z', type: 'alert', urgency: 'high',
    from: 'qa-reviewer', to: 'architect', subject: 'SQLインジェクションの脆弱性検出', status: 'approved',
  },
  {
    id: 'c-003', timestamp: '2026-04-13T11:00:00Z', type: 'approval', urgency: 'low',
    from: 'planner', to: 'ceo', subject: '要件定義書の最終承認', status: 'approved',
  },
];

function getUrgencyBadge(urgency: string) {
  switch (urgency) {
    case 'high': return { label: '高', color: 'bg-red-500/20 text-red-400' };
    case 'medium': return { label: '中', color: 'bg-yellow-500/20 text-yellow-400' };
    case 'low': return { label: '低', color: 'bg-green-500/20 text-green-400' };
    default: return { label: '?', color: 'bg-white/10' };
  }
}

function getTypeBadge(type: string) {
  switch (type) {
    case 'judgment': return { label: '判断相談', icon: '🤔' };
    case 'approval': return { label: '承認依頼', icon: '📋' };
    case 'alert': return { label: 'アラート', icon: '🚨' };
    default: return { label: type, icon: '📨' };
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'approved': return { label: '承認', color: 'text-green-400' };
    case 'rejected': return { label: '却下', color: 'text-red-400' };
    case 'escalated': return { label: 'エスカレーション', color: 'text-yellow-400' };
    case 'pending': return { label: '待機中', color: 'text-blue-400' };
    default: return { label: status, color: 'opacity-60' };
  }
}

type FilterType = 'all' | 'judgment' | 'approval' | 'alert';

function AgentMini({ agent }: { agent: ReturnType<typeof Array.prototype.find> }) {
  if (!agent) return <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg">{agent?.icon ?? '?'}</div>;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <PixelCharacter visual={(agent as Agent).visual} size="sm" active={(agent as Agent).active} />
      <span className="text-[9px] opacity-60 text-center">{(agent as Agent).name}</span>
    </div>
  );
}

export function EscalationScreen({ agents, theme }: Props) {
  const [consultations] = useState<Consultation[]>(DEMO_CONSULTATIONS);
  const [selected, setSelected] = useState<Consultation | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const getAgent = (id: string) => agents.find(a => a.id === id);

  const handleSelect = (c: Consultation) => {
    setSelected(c);
  };

  // Stats
  const total = consultations.length;
  const highCount = consultations.filter(c => c.urgency === 'high').length;
  const approvedCount = consultations.filter(c => c.status === 'approved').length;
  const pendingCount = consultations.filter(c => c.status === 'pending').length;

  const filtered = filter === 'all' ? consultations : consultations.filter(c => c.type === filter);

  const FILTER_OPTIONS: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'すべて' },
    { id: 'judgment', label: '判断相談' },
    { id: 'approval', label: '承認依頼' },
    { id: 'alert', label: 'アラート' },
  ];

  return (
    <div className="flex gap-4 h-full min-w-0">
      {/* Left: Stats + Filter + AgentFlow */}
      <div className="w-64 shrink-0 rounded-xl p-4 space-y-3"
        style={{ background: theme.surface, borderColor: theme.border, borderWidth: 1 }}>

        {/* 統計サマリー */}
        <div className="grid grid-cols-2 gap-2">
          {([
            { label: '合計', value: total, icon: '📨', cls: '' },
            { label: '高優先', value: highCount, icon: '🚨', cls: 'text-red-400' },
            { label: '承認済', value: approvedCount, icon: '✅', cls: 'text-green-400' },
            { label: '待機中', value: pendingCount, icon: '⏳', cls: 'text-yellow-400' },
          ]).map(s => (
            <div key={s.label} className="p-2.5 rounded-lg bg-white/5 text-center">
              <div className="text-lg">{s.icon}</div>
              <div className={`text-xl font-bold ${s.cls}`}>{s.value}</div>
              <div className="text-[10px]" style={{ color: theme.muted }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* タイプフィルター */}
        <div className="space-y-1">
          {FILTER_OPTIONS.map(opt => (
            <button key={opt.id}
              onClick={() => setFilter(opt.id)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer
                ${filter === opt.id ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-400/30' : 'bg-white/5 hover:bg-white/10'}`}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* 関係者グラフ（選択時のみ） */}
        {selected && (
          <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}` }}>
            <div className="text-[10px] font-bold opacity-40">関係者</div>
            <div className="flex items-center gap-2 justify-center">
              <AgentMini agent={getAgent(selected.from)} />
              <span className="opacity-30 text-sm">→</span>
              <AgentMini agent={getAgent(selected.to)} />
            </div>
          </div>
        )}
      </div>

      {/* Center: Consultation list */}
      <div className="flex-1 rounded-xl flex flex-col"
        style={{ background: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
        <div className="px-4 py-3 border-b font-bold" style={{ borderColor: theme.border }}>
          相談・エスカレーション一覧
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12" style={{ color: theme.muted }}>
              <div className="text-center space-y-2">
                <span className="text-5xl block">📨</span>
                <p>まだ相談はありません</p>
                <p className="text-xs">ワークフロー実行時にエージェントが自律的に相談を行います</p>
              </div>
            </div>
          ) : (
            filtered.map(c => {
              const fromAgent = getAgent(c.from);
              const toAgent = getAgent(c.to);
              const urgency = getUrgencyBadge(c.urgency);
              const type = getTypeBadge(c.type);
              const status = getStatusBadge(c.status);
              const isSelected = selected?.id === c.id;

              return (
                <div key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelect(c)}
                  onKeyDown={e => e.key === 'Enter' && handleSelect(c)}
                  className={`w-full text-left p-3 rounded-lg cursor-pointer transition-all
                    ${isSelected ? 'bg-indigo-500/10 ring-1 ring-indigo-400/30' : 'bg-white/5 hover:bg-white/10'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{type.icon}</span>
                    <span className="text-sm font-bold flex-1">{c.subject}</span>
                    <TTSButton
                      getUtterances={() => [
                        { text: `${type.label}。件名: ${c.subject}。`, agentId: c.from },
                        { text: `緊急度${urgency.label}。${fromAgent?.name}から${toAgent?.name}への相談。ステータス: ${status.label}。`, agentId: c.to },
                      ]}
                      label="読み上げ"
                      className="shrink-0"
                    />
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${urgency.color}`}>{urgency.label}</span>
                    <span className={`text-xs font-bold ${status.color}`}>{status.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: theme.muted }}>
                    <span>{fromAgent?.icon} {fromAgent?.name}</span>
                    <span>→</span>
                    <span>{toAgent?.icon} {toAgent?.name}</span>
                    <span className="ml-auto">{new Date(c.timestamp).toLocaleString('ja-JP')}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Detail panel */}
      <div className="w-64 shrink-0 rounded-xl p-4 space-y-4"
        style={{ background: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
        {selected ? (() => {
          const fromAgent = getAgent(selected.from);
          const toAgent = getAgent(selected.to);
          const type = getTypeBadge(selected.type);
          const urgency = getUrgencyBadge(selected.urgency);
          const status = getStatusBadge(selected.status);
          return (
            <>
              <h3 className="font-bold">相談詳細</h3>
              <div className="text-center py-4">
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    {fromAgent && <PixelCharacter visual={fromAgent.visual} size="md" active={true} />}
                    <span className="text-xs block mt-1">{fromAgent?.name}</span>
                  </div>
                  <div className="text-2xl animate-pulse">→</div>
                  <div className="text-center">
                    {toAgent && <PixelCharacter visual={toAgent.visual} size="md" active={true} />}
                    <span className="text-xs block mt-1">{toAgent?.name}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-xs opacity-40">件名</span>
                  <p className="text-sm font-bold">{selected.subject}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${urgency.color}`}>
                    緊急度: {urgency.label}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-white/10">
                    {type.icon} {type.label}
                  </span>
                </div>
                <div>
                  <span className="text-xs opacity-40">ステータス</span>
                  <p className={`text-sm font-bold ${status.color}`}>{status.label}</p>
                </div>
                <div>
                  <span className="text-xs opacity-40">日時</span>
                  <p className="text-sm">{new Date(selected.timestamp).toLocaleString('ja-JP')}</p>
                </div>
              </div>
              <div className="border-t pt-3" style={{ borderColor: theme.border }}>
                <p className="text-xs" style={{ color: theme.muted }}>
                  CLIで実行:<br />
                  <code className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] block mt-1 break-all">
                    ./ai-escalation.sh {selected.from} {selected.to} {selected.type} '{selected.subject.replace(/'/g, "'\\''")}' '...'
                  </code>
                </p>
              </div>
            </>
          );
        })() : (
          <div className="flex-1 flex items-center justify-center py-12" style={{ color: theme.muted }}>
            <p className="text-sm text-center">相談を選択すると詳細が表示されます</p>
          </div>
        )}
      </div>
    </div>
  );
}
