import { useState, useEffect, useRef, useCallback } from 'react';
import type { RoomId } from '../types';
import type { LogLine } from './useRelay';

/* ── エージェントごとの行動状態 ── */
export type AgentAction = 'idle' | 'working' | 'walking' | 'meeting' | 'reviewing' | 'celebrating' | 'resting';

export interface AgentActivity {
  agentId: string;
  room: RoomId;
  action: AgentAction;
  speech?: string;        // 吹き出しテキスト
  speechExpiry?: number;  // 吹き出し消滅時刻
}

export interface OfficeActivity {
  activities: Map<string, AgentActivity>;
  activeRooms: Set<RoomId>;
  liveAgentCount: number;
  phase: string;
  progress: number;
  energyLevel: number; // 0-100 オフィス活性度
}

/* ── エージェントIDとログパターンのマッピング ── */
const AGENT_PATTERNS: Record<string, { names: string[]; defaultRoom: RoomId }> = {
  'ceo':              { names: ['ceo', '黒澤', 'CEO'],                  defaultRoom: 'president' },
  'secretary':        { names: ['secretary', '一条', 'CEO秘書'],         defaultRoom: 'president' },
  'chief-secretary':  { names: ['chief-secretary', '如月', '秘書部長'],  defaultRoom: 'executive' },
  'marketing':        { names: ['marketing', '星野', 'マーケティング'],   defaultRoom: 'open-office' },
  'hr':               { names: ['hr', '雪村', '人事'],                   defaultRoom: 'open-office' },
  'cs':               { names: ['cs', '天野', 'CS'],                     defaultRoom: 'open-office' },
  'rd':               { names: ['rd', '龍崎', '研究開発'],               defaultRoom: 'open-office' },
  'planner':          { names: ['planner', '氷室', '企画'],              defaultRoom: 'open-office' },
  'architect':        { names: ['architect', '九条', '設計'],             defaultRoom: 'meeting-a' },
  'developer':        { names: ['developer', '桐生', '開発'],            defaultRoom: 'open-office' },
  'qa-reviewer':      { names: ['qa-reviewer', '鷹見', 'QA'],            defaultRoom: 'open-office' },
  'ui-designer':      { names: ['ui-designer', '朝比奈', 'デザイン'],    defaultRoom: 'open-office' },
  'doc-writer':       { names: ['doc-writer', '水無瀬', '資料作成'],     defaultRoom: 'open-office' },
};

/* ── 性格に合わせた吹き出しテンプレート ── */
const SPEECH_TEMPLATES: Record<string, { start: string[]; done: string[]; phase: string[] }> = {
  'ceo':              { start: ['計画は固まった。進めてくれ', '全体を見渡して判断する'], done: ['よくやった', '報告を待つ'], phase: ['次のフェーズだ'] },
  'secretary':        { start: ['承知しました、社長', 'すぐ取りかかります'], done: ['ご報告いたします', '完了しました'], phase: ['進捗をまとめますね'] },
  'chief-secretary':  { start: ['全体の進行を管理します', 'ボトルネックを潰します'], done: ['レビュー完了です', 'GO判定出します'], phase: ['各部門、状況は？'] },
  'marketing':        { start: ['市場、めっちゃ面白いよ～！', '調査始めまーす！'], done: ['いいデータ取れた！', 'レポートできたよ♪'], phase: ['トレンド見えてきた！'] },
  'hr':               { start: ['メンバーの力を引き出します', '評価基準を整理中...'], done: ['育成計画できました', '評価完了です'], phase: ['みんな頑張ってるね'] },
  'cs':               { start: ['お客様目線で考えます！', 'シナリオ洗い出し中'], done: ['FAQ完成しました！', 'オンボーディング設計OK'], phase: ['ユーザーの声が大事'] },
  'rd':               { start: ['常識破壊するぞ！', 'ぶっ飛んだアイデア出す'], done: ['10倍良くなる案できた', 'イノベーション提案完了'], phase: ['もっと攻めよう'] },
  'planner':          { start: ['ペルソナから考えよう', '要件を整理します'], done: ['要件定義書完成！', 'ユーザー分析できた'], phase: ['全体像が見えてきた'] },
  'architect':        { start: ['設計の完全性にこだわる', 'アーキテクチャ検討中...'], done: ['設計書仕上がった', 'スキーマも完成'], phase: ['整合性を確認中'] },
  'developer':        { start: ['コード書くぞ！', '実装始めます'], done: ['実装完了！', 'デプロイ準備OK'], phase: ['ガリガリ書いてる'] },
  'qa-reviewer':      { start: ['バグは逃さない', '品質チェック開始'], done: ['レビュー完了', 'セキュリティOK'], phase: ['一つずつ潰していく'] },
  'ui-designer':      { start: ['美しいUIを作るよ', 'モックアップ制作中'], done: ['デザイン完成！', 'アクセシビリティもOK'], phase: ['色味を調整中...'] },
  'doc-writer':       { start: ['報告書を書きます', '構成を練っています'], done: ['ドキュメント完成！', '読みやすく仕上げた'], phase: ['文章を磨いてる'] },
};

/* ── フェーズごとの部屋割り当て ── */
const PHASE_ROOM_MAP: Record<string, Record<string, RoomId>> = {
  'PHASE 1': {
    ceo: 'president', marketing: 'open-office', cs: 'open-office',
    planner: 'open-office', secretary: 'president',
    'chief-secretary': 'executive',
  },
  'PHASE 2': {
    ceo: 'president', planner: 'meeting-a', rd: 'meeting-b',
    architect: 'meeting-a', 'chief-secretary': 'executive',
    'ui-designer': 'meeting-b', secretary: 'president',
  },
  'PHASE 3': {
    developer: 'open-office', 'ui-designer': 'open-office',
    cs: 'open-office', hr: 'open-office', 'doc-writer': 'open-office',
    'qa-reviewer': 'meeting-a', 'chief-secretary': 'executive',
    secretary: 'president', ceo: 'president',
  },
  'レビュー': {
    'chief-secretary': 'meeting-a', architect: 'meeting-a',
    planner: 'meeting-a',
  },
  '最終報告': {
    'chief-secretary': 'executive', secretary: 'president',
    ceo: 'president', 'qa-reviewer': 'meeting-a',
  },
  '完了': {},
};

/* ── メインhook ── */
export function useOfficeActivity(lines: LogLine[], isRunning: boolean) {
  const [activities, setActivities] = useState<Map<string, AgentActivity>>(new Map());
  const [phase, setPhase] = useState('待機中');
  const [progress, setProgress] = useState(0);
  const processedCount = useRef(0);

  // ランダム選択ヘルパー
  const pick = useCallback(<T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)], []);

  // 吹き出し期限チェック（3秒で消える）
  useEffect(() => {
    if (!isRunning) return;
    const iv = setInterval(() => {
      const now = Date.now();
      setActivities(prev => {
        let changed = false;
        const next = new Map(prev);
        for (const [id, act] of next) {
          if (act.speech && act.speechExpiry && now > act.speechExpiry) {
            next.set(id, { ...act, speech: undefined, speechExpiry: undefined });
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 500);
    return () => clearInterval(iv);
  }, [isRunning]);

  // ログ解析
  useEffect(() => {
    if (lines.length <= processedCount.current) return;
    const newLines = lines.slice(processedCount.current);
    processedCount.current = lines.length;

    setActivities(prev => {
      const next = new Map(prev);

      for (const line of newLines) {
        const text = line.text;

        // エージェント開始検出
        if (text.includes('🚀') && text.includes('開始')) {
          for (const [agentId, info] of Object.entries(AGENT_PATTERNS)) {
            if (info.names.some(n => text.includes(n))) {
              const templates = SPEECH_TEMPLATES[agentId];
              next.set(agentId, {
                agentId,
                room: next.get(agentId)?.room ?? info.defaultRoom,
                action: 'working',
                speech: templates ? pick(templates.start) : '作業開始！',
                speechExpiry: Date.now() + 4000,
              });
              break;
            }
          }
        }

        // エージェント完了検出
        if (text.includes('✅') && text.includes('完了')) {
          for (const [agentId, info] of Object.entries(AGENT_PATTERNS)) {
            if (info.names.some(n => text.includes(n))) {
              const templates = SPEECH_TEMPLATES[agentId];
              next.set(agentId, {
                agentId,
                room: next.get(agentId)?.room ?? info.defaultRoom,
                action: 'celebrating',
                speech: templates ? pick(templates.done) : 'できました！',
                speechExpiry: Date.now() + 3000,
              });
              // 2秒後にrestingに遷移
              setTimeout(() => {
                setActivities(p => {
                  const n = new Map(p);
                  const a = n.get(agentId);
                  if (a && a.action === 'celebrating') {
                    n.set(agentId, { ...a, action: 'resting', room: 'break' });
                  }
                  return n;
                });
              }, 2500);
              break;
            }
          }
        }

        // EXP獲得
        if (text.includes('💫') && text.includes('EXP')) {
          for (const [agentId, info] of Object.entries(AGENT_PATTERNS)) {
            if (info.names.some(n => text.includes(n))) {
              const current = next.get(agentId);
              if (current) {
                next.set(agentId, {
                  ...current,
                  speech: 'EXP獲得！💫',
                  speechExpiry: Date.now() + 2000,
                });
              }
              break;
            }
          }
        }

        // フェーズ検出 → 部屋移動
        if (text.includes('PHASE 1') || text.includes('調査・計画')) {
          setPhase('PHASE 1: 調査・計画');
          setProgress(15);
          applyRoomMap(next, 'PHASE 1');
        } else if (text.includes('PHASE 2') || text.includes('要件') && text.includes('設計')) {
          setPhase('PHASE 2: 要件＋設計');
          setProgress(40);
          applyRoomMap(next, 'PHASE 2');
        } else if (text.includes('PHASE 3') || text.includes('実装')) {
          setPhase('PHASE 3: 実装＋QA＋報告');
          setProgress(65);
          applyRoomMap(next, 'PHASE 3');
        } else if (text.includes('非同期レビュー') || text.includes('レビュー')) {
          setPhase('レビュー中');
          applyRoomMap(next, 'レビュー');
        } else if (text.includes('最終報告')) {
          setPhase('最終報告');
          setProgress(90);
          applyRoomMap(next, '最終報告');
        } else if (text.includes('全工程終了') || text.includes('🎉')) {
          setPhase('完了！🎉');
          setProgress(100);
          // 全員を celebration に
          for (const [id, act] of next) {
            next.set(id, { ...act, action: 'celebrating', speech: '🎉', speechExpiry: Date.now() + 5000 });
          }
        }

        // 中量モード検出
        if (text.includes('中量PHASE 1')) {
          setPhase('中量 PHASE 1: 計画＋調査');
          setProgress(20);
        } else if (text.includes('中量PHASE 2')) {
          setPhase('中量 PHASE 2: 企画＋成果物');
          setProgress(60);
        }

        // 軽量モード検出
        if (text.includes('軽量モード')) {
          setPhase('軽量モード: 秘書応答');
          setProgress(50);
        }
      }

      return next;
    });
  }, [lines, pick]);

  // リセット
  useEffect(() => {
    if (!isRunning) {
      processedCount.current = 0;
    }
  }, [isRunning]);

  // 部屋割り当て適用
  function applyRoomMap(map: Map<string, AgentActivity>, phaseKey: string) {
    const roomMap = PHASE_ROOM_MAP[phaseKey];
    if (!roomMap) return;
    for (const [agentId, room] of Object.entries(roomMap)) {
      const existing = map.get(agentId);
      const templates = SPEECH_TEMPLATES[agentId];
      if (existing) {
        map.set(agentId, { ...existing, room, action: 'walking' });
        // 歩行アニメ後にworkingに
        setTimeout(() => {
          setActivities(p => {
            const n = new Map(p);
            const a = n.get(agentId);
            if (a && a.action === 'walking') {
              n.set(agentId, {
                ...a, action: 'working',
                speech: templates ? pick(templates.phase) : undefined,
                speechExpiry: templates ? Date.now() + 3000 : undefined,
              });
            }
            return n;
          });
        }, 800);
      } else {
        map.set(agentId, {
          agentId, room, action: 'idle',
        });
      }
    }
  }

  // 集計
  const activeRooms = new Set<RoomId>();
  let liveCount = 0;
  for (const act of activities.values()) {
    if (act.action !== 'idle' && act.action !== 'resting') {
      activeRooms.add(act.room);
      liveCount++;
    }
  }
  const energyLevel = Math.min(100, Math.round((liveCount / 13) * 100 * 1.2));

  return {
    activities,
    activeRooms,
    liveAgentCount: liveCount,
    phase,
    progress,
    energyLevel,
  };
}
