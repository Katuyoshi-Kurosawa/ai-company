# TTS（音声読み上げ）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web Speech API を使い全ての報告書（MTG議事録・エスカレーション・成果物・実行ログ）をエージェントごとの個性的な声で読み上げる。

**Architecture:** 集中型 `useTTS` hook + React Context でグローバル管理。各コンポーネントは `useTTSContext()` を呼ぶだけで TTS にアクセス可能。発話キューでストリーミングログ追加と MTG 連続再生を統一的に処理する。

**Tech Stack:** Web Speech API (`window.speechSynthesis`) + React Context + localStorage (設定永続化)

---

## ファイル構成

### 新規作成
- `ui/src/config/agentVoices.ts` — 13エージェント＋ナレーターの声パラメータ定義
- `ui/src/hooks/useTTS.ts` — SpeechSynthesis ラッパー + キュー管理ロジック
- `ui/src/context/TTSContext.tsx` — React Context + Provider + `useTTSContext` hook
- `ui/src/components/TTSButton.tsx` — 再生/停止/スキップ共通ボタン
- `ui/src/components/TTSBar.tsx` — 再生中ステータスバー（画面固定下部）

### 変更
- `ui/src/App.tsx` — `TTSProvider` でラップ、`TTSBar` を追加
- `ui/src/components/MtgScreen.tsx` — チャットヘッダーに TTSButton 追加
- `ui/src/components/EscalationScreen.tsx` — 相談カードに TTSButton 追加
- `ui/src/components/MarkdownViewer.tsx` — フローティング TTSButton 追加、Props 変更
- `ui/src/components/ExecutionPanel.tsx` — ログトグルボタン追加

---

## Task 1: エージェント声プロファイル定義

**Files:**
- Create: `ui/src/config/agentVoices.ts`

- [ ] **Step 1: agentVoices.ts を作成**

```typescript
// ui/src/config/agentVoices.ts

export interface VoiceProfile {
  gender: 'female' | 'male';
  pitch: number;   // 0.5–2.0、デフォルト 1.0
  rate: number;    // 0.5–2.0、デフォルト 1.0
  volume: number;  // 0.0–1.0
}

// 13エージェント + ナレーター
export const AGENT_VOICE_PROFILES: Record<string, VoiceProfile> = {
  ceo:               { gender: 'male',   pitch: 0.85, rate: 0.90, volume: 1.0 },
  secretary:         { gender: 'female', pitch: 1.10, rate: 1.00, volume: 1.0 },
  'chief-secretary': { gender: 'female', pitch: 1.05, rate: 0.95, volume: 1.0 },
  marketing:         { gender: 'female', pitch: 1.20, rate: 1.10, volume: 1.0 },
  hr:                { gender: 'female', pitch: 1.00, rate: 0.90, volume: 1.0 },
  cs:                { gender: 'female', pitch: 1.15, rate: 1.05, volume: 1.0 },
  rd:                { gender: 'male',   pitch: 1.10, rate: 1.15, volume: 1.0 },
  planner:           { gender: 'male',   pitch: 0.95, rate: 0.95, volume: 1.0 },
  architect:         { gender: 'male',   pitch: 0.90, rate: 0.85, volume: 1.0 },
  developer:         { gender: 'male',   pitch: 1.00, rate: 1.05, volume: 1.0 },
  'qa-reviewer':     { gender: 'male',   pitch: 0.95, rate: 0.90, volume: 1.0 },
  'ui-designer':     { gender: 'female', pitch: 1.15, rate: 1.05, volume: 1.0 },
  'doc-writer':      { gender: 'male',   pitch: 0.90, rate: 0.88, volume: 1.0 },
  narrator:          { gender: 'female', pitch: 1.00, rate: 0.95, volume: 1.0 },
};

/** macOS/Windows を横断して日本語音声を探す */
export function findVoice(
  gender: 'female' | 'male',
  overrideName?: string | null,
): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // ユーザー指定音声
  if (overrideName) {
    const found = voices.find(v => v.name === overrideName);
    if (found) return found;
  }

  // macOS / Windows 優先候補
  const FEMALE_PREFS = ['Kyoko', 'O-ren', 'Microsoft Haruka Desktop', 'Microsoft Haruka'];
  const MALE_PREFS   = ['Otoya', 'Hattori', 'Microsoft Ichiro Desktop', 'Microsoft Ichiro'];
  const prefs = gender === 'female' ? FEMALE_PREFS : MALE_PREFS;

  for (const name of prefs) {
    const v = voices.find(v => v.name.includes(name));
    if (v) return v;
  }

  // fallback: ja-JP の音声を順に試す
  const jaVoices = voices.filter(v => v.lang.startsWith('ja'));
  return jaVoices[0] ?? voices[0] ?? null;
}

/** Markdown・ANSI エスケープを除去してプレーンテキストに変換 */
export function stripToPlain(text: string): string {
  return text
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')          // ANSI
    .replace(/```[\s\S]*?```/g, 'コードブロック')       // code block
    .replace(/`([^`]+)`/g, '$1')                      // inline code
    .replace(/#{1,6}\s+/g, '')                         // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')                  // bold
    .replace(/\*(.+?)\*/g, '$1')                      // italic
    .replace(/__(.+?)__/g, '$1')                      // bold
    .replace(/_(.+?)_/g, '$1')                        // italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')          // links
    .replace(/^[-*+]\s+/gm, '')                       // ul
    .replace(/^\d+\.\s+/gm, '')                       // ol
    .replace(/^>\s*/gm, '')                           // blockquote
    .replace(/\|[^|\n]+/g, ' ')                       // table
    .replace(/^---+$/gm, '')                          // hr
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
```

- [ ] **Step 2: ビルド確認**

```bash
cd /Users/k.kurosawa/projects/company/ui && npm run build 2>&1 | tail -3
```
Expected: `built in` で成功

- [ ] **Step 3: コミット**

```bash
cd /Users/k.kurosawa/projects/company/ui
git add src/config/agentVoices.ts
git commit -m "feat(tts): add agent voice profiles and text preprocessor"
```

---

## Task 2: useTTS フック

**Files:**
- Create: `ui/src/hooks/useTTS.ts`

- [ ] **Step 1: TTS 設定の型と localStorage キーを定義して useTTS を実装**

`ui/src/hooks/useTTS.ts` を作成:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { AGENT_VOICE_PROFILES, findVoice, stripToPlain } from '../config/agentVoices';

const TTS_SETTINGS_KEY = 'ai-company-tts-settings';

export interface TTSSettings {
  enabled: boolean;
  volume: number;
  femaleVoiceName: string | null;
  maleVoiceName: string | null;
  agentOverrides: Record<string, { pitch: number; rate: number }>;
}

const DEFAULT_SETTINGS: TTSSettings = {
  enabled: true,
  volume: 1.0,
  femaleVoiceName: null,
  maleVoiceName: null,
  agentOverrides: {},
};

export interface TTSUtterance {
  text: string;
  agentId?: string; // undefined = narrator
}

export interface TTSState {
  available: boolean;
  playing: boolean;
  paused: boolean;
  currentAgentId: string | null;
  queueLength: number;
}

export interface TTSControls {
  state: TTSState;
  settings: TTSSettings;
  availableVoices: SpeechSynthesisVoice[];
  speak(utterances: TTSUtterance[]): void;
  append(utterances: TTSUtterance[]): void;
  pause(): void;
  resume(): void;
  stop(): void;
  skip(): void;
  updateSettings(patch: Partial<TTSSettings>): void;
}

export function useTTS(): TTSControls {
  const [available, setAvailable] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [queueLength, setQueueLength] = useState(0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [settings, setSettings] = useState<TTSSettings>(() => {
    try {
      const raw = localStorage.getItem(TTS_SETTINGS_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const queueRef = useRef<TTSUtterance[]>([]);
  const isPlayingRef = useRef(false);
  const skipRef = useRef(false);

  // 音声一覧の初期化（非同期）
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    setAvailable(true);

    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      const jaVoices = voices.filter(v => v.lang.startsWith('ja') || v.lang.startsWith('ja-'));
      setAvailableVoices(jaVoices.length > 0 ? jaVoices : voices);
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const updateSettings = useCallback((patch: Partial<TTSSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem(TTS_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // 1件の発話を実行するプロミス
  const speakOne = useCallback((utt: TTSUtterance, vol: number): Promise<void> => {
    return new Promise(resolve => {
      const plain = stripToPlain(utt.text);
      if (!plain.trim()) { resolve(); return; }

      const agentId = utt.agentId ?? 'narrator';
      const profile = AGENT_VOICE_PROFILES[agentId] ?? AGENT_VOICE_PROFILES['narrator'];
      const override = settings.agentOverrides[agentId];
      const overrideName = profile.gender === 'female' ? settings.femaleVoiceName : settings.maleVoiceName;
      const voice = findVoice(profile.gender, overrideName);

      const su = new SpeechSynthesisUtterance(plain);
      su.lang = 'ja-JP';
      su.pitch = override?.pitch ?? profile.pitch;
      su.rate = override?.rate ?? profile.rate;
      su.volume = vol;
      if (voice) su.voice = voice;

      setCurrentAgentId(agentId);
      skipRef.current = false;

      su.onend = () => resolve();
      su.onerror = () => resolve();

      window.speechSynthesis.speak(su);
    });
  }, [settings]);

  // キューを順番に処理するループ
  const drainQueue = useCallback(async (vol: number) => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    setPlaying(true);

    while (queueRef.current.length > 0) {
      const utt = queueRef.current.shift()!;
      setQueueLength(queueRef.current.length);
      if (skipRef.current) { skipRef.current = false; continue; }
      await speakOne(utt, vol);
    }

    isPlayingRef.current = false;
    setPlaying(false);
    setPaused(false);
    setCurrentAgentId(null);
    setQueueLength(0);
  }, [speakOne]);

  const speak = useCallback((utterances: TTSUtterance[]) => {
    if (!available || !settings.enabled) return;
    window.speechSynthesis.cancel();
    isPlayingRef.current = false;
    queueRef.current = [...utterances];
    setQueueLength(utterances.length);
    drainQueue(settings.volume);
  }, [available, settings.enabled, settings.volume, drainQueue]);

  const append = useCallback((utterances: TTSUtterance[]) => {
    if (!available || !settings.enabled) return;
    queueRef.current.push(...utterances);
    setQueueLength(queueRef.current.length);
    if (!isPlayingRef.current) drainQueue(settings.volume);
  }, [available, settings.enabled, settings.volume, drainQueue]);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setPaused(false);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    queueRef.current = [];
    isPlayingRef.current = false;
    setPlaying(false);
    setPaused(false);
    setCurrentAgentId(null);
    setQueueLength(0);
  }, []);

  const skip = useCallback(() => {
    skipRef.current = true;
    window.speechSynthesis.cancel();
  }, []);

  return {
    state: { available, playing, paused, currentAgentId, queueLength },
    settings,
    availableVoices,
    speak,
    append,
    pause,
    resume,
    stop,
    skip,
    updateSettings,
  };
}
```

- [ ] **Step 2: ビルド確認**

```bash
cd /Users/k.kurosawa/projects/company/ui && npm run build 2>&1 | tail -3
```
Expected: `built in` で成功

- [ ] **Step 3: コミット**

```bash
git add src/hooks/useTTS.ts
git commit -m "feat(tts): add useTTS hook with queue management"
```

---

## Task 3: React Context

**Files:**
- Create: `ui/src/context/TTSContext.tsx`

- [ ] **Step 1: TTSContext を作成**

```bash
mkdir -p /Users/k.kurosawa/projects/company/ui/src/context
```

`ui/src/context/TTSContext.tsx` を作成:

```typescript
import { createContext, useContext, type ReactNode } from 'react';
import { useTTS, type TTSControls } from '../hooks/useTTS';

const TTSContext = createContext<TTSControls | null>(null);

export function TTSProvider({ children }: { children: ReactNode }) {
  const tts = useTTS();
  return <TTSContext.Provider value={tts}>{children}</TTSContext.Provider>;
}

export function useTTSContext(): TTSControls {
  const ctx = useContext(TTSContext);
  if (!ctx) throw new Error('useTTSContext must be used inside TTSProvider');
  return ctx;
}
```

- [ ] **Step 2: ビルド確認**

```bash
cd /Users/k.kurosawa/projects/company/ui && npm run build 2>&1 | tail -3
```

- [ ] **Step 3: コミット**

```bash
git add src/context/TTSContext.tsx
git commit -m "feat(tts): add TTSContext provider"
```

---

## Task 4: TTSButton コンポーネント

**Files:**
- Create: `ui/src/components/TTSButton.tsx`

- [ ] **Step 1: TTSButton を実装**

`ui/src/components/TTSButton.tsx` を作成:

```typescript
import { useTTSContext } from '../context/TTSContext';
import type { TTSUtterance } from '../hooks/useTTS';

interface Props {
  getUtterances: () => TTSUtterance[];
  label?: string;
  className?: string;
}

export function TTSButton({ getUtterances, label = '読み上げ', className = '' }: Props) {
  const tts = useTTSContext();

  if (!tts.state.available) return null;

  const isThisPlaying = tts.state.playing;

  const handleClick = () => {
    if (isThisPlaying) {
      tts.stop();
    } else {
      tts.speak(getUtterances());
    }
  };

  return (
    <button
      onClick={handleClick}
      title={isThisPlaying ? '停止' : label}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium
        transition-all cursor-pointer
        ${isThisPlaying
          ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-400/50'
          : 'bg-white/10 hover:bg-white/20 opacity-70 hover:opacity-100'
        } ${className}`}
      data-testid="tts-button"
    >
      <span>{isThisPlaying ? '⏹' : '🔊'}</span>
      <span>{isThisPlaying ? '停止' : label}</span>
      {isThisPlaying && tts.state.queueLength > 0 && (
        <span className="ml-1 opacity-60">({tts.state.queueLength})</span>
      )}
    </button>
  );
}
```

- [ ] **Step 2: ビルド確認**

```bash
cd /Users/k.kurosawa/projects/company/ui && npm run build 2>&1 | tail -3
```

- [ ] **Step 3: コミット**

```bash
git add src/components/TTSButton.tsx
git commit -m "feat(tts): add TTSButton component"
```

---

## Task 5: TTSBar コンポーネント

**Files:**
- Create: `ui/src/components/TTSBar.tsx`

- [ ] **Step 1: TTSBar を実装**

`ui/src/components/TTSBar.tsx` を作成:

```typescript
import { useTTSContext } from '../context/TTSContext';
import { AGENT_VOICE_PROFILES } from '../config/agentVoices';
import type { Agent } from '../types';

interface Props {
  agents: Agent[];
}

export function TTSBar({ agents }: Props) {
  const tts = useTTSContext();
  const { state } = tts;

  if (!state.playing && !state.paused) return null;

  const agentId = state.currentAgentId ?? 'narrator';
  const agent = agents.find(a => a.id === agentId);
  const profile = AGENT_VOICE_PROFILES[agentId] ?? AGENT_VOICE_PROFILES['narrator'];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-2.5
        border-t border-indigo-500/30 backdrop-blur-sm"
      style={{ background: 'rgba(15,17,23,0.95)' }}
      data-testid="tts-bar"
    >
      {/* エージェントアバター */}
      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm"
        style={{
          background: profile.gender === 'female' ? 'rgba(244,114,182,0.2)' : 'rgba(99,102,241,0.2)'
        }}>
        {agent ? agent.icon : '🔊'}
      </div>

      {/* エージェント名 */}
      <div className="shrink-0 text-xs font-bold min-w-[4rem]">
        {agent ? `${agent.name}` : 'ナレーター'}
      </div>

      {/* 残件数 */}
      {state.queueLength > 0 && (
        <div className="text-[10px] opacity-40 shrink-0">
          残 {state.queueLength}件
        </div>
      )}

      {/* 波形アニメーション */}
      <div className="flex items-center gap-0.5 shrink-0">
        {[0,1,2,3,4].map(i => (
          <div
            key={i}
            className={`w-0.5 bg-indigo-400 rounded-full ${state.paused ? '' : 'animate-pulse'}`}
            style={{
              height: `${8 + (i % 3) * 4}px`,
              animationDelay: `${i * 0.1}s`,
              opacity: state.paused ? 0.3 : 0.8,
            }}
          />
        ))}
      </div>

      {/* スペーサー */}
      <div className="flex-1" />

      {/* コントロールボタン */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => tts.skip()}
          title="スキップ"
          className="w-7 h-7 rounded flex items-center justify-center text-sm
            bg-white/5 hover:bg-white/15 cursor-pointer transition-colors"
        >
          ⏭
        </button>
        <button
          onClick={() => state.paused ? tts.resume() : tts.pause()}
          title={state.paused ? '再開' : '一時停止'}
          className="w-7 h-7 rounded flex items-center justify-center text-sm
            bg-white/5 hover:bg-white/15 cursor-pointer transition-colors"
        >
          {state.paused ? '▶' : '⏸'}
        </button>
        <button
          onClick={() => tts.stop()}
          title="停止"
          className="w-7 h-7 rounded flex items-center justify-center text-sm
            bg-white/5 hover:bg-red-500/20 hover:text-red-400 cursor-pointer transition-colors"
        >
          ⏹
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: ビルド確認**

```bash
cd /Users/k.kurosawa/projects/company/ui && npm run build 2>&1 | tail -3
```

- [ ] **Step 3: コミット**

```bash
git add src/components/TTSBar.tsx
git commit -m "feat(tts): add TTSBar status component"
```

---

## Task 6: App.tsx に TTSProvider と TTSBar を追加

**Files:**
- Modify: `ui/src/App.tsx`

- [ ] **Step 1: import を追加**

`ui/src/App.tsx` の既存 import 群（末尾付近）に追加:

```typescript
import { TTSProvider } from './context/TTSContext';
import { TTSBar } from './components/TTSBar';
```

- [ ] **Step 2: JSX を TTSProvider でラップし TTSBar を追加**

App.tsx の `return (` の直後の最外 `<div>` を探す。以下のように変更する:

変更前:
```tsx
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: theme.bg, color: theme.text }}>
```

変更後:
```tsx
  return (
    <TTSProvider>
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: theme.bg, color: theme.text }}>
```

- [ ] **Step 3: 閉じタグと TTSBar を追加**

最後の `</div>` の直前（`CommandPalette` と `ExecutionPanel` の後、最外 `</div>` の前）に追加:

変更前:
```tsx
    </div>
  );
}
```

変更後:
```tsx
      <TTSBar agents={company.agents} />
    </div>
    </TTSProvider>
  );
}
```

- [ ] **Step 4: ビルド確認**

```bash
cd /Users/k.kurosawa/projects/company/ui && npm run build 2>&1 | tail -3
```
Expected: `built in` で成功（TTSBar は playing=false なので画面に出ない）

- [ ] **Step 5: コミット**

```bash
git add src/App.tsx
git commit -m "feat(tts): wrap App in TTSProvider and add global TTSBar"
```

---

## Task 7: MtgScreen — TTS 統合

MTG メッセージ（`MtgMessage[]`）を発話キューに変換して読み上げる。

**Files:**
- Modify: `ui/src/components/MtgScreen.tsx`

- [ ] **Step 1: import を追加**

`MtgScreen.tsx` の先頭 import に追加:

```typescript
import { TTSButton } from './TTSButton';
import type { TTSUtterance } from '../hooks/useTTS';
```

- [ ] **Step 2: getUtterances 関数を定義してヘッダーに TTSButton を追加**

Chat header の `<div className="px-4 py-3 border-b flex items-center justify-between"...>` 内、「新規MTG」ボタンの左に TTSButton を追加する。

`MtgScreen.tsx` 内の `phase !== 'config'` ブロックにある chat header を以下のように変更:

変更前:
```tsx
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
```

変更後:
```tsx
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
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <TTSButton
                    getUtterances={() => messages.map((m): TTSUtterance => ({
                      text: m.text,
                      agentId: m.agentId,
                    }))}
                    label="議事録を読む"
                  />
                )}
                <button
                  onClick={() => { setPhase('config'); setMessages([]); }}
                  className="px-3 py-1.5 bg-white/10 rounded text-xs hover:bg-white/20 cursor-pointer">
                  新規MTG
                </button>
              </div>
            </div>
```

- [ ] **Step 3: ビルド確認**

```bash
cd /Users/k.kurosawa/projects/company/ui && npm run build 2>&1 | tail -3
```

- [ ] **Step 4: コミット**

```bash
git add src/components/MtgScreen.tsx
git commit -m "feat(tts): add read-aloud button to MTG chat"
```

---

## Task 8: EscalationScreen — TTS 統合

各相談カードに「読み上げ」ボタンを追加。

**Files:**
- Modify: `ui/src/components/EscalationScreen.tsx`

- [ ] **Step 1: import を追加**

`EscalationScreen.tsx` の先頭 import に追加:

```typescript
import { TTSButton } from './TTSButton';
```

- [ ] **Step 2: 相談カードの件名行に TTSButton を追加**

`EscalationScreen.tsx` 内の `consultations.map(c => {` ブロックで、
相談カード内の件名表示部分を探す。

変更前（件名行）:
```tsx
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{type.icon}</span>
                    <span className="text-sm font-bold flex-1">{c.subject}</span>
```

変更後:
```tsx
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{type.icon}</span>
                    <span className="text-sm font-bold flex-1">{c.subject}</span>
                    <TTSButton
                      getUtterances={() => [
                        { text: `${type.label}。件名: ${c.subject}。緊急度: ${urgency.label}。${fromAgent?.name ?? c.from}から${toAgent?.name ?? c.to}へ。ステータス: ${status.label}。` },
                      ]}
                      label="読む"
                    />
```

- [ ] **Step 3: ビルド確認**

```bash
cd /Users/k.kurosawa/projects/company/ui && npm run build 2>&1 | tail -3
```

- [ ] **Step 4: コミット**

```bash
git add src/components/EscalationScreen.tsx
git commit -m "feat(tts): add read-aloud to escalation consultation cards"
```

---

## Task 9: MarkdownViewer — TTS フローティングボタン

MarkdownViewer に `agentId` と `onTTS` を不要にしたまま、オーバーレイで TTSButton を追加する。
MarkdownViewer 自体を wrapper div で包み、右上にボタンを置く。

**Files:**
- Modify: `ui/src/components/MarkdownViewer.tsx`

- [ ] **Step 1: Props に `ttsAgentId` を追加し TTSButton を埋め込む**

`MarkdownViewer.tsx` の Props を変更:

変更前:
```typescript
interface Props {
  content: string;
  className?: string;
}
```

変更後:
```typescript
interface Props {
  content: string;
  className?: string;
  ttsAgentId?: string;  // 未指定は narrator
}
```

コンポーネント本体を変更:

変更前:
```typescript
export function MarkdownViewer({ content, className = '' }: Props) {
  const rendered = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div className={`markdown-viewer space-y-2 text-sm leading-relaxed ${className}`}>
```

変更後:
```typescript
import { TTSButton } from './TTSButton';
import type { TTSUtterance } from '../hooks/useTTS';

export function MarkdownViewer({ content, className = '', ttsAgentId }: Props) {
  const rendered = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div className="relative">
      <div className="absolute top-0 right-0 z-10">
        <TTSButton
          getUtterances={(): TTSUtterance[] => [{ text: content, agentId: ttsAgentId }]}
          label="読み上げ"
        />
      </div>
      <div className={`markdown-viewer space-y-2 text-sm leading-relaxed pt-8 ${className}`}>
```

さらに末尾の閉じタグを 1 つ追加:

変更前:
```tsx
    </div>
  );
}
```

変更後:
```tsx
      </div>
    </div>
  );
}
```

- [ ] **Step 2: ビルド確認**

```bash
cd /Users/k.kurosawa/projects/company/ui && npm run build 2>&1 | tail -3
```

- [ ] **Step 3: コミット**

```bash
git add src/components/MarkdownViewer.tsx
git commit -m "feat(tts): add floating read-aloud button to MarkdownViewer"
```

---

## Task 10: ExecutionPanel — ログストリーム TTS

新着ログ行をリアルタイムで読み上げる。`append` を使うので再生中にキューに追加される。

**Files:**
- Modify: `ui/src/components/ExecutionPanel.tsx`

- [ ] **Step 1: import と TTS トグル state を追加**

`ExecutionPanel.tsx` の先頭 import に追加:

```typescript
import { useTTSContext } from '../context/TTSContext';
```

`ExecutionPanel` 関数内（既存の `useState` 群の後）に追加:

```typescript
  const tts = useTTSContext();
  const [ttsLogEnabled, setTtsLogEnabled] = useState(false);
  const lastReadIndexRef = useRef(0);
```

`useRef` を import に含める（既存の `useRef` import があることを確認、なければ追加）。

- [ ] **Step 2: 新着ログ行を append する useEffect を追加**

`ExecutionPanel` 内の既存 useEffect 群の後に追加:

```typescript
  // ログストリーム TTS: 新着行を逐次 append
  useEffect(() => {
    if (!ttsLogEnabled || !tts.state.available) return;
    const newLines = lines.slice(lastReadIndexRef.current);
    if (newLines.length === 0) return;
    lastReadIndexRef.current = lines.length;
    const utterances = newLines
      .map(l => l.text.trim())
      .filter(t => t.length > 0)
      .map(text => ({ text }));
    if (utterances.length > 0) tts.append(utterances);
  }, [lines, ttsLogEnabled, tts]);
```

- [ ] **Step 3: ログヘッダーにトグルボタンを追加**

`ExecutionPanel.tsx` 内のログ表示エリアのヘッダー部分を探す。
以下の箇所（ログヘッダー）に TTS トグルボタンを追加する。

`ExecutionPanel` のレンダリング部分でログエリアのヘッダー行（`ログ` や `実行ログ` のような表示）を探し、その右側に追加:

```tsx
{tts.state.available && (
  <button
    onClick={() => {
      setTtsLogEnabled(v => {
        if (v) tts.stop();
        lastReadIndexRef.current = lines.length;
        return !v;
      });
    }}
    title={ttsLogEnabled ? 'ログ読み上げを停止' : 'ログを読み上げる'}
    className={`px-2 py-1 rounded text-xs flex items-center gap-1 cursor-pointer transition-colors
      ${ttsLogEnabled
        ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-400/40'
        : 'bg-white/5 hover:bg-white/10 opacity-60 hover:opacity-100'
      }`}
    data-testid="tts-log-toggle"
  >
    <span>{ttsLogEnabled ? '🔊' : '🔇'}</span>
    <span>{ttsLogEnabled ? '読上中' : '読上'}</span>
  </button>
)}
```

- [ ] **Step 4: ExecutionPanel のログヘッダー位置を確認して追加する**

```bash
grep -n "ログ\|log\|実行" /Users/k.kurosawa/projects/company/ui/src/components/ExecutionPanel.tsx | head -20
```

上記で確認した行番号付近のヘッダー部分（例: `<div className="...flex items-center...">` ブロック）に Step 3 のボタンを追加する。

- [ ] **Step 5: ビルド確認**

```bash
cd /Users/k.kurosawa/projects/company/ui && npm run build 2>&1 | tail -3
```

- [ ] **Step 6: コミット**

```bash
git add src/components/ExecutionPanel.tsx
git commit -m "feat(tts): add real-time log stream TTS toggle to ExecutionPanel"
```

---

## Task 11: 設定画面 — TTS 設定セクション

CompanyManager に TTS 設定セクションを追加する。

**Files:**
- Modify: `ui/src/components/CompanyManager.tsx`

- [ ] **Step 1: import を追加**

`CompanyManager.tsx` の先頭に追加:

```typescript
import { useTTSContext } from '../context/TTSContext';
import { AGENT_VOICE_PROFILES } from '../config/agentVoices';
```

- [ ] **Step 2: CompanyManager 関数内で TTS context を取得**

`CompanyManager` 関数内（既存の state 宣言の後）に追加:

```typescript
  const tts = useTTSContext();
  const { settings, updateSettings, availableVoices, state: ttsState } = tts;
```

- [ ] **Step 3: TTS 設定セクションを JSX に追加**

`CompanyManager` の `return` の `<div className="space-y-4">` 内、既存コンテンツの後（最下部）に追加:

```tsx
      {/* TTS 設定セクション */}
      {ttsState.available && (
        <div className="mt-6 p-4 rounded-xl space-y-4 bg-white/5 border border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2">
              🔊 音声読み上げ設定
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs opacity-60">{settings.enabled ? '有効' : '無効'}</span>
              <button
                onClick={() => updateSettings({ enabled: !settings.enabled })}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer
                  ${settings.enabled ? 'bg-indigo-500' : 'bg-white/20'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all
                  ${settings.enabled ? 'left-5' : 'left-0.5'}`} />
              </button>
            </label>
          </div>

          {settings.enabled && (
            <>
              {/* 音量 */}
              <div className="space-y-1">
                <label className="text-xs opacity-40 flex justify-between">
                  <span>音量</span>
                  <span>{Math.round(settings.volume * 100)}%</span>
                </label>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={settings.volume}
                  onChange={e => updateSettings({ volume: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              {/* 女性音声選択 */}
              <div className="space-y-1">
                <label className="text-xs opacity-40">女性音声</label>
                <select
                  value={settings.femaleVoiceName ?? ''}
                  onChange={e => updateSettings({ femaleVoiceName: e.target.value || null })}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm"
                >
                  <option value="">自動選択（推奨）</option>
                  {availableVoices.map(v => (
                    <option key={v.name} value={v.name}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* 男性音声選択 */}
              <div className="space-y-1">
                <label className="text-xs opacity-40">男性音声</label>
                <select
                  value={settings.maleVoiceName ?? ''}
                  onChange={e => updateSettings({ maleVoiceName: e.target.value || null })}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm"
                >
                  <option value="">自動選択（推奨）</option>
                  {availableVoices.map(v => (
                    <option key={v.name} value={v.name}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* テスト再生 */}
              <button
                onClick={() => tts.speak([{ text: 'こんにちは。音声読み上げのテストです。' }])}
                className="px-3 py-1.5 bg-indigo-500/20 text-indigo-400 rounded text-xs hover:bg-indigo-500/30 cursor-pointer transition-colors"
              >
                テスト再生
              </button>

              {/* エージェント別ピッチ・速度 */}
              <details className="space-y-2">
                <summary className="text-xs opacity-40 cursor-pointer hover:opacity-60">
                  エージェント別 声の調整
                </summary>
                <div className="space-y-3 pt-2">
                  {Object.entries(AGENT_VOICE_PROFILES).filter(([id]) => id !== 'narrator').map(([id, profile]) => {
                    const override = settings.agentOverrides[id] ?? { pitch: profile.pitch, rate: profile.rate };
                    return (
                      <div key={id} className="p-2 bg-white/5 rounded space-y-2">
                        <div className="text-xs font-bold flex items-center justify-between">
                          <span>{id} ({profile.gender === 'female' ? '♀' : '♂'})</span>
                          <button
                            onClick={() => {
                              const next = { ...settings.agentOverrides };
                              delete next[id];
                              updateSettings({ agentOverrides: next });
                            }}
                            className="text-[10px] opacity-40 hover:opacity-80 cursor-pointer"
                          >
                            リセット
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] opacity-40">ピッチ {override.pitch.toFixed(2)}</label>
                            <input
                              type="range" min={0.5} max={2} step={0.05}
                              value={override.pitch}
                              onChange={e => updateSettings({
                                agentOverrides: {
                                  ...settings.agentOverrides,
                                  [id]: { ...override, pitch: Number(e.target.value) },
                                },
                              })}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] opacity-40">速度 {override.rate.toFixed(2)}</label>
                            <input
                              type="range" min={0.5} max={2} step={0.05}
                              value={override.rate}
                              onChange={e => updateSettings({
                                agentOverrides: {
                                  ...settings.agentOverrides,
                                  [id]: { ...override, rate: Number(e.target.value) },
                                },
                              })}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            </>
          )}
        </div>
      )}
```

- [ ] **Step 4: ビルド確認**

```bash
cd /Users/k.kurosawa/projects/company/ui && npm run build 2>&1 | tail -3
```

- [ ] **Step 5: コミット**

```bash
git add src/components/CompanyManager.tsx
git commit -m "feat(tts): add TTS settings section to CompanyManager"
```

---

## Task 12: 最終確認・デプロイ

- [ ] **Step 1: フルビルド確認**

```bash
cd /Users/k.kurosawa/projects/company/ui && npm run build 2>&1
```
Expected: エラーなし

- [ ] **Step 2: 型チェック**

```bash
cd /Users/k.kurosawa/projects/company/ui && npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```
Expected: エラーなし

- [ ] **Step 3: 新規ファイルの存在確認**

```bash
ls ui/src/config/agentVoices.ts ui/src/hooks/useTTS.ts ui/src/context/TTSContext.tsx ui/src/components/TTSButton.tsx ui/src/components/TTSBar.tsx
```
Expected: 全 5 ファイルが存在

- [ ] **Step 4: Cloudflare Pages へデプロイ**

```bash
cd /Users/k.kurosawa/projects/company/ui && npm run build && npx wrangler pages deploy dist --project-name=ai-company 2>&1 | tail -5
```

- [ ] **Step 5: git push**

```bash
cd /Users/k.kurosawa/projects/company && git push
```

---

## セルフレビュー結果

**Spec coverage:**
- ✅ Web Speech API（クロスプラットフォーム） → Task 1, 2
- ✅ エージェントごとの声プロファイル → Task 1
- ✅ キュー管理・append → Task 2
- ✅ React Context → Task 3
- ✅ TTSButton 共通コンポーネント → Task 4
- ✅ TTSBar ステータスバー → Task 5
- ✅ MTG議事録読み上げ → Task 7
- ✅ エスカレーション読み上げ → Task 8
- ✅ MarkdownViewer 読み上げ → Task 9
- ✅ 実行ログストリーム読み上げ → Task 10
- ✅ 設定画面（音量/音声選択/エージェント調整） → Task 11

**型整合性確認:**
- `TTSUtterance` は Task 2 で定義、Task 4/7/8/9 で `import type { TTSUtterance }` で参照 ✅
- `TTSControls` は Task 2 で定義、Task 3 で Context 型として使用 ✅
- `useTTSContext()` は Task 3 で定義、Task 4/5/8/9/10/11 で使用 ✅
