import type { Agent } from '../types';
import { LEVELS } from '../data/constants';

interface Props {
  agent: Agent;
  onClick: () => void;
  compact?: boolean;
}

function getFrameStyle(level: number) {
  const l = LEVELS.find(lv => lv.level === level) ?? LEVELS[0];
  switch (l.frame) {
    case 'rainbow': return 'bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 p-[2px]';
    case 'diamond': return 'bg-gradient-to-r from-cyan-400 to-cyan-600 p-[2px]';
    case 'platinum': return 'bg-gradient-to-r from-violet-400 to-violet-600 p-[2px]';
    case 'gold': return 'bg-gradient-to-r from-yellow-400 to-yellow-600 p-[2px]';
    default: return 'bg-gradient-to-r from-gray-400 to-gray-600 p-[1px]';
  }
}

export function AgentCard({ agent, onClick, compact }: Props) {
  if (compact) {
    return (
      <button
        onClick={onClick}
        className="flex flex-col items-center p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:scale-105 cursor-pointer"
      >
        <span className="text-2xl">{agent.icon}</span>
        <span className="text-xs font-bold mt-1">{agent.name}</span>
        <span className="text-[10px] opacity-50">{agent.title}</span>
      </button>
    );
  }

  const levelInfo = LEVELS.find(l => l.level === agent.level) ?? LEVELS[0];

  return (
    <button
      onClick={onClick}
      className={`${getFrameStyle(agent.level)} rounded-xl cursor-pointer transition-all hover:scale-[1.02]`}
    >
      <div className="bg-[var(--color-dark-surface)] rounded-[10px] p-4 flex flex-col items-center gap-2">
        <span className="text-4xl">{agent.icon}</span>
        <div className="text-center">
          <div className="font-bold">{agent.name}</div>
          <div className="text-sm opacity-60">{agent.title}</div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-indigo-400 font-bold">Lv.{agent.level}</span>
          <span className="opacity-40">{levelInfo.rank}</span>
        </div>
        <div className="text-xs opacity-40">{agent.model}</div>
      </div>
    </button>
  );
}
