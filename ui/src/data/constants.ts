import type { LevelInfo, BadgeInfo, RoomId } from '../types';

export const LEVELS: LevelInfo[] = [
  { level: 1, rank: '一般社員', title: 'ルーキー', requiredExp: 0, frame: 'silver', effect: 'none' },
  { level: 2, rank: '主任', title: 'プロフェッショナル', requiredExp: 100, frame: 'silver', effect: 'none' },
  { level: 3, rank: '係長', title: 'エキスパート', requiredExp: 300, frame: 'gold', effect: 'glow-weak' },
  { level: 4, rank: '課長', title: 'シニアエキスパート', requiredExp: 700, frame: 'platinum', effect: 'particle' },
  { level: 5, rank: '部長', title: 'マスター', requiredExp: 1500, frame: 'diamond', effect: 'glow-strong' },
  { level: 6, rank: '役員', title: 'レジェンド', requiredExp: 3000, frame: 'rainbow', effect: 'rainbow' },
];

export const BADGES: BadgeInfo[] = [
  { id: 'first', name: 'はじめの一歩', icon: '🌱', description: '初タスク完了', rarity: 1, category: 'action' },
  { id: 'approve10', name: '承認マシーン', icon: '✅', description: '承認10回獲得', rarity: 2, category: 'action' },
  { id: 'alert5', name: 'アラートハンター', icon: '🚨', description: 'アラート5回解決', rarity: 3, category: 'action' },
  { id: 'discuss10', name: '議論キング', icon: '👑', description: 'MTG10回発言', rarity: 2, category: 'action' },
  { id: 'rebuttal', name: '反骨精神', icon: '💪', description: '反論で承認を勝ち取った', rarity: 4, category: 'action' },
  { id: 'escalate3', name: 'エスカレーター', icon: '↗️', description: 'エスカレーション3回', rarity: 2, category: 'action' },
  { id: 'streak5', name: '連続承認', icon: '🔥', description: '5回連続承認', rarity: 3, category: 'action' },
  { id: 'tireless', name: '不眠不休', icon: '🌙', description: '1日10タスク完了', rarity: 4, category: 'action' },
  { id: 'architect5', name: 'アーキテクト', icon: '🏛️', description: '設計書5つ作成', rarity: 2, category: 'achievement' },
  { id: 'code1000', name: 'コードマスター', icon: '⌨️', description: '1000行以上生成', rarity: 3, category: 'achievement' },
  { id: 'bug20', name: 'バグバスター', icon: '🐛', description: 'バグ20件検出', rarity: 3, category: 'achievement' },
  { id: 'design5', name: 'デザインアワード', icon: '🎖️', description: 'UIモックアップ5つ作成', rarity: 2, category: 'achievement' },
  { id: 'doc10', name: 'ドキュメンタリアン', icon: '📚', description: '報告書10件作成', rarity: 2, category: 'achievement' },
  { id: 'project3', name: 'プロジェクトクリア', icon: '🏆', description: '3プロジェクト完了', rarity: 4, category: 'achievement' },
  { id: 'fullstack', name: 'フルスタック', icon: '🌐', description: '全種類タスク完了', rarity: 4, category: 'achievement' },
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
  '👔', '💼', '🕵️', '🤝', '📋', '🏗️', '💻', '🔍', '🎨', '📝',
  '🚀', '⚡', '🔧', '📊', '🎯', '🛡️', '🌐', '📡', '🧪', '🤖',
  '💡', '📈', '🎮', '⚙️',
];

export const ROOMS: { id: RoomId; label: string; icon: string; description: string }[] = [
  { id: 'president', label: '社長室', icon: '🏛️', description: 'CEO専用の執務室' },
  { id: 'executive', label: '役員室', icon: '🪑', description: '秘書・役員の執務スペース' },
  { id: 'meeting-a', label: '会議室A', icon: '📊', description: '大会議室（全体MTG用）' },
  { id: 'meeting-b', label: '会議室B', icon: '💬', description: '小会議室（少人数MTG用）' },
  { id: 'break', label: '休憩室', icon: '☕', description: '休憩・雑談スペース' },
  { id: 'open-office', label: 'オフィス', icon: '🖥️', description: '各部長のデスクがあるオープンスペース' },
];

export const HAIR_STYLES = [
  { id: 'short-back', label: 'ショート（後ろ流し）' },
  { id: 'short-side', label: 'ショート（サイド分け）' },
  { id: 'short-natural', label: 'ショート（ナチュラル）' },
  { id: 'messy', label: '無造作' },
  { id: 'long-straight', label: 'ロング（ストレート）' },
  { id: 'long-wave', label: 'ロング（ウェーブ）' },
  { id: 'medium-wave', label: 'ミディアム（ウェーブ）' },
  { id: 'bob', label: 'ボブ' },
  { id: 'ponytail', label: 'ポニーテール' },
  { id: 'updo', label: 'アップスタイル' },
];

export const HAIR_COLORS = [
  { id: '#1a1a1a', label: '黒' },
  { id: '#2d1810', label: 'ダークブラウン' },
  { id: '#5a3020', label: 'ブラウン' },
  { id: '#8a5030', label: 'ライトブラウン' },
  { id: '#c0c0c0', label: 'グレー' },
];

export const SUIT_COLORS = [
  { id: '#1a1a2e', label: 'ネイビー' },
  { id: '#2a2a3a', label: 'チャコール' },
  { id: '#1a1a1a', label: 'ブラック' },
  { id: '#3d2d3d', label: 'ダークパープル' },
  { id: '#2d3040', label: 'スレートブルー' },
  { id: '#f0f0f0', label: 'ホワイト' },
];

export const ACCESSORIES = [
  { id: 'none', label: 'なし' },
  { id: 'glasses', label: 'メガネ' },
  { id: 'earring', label: 'イヤリング' },
  { id: 'necklace', label: 'ネックレス' },
  { id: 'scarf', label: 'スカーフ' },
  { id: 'watch', label: '腕時計' },
  { id: 'tie-pin', label: 'タイピン' },
];

export const THEMES = {
  dark: { label: 'エグゼクティブ', icon: '🌙', bg: '#0f1117', surface: '#181b25', border: '#262a38', text: '#d8dce8', muted: '#6b7394' },
  light: { label: 'モダンオフィス', icon: '☀️', bg: '#f7f8fc', surface: '#ffffff', border: '#e2e5ef', text: '#1a1e2e', muted: '#6b7394' },
  natural: { label: 'ウォーム', icon: '🍃', bg: '#f5f2ed', surface: '#fffdf8', border: '#e0dbd2', text: '#2c2822', muted: '#8a8276' },
  corporate: { label: 'コーポレート', icon: '🏢', bg: '#eef2f9', surface: '#ffffff', border: '#d0d8ea', text: '#162040', muted: '#5a6880' },
} as const;
