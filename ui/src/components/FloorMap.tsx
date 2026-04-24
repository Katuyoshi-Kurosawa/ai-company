/**
 * FloorMap - オフィスフロアマップコンポーネント
 *
 * 6つの部屋を CSS Grid で配置し、各部屋に所属エージェントを表示する。
 * 実行中はエージェントのアクティビティに応じて部屋の割り当てが動的に変わる。
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

/** 部屋の配置定義（3カラムグリッド上の col-span） */
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

  return (
    <div className="relative h-full">
      {/* フロアの背景パターン */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `
          linear-gradient(oklch(0.50 0.02 270) 1px, transparent 1px),
          linear-gradient(90deg, oklch(0.50 0.02 270) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      {/* フロアヘッダー */}
      <div className="relative flex items-center gap-3 px-4 pt-2 pb-1">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ background: 'oklch(0.55 0.10 270)' }} />
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'oklch(0.55 0.05 270)' }}>
            Floor Plan
          </span>
        </div>
        <div className="flex-1 h-[1px]" style={{ background: 'linear-gradient(90deg, oklch(0.30 0.03 270), transparent)' }} />
        <span className="text-[10px] font-mono" style={{ color: 'oklch(0.40 0.03 270)' }}>
          {agents.length}名在籍
        </span>
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
