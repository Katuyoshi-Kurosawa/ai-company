/**
 * AgentSlot - アトミックなアバターユニット
 *
 * PixelCharacter(lg) + 役職テキスト + レベルバッジ + ステータスバッジ + XPゲージ
 * を縦に並べた、エージェント1人分のカード表示コンポーネント。
 */
import { useMemo } from 'react';
import type { Agent } from '../types';
import type { AgentActivity } from '../hooks/useOfficeActivity';
import { PixelCharacter } from './PixelCharacter';
import { LEVELS } from '../data/constants';

// --- ステータス定義 ---
type AgentStatus = 'working' | 'meeting' | 'idle' | 'offline';

interface Props {
  agent: Agent;
  activity?: AgentActivity;
  /** システムが現在実行中かどうか */
  isRunning: boolean;
  /** サイドパネルで選択中かどうか */
  selected: boolean;
  onClick: () => void;
}

/** ステータスに応じたドット色 */
const STATUS_DOT_COLOR: Record<AgentStatus, string> = {
  working: 'bg-green-400',
  meeting: 'bg-blue-400',
  idle: 'bg-amber-400',
  offline: 'bg-gray-500',
};

/** ステータスに応じたテキスト色 */
const STATUS_TEXT_COLOR: Record<AgentStatus, string> = {
  working: 'text-green-400',
  meeting: 'text-blue-400',
  idle: 'text-amber-400',
  offline: 'text-gray-500',
};

/** ステータスラベル */
const STATUS_LABEL: Record<AgentStatus, string> = {
  working: '作業中',
  meeting: '会議中',
  idle: '待機中',
  offline: 'オフライン',
};

/**
 * アクティビティからステータスを判定する
 */
function resolveStatus(isRunning: boolean, agent: Agent, activity?: AgentActivity): AgentStatus {
  if (!isRunning) return 'offline';

  const action = activity?.action;
  if (!action) return 'idle';

  // working系アクション
  if (action === 'working' || action === 'reviewing' || action === 'celebrating') {
    return 'working';
  }

  // meeting系アクション: meeting直接 or 会議室への移動中
  if (action === 'meeting') return 'meeting';
  if (action === 'walking' && (agent.room === 'meeting-a' || agent.room === 'meeting-b')) {
    return 'meeting';
  }

  // それ以外(idle, resting, walking to non-meeting)
  return 'idle';
}

/**
 * 現在レベルのXP進捗率を計算する (0~1)
 */
function calcExpProgress(exp: number): number {
  // 現在のレベルと次のレベルの必要XPから進捗を算出
  let currentLevelInfo = LEVELS[0];
  let nextLevelInfo: typeof currentLevelInfo | null = null;

  for (let i = 0; i < LEVELS.length; i++) {
    if (exp >= LEVELS[i].requiredExp) {
      currentLevelInfo = LEVELS[i];
      nextLevelInfo = LEVELS[i + 1] ?? null;
    }
  }

  // 最大レベルに到達済み
  if (!nextLevelInfo) return 1;

  const currentReq = currentLevelInfo.requiredExp;
  const nextReq = nextLevelInfo.requiredExp;
  const range = nextReq - currentReq;

  if (range <= 0) return 1;
  return Math.min(1, Math.max(0, (exp - currentReq) / range));
}

export function AgentSlot({ agent, activity, isRunning, selected, onClick }: Props) {
  const status = useMemo(
    () => resolveStatus(isRunning, agent, activity),
    [isRunning, agent, activity],
  );

  const expProgress = useMemo(() => calcExpProgress(agent.exp), [agent.exp]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        // ベースレイアウト: 縦積み・中央寄せ
        'flex flex-col items-center w-[100px] py-2 px-1 rounded-lg',
        // トランジション
        'transition-all duration-150 ease-out',
        // ホバー演出
        'hover:scale-105 hover:bg-white/5',
        // 選択状態
        selected ? 'ring-2 ring-indigo-400 bg-white/10' : 'bg-transparent',
        // カーソル
        'cursor-pointer',
        // フォーカスリング (キーボード操作用)
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
      ].join(' ')}
    >
      {/* --- 1. アバター + ステータスドット --- */}
      <div className="relative">
        <PixelCharacter
          visual={agent.visual}
          size="lg"
          active={status !== 'offline'}
        />
        {/* ステータスドット: 右下 */}
        <span
          className={[
            'absolute bottom-0 right-0',
            'w-3 h-3 rounded-full border-2 border-[#181b25]',
            STATUS_DOT_COLOR[status],
            // working時にパルスアニメーション
            status === 'working' ? 'animate-pulse' : '',
          ].join(' ')}
        />
      </div>

      {/* --- 2. 名前 + 役職テキスト --- */}
      <span
        className="mt-1 w-full text-center text-[11px] leading-tight text-white/80 font-bold truncate"
        title={agent.name}
      >
        {agent.name}
      </span>
      <span
        className="w-full text-center text-[9px] leading-tight text-gray-500 truncate"
        title={agent.title}
      >
        {agent.title}
      </span>

      {/* --- 3. レベルバッジ --- */}
      <span className="mt-0.5 text-[10px] font-semibold text-indigo-300/80">
        Lv.{agent.level}
      </span>

      {/* --- 4. ステータステキスト --- */}
      <span className={`mt-0.5 text-[9px] font-medium ${STATUS_TEXT_COLOR[status]}`}>
        {STATUS_LABEL[status]}
      </span>

      {/* --- 5. XPゲージ --- */}
      <div className="mt-1 w-full h-[1px] bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-300 rounded-full transition-all duration-500"
          style={{ width: `${Math.round(expProgress * 100)}%` }}
        />
      </div>
    </button>
  );
}
