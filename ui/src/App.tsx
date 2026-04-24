import { useState, useEffect, useRef, useMemo } from 'react';
import type { Agent } from './types';
import { THEMES } from './data/constants';
import { useCompanyStore, calcTeamPower, getTeamRank } from './hooks/useCompanyStore';
import { useRelay } from './hooks/useRelay';
import { useExecutionHistory, parseLogLines } from './hooks/useExecutionHistory';
import { recordExecution, updateExecutionResult, recordSkillExperience } from './lib/routeRecommender';
import type { RouteType } from './lib/routeRecommender';
import { OfficeView } from './components/OfficeView';
import { useOfficeActivity } from './hooks/useOfficeActivity';
import { useMissionProgress } from './hooks/useMissionProgress';
import { MissionTimeline } from './components/MissionTimeline';
import { OrgTree } from './components/OrgTree';
import { ScoreBoard } from './components/ScoreBoard';
import { AgentCard } from './components/AgentCard';
import { AgentDetailModal } from './components/AgentDetailModal';
import { NotificationBar } from './components/NotificationBar';
import { CompanyManager } from './components/CompanyManager';
import { MtgScreen } from './components/MtgScreen';
import { EscalationScreen } from './components/EscalationScreen';
import { CommandCenter } from './components/CommandCenter';
import { ExecutionPanel, ExecutionIndicator } from './components/ExecutionPanel';
import { QuickInputBar, CommandPalette } from './components/QuickCommand';

declare const __BUILD_TIME__: string;

type View = 'office' | 'org' | 'mtg' | 'escalation' | 'command' | 'settings';

const NAV_ITEMS: { id: View; label: string; icon: string }[] = [
  { id: 'office', label: 'オフィス', icon: '🏢' },
  { id: 'org', label: '組織図', icon: '📊' },
  { id: 'command', label: '指示室', icon: '🚀' },
  { id: 'mtg', label: '会議室', icon: '💬' },
  { id: 'escalation', label: '報告', icon: '📨' },
  { id: 'settings', label: '管理', icon: '⚙️' },
];

export default function App() {
  const store = useCompanyStore();
  const { company, notifications } = store;
  const relay = useRelay();
  const execHistory = useExecutionHistory();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [view, setView] = useState<View>('office');
  const [executing, setExecuting] = useState(false);
  const [executionLabel, setExecutionLabel] = useState('');
  const currentRecordId = useRef<string | null>(null);
  const currentRouteStatId = useRef<string | null>(null);
  const currentExecutionArgsRef = useRef<Record<string, string | number | string[]>>({});
  const prevStatus = useRef(relay.status);
  const isRunning = relay.status === 'running' || relay.status === 'connecting';
  const isLive = isRunning; // オフィスLIVE表示は実際の実行状態に連動（executingはパネル表示用）
  const officeActivity = useOfficeActivity(relay.lines, isLive);
  const outputDir = useMemo(() => parseLogLines(relay.lines).outputDir, [relay.lines]);
  // 現在のアクティビティ（ヘッダーインジケーター用）
  const currentActivity = useMemo(() => {
    if (!isRunning || relay.lines.length === 0) return undefined;
    // 最新のエージェント開始/フェーズ行を逆順で探す
    for (let i = relay.lines.length - 1; i >= Math.max(0, relay.lines.length - 30); i--) {
      const txt = relay.lines[i].text;
      if (txt.includes('🚀') && txt.includes('開始')) {
        const match = txt.match(/🚀\s*(.+?)\s*開始/);
        if (match) return `${match[1].trim()} が作業中`;
      }
      if (txt.includes('━━━')) {
        return txt.replace(/[━\[\]\d:]/g, '').trim();
      }
    }
    return undefined;
  }, [isRunning, relay.lines.length]);

  // ミッション進捗解析
  const participatingAgentIds = useMemo(() => {
    const agents = currentExecutionArgsRef.current.agents;
    if (agents && typeof agents === 'string') return agents.split(',').filter(Boolean);
    if (Array.isArray(agents)) return agents.filter(Boolean) as string[];
    return undefined;
  }, [executing, relay.lines.length]);
  const mission = useMissionProgress(relay.lines, isLive, participatingAgentIds, undefined);

  // relay再接続検出: ページリロード後に実行中ジョブがあれば復元
  // relay.statusとrelay.jobIdを直接依存に入れて確実に反応させる
  useEffect(() => {
    const nowRunning = relay.status === 'running';
    if (!executing && nowRunning && relay.jobId) {
      console.log(`[App] 再接続検出: jobId=${relay.jobId}, status=${relay.status}`);
      setExecuting(true);
      const typeLabel = relay.activeType === 'mtg' ? 'MTG' : '全工程実行';
      const label = relay.activeLabel ? `${typeLabel}: ${relay.activeLabel}` : '実行中（再接続）';
      setExecutionLabel(label);
      // 再接続時にも履歴記録を開始（完了時に保存される）
      const recType = (relay.activeType === 'mtg' || relay.activeType === 'escalation') ? relay.activeType : 'company';
      currentRecordId.current = execHistory.startRecord(recType, label, {});
      setView('office');
    }
  }, [relay.status, relay.jobId]);

  // 実行開始時にオフィスビューに自動切替
  useEffect(() => {
    if (executing && isRunning && view !== 'office') {
      setView('office');
    }
  }, [executing, isRunning]);

  // 実行完了時に履歴を保存
  useEffect(() => {
    const wasRunning = prevStatus.current === 'running' || prevStatus.current === 'connecting';
    const nowFinished = relay.status === 'done' || relay.status === 'error';
    if (wasRunning && nowFinished && currentRecordId.current) {
      execHistory.finishRecord(
        currentRecordId.current,
        relay.status as 'done' | 'error',
        relay.lines,
        relay.error ?? undefined,
      );
      // ルート実績を更新
      if (currentRouteStatId.current) {
        updateExecutionResult(
          currentRouteStatId.current,
          relay.elapsed,
          relay.status as 'done' | 'error',
        );
        currentRouteStatId.current = null;
      }
      // 育成ルートのスキル経験記録 + EXP付与
      const execArgs = currentExecutionArgsRef.current;
      if (String(execArgs.routeType) === 'training' && relay.status === 'done') {
        const agentsList = String(execArgs.agents || '').split(',').filter(Boolean);
        for (const agentId of agentsList) {
          recordSkillExperience({
            agentId,
            skillId: 'general', // 汎用スキル
            routeType: 'training',
            result: 'success',
            createdAt: new Date().toISOString(),
          });
        }
        // EXP付与（育成ルート完了ボーナス）
        for (const agentId of agentsList) {
          store.addExp(agentId, 20);
        }
      }
      currentExecutionArgsRef.current = {};
      currentRecordId.current = null;
    }
    prevStatus.current = relay.status;
  }, [relay.status, relay.lines, relay.error, execHistory]);

  // Quest log items from execution phases
  // モード検出→該当モードのフェーズのみ表示（部分一致の誤判定を防止）
  const questItems = useMemo(() => {
    if (!executing) return undefined;
    // 実行完了後はクエストログをクリア
    if (relay.status === 'done' || relay.status === 'error') return undefined;
    const joined = relay.lines.map(l => l.text).join('\n');
    const quests: { label: string; status: 'active' | 'done' | 'error' }[] = [];

    // モード検出
    const isMedium = joined.includes('中量PHASE') || joined.includes('中量モード');
    const isLightweight = joined.includes('軽量モード') && !isMedium;

    let phases: { key: string; label: string }[];
    if (isLightweight) {
      phases = [
        { key: '軽量モード', label: '秘書が応答中' },
        { key: '軽量モード完了', label: '完了' },
      ];
    } else if (isMedium) {
      phases = [
        { key: '中量PHASE 1', label: '計画＋調査' },
        { key: '中量PHASE 2', label: '企画＋成果物作成' },
        { key: '全工程終了', label: '完了' },
      ];
    } else {
      phases = [
        { key: 'PHASE 1', label: '調査・計画' },
        { key: 'PHASE 2', label: '要件＋R&D＋設計＋レビュー' },
        { key: 'PHASE 3', label: '実装＋QA＋評価＋報告' },
        { key: 'QA＋最終報告', label: 'QA＋最終報告' },
        { key: '最終報告', label: '最終報告作成' },
        { key: '全工程終了', label: '完了' },
      ];
    }

    let lastFound = -1;
    for (let i = 0; i < phases.length; i++) {
      if (joined.includes(phases[i].key)) lastFound = i;
    }
    for (let i = 0; i < phases.length; i++) {
      if (i <= lastFound) quests.push({ label: phases[i].label, status: 'done' });
      else if (i === lastFound + 1) quests.push({ label: phases[i].label, status: 'active' });
    }
    if (relay.status === 'error') {
      const last = quests[quests.length - 1];
      if (last) last.status = 'error';
    }
    return quests.length > 0 ? quests : undefined;
  }, [executing, relay.lines, relay.status]);

  const theme = THEMES[company.theme];
  const teamPower = Math.round(calcTeamPower(company.agents));
  const teamRank = getTeamRank(teamPower);
  const avgLevel = (company.agents.reduce((s, a) => s + a.level, 0) / company.agents.length).toFixed(1);
  const totalBadges = company.agents.reduce((s, a) => s + a.badges.length + a.secretBadges.length, 0);
  const activeCount = company.agents.filter(a => a.active).length;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: theme.bg, color: theme.text }}>
      {/* Running indicator stripe */}
      {isRunning && (
        <div className="h-1 w-full shrink-0 overflow-hidden relative" style={{ background: 'rgba(99,102,241,0.15)' }}>
          <div className="absolute inset-0 animate-[runStripe_1.5s_linear_infinite]"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, #6366f1 30%, #a78bfa 50%, #6366f1 70%, transparent 100%)',
              backgroundSize: '200% 100%',
            }} />
          <style>{`@keyframes runStripe { 0% { transform: translateX(-100%) } 100% { transform: translateX(100%) } }`}</style>
        </div>
      )}
      {/* Header */}
      <header className="border-b px-6 py-2 flex items-center justify-between shrink-0 transition-shadow duration-500"
        style={{
          borderColor: isRunning ? 'rgba(99,102,241,0.4)' : theme.border,
          background: theme.surface,
          boxShadow: isRunning ? '0 2px 20px rgba(99,102,241,0.15)' : 'none',
        }}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{ background: `${theme.muted}15` }}>
            {company.icon}
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">{company.name}</h1>
            <div className="flex items-center gap-3 text-xs" style={{ color: theme.muted }}>
              <span>{company.industry}</span>
              <span>·</span>
              <span>{activeCount}名在籍</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick input bar */}
          <QuickInputBar
            connected={relay.connected}
            onExecute={(label, type, args) => {
              relay.execute(type, args);
              setExecutionLabel(label);
              setExecuting(true);
              currentRecordId.current = execHistory.startRecord(type, label, args);
            }}
            theme={theme}
          />

          {/* Execution indicator in header */}
          {executing && (
            <ExecutionIndicator
              status={relay.status}
              elapsed={relay.elapsed}
              onClick={() => setView('command')}
              activity={currentActivity}
            />
          )}

          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: theme.muted }}>Power</div>
              <div className="text-lg font-bold" style={{ color: '#3b82f6' }}>{teamPower.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: theme.muted }}>Rank</div>
              <div className="text-lg font-bold">{teamRank}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: theme.muted }}>Avg Lv</div>
              <div className="text-lg font-bold">{avgLevel}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: theme.muted }}>Badges</div>
              <div className="text-lg font-bold">{totalBadges}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="flex gap-1 px-6 py-1 border-b shrink-0" style={{ borderColor: theme.border, background: theme.surface }}>
        {NAV_ITEMS.map(item => (
          <button key={item.id}
            onClick={() => setView(item.id)}
            className={`px-4 py-2 rounded-md text-sm cursor-pointer transition-all flex items-center gap-1.5 font-medium
              ${view === item.id
                ? 'bg-blue-500/10 text-blue-400'
                : 'opacity-60 hover:opacity-100 hover:bg-white/[0.03]'
              }`}>
            <span className="text-base">{item.icon}</span>
            {item.label}
            {item.id === 'command' && (
              <span className={`w-2 h-2 rounded-full ${
                executing && relay.status === 'running' ? 'bg-indigo-400 animate-pulse'
                : relay.connected ? 'bg-green-400'
                : 'bg-red-400'
              }`} />
            )}
          </button>
        ))}
      </nav>

      {/* Main */}
      <div className="flex-1 flex min-h-0 min-w-0">
        <main className={`flex-1 min-w-0 overflow-auto ${executing ? 'pb-32' : ''}`}>
          {view === 'office' && (
            <div className="h-full">
              <OfficeView
                agents={company.agents}
                activities={officeActivity.activities}
                activeRooms={officeActivity.activeRooms}
                isRunning={isLive}
                executing={executing}
                questItems={questItems}
                missionTimeline={isLive && mission.phases.length > 0 ? (
                  <MissionTimeline mission={mission} agents={company.agents} elapsed={relay.elapsed} />
                ) : undefined}
                onUpdateAgent={(id, updates) => {
                  store.updateAgent(id, updates);
                }}
                onTriggerSpeech={officeActivity.triggerSpeech}
              />
            </div>
          )}

          {view === 'org' && (
            <div className="flex gap-5 p-5">
              <aside className="w-60 shrink-0">
                <ScoreBoard agents={company.agents} onSelect={setSelectedAgent} />
              </aside>
              <div className="flex-1 rounded-xl p-4" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                <OrgTree agents={company.agents} onSelect={setSelectedAgent} selectedId={selectedAgent?.id}
                  mission={isLive ? mission : undefined} elapsed={isLive ? relay.elapsed : undefined} />
              </div>
            </div>
          )}

          {view === 'mtg' && (
            <div className="p-5" style={{ minHeight: 'calc(100vh - 120px)' }}>
              <MtgScreen agents={company.agents} theme={theme} />
            </div>
          )}

          {view === 'command' && (
            <div className="p-5" style={{ minHeight: 'calc(100vh - 120px)' }}>
              <CommandCenter
                agents={company.agents}
                theme={theme}
                relay={relay}
                onExecute={(label, type, args) => {
                  setExecutionLabel(label);
                  setExecuting(true);
                  currentRecordId.current = execHistory.startRecord(type, label, args);
                  currentExecutionArgsRef.current = args;
                  // ルート実績記録開始
                  if (args.routeType) {
                    const statId = `stat-${Date.now()}`;
                    recordExecution({
                      id: statId,
                      instruction: String(args.theme || ''),
                      routeType: String(args.routeType) as RouteType,
                      agents: String(args.agents || '').split(','),
                      depth: String(args.depth || 'medium'),
                      model: String(args.model || 'sonnet'),
                      maxTurns: Number(args.maxTurns) || 15,
                      estimatedSec: 0,
                      actualSec: null,
                      status: 'done',
                      createdAt: new Date().toISOString(),
                    });
                    currentRouteStatId.current = statId;
                  }
                }}
                history={execHistory.records}
                onDeleteHistory={execHistory.deleteRecord}
                onClearHistory={execHistory.clearAll}
              />
            </div>
          )}

          {view === 'escalation' && (
            <div className="p-5" style={{ minHeight: 'calc(100vh - 120px)' }}>
              <EscalationScreen agents={company.agents} theme={theme} />
            </div>
          )}

          {view === 'settings' && (
            <div className="p-5">
              <CompanyManager
                companies={store.companies}
                activeCompanyId={store.activeCompanyId}
                onSelect={store.setActiveCompanyId}
                onAdd={store.addCompany}
                onDelete={store.deleteCompany}
                onThemeChange={store.setTheme}
                currentTheme={company.theme}
              />
            </div>
          )}
        </main>
      </div>

      {/* Bottom bar */}
      <footer className={`border-t ${executing || view === 'office' ? 'hidden' : ''}`} style={{ borderColor: theme.border, background: theme.surface }}>
        <div className="px-6 py-2 flex items-center justify-between">
          <div className="flex gap-2">
            {company.agents.map(a => (
              <AgentCard key={a.id} agent={a} onClick={() => { setSelectedAgent(a); setShowDetail(true); }} compact />
            ))}
          </div>
          <span className="text-[10px]" style={{ color: theme.muted }}>
            Build: {typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev'}
          </span>
        </div>
        <NotificationBar notifications={notifications} />
      </footer>

      {/* Detail Modal */}
      {showDetail && selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          allAgents={company.agents}
          onClose={() => setShowDetail(false)}
          onUpdate={(id, updates) => {
            store.updateAgent(id, updates);
            setSelectedAgent(prev => prev ? { ...prev, ...updates } : null);
          }}
        />
      )}

      {/* Command Palette (Cmd+K) */}
      <CommandPalette
        connected={relay.connected}
        onExecute={(label, type, args) => {
          relay.execute(type, args);
          setExecutionLabel(label);
          setExecuting(true);
          currentRecordId.current = execHistory.startRecord(type, label, args);
        }}
        history={execHistory.records}
        theme={theme}
      />

      {/* Execution Panel (bottom bar) */}
      {executing && (
        <ExecutionPanel
          agents={company.agents}
          status={relay.status}
          lines={relay.lines}
          elapsed={relay.elapsed}
          error={relay.error}
          commandLabel={executionLabel}
          outputDir={outputDir}
          onClose={() => { setExecuting(false); relay.reset(); }}
          onAbort={() => relay.abort()}
          stalled={relay.stalled}
        />
      )}
    </div>
  );
}
