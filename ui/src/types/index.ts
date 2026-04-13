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
