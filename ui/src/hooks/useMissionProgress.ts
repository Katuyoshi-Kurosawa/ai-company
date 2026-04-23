import { useMemo } from 'react';
import type { LogLine } from './useRelay';

/* ── フェーズ定義 ── */

export type PhaseStatus = 'pending' | 'active' | 'done';

export interface PhaseStep {
  id: string;
  label: string;
  shortLabel: string;
  agents: string[];       // このフェーズで動くエージェントID
  status: PhaseStatus;
  startedAt?: number;     // ログ中のタイムスタンプ
  completedAt?: number;
  progress: number;       // 0-100 このフェーズ全体に対する進捗
}

export interface AgentMissionState {
  agentId: string;
  status: 'waiting' | 'working' | 'done' | 'idle'; // idle = 不参加
  phaseId: string | null;   // 現在のフェーズ
  startedAt?: number;
  completedAt?: number;
}

export interface MissionProgress {
  mode: 'lightweight' | 'medium' | 'heavy' | 'unknown';
  phases: PhaseStep[];
  currentPhaseIndex: number;
  overallProgress: number;          // 0-100
  agentStates: Map<string, AgentMissionState>;
  participatingAgents: string[];    // ルート参加エージェント
  handoffPairs: { from: string; to: string; phaseId: string }[]; // バトンリレー
}

/* ── モード別フェーズ定義 ── */

const LIGHTWEIGHT_PHASES: Omit<PhaseStep, 'status' | 'progress'>[] = [
  { id: 'light-1', label: '秘書が応答中', shortLabel: '応答', agents: ['secretary'] },
  { id: 'light-done', label: '完了', shortLabel: '完了', agents: ['secretary'] },
];

const MEDIUM_PHASES: Omit<PhaseStep, 'status' | 'progress'>[] = [
  { id: 'med-1', label: '計画＋調査', shortLabel: '計画', agents: ['secretary', 'chief-secretary', 'planner', 'marketing'] },
  { id: 'med-2', label: '企画＋成果物作成', shortLabel: '制作', agents: ['planner', 'architect', 'developer', 'ui-designer', 'doc-writer'] },
  { id: 'med-done', label: '完了', shortLabel: '完了', agents: [] },
];

const HEAVY_PHASES: Omit<PhaseStep, 'status' | 'progress'>[] = [
  { id: 'h-1', label: '調査・計画（4並列）', shortLabel: 'P1:調査', agents: ['secretary', 'marketing', 'cs', 'planner'] },
  { id: 'h-2', label: '要件＋R&D＋設計＋レビュー', shortLabel: 'P2:設計', agents: ['planner', 'rd', 'architect', 'chief-secretary', 'ui-designer'] },
  { id: 'h-3', label: '実装＋QA＋評価＋報告', shortLabel: 'P3:実装', agents: ['developer', 'qa-reviewer', 'hr', 'cs', 'doc-writer', 'ui-designer'] },
  { id: 'h-qa', label: 'QA＋最終報告', shortLabel: 'QA', agents: ['qa-reviewer', 'chief-secretary', 'doc-writer'] },
  { id: 'h-report', label: '最終報告', shortLabel: '報告', agents: ['chief-secretary', 'secretary', 'ceo'] },
  { id: 'h-done', label: '完了', shortLabel: '完了', agents: [] },
];

/* ── ログからエージェント状態を解析 ── */

interface AgentLogEvent {
  agentId: string;
  type: 'start' | 'complete';
  time: number;
}

const AGENT_NAME_MAP: Record<string, string> = {
  '黒澤': 'ceo', 'CEO': 'ceo',
  '一条': 'secretary', 'CEO秘書': 'secretary',
  '如月': 'chief-secretary', '秘書部長': 'chief-secretary',
  '星野': 'marketing', 'マーケティング': 'marketing',
  '雪村': 'hr', '人事': 'hr',
  '天野': 'cs', 'CS部長': 'cs',
  '龍崎': 'rd', '研究開発': 'rd',
  '氷室': 'planner', '企画': 'planner',
  '九条': 'architect', '設計部長': 'architect',
  '桐生': 'developer', '開発部長': 'developer',
  '鷹見': 'qa-reviewer', 'QA': 'qa-reviewer',
  '朝比奈': 'ui-designer', 'デザイン': 'ui-designer',
  '水無瀬': 'doc-writer', '資料作成': 'doc-writer',
};

function detectAgentId(text: string): string | null {
  for (const [name, id] of Object.entries(AGENT_NAME_MAP)) {
    if (text.includes(name)) return id;
  }
  return null;
}

function parseAgentEvents(lines: LogLine[]): AgentLogEvent[] {
  const events: AgentLogEvent[] = [];
  for (const line of lines) {
    const text = line.text;
    if (text.includes('🚀') && text.includes('開始')) {
      const id = detectAgentId(text);
      if (id) events.push({ agentId: id, type: 'start', time: line.time });
    }
    if (text.includes('✅') && text.includes('完了')) {
      const id = detectAgentId(text);
      if (id) events.push({ agentId: id, type: 'complete', time: line.time });
    }
  }
  return events;
}

/* ── メインhook ── */

export function useMissionProgress(
  lines: LogLine[],
  isLive: boolean,
  participatingAgents?: string[],
  estimatedSec?: number,
): MissionProgress {
  return useMemo(() => {
    if (!isLive || lines.length === 0) {
      return {
        mode: 'unknown',
        phases: [],
        currentPhaseIndex: -1,
        overallProgress: 0,
        agentStates: new Map(),
        participatingAgents: participatingAgents || [],
        handoffPairs: [],
      };
    }

    const joined = lines.map(l => l.text).join('\n');

    // モード検出
    let mode: MissionProgress['mode'] = 'unknown';
    let phaseDefs: Omit<PhaseStep, 'status' | 'progress'>[];
    if (joined.includes('軽量モード')) {
      mode = 'lightweight';
      phaseDefs = LIGHTWEIGHT_PHASES;
    } else if (joined.includes('中量PHASE')) {
      mode = 'medium';
      phaseDefs = MEDIUM_PHASES;
    } else if (joined.includes('PHASE 1') || joined.includes('PHASE 2') || joined.includes('PHASE 3')) {
      mode = 'heavy';
      phaseDefs = HEAVY_PHASES;
    } else {
      phaseDefs = HEAVY_PHASES; // デフォルト
    }

    // フェーズ検出キー
    const phaseKeys: Record<string, string[]> = {
      'light-1': ['軽量モード'],
      'light-done': ['軽量モード完了', '全工程終了'],
      'med-1': ['中量PHASE 1'],
      'med-2': ['中量PHASE 2'],
      'med-done': ['全工程終了'],
      'h-1': ['PHASE 1'],
      'h-2': ['PHASE 2'],
      'h-3': ['PHASE 3'],
      'h-qa': ['QA＋最終報告'],
      'h-report': ['最終報告'],
      'h-done': ['全工程終了', '🎉'],
    };

    // フェーズ状態判定
    let currentPhaseIndex = -1;
    const phases: PhaseStep[] = phaseDefs.map((def) => {
      const keys = phaseKeys[def.id] || [];
      const found = keys.some(k => joined.includes(k));
      // フェーズキーの最初の出現タイムスタンプを取得
      let startedAt: number | undefined;
      if (found) {
        for (const line of lines) {
          if (keys.some(k => line.text.includes(k))) {
            startedAt = line.time;
            break;
          }
        }
      }
      return { ...def, status: 'pending' as PhaseStatus, progress: 0, startedAt };
    });

    // 検出済みフェーズを確定
    for (let i = phases.length - 1; i >= 0; i--) {
      if (phases[i].startedAt) {
        currentPhaseIndex = i;
        break;
      }
    }

    // ステータス設定
    for (let i = 0; i < phases.length; i++) {
      if (i < currentPhaseIndex) {
        phases[i].status = 'done';
        phases[i].progress = 100;
        // completedAt = 次のフェーズのstartedAt
        if (i + 1 < phases.length && phases[i + 1].startedAt) {
          phases[i].completedAt = phases[i + 1].startedAt;
        }
      } else if (i === currentPhaseIndex) {
        if (phases[i].id.endsWith('-done') || joined.includes('全工程終了')) {
          phases[i].status = 'done';
          phases[i].progress = 100;
        } else {
          phases[i].status = 'active';
          phases[i].progress = 50; // アクティブフェーズは50%仮定
        }
      }
    }

    // 全体進捗（完了フェーズを除いたアクティブフェーズ数で計算）
    const workPhases = phases.filter(p => !p.id.endsWith('-done'));
    const doneWork = workPhases.filter(p => p.status === 'done').length;
    const activeWork = workPhases.some(p => p.status === 'active') ? 0.5 : 0;
    const allDone = phases.some(p => p.id.endsWith('-done') && p.status === 'done');
    const overallProgress = allDone ? 100 : Math.min(99, Math.round(((doneWork + activeWork) / Math.max(1, workPhases.length)) * 100));

    // エージェントイベント解析
    const events = parseAgentEvents(lines);
    const agentStates = new Map<string, AgentMissionState>();

    // 全参加エージェントをwaitingで初期化
    const allAgents = new Set<string>();
    phases.forEach(p => p.agents.forEach(a => allAgents.add(a)));
    if (participatingAgents) participatingAgents.forEach(a => allAgents.add(a));

    for (const agentId of allAgents) {
      agentStates.set(agentId, { agentId, status: 'waiting', phaseId: null });
    }

    // イベントを反映
    for (const ev of events) {
      const state = agentStates.get(ev.agentId) || { agentId: ev.agentId, status: 'waiting' as const, phaseId: null };
      if (ev.type === 'start') {
        state.status = 'working';
        state.startedAt = ev.time;
        // どのフェーズにいるか推定
        for (let i = phases.length - 1; i >= 0; i--) {
          if (phases[i].agents.includes(ev.agentId) && (phases[i].status === 'active' || phases[i].status === 'done')) {
            state.phaseId = phases[i].id;
            break;
          }
        }
      } else if (ev.type === 'complete') {
        state.status = 'done';
        state.completedAt = ev.time;
      }
      agentStates.set(ev.agentId, state);
    }

    // バトンリレー（フェーズ間のハンドオフ）生成
    const handoffPairs: MissionProgress['handoffPairs'] = [];
    for (let i = 0; i < phases.length - 1; i++) {
      const fromPhase = phases[i];
      const toPhase = phases[i + 1];
      if (fromPhase.agents.length > 0 && toPhase.agents.length > 0) {
        // 前フェーズの最後のエージェント → 次フェーズの最初のエージェント
        const from = fromPhase.agents[fromPhase.agents.length - 1];
        const to = toPhase.agents[0];
        handoffPairs.push({ from, to, phaseId: toPhase.id });
      }
    }

    return {
      mode,
      phases,
      currentPhaseIndex,
      overallProgress,
      agentStates,
      participatingAgents: [...allAgents],
      handoffPairs,
    };
  }, [lines, isLive, participatingAgents, estimatedSec]);
}
