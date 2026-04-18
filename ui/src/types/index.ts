export interface AgentStats {
  design: number;
  dev: number;
  analysis: number;
  creative: number;
  comm: number;
}

export interface ConsultationSettings {
  target: 'direct' | 'specific';
  threshold: 'low' | 'medium' | 'high';
}

export type Gender = 'male' | 'female';

export interface AgentVisual {
  gender: Gender;
  hairStyle: string;
  hairColor: string;
  suitColor: string;
  accessory: string;
}

export type RoomId = 'president' | 'executive' | 'meeting-a' | 'meeting-b' | 'break' | 'open-office';

// 秘書固有設定
export interface SecretarySettings {
  monitorTarget: string;          // 監視対象（通常はCEO）
  reportFrequency: 'realtime' | 'hourly' | 'daily';
  proxyAuthority: boolean;        // ユーザー代理の指示出し権限
  adviceLevel: 'passive' | 'active' | 'aggressive';
}

// マーケティング部長固有設定
export interface MarketingSettings {
  autoGatherEnabled: boolean;     // 待機中の自動情報収集
  gatherTopics: string[];         // 収集対象トピック
  gatherInterval: number;         // 収集間隔（分）
  dbPath: string;                 // データベース保存先
  webSearchEnabled: boolean;
  rssFeeds: string[];
  networkingMode: boolean;        // 人脈開拓モード
  trendAnalysis: boolean;         // トレンド分析
}

// 秘書部長固有設定
export interface ChiefSecretarySettings {
  supportTargets: string[];        // サポート対象の幹部ID
  priorityMode: 'bottleneck' | 'round-robin' | 'urgency';  // 優先度決定方式
  speedBoostEnabled: boolean;      // タスク加速モード
  parallelAssistLimit: number;     // 同時サポート上限
  autoDetectBlockers: boolean;     // ボトルネック自動検出
  meetingPrepEnabled: boolean;     // 会議準備自動化
}

// カスタマーサクセス部長固有設定
export interface CsSettings {
  satisfactionTarget: number;      // 顧客満足度目標（%）
  responseTimeTarget: number;      // 応答時間目標（分）
  proactiveSupportEnabled: boolean; // プロアクティブサポート
  feedbackLoop: boolean;           // フィードバックループ自動化
  escalationRules: string;         // エスカレーションルール
  supportChannels: string[];       // サポートチャネル
}

// 研究開発部長固有設定
export interface RdSettings {
  ideaGenerationMode: 'continuous' | 'burst' | 'deep';  // アイデア生成モード
  moonShotEnabled: boolean;        // ムーンショット思考
  disruptiveThinking: boolean;     // 破壊的イノベーション思考
  prototypeSpeed: 'rapid' | 'standard' | 'thorough';  // プロトタイプ速度
  focusAreas: string[];            // 注力分野
  patentTracking: boolean;         // 特許・技術動向追跡
  dailyIdeaQuota: number;          // 日次アイデア目標数
}

// 人事部長固有設定
export interface HrSettings {
  trainingEnabled: boolean;       // 社員教育モード
  trainingFocus: string[];        // 教育重点分野
  scoutEnabled: boolean;          // 外部スカウトモード
  scoutCriteria: string;          // スカウト基準
  maxRecruits: number;            // 最大採用数
}

export interface Agent {
  id: string;
  icon: string;
  name: string;
  title: string;
  dept: string;
  parentId: string | null;
  personality: string;
  expertise: string;
  model: 'opus' | 'sonnet' | 'haiku';
  tools: string[];
  skills: string[];
  maxTurns: number;
  outputFile: string;
  active: boolean;
  stats: AgentStats;
  level: number;
  rank: string;
  exp: number;
  badges: string[];
  secretBadges: string[];
  consultationSettings: ConsultationSettings;
  visual: AgentVisual;
  room: RoomId;
  // 役職固有設定（該当する場合のみ）
  secretarySettings?: SecretarySettings;
  marketingSettings?: MarketingSettings;
  hrSettings?: HrSettings;
  rdSettings?: RdSettings;
  csSettings?: CsSettings;
  chiefSecretarySettings?: ChiefSecretarySettings;
}

export interface EscalationSettings {
  responseMode: 'auto' | 'wait' | 'urgency';
  escalationEnd: 'ceo' | 'important' | 'all';
  rebuttalAllow: 'none' | 'once' | 'unlimited';
  autoApproveLow: boolean;
  slackNotify: 'all' | 'alert' | 'off';
}

export interface MtgSettings {
  defaultRounds: 'short' | 'standard' | 'long' | 'auto';
  defaultConflict: 'majority' | 'consensus' | 'chair' | 'both';
  autoMinutes: boolean;
  autoActions: boolean;
  autoUpdate: boolean;
  slackNotify: boolean;
}

export interface CompanySettings {
  escalation: EscalationSettings;
  mtg: MtgSettings;
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  icon: string;
  theme: ThemeType;
  settings: CompanySettings;
  agents: Agent[];
}

export type ThemeType = 'dark' | 'light' | 'natural' | 'corporate';

export interface LevelInfo {
  level: number;
  rank: string;
  title: string;
  requiredExp: number;
  frame: string;
  effect: string;
}

export interface BadgeInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  rarity: number;
  category: 'action' | 'achievement' | 'secret';
}

export interface MtgMessage {
  agent: string;
  time: string;
  text: string;
  round: number;
}

export interface MtgLog {
  mtg_id: string;
  type: string;
  agenda: string;
  chair: string;
  participants: string[];
  rounds: number;
  messages: MtgMessage[];
  decisions: string[];
  actions: { action: string; assignee: string; deadline: string }[];
}

export interface Consultation {
  id: string;
  timestamp: string;
  type: 'judgment' | 'approval' | 'alert';
  urgency: 'low' | 'medium' | 'high';
  from: string;
  to: string;
  subject: string;
  status: string;
}

export interface Notification {
  id: string;
  type: 'levelup' | 'badge' | 'consultation' | 'mtg' | 'info';
  message: string;
  agentId?: string;
  timestamp: number;
}
