/**
 * OfficeView - オフィス画面のレイアウトオーケストレーター
 *
 * FloorMap + AgentSidePanel + PhaseBar(MissionTimeline) + QuestLog を
 * 1つのビューに統合する。実行状態に応じてオーバーレイ要素の表示を切り替える。
 */
import { useState } from 'react';
import type { Agent, RoomId } from '../types';
import type { AgentActivity } from '../hooks/useOfficeActivity';
import { FloorMap } from './FloorMap';
import { AgentSidePanel } from './AgentSidePanel';

/* ── クエストアイテムの型 ── */
interface QuestItem {
  label: string;
  status: 'active' | 'done' | 'error';
}

/* ── Props ── */
interface Props {
  agents: Agent[];
  activities: Map<string, AgentActivity>;
  activeRooms: Set<RoomId>;
  isRunning: boolean;
  executing: boolean;
  questItems?: QuestItem[];
  /** PhaseBar / MissionTimeline を外部から注入 */
  missionTimeline?: React.ReactNode;
  onUpdateAgent: (id: string, updates: Partial<Agent>) => void;
  onTriggerSpeech?: (agentId: string, room: RoomId) => void;
}

/* ── ステータスアイコン ── */

/** 完了アイテム: 緑チェックマーク */
function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

/** アクティブアイテム: インジゴ再生アイコン + パルスアニメーション */
function PlayIcon() {
  return (
    <svg className="w-4 h-4 text-indigo-400 shrink-0 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/** エラーアイテム: 赤バツ */
function XIcon() {
  return (
    <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/** クエストアイテム1行分の表示 */
function QuestItemRow({ item }: { item: QuestItem }) {
  const icon =
    item.status === 'done' ? <CheckIcon /> :
    item.status === 'active' ? <PlayIcon /> :
    <XIcon />;

  const textClass =
    item.status === 'done'
      ? 'text-white/40 line-through'
      : 'text-white/90';

  return (
    <li className="flex items-start gap-2 py-1">
      {icon}
      <span className={`text-xs leading-tight ${textClass}`}>{item.label}</span>
    </li>
  );
}

/* ── メインコンポーネント ── */
export function OfficeView({
  agents,
  activities,
  activeRooms,
  isRunning,
  executing,
  questItems,
  missionTimeline,
  onUpdateAgent,
  onTriggerSpeech,
}: Props) {
  // 選択中のエージェント（初期値: CEO、いなければ先頭）
  const [selectedAgent, setSelectedAgent] = useState<Agent>(
    () => agents.find(a => a.id === 'ceo') ?? agents[0],
  );

  /**
   * エージェントクリック時のハンドラ
   * - サイドパネルを切り替える
   * - 実行中ならスピーチバブルをトリガーする
   */
  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);

    if (isRunning && onTriggerSpeech) {
      const activity = activities.get(agent.id);
      const room = activity?.room ?? agent.room;
      onTriggerSpeech(agent.id, room);
    }
  };

  return (
    <div className="h-full flex relative">
      {/* ── PhaseBar / MissionTimeline: 実行中のみ上部に表示 ── */}
      {executing && missionTimeline && (
        <div className="absolute top-0 left-0 right-[360px] z-30">
          {missionTimeline}
        </div>
      )}

      {/* ── FloorMap: メインエリア（スクロール可） ── */}
      <div className="flex-1 min-w-0 overflow-auto relative">
        <FloorMap
          agents={agents}
          activities={activities}
          activeRooms={activeRooms}
          isRunning={isRunning}
          selectedAgentId={selectedAgent?.id}
          onAgentClick={handleAgentClick}
        />

        {/* ── QuestLog オーバーレイ: 実行中かつアイテムがあるときのみ表示 ── */}
        {executing && questItems && questItems.length > 0 && (
          <div className="absolute bottom-4 right-4 z-20 w-64 rounded-xl border border-white/10 bg-black/60 backdrop-blur-md shadow-lg">
            {/* ヘッダー */}
            <div className="px-3 py-2 border-b border-white/10 text-xs font-bold text-amber-300 tracking-wide uppercase">
              Quest Log
            </div>
            {/* アイテムリスト */}
            <ul className="px-3 py-2 space-y-0.5 max-h-48 overflow-y-auto">
              {questItems.map((item, i) => (
                <QuestItemRow key={`${item.label}-${i}`} item={item} />
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── AgentSidePanel: 右固定 360px ── */}
      {selectedAgent && (
        <AgentSidePanel
          agent={selectedAgent}
          allAgents={agents}
          onUpdate={onUpdateAgent}
        />
      )}
    </div>
  );
}
