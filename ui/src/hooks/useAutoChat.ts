import { useState, useEffect, useRef, useCallback } from 'react';

// ══════════════════════════════════════════
// Auto Chat System - RPG風吹き出し自動会話
// ══════════════════════════════════════════
// エージェント同士が自動で会話し、オフィスに活気を与える

export interface ChatMessage {
  id: string;
  fromId: string;
  toId?: string;
  text: string;
  timestamp: number;
}

// 独り言テンプレート
const SOLO_LINES: Record<string, string[]> = {
  ceo: ['今期の戦略を見直すか...', 'イノベーションが大事だ', '社員の成長が楽しみだ', '新しい市場が見えてきたな'],
  secretary: ['スケジュールを確認中...', '次の予定は...', '社長のコーヒーを淹れなきゃ', '報告書をまとめます'],
  'chief-secretary': ['進捗をチェック...', '各部門の状況は良好ね', 'タスクを最適化しましょう', 'ボトルネックはないかしら'],
  marketing: ['SNSのトレンドをチェック！', '新しいキャンペーン考えなきゃ', 'データが面白いことに！', 'インフルエンサーに連絡する！'],
  hr: ['研修プランを考え中...', 'みんなの成長が嬉しい', '新しいスキル研修を企画しよう', '人材育成は投資よ'],
  cs: ['お客様の声を分析中...', 'ユーザー満足度をもっと上げたい', 'サポート品質を向上させるわ', 'フィードバックは宝物ね'],
  rd: ['新しいアルゴリズム思いついた！', '実験結果が出た！', '特許になるかも...', 'プロトタイプ作るぞ！'],
  planner: ['要件を整理しよう', 'ユーザーストーリーを書き直す', '市場調査の結果を反映', 'プロダクトの方向性が見えた'],
  architect: ['アーキテクチャを再設計中...', 'スケーラビリティを考慮して', 'このパターンが最適だな', '技術的負債を解消したい'],
  developer: ['コード書くの楽しい！', 'ビルド通った！', 'リファクタリング完了', 'テスト全部パスした！'],
  'qa-reviewer': ['品質チェック中...', 'このバグは見逃せない', 'テストカバレッジを上げよう', 'セキュリティレビュー完了'],
  'ui-designer': ['この配色どうかな...', 'ユーザビリティを改善中', 'モックアップできた！', 'デザインシステムを更新'],
  'doc-writer': ['ドキュメント書き中...', '文章を磨いてる', '図表を追加しよう', 'わかりやすさ第一'],
};

// 会話テンプレート（相手あり）
const CHAT_TEMPLATES: { from: string; to: string; text: string }[] = [
  { from: 'ceo', to: 'secretary', text: '今日のスケジュールは？' },
  { from: 'secretary', to: 'ceo', text: '10時から会議があります' },
  { from: 'marketing', to: 'rd', text: '新機能の反応すごくいいよ！' },
  { from: 'rd', to: 'marketing', text: 'おお、データ見せて！' },
  { from: 'developer', to: 'architect', text: '設計レビューお願いします' },
  { from: 'architect', to: 'developer', text: '了解、見てみるよ' },
  { from: 'qa-reviewer', to: 'developer', text: 'テスト結果出たよ' },
  { from: 'developer', to: 'qa-reviewer', text: 'サンキュー！修正する' },
  { from: 'planner', to: 'ui-designer', text: '画面遷移図できた？' },
  { from: 'ui-designer', to: 'planner', text: 'もう少しで完成！' },
  { from: 'hr', to: 'chief-secretary', text: '研修の日程、確認できた？' },
  { from: 'chief-secretary', to: 'hr', text: '来週の火曜日で調整中' },
  { from: 'cs', to: 'planner', text: 'お客様からの要望があるの' },
  { from: 'planner', to: 'cs', text: '内容聞かせて' },
  { from: 'doc-writer', to: 'architect', text: '技術仕様書のレビューお願い' },
  { from: 'architect', to: 'doc-writer', text: 'はいはい、送って' },
  { from: 'marketing', to: 'cs', text: 'ユーザーの声聞かせて！' },
  { from: 'cs', to: 'marketing', text: '最近の傾向をまとめたわ' },
];

const INTERVAL_MIN = 5000;  // 5秒
const INTERVAL_MAX = 12000; // 12秒
const MESSAGE_DURATION = 4000; // 4秒表示

export function useAutoChat(isActive: boolean) {
  const [messages, setMessages] = useState<Map<string, ChatMessage>>(new Map());
  const timerRef = useRef<number | null>(null);
  const cleanupTimers = useRef<Set<number>>(new Set());
  const msgIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupTimers.current.forEach(t => clearTimeout(t));
      cleanupTimers.current.clear();
    };
  }, []);

  const showMessage = useCallback((fromId: string, text: string, toId?: string) => {
    if (!mountedRef.current) return;
    const id = `chat-${msgIdRef.current++}`;
    const msg: ChatMessage = { id, fromId, toId, text, timestamp: Date.now() };

    setMessages(prev => {
      const next = new Map(prev);
      next.set(fromId, msg);
      return next;
    });

    // Auto-remove after duration (with cleanup tracking)
    const timerId = window.setTimeout(() => {
      cleanupTimers.current.delete(timerId);
      if (!mountedRef.current) return;
      setMessages(prev => {
        const next = new Map(prev);
        if (next.get(fromId)?.id === id) next.delete(fromId);
        return next;
      });
    }, MESSAGE_DURATION);
    cleanupTimers.current.add(timerId);
  }, []);

  const triggerChat = useCallback(() => {
    if (!isActive) return;

    // 50% chance solo line, 50% chance conversation
    if (Math.random() < 0.5) {
      // Solo line
      const agentIds = Object.keys(SOLO_LINES);
      const agentId = agentIds[Math.floor(Math.random() * agentIds.length)];
      const lines = SOLO_LINES[agentId];
      const text = lines[Math.floor(Math.random() * lines.length)];
      showMessage(agentId, text);
    } else {
      // Conversation
      const template = CHAT_TEMPLATES[Math.floor(Math.random() * CHAT_TEMPLATES.length)];
      showMessage(template.from, template.text, template.to);

      // Reply after a short delay
      const replyTemplates = CHAT_TEMPLATES.filter(t => t.from === template.to && t.to === template.from);
      if (replyTemplates.length > 0) {
        const reply = replyTemplates[Math.floor(Math.random() * replyTemplates.length)];
        const replyTimer = window.setTimeout(() => {
          cleanupTimers.current.delete(replyTimer);
          showMessage(reply.from, reply.text, reply.to);
        }, 1500 + Math.random() * 1000);
        cleanupTimers.current.add(replyTimer);
      }
    }
  }, [isActive, showMessage]);

  // Auto trigger loop
  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      setMessages(new Map());
      return;
    }

    const scheduleNext = () => {
      const interval = INTERVAL_MIN + Math.random() * (INTERVAL_MAX - INTERVAL_MIN);
      timerRef.current = window.setTimeout(() => {
        triggerChat();
        scheduleNext();
      }, interval);
    };

    // Start with a short delay
    timerRef.current = window.setTimeout(() => {
      triggerChat();
      scheduleNext();
    }, 2000);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isActive, triggerChat]);

  return { messages, triggerChat };
}
