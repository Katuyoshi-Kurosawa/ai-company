/**
 * RoomSection - 部屋カードコンポーネント
 *
 * 部屋ごとに個性あるデザインを適用し、オフィスの雰囲気を演出する。
 * 実行中にアクティブな部屋はハイライトされる。
 */
import { useMemo } from 'react';
import type { Agent, RoomId } from '../types';
import type { AgentActivity } from '../hooks/useOfficeActivity';
import { AgentSlot } from './AgentSlot';
import { ROOMS } from '../data/constants';

interface Props {
  roomId: RoomId;
  agents: Agent[];
  activities: Map<string, AgentActivity>;
  isRunning: boolean;
  selectedAgentId?: string;
  isActiveRoom: boolean;
  onAgentClick: (agent: Agent) => void;
  className?: string;
}

/** 部屋ごとのテーマ定義 */
const ROOM_THEME: Record<string, {
  bg: string;
  headerBg: string;
  headerText: string;
  borderColor: string;
  activeBorder: string;
  accentColor: string;
  pattern?: string;
  deco: React.ReactNode;
}> = {
  president: {
    bg: 'linear-gradient(160deg, oklch(0.20 0.02 60) 0%, oklch(0.16 0.015 50) 100%)',
    headerBg: 'linear-gradient(90deg, oklch(0.25 0.04 55) 0%, oklch(0.20 0.025 50) 100%)',
    headerText: 'oklch(0.82 0.08 65)',
    borderColor: 'oklch(0.35 0.05 55 / 0.5)',
    activeBorder: 'oklch(0.70 0.12 65 / 0.6)',
    accentColor: 'oklch(0.75 0.10 65)',
    deco: (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 壁面の額縁 */}
        <div className="absolute top-10 right-4 w-10 h-8 rounded-sm opacity-20"
          style={{ border: '1.5px solid oklch(0.6 0.08 55)', background: 'oklch(0.25 0.03 55)' }}>
          <div className="absolute inset-[3px] rounded-sm" style={{ background: 'linear-gradient(135deg, oklch(0.35 0.04 200), oklch(0.30 0.03 160))' }} />
        </div>
        {/* 観葉植物 */}
        <svg className="absolute bottom-2 left-2 opacity-25" width="24" height="32" viewBox="0 0 24 32">
          <rect x="9" y="22" width="6" height="10" rx="1" fill="oklch(0.45 0.06 55)" />
          <ellipse cx="12" cy="18" rx="10" ry="8" fill="oklch(0.45 0.12 145)" />
          <ellipse cx="9" cy="14" rx="7" ry="6" fill="oklch(0.50 0.14 145)" />
          <ellipse cx="15" cy="16" rx="6" ry="5" fill="oklch(0.48 0.13 150)" />
        </svg>
        {/* 床パターン - 木目風ライン */}
        <div className="absolute bottom-0 left-0 right-0 h-1 opacity-10"
          style={{ background: 'repeating-linear-gradient(90deg, oklch(0.5 0.06 55) 0px, transparent 1px, transparent 12px)' }} />
      </div>
    ),
  },
  executive: {
    bg: 'linear-gradient(160deg, oklch(0.18 0.015 250) 0%, oklch(0.15 0.01 240) 100%)',
    headerBg: 'linear-gradient(90deg, oklch(0.22 0.03 250) 0%, oklch(0.18 0.02 240) 100%)',
    headerText: 'oklch(0.80 0.06 250)',
    borderColor: 'oklch(0.32 0.04 250 / 0.4)',
    activeBorder: 'oklch(0.65 0.12 260 / 0.6)',
    accentColor: 'oklch(0.70 0.08 250)',
    deco: (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 本棚シルエット */}
        <svg className="absolute top-8 right-3 opacity-15" width="20" height="40" viewBox="0 0 20 40">
          <rect x="0" y="0" width="20" height="40" rx="1" fill="oklch(0.35 0.04 250)" />
          <rect x="2" y="2" width="16" height="8" rx="0.5" fill="oklch(0.28 0.03 30)" />
          <rect x="2" y="12" width="16" height="8" rx="0.5" fill="oklch(0.28 0.03 200)" />
          <rect x="2" y="22" width="16" height="8" rx="0.5" fill="oklch(0.28 0.03 120)" />
          <rect x="2" y="32" width="16" height="6" rx="0.5" fill="oklch(0.28 0.03 350)" />
        </svg>
        {/* 窓のような光 */}
        <div className="absolute top-0 left-1/3 w-16 h-full opacity-[0.03]"
          style={{ background: 'linear-gradient(180deg, oklch(0.95 0.01 250) 0%, transparent 60%)' }} />
      </div>
    ),
  },
  'meeting-a': {
    bg: 'linear-gradient(160deg, oklch(0.18 0.02 160) 0%, oklch(0.15 0.015 155) 100%)',
    headerBg: 'linear-gradient(90deg, oklch(0.22 0.035 160) 0%, oklch(0.18 0.025 155) 100%)',
    headerText: 'oklch(0.80 0.07 160)',
    borderColor: 'oklch(0.32 0.04 160 / 0.4)',
    activeBorder: 'oklch(0.65 0.12 160 / 0.6)',
    accentColor: 'oklch(0.70 0.08 160)',
    deco: (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* ホワイトボード */}
        <div className="absolute top-9 right-3 w-14 h-10 rounded-sm opacity-20"
          style={{ background: 'oklch(0.92 0.005 160)', border: '1px solid oklch(0.70 0.02 160)' }}>
          {/* ボード上のメモ風ライン */}
          <div className="absolute top-2 left-2 right-2 h-[1px] opacity-30" style={{ background: 'oklch(0.50 0.05 160)' }} />
          <div className="absolute top-4 left-2 w-8 h-[1px] opacity-20" style={{ background: 'oklch(0.50 0.05 250)' }} />
          <div className="absolute top-6 left-2 right-3 h-[1px] opacity-25" style={{ background: 'oklch(0.50 0.05 30)' }} />
        </div>
        {/* テーブル中央 */}
        <svg className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-10" width="60" height="20" viewBox="0 0 60 20">
          <rect x="5" y="4" width="50" height="12" rx="2" fill="oklch(0.40 0.04 55)" />
        </svg>
      </div>
    ),
  },
  'meeting-b': {
    bg: 'linear-gradient(160deg, oklch(0.18 0.018 200) 0%, oklch(0.15 0.012 195) 100%)',
    headerBg: 'linear-gradient(90deg, oklch(0.22 0.03 200) 0%, oklch(0.18 0.02 195) 100%)',
    headerText: 'oklch(0.80 0.06 200)',
    borderColor: 'oklch(0.32 0.035 200 / 0.4)',
    activeBorder: 'oklch(0.65 0.10 200 / 0.6)',
    accentColor: 'oklch(0.70 0.07 200)',
    deco: (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* モニター */}
        <svg className="absolute top-9 right-4 opacity-20" width="16" height="18" viewBox="0 0 16 18">
          <rect x="1" y="0" width="14" height="10" rx="1" fill="oklch(0.25 0.02 200)" />
          <rect x="2" y="1" width="12" height="8" rx="0.5" fill="oklch(0.35 0.04 220)" />
          <rect x="6" y="10" width="4" height="3" fill="oklch(0.30 0.02 200)" />
          <rect x="4" y="13" width="8" height="1.5" rx="0.5" fill="oklch(0.30 0.02 200)" />
        </svg>
      </div>
    ),
  },
  break: {
    bg: 'linear-gradient(160deg, oklch(0.19 0.02 40) 0%, oklch(0.16 0.015 35) 100%)',
    headerBg: 'linear-gradient(90deg, oklch(0.24 0.035 40) 0%, oklch(0.19 0.025 35) 100%)',
    headerText: 'oklch(0.82 0.07 40)',
    borderColor: 'oklch(0.34 0.045 40 / 0.4)',
    activeBorder: 'oklch(0.65 0.10 40 / 0.6)',
    accentColor: 'oklch(0.72 0.08 40)',
    deco: (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* コーヒーマシン */}
        <svg className="absolute top-9 right-3 opacity-20" width="16" height="22" viewBox="0 0 16 22">
          <rect x="2" y="4" width="12" height="14" rx="1.5" fill="oklch(0.30 0.03 40)" />
          <rect x="4" y="6" width="8" height="5" rx="1" fill="oklch(0.22 0.02 40)" />
          <circle cx="8" cy="15" r="2" fill="oklch(0.50 0.08 30)" />
          <rect x="5" y="18" width="6" height="4" rx="0.5" fill="oklch(0.35 0.03 40)" />
          {/* 湯気 */}
          <path d="M6 3 Q7 1 8 3 Q9 1 10 3" fill="none" stroke="oklch(0.60 0.02 40)" strokeWidth="0.8" opacity="0.5" />
        </svg>
        {/* ソファシルエット */}
        <svg className="absolute bottom-3 left-3 opacity-10" width="30" height="14" viewBox="0 0 30 14">
          <rect x="0" y="4" width="30" height="10" rx="3" fill="oklch(0.40 0.06 40)" />
          <rect x="2" y="0" width="4" height="8" rx="2" fill="oklch(0.38 0.05 40)" />
          <rect x="24" y="0" width="4" height="8" rx="2" fill="oklch(0.38 0.05 40)" />
        </svg>
      </div>
    ),
  },
  'open-office': {
    bg: 'linear-gradient(160deg, oklch(0.17 0.012 270) 0%, oklch(0.14 0.008 260) 100%)',
    headerBg: 'linear-gradient(90deg, oklch(0.21 0.025 270) 0%, oklch(0.17 0.015 260) 100%)',
    headerText: 'oklch(0.78 0.05 270)',
    borderColor: 'oklch(0.30 0.03 270 / 0.4)',
    activeBorder: 'oklch(0.60 0.10 270 / 0.6)',
    accentColor: 'oklch(0.68 0.07 270)',
    deco: (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* デスクパーティション風の縦線 */}
        {[0.25, 0.5, 0.75].map((pos) => (
          <div key={pos} className="absolute top-12 bottom-4 opacity-[0.06]"
            style={{ left: `${pos * 100}%`, width: '1px', background: 'oklch(0.60 0.03 270)' }} />
        ))}
        {/* 観葉植物 右下 */}
        <svg className="absolute bottom-2 right-3 opacity-20" width="20" height="26" viewBox="0 0 20 26">
          <rect x="7" y="18" width="6" height="8" rx="1" fill="oklch(0.40 0.05 55)" />
          <ellipse cx="10" cy="14" rx="9" ry="7" fill="oklch(0.42 0.11 145)" />
          <ellipse cx="7" cy="11" rx="6" ry="5" fill="oklch(0.48 0.13 148)" />
          <ellipse cx="13" cy="12" rx="5" ry="4" fill="oklch(0.45 0.12 142)" />
        </svg>
        {/* プリンター */}
        <svg className="absolute bottom-3 left-3 opacity-12" width="18" height="14" viewBox="0 0 18 14">
          <rect x="0" y="3" width="18" height="8" rx="1" fill="oklch(0.30 0.015 270)" />
          <rect x="3" y="0" width="12" height="4" rx="0.5" fill="oklch(0.25 0.01 270)" />
          <rect x="4" y="11" width="10" height="3" rx="0.5" fill="oklch(0.90 0.005 60)" />
        </svg>
      </div>
    ),
  },
};

/** LIVE時のパルスアニメーション */
function LivePulse() {
  return (
    <span className="relative flex items-center gap-1.5">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
          style={{ background: 'oklch(0.65 0.20 145)' }} />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5"
          style={{ background: 'oklch(0.70 0.18 145)' }} />
      </span>
      <span className="text-[9px] font-bold tracking-wider uppercase"
        style={{ color: 'oklch(0.70 0.15 145)' }}>LIVE</span>
    </span>
  );
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
  const roomInfo = useMemo(
    () => ROOMS.find((r) => r.id === roomId) ?? { id: roomId, label: roomId, icon: '?', description: '' },
    [roomId],
  );

  const theme = ROOM_THEME[roomId] ?? ROOM_THEME['open-office'];

  return (
    <div
      className={[
        'relative rounded-xl overflow-hidden transition-all duration-500',
        className,
      ].join(' ')}
      style={{
        background: theme.bg,
        border: `1.5px solid ${isActiveRoom ? theme.activeBorder : theme.borderColor}`,
        boxShadow: isActiveRoom
          ? `0 0 20px oklch(0.50 0.12 270 / 0.15), inset 0 1px 0 oklch(1 0 0 / 0.04)`
          : 'inset 0 1px 0 oklch(1 0 0 / 0.03)',
      }}
    >
      {/* 部屋固有のデコレーション */}
      {theme.deco}

      {/* --- 部屋ヘッダー（ネームプレート風） --- */}
      <div
        className="relative flex items-center justify-between px-3 py-1.5"
        style={{
          background: theme.headerBg,
          borderBottom: `1px solid oklch(1 0 0 / 0.06)`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base drop-shadow-sm">{roomInfo.icon}</span>
          <div>
            <span className="text-sm font-bold" style={{ color: theme.headerText }}>
              {roomInfo.label}
            </span>
            {roomInfo.description && (
              <span className="hidden sm:inline text-[10px] ml-2 opacity-40" style={{ color: theme.headerText }}>
                {roomInfo.description}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActiveRoom && <LivePulse />}
          <span
            className="min-w-[22px] px-1.5 py-0.5 rounded-full text-center text-[10px] font-bold leading-none"
            style={{
              background: agents.length > 0 ? `color-mix(in oklch, ${theme.accentColor} 20%, transparent)` : 'oklch(1 0 0 / 0.04)',
              color: agents.length > 0 ? theme.accentColor : 'oklch(1 0 0 / 0.25)',
            }}
          >
            {agents.length}
          </span>
        </div>
      </div>

      {/* --- エージェント一覧 --- */}
      <div className="relative flex flex-wrap gap-0.5 p-2 justify-center min-h-[60px] items-start">
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
          <div className="flex items-center justify-center w-full h-full">
            <span className="text-xs select-none" style={{ color: 'oklch(1 0 0 / 0.15)' }}>空室</span>
          </div>
        )}
      </div>
    </div>
  );
}
