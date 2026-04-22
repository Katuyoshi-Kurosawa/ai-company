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
  // Row 2 の3列目は空き（meeting-a + meeting-b で2列分）
  { id: 'open-office', colSpan: 3 },
  { id: 'break', colSpan: 3 },
];

/**
 * colSpan に対応する Tailwind クラスを返す
 * ※ Tailwind の JIT で動的クラス生成は効かないため、明示的にマッピング
 */
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
  // エージェントを部屋ごとにグルーピング
  // 実行中はアクティビティの room を優先、それ以外はデフォルト room を使用
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
    <div className="grid grid-cols-3 gap-3 p-4 h-full content-start">
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
  );
}
