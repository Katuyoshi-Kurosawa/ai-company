// エージェントID → ロールカラー（Corporate Alive コンセプト）
export const ROLE_COLORS: Record<string, { primary: string; light: string; label: string }> = {
  ceo:             { primary: '#f59e0b', light: '#fef3c7', label: 'CEO' },
  secretary:       { primary: '#8b5cf6', light: '#ede9fe', label: '秘書' },
  'chief-secretary': { primary: '#6366f1', light: '#e0e7ff', label: '秘書部長' },
  marketing:       { primary: '#ec4899', light: '#fce7f3', label: 'マーケ' },
  hr:              { primary: '#10b981', light: '#d1fae5', label: '人事' },
  cs:              { primary: '#06b6d4', light: '#cffafe', label: 'CS' },
  rd:              { primary: '#a78bfa', light: '#ede9fe', label: 'R&D' },
  planner:         { primary: '#f97316', light: '#ffedd5', label: '企画' },
  architect:       { primary: '#64748b', light: '#f1f5f9', label: '設計' },
  developer:       { primary: '#3b82f6', light: '#dbeafe', label: '開発' },
  'qa-reviewer':   { primary: '#ef4444', light: '#fee2e2', label: 'QA' },
  'ui-designer':   { primary: '#f472b6', light: '#fce7f3', label: 'UI' },
  'doc-writer':    { primary: '#84cc16', light: '#ecfccb', label: 'ドキュ' },
} as const;

export function getRoleColor(agentId: string): { primary: string; light: string; label: string } {
  return ROLE_COLORS[agentId] ?? { primary: '#6b7280', light: '#f3f4f6', label: agentId };
}
