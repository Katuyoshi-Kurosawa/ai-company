#!/usr/bin/env node
// ============================================================
// AI会社 ローカルリレーサーバー
// UIからCLIコマンドを実行し、SSEでリアルタイム出力を返す
// Usage: node relay.js [port]
// ============================================================

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = Number(process.argv[2]) || 3939;
const PROJECT_DIR = __dirname;
const jobs = new Map();

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

  // Execute command
  if (url.pathname === '/execute' && req.method === 'POST') {
    const body = await readBody(req);
    const { type, args } = body;

    let cmd, cmdArgs;
    switch (type) {
      case 'company':
        cmd = './ai-company.sh';
        cmdArgs = [args.theme || ''];
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
    const job = {
      id, type, status: 'running', startedAt: Date.now(),
      lines: [], listeners: new Set(),
    };
    jobs.set(id, job);

    const proc = spawn(cmd, cmdArgs, {
      cwd: PROJECT_DIR,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    const push = (text, stream = 'stdout') => {
      const entry = { time: Date.now(), text, stream };
      job.lines.push(entry);
      for (const cb of job.listeners) cb(entry);
    };

    proc.stdout.on('data', d => {
      d.toString().split('\n').filter(Boolean).forEach(line => push(line));
    });
    proc.stderr.on('data', d => {
      d.toString().split('\n').filter(Boolean).forEach(line => push(line, 'stderr'));
    });
    proc.on('close', code => {
      job.status = code === 0 ? 'done' : 'error';
      job.exitCode = code;
      job.finishedAt = Date.now();
      push(`__STATUS__:${job.status}`, 'system');
    });
    proc.on('error', err => {
      job.status = 'error';
      push(`Error: ${err.message}`, 'stderr');
      push('__STATUS__:error', 'system');
    });

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
    const listener = (entry) => {
      res.write(`data: ${JSON.stringify(entry)}\n\n`);
      if (entry.text.startsWith('__STATUS__:')) {
        res.write(`data: ${JSON.stringify({ text: '__DONE__', stream: 'system' })}\n\n`);
        res.end();
        job.listeners.delete(listener);
      }
    };
    job.listeners.add(listener);
    req.on('close', () => job.listeners.delete(listener));
    return;
  }

  // Job status
  if (url.pathname === '/jobs') {
    const list = [...jobs.values()].map(j => ({
      id: j.id, type: j.type, status: j.status,
      startedAt: j.startedAt, finishedAt: j.finishedAt,
      lineCount: j.lines.length,
    }));
    return json(res, 200, list);
  }

  json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`\n🏢 AI会社リレーサーバー起動`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   プロジェクト: ${PROJECT_DIR}`);
  console.log(`\n   UIから実行可能になりました。\n`);
});
