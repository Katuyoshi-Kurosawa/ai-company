#!/usr/bin/env node
// ============================================================
// AI会社 ローカルリレーサーバー
// UIからCLIコマンドを実行し、SSEでリアルタイム出力を返す
// Usage: node relay.js [port]
// ============================================================

const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const PORT = Number(process.argv[2]) || 3939;
const PROJECT_DIR = __dirname;
const jobs = new Map();

// ── 設定 ──────────────────────────────────────────
const JOB_TIMEOUT_MS = 15 * 60 * 1000; // 15分でタイムアウト
const STALL_CHECK_INTERVAL_MS = 30 * 1000; // 30秒ごとに停滞チェック
const STALL_THRESHOLD_MS = 3 * 60 * 1000; // 3分ログなしで停滞と判定

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, status, data) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

// パス安全チェック（output/配下のみ許可）
function safePath(p) {
  if (!p || p.includes('..')) return null;
  const resolved = path.resolve(PROJECT_DIR, p);
  const outputBase = path.resolve(PROJECT_DIR, 'output');
  if (!resolved.startsWith(outputBase)) return null;
  return resolved;
}

// 実行中のジョブを返す（なければnull）
function getActiveJob() {
  for (const job of jobs.values()) {
    if (job.status === 'running') return job;
  }
  return null;
}

// ── ジョブ終了処理（共通） ──────────────────────────
function finishJob(job, status, reason) {
  if (job.status !== 'running') return; // 二重終了防止
  job.status = status;
  job.finishedAt = Date.now();

  // タイマークリア
  if (job.timeoutTimer) { clearTimeout(job.timeoutTimer); job.timeoutTimer = null; }
  if (job.stallTimer) { clearInterval(job.stallTimer); job.stallTimer = null; }

  const push = (text, stream = 'system') => {
    const entry = { time: Date.now(), text, stream };
    job.lines.push(entry);
    for (const cb of job.listeners) {
      try { cb(entry); } catch { /* ignore */ }
    }
  };

  if (reason) push(reason, 'stderr');
  push(`__STATUS__:${status}`);
}

// ── ジョブを中断（プロセスkill） ──────────────────────
function abortJob(job, reason) {
  if (job.status !== 'running') return false;
  if (job.proc) {
    try {
      // プロセスグループごとkill（シェル経由の子プロセスも含む）
      process.kill(-job.proc.pid, 'SIGTERM');
    } catch {
      try { job.proc.kill('SIGTERM'); } catch { /* ignore */ }
    }
  }
  finishJob(job, 'error', reason || 'ジョブが中断されました');
  return true;
}

// ── 停滞チェック開始 ──────────────────────────────────
function startStallCheck(job) {
  job.lastLineAt = Date.now();
  job.stalled = false;

  job.stallTimer = setInterval(() => {
    if (job.status !== 'running') {
      clearInterval(job.stallTimer);
      job.stallTimer = null;
      return;
    }
    const silentMs = Date.now() - job.lastLineAt;
    if (silentMs >= STALL_THRESHOLD_MS && !job.stalled) {
      job.stalled = true;
      const stallEntry = {
        time: Date.now(),
        text: `⚠️ ${Math.floor(silentMs / 1000)}秒間ログ出力がありません。プロセスが停滞している可能性があります。`,
        stream: 'system',
      };
      job.lines.push(stallEntry);
      for (const cb of job.listeners) {
        try { cb(stallEntry); } catch { /* ignore */ }
      }
    }
  }, STALL_CHECK_INTERVAL_MS);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    return res.end();
  }

  // Health check
  if (url.pathname === '/health') {
    return json(res, 200, { status: 'ok', cwd: PROJECT_DIR });
  }

  // 実行中ジョブの確認（UI再接続用）
  if (url.pathname === '/active') {
    const active = getActiveJob();
    if (active) {
      return json(res, 200, {
        id: active.id,
        type: active.type,
        label: active.label || '',
        status: active.status,
        startedAt: active.startedAt,
        lineCount: active.lines.length,
        routeType: active.routeType || null,
        stalled: active.stalled || false,
      });
    }
    return json(res, 200, null);
  }

  // ファイル一覧取得
  if (url.pathname === '/files') {
    const dir = url.searchParams.get('dir');
    const resolved = safePath(dir);
    if (!resolved) return json(res, 400, { error: 'Invalid path' });
    try {
      const entries = fs.readdirSync(resolved, { withFileTypes: true });
      const files = entries
        .filter(e => e.isFile())
        .map(e => ({ name: e.name, size: fs.statSync(path.join(resolved, e.name)).size }));
      return json(res, 200, { files });
    } catch {
      return json(res, 404, { error: 'Directory not found' });
    }
  }

  // ファイル内容取得
  if (url.pathname === '/file') {
    const filePath = url.searchParams.get('path');
    const resolved = safePath(filePath);
    if (!resolved) return json(res, 400, { error: 'Invalid path' });
    try {
      const stat = fs.statSync(resolved);
      const content = fs.readFileSync(resolved, 'utf-8');
      const name = path.basename(resolved);
      return json(res, 200, { name, content, size: stat.size, modified: stat.mtime.toISOString() });
    } catch {
      return json(res, 404, { error: 'File not found' });
    }
  }

  // ファイルメタ一括取得（パス配列 → サイズ・更新日時）
  if (url.pathname === '/file-meta' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { paths } = JSON.parse(body);
        const results = (paths || []).map(p => {
          const resolved = safePath(p);
          if (!resolved) return { path: p, error: 'invalid' };
          try {
            const stat = fs.statSync(resolved);
            const name = path.basename(resolved);
            // 説明: MDファイルは見出し、JSONはキー、その他は先頭行
            let description = '';
            try {
              const head = fs.readFileSync(resolved, 'utf-8').slice(0, 500);
              if (name.endsWith('.md')) {
                const h1 = head.match(/^#\s+(.+)/m);
                const h2 = head.match(/^##\s+(.+)/m);
                description = h1?.[1] || h2?.[1] || head.split('\n').find(l => l.trim()) || '';
              } else if (name.endsWith('.json')) {
                const parsed = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
                if (parsed.title) description = parsed.title;
                else if (parsed.theme) description = parsed.theme;
                else description = Object.keys(parsed).slice(0, 3).join(', ');
              } else {
                description = head.split('\n').find(l => l.trim()) || '';
              }
            } catch { /* ignore read errors */ }
            if (description.length > 80) description = description.slice(0, 77) + '...';
            return { path: p, name, size: stat.size, modified: stat.mtime.toISOString(), description };
          } catch {
            return { path: p, error: 'not found' };
          }
        });
        return json(res, 200, { files: results });
      } catch {
        return json(res, 400, { error: 'Invalid JSON body' });
      }
    });
    return;
  }

  // ── ジョブ中断 ────────────────────────────────────
  const abortMatch = url.pathname.match(/^\/abort\/(.+)$/);
  if (abortMatch && req.method === 'POST') {
    const id = abortMatch[1];
    const job = jobs.get(id);
    if (!job) return json(res, 404, { error: 'Job not found' });
    if (job.status !== 'running') return json(res, 400, { error: 'Job is not running' });
    abortJob(job, 'ユーザーによりジョブが中断されました');
    return json(res, 200, { ok: true, id });
  }

  // Execute command
  if (url.pathname === '/execute' && req.method === 'POST') {
    const body = await readBody(req);
    const { type, args } = body;

    // 多重実行防止: 実行中のジョブがあれば拒否し、既存ジョブIDを返す
    const active = getActiveJob();
    if (active) {
      return json(res, 409, {
        error: '既に実行中のジョブがあります',
        activeJobId: active.id,
        activeType: active.type,
        activeLabel: active.label || '',
        startedAt: active.startedAt,
      });
    }

    let cmd, cmdArgs;
    switch (type) {
      case 'company':
        cmd = './ai-company.sh';
        cmdArgs = [args.theme || ''];
        // 拡張パラメータがあれば環境変数で渡す
        if (args.depth) cmdArgs.push('--depth', args.depth);
        if (args.agents) cmdArgs.push('--agents', args.agents);
        if (args.model) cmdArgs.push('--model', args.model);
        if (args.maxTurns) cmdArgs.push('--max-turns', String(args.maxTurns));
        if (args.routeType) cmdArgs.push('--route', args.routeType);
        break;
      case 'mtg':
        cmd = './ai-mtg.sh';
        cmdArgs = [args.type || 'kickoff', args.agenda || '', String(args.rounds || 3), args.conflict || 'chair'];
        break;
      case 'escalation':
        cmd = './ai-escalation.sh';
        cmdArgs = [args.from || '', args.to || '', args.type || 'judgment', args.subject || '', args.context || ''];
        break;
      default:
        return json(res, 400, { error: 'Unknown type' });
    }

    const id = `job-${Date.now()}`;
    const label = args.theme || args.agenda || args.subject || '';
    const job = {
      id, type, label, status: 'running', startedAt: Date.now(),
      lines: [], listeners: new Set(),
      routeType: args.routeType || null,
      proc: null,
      timeoutTimer: null,
      stallTimer: null,
      lastLineAt: Date.now(),
      stalled: false,
    };
    jobs.set(id, job);

    const proc = spawn(cmd, cmdArgs, {
      cwd: PROJECT_DIR,
      shell: true,
      detached: true, // プロセスグループ作成（グループkill用）
      env: { ...process.env, FORCE_COLOR: '0' },
    });
    job.proc = proc;

    const push = (text, stream = 'stdout') => {
      const entry = { time: Date.now(), text, stream };
      job.lines.push(entry);
      job.lastLineAt = Date.now();
      if (job.stalled) job.stalled = false; // ログ再開で停滞解除
      for (const cb of job.listeners) {
        try { cb(entry); } catch { /* ignore */ }
      }
    };

    proc.stdout.on('data', d => {
      d.toString().split('\n').filter(Boolean).forEach(line => push(line));
    });
    proc.stderr.on('data', d => {
      d.toString().split('\n').filter(Boolean).forEach(line => push(line, 'stderr'));
    });
    proc.on('close', code => {
      finishJob(job, code === 0 ? 'done' : 'error', code !== 0 ? `プロセスが終了コード ${code} で終了しました` : undefined);
    });
    proc.on('error', err => {
      finishJob(job, 'error', `Error: ${err.message}`);
    });

    // タイムアウト設定
    job.timeoutTimer = setTimeout(() => {
      if (job.status === 'running') {
        console.log(`[relay] ジョブ ${id} がタイムアウト (${JOB_TIMEOUT_MS / 1000}秒)`);
        abortJob(job, `⏰ タイムアウト: ${Math.floor(JOB_TIMEOUT_MS / 60000)}分経過したためジョブを自動停止しました`);
      }
    }, JOB_TIMEOUT_MS);

    // 停滞チェック開始
    startStallCheck(job);

    return json(res, 200, { id });
  }

  // SSE stream
  const streamMatch = url.pathname.match(/^\/stream\/(.+)$/);
  if (streamMatch) {
    const id = streamMatch[1];
    const job = jobs.get(id);
    if (!job) return json(res, 404, { error: 'Job not found' });

    cors(res);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    // Send existing lines
    for (const entry of job.lines) {
      res.write(`data: ${JSON.stringify(entry)}\n\n`);
    }

    if (job.status !== 'running') {
      res.write(`data: ${JSON.stringify({ text: '__DONE__', stream: 'system' })}\n\n`);
      return res.end();
    }

    // Listen for new lines
    let closed = false;
    const listener = (entry) => {
      if (closed) return;
      try {
        res.write(`data: ${JSON.stringify(entry)}\n\n`);
        if (entry.text.startsWith('__STATUS__:')) {
          res.write(`data: ${JSON.stringify({ text: '__DONE__', stream: 'system' })}\n\n`);
          res.end();
          closed = true;
          job.listeners.delete(listener);
        }
      } catch (err) {
        // クライアント切断時のwrite errorを安全に処理
        closed = true;
        job.listeners.delete(listener);
      }
    };
    job.listeners.add(listener);
    req.on('close', () => { closed = true; job.listeners.delete(listener); });
    return;
  }

  // Job status
  if (url.pathname === '/jobs') {
    const list = [...jobs.values()].map(j => ({
      id: j.id, type: j.type, status: j.status,
      label: j.label || '',
      startedAt: j.startedAt, finishedAt: j.finishedAt,
      lineCount: j.lines.length,
      stalled: j.stalled || false,
    }));
    return json(res, 200, list);
  }

  json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`\n🏢 AI会社リレーサーバー起動`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   プロジェクト: ${PROJECT_DIR}`);
  console.log(`   タイムアウト: ${JOB_TIMEOUT_MS / 60000}分`);
  console.log(`   停滞検知: ${STALL_THRESHOLD_MS / 1000}秒`);
  console.log(`\n   UIから実行可能になりました。\n`);
});
