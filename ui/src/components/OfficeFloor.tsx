import type { Agent, RoomId } from '../types';
import type { AgentActivity } from '../hooks/useOfficeActivity';
import { PixelCharacter } from './PixelCharacter';
import { SpeechBubble } from './SpeechBubble';

interface Props {
  agents: Agent[];
  onSelect: (agent: Agent) => void;
  selectedId?: string;
  // ライブモード用
  isLive?: boolean;
  activities?: Map<string, AgentActivity>;
  activeRooms?: Set<RoomId>;
  energyLevel?: number;
  livePhase?: string;
  liveProgress?: number;
  liveAgentCount?: number;
  // クリックで話す
  onAgentClick?: (agentId: string, room: RoomId) => void;
}

/* ---- Room background SVG patterns ---- */
function RoomBg({ type }: { type: 'president' | 'executive' | 'meeting' | 'break' | 'office' }) {
  const wallColors = {
    president: { top: '#e8dcc8', bot: '#d4c4a8', accent: '#c0a878' },
    executive: { top: '#d8dce8', bot: '#c4c8d8', accent: '#8090b0' },
    meeting: { top: '#d0e0d8', bot: '#b8d0c4', accent: '#80a898' },
    break: { top: '#e8d8d0', bot: '#d8c8bc', accent: '#c0a090' },
    office: { top: '#dce0e8', bot: '#c8ccd8', accent: '#8898b0' },
  };
  const c = wallColors[type];
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
      {/* Wall */}
      <rect width="400" height="140" fill={c.top}/>
      <rect y="140" width="400" height="60" fill={c.bot}/>
      {/* Baseboard */}
      <rect y="135" width="400" height="5" fill={c.accent} opacity="0.5"/>
      {/* Window / shelf depending on room */}
      {type === 'president' && (<g>
        {/* Luxury window */}
        <rect x="140" y="15" width="120" height="80" rx="2" fill="#a0c8e8" opacity="0.5"/>
        <rect x="142" y="17" width="56" height="76" fill="#c0ddf0" opacity="0.4"/>
        <rect x="202" y="17" width="56" height="76" fill="#c0ddf0" opacity="0.4"/>
        <line x1="200" y1="15" x2="200" y2="95" stroke="#c0a878" strokeWidth="2"/>
        <rect x="138" y="12" width="124" height="4" rx="1" fill={c.accent}/>
        <rect x="138" y="95" width="124" height="4" rx="1" fill={c.accent}/>
        {/* Curtains */}
        <path d="M140,16 Q135,50 138,96" stroke="#d4b888" strokeWidth="3" fill="none" opacity="0.4"/>
        <path d="M260,16 Q265,50 262,96" stroke="#d4b888" strokeWidth="3" fill="none" opacity="0.4"/>
        {/* Plant */}
        <rect x="20" y="90" width="20" height="45" rx="3" fill="#8B6F47" opacity="0.6"/>
        <ellipse cx="30" cy="85" rx="18" ry="15" fill="#4a8a4a" opacity="0.6"/>
        <ellipse cx="26" cy="80" rx="10" ry="8" fill="#5aa05a" opacity="0.5"/>
      </g>)}
      {type === 'executive' && (<g>
        {/* Bookshelf */}
        <rect x="10" y="20" width="80" height="110" fill="#8B6F47" opacity="0.3"/>
        <rect x="14" y="24" width="72" height="20" fill="#7a5f3a" opacity="0.2"/>
        <rect x="14" y="48" width="72" height="20" fill="#7a5f3a" opacity="0.2"/>
        <rect x="14" y="72" width="72" height="20" fill="#7a5f3a" opacity="0.2"/>
        {/* Books */}
        {[0,1,2].map(row => [0,1,2,3,4,5].map(i => (
          <rect key={`b${row}${i}`} x={18+i*12} y={26+row*24} width={8} height={16} rx={1}
            fill={['#4a6fa5','#c04040','#40a040','#d4a030','#6040a0','#a04060'][i]} opacity={0.5}/>
        )))}
        {/* Window */}
        <rect x="280" y="20" width="100" height="70" rx="2" fill="#a0c8e8" opacity="0.4"/>
        <line x1="330" y1="20" x2="330" y2="90" stroke="#8090b0" strokeWidth="1.5"/>
        <line x1="280" y1="55" x2="380" y2="55" stroke="#8090b0" strokeWidth="1.5"/>
      </g>)}
      {type === 'meeting' && (<g>
        {/* Whiteboard */}
        <rect x="100" y="15" width="200" height="90" rx="3" fill="#f0f4f0" opacity="0.7" stroke="#80a898" strokeWidth="1"/>
        <rect x="110" y="25" width="80" height="2" rx="1" fill="#80a898" opacity="0.3"/>
        <rect x="110" y="35" width="120" height="2" rx="1" fill="#80a898" opacity="0.2"/>
        <rect x="110" y="45" width="60" height="2" rx="1" fill="#4080c0" opacity="0.3"/>
        <rect x="110" y="55" width="100" height="2" rx="1" fill="#80a898" opacity="0.2"/>
        {/* Marker tray */}
        <rect x="130" y="105" width="140" height="5" rx="1" fill="#888" opacity="0.3"/>
      </g>)}
      {type === 'break' && (<g>
        {/* Vending machine */}
        <rect x="20" y="30" width="50" height="100" rx="3" fill="#4060a0" opacity="0.3"/>
        <rect x="25" y="35" width="40" height="50" rx="2" fill="#60a0d0" opacity="0.2"/>
        {/* Coffee cup icon */}
        <rect x="35" y="50" width="12" height="10" rx="2" fill="#fff" opacity="0.3"/>
        <path d="M47,52 Q52,55 47,58" stroke="#fff" strokeWidth="1" fill="none" opacity="0.3"/>
        {/* Window */}
        <rect x="260" y="20" width="120" height="70" rx="2" fill="#a0c8e8" opacity="0.35"/>
        {/* Sofa shape */}
        <rect x="300" y="110" width="80" height="25" rx="8" fill="#a08060" opacity="0.25"/>
      </g>)}
      {type === 'office' && (<g>
        {/* Multiple shelves */}
        {[0,1,2].map(i => (
          <g key={`s${i}`}>
            <rect x={10+i*140} y="15" width="100" height="115" fill="#8B6F47" opacity="0.2"/>
            {[0,1,2,3].map(r => (
              <rect key={`sr${i}${r}`} x={14+i*140} y={19+r*28} width={92} height={22} fill="#7a5f3a" opacity="0.15"/>
            ))}
            {/* Folder/books */}
            {[0,1,2,3].map(r => [0,1,2,3,4,5,6].map(b => (
              <rect key={`fb${i}${r}${b}`} x={18+i*140+b*13} y={21+r*28} width={9} height={18} rx={1}
                fill={['#4a6fa5','#c04040','#40a060','#d4a030','#6040a0','#e06080','#40a0a0'][(b+r+i)%7]} opacity={0.35}/>
            )))}
          </g>
        ))}
        {/* Windows at top */}
        <rect x="120" y="8" width="60" height="4" fill="#a0c8e8" opacity="0.3"/>
        <rect x="220" y="8" width="60" height="4" fill="#a0c8e8" opacity="0.3"/>
        <rect x="320" y="8" width="60" height="4" fill="#a0c8e8" opacity="0.3"/>
      </g>)}
      {/* Floor shine */}
      <ellipse cx="200" cy="175" rx="180" ry="15" fill="#fff" opacity="0.08"/>
    </svg>
  );
}

/* ---- アクション別CSSクラス ---- */
function getActionStyle(action?: string): string {
  switch (action) {
    case 'working':     return 'animate-pulse ring-2 ring-blue-400/40';
    case 'walking':     return 'animate-bounce opacity-70';
    case 'celebrating': return 'ring-2 ring-yellow-400/60 scale-110';
    case 'reviewing':   return 'ring-2 ring-purple-400/40';
    case 'meeting':     return 'ring-2 ring-green-400/40';
    case 'resting':     return 'opacity-60';
    default:            return '';
  }
}

/* ---- Agent in room (ライブ対応) ---- */
function AgentBadge({ agent, onSelect, isSelected, activity }: {
  agent: Agent; onSelect: () => void; isSelected: boolean;
  activity?: AgentActivity;
}) {
  const actionStyle = activity ? getActionStyle(activity.action) : '';
  const isCelebrating = activity?.action === 'celebrating';

  return (
    <button
      onClick={onSelect}
      className={`group relative flex flex-col items-center p-1.5 rounded-lg cursor-pointer
        transition-all duration-500
        ${isSelected
          ? 'bg-white/20 ring-1 ring-white/40 shadow-lg shadow-blue-500/10 scale-105'
          : 'hover:bg-white/10'
        }
        ${actionStyle}`}
    >
      {/* 吹き出し */}
      {activity?.speech && (
        <SpeechBubble text={activity.speech} position="top" />
      )}

      {/* 🎉 エフェクト */}
      {isCelebrating && (
        <div className="absolute -top-1 -right-1 text-sm animate-bounce">🎉</div>
      )}

      <PixelCharacter visual={agent.visual} size="sm" active={activity ? activity.action !== 'resting' : agent.active} />
      <div className="text-center mt-0.5 px-1">
        <div className="text-[11px] font-bold text-gray-800 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)] truncate max-w-[70px]">
          {agent.name}
        </div>
        <div className="text-[9px] text-gray-600 drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)] truncate max-w-[70px]">
          {agent.title}
        </div>
        {/* ライブ中はアクション状態を表示 */}
        {activity && activity.action !== 'idle' ? (
          <span className={`inline-block text-[8px] mt-0.5 px-1.5 py-0.5 rounded-full font-bold
            ${activity.action === 'working' ? 'bg-blue-500/20 text-blue-700' :
              activity.action === 'celebrating' ? 'bg-yellow-500/20 text-yellow-700' :
              activity.action === 'walking' ? 'bg-orange-500/20 text-orange-700' :
              activity.action === 'resting' ? 'bg-gray-500/20 text-gray-600' :
              'bg-green-500/20 text-green-700'
            }`}>
            {activity.action === 'working' ? '作業中' :
              activity.action === 'celebrating' ? '完了!' :
              activity.action === 'walking' ? '移動中' :
              activity.action === 'resting' ? '休憩' :
              activity.action === 'reviewing' ? 'レビュー' :
              activity.action === 'meeting' ? '会議中' : ''}
          </span>
        ) : (
          <span className={`inline-block w-1.5 h-1.5 rounded-full mt-0.5 ${agent.active ? 'bg-emerald-400' : 'bg-gray-400'}`} />
        )}
      </div>
    </button>
  );
}

/* ---- Room component (ライブ対応) ---- */
function Room({ roomId, label, icon, agents, onSelect, selectedId, bgType, isLive, activeRooms, activities, onAgentClick }: {
  roomId: RoomId; label: string; icon: string;
  agents: Agent[]; onSelect: (a: Agent) => void; selectedId?: string;
  bgType: 'president' | 'executive' | 'meeting' | 'break' | 'office';
  isLive?: boolean; activeRooms?: Set<RoomId>; activities?: Map<string, AgentActivity>;
  onAgentClick?: (agentId: string, room: RoomId) => void;
}) {
  const isLarge = roomId === 'open-office';
  const isRoomActive = isLive && activeRooms?.has(roomId);

  return (
    <div className={`relative rounded-xl overflow-hidden border shadow-lg transition-all duration-500
      ${isLarge ? 'col-span-full' : ''}
      ${isRoomActive
        ? 'border-blue-400/40 shadow-blue-500/20 shadow-xl'
        : 'border-white/10'
      }`}
      style={{ minHeight: isLarge ? 180 : 140 }}
    >
      {/* Anime background */}
      <RoomBg type={bgType}/>

      {/* LIVE badge */}
      {isRoomActive && (
        <div className="absolute top-1.5 right-2 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/90 backdrop-blur-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[9px] font-bold text-white tracking-wider">LIVE</span>
        </div>
      )}

      {/* Room label overlay */}
      <div className="relative z-10">
        <div className={`flex items-center gap-2 px-3 py-1.5 backdrop-blur-sm border-b transition-colors duration-500
          ${isRoomActive ? 'bg-blue-900/30 border-blue-400/20' : 'bg-black/20 border-white/10'}`}>
          <span className="text-sm">{icon}</span>
          <span className="text-xs font-bold text-white drop-shadow-md">{label}</span>
          <span className={`text-[10px] ml-auto ${isRoomActive ? 'text-blue-200' : 'text-white/60'}`}>
            {agents.length}名
          </span>
        </div>

        {/* Agents */}
        <div className={`p-2 flex flex-wrap gap-1 ${isLarge ? 'justify-center' : 'justify-center'}`}>
          {agents.length > 0 ? (
            agents.map(a => (
              <AgentBadge key={a.id} agent={a} onSelect={() => { onSelect(a); onAgentClick?.(a.id, roomId); }} isSelected={a.id === selectedId}
                activity={activities?.get(a.id)} />
            ))
          ) : (
            <div className="text-center py-6 text-xs text-gray-500 drop-shadow">不在</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---- エネルギーバー ---- */
function EnergyBar({ energy, phase, progress, agentCount }: {
  energy: number; phase: string; progress: number; agentCount: number;
}) {
  const barColor = energy < 30 ? '#3b82f6' : energy < 70 ? '#eab308' : '#ef4444';

  return (
    <div className="rounded-xl p-3 mb-3 border border-white/10"
      style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)' }}>
      <div className="flex items-center gap-3">
        <span className="text-lg">⚡</span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-white/80">オフィス活性度</span>
            <span className="text-xs text-white/50">稼働: {agentCount}/13名</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${energy}%`, background: barColor }} />
          </div>
        </div>
        <span className="text-sm font-bold text-white/80 min-w-[36px] text-right">{energy}%</span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-white/60">{phase}</span>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-indigo-400 transition-all duration-700"
              style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[10px] text-white/40">{progress}%</span>
        </div>
      </div>
    </div>
  );
}

/* ---- Main floor layout (ライブ対応) ---- */
export function OfficeFloor({ agents, onSelect, selectedId, isLive, activities, activeRooms, energyLevel, livePhase, liveProgress, liveAgentCount, onAgentClick }: Props) {
  // ライブモード時: activitiesのroomでエージェントを配置
  const byRoom = (id: RoomId) => {
    if (isLive && activities && activities.size > 0) {
      return agents.filter(a => {
        const act = activities.get(a.id);
        return act ? act.room === id : a.room === id;
      });
    }
    return agents.filter(a => a.room === id);
  };

  return (
    <div className="space-y-3">
      {/* エネルギーバー（ライブ時のみ） */}
      {isLive && (
        <EnergyBar
          energy={energyLevel ?? 0}
          phase={livePhase ?? '待機中'}
          progress={liveProgress ?? 0}
          agentCount={liveAgentCount ?? 0}
        />
      )}

      {/* Top: President + Executive */}
      <div className="grid grid-cols-2 gap-3">
        <Room roomId="president" label="社長室" icon="🏛️" bgType="president"
          agents={byRoom('president')} onSelect={onSelect} selectedId={selectedId}
          isLive={isLive} activeRooms={activeRooms} activities={activities} onAgentClick={onAgentClick} />
        <Room roomId="executive" label="役員室" icon="🪑" bgType="executive"
          agents={byRoom('executive')} onSelect={onSelect} selectedId={selectedId}
          isLive={isLive} activeRooms={activeRooms} activities={activities} onAgentClick={onAgentClick} />
      </div>

      {/* Mid: Meeting rooms + Break */}
      <div className="grid grid-cols-3 gap-3">
        <Room roomId="meeting-a" label="会議室A" icon="📊" bgType="meeting"
          agents={byRoom('meeting-a')} onSelect={onSelect} selectedId={selectedId}
          isLive={isLive} activeRooms={activeRooms} activities={activities} onAgentClick={onAgentClick} />
        <Room roomId="meeting-b" label="会議室B" icon="💬" bgType="meeting"
          agents={byRoom('meeting-b')} onSelect={onSelect} selectedId={selectedId}
          isLive={isLive} activeRooms={activeRooms} activities={activities} onAgentClick={onAgentClick} />
        <Room roomId="break" label="休憩室" icon="☕" bgType="break"
          agents={byRoom('break')} onSelect={onSelect} selectedId={selectedId}
          isLive={isLive} activeRooms={activeRooms} activities={activities} onAgentClick={onAgentClick} />
      </div>

      {/* Bottom: Open office */}
      <Room roomId="open-office" label="オープンオフィス" icon="🖥️" bgType="office"
        agents={byRoom('open-office')} onSelect={onSelect} selectedId={selectedId}
        isLive={isLive} activeRooms={activeRooms} activities={activities} onAgentClick={onAgentClick} />
    </div>
  );
}
