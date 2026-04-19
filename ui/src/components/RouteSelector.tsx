import { useState } from 'react';
import type { Agent } from '../types';
import type { RouteOption, RoutePreset } from '../lib/routeRecommender';
import { formatTime, loadPresets, savePreset, deletePreset } from '../lib/routeRecommender';
import { PixelCharacter } from './PixelCharacter';

interface Props {
  agents: Agent[];
  routes: RouteOption[];
  theme: { bg: string; surface: string; border: string; text: string; muted: string };
  onSelect: (route: RouteOption) => void;
  onAdjust: (route: RouteOption) => void;
  onSelectPreset?: (preset: RoutePreset) => void;
}

export function RouteSelector({ agents, routes, theme, onSelect, onAdjust }: Props) {
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<Record<string, { agents: string[]; depth: number }>>({});

  const getAgent = (id: string) => agents.find(a => a.id === id);

  const toggleAgent = (routeType: string, agentId: string, currentAgents: string[]) => {
    const current = adjustments[routeType]?.agents ?? currentAgents;
    const updated = current.includes(agentId)
      ? current.filter(a => a !== agentId)
      : [...current, agentId];
    setAdjustments(prev => ({
      ...prev,
      [routeType]: { ...prev[routeType], agents: updated, depth: prev[routeType]?.depth ?? 1 },
    }));
  };

  const setDepth = (routeType: string, depth: number, currentAgents: string[]) => {
    setAdjustments(prev => ({
      ...prev,
      [routeType]: { agents: prev[routeType]?.agents ?? currentAgents, depth },
    }));
  };

  const getAdjustedRoute = (route: RouteOption): RouteOption => {
    const adj = adjustments[route.type];
    if (!adj) return route;
    const depthMap: Record<number, { depth: 'lightweight' | 'medium' | 'heavy'; model: 'haiku' | 'sonnet' | 'opus'; maxTurns: number }> = {
      0: { depth: 'lightweight', model: 'haiku', maxTurns: 5 },
      1: { depth: 'medium', model: 'sonnet', maxTurns: 15 },
      2: { depth: 'heavy', model: 'opus', maxTurns: 30 },
    };
    const d = depthMap[adj.depth] ?? depthMap[1];
    // 推定時間をエージェント数と深さで再計算
    const depthMultiplier = [0.3, 1, 2.5][adj.depth] ?? 1;
    const agentRatio = adj.agents.length / Math.max(route.agents.length, 1);
    const newEstimate = Math.round(route.estimatedSec * agentRatio * depthMultiplier);
    // コスト再計算
    const costMap = ['$0.02', '$0.15', '$0.80'];
    const baseCost = parseFloat(costMap[adj.depth]?.replace('$', '') ?? '0.15');
    const newCost = '$' + (baseCost * agentRatio).toFixed(2);
    return { ...route, agents: adj.agents, ...d, estimatedSec: newEstimate, costEstimate: newCost };
  };

  const DEPTH_LABELS = ['⚡ 浅い（速い）', '🔧 標準', '🏗️ 深い（丁寧）'];

  return (
    <div className="space-y-2">
      {routes.map(route => {
        const adjusted = getAdjustedRoute(route);
        const isExpanded = expandedType === route.type;
        const adj = adjustments[route.type];

        return (
          <div key={route.type}
            className={`rounded-xl p-4 transition-all duration-200 hover:scale-[1.005]
              ${route.recommended ? 'ring-2 ring-indigo-400/50' : ''}`}
            style={{
              background: route.recommended
                ? `linear-gradient(135deg, ${theme.surface}, ${theme.surface}ee, rgba(99,102,241,0.08))`
                : theme.surface,
              border: `1px solid ${route.recommended ? 'rgba(99,102,241,0.3)' : theme.border}`,
            }}>

            {/* Main row */}
            <div className="flex items-start gap-4">
              {/* Icon + label */}
              <div className="text-center w-16 shrink-0">
                <div className="text-2xl">{route.icon}</div>
                <div className="text-xs font-bold mt-1">{route.label}</div>
                {route.recommended && (
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded mt-1 inline-block">
                    ★おすすめ
                  </span>
                )}
              </div>

              {/* Description + agents */}
              <div className="flex-1 min-w-0">
                <p className="text-sm mb-2">{route.description}</p>

                {/* Agent icons */}
                <div className="flex items-center gap-1 flex-wrap">
                  {adjusted.agents.slice(0, 8).map(id => {
                    const a = getAgent(id);
                    if (!a) return null;
                    return (
                      <div key={id} className="flex flex-col items-center" title={`${a.name} ${a.title}`}>
                        <PixelCharacter visual={a.visual} size="sm" active={a.active} />
                      </div>
                    );
                  })}
                  {adjusted.agents.length > 8 && (
                    <span className="text-xs" style={{ color: theme.muted }}>
                      +{adjusted.agents.length - 8}名
                    </span>
                  )}
                </div>

                {/* Training info */}
                {route.type === 'training' && route.trainingInfo && (
                  <div className="mt-2 space-y-0.5">
                    {route.trainingInfo.trainees.map(t => {
                      const a = getAgent(t.agentId);
                      return (
                        <div key={t.agentId} className="text-[11px] flex items-center gap-1" style={{ color: theme.muted }}>
                          <span>🌱</span>
                          <span>{a?.name}: {t.skill}スキル経験 {t.experience}回</span>
                        </div>
                      );
                    })}
                    <div className="text-[11px] flex items-center gap-1" style={{ color: theme.muted }}>
                      <span>👨‍🏫</span>
                      <span>メンター: {getAgent(route.trainingInfo.mentor)?.name}</span>
                    </div>
                  </div>
                )}

                {/* Expert info */}
                {route.type === 'expert' && route.expertInfo && (
                  <div className="mt-2 space-y-0.5">
                    {route.expertInfo.experts.map(e => {
                      const a = getAgent(e.agentId);
                      return (
                        <div key={e.agentId} className="text-[11px] flex items-center gap-1" style={{ color: theme.muted }}>
                          <span>🏆</span>
                          <span>{a?.name}: {e.topSkills.join(', ')}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Stats + action */}
              <div className="text-right shrink-0 space-y-1">
                <div className="text-sm font-bold">~{formatTime(adjusted.estimatedSec)}</div>
                <div className="text-[10px]" style={{ color: theme.muted }}>{route.costEstimate}</div>
                {route.stats.runCount > 0 && (
                  <div className="text-[10px]" style={{ color: theme.muted }}>
                    実績{route.stats.runCount}回
                    {route.stats.avgSec !== null && ` 平均${formatTime(route.stats.avgSec)}`}
                  </div>
                )}
                {route.stats.successRate !== null && (
                  <div className={`text-[10px] ${route.stats.successRate >= 80 ? 'text-green-400' : route.stats.successRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    成功率{route.stats.successRate}%
                  </div>
                )}
                <div className="flex gap-1 mt-2">
                  <button
                    onClick={() => setExpandedType(isExpanded ? null : route.type)}
                    className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] cursor-pointer transition-colors">
                    🎛️
                  </button>
                  <button
                    onClick={() => {
                      const finalRoute = getAdjustedRoute(route);
                      onSelect(finalRoute);
                    }}
                    className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-xs font-bold cursor-pointer transition-colors">
                    ▶ 実行
                  </button>
                </div>
              </div>
            </div>

            {/* Adjust panel */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: theme.border }}>
                {/* Agent toggle */}
                <div>
                  <div className="text-[10px] font-bold opacity-40 mb-2">参加メンバー（タップで追加/除外）</div>
                  <div className="flex flex-wrap gap-1.5">
                    {agents.map(a => {
                      const isIn = (adj?.agents ?? route.agents).includes(a.id);
                      return (
                        <button key={a.id}
                          onClick={() => toggleAgent(route.type, a.id, route.agents)}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] cursor-pointer transition-all
                            ${isIn ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-400/30' : 'bg-white/5 opacity-40 hover:opacity-70'}`}>
                          <span>{a.icon}</span>
                          <span>{a.name.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Depth slider */}
                <div>
                  <div className="text-[10px] font-bold opacity-40 mb-2">処理の深さ</div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0} max={2}
                      value={adj?.depth ?? 1}
                      onChange={e => setDepth(route.type, Number(e.target.value), route.agents)}
                      className="flex-1"
                    />
                    <span className="text-xs w-32 text-right">{DEPTH_LABELS[adj?.depth ?? 1]}</span>
                  </div>
                  {/* 微調整前後の推定時間差 */}
                  {adj && (
                    <div className="text-xs mt-1" style={{ color: theme.muted }}>
                      推定時間: ~{formatTime(route.estimatedSec)} → <span className="font-bold" style={{ color: theme.text }}>~{formatTime(getAdjustedRoute(route).estimatedSec)}</span>
                    </div>
                  )}
                </div>

                {/* Preset save form */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="プリセット名..."
                    className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs"
                    id={`preset-name-${route.type}`}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById(`preset-name-${route.type}`) as HTMLInputElement;
                      const name = input?.value?.trim();
                      if (!name) return;
                      const adj = adjustments[route.type];
                      savePreset({
                        id: `preset-${Date.now()}`,
                        name,
                        icon: route.icon,
                        agents: adj?.agents ?? route.agents,
                        depth: (['lightweight', 'medium', 'heavy'] as const)[adj?.depth ?? 1],
                        model: (['haiku', 'sonnet', 'opus'] as const)[adj?.depth ?? 1],
                        maxTurns: [5, 15, 30][adj?.depth ?? 1],
                        createdAt: new Date().toISOString(),
                      });
                      input.value = '';
                    }}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] cursor-pointer transition-colors">
                    💾 保存
                  </button>
                </div>

                {/* Apply button */}
                <button
                  onClick={() => onAdjust(getAdjustedRoute(route))}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 rounded text-xs cursor-pointer transition-colors">
                  この設定で確定
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Presets section */}
      {(() => {
        const presets = loadPresets();
        if (presets.length === 0) return null;
        return (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.border }}>
            <div className="text-[10px] font-bold opacity-40 uppercase tracking-wider mb-2">保存済みプリセット</div>
            <div className="space-y-1">
              {presets.map(p => (
                <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                  <span className="text-lg">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{p.name}</div>
                    <div className="text-[10px]" style={{ color: theme.muted }}>
                      {p.agents.length}名 · {p.depth} · {p.model}
                    </div>
                  </div>
                  <button
                    onClick={() => onSelect({
                      type: 'team',
                      label: p.name,
                      icon: p.icon,
                      description: `プリセット: ${p.name}`,
                      agents: p.agents,
                      depth: p.depth,
                      model: p.model,
                      maxTurns: p.maxTurns,
                      estimatedSec: 300,
                      costEstimate: '$0.15',
                      recommended: false,
                      stats: { runCount: 0, avgSec: null, successRate: null },
                    })}
                    className="px-2 py-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-[10px] font-bold cursor-pointer transition-colors">
                    ▶
                  </button>
                  <button
                    onClick={() => { deletePreset(p.id); }}
                    className="px-1.5 py-1 bg-white/5 hover:bg-red-500/20 rounded text-[10px] cursor-pointer transition-colors">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
