import type { Agent } from '../types';
import type { MissionProgress, PhaseStatus } from '../hooks/useMissionProgress';

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

function lineColor(status: PhaseStatus): string {
  switch (status) {
    case 'done': return 'bg-emerald-400/50';
    case 'active': return 'bg-indigo-400/30';
    default: return 'bg-white/10';
  }
}

function labelColor(status: PhaseStatus): string {
  switch (status) {
    case 'done': return 'text-emerald-400/70';
    case 'active': return 'text-indigo-300';
    default: return 'text-white/25';
  }
}

export function MissionTimeline({ mission, agents, elapsed, estimatedSec }: Props) {
  if (mission.phases.length === 0) return null;

  const getAgent = (id: string) => agents.find(a => a.id === id);

  // 作業中・次のエージェント
  const workingAgents: string[] = [];
  for (const [id, state] of mission.agentStates) {
    if (state.status === 'working') workingAgents.push(id);
  }
  const nextPhase = mission.currentPhaseIndex >= 0 && mission.currentPhaseIndex + 1 < mission.phases.length
    ? mission.phases[mission.currentPhaseIndex + 1] : null;

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl backdrop-blur-md border border-white/15"
        style={{ background: 'rgba(15,23,42,0.85)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>

        {/* Pulse dot */}
        <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />

        {/* Phase dots pipeline */}
        <div className="flex items-center gap-0">
          {mission.phases.map((phase, i) => {
            const isLast = i === mission.phases.length - 1;
            return (
              <div key={phase.id} className="flex items-center">
                {/* Dot + label */}
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full flex items-center justify-center ${
                    phase.status === 'done' ? 'bg-emerald-400' :
                    phase.status === 'active' ? 'bg-indigo-500 ring-2 ring-indigo-400/50' :
                    'bg-white/15'
                  }`}>
                    {phase.status === 'done' && <span className="text-[7px] text-white font-bold">✓</span>}
                  </div>
                  <span className={`text-[8px] mt-0.5 whitespace-nowrap ${labelColor(phase.status)}`}>
                    {phase.shortLabel}
                  </span>
                </div>
                {/* Line */}
                {!isLast && (
                  <div className={`w-4 h-[2px] mx-0.5 mt-[-10px] ${lineColor(phase.status)}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-white/15 shrink-0" />

        {/* Agent relay: working → next */}
        <div className="flex items-center gap-1 text-[9px] shrink-0">
          {workingAgents.length > 0 && (
            <>
              {workingAgents.slice(0, 3).map(id => {
                const a = getAgent(id);
                return a ? (
                  <span key={id} className="px-1 py-0.5 bg-indigo-500/20 text-indigo-300 rounded">{a.name}</span>
                ) : null;
              })}
              {workingAgents.length > 3 && <span className="text-white/30">+{workingAgents.length - 3}</span>}
            </>
          )}
          {nextPhase && nextPhase.agents.length > 0 && (
            <>
              <span className="text-white/20">→</span>
              {nextPhase.agents.slice(0, 2).map(id => {
                const a = getAgent(id);
                return a ? (
                  <span key={id} className="px-1 py-0.5 bg-white/5 text-white/30 rounded">{a.name}</span>
                ) : null;
              })}
              {nextPhase.agents.length > 2 && <span className="text-white/15">+{nextPhase.agents.length - 2}</span>}
            </>
          )}
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-white/15 shrink-0" />

        {/* Progress + time */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${mission.overallProgress}%`, background: 'linear-gradient(90deg, #6366f1, #a78bfa)' }} />
          </div>
          <span className="text-[10px] font-bold text-indigo-400">{mission.overallProgress}%</span>
          <span className="text-[10px] text-white/35 font-mono">{formatTime(elapsed)}</span>
          {estimatedSec && elapsed > 0 && mission.overallProgress > 5 && mission.overallProgress < 100 && (
            <span className="text-[9px] text-white/20 font-mono">
              /~{formatTime(Math.round(elapsed / (mission.overallProgress / 100)))}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
