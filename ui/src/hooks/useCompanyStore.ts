import { useState, useCallback } from 'react';
import type { Company, Agent, ThemeType, Notification } from '../types';
import { defaultCompany } from '../data/defaultCompany';
import { LEVELS } from '../data/constants';

const STORAGE_KEY = 'ai-company-data';
const NOTIFICATIONS_KEY = 'ai-company-notifications';
const SCHEMA_VERSION_KEY = 'ai-company-schema-version';
const CURRENT_SCHEMA_VERSION = 2; // bump when defaultCompany structure changes

function syncWithDefaults(cached: Company): Company {
  const defaultAgentMap = new Map(defaultCompany.agents.map(a => [a.id, a]));
  const cachedIds = new Set(cached.agents.map(a => a.id));

  // Update existing agents' structural fields from defaults
  let agents = cached.agents
    .filter(a => defaultAgentMap.has(a.id)) // remove agents deleted from defaults
    .map(a => {
      const def = defaultAgentMap.get(a.id)!;
      return { ...a, parentId: def.parentId, dept: def.dept, title: def.title };
    });

  // Add new agents from defaults that aren't in cache
  for (const [id, def] of defaultAgentMap) {
    if (!cachedIds.has(id)) {
      agents.push(def);
    }
  }

  return { ...cached, agents };
}

function loadCompanies(): Company[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [defaultCompany];

    let companies: Company[] = JSON.parse(raw);
    const savedVersion = Number(localStorage.getItem(SCHEMA_VERSION_KEY) || '0');

    if (savedVersion < CURRENT_SCHEMA_VERSION) {
      companies = companies.map(c =>
        c.id === defaultCompany.id ? syncWithDefaults(c) : c
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
      localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
    }

    return companies;
  } catch {
    return [defaultCompany];
  }
}

function saveCompanies(companies: Company[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
}

function getLevelInfo(exp: number) {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (exp >= l.requiredExp) current = l;
  }
  return current;
}

function getNextLevelExp(exp: number): number {
  for (const l of LEVELS) {
    if (exp < l.requiredExp) return l.requiredExp;
  }
  return LEVELS[LEVELS.length - 1].requiredExp;
}

export function calcCompatibility(a: Agent, b: Agent): number {
  const keys = ['design', 'dev', 'analysis', 'creative', 'comm'] as const;
  const diffs = keys.map(k => Math.abs(a.stats[k] - b.stats[k]));
  const avgDiff = diffs.reduce((s, d) => s + d, 0) / diffs.length;
  return Math.round(100 - avgDiff);
}

export function calcTeamPower(agents: Agent[]): number {
  return agents.reduce((total, a) => {
    const statSum = Object.values(a.stats).reduce((s, v) => s + v, 0);
    return total + statSum * (1 + a.level * 0.1);
  }, 0);
}

export function getTeamRank(power: number): string {
  if (power >= 10000) return 'S';
  if (power >= 8000) return 'A';
  if (power >= 6000) return 'B';
  if (power >= 4000) return 'C';
  return 'D';
}

export function useCompanyStore() {
  const [companies, setCompanies] = useState<Company[]>(loadCompanies);
  const [activeCompanyId, setActiveCompanyId] = useState(companies[0]?.id ?? '');
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const raw = localStorage.getItem(NOTIFICATIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const company = companies.find(c => c.id === activeCompanyId) ?? companies[0];

  const updateCompanies = useCallback((updater: (prev: Company[]) => Company[]) => {
    setCompanies(prev => {
      const next = updater(prev);
      saveCompanies(next);
      return next;
    });
  }, []);

  const updateAgent = useCallback((agentId: string, updates: Partial<Agent>) => {
    updateCompanies(prev =>
      prev.map(c =>
        c.id === activeCompanyId
          ? { ...c, agents: c.agents.map(a => (a.id === agentId ? { ...a, ...updates } : a)) }
          : c
      )
    );
  }, [activeCompanyId, updateCompanies]);

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'timestamp'>) => {
    const notif: Notification = { ...n, id: crypto.randomUUID(), timestamp: Date.now() };
    setNotifications(prev => {
      const next = [notif, ...prev].slice(0, 50);
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setTheme = useCallback((theme: ThemeType) => {
    updateCompanies(prev =>
      prev.map(c => (c.id === activeCompanyId ? { ...c, theme } : c))
    );
  }, [activeCompanyId, updateCompanies]);

  const addCompany = useCallback((name: string, industry: string, icon: string) => {
    const id = `company-${Date.now()}`;
    const newCompany: Company = {
      ...defaultCompany,
      id,
      name,
      industry,
      icon,
      agents: defaultCompany.agents.map(a => ({ ...a, exp: 0, level: 1, rank: '一般社員', badges: [], secretBadges: [] })),
    };
    updateCompanies(prev => [...prev, newCompany]);
    setActiveCompanyId(id);
  }, [updateCompanies]);

  const deleteCompany = useCallback((id: string) => {
    updateCompanies(prev => {
      const next = prev.filter(c => c.id !== id);
      if (next.length === 0) next.push(defaultCompany);
      return next;
    });
    if (activeCompanyId === id) {
      setActiveCompanyId(companies[0]?.id ?? defaultCompany.id);
    }
  }, [activeCompanyId, companies, updateCompanies]);

  return {
    companies,
    company,
    activeCompanyId,
    setActiveCompanyId,
    updateAgent,
    updateCompanies,
    addNotification,
    notifications,
    setTheme,
    addCompany,
    deleteCompany,
    getLevelInfo,
    getNextLevelExp,
  };
}
