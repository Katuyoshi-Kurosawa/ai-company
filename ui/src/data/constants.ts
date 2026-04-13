import type { LevelInfo, BadgeInfo } from '../types';

export const LEVELS: LevelInfo[] = [
  { level: 1, rank: '一般社員', title: 'ルーキー', requiredExp: 0, frame: 'silver', effect: 'none' },
  { level: 2, rank: '主任', title: 'プロフェッショナル', requiredExp: 100, frame: 'silver', effect: 'none' },
  { level: 3, rank: '係長', title: 'エキスパート', requiredExp: 300, frame: 'gold', effect: 'glow-weak' },
  { level: 4, rank: '課長', title: 'シニアエキスパート', requiredExp: 700, frame: 'platinum', effect: 'particle' },
  { level: 5, rank: '部長', title: 'マスター', requiredExp: 1500, frame: 'diamond', effect: 'glow-strong' },
  { level: 6, rank: '役員', title: 'レジェンド', requiredExp: 3000, frame: 'rainbow', effect: 'rainbow' },
];

export const BADGES: BadgeInfo[] = [
  // 行動系
  { id: 'first', name: 'はじめの一歩', icon: '🌱', description: '初タスク完了', rarity: 1, category: 'action' },
  { id: 'approve10', name: '承認マシーン', icon: '✅', description: '承認10回獲得', rarity: 2, category: 'action' },
  { id: 'alert5', name: 'アラートハンター', icon: '🚨', description: 'アラート5回解決', rarity: 3, category: 'action' },
  { id: 'discuss10', name: '議論キング', icon: '👑', description: 'MTG10回発言', rarity: 2, category: 'action' },
  { id: 'rebuttal', name: '反骨精神', icon: '💪', description: '反論で承認を勝ち取った', rarity: 4, category: 'action' },
  { id: 'escalate3', name: 'エスカレーター', icon: '↗️', description: 'エスカレーション3回', rarity: 2, category: 'action' },
  { id: 'streak5', name: '連続承認', icon: '🔥', description: '5回連続承認', rarity: 3, category: 'action' },
  { id: 'tireless', name: '不眠不休', icon: '🌙', description: '1日10タスク完了', rarity: 4, category: 'action' },
  // 成果系
  { id: 'architect5', name: 'アーキテクト', icon: '🏛️', description: '設計書5つ作成', rarity: 2, category: 'achievement' },
  { id: 'code1000', name: 'コードマスター', icon: '⌨️', description: '1000行以上生成', rarity: 3, category: 'achievement' },
  { id: 'bug20', name: 'バグバスター', icon: '🐛', description: 'バグ20件検出', rarity: 3, category: 'achievement' },
  { id: 'design5', name: 'デザインアワード', icon: '🎖️', description: 'UIモックアップ5つ作成', rarity: 2, category: 'achievement' },
  { id: 'doc10', name: 'ドキュメンタリアン', icon: '📚', description: '報告書10件作成', rarity: 2, category: 'achievement' },
  { id: 'project3', name: 'プロジェクトクリア', icon: '🏆', description: '3プロジェクト完了', rarity: 4, category: 'achievement' },
  { id: 'fullstack', name: 'フルスタック', icon: '🌐', description: '全種類タスク完了', rarity: 4, category: 'achievement' },
  // シークレット
  { id: 'genius', name: '異端の天才', icon: '🔮', description: '???', rarity: 5, category: 'secret' },
  { id: 'diamond_team', name: 'ダイヤモンドチーム', icon: '💎', description: '???', rarity: 5, category: 'secret' },
  { id: 'perfect', name: 'パーフェクトラン', icon: '🌈', description: '???', rarity: 5, category: 'secret' },
  { id: 'unanimous', name: '満場一致', icon: '🎭', description: '???', rarity: 5, category: 'secret' },
  { id: 'ghost', name: 'ゴーストクリア', icon: '👻', description: '???', rarity: 5, category: 'secret' },
];

export const STAT_LABELS: Record<string, string> = {
  design: '設計力',
  dev: '実装力',
  analysis: '分析力',
  creative: '創造力',
  comm: 'コミュ力',
};

export const STAT_KEYS = ['design', 'dev', 'analysis', 'creative', 'comm'] as const;

export const EMOJI_OPTIONS = [
  '👔', '📋', '🏗️', '💻', '🔍', '🎨', '📝', '🚀', '⚡', '🔧',
  '📊', '🎯', '🛡️', '🌐', '📡', '🧪', '🤖', '💡', '📈', '🎮',
  '🔬', '📦', '🗂️', '⚙️',
];

export const THEMES = {
  dark: { label: 'ダーク', icon: '🌙', bg: '#121218', surface: '#1a1a24', border: '#2a2a3a', text: '#e0e0e0', muted: '#888' },
  light: { label: 'ライト', icon: '☀️', bg: '#ffffff', surface: '#f8f9fa', border: '#e5e7eb', text: '#1f2937', muted: '#6b7280' },
  natural: { label: 'ナチュラル', icon: '🍃', bg: '#f0ede8', surface: '#faf8f5', border: '#d4cfc7', text: '#3d3832', muted: '#8a8279' },
  corporate: { label: 'コーポレート', icon: '🏢', bg: '#f0f4f8', surface: '#ffffff', border: '#d1d9e6', text: '#1e3a5f', muted: '#607d8b' },
} as const;
