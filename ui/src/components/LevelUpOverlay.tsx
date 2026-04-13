import { useEffect, useState } from 'react';
import { LEVELS } from '../data/constants';
import type { AgentVisual } from '../types';
import { PixelCharacter } from './PixelCharacter';

interface Props {
  agentVisual: AgentVisual;
  agentName: string;
  newLevel: number;
  onDone: () => void;
}

export function LevelUpOverlay({ agentVisual, agentName, newLevel, onDone }: Props) {
  const [phase, setPhase] = useState<'flash' | 'show' | 'fadeout'>('flash');
  const levelInfo = LEVELS.find(l => l.level === newLevel) ?? LEVELS[0];

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 400);
    const t2 = setTimeout(() => setPhase('fadeout'), 2500);
    const t3 = setTimeout(onDone, 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center pointer-events-none
      transition-opacity duration-700 ${phase === 'fadeout' ? 'opacity-0' : 'opacity-100'}`}>
      {/* Flash */}
      {phase === 'flash' && (
        <div className="absolute inset-0 bg-white animate-[levelUp_0.4s_ease-out]" />
      )}

      {/* Content */}
      <div className={`text-center transition-all duration-500
        ${phase === 'flash' ? 'scale-50 opacity-0' : 'scale-100 opacity-100'}`}>
        <div className="mb-4 animate-bounce">
          <PixelCharacter visual={agentVisual} size="lg" active={true} />
        </div>
        <div className="text-4xl font-black text-yellow-400 tracking-widest mb-2"
          style={{ textShadow: '0 0 40px rgba(251, 191, 36, 0.6)' }}>
          LEVEL UP!
        </div>
        <div className="text-xl font-bold text-white mb-1">
          {agentName} → Lv.{newLevel}
        </div>
        <div className="text-lg text-indigo-300">
          {levelInfo.rank} — {levelInfo.title}
        </div>
        {newLevel >= 3 && (
          <div className="mt-3 text-sm text-yellow-300 animate-pulse">
            {newLevel >= 6 ? '🌈 レインボーオーラ解放!' :
             newLevel >= 5 ? '💎 ダイヤモンドフレーム解放!' :
             newLevel >= 4 ? '✨ パーティクルエフェクト解放!' :
             '✨ ゴールドフレーム解放!'}
          </div>
        )}
      </div>
    </div>
  );
}
