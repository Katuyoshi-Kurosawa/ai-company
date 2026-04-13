import { useState } from 'react';
import type { Company, ThemeType } from '../types';
import { THEMES } from '../data/constants';

interface Props {
  companies: Company[];
  activeCompanyId: string;
  onSelect: (id: string) => void;
  onAdd: (name: string, industry: string, icon: string) => void;
  onDelete: (id: string) => void;
  onThemeChange: (theme: ThemeType) => void;
  currentTheme: ThemeType;
}

export function CompanyManager({ companies, activeCompanyId, onSelect, onAdd, onDelete, onThemeChange, currentTheme }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [icon, setIcon] = useState('🏢');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name, industry, icon);
    setName('');
    setIndustry('');
    setIcon('🏢');
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Company tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {companies.map(c => (
          <button key={c.id}
            onClick={() => onSelect(c.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors cursor-pointer
              ${c.id === activeCompanyId ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-400/50' : 'bg-white/5 hover:bg-white/10'}`}>
            <span>{c.icon}</span>
            <span>{c.name}</span>
          </button>
        ))}
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
          + 新規作成
        </button>
      </div>

      {/* New company form */}
      {showForm && (
        <div className="p-4 bg-white/5 rounded-lg space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs opacity-40">アイコン</label>
              <input value={icon} onChange={e => setIcon(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-2xl text-center" />
            </div>
            <div>
              <label className="text-xs opacity-40">会社名</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="AI開発株式会社"
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs opacity-40">業種</label>
              <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="ソフトウェア開発"
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 cursor-pointer text-sm">
              作成
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 cursor-pointer text-sm">
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* Theme selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs opacity-40">テーマ:</span>
        {(Object.entries(THEMES) as [ThemeType, typeof THEMES[ThemeType]][]).map(([key, t]) => (
          <button key={key}
            onClick={() => onThemeChange(key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs cursor-pointer transition-colors
              ${currentTheme === key ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-400/50' : 'bg-white/5 hover:bg-white/10'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Delete */}
      {companies.length > 1 && (
        <div>
          {confirmDelete === activeCompanyId ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-400">この会社を削除しますか？</span>
              <button onClick={() => { onDelete(activeCompanyId); setConfirmDelete(null); }}
                className="px-3 py-1 bg-red-500 text-white rounded text-xs cursor-pointer">削除</button>
              <button onClick={() => setConfirmDelete(null)}
                className="px-3 py-1 bg-white/10 rounded text-xs cursor-pointer">キャンセル</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(activeCompanyId)}
              className="text-xs text-red-400/60 hover:text-red-400 cursor-pointer">
              この会社を削除...
            </button>
          )}
        </div>
      )}
    </div>
  );
}
