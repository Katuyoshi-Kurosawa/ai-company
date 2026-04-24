/**
 * RoomSection - 部屋カードコンポーネント
 *
 * 部屋ごとに個性あるデザインを適用し、オフィスの雰囲気を演出する。
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

/* ═══════════════════════════════════════════
   部屋ごとのテーマ＆デコレーション
   ═══════════════════════════════════════════ */

interface RoomTheme {
  bg: string;
  headerBg: string;
  headerText: string;
  borderColor: string;
  activeBorder: string;
  accentColor: string;
  floorPattern?: React.CSSProperties;
}

const THEMES: Record<string, RoomTheme> = {
  president: {
    bg: 'linear-gradient(170deg, #2a2218 0%, #1e1a14 60%, #1a1610 100%)',
    headerBg: 'linear-gradient(90deg, #3d2e1a 0%, #2a2015 100%)',
    headerText: '#d4a44a',
    borderColor: 'rgba(180,140,60,0.35)',
    activeBorder: 'rgba(212,175,55,0.6)',
    accentColor: '#d4a44a',
    floorPattern: {
      backgroundImage: 'repeating-linear-gradient(90deg, rgba(160,120,60,0.04) 0px, transparent 1px, transparent 20px)',
    },
  },
  executive: {
    bg: 'linear-gradient(170deg, #1a1e28 0%, #151820 60%, #101318 100%)',
    headerBg: 'linear-gradient(90deg, #242a38 0%, #1a1e28 100%)',
    headerText: '#7ba0cc',
    borderColor: 'rgba(100,140,200,0.25)',
    activeBorder: 'rgba(120,160,220,0.5)',
    accentColor: '#7ba0cc',
  },
  'meeting-a': {
    bg: 'linear-gradient(170deg, #1a2420 0%, #151e1a 60%, #101816 100%)',
    headerBg: 'linear-gradient(90deg, #243028 0%, #1a2420 100%)',
    headerText: '#6ab88a',
    borderColor: 'rgba(80,160,110,0.25)',
    activeBorder: 'rgba(100,180,130,0.5)',
    accentColor: '#6ab88a',
  },
  'meeting-b': {
    bg: 'linear-gradient(170deg, #1a2028 0%, #151a22 60%, #10151c 100%)',
    headerBg: 'linear-gradient(90deg, #222a38 0%, #1a2028 100%)',
    headerText: '#6a9cc0',
    borderColor: 'rgba(80,130,180,0.25)',
    activeBorder: 'rgba(100,150,200,0.5)',
    accentColor: '#6a9cc0',
  },
  break: {
    bg: 'linear-gradient(170deg, #28201a 0%, #201a15 60%, #181410 100%)',
    headerBg: 'linear-gradient(90deg, #38281a 0%, #28201a 100%)',
    headerText: '#cc9060',
    borderColor: 'rgba(180,120,60,0.25)',
    activeBorder: 'rgba(200,140,80,0.5)',
    accentColor: '#cc9060',
  },
  'open-office': {
    bg: 'linear-gradient(170deg, #1a1a24 0%, #15151e 60%, #101018 100%)',
    headerBg: 'linear-gradient(90deg, #24243a 0%, #1a1a28 100%)',
    headerText: '#8888cc',
    borderColor: 'rgba(100,100,180,0.25)',
    activeBorder: 'rgba(120,120,200,0.5)',
    accentColor: '#8888cc',
  },
};

/* ── 社長室デコ ── */
function PresidentDeco() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* 窓 - 右壁の光 */}
      <div className="absolute top-0 right-0 w-2/5 h-full opacity-[0.07]"
        style={{ background: 'linear-gradient(250deg, #f0d890 0%, transparent 70%)' }} />

      {/* 高級デスク */}
      <svg className="absolute bottom-1 left-1/2 -translate-x-1/2 opacity-30" width="120" height="28" viewBox="0 0 120 28">
        <rect x="10" y="6" width="100" height="16" rx="2" fill="#5a4020" />
        <rect x="12" y="8" width="96" height="12" rx="1" fill="#6b4c30" />
        {/* モニター */}
        <rect x="45" y="0" width="30" height="18" rx="2" fill="#222" />
        <rect x="47" y="1" width="26" height="14" rx="1" fill="#3a5570" />
        <rect x="57" y="18" width="6" height="3" fill="#333" />
        {/* ペン立て */}
        <rect x="85" y="4" width="8" height="10" rx="1" fill="#444" />
        <line x1="87" y1="4" x2="87" y2="0" stroke="#666" strokeWidth="1" />
        <line x1="89" y1="4" x2="90" y2="0" stroke="#888" strokeWidth="1" />
        <line x1="91" y1="4" x2="91" y2="1" stroke="#777" strokeWidth="1" />
      </svg>

      {/* 大型観葉植物 - 左 */}
      <svg className="absolute bottom-0 left-1 opacity-40" width="32" height="60" viewBox="0 0 32 60">
        <rect x="11" y="40" width="10" height="20" rx="2" fill="#5a4530" />
        <ellipse cx="16" cy="32" rx="14" ry="12" fill="#2a6830" />
        <ellipse cx="11" cy="26" rx="10" ry="9" fill="#357a3a" />
        <ellipse cx="20" cy="28" rx="9" ry="8" fill="#308535" />
        <ellipse cx="16" cy="22" rx="8" ry="7" fill="#3a9040" />
      </svg>

      {/* 額縁（絵画） */}
      <div className="absolute top-3 right-6 opacity-40">
        <div className="w-16 h-12 rounded-sm" style={{
          border: '2px solid #8a7040',
          background: 'linear-gradient(135deg, #2a3a50 0%, #1a2a3a 40%, #3a2a20 100%)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        }} />
      </div>

      {/* 木目フロア */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'repeating-linear-gradient(90deg, #a08060 0px, transparent 1px, transparent 18px)' }} />
    </div>
  );
}

/* ── 役員室デコ ── */
function ExecutiveDeco() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* 窓の光 */}
      <div className="absolute top-0 right-0 w-1/3 h-full opacity-[0.05]"
        style={{ background: 'linear-gradient(250deg, #90b0e0 0%, transparent 70%)' }} />

      {/* 本棚 - 右壁 */}
      <svg className="absolute top-2 right-2 opacity-35" width="28" height="80" viewBox="0 0 28 80">
        <rect x="0" y="0" width="28" height="80" rx="1" fill="#2a2a38" stroke="#3a3a4a" strokeWidth="0.5" />
        {/* 棚板 */}
        {[0, 16, 32, 48, 64].map(y => (
          <rect key={y} x="0" y={y} width="28" height="1.5" fill="#3a3a4a" />
        ))}
        {/* 本 */}
        <rect x="2" y="2" width="5" height="13" rx="0.5" fill="#5a3030" />
        <rect x="8" y="4" width="4" height="11" rx="0.5" fill="#305a30" />
        <rect x="13" y="3" width="5" height="12" rx="0.5" fill="#30305a" />
        <rect x="19" y="2" width="6" height="13" rx="0.5" fill="#5a5030" />
        <rect x="3" y="18" width="6" height="13" rx="0.5" fill="#304050" />
        <rect x="10" y="19" width="4" height="12" rx="0.5" fill="#503040" />
        <rect x="15" y="17" width="5" height="14" rx="0.5" fill="#405030" />
        <rect x="21" y="18" width="5" height="13" rx="0.5" fill="#504030" />
        <rect x="2" y="34" width="5" height="13" rx="0.5" fill="#3a4a5a" />
        <rect x="8" y="35" width="6" height="12" rx="0.5" fill="#5a3a4a" />
        <rect x="15" y="33" width="4" height="14" rx="0.5" fill="#4a5a3a" />
        <rect x="20" y="34" width="6" height="13" rx="0.5" fill="#3a3a5a" />
      </svg>

      {/* デスク群（3台） */}
      <svg className="absolute bottom-1 left-4 opacity-25" width="200" height="20" viewBox="0 0 200 20">
        {[0, 70, 140].map(x => (
          <g key={x}>
            <rect x={x} y="6" width="55" height="12" rx="1" fill="#3a3848" />
            <rect x={x+18} y="0" width="20" height="14" rx="1.5" fill="#222" />
            <rect x={x+19} y="1" width="18" height="11" rx="1" fill="#3a5570" opacity="0.6" />
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ── 会議室Aデコ ── */
function MeetingADeco() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* ホワイトボード - 大型 */}
      <div className="absolute top-2 right-2 opacity-50">
        <div className="w-24 h-16 rounded" style={{
          background: '#e8ece8',
          border: '2px solid #aab0aa',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          {/* マーカー跡 */}
          <div className="absolute top-3 left-3 w-12 h-[2px] bg-red-600/30 rounded" />
          <div className="absolute top-6 left-3 w-16 h-[2px] bg-blue-600/25 rounded" />
          <div className="absolute top-9 left-3 w-10 h-[2px] bg-green-600/25 rounded" />
          <div className="absolute top-12 left-6 w-8 h-[2px] bg-red-600/20 rounded" />
          {/* ペントレイ */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-2 bg-gray-400/30 rounded-sm" />
        </div>
      </div>

      {/* 会議テーブル */}
      <svg className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-20" width="100" height="30" viewBox="0 0 100 30">
        <ellipse cx="50" cy="15" rx="45" ry="12" fill="#5a4a30" />
        <ellipse cx="50" cy="14" rx="43" ry="11" fill="#6a5a40" />
      </svg>
    </div>
  );
}

/* ── 会議室Bデコ ── */
function MeetingBDeco() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* プロジェクター画面 */}
      <div className="absolute top-2 right-2 opacity-45">
        <div className="w-20 h-14 rounded" style={{
          background: 'linear-gradient(180deg, #1a2a40 0%, #0a1520 100%)',
          border: '1.5px solid #3a4a5a',
          boxShadow: '0 0 12px rgba(60,100,160,0.15)',
        }}>
          {/* スクリーン上のダミーグラフ */}
          <svg className="w-full h-full p-1" viewBox="0 0 40 28">
            <rect x="4" y="20" width="5" height="6" fill="#4a80b0" opacity="0.6" />
            <rect x="11" y="14" width="5" height="12" fill="#5090c0" opacity="0.6" />
            <rect x="18" y="8" width="5" height="18" fill="#60a0d0" opacity="0.6" />
            <rect x="25" y="12" width="5" height="14" fill="#5090c0" opacity="0.6" />
            <rect x="32" y="6" width="5" height="20" fill="#70b0e0" opacity="0.6" />
          </svg>
        </div>
      </div>

      {/* 小会議テーブル */}
      <svg className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-20" width="80" height="24" viewBox="0 0 80 24">
        <rect x="10" y="4" width="60" height="16" rx="3" fill="#4a4a5a" />
        <rect x="12" y="5" width="56" height="14" rx="2" fill="#555568" />
      </svg>
    </div>
  );
}

/* ── 休憩室デコ ── */
function BreakDeco() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* 暖色の窓光 */}
      <div className="absolute top-0 left-0 w-1/3 h-full opacity-[0.06]"
        style={{ background: 'linear-gradient(110deg, #f0c060 0%, transparent 70%)' }} />

      {/* コーヒーマシン */}
      <svg className="absolute top-3 right-3 opacity-45" width="24" height="36" viewBox="0 0 24 36">
        <rect x="2" y="8" width="20" height="24" rx="2" fill="#3a2820" stroke="#4a3830" strokeWidth="0.5" />
        <rect x="5" y="11" width="14" height="8" rx="1" fill="#1a1410" />
        <circle cx="12" cy="26" r="3" fill="#cc6030" opacity="0.7" />
        <rect x="7" y="32" width="10" height="4" rx="1" fill="#e8e0d0" />
        {/* 湯気 */}
        <path d="M9 7 Q10 4 11 7" fill="none" stroke="rgba(200,180,160,0.4)" strokeWidth="1" />
        <path d="M13 6 Q14 3 15 6" fill="none" stroke="rgba(200,180,160,0.3)" strokeWidth="1" />
      </svg>

      {/* ソファ */}
      <svg className="absolute bottom-1 left-3 opacity-30" width="80" height="28" viewBox="0 0 80 28">
        <rect x="0" y="8" width="80" height="20" rx="5" fill="#6a4a30" />
        <rect x="3" y="5" width="12" height="18" rx="4" fill="#7a5a40" />
        <rect x="65" y="5" width="12" height="18" rx="4" fill="#7a5a40" />
        <rect x="16" y="10" width="48" height="14" rx="3" fill="#8a6a50" />
        {/* クッション */}
        <ellipse cx="30" cy="16" rx="10" ry="6" fill="#9a7a60" opacity="0.6" />
        <ellipse cx="50" cy="16" rx="10" ry="6" fill="#9a7a60" opacity="0.6" />
      </svg>

      {/* 自販機 */}
      <svg className="absolute top-3 left-3 opacity-35" width="18" height="40" viewBox="0 0 18 40">
        <rect x="0" y="0" width="18" height="40" rx="1.5" fill="#2a3a5a" stroke="#3a4a6a" strokeWidth="0.5" />
        <rect x="2" y="2" width="14" height="20" rx="1" fill="#1a2a40" />
        {/* 飲み物列 */}
        {[3, 7, 11, 15].map((y, i) => (
          <g key={i}>
            <rect x="3" y={y} width="4" height="3.5" rx="0.5" fill={['#cc4040', '#40a040', '#4080cc', '#cc8040'][i]} opacity="0.5" />
            <rect x="8" y={y} width="4" height="3.5" rx="0.5" fill={['#e06060', '#60c060', '#6090dd', '#dd9060'][i]} opacity="0.5" />
          </g>
        ))}
        <rect x="3" y="25" width="12" height="4" rx="0.5" fill="#1a2030" />
        <rect x="3" y="30" width="12" height="8" rx="0.5" fill="#222" />
      </svg>
    </div>
  );
}

/* ── オフィスデコ ── */
function OfficeDeco() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* 天井照明効果 */}
      {[0.15, 0.40, 0.65, 0.90].map(pos => (
        <div key={pos} className="absolute top-0 opacity-[0.04]"
          style={{
            left: `${pos * 100}%`, transform: 'translateX(-50%)',
            width: '120px', height: '100%',
            background: 'radial-gradient(ellipse at top, #a0a0cc 0%, transparent 60%)',
          }} />
      ))}

      {/* パーティション */}
      {[0.34, 0.67].map(pos => (
        <div key={pos} className="absolute top-10 bottom-1 opacity-[0.08]"
          style={{ left: `${pos * 100}%`, width: '2px', background: 'linear-gradient(180deg, #6060a0, #4040708a, transparent)' }} />
      ))}

      {/* 観葉植物 - 右端 */}
      <svg className="absolute bottom-0 right-2 opacity-35" width="28" height="50" viewBox="0 0 28 50">
        <rect x="9" y="34" width="10" height="16" rx="2" fill="#4a3a28" />
        <ellipse cx="14" cy="28" rx="12" ry="10" fill="#2a5a30" />
        <ellipse cx="10" cy="22" rx="8" ry="7" fill="#357a3a" />
        <ellipse cx="18" cy="24" rx="7" ry="6" fill="#308535" />
        <ellipse cx="14" cy="18" rx="7" ry="6" fill="#3a9040" />
      </svg>

      {/* ウォーターサーバー - 左端 */}
      <svg className="absolute bottom-0 left-2 opacity-30" width="16" height="42" viewBox="0 0 16 42">
        <rect x="2" y="12" width="12" height="28" rx="1.5" fill="#e0e0e0" />
        <rect x="3" y="13" width="10" height="10" rx="1" fill="#ccc" />
        {/* タンク */}
        <ellipse cx="8" cy="8" rx="6" ry="8" fill="#a0d0f0" opacity="0.5" />
        <ellipse cx="8" cy="4" rx="4" ry="3" fill="#80c0e8" opacity="0.4" />
        {/* ボタン */}
        <circle cx="6" cy="28" r="1.5" fill="#4080cc" />
        <circle cx="10" cy="28" r="1.5" fill="#cc4040" />
        {/* トレイ */}
        <rect x="3" y="32" width="10" height="2" rx="0.5" fill="#bbb" />
      </svg>

      {/* コピー機 */}
      <svg className="absolute bottom-1 left-1/2 opacity-15" width="30" height="24" viewBox="0 0 30 24">
        <rect x="0" y="4" width="30" height="18" rx="2" fill="#3a3a44" />
        <rect x="2" y="6" width="26" height="8" rx="1" fill="#2a2a34" />
        <rect x="5" y="0" width="20" height="5" rx="1" fill="#444450" />
        <rect x="8" y="22" width="14" height="2" rx="0.5" fill="#eee" opacity="0.5" />
      </svg>
    </div>
  );
}

const ROOM_DECO: Record<string, React.ReactNode> = {
  president: <PresidentDeco />,
  executive: <ExecutiveDeco />,
  'meeting-a': <MeetingADeco />,
  'meeting-b': <MeetingBDeco />,
  break: <BreakDeco />,
  'open-office': <OfficeDeco />,
};

/* ── LIVE パルス ── */
function LivePulse() {
  return (
    <span className="relative flex items-center gap-1.5">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
      </span>
      <span className="text-[9px] font-bold tracking-wider uppercase text-emerald-400">LIVE</span>
    </span>
  );
}

/* ═══════════════════════════════════════════
   メインコンポーネント
   ═══════════════════════════════════════════ */
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

  const theme = THEMES[roomId] ?? THEMES['open-office'];

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
          ? `0 0 24px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.05)`
          : 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      {/* 部屋固有のデコレーション */}
      {ROOM_DECO[roomId]}

      {/* 床パターン */}
      {theme.floorPattern && (
        <div className="absolute inset-0 pointer-events-none" style={theme.floorPattern} />
      )}

      {/* --- 部屋ヘッダー --- */}
      <div
        className="relative flex items-center justify-between px-3 py-1.5 z-10"
        style={{
          background: theme.headerBg,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm drop-shadow-sm">{roomInfo.icon}</span>
          <span className="text-sm font-bold" style={{ color: theme.headerText }}>
            {roomInfo.label}
          </span>
          {roomInfo.description && (
            <span className="hidden sm:inline text-[10px] opacity-35" style={{ color: theme.headerText }}>
              {roomInfo.description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isActiveRoom && <LivePulse />}
          <span
            className="min-w-[22px] px-1.5 py-0.5 rounded-full text-center text-[10px] font-bold leading-none"
            style={{
              background: agents.length > 0 ? `${theme.accentColor}30` : 'rgba(255,255,255,0.04)',
              color: agents.length > 0 ? theme.accentColor : 'rgba(255,255,255,0.25)',
            }}
          >
            {agents.length}
          </span>
        </div>
      </div>

      {/* --- エージェント一覧 --- */}
      <div className="relative flex flex-wrap gap-0.5 p-2 justify-center min-h-[60px] items-start z-10">
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
            <span className="text-xs select-none text-white/15">空室</span>
          </div>
        )}
      </div>
    </div>
  );
}
