# Office Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3D isometric office view with a modern 2D floor map + right side panel layout.

**Architecture:** New `OfficeView` component replaces `OfficeFloor` in `App.tsx`. It composes `FloorMap` (CSS grid of `RoomSection` cards containing `AgentSlot` units) + `AgentSidePanel` (360px fixed right panel with AgentDetailModal tabs inline). PhaseBar and QuestLog are retained as HUD overlays during execution.

**Tech Stack:** React + TypeScript + Tailwind CSS (existing stack, no new deps)

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `ui/src/components/AgentSlot.tsx` | Single avatar unit: PixelCharacter + role + level + status badge + XP gauge |
| Create | `ui/src/components/RoomSection.tsx` | Room card: name label + occupant count badge + grid of AgentSlots |
| Create | `ui/src/components/FloorMap.tsx` | CSS grid layout of 6 RoomSections, full-height |
| Create | `ui/src/components/AgentSidePanel.tsx` | Right 360px panel with 5 tabs migrated from AgentDetailModal |
| Create | `ui/src/components/OfficeView.tsx` | Layout orchestrator: FloorMap + AgentSidePanel + PhaseBar + QuestLog |
| Modify | `ui/src/App.tsx` | Replace `<OfficeFloor>` with `<OfficeView>`, remove OfficeFloor import |

---

### Task 1: AgentSlot Component

**Files:**
- Create: `ui/src/components/AgentSlot.tsx`

This is the atomic unit — a single avatar with metadata. No external dependencies beyond existing components.

- [ ] **Step 1: Create AgentSlot component**

```tsx
// ui/src/components/AgentSlot.tsx
import type { Agent } from '../types';
import type { AgentActivity } from '../hooks/useOfficeActivity';
import { LEVELS } from '../data/constants';
import { PixelCharacter } from './PixelCharacter';

interface Props {
  agent: Agent;
  activity?: AgentActivity;
  isRunning: boolean;
  selected: boolean;
  onClick: () => void;
}

type StatusType = 'working' | 'meeting' | 'idle' | 'offline';

function getStatus(agent: Agent, activity: AgentActivity | undefined, isRunning: boolean): StatusType {
  if (!isRunning) return 'offline';
  if (activity?.action === 'working' || activity?.action === 'reviewing' || activity?.action === 'celebrating') return 'working';
  if (activity?.action === 'meeting') return 'meeting';
  if (agent.room === 'meeting-a' || agent.room === 'meeting-b') {
    if (activity?.action === 'walking') return 'meeting';
  }
  return 'idle';
}

const STATUS_CONFIG: Record<StatusType, { label: string; color: string; dot: string }> = {
  working: { label: '作業中', color: 'text-green-400', dot: 'bg-green-400' },
  meeting: { label: '会議中', color: 'text-blue-400', dot: 'bg-blue-400' },
  idle:    { label: '待機', color: 'text-amber-400', dot: 'bg-amber-400' },
  offline: { label: 'オフライン', color: 'text-gray-500', dot: 'bg-gray-500' },
};

export function AgentSlot({ agent, activity, isRunning, selected, onClick }: Props) {
  const status = getStatus(agent, activity, isRunning);
  const cfg = STATUS_CONFIG[status];
  const levelInfo = LEVELS.find(l => l.level === agent.level) ?? LEVELS[0];
  const nextLevel = LEVELS.find(l => l.requiredExp > agent.exp);
  const expProgress = nextLevel
    ? Math.round(((agent.exp - levelInfo.requiredExp) / (nextLevel.requiredExp - levelInfo.requiredExp)) * 100)
    : 100;

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 cursor-pointer
        hover:scale-105 hover:bg-white/[0.06]
        ${selected ? 'ring-2 ring-indigo-400 bg-white/[0.06]' : 'bg-transparent'}`}
      style={{ width: 100 }}
    >
      {/* Avatar */}
      <div className="relative">
        <PixelCharacter visual={agent.visual} size="lg" active={status !== 'offline'} />
        {/* Status dot */}
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#181b25] ${cfg.dot}`} />
      </div>

      {/* Role */}
      <span className="text-[11px] mt-1.5 text-white/40 truncate w-full text-center">{agent.title}</span>

      {/* Level badge */}
      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold mt-0.5"
        style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
        Lv.{agent.level}
      </span>

      {/* Status text */}
      <span className={`text-[9px] mt-0.5 ${cfg.color}`}>{cfg.label}</span>

      {/* XP gauge */}
      <div className="w-full h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${expProgress}%`, background: 'linear-gradient(to right, #6366f1, #a78bfa)' }} />
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd /Users/k.kurosawa/projects/company/ui && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to AgentSlot.tsx

- [ ] **Step 3: Commit**

```bash
cd /Users/k.kurosawa/projects/company/ui
git add src/components/AgentSlot.tsx
git commit -m "feat: add AgentSlot component for 2D office floor"
```

---

### Task 2: RoomSection Component

**Files:**
- Create: `ui/src/components/RoomSection.tsx`

Room card that contains a grid of AgentSlots.

- [ ] **Step 1: Create RoomSection component**

```tsx
// ui/src/components/RoomSection.tsx
import type { Agent, RoomId } from '../types';
import type { AgentActivity } from '../hooks/useOfficeActivity';
import { ROOMS } from '../data/constants';
import { AgentSlot } from './AgentSlot';

interface Props {
  roomId: RoomId;
  agents: Agent[];
  activities: Map<string, AgentActivity>;
  isRunning: boolean;
  selectedAgentId?: string;
  isActiveRoom: boolean;
  onAgentClick: (agent: Agent) => void;
  className?: string;
}

export function RoomSection({ roomId, agents, activities, isRunning, selectedAgentId, isActiveRoom, onAgentClick, className }: Props) {
  const roomInfo = ROOMS.find(r => r.id === roomId);
  if (!roomInfo) return null;

  return (
    <div className={`rounded-xl border transition-colors duration-300
      ${isActiveRoom ? 'border-indigo-500/30 bg-white/[0.04]' : 'border-white/10 bg-white/[0.02]'}
      ${className ?? ''}`}>
      {/* Room header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-sm">{roomInfo.icon}</span>
          <span className="text-sm font-medium text-white/70">{roomInfo.label}</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40">
          {agents.length}
        </span>
      </div>

      {/* Agents grid */}
      <div className="flex flex-wrap gap-1 p-3 justify-center">
        {agents.length > 0 ? (
          agents.map(agent => (
            <AgentSlot
              key={agent.id}
              agent={agent}
              activity={activities.get(agent.id)}
              isRunning={isRunning}
              selected={agent.id === selectedAgentId}
              onClick={() => onAgentClick(agent)}
            />
          ))
        ) : (
          <span className="text-xs text-white/15 py-4">空室</span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd /Users/k.kurosawa/projects/company/ui && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to RoomSection.tsx

- [ ] **Step 3: Commit**

```bash
cd /Users/k.kurosawa/projects/company/ui
git add src/components/RoomSection.tsx
git commit -m "feat: add RoomSection component for office floor rooms"
```

---

### Task 3: FloorMap Component

**Files:**
- Create: `ui/src/components/FloorMap.tsx`

CSS grid layout of 6 rooms. Uses `grid-template-columns: repeat(3, 1fr)` with col-span for room sizes.

- [ ] **Step 1: Create FloorMap component**

```tsx
// ui/src/components/FloorMap.tsx
import { useMemo } from 'react';
import type { Agent, RoomId } from '../types';
import type { AgentActivity } from '../hooks/useOfficeActivity';
import { RoomSection } from './RoomSection';

interface Props {
  agents: Agent[];
  activities: Map<string, AgentActivity>;
  activeRooms: Set<RoomId>;
  isRunning: boolean;
  selectedAgentId?: string;
  onAgentClick: (agent: Agent) => void;
}

// Room layout config: roomId, colSpan, row position
const ROOM_LAYOUT: { id: RoomId; colSpan: number }[] = [
  { id: 'president', colSpan: 1 },
  { id: 'executive', colSpan: 2 },
  { id: 'meeting-a', colSpan: 1 },
  { id: 'meeting-b', colSpan: 1 },
  // 1 col gap in row2 is handled by a spacer
  { id: 'open-office', colSpan: 3 },
  { id: 'break', colSpan: 3 },
];

export function FloorMap({ agents, activities, activeRooms, isRunning, selectedAgentId, onAgentClick }: Props) {
  // Group agents by their current room (use activity room if running, else agent.room)
  const agentsByRoom = useMemo(() => {
    const map = new Map<RoomId, Agent[]>();
    for (const room of ROOM_LAYOUT) {
      map.set(room.id, []);
    }
    for (const agent of agents) {
      const activity = activities.get(agent.id);
      const room = (isRunning && activity?.room) ? activity.room : agent.room;
      const list = map.get(room);
      if (list) list.push(agent);
      else map.set(room, [agent]);
    }
    return map;
  }, [agents, activities, isRunning]);

  return (
    <div className="grid grid-cols-3 gap-3 p-4 h-full content-start auto-rows-min">
      {ROOM_LAYOUT.map(room => (
        <RoomSection
          key={room.id}
          roomId={room.id}
          agents={agentsByRoom.get(room.id) ?? []}
          activities={activities}
          isRunning={isRunning}
          selectedAgentId={selectedAgentId}
          isActiveRoom={activeRooms.has(room.id)}
          onAgentClick={onAgentClick}
          className={room.colSpan === 2 ? 'col-span-2' : room.colSpan === 3 ? 'col-span-3' : ''}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd /Users/k.kurosawa/projects/company/ui && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to FloorMap.tsx

- [ ] **Step 3: Commit**

```bash
cd /Users/k.kurosawa/projects/company/ui
git add src/components/FloorMap.tsx
git commit -m "feat: add FloorMap component with CSS grid room layout"
```

---

### Task 4: AgentSidePanel Component

**Files:**
- Create: `ui/src/components/AgentSidePanel.tsx`

Right panel (360px) that displays 5 tabs migrated from `AgentDetailModal.tsx`. Reuses the same tab content but rendered inline instead of in a modal.

- [ ] **Step 1: Create AgentSidePanel component**

This is the largest new component. It replicates the 5 tabs from AgentDetailModal (status, visual, settings, badges, compatibility) plus the role tab (conditional). The header shows avatar + name + role + level + XP bar.

```tsx
// ui/src/components/AgentSidePanel.tsx
import { useState, useEffect } from 'react';
import type { Agent } from '../types';
import { LEVELS, BADGES, STAT_LABELS, STAT_KEYS, EMOJI_OPTIONS, ROOMS, HAIR_STYLES, HAIR_COLORS, SUIT_COLORS, ACCESSORIES, SKILLS } from '../data/constants';
import { RadarChart } from './RadarChart';
import { calcCompatibility } from '../hooks/useCompanyStore';
import { PixelCharacter } from './PixelCharacter';
import { AvatarSetupWizard } from './AvatarSetupWizard';

interface Props {
  agent: Agent;
  allAgents: Agent[];
  onUpdate: (id: string, updates: Partial<Agent>) => void;
}

type Tab = 'status' | 'visual' | 'settings' | 'role' | 'badges' | 'compatibility';

export function AgentSidePanel({ agent, allAgents, onUpdate }: Props) {
  const hasRoleSettings = !!(agent.secretarySettings || agent.marketingSettings || agent.hrSettings || agent.rdSettings || agent.csSettings || agent.chiefSecretarySettings);
  const [tab, setTab] = useState<Tab>('status');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(agent);
  const [showWizard, setShowWizard] = useState(false);

  // Sync form when agent changes (e.g. user clicks a different agent)
  useEffect(() => {
    setForm(agent);
    setEditing(false);
  }, [agent.id]);

  const levelInfo = LEVELS.find(l => l.level === agent.level) ?? LEVELS[0];
  const nextLevel = LEVELS.find(l => l.requiredExp > agent.exp);
  const expProgress = nextLevel
    ? Math.round(((agent.exp - levelInfo.requiredExp) / (nextLevel.requiredExp - levelInfo.requiredExp)) * 100)
    : 100;
  const allBadges = BADGES.filter(b => agent.badges.includes(b.id) || agent.secretBadges.includes(b.id));

  const handleSave = () => { onUpdate(agent.id, form); setEditing(false); };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'status', label: 'ステータス' },
    { id: 'visual', label: 'ビジュアル' },
    { id: 'settings', label: '基本設定' },
    ...(hasRoleSettings ? [{ id: 'role' as Tab, label: '役職設定' }] : []),
    { id: 'badges', label: 'バッジ' },
    { id: 'compatibility', label: '相性' },
  ];

  const S = { accent: '#3b82f6', muted: '#6b7394', border: '#262a38', surface: '#181b25', surfaceLight: '#1e2230' };

  return (
    <div className="w-[360px] shrink-0 h-full border-l border-white/10 bg-[#181b25] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[#262a38]">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${S.accent}10` }}>
          <PixelCharacter visual={agent.visual} size="md" active={agent.active} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold truncate">{agent.name}</h2>
            <span className="text-xs opacity-50 shrink-0">{agent.title}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: `${S.accent}15`, color: S.accent }}>Lv.{agent.level}</span>
            <span className="text-[10px]" style={{ color: S.muted }}>{levelInfo.rank}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${expProgress}%`, background: `linear-gradient(to right, ${S.accent}, #60a5fa)` }} />
            </div>
            <span className="text-[10px] shrink-0" style={{ color: S.muted }}>{agent.exp}/{nextLevel?.requiredExp ?? '∞'}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#262a38] px-1 overflow-x-auto shrink-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2.5 text-xs font-medium transition cursor-pointer whitespace-nowrap
              ${tab === t.id ? 'text-blue-400 border-b-2 border-blue-400' : 'opacity-40 hover:opacity-70'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content — scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* STATUS TAB */}
        {tab === 'status' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <RadarChart stats={agent.stats} size={180} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {STAT_KEYS.map(k => (
                <div key={k} className="flex justify-between px-3 py-1.5 bg-white/[0.03] rounded-lg">
                  <span style={{ color: S.muted }}>{STAT_LABELS[k]}</span>
                  <span className="font-bold">{agent.stats[k]}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3 mt-2">
              {[
                ['性格・口調', agent.personality],
                ['専門知識', agent.expertise],
                ['部署', agent.dept],
                ['配置', ROOMS.find(r => r.id === agent.room)?.label ?? agent.room],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <h4 className="text-xs font-semibold mb-0.5" style={{ color: S.muted }}>{label}</h4>
                  <p className="text-sm">{value}</p>
                </div>
              ))}
              <div>
                <h4 className="text-xs font-semibold mb-1" style={{ color: S.muted }}>ツール権限</h4>
                <div className="flex flex-wrap gap-1">
                  {agent.tools.map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded bg-white/5">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VISUAL TAB */}
        {tab === 'visual' && (
          <div className="space-y-4">
            <button onClick={() => setShowWizard(true)}
              className="w-full py-2.5 rounded-xl font-semibold cursor-pointer text-sm transition border border-indigo-500/30 hover:border-indigo-400/50"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))' }}>
              🎤 インタビュー形式でプロフィールを設定
            </button>
            {agent.skills?.length > 0 && (
              <div>
                <label className="text-xs font-semibold block mb-2" style={{ color: S.muted }}>スキル</label>
                <div className="flex flex-wrap gap-1.5">
                  {agent.skills.map(id => {
                    const sk = SKILLS.find(s => s.id === id);
                    return sk ? (
                      <span key={id} className="text-xs px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {sk.icon} {sk.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-2" style={{ color: S.muted }}>性別</label>
                <div className="flex gap-2">
                  {(['male', 'female'] as const).map(g => (
                    <button key={g}
                      onClick={() => { const u = { ...form, visual: { ...form.visual, gender: g } }; setForm(u); onUpdate(agent.id, { visual: u.visual }); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs cursor-pointer transition
                        ${form.visual.gender === g ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-400/30' : 'bg-white/[0.03] hover:bg-white/[0.06]'}`}>
                      {g === 'male' ? '♂ 男性' : '♀ 女性'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-2" style={{ color: S.muted }}>配置部屋</label>
                <select value={form.room}
                  onChange={e => { const u = { ...form, room: e.target.value as Agent['room'] }; setForm(u); onUpdate(agent.id, { room: u.room }); }}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5 text-sm">
                  {ROOMS.map(r => <option key={r.id} value={r.id}>{r.icon} {r.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-2" style={{ color: S.muted }}>髪型</label>
              <div className="grid grid-cols-2 gap-1.5">
                {HAIR_STYLES.map(h => (
                  <button key={h.id}
                    onClick={() => { const u = { ...form, visual: { ...form.visual, hairStyle: h.id } }; setForm(u); onUpdate(agent.id, { visual: u.visual }); }}
                    className={`px-2 py-1.5 rounded text-xs cursor-pointer transition
                      ${form.visual.hairStyle === h.id ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-400/30' : 'bg-white/[0.03] hover:bg-white/[0.06]'}`}>
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-2" style={{ color: S.muted }}>髪色</label>
              <div className="flex gap-2 flex-wrap">
                {HAIR_COLORS.map(c => (
                  <button key={c.id}
                    onClick={() => { const u = { ...form, visual: { ...form.visual, hairColor: c.id } }; setForm(u); onUpdate(agent.id, { visual: u.visual }); }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer transition
                      ${form.visual.hairColor === c.id ? 'ring-1 ring-blue-400/30' : ''}`}
                    style={{ background: `${c.id}20` }}>
                    <span className="w-3 h-3 rounded-full" style={{ background: c.id }} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-2" style={{ color: S.muted }}>スーツ色</label>
              <div className="flex gap-2 flex-wrap">
                {SUIT_COLORS.map(c => (
                  <button key={c.id}
                    onClick={() => { const u = { ...form, visual: { ...form.visual, suitColor: c.id } }; setForm(u); onUpdate(agent.id, { visual: u.visual }); }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer transition
                      ${form.visual.suitColor === c.id ? 'ring-1 ring-blue-400/30' : ''}`}
                    style={{ background: `${c.id}20` }}>
                    <span className="w-3 h-3 rounded-full border border-white/10" style={{ background: c.id }} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-2" style={{ color: S.muted }}>アクセサリー</label>
              <div className="flex gap-2 flex-wrap">
                {ACCESSORIES.map(a => (
                  <button key={a.id}
                    onClick={() => { const u = { ...form, visual: { ...form.visual, accessory: a.id } }; setForm(u); onUpdate(agent.id, { visual: u.visual }); }}
                    className={`px-2 py-1 rounded text-xs cursor-pointer transition
                      ${form.visual.accessory === a.id ? 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-400/30' : 'bg-white/[0.03] hover:bg-white/[0.06]'}`}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <div className="space-y-4">
            {!editing ? (
              <button onClick={() => setEditing(true)}
                className="px-4 py-2 rounded-lg font-semibold cursor-pointer text-sm"
                style={{ background: `${S.accent}15`, color: S.accent, border: `1px solid ${S.accent}30` }}>
                編集モード
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs" style={{ color: S.muted }}>アイコン</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {EMOJI_OPTIONS.map(e => (
                      <button key={e} onClick={() => setForm({ ...form, icon: e })}
                        className={`text-lg p-1 rounded cursor-pointer ${form.icon === e ? 'bg-blue-500/20 ring-1 ring-blue-400' : 'hover:bg-white/5'}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { key: 'name', label: '名前' },
                    { key: 'title', label: '役職' },
                    { key: 'dept', label: '部署' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-xs" style={{ color: S.muted }}>{f.label}</label>
                      <input value={(form as unknown as Record<string, string>)[f.key]}
                        onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5 text-sm" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-xs" style={{ color: S.muted }}>性格・口調</label>
                  <textarea value={form.personality} onChange={e => setForm({ ...form, personality: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5 text-sm h-20" />
                </div>
                <div>
                  <label className="text-xs" style={{ color: S.muted }}>専門知識</label>
                  <textarea value={form.expertise} onChange={e => setForm({ ...form, expertise: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5 text-sm h-20" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs" style={{ color: S.muted }}>モデル</label>
                    <select value={form.model} onChange={e => setForm({ ...form, model: e.target.value as Agent['model'] })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5 text-sm">
                      <option value="opus">opus</option><option value="sonnet">sonnet</option><option value="haiku">haiku</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs" style={{ color: S.muted }}>最大ターン数: {form.maxTurns}</label>
                    <input type="range" min={5} max={50} value={form.maxTurns}
                      onChange={e => setForm({ ...form, maxTurns: Number(e.target.value) })} className="w-full" />
                  </div>
                </div>
                <div>
                  <label className="text-xs" style={{ color: S.muted }}>能力値</label>
                  <div className="space-y-2 mt-1">
                    {STAT_KEYS.map(k => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="text-xs w-12" style={{ color: S.muted }}>{STAT_LABELS[k]}</span>
                        <input type="range" min={0} max={100} value={form.stats[k]}
                          onChange={e => setForm({ ...form, stats: { ...form.stats, [k]: Number(e.target.value) } })}
                          className="flex-1" />
                        <span className="text-xs w-8 text-right font-bold">{form.stats[k]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer text-sm font-semibold">保存</button>
                  <button onClick={() => { setForm(agent); setEditing(false); }}
                    className="px-4 py-2 bg-white/5 rounded-lg cursor-pointer text-sm">キャンセル</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ROLE TAB — identical content from AgentDetailModal */}
        {tab === 'role' && (
          <div className="space-y-5">
            {agent.secretarySettings && (
              <>
                <h3 className="text-sm font-bold" style={{ color: S.accent }}>秘書設定</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs block mb-1" style={{ color: S.muted }}>監視対象</label>
                    <select value={form.secretarySettings?.monitorTarget ?? 'ceo'}
                      onChange={e => setForm({ ...form, secretarySettings: { ...form.secretarySettings!, monitorTarget: e.target.value } })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm">
                      {allAgents.filter(a => a.id !== agent.id).map(a => <option key={a.id} value={a.id}>{a.icon} {a.name} {a.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: S.muted }}>報告頻度</label>
                    <select value={form.secretarySettings?.reportFrequency ?? 'realtime'}
                      onChange={e => setForm({ ...form, secretarySettings: { ...form.secretarySettings!, reportFrequency: e.target.value as 'realtime' | 'hourly' | 'daily' } })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm">
                      <option value="realtime">リアルタイム</option><option value="hourly">1時間ごと</option><option value="daily">1日ごと</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: S.muted }}>アドバイスレベル</label>
                    <select value={form.secretarySettings?.adviceLevel ?? 'active'}
                      onChange={e => setForm({ ...form, secretarySettings: { ...form.secretarySettings!, adviceLevel: e.target.value as 'passive' | 'active' | 'aggressive' } })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm">
                      <option value="passive">控えめ</option><option value="active">積極的</option><option value="aggressive">強力</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.secretarySettings?.proxyAuthority ?? false}
                      onChange={e => setForm({ ...form, secretarySettings: { ...form.secretarySettings!, proxyAuthority: e.target.checked } })} />
                    <span className="text-sm">オーナー代理の指示出し権限</span>
                  </label>
                </div>
                <button onClick={() => onUpdate(agent.id, { secretarySettings: form.secretarySettings })}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer text-sm font-semibold">保存</button>
              </>
            )}

            {agent.marketingSettings && (
              <>
                <h3 className="text-sm font-bold" style={{ color: S.accent }}>マーケティング部長設定</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.marketingSettings?.autoGatherEnabled ?? false}
                        onChange={e => setForm({ ...form, marketingSettings: { ...form.marketingSettings!, autoGatherEnabled: e.target.checked } })} />
                      <span className="text-sm">自動情報収集</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.marketingSettings?.webSearchEnabled ?? false}
                        onChange={e => setForm({ ...form, marketingSettings: { ...form.marketingSettings!, webSearchEnabled: e.target.checked } })} />
                      <span className="text-sm">Web検索</span>
                    </label>
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: S.muted }}>収集間隔（分）: {form.marketingSettings?.gatherInterval ?? 30}</label>
                    <input type="range" min={5} max={120} value={form.marketingSettings?.gatherInterval ?? 30}
                      onChange={e => setForm({ ...form, marketingSettings: { ...form.marketingSettings!, gatherInterval: Number(e.target.value) } })}
                      className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: S.muted }}>収集トピック</label>
                    <textarea value={form.marketingSettings?.gatherTopics?.join(', ') ?? ''}
                      onChange={e => setForm({ ...form, marketingSettings: { ...form.marketingSettings!, gatherTopics: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm h-16" />
                  </div>
                </div>
                <button onClick={() => onUpdate(agent.id, { marketingSettings: form.marketingSettings })}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer text-sm font-semibold">保存</button>
              </>
            )}

            {agent.chiefSecretarySettings && (
              <>
                <h3 className="text-sm font-bold" style={{ color: S.accent }}>秘書部長設定</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.chiefSecretarySettings?.speedBoostEnabled ?? false}
                        onChange={e => setForm({ ...form, chiefSecretarySettings: { ...form.chiefSecretarySettings!, speedBoostEnabled: e.target.checked } })} />
                      <span className="text-sm">タスク加速</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.chiefSecretarySettings?.autoDetectBlockers ?? false}
                        onChange={e => setForm({ ...form, chiefSecretarySettings: { ...form.chiefSecretarySettings!, autoDetectBlockers: e.target.checked } })} />
                      <span className="text-sm">ボトルネック検出</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.chiefSecretarySettings?.meetingPrepEnabled ?? false}
                        onChange={e => setForm({ ...form, chiefSecretarySettings: { ...form.chiefSecretarySettings!, meetingPrepEnabled: e.target.checked } })} />
                      <span className="text-sm">会議準備自動化</span>
                    </label>
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: S.muted }}>優先度方式</label>
                    <select value={form.chiefSecretarySettings?.priorityMode ?? 'bottleneck'}
                      onChange={e => setForm({ ...form, chiefSecretarySettings: { ...form.chiefSecretarySettings!, priorityMode: e.target.value as 'bottleneck' | 'round-robin' | 'urgency' } })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm">
                      <option value="bottleneck">ボトルネック優先</option>
                      <option value="round-robin">ラウンドロビン</option>
                      <option value="urgency">緊急度優先</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: S.muted }}>同時サポート上限: {form.chiefSecretarySettings?.parallelAssistLimit ?? 3}</label>
                    <input type="range" min={1} max={10} value={form.chiefSecretarySettings?.parallelAssistLimit ?? 3}
                      onChange={e => setForm({ ...form, chiefSecretarySettings: { ...form.chiefSecretarySettings!, parallelAssistLimit: Number(e.target.value) } })}
                      className="w-full" />
                  </div>
                </div>
                <button onClick={() => onUpdate(agent.id, { chiefSecretarySettings: form.chiefSecretarySettings })}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer text-sm font-semibold">保存</button>
              </>
            )}

            {agent.csSettings && (
              <>
                <h3 className="text-sm font-bold" style={{ color: S.accent }}>CS部長設定</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.csSettings?.proactiveSupportEnabled ?? false}
                        onChange={e => setForm({ ...form, csSettings: { ...form.csSettings!, proactiveSupportEnabled: e.target.checked } })} />
                      <span className="text-sm">プロアクティブサポート</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.csSettings?.feedbackLoop ?? false}
                        onChange={e => setForm({ ...form, csSettings: { ...form.csSettings!, feedbackLoop: e.target.checked } })} />
                      <span className="text-sm">フィードバック自動化</span>
                    </label>
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: S.muted }}>満足度目標: {form.csSettings?.satisfactionTarget ?? 95}%</label>
                    <input type="range" min={50} max={100} value={form.csSettings?.satisfactionTarget ?? 95}
                      onChange={e => setForm({ ...form, csSettings: { ...form.csSettings!, satisfactionTarget: Number(e.target.value) } })}
                      className="w-full" />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: S.muted }}>応答時間目標: {form.csSettings?.responseTimeTarget ?? 5}分</label>
                    <input type="range" min={1} max={60} value={form.csSettings?.responseTimeTarget ?? 5}
                      onChange={e => setForm({ ...form, csSettings: { ...form.csSettings!, responseTimeTarget: Number(e.target.value) } })}
                      className="w-full" />
                  </div>
                </div>
                <button onClick={() => onUpdate(agent.id, { csSettings: form.csSettings })}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer text-sm font-semibold">保存</button>
              </>
            )}

            {agent.rdSettings && (
              <>
                <h3 className="text-sm font-bold" style={{ color: S.accent }}>R&D部長設定</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.rdSettings?.moonShotEnabled ?? false}
                        onChange={e => setForm({ ...form, rdSettings: { ...form.rdSettings!, moonShotEnabled: e.target.checked } })} />
                      <span className="text-sm">ムーンショット</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.rdSettings?.disruptiveThinking ?? false}
                        onChange={e => setForm({ ...form, rdSettings: { ...form.rdSettings!, disruptiveThinking: e.target.checked } })} />
                      <span className="text-sm">破壊的イノベーション</span>
                    </label>
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: S.muted }}>アイデア生成モード</label>
                    <select value={form.rdSettings?.ideaGenerationMode ?? 'continuous'}
                      onChange={e => setForm({ ...form, rdSettings: { ...form.rdSettings!, ideaGenerationMode: e.target.value as 'continuous' | 'burst' | 'deep' } })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm">
                      <option value="continuous">連続生成</option>
                      <option value="burst">バースト</option>
                      <option value="deep">ディープ</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: S.muted }}>プロトタイプ速度</label>
                    <select value={form.rdSettings?.prototypeSpeed ?? 'rapid'}
                      onChange={e => setForm({ ...form, rdSettings: { ...form.rdSettings!, prototypeSpeed: e.target.value as 'rapid' | 'standard' | 'thorough' } })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm">
                      <option value="rapid">爆速</option>
                      <option value="standard">標準</option>
                      <option value="thorough">じっくり</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: S.muted }}>日次アイデア目標: {form.rdSettings?.dailyIdeaQuota ?? 10}</label>
                    <input type="range" min={1} max={50} value={form.rdSettings?.dailyIdeaQuota ?? 10}
                      onChange={e => setForm({ ...form, rdSettings: { ...form.rdSettings!, dailyIdeaQuota: Number(e.target.value) } })}
                      className="w-full" />
                  </div>
                </div>
                <button onClick={() => onUpdate(agent.id, { rdSettings: form.rdSettings })}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer text-sm font-semibold">保存</button>
              </>
            )}

            {agent.hrSettings && (
              <>
                <h3 className="text-sm font-bold" style={{ color: S.accent }}>人事部長設定</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.hrSettings?.trainingEnabled ?? false}
                        onChange={e => setForm({ ...form, hrSettings: { ...form.hrSettings!, trainingEnabled: e.target.checked } })} />
                      <span className="text-sm">社員教育</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.hrSettings?.scoutEnabled ?? false}
                        onChange={e => setForm({ ...form, hrSettings: { ...form.hrSettings!, scoutEnabled: e.target.checked } })} />
                      <span className="text-sm">スカウト</span>
                    </label>
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: S.muted }}>教育重点分野</label>
                    <textarea value={form.hrSettings?.trainingFocus?.join(', ') ?? ''}
                      onChange={e => setForm({ ...form, hrSettings: { ...form.hrSettings!, trainingFocus: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm h-16" />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: S.muted }}>最大採用数: {form.hrSettings?.maxRecruits ?? 3}</label>
                    <input type="range" min={1} max={10} value={form.hrSettings?.maxRecruits ?? 3}
                      onChange={e => setForm({ ...form, hrSettings: { ...form.hrSettings!, maxRecruits: Number(e.target.value) } })}
                      className="w-full" />
                  </div>
                </div>
                <button onClick={() => onUpdate(agent.id, { hrSettings: form.hrSettings })}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer text-sm font-semibold">保存</button>
              </>
            )}
          </div>
        )}

        {/* BADGES TAB */}
        {tab === 'badges' && (
          <div>
            {allBadges.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {allBadges.map(b => (
                  <div key={b.id} className="flex flex-col items-center p-3 bg-white/[0.03] rounded-lg">
                    <span className="text-2xl mb-1">{b.icon}</span>
                    <span className="text-xs font-bold">{b.name}</span>
                    <span className="text-[10px] opacity-40 text-center">{b.description}</span>
                    <div className="text-[10px] text-yellow-400 mt-1">{'★'.repeat(b.rarity)}{'☆'.repeat(5 - b.rarity)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center opacity-30 py-8">まだバッジを獲得していません</p>
            )}
            <div className="mt-4">
              <h4 className="text-xs font-semibold mb-2" style={{ color: S.muted }}>未獲得バッジ</h4>
              <div className="grid grid-cols-3 gap-2">
                {BADGES.filter(b => !agent.badges.includes(b.id) && b.category !== 'secret').map(b => (
                  <div key={b.id} className="flex flex-col items-center p-2 bg-white/[0.02] rounded-lg opacity-25">
                    <span className="text-lg">{b.icon}</span>
                    <span className="text-[10px]">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* COMPATIBILITY TAB */}
        {tab === 'compatibility' && (
          <div className="space-y-1.5">
            {allAgents.filter(a => a.id !== agent.id).map(other => {
              const score = calcCompatibility(agent, other);
              const mark = score >= 85 ? '◎' : score >= 65 ? '○' : '△';
              const color = score >= 85 ? '#22c55e' : score >= 65 ? '#eab308' : '#ef4444';
              return (
                <div key={other.id} className="flex items-center gap-2 p-2 bg-white/[0.03] rounded-lg">
                  <span className="text-lg">{other.icon}</span>
                  <span className="text-sm flex-1 truncate">{other.name} {other.title}</span>
                  <span className="text-lg font-bold" style={{ color }}>{mark}</span>
                  <span className="text-xs opacity-50 w-10 text-right">{score}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Avatar Setup Wizard */}
      {showWizard && (
        <AvatarSetupWizard
          agent={agent}
          onUpdate={(id, updates) => { onUpdate(id, updates); setForm(prev => ({ ...prev, ...updates })); }}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd /Users/k.kurosawa/projects/company/ui && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to AgentSidePanel.tsx

- [ ] **Step 3: Commit**

```bash
cd /Users/k.kurosawa/projects/company/ui
git add src/components/AgentSidePanel.tsx
git commit -m "feat: add AgentSidePanel component with all 6 tabs from AgentDetailModal"
```

---

### Task 5: OfficeView Component

**Files:**
- Create: `ui/src/components/OfficeView.tsx`

Layout orchestrator. Composes FloorMap + AgentSidePanel + PhaseBar (MissionTimeline) + QuestLog overlay.

- [ ] **Step 1: Create OfficeView component**

```tsx
// ui/src/components/OfficeView.tsx
import { useState } from 'react';
import type { Agent, RoomId } from '../types';
import type { AgentActivity } from '../hooks/useOfficeActivity';
import { FloorMap } from './FloorMap';
import { AgentSidePanel } from './AgentSidePanel';

interface Props {
  agents: Agent[];
  activities: Map<string, AgentActivity>;
  activeRooms: Set<RoomId>;
  isRunning: boolean;
  executing: boolean;
  questItems?: { label: string; status: 'active' | 'done' | 'error' }[];
  missionTimeline?: React.ReactNode;
  onUpdateAgent: (id: string, updates: Partial<Agent>) => void;
  onTriggerSpeech?: (agentId: string, room: RoomId) => void;
}

export function OfficeView({
  agents,
  activities,
  activeRooms,
  isRunning,
  executing,
  questItems,
  missionTimeline,
  onUpdateAgent,
  onTriggerSpeech,
}: Props) {
  // Default to CEO
  const [selectedAgent, setSelectedAgent] = useState<Agent>(
    () => agents.find(a => a.id === 'ceo') ?? agents[0]
  );

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
    // Trigger speech bubble if running
    if (isRunning && onTriggerSpeech) {
      const activity = activities.get(agent.id);
      const room = activity?.room ?? agent.room;
      onTriggerSpeech(agent.id, room);
    }
  };

  return (
    <div className="h-full flex relative">
      {/* PhaseBar — only shown during execution */}
      {executing && missionTimeline && (
        <div className="absolute top-0 left-0 right-[360px] z-30">
          {missionTimeline}
        </div>
      )}

      {/* FloorMap — takes remaining width */}
      <div className="flex-1 min-w-0 overflow-auto relative">
        <FloorMap
          agents={agents}
          activities={activities}
          activeRooms={activeRooms}
          isRunning={isRunning}
          selectedAgentId={selectedAgent?.id}
          onAgentClick={handleAgentClick}
        />

        {/* QuestLog overlay — bottom-right of FloorMap during execution */}
        {executing && questItems && questItems.length > 0 && (
          <div className="absolute bottom-4 right-4 z-20 w-64 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden"
            style={{ background: 'rgba(15,23,42,0.85)' }}>
            <div className="px-3 py-2 border-b border-white/10 text-xs font-semibold text-white/50">Quest Log</div>
            <div className="p-2 space-y-1">
              {questItems.map((q, i) => (
                <div key={i} className="flex items-center gap-2 text-xs px-2 py-1">
                  <span className={
                    q.status === 'done' ? 'text-emerald-400' :
                    q.status === 'active' ? 'text-indigo-400 animate-pulse' :
                    'text-red-400'
                  }>
                    {q.status === 'done' ? '✓' : q.status === 'active' ? '▶' : '✕'}
                  </span>
                  <span className={q.status === 'done' ? 'text-white/40 line-through' : 'text-white/70'}>
                    {q.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AgentSidePanel — fixed 360px right */}
      <AgentSidePanel
        agent={selectedAgent}
        allAgents={agents}
        onUpdate={onUpdateAgent}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd /Users/k.kurosawa/projects/company/ui && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to OfficeView.tsx

- [ ] **Step 3: Commit**

```bash
cd /Users/k.kurosawa/projects/company/ui
git add src/components/OfficeView.tsx
git commit -m "feat: add OfficeView layout component composing FloorMap + AgentSidePanel"
```

---

### Task 6: Integrate OfficeView into App.tsx

**Files:**
- Modify: `ui/src/App.tsx:9,278-301`

Replace the `OfficeFloor` usage with `OfficeView`. Remove `OfficeFloor` import. Keep `AgentDetailModal` for non-office views.

- [ ] **Step 1: Update imports in App.tsx**

Replace:
```tsx
import { OfficeFloor } from './components/OfficeFloor';
```
With:
```tsx
import { OfficeView } from './components/OfficeView';
```

- [ ] **Step 2: Replace office view rendering**

Replace the `view === 'office'` block (lines ~278-301):

```tsx
{view === 'office' && (
  <div className="h-full">
    <OfficeFloor
      agents={company.agents}
      onSelect={setSelectedAgent}
      selectedId={selectedAgent?.id}
      isLive={isLive}
      activities={officeActivity.activities}
      activeRooms={officeActivity.activeRooms}
      energyLevel={officeActivity.energyLevel}
      livePhase={officeActivity.phase}
      liveProgress={officeActivity.progress}
      liveAgentCount={officeActivity.liveAgentCount}
      onAgentClick={officeActivity.triggerSpeech}
      executing={executing}
      commandLabel={executionLabel}
      elapsed={relay.elapsed}
      questItems={questItems}
      onShowDetail={(agent) => { setSelectedAgent(agent); setShowDetail(true); }}
      missionTimeline={isLive && mission.phases.length > 0 ? (
        <MissionTimeline mission={mission} agents={company.agents} elapsed={relay.elapsed} />
      ) : undefined}
    />
  </div>
)}
```

With:
```tsx
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
      onUpdateAgent={store.updateAgent}
      onTriggerSpeech={officeActivity.triggerSpeech}
    />
  </div>
)}
```

- [ ] **Step 3: Verify build compiles**

Run: `cd /Users/k.kurosawa/projects/company/ui && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors. If `store.updateAgent` doesn't exist, check how `onUpdate` is passed to `AgentDetailModal` — it's via `store.updateAgent` or a similar method. Adapt as needed.

- [ ] **Step 4: Commit**

```bash
cd /Users/k.kurosawa/projects/company/ui
git add src/App.tsx
git commit -m "feat: replace OfficeFloor with OfficeView in App.tsx"
```

---

### Task 7: Build, Verify, and Fix

**Files:**
- All created/modified files

- [ ] **Step 1: Run TypeScript compiler**

Run: `cd /Users/k.kurosawa/projects/company/ui && npx tsc --noEmit`
Expected: No errors. Fix any type issues that arise.

- [ ] **Step 2: Build production bundle**

Run: `cd /Users/k.kurosawa/projects/company/ui && npx vite build`
Expected: Build succeeds. This is required because Vite dev server serves pre-built static assets from `dist/`, not dev-mode HMR transforms.

- [ ] **Step 3: Visual verification with Playwright**

Navigate to `http://localhost:5175` and take a screenshot to verify:
- 6 room cards visible in CSS grid
- Agents displayed with large front-facing avatars
- Right side panel (360px) showing CEO info with tabs
- No zoom controls, no minimap, no 3D overlay
- PhaseBar area (top) and QuestLog area (bottom-right) render correctly during execution

- [ ] **Step 4: Test agent click interaction**

Click on different agents in the floor map. Verify:
- Selected agent gets indigo ring highlight
- Side panel content transitions to clicked agent
- Tabs work (status, visual, settings, badges, compatibility)

- [ ] **Step 5: Final commit**

```bash
cd /Users/k.kurosawa/projects/company/ui
git add -A
git commit -m "fix: address build issues from office redesign integration"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - OfficeView layout (flex + 360px panel): Task 5
   - FloorMap (CSS grid, 6 rooms): Task 3
   - RoomSection (room card with header + agents): Task 2
   - AgentSlot (avatar + title + level + status + XP): Task 1
   - AgentSidePanel (5+1 tabs from modal): Task 4
   - App.tsx integration: Task 6
   - PhaseBar + QuestLog HUD: Task 5
   - Status badge logic: Task 1 (`getStatus` function)
   - Remove 3D/zoom/minimap/SE-BGM/bubble: covered by replacing OfficeFloor entirely
   - Build verification: Task 7

2. **Placeholder scan:** No TBDs, TODOs, or vague references found.

3. **Type consistency:** Props interfaces are consistent across tasks. `AgentSlot.Props.onClick` matches `FloorMap`'s `onAgentClick` callback. `OfficeView.Props` matches what App.tsx can provide.
