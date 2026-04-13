import type { Agent } from '../types';
import { LEVELS } from '../data/constants';

interface Props {
  agents: Agent[];
  onSelect: (agent: Agent) => void;
}

function getExpProgress(exp: number): { current: number; next: number; percent: number } {
  let current = 0;
  let next = LEVELS[1]?.requiredExp ?? 100;
  for (let i = 0; i < LEVELS.length; i++) {
    if (exp >= LEVELS[i].requiredExp) {
      current = LEVELS[i].requiredExp;
      next = LEVELS[i + 1]?.requiredExp ?? LEVELS[i].requiredExp;
    }
  }
  if (next === current) return { current, next, percent: 100 };
  return { current, next, percent: Math.round(((exp - current) / (next - current)) * 100) };
}

function getMedalEmoji(index: number): string {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `${index + 1}.`;
}

export function ScoreBoard({ agents, onSelect }: Props) {
  const sorted = [...agents].sort((a, b) => b.exp - a.exp);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold opacity-60 uppercase tracking-wider">Score Board</h3>
      {sorted.map((agent, i) => {
        const progress = getExpProgress(agent.exp);
        return (
          <button
            key={agent.id}
            onClick={() => onSelect(agent)}
            className="w-full flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer text-left"
          >
            <span className="text-lg w-8 text-center">{getMedalEmoji(i)}</span>
            <span className="text-xl">{agent.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold truncate">{agent.name}</span>
                <span className="text-xs opacity-50">{agent.title}</span>
                <span className="text-xs text-indigo-400 ml-auto">Lv.{agent.level}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <span className="text-[10px] opacity-40 whitespace-nowrap">{agent.exp} EXP</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
