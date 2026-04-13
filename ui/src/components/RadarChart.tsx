import type { AgentStats } from '../types';
import { STAT_LABELS, STAT_KEYS } from '../data/constants';

interface Props {
  stats: AgentStats;
  size?: number;
}

export function RadarChart({ stats, size = 200 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const count = STAT_KEYS.length;

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const dist = (value / 100) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };

  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid */}
      {gridLevels.map(level => {
        const points = STAT_KEYS.map((_, i) => {
          const p = getPoint(i, level);
          return `${p.x},${p.y}`;
        }).join(' ');
        return (
          <polygon
            key={level}
            points={points}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.15}
            strokeWidth={1}
          />
        );
      })}

      {/* Axes */}
      {STAT_KEYS.map((_, i) => {
        const p = getPoint(i, 100);
        return (
          <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y}
            stroke="currentColor" strokeOpacity={0.15} strokeWidth={1} />
        );
      })}

      {/* Data polygon */}
      <polygon
        points={STAT_KEYS.map((k, i) => {
          const p = getPoint(i, stats[k]);
          return `${p.x},${p.y}`;
        }).join(' ')}
        fill="rgba(99, 102, 241, 0.3)"
        stroke="#6366f1"
        strokeWidth={2}
      />

      {/* Data dots */}
      {STAT_KEYS.map((k, i) => {
        const p = getPoint(i, stats[k]);
        return <circle key={k} cx={p.x} cy={p.y} r={3} fill="#6366f1" />;
      })}

      {/* Labels */}
      {STAT_KEYS.map((k, i) => {
        const p = getPoint(i, 120);
        return (
          <text key={k} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
            fill="currentColor" fontSize={11} fontWeight={500}>
            {STAT_LABELS[k]}
          </text>
        );
      })}
    </svg>
  );
}
