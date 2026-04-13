import { useEffect, useState } from 'react';
import { BADGES } from '../data/constants';

interface Props {
  badgeId: string;
  agentName: string;
  expGained: number;
  onDone: () => void;
}

export function BadgeNotification({ badgeId, agentName, expGained, onDone }: Props) {
  const [visible, setVisible] = useState(false);
  const badge = BADGES.find(b => b.id === badgeId);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 100);
    const t2 = setTimeout(() => setVisible(false), 3000);
    const t3 = setTimeout(onDone, 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  if (!badge) return null;

  return (
    <div className={`fixed top-4 right-4 z-[90] transition-all duration-500
      ${visible ? 'translate-x-0 opacity-100' : 'translate-x-[200px] opacity-0'}`}>
      <div className="bg-[#1a1a24] border border-yellow-400/30 rounded-xl p-4 shadow-[0_0_30px_rgba(251,191,36,0.2)] flex items-center gap-4 min-w-[300px]">
        <span className="text-4xl animate-spin" style={{ animationDuration: '1s', animationIterationCount: 1 }}>
          {badge.icon}
        </span>
        <div>
          <div className="text-xs text-yellow-400 font-bold">BADGE UNLOCKED!</div>
          <div className="text-sm font-bold">{badge.name}</div>
          <div className="text-xs opacity-60">{agentName} — {badge.description}</div>
          <div className="text-xs text-yellow-400 mt-1">
            {'★'.repeat(badge.rarity)}{'☆'.repeat(5 - badge.rarity)}
          </div>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-green-400 animate-[expPulse_1s_ease-out_forwards]">
            +{expGained}
          </span>
          <div className="text-[10px] opacity-40">EXP</div>
        </div>
      </div>
    </div>
  );
}
