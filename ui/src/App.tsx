import { useState } from 'react';
import type { Agent } from './types';
import { THEMES, BADGES } from './data/constants';
import { useCompanyStore, calcTeamPower, getTeamRank } from './hooks/useCompanyStore';
import { OrgTree } from './components/OrgTree';
import { ScoreBoard } from './components/ScoreBoard';
import { AgentCard } from './components/AgentCard';
import { AgentDetailModal } from './components/AgentDetailModal';
import { NotificationBar } from './components/NotificationBar';
import { CompanyManager } from './components/CompanyManager';
import { RadarChart } from './components/RadarChart';
import { MtgScreen } from './components/MtgScreen';
import { EscalationScreen } from './components/EscalationScreen';

declare const __BUILD_TIME__: string;

type View = 'dashboard' | 'mtg' | 'escalation' | 'company';

function getBadgeIcon(badgeId: string): string {
  return BADGES.find(b => b.id === badgeId)?.icon ?? '🏅';
}

const NAV_ITEMS: { id: View; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'ダッシュボード', icon: '🏠' },
  { id: 'mtg', label: 'MTG', icon: '📋' },
  { id: 'escalation', label: 'エスカレーション', icon: '📨' },
  { id: 'company', label: '会社管理', icon: '⚙️' },
];

export default function App() {
  const store = useCompanyStore();
  const { company, notifications } = store;
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [view, setView] = useState<View>('dashboard');

  const theme = THEMES[company.theme];
  const teamPower = Math.round(calcTeamPower(company.agents));
  const teamRank = getTeamRank(teamPower);
  const avgLevel = (company.agents.reduce((s, a) => s + a.level, 0) / company.agents.length).toFixed(1);
  const totalBadges = company.agents.reduce((s, a) => s + a.badges.length + a.secretBadges.length, 0);

  const rankStars = teamRank === 'S' ? '★★★★★' : teamRank === 'A' ? '★★★★☆' : teamRank === 'B' ? '★★★☆☆' : teamRank === 'C' ? '★★☆☆☆' : '★☆☆☆☆';

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent);
  };

  return (
    <div className="min-h-screen" style={{ background: theme.bg, color: theme.text }}>
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: theme.border }}>
        <div className="flex items-center gap-4">
          <span className="text-3xl">{company.icon}</span>
          <div>
            <h1 className="text-xl font-bold">{company.name}</h1>
            <span className="text-sm" style={{ color: theme.muted }}>{company.industry}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs" style={{ color: theme.muted }}>TEAM POWER</div>
            <div className="text-2xl font-bold text-indigo-400">{teamPower.toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-yellow-400">{rankStars}</div>
            <div className="text-lg font-bold">{teamRank} RANK</div>
          </div>
          <div className="text-right text-sm" style={{ color: theme.muted }}>
            <div>Lv平均: {avgLevel}</div>
            <div>バッジ: {totalBadges}</div>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="flex gap-1 px-6 py-2 border-b" style={{ borderColor: theme.border }}>
        {NAV_ITEMS.map(item => (
          <button key={item.id}
            onClick={() => setView(item.id)}
            className={`px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors flex items-center gap-1.5
              ${view === item.id ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-white/5'}`}>
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      {view === 'dashboard' && (
        <div className="flex gap-4 p-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <aside className="w-64 shrink-0">
            <ScoreBoard agents={company.agents} onSelect={handleAgentSelect} />
          </aside>

          <main className="flex-1 rounded-xl p-4" style={{ background: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
            <OrgTree
              agents={company.agents}
              onSelect={handleAgentSelect}
              selectedId={selectedAgent?.id}
            />
          </main>

          <aside className="w-72 shrink-0 space-y-4">
            {selectedAgent ? (
              <div className="rounded-xl p-4 space-y-4" style={{ background: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
                <div className="text-center">
                  <span className="text-5xl">{selectedAgent.icon}</span>
                  <h3 className="text-lg font-bold mt-2">{selectedAgent.name}</h3>
                  <p className="text-sm" style={{ color: theme.muted }}>{selectedAgent.title}</p>
                  <p className="text-indigo-400 text-sm font-bold">Lv.{selectedAgent.level} {selectedAgent.rank}</p>
                </div>
                <div className="flex justify-center">
                  <RadarChart stats={selectedAgent.stats} size={180} />
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {selectedAgent.badges.length > 0 ? (
                    selectedAgent.badges.slice(0, 6).map(b => (
                      <span key={b} className="text-lg">{getBadgeIcon(b)}</span>
                    ))
                  ) : (
                    <span className="text-xs" style={{ color: theme.muted }}>バッジなし</span>
                  )}
                </div>
                <button
                  onClick={() => setShowDetail(true)}
                  className="w-full py-2 bg-indigo-500/20 text-indigo-400 rounded-lg text-sm hover:bg-indigo-500/30 cursor-pointer">
                  詳細を見る
                </button>
              </div>
            ) : (
              <div className="rounded-xl p-8 text-center" style={{ background: theme.surface, borderColor: theme.border, borderWidth: 1 }}>
                <p className="text-sm" style={{ color: theme.muted }}>エージェントを選択してください</p>
              </div>
            )}
          </aside>
        </div>
      )}

      {view === 'mtg' && (
        <div className="p-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <MtgScreen agents={company.agents} theme={theme} />
        </div>
      )}

      {view === 'escalation' && (
        <div className="p-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <EscalationScreen agents={company.agents} theme={theme} />
        </div>
      )}

      {view === 'company' && (
        <div className="p-6">
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

      {/* Bottom bar */}
      {view === 'dashboard' && (
        <div className="border-t" style={{ borderColor: theme.border }}>
          <div className="px-6 py-3">
            <div className="flex gap-3 justify-center">
              {company.agents.map(a => (
                <AgentCard key={a.id} agent={a} onClick={() => handleAgentSelect(a)} compact />
              ))}
            </div>
          </div>
          <NotificationBar notifications={notifications} />
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-2 text-xs" style={{ color: theme.muted }}>
        Build: {typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev'}
      </footer>

      {/* Modal */}
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
    </div>
  );
}
