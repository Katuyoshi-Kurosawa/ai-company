import type { Agent } from '../types';
import type { MissionProgress, PhaseStatus } from '../hooks/useMissionProgress';
import { PixelCharacter } from './PixelCharacter';

interface Props {
  mission: MissionProgress;
  agents: Agent[];
  elapsed: number;
  estimatedSec?: number;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function phaseColor(status: PhaseStatus): { bg: string; ring: string; text: string; dot: string } {
  switch (status) {
    case 'done': return { bg: 'bg-emerald-500/20', ring: 'ring-emerald-400/60', text: 'text-emerald-400', dot: 'bg-emerald-400' };
    case 'active': return { bg: 'bg-indigo-500/20', ring: 'ring-indigo-400/60', text: 'text-indigo-300', dot: 'bg-indigo-400' };
    default: return { bg: 'bg-white/5', ring: 'ring-white/10', text: 'text-white/30', dot: 'bg-white/20' };
  }
}

export function MissionTimeline({ mission, agents, elapsed, estimatedSec }: Props) {
  if (mission.phases.length === 0) return null;

  const getAgent = (id: string) => agents.find(a => a.id === id);
  const currentPhase = mission.currentPhaseIndex >= 0 ? mission.phases[mission.currentPhaseIndex] : null;

  // 現在アクティブなエージェント
  const workingAgents: string[] = [];
  const doneAgents: string[] = [];
  const waitingAgents: string[] = [];
  for (const [id, state] of mission.agentStates) {
    if (state.status === 'working') workingAgents.push(id);
    else if (state.status === 'done') doneAgents.push(id);
    else if (state.status === 'waiting') waitingAgents.push(id);
  }

  // 次のフェーズのエージェント
  const nextPhase = mission.currentPhaseIndex >= 0 && mission.currentPhaseIndex + 1 < mission.phases.length
    ? mission.phases[mission.currentPhaseIndex + 1] : null;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none max-w-[95vw]">
      <div className="rounded-2xl backdrop-blur-md border border-white/15 overflow-hidden"
        style={{ background: 'rgba(15,23,42,0.88)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>

        {/* Header row */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-white/10">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-xs font-bold text-white/90">MISSION PROGRESS</span>
          <div className="flex-1" />
          <span className="text-[10px] text-white/40 font-mono">
            {formatTime(elapsed)}
            {estimatedSec ? ` / ~${formatTime(estimatedSec)}` : ''}
          </span>
          <span className="text-[10px] font-bold text-indigo-400">{mission.overallProgress}%</span>
        </div>

        {/* Phase steps — horizontal pipeline */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-0">
            {mission.phases.map((phase, i) => {
              const color = phaseColor(phase.status);
              const isLast = i === mission.phases.length - 1;
              return (
                <div key={phase.id} className="flex items-center">
                  {/* Node */}
                  <div className="flex flex-col items-center gap-1 min-w-[52px]">
                    <div className={`relative w-7 h-7 rounded-full flex items-center justify-center ring-2 ${color.ring} ${color.bg}`}>
                      {phase.status === 'done' && <span className="text-emerald-400 text-xs font-bold">✓</span>}
                      {phase.status === 'active' && (
                        <div className={`w-3 h-3 rounded-full ${color.dot} animate-pulse`} />
                      )}
                      {phase.status === 'pending' && (
                        <div className={`w-2 h-2 rounded-full ${color.dot}`} />
                      )}
                      {/* Phase index */}
                      {phase.status === 'pending' && (
                        <span className="absolute -top-0.5 -right-0.5 text-[8px] text-white/20">{i + 1}</span>
                      )}
                    </div>
                    <span className={`text-[9px] font-medium whitespace-nowrap ${color.text}`}>
                      {phase.shortLabel}
                    </span>
                    {/* Agent avatars under active phase */}
                    {phase.status === 'active' && phase.agents.length > 0 && (
                      <div className="flex -space-x-1 mt-0.5">
                        {phase.agents.slice(0, 5).map(agentId => {
                          const a = getAgent(agentId);
                          if (!a) return null;
                          const state = mission.agentStates.get(agentId);
                          return (
                            <div key={agentId} className="relative">
                              <div className={`w-5 h-5 rounded-full overflow-hidden border
                                ${state?.status === 'working' ? 'border-indigo-400 ring-1 ring-indigo-400/40' :
                                  state?.status === 'done' ? 'border-emerald-400' : 'border-white/20'}`}>
                                <div className="scale-[0.45] origin-top-left -translate-x-[2px] -translate-y-[1px]">
                                  <PixelCharacter visual={a.visual} size="sm" active={true} />
                                </div>
                              </div>
                              {state?.status === 'working' && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                              )}
                            </div>
                          );
                        })}
                        {phase.agents.length > 5 && (
                          <span className="text-[8px] text-white/30 ml-1">+{phase.agents.length - 5}</span>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Connector line */}
                  {!isLast && (
                    <div className="relative h-[2px] w-6 mx-0.5 overflow-hidden">
                      <div className={`absolute inset-0 ${
                        phase.status === 'done' ? 'bg-emerald-400/60' :
                        phase.status === 'active' ? 'bg-gradient-to-r from-indigo-400/60 to-white/10' :
                        'bg-white/10'
                      }`} />
                      {phase.status === 'active' && (
                        <div className="absolute inset-0 bg-indigo-400/80 animate-[flowRight_1.5s_ease-in-out_infinite]" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Agent relay bar */}
        <div className="px-4 py-2 border-t border-white/10 flex items-center gap-3 text-[10px]">
          {/* Working agents */}
          {workingAgents.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-indigo-400 font-bold">作業中</span>
              <div className="flex items-center gap-1">
                {workingAgents.map(id => {
                  const a = getAgent(id);
                  return a ? (
                    <span key={id} className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[9px]">
                      {a.name}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Arrow */}
          {workingAgents.length > 0 && nextPhase && nextPhase.agents.length > 0 && (
            <span className="text-white/20">→</span>
          )}

          {/* Next up */}
          {nextPhase && nextPhase.agents.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-white/30 font-bold">次</span>
              <div className="flex items-center gap-1">
                {nextPhase.agents.slice(0, 4).map(id => {
                  const a = getAgent(id);
                  return a ? (
                    <span key={id} className="px-1.5 py-0.5 bg-white/5 text-white/40 rounded text-[9px]">
                      {a.name}
                    </span>
                  ) : null;
                })}
                {nextPhase.agents.length > 4 && (
                  <span className="text-white/20">+{nextPhase.agents.length - 4}</span>
                )}
              </div>
            </div>
          )}

          <div className="flex-1" />

          {/* Progress bar mini */}
          <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${mission.overallProgress}%`,
                background: 'linear-gradient(90deg, #6366f1, #a78bfa)',
              }} />
          </div>

          {/* Time remaining estimate */}
          {estimatedSec && elapsed > 0 && mission.overallProgress > 0 && mission.overallProgress < 100 && (
            <span className="text-white/25 font-mono">
              残~{formatTime(Math.max(0, Math.round(elapsed / (mission.overallProgress / 100) - elapsed)))}
            </span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes flowRight {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
