import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import type { Agent, RoomId, AgentStats } from '../types';
import type { AgentActivity } from '../hooks/useOfficeActivity';
import { PixelCharacter } from './PixelCharacter';
import { SpeechBubble } from './SpeechBubble';
import { STAT_LABELS, STAT_KEYS, BADGES } from '../data/constants';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { useAutoChat } from '../hooks/useAutoChat';

const Character3DOverlay = lazy(() => import('./Character3DOverlay').then(m => ({ default: m.Character3DOverlay })));

// ══════════════════════════════════════════
// Props
// ══════════════════════════════════════════
interface Props {
  agents: Agent[];
  onSelect: (agent: Agent) => void;
  selectedId?: string;
  isLive?: boolean;
  activities?: Map<string, AgentActivity>;
  activeRooms?: Set<RoomId>;
  energyLevel?: number;
  livePhase?: string;
  liveProgress?: number;
  liveAgentCount?: number;
  onAgentClick?: (agentId: string, room: RoomId) => void;
  executing?: boolean;
  // Quest log items
  questItems?: { label: string; status: 'active' | 'done' | 'error' }[];
  commandLabel?: string;
  elapsed?: number;
  onShowDetail?: (agent: Agent) => void;
  missionTimeline?: React.ReactNode;
}

// ══════════════════════════════════════════
// Department Colors
// ══════════════════════════════════════════
const DEPT_COLORS: Record<string, string> = {
  '経営': '#f59e0b',       // amber - CEO
  '秘書': '#ec4899',       // pink
  'マーケティング': '#f97316', // orange
  '人事': '#a855f7',       // purple
  'CS': '#06b6d4',         // cyan
  '研究開発': '#10b981',    // emerald
  '企画': '#3b82f6',       // blue
  '設計': '#6366f1',       // indigo
  '開発': '#8b5cf6',       // violet
  'QA': '#ef4444',         // red
  'デザイン': '#f472b6',    // pink-light
  '資料作成': '#14b8a6',    // teal
  'default': '#94a3b8',    // slate
};

// ══════════════════════════════════════════
// Isometric Engine
// ══════════════════════════════════════════
const VW = 1000, VH = 520;
const TW = 54, TH = 27, WH = 40;
const OX = 480, OY = 68;

function iso(gx: number, gy: number) {
  return { x: OX + (gx - gy) * TW / 2, y: OY + (gx + gy) * TH / 2 };
}

function floorD(gx: number, gy: number, w: number, d: number) {
  const a = iso(gx, gy), b = iso(gx+w, gy), c = iso(gx+w, gy+d), e = iso(gx, gy+d);
  return `M${a.x},${a.y} L${b.x},${b.y} L${c.x},${c.y} L${e.x},${e.y} Z`;
}

function wallBack(gx: number, gy: number, w: number) {
  const l = iso(gx, gy), r = iso(gx+w, gy);
  return `M${l.x},${l.y} L${l.x},${l.y-WH} L${r.x},${r.y-WH} L${r.x},${r.y} Z`;
}

function wallLeft(gx: number, gy: number, d: number) {
  const t = iso(gx, gy), b = iso(gx, gy+d);
  return `M${t.x},${t.y} L${t.x},${t.y-WH} L${b.x},${b.y-WH} L${b.x},${b.y} Z`;
}

function wallRight(gx: number, gy: number, w: number, d: number) {
  const t = iso(gx+w, gy), b = iso(gx+w, gy+d);
  return `M${t.x},${t.y} L${t.x},${t.y-WH} L${b.x},${b.y-WH} L${b.x},${b.y} Z`;
}

function wallFront(gx: number, gy: number, w: number, d: number) {
  const l = iso(gx, gy+d), r = iso(gx+w, gy+d);
  return `M${l.x},${l.y} L${l.x},${l.y-WH} L${r.x},${r.y-WH} L${r.x},${r.y} Z`;
}

// 3D Box
function Box({ gx, gy, w, d, h, top, right, front, opacity }: {
  gx:number; gy:number; w:number; d:number; h:number;
  top:string; right:string; front:string; opacity?: number;
}) {
  const a=iso(gx,gy), b=iso(gx+w,gy), c=iso(gx+w,gy+d), e=iso(gx,gy+d);
  const op = opacity ?? 1;
  return (
    <g opacity={op}>
      <path d={`M${c.x},${c.y-h} L${e.x},${e.y-h} L${e.x},${e.y} L${c.x},${c.y} Z`} fill={front} />
      <path d={`M${b.x},${b.y-h} L${c.x},${c.y-h} L${c.x},${c.y} L${b.x},${b.y} Z`} fill={right} />
      <path d={`M${a.x},${a.y-h} L${b.x},${b.y-h} L${c.x},${c.y-h} L${e.x},${e.y-h} Z`} fill={top} />
    </g>
  );
}

function Plant({ gx, gy }: { gx: number; gy: number }) {
  const p = iso(gx, gy);
  return (
    <g>
      <Box gx={gx-0.15} gy={gy-0.15} w={0.3} d={0.3} h={7} top="#8B6F47" right="#7a5f3a" front="#6a4f2a" />
      <ellipse cx={p.x} cy={p.y-14} rx={9} ry={7} fill="#3a7a3a" />
      <ellipse cx={p.x-3} cy={p.y-18} rx={7} ry={5} fill="#4a9a4a" />
      <ellipse cx={p.x+4} cy={p.y-16} rx={6} ry={5} fill="#5aaa5a" />
    </g>
  );
}

function Monitor({ gx, gy }: { gx: number; gy: number }) {
  const p = iso(gx, gy);
  return (
    <g>
      <rect x={p.x-4} y={p.y-20} width={8} height={6} rx={1} fill="#222" />
      <rect x={p.x-3} y={p.y-19} width={6} height={4} rx={0.5} fill="#4488cc" opacity={0.7} />
      <rect x={p.x-1} y={p.y-14} width={2} height={3} fill="#333" />
    </g>
  );
}

// ══════════════════════════════════════════
// Room Definitions
// ══════════════════════════════════════════
interface RoomDef {
  id: RoomId; gx: number; gy: number; w: number; d: number;
  floor: string; wB: string; wL: string; wR: string; wF: string;
  label: string; icon: string;
  extRight?: boolean; extFront?: boolean;
}

const ROOMS: RoomDef[] = [
  { id: 'president',   gx: 0, gy: 0, w: 4, d: 3,   floor: '#d8c8a4', wB: '#b8986c', wL: '#c8a87c', wR: '#a88860', wF: '#a88860', label: '社長室',         icon: '🏛️' },
  { id: 'executive',   gx: 5, gy: 0, w: 4, d: 3,   floor: '#b0c0d8', wB: '#7898b8', wL: '#88a8c8', wR: '#6888a8', wF: '#6888a8', label: '役員室',         icon: '🪑', extRight: true },
  { id: 'meeting-a',   gx: 0, gy: 4, w: 3, d: 2.5, floor: '#a8d4b8', wB: '#70a888', wL: '#88c0a0', wR: '#609878', wF: '#609878', label: '会議室A',        icon: '📊' },
  { id: 'meeting-b',   gx: 3, gy: 4, w: 3, d: 2.5, floor: '#a8d4b8', wB: '#70a888', wL: '#88c0a0', wR: '#609878', wF: '#609878', label: '会議室B',        icon: '💬' },
  { id: 'break',        gx: 6, gy: 4, w: 3, d: 2.5, floor: '#d8c0a4', wB: '#b89070', wL: '#c8a888', wR: '#a88058', wF: '#a88058', label: '休憩室',         icon: '☕', extRight: true },
  { id: 'open-office',  gx: 0, gy: 7.5, w: 9, d: 3, floor: '#b8c0d0', wB: '#8898b0', wL: '#98a8b8', wR: '#7088a0', wF: '#7088a0', label: 'オフィス',       icon: '🖥️', extRight: true, extFront: true },
];

const SLOTS: Record<string, { gx: number; gy: number }[]> = {
  'president':   [{ gx:2, gy:1.5 }],
  'executive':   [{ gx:6.5, gy:1 }, { gx:7.8, gy:1.5 }, { gx:6.5, gy:2.2 }],
  'meeting-a':   [{ gx:0.8, gy:4.8 }, { gx:1.5, gy:5.2 }, { gx:2.2, gy:5.6 }],
  'meeting-b':   [{ gx:3.8, gy:4.8 }, { gx:4.5, gy:5.2 }, { gx:5.2, gy:5.6 }],
  'break':       [{ gx:7.2, gy:5 }, { gx:8, gy:5.5 }],
  'open-office': [
    { gx:1.2, gy:8.0 }, { gx:3.3, gy:8.2 }, { gx:5.4, gy:8.0 }, { gx:7.5, gy:8.2 },
    { gx:2.0, gy:9.0 }, { gx:4.5, gy:9.2 }, { gx:7.0, gy:9.0 },
    { gx:1.0, gy:9.8 }, { gx:3.5, gy:10.0 }, { gx:6.0, gy:9.8 },
  ],
};

// ══════════════════════════════════════════
// Furniture (SVG)
// ══════════════════════════════════════════
function Furniture({ id, gx, gy }: { id: RoomId; gx: number; gy: number }) {
  switch (id) {
    case 'president': return (
      <g>
        <Box gx={gx+1.5} gy={gy+1} w={1.2} d={0.6} h={10} top="#6b4c30" right="#5a3d24" front="#4a3020" />
        <Monitor gx={gx+1.9} gy={gy+1.15} />
        <Plant gx={gx+0.4} gy={gy+0.4} />
        <Plant gx={gx+3.5} gy={gy+0.4} />
        <Box gx={gx+2.8} gy={gy+2} w={0.9} d={0.4} h={7} top="#a04040" right="#803030" front="#902828" />
        {(() => { const wl = iso(gx+1.2, gy), wr = iso(gx+2.8, gy);
          return <rect x={Math.min(wl.x,wr.x)+2} y={Math.min(wl.y,wr.y)-WH+4} width={Math.abs(wr.x-wl.x)-4} height={WH-12} rx={1} fill="#88bbdd" opacity={0.4} />;
        })()}
      </g>
    );
    case 'executive': return (
      <g>
        <Box gx={gx+1} gy={gy+0.5} w={1} d={0.5} h={10} top="#6b5040" right="#5a4030" front="#4a3020" />
        <Box gx={gx+2.5} gy={gy+1} w={1} d={0.5} h={10} top="#6b5040" right="#5a4030" front="#4a3020" />
        <Box gx={gx+1} gy={gy+1.7} w={1} d={0.5} h={10} top="#6b5040" right="#5a4030" front="#4a3020" />
        <Monitor gx={gx+1.3} gy={gy+0.65} />
        <Monitor gx={gx+2.8} gy={gy+1.15} />
        <Monitor gx={gx+1.3} gy={gy+1.85} />
        <Box gx={gx+0.1} gy={gy+0.1} w={0.4} d={2} h={28} top="#8B6F47" right="#5a4030" front="#6a5040" />
        {(() => { const wl = iso(gx+1.5, gy), wr = iso(gx+3.5, gy);
          return <rect x={Math.min(wl.x,wr.x)+2} y={Math.min(wl.y,wr.y)-WH+4} width={Math.abs(wr.x-wl.x)-4} height={WH-12} rx={1} fill="#88bbdd" opacity={0.35} />;
        })()}
      </g>
    );
    case 'meeting-a':
    case 'meeting-b': return (
      <g>
        <Box gx={gx+0.7} gy={gy+0.7} w={1.6} d={0.9} h={10} top="#8b7050" right="#6a5030" front="#7a6040" />
        {(() => { const wl = iso(gx+0.5, gy), wr = iso(gx+2.5, gy);
          return <rect x={Math.min(wl.x,wr.x)+2} y={Math.min(wl.y,wr.y)-WH+5} width={Math.abs(wr.x-wl.x)-4} height={WH-14} rx={1} fill="#e8ece8" opacity={0.7} stroke="#bbb" strokeWidth={0.5} />;
        })()}
      </g>
    );
    case 'break': return (
      <g>
        <Box gx={gx+0.2} gy={gy+0.3} w={0.5} d={0.4} h={26} top="#3050a0" right="#203878" front="#284890" />
        <Box gx={gx+0.25} gy={gy+0.35} w={0.4} d={0.3} h={20} top="#4070c0" right="#3060a8" front="#3868b0" />
        <Box gx={gx+1.2} gy={gy+1.5} w={1.2} d={0.5} h={7} top="#a07050" right="#805838" front="#906040" />
        <Box gx={gx+1.8} gy={gy+0.7} w={0.5} d={0.5} h={10} top="#c0a080" right="#a08060" front="#b09070" />
        {(() => { const wl = iso(gx+1, gy), wr = iso(gx+2.5, gy);
          return <rect x={Math.min(wl.x,wr.x)+2} y={Math.min(wl.y,wr.y)-WH+4} width={Math.abs(wr.x-wl.x)-4} height={WH-12} rx={1} fill="#88bbdd" opacity={0.35} />;
        })()}
      </g>
    );
    case 'open-office': return (
      <g>
        {[0, 1.3, 2.6, 4, 5.3, 6.6].map((dx, i) => (
          <g key={`r1-${i}`}>
            <Box gx={gx+0.6+dx} gy={gy+0.5} w={0.9} d={0.5} h={10} top="#6b5040" right="#5a4030" front="#4a3020" />
            <Monitor gx={gx+0.9+dx} gy={gy+0.65} />
          </g>
        ))}
        {[0, 1.5, 3, 4.5].map((dx, i) => (
          <g key={`r2-${i}`}>
            <Box gx={gx+1+dx} gy={gy+1.8} w={0.9} d={0.5} h={10} top="#6b5040" right="#5a4030" front="#4a3020" />
            <Monitor gx={gx+1.3+dx} gy={gy+1.95} />
          </g>
        ))}
        <Box gx={gx+8.3} gy={gy+0.3} w={0.4} d={2.2} h={24} top="#8B6F47" right="#5a4030" front="#6a5040" />
        <Plant gx={gx+0.3} gy={gy+2.5} />
        <Plant gx={gx+8.5} gy={gy+2.7} />
      </g>
    );
    default: return null;
  }
}

// ══════════════════════════════════════════
// Bubble Status Panel (on agent click)
// ══════════════════════════════════════════
function getBadgeIcon(badgeId: string): string {
  return BADGES.find(b => b.id === badgeId)?.icon ?? '🏅';
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-12 text-right text-white/60">{label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-[10px] w-6 text-white/80 font-bold">{value}</span>
    </div>
  );
}

function AgentBubblePanel({ agent, onClose, onShowDetail, anchorRef }: {
  agent: Agent; onClose: () => void; onShowDetail: () => void; anchorRef: React.RefObject<HTMLDivElement | null>;
}) {
  const statColors = ['#ef4444', '#3b82f6', '#eab308', '#a855f7', '#22c55e'];
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; showBelow: boolean }>({ x: 0, y: 0, showBelow: false });

  // アンカー要素の画面座標からパネル位置を計算
  useEffect(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const compute = () => {
      const ar = anchor.getBoundingClientRect();
      const pr = panel.getBoundingClientRect();
      const anchorCx = ar.left + ar.width / 2;
      const gap = 8;

      // 上に十分なスペースがあるか
      const showBelow = ar.top - pr.height - gap < 8;
      let x = anchorCx - pr.width / 2;
      let y = showBelow ? ar.bottom + gap : ar.top - pr.height - gap;

      // 左右クランプ
      if (x < 8) x = 8;
      if (x + pr.width > window.innerWidth - 8) x = window.innerWidth - 8 - pr.width;
      // 上下クランプ
      if (y < 8) y = 8;
      if (y + pr.height > window.innerHeight - 8) y = window.innerHeight - 8 - pr.height;

      setPos({ x, y, showBelow });
    };

    compute();
    // スクロール・リサイズ時に再計算
    window.addEventListener('scroll', compute, true);
    window.addEventListener('resize', compute);
    return () => { window.removeEventListener('scroll', compute, true); window.removeEventListener('resize', compute); };
  }, [anchorRef]);

  // 矢印のX位置（アンカー中央に合わせる）
  const arrowX = (() => {
    const anchor = anchorRef.current;
    if (!anchor) return '50%';
    const ar = anchor.getBoundingClientRect();
    const anchorCx = ar.left + ar.width / 2;
    const offset = anchorCx - pos.x;
    return `${Math.max(12, Math.min(offset, 208))}px`;
  })();

  return createPortal(
    <div ref={panelRef} className="fixed z-[9999] pointer-events-auto"
      style={{ left: pos.x, top: pos.y }}>
      <div className="relative bg-slate-900/95 backdrop-blur-md border border-white/20 rounded-xl p-3 shadow-2xl min-w-[220px]"
        style={{ boxShadow: '0 0 20px rgba(99,102,241,0.2)' }}>
        {/* Close button */}
        <button onClick={onClose} className="absolute top-1 right-2 text-white/40 hover:text-white text-xs cursor-pointer">x</button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <PixelCharacter visual={agent.visual} size="sm" active={agent.active} />
          <div>
            <div className="text-xs font-bold text-white">{agent.name}</div>
            <div className="text-[10px] text-white/50">{agent.title}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] px-1.5 py-px rounded-full font-bold bg-blue-500/20 text-blue-300">
                Lv.{agent.level}
              </span>
              <span className="text-[9px] text-white/40">{agent.rank}</span>
            </div>
          </div>
        </div>

        {/* EXP bar */}
        <div className="mb-2">
          <div className="flex justify-between text-[9px] mb-0.5">
            <span className="text-yellow-400 font-bold">EXP</span>
            <span className="text-white/40">{agent.exp}/1000</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-300 transition-all" style={{ width: `${(agent.exp / 1000) * 100}%` }} />
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-1 mb-2">
          {STAT_KEYS.map((key, i) => (
            <StatBar key={key} label={STAT_LABELS[key]} value={agent.stats[key as keyof AgentStats]} color={statColors[i]} />
          ))}
        </div>

        {/* Badges */}
        {agent.badges.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-2">
            {agent.badges.slice(0, 6).map(b => (
              <span key={b} className="text-sm">{getBadgeIcon(b)}</span>
            ))}
          </div>
        )}

        {/* Detail button */}
        <button onClick={onShowDetail}
          className="w-full py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30">
          詳細を見る
        </button>

        {/* Bubble arrow */}
        <div className={`absolute w-4 h-4 rotate-45 bg-slate-900/95 border-white/20 ${pos.showBelow ? '-top-2 border-l border-t' : '-bottom-2 border-r border-b'}`}
          style={{ left: arrowX, transform: 'translateX(-50%) rotate(45deg)' }} />
      </div>
    </div>,
    document.body
  );
}

// ══════════════════════════════════════════
// HUD: Top Phase Bar
// ══════════════════════════════════════════
function PhaseBar({ phase, progress, energy, agentCount, commandLabel, elapsed }: {
  phase: string; progress: number; energy: number; agentCount: number; commandLabel?: string; elapsed?: number;
}) {
  const formatElapsed = (s: number) => { const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${String(sec).padStart(2, '0')}`; };
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div className="flex items-center gap-3 px-5 py-2 rounded-xl backdrop-blur-md border border-white/15"
        style={{ background: 'rgba(15,23,42,0.8)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-xs font-bold text-white">{commandLabel || phase}</span>
        </div>
        <div className="w-40 h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #6366f1, #a78bfa)',
              animation: progress < 100 ? 'progressPulse 2s ease-in-out infinite' : undefined }} />
        </div>
        <span className="text-[10px] text-white/50 font-mono">{progress}%</span>
        <div className="w-px h-4 bg-white/15" />
        <span className="text-[10px] text-white/50">⚡{energy}%</span>
        <span className="text-[10px] text-white/50">{agentCount}/13名</span>
        {elapsed != null && <span className="text-[10px] text-white/40 font-mono">{formatElapsed(elapsed)}</span>}
      </div>
      <style>{`@keyframes progressPulse { 0%,100% { opacity:1 } 50% { opacity:0.7 } }`}</style>
    </div>
  );
}

// ══════════════════════════════════════════
// HUD: Minimap (bottom-left)
// ══════════════════════════════════════════
function Minimap({ activeRooms, isLive }: { activeRooms?: Set<RoomId>; isLive?: boolean }) {
  const S = 8; // scale factor for minimap
  const mIso = (gx: number, gy: number) => ({ x: 52 + (gx - gy) * S / 2, y: 8 + (gx + gy) * S / 2 });
  const mFloor = (gx: number, gy: number, w: number, d: number) => {
    const a = mIso(gx, gy), b = mIso(gx+w, gy), c = mIso(gx+w, gy+d), e = mIso(gx, gy+d);
    return `M${a.x},${a.y} L${b.x},${b.y} L${c.x},${c.y} L${e.x},${e.y} Z`;
  };
  return (
    <div className="absolute bottom-3 left-3 z-30">
      <div className="rounded-lg border border-white/15 overflow-hidden backdrop-blur-md"
        style={{ background: 'rgba(15,23,42,0.8)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
        <div className="px-2 py-1 border-b border-white/10">
          <span className="text-[9px] font-bold text-white/60 uppercase tracking-wider">Map</span>
        </div>
        <svg width={105} height={95} className="block">
          <rect width={105} height={95} fill="transparent" />
          {ROOMS.map(r => {
            const active = isLive && activeRooms?.has(r.id);
            return (
              <path key={r.id} d={mFloor(r.gx, r.gy, r.w, r.d)}
                fill={active ? '#6366f1' : '#4a5568'} stroke={active ? '#818cf8' : '#2d3748'} strokeWidth={0.5}
                opacity={active ? 1 : 0.6}>
                {active && <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />}
              </path>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// HUD: Quest Log (bottom-right)
// ══════════════════════════════════════════
function QuestLog({ items, isLive, executing }: { items?: { label: string; status: 'active' | 'done' | 'error' }[]; isLive?: boolean; executing?: boolean }) {
  if (!isLive || !items || items.length === 0) return null;
  return (
    <div className="absolute right-3 z-30 w-56" style={{ bottom: executing ? '8.5rem' : '0.75rem' }}>
      <div className="rounded-lg border border-white/15 backdrop-blur-md overflow-hidden"
        style={{ background: 'rgba(15,23,42,0.8)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
        <div className="px-3 py-1.5 border-b border-white/10 flex items-center gap-2">
          <span className="text-[9px] font-bold text-yellow-400 uppercase tracking-wider">Quest Log</span>
          <span className="text-[9px] text-white/30">{items.filter(i => i.status === 'done').length}/{items.length}</span>
        </div>
        <div className="px-3 py-2 space-y-1 max-h-40 overflow-y-auto">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <span className={item.status === 'done' ? 'text-green-400' : item.status === 'error' ? 'text-red-400' : 'text-yellow-400'}>
                {item.status === 'done' ? '✓' : item.status === 'error' ? '✗' : '▸'}
              </span>
              <span className={`flex-1 ${item.status === 'done' ? 'text-white/40 line-through' : 'text-white/80'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// HUD: Bottom Dock
// ══════════════════════════════════════════
function BottomDock({ agents, selectedId, onSelect, activities }: {
  agents: Agent[]; selectedId?: string; onSelect: (a: Agent) => void; activities?: Map<string, AgentActivity>;
}) {
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 max-w-[95vw]">
      <div className="flex items-end gap-0.5 px-2 py-1.5 rounded-xl backdrop-blur-md border overflow-x-auto"
        style={{
          background: 'linear-gradient(180deg, rgba(15,20,35,0.85), rgba(8,12,24,0.9))',
          borderColor: 'rgba(212,175,55,0.2)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
        {agents.map(a => {
          const act = activities?.get(a.id);
          const isSelected = a.id === selectedId;
          const isWorking = act?.action === 'working' || act?.action === 'meeting';
          const deptColor = DEPT_COLORS[a.dept] || DEPT_COLORS.default;
          return (
            <button key={a.id} onClick={() => onSelect(a)}
              className={`relative flex flex-col items-center cursor-pointer transition-all duration-300 rounded-lg px-1 py-1 min-w-[52px]
                ${isSelected ? 'scale-105 -translate-y-0.5' : 'hover:scale-105 hover:-translate-y-0.5'}`}
              style={{
                background: isSelected ? `${deptColor}20` : 'transparent',
                border: isSelected ? `1px solid ${deptColor}40` : '1px solid transparent',
              }}>
              {/* キャラクター */}
              <div className="w-10 h-11 flex items-center justify-center overflow-visible">
                <PixelCharacter visual={a.visual} size="sm" active={a.active} />
              </div>
              {/* ステータスドット */}
              {isWorking && (
                <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-blue-400 animate-pulse"
                  style={{ boxShadow: '0 0 6px rgba(96,165,250,0.6)' }} />
              )}
              {/* 名前 */}
              <span className="text-[8px] font-bold text-white/70 mt-0.5 truncate w-12 text-center leading-tight">
                {a.name.split(' ')[0]}
              </span>
              {/* 役職 */}
              <span className="text-[6px] font-medium truncate w-12 text-center leading-tight" style={{ color: deptColor }}>
                {a.title.replace(/部長$/, '')}
              </span>
              {/* Lv */}
              <span className="text-[6px] text-white/30 leading-tight">Lv.{a.level}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════
export function OfficeFloor({
  agents, onSelect, selectedId, isLive, activities, activeRooms,
  energyLevel, livePhase, liveProgress, liveAgentCount, onAgentClick,
  executing, questItems, commandLabel, elapsed, onShowDetail, missionTimeline,
}: Props) {
  const [bubbleAgentId, setBubbleAgentId] = useState<string | null>(null);
  const bubbleAnchorRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [zoomTarget, setZoomTarget] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sound = useSoundEffects();
  const autoChat = useAutoChat(!executing); // auto chat when NOT executing
  const prevPhase = useRef(livePhase);

  // SE: Phase change detection
  useEffect(() => {
    if (livePhase && livePhase !== prevPhase.current) {
      if (livePhase.includes('完了')) {
        sound.play('celebration');
      } else {
        sound.play('phaseStart');
      }
    }
    prevPhase.current = livePhase;
  }, [livePhase, sound]);

  const byRoom = useCallback((id: RoomId) => {
    if (isLive && activities && activities.size > 0) {
      return agents.filter(a => { const act = activities.get(a.id); return act ? act.room === id : a.room === id; });
    }
    return agents.filter(a => a.room === id);
  }, [agents, isLive, activities]);

  const [manualZoom, setManualZoom] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  // Auto-zoom to active room during execution (only if not manually zooming)
  useEffect(() => {
    if (manualZoom) return;
    if (!executing || !isLive || !activeRooms || activeRooms.size === 0) {
      setZoom(1);
      setZoomTarget(null);
      setPanOffset({ x: 0, y: 0 });
      return;
    }
    // 実行中は全体が見えるズームレベルを維持（自動ズームで拡大しすぎない）
    setZoom(1);
    setZoomTarget(null);
    setPanOffset({ x: 0, y: 0 });
  }, [executing, isLive, activeRooms, manualZoom]);

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setZoom(prev => {
        const next = Math.max(0.5, Math.min(4, prev + delta));
        if (next !== 1) setManualZoom(true);
        if (Math.abs(next - 1) < 0.05) { setManualZoom(false); setPanOffset({ x: 0, y: 0 }); return 1; }
        return next;
      });
      setZoomTarget(null);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Drag pan (when zoomed)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (zoom <= 1) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...panOffset };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [zoom, panOffset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPanOffset({ x: panStart.current.x + dx / zoom, y: panStart.current.y + dy / zoom });
  }, [zoom]);

  const handlePointerUp = useCallback(() => { isDragging.current = false; }, []);

  const handleAgentClick = (agent: Agent, roomId: RoomId) => {
    onSelect(agent);
    onAgentClick?.(agent.id, roomId);
    setBubbleAgentId(prev => prev === agent.id ? null : agent.id);
    sound.play('select');
  };

  const sortedRooms = [...ROOMS].sort((a, b) => (a.gy + a.gx) - (b.gy + b.gx));

  // Compute transform for zoom
  const transform = zoom > 1
    ? zoomTarget
      ? `scale(${zoom}) translate(${VW / 2 - zoomTarget.x}px, ${VH / 2 - zoomTarget.y}px)`
      : `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`
    : `scale(${zoom})`;

  return (
    <div className="relative w-full h-full overflow-hidden" ref={containerRef}
      style={{ background: '#1a1a2e', cursor: zoom > 1 ? (isDragging.current ? 'grabbing' : 'grab') : 'default' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}>

      {/* ── Map Container with zoom ── */}
      <div className="w-full h-full transition-transform duration-1000 ease-in-out origin-center"
        style={{ transform }}>
        <div className="relative mx-auto" style={{ aspectRatio: `${VW} / ${VH}`, maxWidth: '100%', maxHeight: '100%' }}>
          {/* ── Building SVG ── */}
          <svg className="w-full h-full" viewBox={`0 0 ${VW} ${VH}`} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1a1a2e" />
                <stop offset="60%" stopColor="#16213e" />
                <stop offset="100%" stopColor="#0f3460" />
              </linearGradient>
            </defs>
            <rect width={VW} height={VH} fill="url(#sky)" />

            {/* Stars */}
            {[...Array(30)].map((_, i) => (
              <circle key={`star-${i}`} cx={50 + (i * 31) % VW} cy={10 + (i * 17) % 80} r={0.5 + (i % 3) * 0.3}
                fill="#fff" opacity={0.3 + (i % 5) * 0.1}>
                <animate attributeName="opacity" values={`${0.2 + (i % 3) * 0.1};${0.5 + (i % 3) * 0.15};${0.2 + (i % 3) * 0.1}`}
                  dur={`${2 + i % 3}s`} repeatCount="indefinite" />
              </circle>
            ))}

            {/* Ground */}
            <path d={floorD(-0.8, -0.5, 10.6, 12)} fill="#2e2840" />
            <path d={floorD(-0.5, -0.3, 10, 11.4)} fill="#242038" />

            {/* Rooms */}
            {sortedRooms.map(room => {
              const isActive = isLive && activeRooms?.has(room.id);
              return (
                <g key={room.id}>
                  <path d={floorD(room.gx, room.gy, room.w, room.d)}
                    fill={room.floor}
                    stroke={isActive ? '#6366f1' : 'rgba(0,0,0,0.15)'}
                    strokeWidth={isActive ? 2 : 0.5} />
                  {Array.from({ length: Math.floor(room.w) }).map((_, xi) =>
                    Array.from({ length: Math.floor(room.d) }).map((_, yi) => (
                      <path key={`t${xi}${yi}`}
                        d={floorD(room.gx + xi, room.gy + yi, 1, 1)}
                        fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
                    ))
                  )}
                  <path d={wallBack(room.gx, room.gy, room.w)} fill={room.wB} stroke="rgba(0,0,0,0.2)" strokeWidth={0.5} />
                  <path d={wallLeft(room.gx, room.gy, room.d)} fill={room.wL} stroke="rgba(0,0,0,0.2)" strokeWidth={0.5} />
                  {room.extRight && <path d={wallRight(room.gx, room.gy, room.w, room.d)} fill={room.wR} stroke="rgba(0,0,0,0.2)" strokeWidth={0.5} />}
                  {room.extFront && <path d={wallFront(room.gx, room.gy, room.w, room.d)} fill={room.wF} stroke="rgba(0,0,0,0.2)" strokeWidth={0.5} />}
                  {!room.extRight && room.id !== 'president' && (
                    <path d={wallRight(room.gx, room.gy, room.w, room.d)} fill={room.wR} opacity={0.6} stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
                  )}

                  {/* LIVE badge */}
                  {isActive && (() => {
                    const center = iso(room.gx + room.w / 2, room.gy);
                    return (
                      <g>
                        <rect x={center.x - 18} y={center.y - WH - 16} width={36} height={14} rx={7} fill="#ef4444" opacity={0.9} />
                        <circle cx={center.x - 10} cy={center.y - WH - 9} r={2.5} fill="#fff" opacity={0.9}>
                          <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
                        </circle>
                        <text x={center.x + 2} y={center.y - WH - 6} textAnchor="middle" fill="#fff" fontSize={7} fontWeight="bold">LIVE</text>
                      </g>
                    );
                  })()}

                  {/* Glow effect for active rooms */}
                  {isActive && (
                    <path d={floorD(room.gx, room.gy, room.w, room.d)} fill="#6366f1" opacity={0.08}>
                      <animate attributeName="opacity" values="0.05;0.12;0.05" dur="2s" repeatCount="indefinite" />
                    </path>
                  )}

                  <Furniture id={room.id} gx={room.gx} gy={room.gy} />
                </g>
              );
            })}

            {/* Exterior */}
            <Box gx={9.5} gy={-0.5} w={1.5} d={0.8} h={8} top="#333" right="#222" front="#2a2a2a" />
            {(() => { const p = iso(4, 11.2);
              return (
                <g>
                  <rect x={p.x - 38} y={p.y - 5} width={76} height={16} rx={2} fill="#1a1520" stroke="rgba(212,175,55,0.3)" strokeWidth={1} />
                  <rect x={p.x - 36} y={p.y - 3} width={72} height={12} rx={1} fill="none" stroke="rgba(212,175,55,0.15)" strokeWidth={0.5} />
                  <text x={p.x} y={p.y + 6} textAnchor="middle" fill="rgba(212,175,55,0.8)" fontSize={8} fontWeight="bold" letterSpacing={2}>AI COMPANY</text>
                </g>
              );
            })()}
          </svg>

          {/* ── 3D Character Overlay (Phase2) ── */}
          <Suspense fallback={null}>
            <Character3DOverlay
              agents={agents}
              activities={activities}
              isLive={isLive}
              onAgentClick={(agent) => {
                const act = activities?.get(agent.id);
                const roomId = act?.room ?? agent.room;
                handleAgentClick(agent, roomId);
              }}
            />
          </Suspense>

          {/* ── Agent Name Labels + Bubble Panels (HTML overlay) ── */}
          {sortedRooms.map(room => {
            const roomAgents = byRoom(room.id);
            const slots = SLOTS[room.id] || [];
            return roomAgents.map((agent, i) => {
              if (i >= slots.length) return null;
              const slot = slots[i];
              const pos = iso(slot.gx, slot.gy);
              const pctL = (pos.x / VW) * 100;
              const pctT = ((pos.y + 10) / VH) * 100;
              const showBubble = bubbleAgentId === agent.id;
              const activity = activities?.get(agent.id);
              const deptColor = DEPT_COLORS[agent.dept] || DEPT_COLORS.default;
              const isOpus = agent.model === 'opus';

              // 吹き出し用の上部アンカー位置
              const speechPctT = ((pos.y - 20) / VH) * 100;

              return (
                <div key={agent.id}>
                  {/* 吹き出し・バブルパネル（キャラ上部） */}
                  {(showBubble || activity?.speech || autoChat.messages.get(agent.id)) && (
                    <div ref={showBubble ? bubbleAnchorRef : undefined}
                      className="absolute pointer-events-none"
                      style={{ left: `${pctL}%`, top: `${speechPctT}%`, transform: 'translate(-50%, -100%)', zIndex: showBubble ? 50 : 25 }}>
                      {showBubble ? (
                        <AgentBubblePanel
                          agent={agent}
                          onClose={() => setBubbleAgentId(null)}
                          onShowDetail={() => { setBubbleAgentId(null); onShowDetail?.(agent); }}
                          anchorRef={bubbleAnchorRef}
                        />
                      ) : (activity?.speech || autoChat.messages.get(agent.id)) ? (
                        <SpeechBubble text={activity?.speech || autoChat.messages.get(agent.id)!.text} position="top" />
                      ) : null}
                    </div>
                  )}

                  {/* 足元ネームプレート（ピル型） */}
                  <div className="absolute pointer-events-none" style={{ left: `${pctL}%`, top: `${pctT}%`, transform: 'translate(-50%, 0)', zIndex: 18 }}>
                    <div className="text-center">
                      <div className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                        style={{
                          background: 'linear-gradient(180deg, rgba(15,20,35,0.85), rgba(8,12,24,0.9))',
                          border: `1.5px solid ${deptColor}60`,
                          boxShadow: `0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`,
                        }}>
                        {/* 部署カラードット */}
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: deptColor, boxShadow: `0 0 4px ${deptColor}` }} />
                        {isOpus && <span className="text-[6px] text-amber-400">★</span>}
                        <span className="text-[9px] font-bold text-white/90 truncate max-w-[52px] leading-tight">
                          {agent.name.split(' ')[0]}
                        </span>
                      </div>
                      {activity && activity.action !== 'idle' && (
                        <div className="mt-0.5">
                          <span className={`inline-block text-[7px] px-1.5 py-px rounded-full font-bold
                            ${activity.action === 'working' ? 'bg-blue-500/30 text-blue-300 border border-blue-400/30' :
                              activity.action === 'celebrating' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-400/30' :
                              activity.action === 'walking' ? 'bg-orange-500/30 text-orange-300 border border-orange-400/30' :
                              'bg-emerald-500/30 text-emerald-300 border border-emerald-400/30'}`}>
                            {activity.action === 'working' ? '作業中' : activity.action === 'celebrating' ? '完了!' :
                              activity.action === 'walking' ? '移動中' : activity.action === 'meeting' ? '会議中' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            });
          })}

          {/* ── Room Labels（RPG風看板） ── */}
          {sortedRooms.map(room => {
            const labelPos = iso(room.gx + room.w * 0.35, room.gy);
            const pctL = (labelPos.x / VW) * 100;
            const pctT = ((labelPos.y - WH - 6) / VH) * 100;
            const roomAgents = byRoom(room.id);
            const isActive = isLive && activeRooms?.has(room.id);
            return (
              <div key={`label-${room.id}`} className="absolute pointer-events-none" style={{ left: `${pctL}%`, top: `${pctT}%`, transform: 'translate(-50%, -100%)' }}>
                <div className="relative">
                  {/* 看板本体 */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold whitespace-nowrap`}
                    style={{
                      background: isActive
                        ? 'linear-gradient(180deg, rgba(79,70,229,0.4), rgba(55,48,163,0.5))'
                        : 'linear-gradient(180deg, rgba(60,50,35,0.85), rgba(40,32,22,0.9))',
                      border: isActive ? '1.5px solid rgba(129,140,248,0.5)' : '1.5px solid rgba(160,130,80,0.4)',
                      boxShadow: isActive
                        ? '0 2px 12px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.1)'
                        : '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                      color: isActive ? '#c7d2fe' : 'rgba(230,210,170,0.9)',
                    }}>
                    <span className="text-xs opacity-80">{room.icon}</span>
                    <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{room.label}</span>
                    <span className="text-[8px] ml-0.5 opacity-50">{roomAgents.length}名</span>
                  </div>
                  {/* 看板の吊り金具 */}
                  <div className="absolute -top-1 left-3 w-px h-1.5" style={{ background: 'rgba(160,130,80,0.3)' }} />
                  <div className="absolute -top-1 right-3 w-px h-1.5" style={{ background: 'rgba(160,130,80,0.3)' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ HUD Overlays ══ */}

      {/* Top: Mission Timeline or Phase Bar (only during execution) */}
      {executing && isLive && (
        missionTimeline || (
          <PhaseBar
            phase={livePhase ?? '待機中'}
            progress={liveProgress ?? 0}
            energy={energyLevel ?? 0}
            agentCount={liveAgentCount ?? 0}
            commandLabel={commandLabel}
            elapsed={elapsed}
          />
        )
      )}

      {/* Bottom-left: Minimap + Zoom controls */}
      <Minimap activeRooms={activeRooms} isLive={isLive} />
      <div className="absolute bottom-[110px] left-3 z-30 flex flex-col gap-0.5">
        <button onClick={() => { setZoom(prev => Math.min(4, prev + 0.2)); setManualZoom(true); }}
          className="w-6 h-6 rounded bg-slate-900/80 backdrop-blur-md border border-white/10 text-white/60 text-xs font-bold cursor-pointer hover:bg-white/10 transition-colors flex items-center justify-center">+</button>
        <div className="w-6 h-4 rounded bg-slate-900/60 text-[7px] text-white/30 flex items-center justify-center font-mono">
          {Math.round(zoom * 100)}
        </div>
        <button onClick={() => { setZoom(prev => Math.max(0.5, prev - 0.2)); setManualZoom(true); }}
          className="w-6 h-6 rounded bg-slate-900/80 backdrop-blur-md border border-white/10 text-white/60 text-xs font-bold cursor-pointer hover:bg-white/10 transition-colors flex items-center justify-center">-</button>
        {zoom !== 1 && (
          <button onClick={() => { setZoom(1); setManualZoom(false); setPanOffset({ x: 0, y: 0 }); setZoomTarget(null); }}
            className="w-6 h-6 rounded bg-slate-900/80 backdrop-blur-md border border-white/10 text-[7px] text-white/40 cursor-pointer hover:bg-white/10 transition-colors flex items-center justify-center">
            1x
          </button>
        )}
      </div>

      {/* Bottom-right: Quest Log */}
      <QuestLog items={questItems} isLive={isLive} executing={executing} />

      {/* Bottom-center: Dock */}
      <BottomDock agents={agents} selectedId={selectedId} onSelect={onSelect} activities={activities} />

      {/* Top-right: Sound Controls */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1">
        <button onClick={() => sound.setSfxEnabled(v => !v)}
          className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors backdrop-blur-md border border-white/15
            ${sound.sfxEnabled ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-white/30'}`}
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
          {sound.sfxEnabled ? '🔊 SE' : '🔇 SE'}
        </button>
        <button onClick={() => {
          const next = !sound.bgmEnabled;
          sound.setBgmEnabled(next);
          if (next) sound.startBgm(); else sound.stopBgm();
        }}
          className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-colors backdrop-blur-md border border-white/15
            ${sound.bgmEnabled ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-white/30'}`}
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
          {sound.bgmEnabled ? '🎵 BGM' : '🔇 BGM'}
        </button>
      </div>
    </div>
  );
}
