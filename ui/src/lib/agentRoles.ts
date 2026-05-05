export const AGENT_ROLES: Record<string, string> = {
  ceo: 'プロジェクト計画策定・意思決定',
  secretary: '最終報告書作成・取りまとめ',
  'chief-secretary': '秘書部管理・調整',
  marketing: '市場調査・マーケティング分析',
  hr: '人事・組織観点の分析',
  cs: '顧客満足度・サービス観点の分析',
  rd: '研究開発・革新的アイデア提案',
  planner: '要件定義・仕様書・企画立案',
  architect: 'アーキテクチャ設計・技術選定',
  developer: '開発計画・実装方針策定',
  'qa-reviewer': 'テスト計画・品質基準策定',
  'ui-designer': 'UI/UXデザイン・画面設計',
  'doc-writer': '資料・ドキュメント作成',
};

export function getAgentRole(id: string): string {
  return AGENT_ROLES[id] ?? '担当業務を実行';
}
