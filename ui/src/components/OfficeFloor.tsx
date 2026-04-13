import type { Agent, RoomId } from '../types';

interface Props {
  agents: Agent[];
  onSelect: (agent: Agent) => void;
  selectedId?: string;
}

function getStatusDot(agent: Agent) {
  if (!agent.active) return 'bg-gray-500';
  return 'bg-emerald-400';
}

function AgentBadge({ agent, onSelect, isSelected }: { agent: Agent; onSelect: () => void; isSelected: boolean }) {
  const genderIcon = agent.visual.gender === 'female' ? '👩‍💼' : '👨‍💼';
  return (
    <button
      onClick={onSelect}
      className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer
        ${isSelected
          ? 'bg-blue-500/15 ring-1 ring-blue-400/50 shadow-lg shadow-blue-500/10'
          : 'bg-white/[0.03] hover:bg-white/[0.07]'
        }`}
    >
      <div className="relative">
        <span className="text-2xl">{agent.icon}</span>
        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#181b25] ${getStatusDot(agent)}`} />
      </div>
      <div className="text-left min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{genderIcon}</span>
          <span className="text-sm font-semibold truncate">{agent.name}</span>
          <span className="text-[10px] font-medium text-blue-400">Lv.{agent.level}</span>
        </div>
        <span className="text-[11px] opacity-50 truncate block">{agent.title}</span>
      </div>
    </button>
  );
}

function Room({ roomId, label, icon, agents, onSelect, selectedId }: {
  roomId: RoomId; label: string; icon: string;
  agents: Agent[]; onSelect: (a: Agent) => void; selectedId?: string;
}) {
  const isLarge = roomId === 'open-office';
  const isPresident = roomId === 'president';
  const isMeeting = roomId.startsWith('meeting');

  return (
    <div
      className={`rounded-xl border transition-all
        ${isPresident ? 'bg-gradient-to-br from-amber-500/[0.04] to-transparent border-amber-500/20' : ''}
        ${isMeeting ? 'bg-gradient-to-br from-blue-500/[0.03] to-transparent border-blue-500/15' : ''}
        ${!isPresident && !isMeeting ? 'bg-white/[0.02] border-white/[0.06]' : ''}
        ${isLarge ? 'col-span-2' : ''}
      `}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06]">
        <span className="text-base">{icon}</span>
        <span className="text-sm font-semibold tracking-wide">{label}</span>
        <span className="text-[10px] ml-auto opacity-30">{agents.length}名</span>
      </div>
      <div className={`p-3 ${isLarge ? 'grid grid-cols-2 gap-2' : 'space-y-2'}`}>
        {agents.length > 0 ? (
          agents.map(a => (
            <AgentBadge key={a.id} agent={a} onSelect={() => onSelect(a)} isSelected={a.id === selectedId} />
          ))
        ) : (
          <div className="text-center py-4 text-xs opacity-20">不在</div>
        )}
      </div>
    </div>
  );
}

export function OfficeFloor({ agents, onSelect, selectedId }: Props) {
  const agentsByRoom = (roomId: RoomId) => agents.filter(a => a.room === roomId);

  return (
    <div className="space-y-4">
      {/* 上段: 社長室 + 役員室 */}
      <div className="grid grid-cols-2 gap-4">
        <Room roomId="president" label="社長室" icon="🏛️"
          agents={agentsByRoom('president')} onSelect={onSelect} selectedId={selectedId} />
        <Room roomId="executive" label="役員室" icon="🪑"
          agents={agentsByRoom('executive')} onSelect={onSelect} selectedId={selectedId} />
      </div>

      {/* 中段: 会議室×2 + 休憩室 */}
      <div className="grid grid-cols-3 gap-4">
        <Room roomId="meeting-a" label="会議室A" icon="📊"
          agents={agentsByRoom('meeting-a')} onSelect={onSelect} selectedId={selectedId} />
        <Room roomId="meeting-b" label="会議室B" icon="💬"
          agents={agentsByRoom('meeting-b')} onSelect={onSelect} selectedId={selectedId} />
        <Room roomId="break" label="休憩室" icon="☕"
          agents={agentsByRoom('break')} onSelect={onSelect} selectedId={selectedId} />
      </div>

      {/* 下段: オープンオフィス */}
      <div className="grid grid-cols-1">
        <Room roomId="open-office" label="オープンオフィス" icon="🖥️"
          agents={agentsByRoom('open-office')} onSelect={onSelect} selectedId={selectedId} />
      </div>
    </div>
  );
}
