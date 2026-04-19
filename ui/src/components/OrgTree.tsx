import type { Agent } from '../types';
import type { MissionProgress } from '../hooks/useMissionProgress';
import { PixelCharacter } from './PixelCharacter';

interface Props {
  agents: Agent[];
  onSelect: (agent: Agent) => void;
  selectedId?: string;
  mission?: MissionProgress;
  elapsed?: number;
}

interface TreeNode {
  agent: Agent;
  children: TreeNode[];
}

function buildTree(agents: Agent[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  agents.forEach(a => map.set(a.id, { agent: a, children: [] }));

  const roots: TreeNode[] = [];
  agents.forEach(a => {
    const node = map.get(a.id)!;
    if (a.parentId && map.has(a.parentId)) {
      map.get(a.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function getFrameClass(level: number): string {
  if (level >= 6) return 'ring-2 ring-purple-400 animate-pulse shadow-[0_0_20px_rgba(168,85,247,0.6)]';
  if (level >= 5) return 'ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]';
  if (level >= 4) return 'ring-2 ring-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.3)]';
  if (level >= 3) return 'ring-2 ring-yellow-400 shadow-[0_0_8px_rgba(251,191,36,0.2)]';
  return 'ring-1 ring-gray-500';
}

function getMissionFrameClass(status: string): string {
  switch (status) {
    case 'working': return 'ring-2 ring-indigo-400 shadow-[0_0_16px_rgba(99,102,241,0.5)] animate-pulse';
    case 'done': return 'ring-2 ring-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]';
    case 'waiting': return 'ring-1 ring-amber-400/40';
    default: return '';
  }
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function NodeComponent({ node, onSelect, selectedId, mission, depth = 0 }: {
  node: TreeNode; onSelect: (a: Agent) => void; selectedId?: string; mission?: MissionProgress; depth?: number;
}) {
  const a = node.agent;
  const isSelected = a.id === selectedId;
  const agentState = mission?.agentStates.get(a.id);
  const isParticipating = mission && mission.participatingAgents.includes(a.id);
  const hasMission = mission && mission.phases.length > 0;

  // ミッション中のフレームクラス
  const frameClass = hasMission && isParticipating
    ? getMissionFrameClass(agentState?.status || 'waiting')
    : getFrameClass(a.level);

  // 非参加エージェントの薄暗表示
  const dimClass = hasMission && !isParticipating ? 'opacity-30' : '';

  // ステータスバッジ
  const badge = hasMission && isParticipating ? (
    agentState?.status === 'working' ? { icon: '🔄', label: '作業中', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30' } :
    agentState?.status === 'done' ? { icon: '✅', label: '完了', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' } :
    { icon: '⏳', label: '待機', color: 'bg-amber-500/15 text-amber-300/70 border-amber-400/20' }
  ) : null;

  // 所要時間表示
  const agentTime = agentState?.startedAt && agentState?.completedAt
    ? formatTime(Math.round((agentState.completedAt - agentState.startedAt) / 1000))
    : null;

  return (
    <div className={`flex flex-col items-center transition-opacity duration-500 ${dimClass}`}>
      <button
        onClick={() => onSelect(a)}
        className={`
          relative flex flex-col items-center p-3 rounded-xl cursor-pointer
          transition-all duration-300 hover:scale-105
          ${isSelected ? 'bg-indigo-500/20 scale-105' : hasMission && isParticipating ? 'bg-white/[0.07]' : 'bg-white/5 hover:bg-white/10'}
          ${frameClass}
        `}
      >
        <PixelCharacter visual={a.visual} size="sm" active={a.active} />
        <span className="text-xs font-bold whitespace-nowrap mt-1">{a.name}</span>
        <span className="text-[10px] opacity-60 whitespace-nowrap">{a.title}</span>
        <span className="text-[10px] text-indigo-400">Lv.{a.level}</span>

        {/* Mission status badge */}
        {badge && (
          <div className={`mt-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-medium ${badge.color}`}>
            <span>{badge.icon}</span>
            <span>{badge.label}</span>
            {agentTime && <span className="font-mono opacity-70">{agentTime}</span>}
          </div>
        )}

        {/* Working pulse ring */}
        {agentState?.status === 'working' && (
          <div className="absolute inset-0 rounded-xl ring-2 ring-indigo-400/40 animate-ping pointer-events-none" />
        )}
      </button>

      {node.children.length > 0 && (
        <>
          {/* Connector line — colored during mission */}
          <div className={`w-px h-6 transition-colors duration-500 ${
            hasMission && isParticipating
              ? agentState?.status === 'working' ? 'bg-indigo-400/60'
                : agentState?.status === 'done' ? 'bg-emerald-400/40'
                : 'bg-white/10'
              : 'bg-current opacity-20'
          }`} />
          <div className="flex gap-4 relative">
            {node.children.length > 1 && (
              <div className="absolute top-0 left-[50%] -translate-x-[50%] h-px bg-current opacity-20"
                style={{ width: `calc(100% - 60px)` }} />
            )}
            {node.children.map(child => (
              <div key={child.agent.id} className="flex flex-col items-center">
                {node.children.length > 1 && (
                  <div className="w-px h-4 bg-current opacity-20" />
                )}
                <NodeComponent node={child} onSelect={onSelect} selectedId={selectedId} mission={mission} depth={depth + 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── ミッションフローパネル（組織図の上に表示） ── */
function MissionFlowPanel({ mission, agents, elapsed }: { mission: MissionProgress; agents: Agent[]; elapsed?: number }) {
  const getAgent = (id: string) => agents.find(a => a.id === id);

  return (
    <div className="mb-4 rounded-xl border border-white/10 overflow-hidden"
      style={{ background: 'rgba(15,23,42,0.6)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/10">
        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
        <span className="text-xs font-bold text-white/80">ミッションフロー</span>
        <div className="flex-1" />
        {elapsed != null && (
          <span className="text-[10px] font-mono text-white/40">{formatTime(elapsed)}</span>
        )}
        <span className="text-[10px] font-bold text-indigo-400">{mission.overallProgress}%</span>
      </div>

      {/* Phase pipeline */}
      <div className="px-4 py-3">
        <div className="flex items-start gap-0 overflow-x-auto">
          {mission.phases.map((phase, i) => {
            const isLast = i === mission.phases.length - 1;
            const isDone = phase.status === 'done';
            const isActive = phase.status === 'active';

            return (
              <div key={phase.id} className="flex items-start">
                {/* Phase card */}
                <div className={`flex flex-col items-center gap-1.5 min-w-[100px] p-2 rounded-lg border transition-all ${
                  isDone ? 'bg-emerald-500/10 border-emerald-400/20' :
                  isActive ? 'bg-indigo-500/10 border-indigo-400/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]' :
                  'bg-white/[0.02] border-white/5'
                }`}>
                  {/* Phase name */}
                  <span className={`text-[10px] font-bold ${
                    isDone ? 'text-emerald-400' : isActive ? 'text-indigo-300' : 'text-white/25'
                  }`}>
                    {isDone ? '✓ ' : isActive ? '▸ ' : ''}{phase.shortLabel}
                  </span>

                  {/* Agents in this phase */}
                  <div className="flex flex-wrap justify-center gap-1">
                    {phase.agents.map(agentId => {
                      const a = getAgent(agentId);
                      if (!a) return null;
                      const state = mission.agentStates.get(agentId);
                      return (
                        <div key={agentId} className="flex flex-col items-center gap-0.5">
                          <div className={`relative w-8 h-8 rounded-lg overflow-hidden border ${
                            state?.status === 'working' ? 'border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.4)]' :
                            state?.status === 'done' ? 'border-emerald-400/60' :
                            'border-white/10'
                          }`}>
                            <div className="scale-[0.6] origin-top-left -translate-x-[1px]">
                              <PixelCharacter visual={a.visual} size="sm" active={true} />
                            </div>
                            {state?.status === 'working' && (
                              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse border border-slate-900" />
                            )}
                            {state?.status === 'done' && (
                              <div className="absolute bottom-0 right-0 text-[8px]">✅</div>
                            )}
                          </div>
                          <span className={`text-[8px] ${
                            state?.status === 'working' ? 'text-indigo-300' :
                            state?.status === 'done' ? 'text-emerald-400/70' :
                            'text-white/20'
                          }`}>{a.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Connector arrow */}
                {!isLast && (
                  <div className="flex items-center self-center py-4 mx-1">
                    <div className={`w-6 h-[2px] ${
                      isDone ? 'bg-emerald-400/50' :
                      isActive ? 'bg-indigo-400/30' : 'bg-white/10'
                    }`} />
                    <div className={`w-0 h-0 border-y-[3px] border-y-transparent border-l-[4px] ${
                      isDone ? 'border-l-emerald-400/50' :
                      isActive ? 'border-l-indigo-400/30' : 'border-l-white/10'
                    }`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${mission.overallProgress}%`,
              background: 'linear-gradient(90deg, #10b981, #6366f1, #a78bfa)',
            }} />
        </div>
      </div>
    </div>
  );
}

export function OrgTree({ agents, onSelect, selectedId, mission, elapsed }: Props) {
  const roots = buildTree(agents);
  const hasMission = mission && mission.phases.length > 0;

  return (
    <div className="overflow-x-auto p-4">
      {/* Mission flow panel — only during execution */}
      {hasMission && mission && (
        <MissionFlowPanel mission={mission} agents={agents} elapsed={elapsed} />
      )}

      {/* Org tree */}
      <div className="flex justify-center">
        <div className="flex flex-col items-center gap-2">
          {roots.map(root => (
            <NodeComponent key={root.agent.id} node={root} onSelect={onSelect} selectedId={selectedId} mission={mission} />
          ))}
        </div>
      </div>
    </div>
  );
}
