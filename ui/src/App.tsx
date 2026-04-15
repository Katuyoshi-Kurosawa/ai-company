import { useState, useEffect, useRef } from 'react';
import type { Agent } from './types';
import { THEMES, BADGES } from './data/constants';
import { useCompanyStore, calcTeamPower, getTeamRank } from './hooks/useCompanyStore';
import { useRelay } from './hooks/useRelay';
import { useExecutionHistory } from './hooks/useExecutionHistory';
import { OfficeFloor } from './components/OfficeFloor';
import { useOfficeActivity } from './hooks/useOfficeActivity';
import { OrgTree } from './components/OrgTree';
import { ScoreBoard } from './components/ScoreBoard';
import { AgentCard } from './components/AgentCard';
import { AgentDetailModal } from './components/AgentDetailModal';
import { NotificationBar } from './components/NotificationBar';
import { CompanyManager } from './components/CompanyManager';
import { RadarChart } from './components/RadarChart';
import { MtgScreen } from './components/MtgScreen';
import { EscalationScreen } from './components/EscalationScreen';
import { CommandCenter } from './components/CommandCenter';
import { ExecutionPanel, ExecutionIndicator } from './components/ExecutionPanel';
import { QuickInputBar, CommandPalette } from './components/QuickCommand';

declare const __BUILD_TIME__: string;

type View = 'office' | 'org' | 'mtg' | 'escalation' | 'command' | 'settings';

function getBadgeIcon(badgeId: string): string {
  return BADGES.find(b => b.id === badgeId)?.icon ?? '🏅';
}

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
  const prevStatus = useRef(relay.status);
  const isRunning = relay.status === 'running' || relay.status === 'connecting';
  const officeActivity = useOfficeActivity(relay.lines, isRunning || relay.status === 'done');

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
      currentRecordId.current = null;
    }
    prevStatus.current = relay.status;
  }, [relay.status, relay.lines, relay.error, execHistory]);

  const theme = THEMES[company.theme];
  const teamPower = Math.round(calcTeamPower(company.agents));
  const teamRank = getTeamRank(teamPower);
  const avgLevel = (company.agents.reduce((s, a) => s + a.level, 0) / company.agents.length).toFixed(1);
  const totalBadges = company.agents.reduce((s, a) => s + a.badges.length + a.secretBadges.length, 0);
  const activeCount = company.agents.filter(a => a.active).length;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.bg, color: theme.text }}>
      {/* Header */}
      <header className="border-b px-6 py-3 flex items-center justify-between"
        style={{ borderColor: theme.border, background: theme.surface }}>
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
      <nav className="flex gap-1 px-6 py-1.5 border-b" style={{ borderColor: theme.border, background: theme.surface }}>
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
      <div className="flex-1 flex">
        <main className={`flex-1 overflow-auto ${executing ? 'pb-32' : ''}`}>
          {view === 'office' && (
            <div className="flex gap-5 p-5" style={{ minHeight: 'calc(100vh - 120px)' }}>
              <aside className="w-60 shrink-0">
                <ScoreBoard agents={company.agents} onSelect={setSelectedAgent} />
              </aside>
              <div className="flex-1">
                <OfficeFloor
                  agents={company.agents}
                  onSelect={setSelectedAgent}
                  selectedId={selectedAgent?.id}
                  isLive={executing}
                  activities={officeActivity.activities}
                  activeRooms={officeActivity.activeRooms}
                  energyLevel={officeActivity.energyLevel}
                  livePhase={officeActivity.phase}
                  liveProgress={officeActivity.progress}
                  liveAgentCount={officeActivity.liveAgentCount}
                />
              </div>
              <aside className="w-72 shrink-0">
                {selectedAgent ? (
                  <div className="rounded-xl p-5 space-y-4 sticky top-5"
                    style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-4xl mb-3"
                        style={{ background: `${theme.muted}10` }}>
                        {selectedAgent.icon}
                      </div>
                      <h3 className="text-lg font-bold">{selectedAgent.name}</h3>
                      <p className="text-sm" style={{ color: theme.muted }}>{selectedAgent.title}</p>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: '#3b82f615', color: '#3b82f6' }}>
                          Lv.{selectedAgent.level}
                        </span>
                        <span className="text-xs" style={{ color: theme.muted }}>{selectedAgent.rank}</span>
                        <span className="text-xs">{selectedAgent.visual.gender === 'female' ? '♀' : '♂'}</span>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <RadarChart stats={selectedAgent.stats} size={170} />
                    </div>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {selectedAgent.badges.length > 0 ? (
                        selectedAgent.badges.slice(0, 6).map(b => (
                          <span key={b} className="text-base">{getBadgeIcon(b)}</span>
                        ))
                      ) : (
                        <span className="text-xs" style={{ color: theme.muted }}>バッジなし</span>
                      )}
                    </div>
                    <button
                      onClick={() => setShowDetail(true)}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all"
                      style={{ background: '#3b82f615', color: '#3b82f6', border: '1px solid #3b82f630' }}>
                      詳細を見る
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl p-10 text-center"
                    style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                    <div className="text-4xl mb-3 opacity-20">👤</div>
                    <p className="text-sm" style={{ color: theme.muted }}>社員を選択してください</p>
                  </div>
                )}
              </aside>
            </div>
          )}

          {view === 'org' && (
            <div className="flex gap-5 p-5">
              <aside className="w-60 shrink-0">
                <ScoreBoard agents={company.agents} onSelect={setSelectedAgent} />
              </aside>
              <div className="flex-1 rounded-xl p-4" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                <OrgTree agents={company.agents} onSelect={setSelectedAgent} selectedId={selectedAgent?.id} />
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
      <footer className={`border-t ${executing ? 'hidden' : ''}`} style={{ borderColor: theme.border, background: theme.surface }}>
        <div className="px-6 py-2 flex items-center justify-between">
          <div className="flex gap-2">
            {company.agents.map(a => (
              <AgentCard key={a.id} agent={a} onClick={() => setSelectedAgent(a)} compact />
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
          onClose={() => { setExecuting(false); relay.reset(); }}
        />
      )}
    </div>
  );
}
