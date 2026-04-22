/**
 * RoomSection - 部屋カードコンポーネント
 *
 * 部屋ヘッダー（アイコン + 部屋名 + 在室人数バッジ）と
 * AgentSlotのflex-wrapグリッドを表示する。
 * 実行中にアクティブなエージェントがいる部屋はボーダーが強調される。
 */
import { useMemo } from 'react';
import type { Agent, RoomId } from '../types';
import type { AgentActivity } from '../hooks/useOfficeActivity';
import { AgentSlot } from './AgentSlot';
import { ROOMS } from '../data/constants';

interface Props {
  roomId: RoomId;
  /** この部屋に現在いるエージェント一覧 */
  agents: Agent[];
  /** 全エージェントのアクティビティマップ */
  activities: Map<string, AgentActivity>;
  /** システム実行中フラグ */
  isRunning: boolean;
  /** サイドパネルで選択中のエージェントID */
  selectedAgentId?: string;
  /** 実行中にアクティブなエージェントがいる部屋かどうか */
  isActiveRoom: boolean;
  /** エージェントクリック時のコールバック */
  onAgentClick: (agent: Agent) => void;
  /** 親からのレイアウト用クラス（col-span等） */
  className?: string;
}

export function RoomSection({
  roomId,
  agents,
  activities,
  isRunning,
  selectedAgentId,
  isActiveRoom,
  onAgentClick,
  className = '',
}: Props) {
  // 部屋のメタ情報を取得（フォールバック付き）
  const roomInfo = useMemo(
    () => ROOMS.find((r) => r.id === roomId) ?? { id: roomId, label: roomId, icon: '?', description: '' },
    [roomId],
  );

  // アクティブ/非アクティブでスタイルを切り替え
  const containerStyle = isActiveRoom
    ? 'border-indigo-500/30 bg-white/[0.04]'
    : 'border-white/10 bg-white/[0.02]';

  return (
    <div
      className={[
        'rounded-xl border transition-colors duration-300',
        containerStyle,
        className,
      ].join(' ')}
    >
      {/* --- 部屋ヘッダー --- */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-base">{roomInfo.icon}</span>
          <span className="text-sm font-medium text-white/70">{roomInfo.label}</span>
        </div>
        {/* 在室人数バッジ */}
        <span
          className={[
            'min-w-[20px] px-1.5 py-0.5 rounded-full text-center text-[10px] font-bold leading-none',
            agents.length > 0
              ? 'bg-indigo-500/20 text-indigo-300'
              : 'bg-white/5 text-white/30',
          ].join(' ')}
        >
          {agents.length}
        </span>
      </div>

      {/* --- エージェント一覧 --- */}
      <div className="flex flex-wrap gap-1 p-3 justify-center min-h-[80px] items-start">
        {agents.length > 0 ? (
          agents.map((agent) => (
            <AgentSlot
              key={agent.id}
              agent={agent}
              activity={activities.get(agent.id)}
              isRunning={isRunning}
              selected={agent.id === selectedAgentId}
              onClick={() => onAgentClick(agent)}
            />
          ))
        ) : (
          // 空室フォールバック
          <div className="flex items-center justify-center w-full h-full">
            <span className="text-xs text-white/20 select-none">空室</span>
          </div>
        )}
      </div>
    </div>
  );
}
