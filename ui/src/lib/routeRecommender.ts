import type { Agent } from '../types';

export type RouteType = string;

export interface RouteOption {
  type: RouteType;
  label: string;
  icon: string;
  description: string;
  agents: string[];           // agent IDs
  depth: 'lightweight' | 'medium' | 'heavy';
  model: 'haiku' | 'sonnet' | 'opus';
  maxTurns: number;
  estimatedSec: number;
  costEstimate: string;       // "$0.02" etc
  recommended: boolean;       // ★おすすめ
  stats: {
    runCount: number;
    avgSec: number | null;    // null if no history
    successRate: number | null;
  };
  // 育成ルート用
  trainingInfo?: {
    trainees: { agentId: string; skill: string; experience: number }[];
    mentor: string;
  };
  // 専門ルート用
  expertInfo?: {
    experts: { agentId: string; topSkills: string[] }[];
  };
}

// 実績記録
export interface ExecutionStat {
  id: string;
  instruction: string;
  routeType: RouteType;
  agents: string[];
  depth: string;
  model: string;
  maxTurns: number;
  estimatedSec: number;
  actualSec: number | null;
  status: 'done' | 'error';
  createdAt: string;
}

const STORAGE_KEY = 'ai-company-route-stats';
const DEFAULT_ESTIMATES: Record<string, number> = {
  quick: 60,
  duo: 180,
  team: 300,
  expert: 360,
  creative: 300,
  training: 480,
  full: 900,
};
const DEFAULT_COSTS: Record<string, string> = {
  quick: '$0.02',
  duo: '$0.08',
  team: '$0.15',
  expert: '$0.30',
  creative: '$0.20',
  training: '$0.25',
  full: '$0.80',
};

// キーワード→エージェントマッピング
const KEYWORD_AGENTS: { match: RegExp; agents: string[] }[] = [
  { match: /設計|アーキ|DB|api|スキーマ/i, agents: ['architect', 'developer'] },
  { match: /テスト|品質|バグ|qa|脆弱性|セキュリティ/i, agents: ['qa-reviewer', 'developer'] },
  { match: /UI|デザイン|画面|ux|フロント/i, agents: ['ui-designer', 'developer', 'planner'] },
  { match: /企画|要件|機能|ユーザー|仕様/i, agents: ['planner', 'ceo', 'architect'] },
  { match: /マーケ|市場|競合|トレンド|sns/i, agents: ['marketing', 'planner', 'ceo'] },
  { match: /採用|人事|教育|研修|評価/i, agents: ['hr', 'ceo'] },
  { match: /資料|報告|ドキュメント|議事録/i, agents: ['doc-writer'] },
  { match: /研究|調査|技術|イノベーション|特許/i, agents: ['rd', 'architect'] },
  { match: /開発|実装|コード|プログラム|リファクタ/i, agents: ['developer', 'architect', 'qa-reviewer'] },
  { match: /顧客|サポート|cs|カスタマー|問い合わせ/i, agents: ['cs', 'planner'] },
  { match: /戦略|経営|事業|計画/i, agents: ['ceo', 'planner', 'marketing'] },
];

// スキル→カテゴリマッピング（from constants.ts SKILLS data）
const SKILL_KEYWORDS: { match: RegExp; skills: string[] }[] = [
  { match: /コード|実装|開発|プログラム/i, skills: ['coding', 'debugging', 'code-review'] },
  { match: /設計|アーキ/i, skills: ['architecture', 'prototyping'] },
  { match: /テスト|品質|qa/i, skills: ['testing', 'quality-mgmt'] },
  { match: /デザイン|UI|画面/i, skills: ['ui-design', 'prototyping', 'ux-research'] },
  { match: /企画|要件|仕様/i, skills: ['project-mgmt', 'brainstorming'] },
  { match: /マーケ|市場|競合/i, skills: ['market-research', 'trend-analysis', 'branding'] },
  { match: /資料|報告|ドキュメント/i, skills: ['documentation', 'presentation', 'copywriting'] },
  { match: /セキュリティ|脆弱性/i, skills: ['security', 'risk-assessment'] },
  { match: /戦略|経営/i, skills: ['strategy', 'negotiation'] },
  { match: /データ|分析/i, skills: ['data-analysis', 'risk-assessment'] },
];

function loadStats(): ExecutionStat[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveStats(stats: ExecutionStat[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats.slice(0, 200)));
}

export function recordExecution(stat: ExecutionStat) {
  const stats = loadStats();
  stats.unshift(stat);
  saveStats(stats);
}

export function updateExecutionResult(id: string, actualSec: number, status: 'done' | 'error') {
  const stats = loadStats();
  const idx = stats.findIndex(s => s.id === id);
  if (idx >= 0) {
    stats[idx].actualSec = actualSec;
    stats[idx].status = status;
    saveStats(stats);
  }
}

function getRouteStats(routeType: RouteType): { runCount: number; avgSec: number | null; successRate: number | null } {
  const stats = loadStats().filter(s => s.routeType === routeType && s.actualSec !== null && s.status === 'done');
  if (stats.length === 0) return { runCount: 0, avgSec: null, successRate: null };

  const recent = stats.slice(0, 10);
  // 加重移動平均: 新しいほど重み大
  const weights = recent.map((_, i) => recent.length - i);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const avgSec = Math.round(
    recent.reduce((sum, s, i) => sum + (s.actualSec ?? 0) * weights[i], 0) / totalWeight
  );
  const successRate = Math.round(
    (recent.filter(s => s.status === 'done').length / recent.length) * 100
  );
  return { runCount: stats.length, avgSec, successRate };
}

function estimateTime(routeType: RouteType, agentCount: number): number {
  const stats = getRouteStats(routeType);
  if (stats.avgSec !== null && stats.runCount >= 3) {
    return stats.avgSec;
  }
  // デフォルト値をエージェント数で補正
  const defaultAgentCount: Record<RouteType, number> = {
    quick: 1, duo: 2, team: 5, full: 13, training: 4, expert: 3, creative: 4,
  };
  const ratio = agentCount / defaultAgentCount[routeType];
  return Math.round(DEFAULT_ESTIMATES[routeType] * ratio);
}

function analyzeInstruction(instruction: string): { coreAgents: string[]; relevantSkills: string[] } {
  const agents = new Set<string>(['secretary']); // 秘書は常に含む
  for (const kw of KEYWORD_AGENTS) {
    if (kw.match.test(instruction)) {
      kw.agents.forEach(a => agents.add(a));
    }
  }
  // 最低4名確保
  if (agents.size < 4) {
    ['ceo', 'planner', 'architect', 'developer'].forEach(a => agents.add(a));
  }

  const skills = new Set<string>();
  for (const kw of SKILL_KEYWORDS) {
    if (kw.match.test(instruction)) {
      kw.skills.forEach(s => skills.add(s));
    }
  }

  return { coreAgents: [...agents].slice(0, 8), relevantSkills: [...skills] };
}

function findTrainees(agents: Agent[], relevantSkills: string[]): { agentId: string; skill: string; experience: number }[] {
  if (relevantSkills.length === 0) return [];
  const trainees: { agentId: string; skill: string; experience: number }[] = [];

  for (const agent of agents) {
    const agentSkills = agent.skills || [];
    for (const skill of relevantSkills) {
      // そのスキルを持っていないエージェントが候補
      if (!agentSkills.includes(skill)) {
        trainees.push({ agentId: agent.id, skill, experience: getSkillExperienceCount(agent.id, skill) });
      }
    }
  }
  // 各エージェントにつき1スキルだけ（最も経験の少ないもの）
  const seen = new Set<string>();
  return trainees.filter(t => {
    if (seen.has(t.agentId)) return false;
    seen.add(t.agentId);
    return true;
  }).slice(0, 3);
}

function findExperts(agents: Agent[], relevantSkills: string[]): { agentId: string; topSkills: string[] }[] {
  if (relevantSkills.length === 0) {
    // スキル特定できない場合はレベル上位を返す
    return agents
      .sort((a, b) => b.level - a.level)
      .slice(0, 3)
      .map(a => ({ agentId: a.id, topSkills: (a.skills || []).slice(0, 3) }));
  }

  // スキルマッチ数でスコアリング
  const scored = agents.map(a => {
    const agentSkills = a.skills || [];
    const matchCount = relevantSkills.filter(s => agentSkills.includes(s)).length;
    return { agent: a, matchCount };
  });

  return scored
    .sort((a, b) => b.matchCount - a.matchCount || b.agent.level - a.agent.level)
    .slice(0, 3)
    .filter(s => s.matchCount > 0 || s.agent.level >= 3)
    .map(s => ({
      agentId: s.agent.id,
      topSkills: (s.agent.skills || []).filter(sk => relevantSkills.includes(sk)).slice(0, 3),
    }));
}

function selectRecommended(routes: RouteOption[]): RouteType {
  // 実績ベースで推薦
  const withStats = routes.filter(r => r.stats.runCount >= 3 && r.stats.successRate !== null);
  if (withStats.length > 0) {
    // 成功率 × 効率（時間の短さ）でスコアリング
    const scored = withStats.map(r => ({
      type: r.type,
      score: (r.stats.successRate ?? 0) / 100 * (1 / (r.estimatedSec / 60)),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0].type;
  }
  // 実績不足ならteamをデフォルト推薦
  return 'team';
}

export function recommendRoutes(instruction: string, agents: Agent[]): RouteOption[] {
  const { coreAgents, relevantSkills } = analyzeInstruction(instruction);
  const allAgentIds = agents.map(a => a.id);

  // 育成候補
  const trainees = findTrainees(agents, relevantSkills);
  const trainingAgents = trainees.map(t => t.agentId);
  // メンター: coreAgentsの中で最もレベルが高いエージェント
  const mentorCandidates = agents
    .filter(a => coreAgents.includes(a.id))
    .sort((a, b) => b.level - a.level);
  const mentor = mentorCandidates[0]?.id || 'ceo';
  const trainingTeam = [...new Set([...trainingAgents, mentor])];

  // 専門家
  const experts = findExperts(agents, relevantSkills);
  const expertAgents = experts.map(e => e.agentId);

  // duoルート: CEOと最適な1名のペア
  const duoPartner = coreAgents.find(id => id !== 'secretary' && id !== 'ceo') || 'planner';
  const duoAgents = ['ceo', duoPartner];

  // creativeルート: ブレスト向きメンバー
  const creativeAgents = [...new Set(['rd', 'marketing', 'planner', 'ui-designer'].filter(id => allAgentIds.includes(id)))];

  const routes: RouteOption[] = [
    {
      type: 'quick',
      label: '即答',
      icon: '⚡',
      description: '秘書が即座に回答します',
      agents: ['secretary'],
      depth: 'lightweight',
      model: 'haiku',
      maxTurns: 5,
      estimatedSec: estimateTime('quick', 1),
      costEstimate: DEFAULT_COSTS.quick,
      recommended: false,
      stats: getRouteStats('quick'),
    },
    {
      type: 'duo',
      label: 'ペア',
      icon: '👥',
      description: `CEOと${agents.find(a => a.id === duoPartner)?.name?.split(' ')[0] || '担当者'}の2名で対応`,
      agents: duoAgents,
      depth: 'medium',
      model: 'sonnet',
      maxTurns: 10,
      estimatedSec: estimateTime('duo', 2),
      costEstimate: DEFAULT_COSTS.duo,
      recommended: false,
      stats: getRouteStats('duo'),
    },
    {
      type: 'team',
      label: 'チーム',
      icon: '📋',
      description: `${coreAgents.length}名が分担して取り組みます`,
      agents: coreAgents,
      depth: 'medium',
      model: 'sonnet',
      maxTurns: 15,
      estimatedSec: estimateTime('team', coreAgents.length),
      costEstimate: DEFAULT_COSTS.team,
      recommended: false,
      stats: getRouteStats('team'),
    },
    {
      type: 'expert',
      label: '専門',
      icon: '🔬',
      description: 'トップスキル保持者が深掘りします',
      agents: expertAgents,
      depth: 'medium',
      model: 'opus',
      maxTurns: 20,
      estimatedSec: estimateTime('expert', expertAgents.length),
      costEstimate: DEFAULT_COSTS.expert,
      recommended: false,
      stats: getRouteStats('expert'),
      expertInfo: { experts },
    },
    {
      type: 'creative',
      label: 'ブレスト',
      icon: '💡',
      description: 'R&D・マーケ・企画・デザインでアイデア発散',
      agents: creativeAgents,
      depth: 'medium',
      model: 'sonnet',
      maxTurns: 12,
      estimatedSec: estimateTime('creative', creativeAgents.length),
      costEstimate: DEFAULT_COSTS.creative,
      recommended: false,
      stats: getRouteStats('creative'),
    },
    {
      type: 'training',
      label: '育成',
      icon: '🎓',
      description: '経験の浅いメンバーにチャレンジさせます',
      agents: trainingTeam,
      depth: 'medium',
      model: 'sonnet',
      maxTurns: 15,
      estimatedSec: estimateTime('training', trainingTeam.length),
      costEstimate: DEFAULT_COSTS.training,
      recommended: false,
      stats: getRouteStats('training'),
      trainingInfo: {
        trainees,
        mentor,
      },
    },
    {
      type: 'full',
      label: '全社',
      icon: '🏢',
      description: '全13名が多角的に取り組みます',
      agents: allAgentIds,
      depth: 'heavy',
      model: 'sonnet',
      maxTurns: 15,
      estimatedSec: estimateTime('full', 13),
      costEstimate: DEFAULT_COSTS.full,
      recommended: false,
      stats: getRouteStats('full'),
    },
  ];

  // 保存済みプリセットもルートとして追加
  const presets = loadPresets();
  for (const p of presets) {
    routes.push({
      type: `preset:${p.id}`,
      label: p.name,
      icon: p.icon,
      description: `プリセット: ${p.agents.length}名 · ${p.depth} · ${p.model}`,
      agents: p.agents,
      depth: p.depth,
      model: p.model,
      maxTurns: p.maxTurns,
      estimatedSec: estimateTime('team', p.agents.length),
      costEstimate: DEFAULT_COSTS[p.depth === 'lightweight' ? 'quick' : p.depth === 'heavy' ? 'full' : 'team'],
      recommended: false,
      stats: getRouteStats(`preset:${p.id}`),
    });
  }

  // ★おすすめ選定
  const recommendedType = selectRecommended(routes);
  for (const r of routes) {
    r.recommended = r.type === recommendedType;
  }

  return routes;
}

export function formatTime(sec: number): string {
  if (sec < 60) return `${sec}秒`;
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${min}分${s}秒` : `${min}分`;
}

export function getRouteHistory(): ExecutionStat[] {
  return loadStats();
}

// ── プリセット管理 ──────────────────────────────────────────

export interface RoutePreset {
  id: string;
  name: string;
  icon: string;
  agents: string[];
  depth: 'lightweight' | 'medium' | 'heavy';
  model: 'haiku' | 'sonnet' | 'opus';
  maxTurns: number;
  createdAt: string;
}

const PRESET_STORAGE_KEY = 'ai-company-route-presets';

/** 保存済みプリセット一覧を取得（最大20件） */
export function loadPresets(): RoutePreset[] {
  try {
    const raw = localStorage.getItem(PRESET_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/** プリセットを保存（同名なら上書き、最大20件） */
export function savePreset(preset: RoutePreset) {
  const presets = loadPresets();
  // 同名なら上書き
  const idx = presets.findIndex(p => p.name === preset.name);
  if (idx >= 0) {
    presets[idx] = preset;
  } else {
    presets.unshift(preset);
  }
  localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets.slice(0, 20)));
}

/** プリセットをIDで削除 */
export function deletePreset(id: string) {
  const presets = loadPresets().filter(p => p.id !== id);
  localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
}

// ── スキル経験記録 ──────────────────────────────────────────

export interface SkillExperience {
  agentId: string;
  skillId: string;
  routeType: RouteType;
  result: 'success' | 'partial' | 'fail';
  createdAt: string;
}

const SKILL_EXP_KEY = 'ai-company-skill-experience';

function loadSkillExperience(): SkillExperience[] {
  try {
    const raw = localStorage.getItem(SKILL_EXP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSkillExperience(records: SkillExperience[]) {
  localStorage.setItem(SKILL_EXP_KEY, JSON.stringify(records.slice(0, 500)));
}

/** スキル経験を1件記録する（最大500件保持） */
export function recordSkillExperience(exp: SkillExperience) {
  const records = loadSkillExperience();
  records.unshift(exp);
  saveSkillExperience(records);
}

/** エージェントのスキル別経験サマリーを取得 */
export function getAgentSkillExperience(agentId: string): Record<string, { attempts: number; successes: number }> {
  const records = loadSkillExperience().filter(r => r.agentId === agentId);
  const result: Record<string, { attempts: number; successes: number }> = {};
  for (const r of records) {
    if (!result[r.skillId]) result[r.skillId] = { attempts: 0, successes: 0 };
    result[r.skillId].attempts++;
    if (r.result === 'success') result[r.skillId].successes++;
  }
  return result;
}

/** エージェントの特定スキルの経験回数を取得 */
export function getSkillExperienceCount(agentId: string, skillId: string): number {
  return loadSkillExperience().filter(r => r.agentId === agentId && r.skillId === skillId).length;
}
