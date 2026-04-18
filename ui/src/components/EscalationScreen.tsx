import { useState } from 'react';
import type { Agent, Consultation } from '../types';
import { PixelCharacter } from './PixelCharacter';

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

export function EscalationScreen({ agents, theme }: Props) {
  const [consultations] = useState<Consultation[]>(DEMO_CONSULTATIONS);
  const [selected, setSelected] = useState<Consultation | null>(null);
  const [pulseFrom, setPulseFrom] = useState<string | null>(null);
  const [pulseTo, setPulseTo] = useState<string | null>(null);

  const getAgent = (id: string) => agents.find(a => a.id === id);

  const handleSelect = (c: Consultation) => {
    setSelected(c);
    setPulseFrom(c.from);
    setPulseTo(c.to);
    setTimeout(() => { setPulseFrom(null); setPulseTo(null); }, 2000);
  };

  // Stats
  const totalConsultations = consultations.length;
  const approvedCount = consultations.filter(c => c.status === 'approved').length;
  const alertCount = consultations.filter(c => c.urgency === 'high').length;

  return (
    <div className="flex gap-4 h-full min-w-0">
      {/* Left: Org chart with pulse animation */}
      <div className="w-72 shrink-0 rounded-xl p-4 space-y-4"
        style={{ background: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
        <h3 className="font-bold">組織図</h3>
        <div className="space-y-3">
          {agents.map(a => {
            const isPulseFrom = pulseFrom === a.id;
            const isPulseTo = pulseTo === a.id;
            return (
              <div key={a.id}
                className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-500
                  ${isPulseFrom ? 'bg-yellow-500/20 ring-1 ring-yellow-400 animate-pulse' : ''}
                  ${isPulseTo ? 'bg-indigo-500/20 ring-1 ring-indigo-400 animate-pulse' : ''}
                  ${!isPulseFrom && !isPulseTo ? 'bg-white/5' : ''}`}>
                <PixelCharacter visual={a.visual} size="sm" active={a.active} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{a.name} {a.title}</div>
                  <div className="text-[10px]" style={{ color: theme.muted }}>{a.dept}</div>
                </div>
                {isPulseFrom && (
                  <span className="text-xs text-yellow-400 animate-pulse">送信中...</span>
                )}
                {isPulseTo && (
                  <span className="text-xs text-indigo-400 animate-pulse">受信中...</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="border-t pt-4 space-y-2" style={{ borderColor: theme.border }}>
          <h4 className="text-xs font-bold opacity-40">統計</h4>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-white/5 rounded">
              <div className="text-lg font-bold">{totalConsultations}</div>
              <div className="text-[10px]" style={{ color: theme.muted }}>相談数</div>
            </div>
            <div className="p-2 bg-white/5 rounded">
              <div className="text-lg font-bold text-green-400">
                {totalConsultations > 0 ? Math.round((approvedCount / totalConsultations) * 100) : 0}%
              </div>
              <div className="text-[10px]" style={{ color: theme.muted }}>承認率</div>
            </div>
            <div className="p-2 bg-white/5 rounded">
              <div className="text-lg font-bold text-red-400">{alertCount}</div>
              <div className="text-[10px]" style={{ color: theme.muted }}>アラート</div>
            </div>
          </div>
        </div>
      </div>

      {/* Center: Consultation list */}
      <div className="flex-1 rounded-xl flex flex-col"
        style={{ background: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
        <div className="px-4 py-3 border-b font-bold" style={{ borderColor: theme.border }}>
          相談・エスカレーション一覧
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {consultations.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12" style={{ color: theme.muted }}>
              <div className="text-center space-y-2">
                <span className="text-5xl block">📨</span>
                <p>まだ相談はありません</p>
                <p className="text-xs">ワークフロー実行時にエージェントが自律的に相談を行います</p>
              </div>
            </div>
          ) : (
            consultations.map(c => {
              const fromAgent = getAgent(c.from);
              const toAgent = getAgent(c.to);
              const urgency = getUrgencyBadge(c.urgency);
              const type = getTypeBadge(c.type);
              const status = getStatusBadge(c.status);
              const isSelected = selected?.id === c.id;

              return (
                <button key={c.id}
                  onClick={() => handleSelect(c)}
                  className={`w-full text-left p-3 rounded-lg cursor-pointer transition-all
                    ${isSelected ? 'bg-indigo-500/10 ring-1 ring-indigo-400/30' : 'bg-white/5 hover:bg-white/10'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{type.icon}</span>
                    <span className="text-sm font-bold flex-1">{c.subject}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${urgency.color}`}>{urgency.label}</span>
                    <span className={`text-xs font-bold ${status.color}`}>{status.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: theme.muted }}>
                    <span>{fromAgent?.icon} {fromAgent?.name}</span>
                    <span>→</span>
                    <span>{toAgent?.icon} {toAgent?.name}</span>
                    <span className="ml-auto">{new Date(c.timestamp).toLocaleString('ja-JP')}</span>
                  </div>
                </button>
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
