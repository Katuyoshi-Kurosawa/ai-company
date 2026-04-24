/**
 * FloorMap - オフィスフロアマップコンポーネント
 *
 * 6つの部屋を CSS Grid で配置し、フロアプランの雰囲気で表示する。
 */
import { useMemo } from 'react';
import type { Agent, RoomId } from '../types';
import type { AgentActivity } from '../hooks/useOfficeActivity';
import { RoomSection } from './RoomSection';

interface Props {
  agents: Agent[];
  activities: Map<string, AgentActivity>;
  activeRooms: Set<RoomId>;
  isRunning: boolean;
  selectedAgentId?: string;
  onAgentClick: (agent: Agent) => void;
}

const ROOM_LAYOUT: { id: RoomId; colSpan: number }[] = [
  { id: 'president', colSpan: 1 },
  { id: 'executive', colSpan: 2 },
  { id: 'meeting-a', colSpan: 1 },
  { id: 'meeting-b', colSpan: 1 },
  { id: 'break', colSpan: 1 },
  { id: 'open-office', colSpan: 3 },
];

function colSpanClass(span: number): string {
  if (span === 2) return 'col-span-2';
  if (span === 3) return 'col-span-3';
  return '';
}

export function FloorMap({
  agents,
  activities,
  activeRooms,
  isRunning,
  selectedAgentId,
  onAgentClick,
}: Props) {
  const agentsByRoom = useMemo(() => {
    const map = new Map<RoomId, Agent[]>();
    for (const room of ROOM_LAYOUT) map.set(room.id, []);
    for (const agent of agents) {
      const activity = activities.get(agent.id);
      const room = (isRunning && activity?.room) ? activity.room : agent.room;
      const list = map.get(room);
      if (list) list.push(agent);
      else map.set(room, [agent]);
    }
    return map;
  }, [agents, activities, isRunning]);

  const activeCount = agents.filter(a => {
    const act = activities.get(a.id);
    return act && act.action !== 'idle';
  }).length;

  return (
    <div className="relative h-full" style={{ background: '#0e0e18' }}>
      {/* フロア背景 - タイル模様 */}
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: `
          linear-gradient(rgba(100,100,160,0.5) 1px, transparent 1px),
          linear-gradient(90deg, rgba(100,100,160,0.5) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }} />

      {/* 廊下の光（部屋間） */}
      <div className="absolute left-0 right-0 opacity-[0.02]"
        style={{ top: '38%', height: '24px', background: 'linear-gradient(90deg, transparent, #6060a0, transparent)' }} />

      {/* フロアヘッダー */}
      <div className="relative flex items-center gap-3 px-4 pt-2 pb-1">
        <div className="flex items-center gap-2.5">
          {/* フロアアイコン */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded"
            style={{ background: 'rgba(100,100,180,0.1)', border: '1px solid rgba(100,100,180,0.15)' }}>
            <span className="text-[10px] font-bold" style={{ color: '#6a6aaa' }}>3F</span>
          </div>
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'rgba(140,140,180,0.5)' }}>
            Main Floor
          </span>
        </div>
        <div className="flex-1 h-[1px]" style={{ background: 'linear-gradient(90deg, rgba(100,100,160,0.2), transparent)' }} />
        <div className="flex items-center gap-3">
          {isRunning && activeCount > 0 && (
            <span className="text-[10px] font-bold" style={{ color: '#6ab88a' }}>
              {activeCount}名 稼働中
            </span>
          )}
          <span className="text-[10px] font-mono" style={{ color: 'rgba(140,140,180,0.35)' }}>
            {agents.length}名在籍
          </span>
        </div>
      </div>

      {/* 部屋グリッド */}
      <div className="relative grid grid-cols-3 gap-2 px-3 pb-3 content-start">
        {ROOM_LAYOUT.map((room) => (
          <RoomSection
            key={room.id}
            roomId={room.id}
            agents={agentsByRoom.get(room.id) ?? []}
            activities={activities}
            isRunning={isRunning}
            selectedAgentId={selectedAgentId}
            isActiveRoom={activeRooms.has(room.id)}
            onAgentClick={onAgentClick}
            className={colSpanClass(room.colSpan)}
          />
        ))}
      </div>
    </div>
  );
}
