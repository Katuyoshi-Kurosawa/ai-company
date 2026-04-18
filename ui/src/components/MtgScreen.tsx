import { useState } from 'react';
import type { Agent } from '../types';
import { PixelCharacter } from './PixelCharacter';

interface MtgConfig {
  type: string;
  agenda: string;
  rounds: number;
  conflict: string;
  chair: string;
  participants: string[];
  autoMinutes: boolean;
  autoActions: boolean;
  slackNotify: boolean;
}

interface MtgMessage {
  agentId: string;
  time: string;
  text: string;
  round: number;
}

interface Props {
  agents: Agent[];
  theme: { bg: string; surface: string; border: string; text: string; muted: string };
}

const MTG_TYPES = [
  { id: 'kickoff', label: 'キックオフ' },
  { id: 'req-review', label: '要件レビュー' },
  { id: 'design-review', label: '設計レビュー' },
  { id: 'ui-review', label: 'UI/UXレビュー' },
  { id: 'code-review', label: 'コードレビュー' },
  { id: 'final-review', label: '最終レビュー' },
  { id: 'brainstorm', label: 'ブレスト' },
  { id: 'custom', label: 'カスタム' },
];

const CONFLICT_OPTIONS = [
  { id: 'chair', label: '議長判断' },
  { id: 'majority', label: '多数決' },
  { id: 'consensus', label: '全員合意' },
  { id: 'both', label: '両論併記' },
];

const ORDER_OPTIONS = [
  { id: 'chair-pick', label: '議長指名' },
  { id: 'round-robin', label: 'ラウンドロビン' },
  { id: 'free', label: '自由発言' },
];

const DEFAULT_PARTICIPANTS: Record<string, string[]> = {
  'kickoff': ['ceo', 'planner', 'architect', 'developer', 'qa-reviewer', 'ui-designer', 'doc-writer'],
  'req-review': ['ceo', 'planner', 'architect', 'ui-designer'],
  'design-review': ['architect', 'developer', 'ui-designer', 'qa-reviewer'],
  'ui-review': ['ui-designer', 'developer', 'planner'],
  'code-review': ['developer', 'qa-reviewer', 'architect'],
  'final-review': ['ceo', 'planner', 'architect', 'developer', 'qa-reviewer', 'ui-designer', 'doc-writer'],
  'brainstorm': ['ceo', 'planner', 'architect', 'developer', 'qa-reviewer', 'ui-designer', 'doc-writer'],
  'custom': ['ceo', 'planner', 'architect', 'developer', 'qa-reviewer', 'ui-designer', 'doc-writer'],
};

function autoSelectChair(_type: string, agenda: string): string {
  const lower = agenda.toLowerCase();
  if (/要件|機能|ユーザー/.test(lower)) return 'planner';
  if (/設計|db|api|アーキ/.test(lower)) return 'architect';
  if (/実装|コード|バグ|開発/.test(lower)) return 'developer';
  if (/テスト|品質|レビュー|qa/.test(lower)) return 'qa-reviewer';
  if (/ui|デザイン|画面|ux/.test(lower)) return 'ui-designer';
  if (/資料|報告|ドキュメント/.test(lower)) return 'doc-writer';
  return 'ceo';
}

// サンプルMTGデータ（デモ用）
function generateDemoMessages(agents: Agent[], config: MtgConfig): MtgMessage[] {
  const messages: MtgMessage[] = [];
  const hour = 10;
  let minute = 0;

  messages.push({
    agentId: config.chair,
    time: `${hour}:${String(minute).padStart(2, '0')}`,
    text: `${config.agenda}について議論を始めます。各自の見解をお聞かせください。`,
    round: 1,
  });

  for (let round = 1; round <= config.rounds; round++) {
    for (const pid of config.participants) {
      if (round === 1 && pid === config.chair) continue;
      minute += 1;
      const agent = agents.find(a => a.id === pid);
      if (!agent) continue;
      messages.push({
        agentId: pid,
        time: `${hour}:${String(minute).padStart(2, '0')}`,
        text: `[${agent.name}${agent.title}としての発言がここに表示されます — ラウンド${round}]`,
        round,
      });
    }
  }

  minute += 1;
  messages.push({
    agentId: config.chair,
    time: `${hour}:${String(minute).padStart(2, '0')}`,
    text: `議論をまとめます。本日の決定事項を確認しましょう。`,
    round: config.rounds,
  });

  return messages;
}

export function MtgScreen({ agents, theme }: Props) {
  const [phase, setPhase] = useState<'config' | 'running' | 'done'>('config');
  const [config, setConfig] = useState<MtgConfig>({
    type: 'kickoff',
    agenda: '',
    rounds: 3,
    conflict: 'chair',
    chair: 'ceo',
    participants: DEFAULT_PARTICIPANTS['kickoff'],
    autoMinutes: true,
    autoActions: true,
    slackNotify: true,
  });
  const [messages, setMessages] = useState<MtgMessage[]>([]);
  const [speakOrder, setSpeakOrder] = useState('round-robin');

  const handleTypeChange = (type: string) => {
    const participants = DEFAULT_PARTICIPANTS[type] ?? DEFAULT_PARTICIPANTS['custom'];
    const chair = autoSelectChair(type, config.agenda);
    setConfig({ ...config, type, participants, chair });
  };

  const toggleParticipant = (id: string) => {
    setConfig(prev => ({
      ...prev,
      participants: prev.participants.includes(id)
        ? prev.participants.filter(p => p !== id)
        : [...prev.participants, id],
    }));
  };

  const handleStart = () => {
    if (!config.agenda.trim()) return;
    const chair = autoSelectChair(config.type, config.agenda);
    const updatedConfig = { ...config, chair };
    setConfig(updatedConfig);
    setMessages(generateDemoMessages(agents, updatedConfig));
    setPhase('running');
  };

  const getAgent = (id: string) => agents.find(a => a.id === id);

  return (
    <div className="flex gap-4 h-full">
      {/* Left: Config Panel */}
      <div className="w-80 shrink-0 rounded-xl p-4 space-y-4 overflow-y-auto"
        style={{ background: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
        <h3 className="font-bold text-lg">MTG設定</h3>

        {/* Type */}
        <div>
          <label className="text-xs font-bold opacity-40 block mb-1">MTG種別</label>
          <div className="grid grid-cols-2 gap-1">
            {MTG_TYPES.map(t => (
              <button key={t.id}
                onClick={() => handleTypeChange(t.id)}
                className={`px-2 py-1.5 rounded text-xs cursor-pointer transition-colors
                  ${config.type === t.id ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-400/50' : 'bg-white/5 hover:bg-white/10'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Agenda */}
        <div>
          <label className="text-xs font-bold opacity-40 block mb-1">議題</label>
          <textarea
            value={config.agenda}
            onChange={e => setConfig({ ...config, agenda: e.target.value })}
            placeholder="議題を入力..."
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm h-20 resize-none"
          />
        </div>

        {/* Participants */}
        <div>
          <label className="text-xs font-bold opacity-40 block mb-1">参加者</label>
          <div className="space-y-1">
            {agents.map(a => (
              <label key={a.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.participants.includes(a.id)}
                  onChange={() => toggleParticipant(a.id)}
                  className="rounded"
                />
                <span className="text-lg">{a.icon}</span>
                <span className="text-sm">{a.name} {a.title}</span>
                {config.chair === a.id && (
                  <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded ml-auto">議長</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Chair */}
        <div>
          <label className="text-xs font-bold opacity-40 block mb-1">議長</label>
          <select
            value={config.chair}
            onChange={e => setConfig({ ...config, chair: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm">
            {agents.filter(a => config.participants.includes(a.id)).map(a => (
              <option key={a.id} value={a.id}>{a.icon} {a.name} {a.title}</option>
            ))}
          </select>
        </div>

        {/* Rounds */}
        <div>
          <label className="text-xs font-bold opacity-40 block mb-1">ラウンド数: {config.rounds}</label>
          <input type="range" min={2} max={10} value={config.rounds}
            onChange={e => setConfig({ ...config, rounds: Number(e.target.value) })}
            className="w-full" />
        </div>

        {/* Conflict */}
        <div>
          <label className="text-xs font-bold opacity-40 block mb-1">対立時の解決</label>
          <div className="grid grid-cols-2 gap-1">
            {CONFLICT_OPTIONS.map(o => (
              <button key={o.id}
                onClick={() => setConfig({ ...config, conflict: o.id })}
                className={`px-2 py-1.5 rounded text-xs cursor-pointer
                  ${config.conflict === o.id ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-400/50' : 'bg-white/5 hover:bg-white/10'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Speaking Order */}
        <div>
          <label className="text-xs font-bold opacity-40 block mb-1">発言順序</label>
          <div className="grid grid-cols-3 gap-1">
            {ORDER_OPTIONS.map(o => (
              <button key={o.id}
                onClick={() => setSpeakOrder(o.id)}
                className={`px-2 py-1.5 rounded text-xs cursor-pointer
                  ${speakOrder === o.id ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-400/50' : 'bg-white/5 hover:bg-white/10'}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Output options */}
        <div className="space-y-2">
          <label className="text-xs font-bold opacity-40 block">アウトプット</label>
          {[
            { key: 'autoMinutes', label: '議事録生成' },
            { key: 'autoActions', label: 'アクションアイテム' },
            { key: 'slackNotify', label: 'Slack通知' },
          ].map(opt => (
            <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config[opt.key as keyof MtgConfig] as boolean}
                onChange={e => setConfig({ ...config, [opt.key]: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={!config.agenda.trim()}
          className="w-full py-3 bg-indigo-500 text-white rounded-lg font-bold hover:bg-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors">
          MTG開始
        </button>
      </div>

      {/* Right: Chat area */}
      <div className="flex-1 rounded-xl flex flex-col"
        style={{ background: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
        {phase === 'config' ? (
          <div className="flex-1 flex items-center justify-center" style={{ color: theme.muted }}>
            <div className="text-center space-y-2">
              <span className="text-5xl block">📋</span>
              <p className="text-lg">MTG設定を入力して開始してください</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
              <div>
                <h3 className="font-bold">
                  {MTG_TYPES.find(t => t.id === config.type)?.label} — {config.agenda}
                </h3>
                <p className="text-xs" style={{ color: theme.muted }}>
                  議長: {getAgent(config.chair)?.name} |
                  参加者: {config.participants.length}名 |
                  ラウンド: {config.rounds}
                </p>
              </div>
              <button
                onClick={() => { setPhase('config'); setMessages([]); }}
                className="px-3 py-1.5 bg-white/10 rounded text-xs hover:bg-white/20 cursor-pointer">
                新規MTG
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => {
                const agent = getAgent(msg.agentId);
                if (!agent) return null;
                const prevRound = i > 0 ? messages[i - 1].round : 0;
                const showRoundDivider = msg.round !== prevRound;

                return (
                  <div key={i}>
                    {showRoundDivider && (
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px" style={{ background: theme.border }} />
                        <span className="text-xs font-bold" style={{ color: theme.muted }}>
                          ラウンド {msg.round}
                        </span>
                        <div className="flex-1 h-px" style={{ background: theme.border }} />
                      </div>
                    )}
                    <div className="flex gap-3 animate-[slideIn_0.3s_ease-out]">
                      <div className="shrink-0 mt-0.5">
                        <PixelCharacter visual={agent.visual} size="sm" active={agent.active} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-sm">{agent.name}{agent.title}</span>
                          <span className="text-xs" style={{ color: theme.muted }}>{msg.time}</span>
                        </div>
                        <p className="text-sm mt-1 leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Decisions summary */}
            {phase === 'running' && messages.length > 0 && (
              <div className="px-4 py-3 border-t space-y-2" style={{ borderColor: theme.border }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: theme.muted }}>決定事項</span>
                  <div className="flex-1 h-px" style={{ background: theme.border }} />
                </div>
                <p className="text-sm" style={{ color: theme.muted }}>
                  実際のMTG実行時に、エージェントの議論から決定事項が自動抽出されます。
                </p>
                <p className="text-xs" style={{ color: theme.muted }}>
                  CLIで実行: <code className="bg-white/10 px-1.5 py-0.5 rounded">./ai-mtg.sh {config.type} "{config.agenda}" {config.rounds} {config.conflict}</code>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
