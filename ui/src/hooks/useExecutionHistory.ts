import { useState, useCallback } from 'react';

const STORAGE_KEY = 'ai-company-execution-history';

export interface ExecutionAction {
  time: string;       // ISO string
  type: 'start' | 'phase' | 'agent' | 'file' | 'slack' | 'mtg' | 'done' | 'error';
  label: string;
  detail?: string;
}

export interface ReviewAgentResult {
  id: string;
  name: string;
  status: 'ok' | 'maxturns' | 'timeout' | 'error';
  model: string;
  maxTurns: number;
  duration: number;
}

export interface ReviewSuggestion {
  type: string;
  icon: string;
  severity: 'success' | 'info' | 'warning' | 'critical';
  title: string;
  desc: string;
  prompt: string;
}

export interface ReviewData {
  agents: ReviewAgentResult[];
  total: number;
  success: number;
  maxturns: number;
  timeouts: number;
  errors: number;
  successRate: number;
  totalDuration: number;
  grade: string;
  suggestions: ReviewSuggestion[];
}

export interface ExecutionRecord {
  id: string;
  type: 'company' | 'mtg' | 'escalation';
  label: string;
  args: Record<string, string | number | string[]>;
  status: 'running' | 'done' | 'error';
  startedAt: string;   // ISO string
  finishedAt?: string;
  durationSec?: number;
  outputDir?: string;
  files: string[];
  actions: ExecutionAction[];
  logLineCount: number;
  slackSent: boolean;
  errorMessage?: string;
  review?: ReviewData;
}

function load(): ExecutionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(records: ExecutionRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 100)));
}

// ログ行からアクション・ファイル・Slack送信・レビューを解析
export function parseLogLines(lines: { text: string; time: number }[]): {
  actions: ExecutionAction[];
  files: string[];
  slackSent: boolean;
  outputDir: string | null;
  review: ReviewData | null;
} {
  const actions: ExecutionAction[] = [];
  const files: string[] = [];
  let slackSent = false;
  let outputDir: string | null = null;
  let review: ReviewData | null = null;

  for (const line of lines) {
    const t = new Date(line.time).toISOString();
    const txt = line.text;

    // レビューJSON検出
    if (txt.includes('__REVIEW_JSON__:')) {
      try {
        const jsonStr = txt.substring(txt.indexOf('__REVIEW_JSON__:') + '__REVIEW_JSON__:'.length);
        review = JSON.parse(jsonStr) as ReviewData;
      } catch { /* ignore parse errors */ }
      continue;
    }

    // 出力ディレクトリ検出
    const dirMatch = txt.match(/出力先:\s*(\S+)/);
    if (dirMatch) outputDir = dirMatch[1].replace(/[`'"]/g, '');

    // フェーズ検出
    if (/PHASE \d/.test(txt) || /━━━/.test(txt)) {
      actions.push({ time: t, type: 'phase', label: txt.replace(/[━\[\]]/g, '').trim() });
    }

    // エージェント開始/完了
    if (txt.includes('🚀') && txt.includes('開始')) {
      const name = txt.replace(/.*🚀\s*/, '').replace(/\s*開始.*/, '').trim();
      actions.push({ time: t, type: 'agent', label: `${name} 開始` });
    }
    if (txt.includes('✅') && txt.includes('完了')) {
      const name = txt.replace(/.*✅\s*/, '').replace(/\s*完了.*/, '').trim();
      actions.push({ time: t, type: 'agent', label: `${name} 完了` });
    }

    // ファイル出力検出
    const fileMatch = txt.match(/\.(md|json|html|sql|txt|css|tsx?|jsx?)\b/);
    if (fileMatch && (txt.includes('出力') || txt.includes('→') || txt.includes('/'))) {
      const pathMatch = txt.match(/(\.\/output\/\S+|[^\s]+\.(md|json|html|sql))/);
      const cleanPath = pathMatch[1].replace(/[`'"]/g, '');
      if (cleanPath && !files.includes(cleanPath)) {
        files.push(cleanPath);
        actions.push({ time: t, type: 'file', label: cleanPath });
      }
    }

    // Slack通知（実際に送信成功した場合のみ）
    if (txt.includes('__SLACK_SENT__')) {
      slackSent = true;
      actions.push({ time: t, type: 'slack', label: 'Slack通知送信' });
    }

    // MTG
    if (txt.includes('MTG') || txt.includes('ai-mtg.sh')) {
      if (!actions.some(a => a.label === txt.trim())) {
        actions.push({ time: t, type: 'mtg', label: txt.replace(/[[\]]/g, '').trim() });
      }
    }

    // 完了
    if (txt.includes('全工程終了') || txt.includes('🎉')) {
      actions.push({ time: t, type: 'done', label: '全工程完了' });
    }

    // EXP
    if (txt.includes('💫') || txt.includes('EXP')) {
      // skip EXP lines from actions, too noisy
    }
  }

  return { actions, files, slackSent, outputDir, review };
}

export function useExecutionHistory() {
  const [records, setRecords] = useState<ExecutionRecord[]>(load);

  const startRecord = useCallback((type: 'company' | 'mtg' | 'escalation', label: string, args: Record<string, string | number | string[]>): string => {
    const id = `exec-${Date.now()}`;
    const record: ExecutionRecord = {
      id, type, label, args,
      status: 'running',
      startedAt: new Date().toISOString(),
      files: [],
      actions: [{ time: new Date().toISOString(), type: 'start', label: `${label} 実行開始` }],
      logLineCount: 0,
      slackSent: false,
    };
    setRecords(prev => {
      const next = [record, ...prev];
      save(next);
      return next;
    });
    return id;
  }, []);

  const finishRecord = useCallback((id: string, status: 'done' | 'error', lines: { text: string; time: number }[], errorMessage?: string) => {
    setRecords(prev => {
      const next = prev.map(r => {
        if (r.id !== id) return r;
        const { actions, files, slackSent, outputDir, review } = parseLogLines(lines);
        const finishedAt = new Date().toISOString();
        const durationSec = Math.round((Date.now() - new Date(r.startedAt).getTime()) / 1000);
        return {
          ...r,
          status,
          finishedAt,
          durationSec,
          outputDir: outputDir ?? undefined,
          files: [...new Set([...r.files, ...files])],
          actions: [...r.actions, ...actions],
          logLineCount: lines.length,
          slackSent: r.slackSent || slackSent,
          errorMessage,
          review: review ?? undefined,
        };
      });
      save(next);
      return next;
    });
  }, []);

  const deleteRecord = useCallback((id: string) => {
    setRecords(prev => {
      const next = prev.filter(r => r.id !== id);
      save(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setRecords([]);
    save([]);
  }, []);

  return { records, startRecord, finishRecord, deleteRecord, clearAll };
}
