import { useState, useEffect, useRef, useCallback } from 'react';
import type { ExecutionRecord } from '../hooks/useExecutionHistory';
import { AutoTextarea } from './AutoTextarea';

interface Props {
  connected: boolean;
  onExecute: (theme: string, type: 'company' | 'mtg', args: Record<string, string | number>) => void;
  history: ExecutionRecord[];
  theme: { bg: string; surface: string; border: string; text: string; muted: string };
}

const PRESETS = [
  { icon: '👋', label: 'おはようございます', type: 'company' as const },
  { icon: '🧠', label: 'ブレスト', type: 'mtg' as const, prefix: true },
  { icon: '📋', label: '要件レビュー', type: 'mtg' as const, mtgType: 'req-review' },
  { icon: '💻', label: 'コードレビュー', type: 'mtg' as const, mtgType: 'code-review' },
  { icon: '🎨', label: 'UI/UXレビュー', type: 'mtg' as const, mtgType: 'ui-review' },
  { icon: '🏁', label: '最終レビュー', type: 'mtg' as const, mtgType: 'final-review' },
];

// ── Header Quick Input Bar ─────────────────────────────────

export function QuickInputBar({ connected, onExecute, theme }: Omit<Props, 'history'>) {
  const [value, setValue] = useState('');
  const [expanded, setExpanded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleSubmit = () => {
    if (!value.trim() || !connected) return;
    onExecute(value.trim(), 'company', { theme: value.trim() });
    setValue('');
    setExpanded(false);
  };

  // 外側クリックで閉じる
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node) && !value) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [expanded, value]);

  return (
    <div ref={wrapperRef} className={`relative flex items-start transition-all duration-200 ${expanded ? 'w-80' : 'w-48'}`}>
      <div className="relative w-full">
        <AutoTextarea
          value={value}
          onChange={v => { setValue(v); if (!expanded) setExpanded(true); }}
          placeholder="指示を入力..."
          minRows={1}
          maxRows={expanded ? 6 : 1}
          onSubmit={handleSubmit}
          className="!py-1.5 !px-3 !pr-16 !text-sm !rounded-lg"
        />
        <div className="absolute right-1 top-1.5 flex items-center gap-1">
          {!expanded && (
            <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 font-mono" style={{ color: theme.muted }}>
              ⌘K
            </kbd>
          )}
          {expanded && value.trim() && (
            <button
              onClick={handleSubmit}
              disabled={!connected}
              className="px-2 py-0.5 bg-indigo-500 text-white rounded text-xs font-medium
                hover:bg-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors">
              実行
            </button>
          )}
        </div>
      </div>
      {expanded && !connected && (
        <div className="absolute top-full mt-1 right-0 bg-red-500/90 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-50">
          リレー未接続
        </div>
      )}
    </div>
  );
}

// ── Command Palette (Cmd+K) ────────────────────────────────

export function CommandPalette({ connected, onExecute, history, theme }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Cmd+K to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Build items list
  const recentThemes = history
    .filter(r => r.type === 'company')
    .slice(0, 5)
    .map(r => ({ icon: '🕐', label: String(r.args.theme || r.label), type: 'company' as const }));

  const filteredPresets = query
    ? PRESETS.filter(p => p.label.includes(query))
    : PRESETS;

  const filteredRecent = query
    ? recentThemes.filter(r => r.label.includes(query))
    : recentThemes;

  // Combine all items: custom query first, then presets, then recent
  const items: { icon: string; label: string; type: 'company' | 'mtg'; mtgType?: string; isCustom?: boolean }[] = [];

  if (query.trim()) {
    items.push({ icon: '🚀', label: query.trim(), type: 'company', isCustom: true });
  }
  items.push(...filteredPresets);
  items.push(...filteredRecent.filter(r => !items.some(i => i.label === r.label)));

  // Clamp selected index
  const clampedIndex = Math.min(selectedIndex, items.length - 1);

  const executeItem = useCallback((item: typeof items[number]) => {
    if (!connected) return;

    if (item.type === 'mtg' && 'mtgType' in item && item.mtgType) {
      onExecute(item.label, 'mtg', { type: item.mtgType, agenda: item.label, rounds: 3, conflict: 'chair' });
    } else if (item.type === 'mtg' && 'prefix' in item) {
      // Brainstorm: use query as agenda
      onExecute(query || item.label, 'mtg', { type: 'brainstorm', agenda: query || item.label, rounds: 3, conflict: 'chair' });
    } else {
      onExecute(item.label, 'company', { theme: item.label });
    }
    setOpen(false);
    setQuery('');
  }, [connected, onExecute, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (items[clampedIndex]) executeItem(items[clampedIndex]);
    }
  };

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === backdropRef.current) setOpen(false); }}
    >
      <div className="w-[560px] rounded-2xl shadow-2xl overflow-hidden animate-in"
        style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>

        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: theme.border }}>
          <span className="text-lg opacity-40">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="指示を入力して実行..."
            className="flex-1 bg-transparent text-lg focus:outline-none placeholder:opacity-30"
          />
          <kbd className="text-[10px] px-2 py-1 rounded bg-white/10 font-mono" style={{ color: theme.muted }}>
            ESC
          </kbd>
        </div>

        {/* Connection warning */}
        {!connected && (
          <div className="px-5 py-2 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            リレー未接続 — <code className="bg-black/30 px-1.5 py-0.5 rounded font-mono">node relay.js</code> を起動してください
          </div>
        )}

        {/* Items */}
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {/* Custom query item */}
          {query.trim() && (
            <div className="px-3 pt-1 pb-2">
              <div className="text-[10px] font-bold uppercase tracking-wider px-2 mb-1" style={{ color: theme.muted }}>
                このまま実行
              </div>
              <button
                onClick={() => executeItem(items[0])}
                onMouseEnter={() => setSelectedIndex(0)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left cursor-pointer transition-all
                  ${clampedIndex === 0 ? 'bg-indigo-500/15 ring-1 ring-indigo-400/30' : 'hover:bg-white/5'}`}
              >
                <span className="text-lg">🚀</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{query.trim()}</div>
                  <div className="text-[10px]" style={{ color: theme.muted }}>全工程実行</div>
                </div>
                {clampedIndex === 0 && (
                  <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 font-mono shrink-0" style={{ color: theme.muted }}>
                    Enter ⏎
                  </kbd>
                )}
              </button>
            </div>
          )}

          {/* Presets */}
          {filteredPresets.length > 0 && (
            <div className="px-3 pt-1 pb-2">
              <div className="text-[10px] font-bold uppercase tracking-wider px-2 mb-1" style={{ color: theme.muted }}>
                クイックアクション
              </div>
              {filteredPresets.map((preset, i) => {
                const idx = query.trim() ? i + 1 : i;
                return (
                  <button
                    key={preset.label}
                    onClick={() => executeItem(preset)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left cursor-pointer transition-all
                      ${clampedIndex === idx ? 'bg-indigo-500/15 ring-1 ring-indigo-400/30' : 'hover:bg-white/5'}`}
                  >
                    <span className="text-lg">{preset.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{preset.label}</div>
                      <div className="text-[10px]" style={{ color: theme.muted }}>
                        {preset.type === 'mtg' ? 'MTG開催' : '全工程実行'}
                      </div>
                    </div>
                    {clampedIndex === idx && (
                      <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 font-mono shrink-0" style={{ color: theme.muted }}>
                        Enter ⏎
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Recent */}
          {filteredRecent.length > 0 && (
            <div className="px-3 pt-1 pb-2">
              <div className="text-[10px] font-bold uppercase tracking-wider px-2 mb-1" style={{ color: theme.muted }}>
                最近の指示
              </div>
              {filteredRecent
                .filter(r => !filteredPresets.some(p => p.label === r.label))
                .map((item, i) => {
                  const idx = (query.trim() ? 1 : 0) + filteredPresets.length + i;
                  return (
                    <button
                      key={`${item.label}-${i}`}
                      onClick={() => executeItem(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left cursor-pointer transition-all
                        ${clampedIndex === idx ? 'bg-indigo-500/15 ring-1 ring-indigo-400/30' : 'hover:bg-white/5'}`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.label}</div>
                        <div className="text-[10px]" style={{ color: theme.muted }}>再実行</div>
                      </div>
                      {clampedIndex === idx && (
                        <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 font-mono shrink-0" style={{ color: theme.muted }}>
                          Enter ⏎
                        </kbd>
                      )}
                    </button>
                  );
                })}
            </div>
          )}

          {items.length === 0 && (
            <div className="px-5 py-8 text-center">
              <div className="text-3xl mb-2 opacity-20">🔍</div>
              <p className="text-sm" style={{ color: theme.muted }}>指示やテーマを入力してください</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t flex items-center justify-between text-[10px]"
          style={{ borderColor: theme.border, color: theme.muted }}>
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 py-0.5 rounded bg-white/10 font-mono">↑↓</kbd> 選択</span>
            <span><kbd className="px-1 py-0.5 rounded bg-white/10 font-mono">Enter</kbd> 実行</span>
            <span><kbd className="px-1 py-0.5 rounded bg-white/10 font-mono">ESC</kbd> 閉じる</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            {connected ? 'リレー接続済み' : 'リレー未接続'}
          </div>
        </div>
      </div>
    </div>
  );
}
