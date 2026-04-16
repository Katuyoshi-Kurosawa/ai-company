import { useMemo } from 'react';

interface Props {
  content: string;
  className?: string;
}

// シンプルなMarkdownレンダラー（外部ライブラリ不使用）
export function MarkdownViewer({ content, className = '' }: Props) {
  const rendered = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div className={`markdown-viewer space-y-2 text-sm leading-relaxed ${className}`}>
      {rendered}
      <style>{`
        .markdown-viewer h1 { font-size: 1.5rem; font-weight: 800; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #e2e8f0; }
        .markdown-viewer h2 { font-size: 1.25rem; font-weight: 700; margin-top: 1.25rem; margin-bottom: 0.5rem; color: #e2e8f0; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.25rem; }
        .markdown-viewer h3 { font-size: 1.1rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.25rem; color: #cbd5e1; }
        .markdown-viewer h4 { font-size: 1rem; font-weight: 600; margin-top: 0.75rem; color: #94a3b8; }
        .markdown-viewer p { margin: 0.5rem 0; color: #cbd5e1; }
        .markdown-viewer ul, .markdown-viewer ol { padding-left: 1.5rem; margin: 0.5rem 0; color: #cbd5e1; }
        .markdown-viewer li { margin: 0.25rem 0; }
        .markdown-viewer ul { list-style-type: disc; }
        .markdown-viewer ol { list-style-type: decimal; }
        .markdown-viewer blockquote { border-left: 3px solid #6366f1; padding: 0.5rem 1rem; margin: 0.5rem 0; background: rgba(99,102,241,0.08); border-radius: 0 0.375rem 0.375rem 0; color: #a5b4fc; }
        .markdown-viewer hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 1rem 0; }
        .markdown-viewer code.inline { background: rgba(255,255,255,0.1); padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.85em; color: #f0abfc; }
        .markdown-viewer pre { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; padding: 0.75rem 1rem; overflow-x: auto; margin: 0.75rem 0; }
        .markdown-viewer pre code { color: #a5f3fc; font-size: 0.85em; }
        .markdown-viewer table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; font-size: 0.85rem; }
        .markdown-viewer th { background: rgba(255,255,255,0.08); padding: 0.5rem 0.75rem; text-align: left; font-weight: 600; border: 1px solid rgba(255,255,255,0.1); color: #e2e8f0; }
        .markdown-viewer td { padding: 0.5rem 0.75rem; border: 1px solid rgba(255,255,255,0.08); color: #cbd5e1; }
        .markdown-viewer tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .markdown-viewer strong { font-weight: 700; color: #f1f5f9; }
        .markdown-viewer em { font-style: italic; color: #94a3b8; }
      `}</style>
    </div>
  );
}

function renderMarkdown(md: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const lines = md.split('\n');
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // コードブロック
    if (line.trimStart().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // 閉じ```をスキップ
      nodes.push(<pre key={key++}><code>{codeLines.join('\n')}</code></pre>);
      continue;
    }

    // 空行
    if (line.trim() === '') {
      i++;
      continue;
    }

    // 水平線
    if (/^---+$|^\*\*\*+$|^___+$/.test(line.trim())) {
      nodes.push(<hr key={key++} />);
      i++;
      continue;
    }

    // 見出し
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = inlineFormat(headingMatch[2]);
      if (level === 1) nodes.push(<h1 key={key++}>{content}</h1>);
      else if (level === 2) nodes.push(<h2 key={key++}>{content}</h2>);
      else if (level === 3) nodes.push(<h3 key={key++}>{content}</h3>);
      else if (level === 4) nodes.push(<h4 key={key++}>{content}</h4>);
      else nodes.push(<h4 key={key++}>{content}</h4>);
      i++;
      continue;
    }

    // テーブル
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:]*-+/.test(lines[i + 1])) {
      const tableLines: string[] = [line];
      i++;
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      nodes.push(renderTable(tableLines, key++));
      continue;
    }

    // 引用
    if (line.trimStart().startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith('> ')) {
        quoteLines.push(lines[i].replace(/^>\s*/, ''));
        i++;
      }
      nodes.push(
        <blockquote key={key++}>
          {quoteLines.map((ql, qi) => <p key={qi}>{inlineFormat(ql)}</p>)}
        </blockquote>
      );
      continue;
    }

    // リスト（箇条書き）
    if (/^\s*[-*]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      nodes.push(
        <ul key={key++}>
          {listItems.map((item, li) => <li key={li}>{inlineFormat(item)}</li>)}
        </ul>
      );
      continue;
    }

    // 番号付きリスト
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      nodes.push(
        <ol key={key++}>
          {listItems.map((item, li) => <li key={li}>{inlineFormat(item)}</li>)}
        </ol>
      );
      continue;
    }

    // 通常のパラグラフ
    nodes.push(<p key={key++}>{inlineFormat(line)}</p>);
    i++;
  }

  return nodes;
}

function inlineFormat(text: string): React.ReactNode {
  // インラインコード → 太字 → 斜体 → テキスト
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let pKey = 0;

  while (remaining.length > 0) {
    // インラインコード
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(<span key={pKey++}>{formatBoldItalic(codeMatch[1])}</span>);
      parts.push(<code key={pKey++} className="inline">{codeMatch[2]}</code>);
      remaining = codeMatch[3];
      continue;
    }
    // 残り全部
    parts.push(<span key={pKey++}>{formatBoldItalic(remaining)}</span>);
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function formatBoldItalic(text: string): React.ReactNode {
  // **bold** と *italic*
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let pKey = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)$/);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(boldMatch[1]);
      parts.push(<strong key={pKey++}>{boldMatch[2]}</strong>);
      remaining = boldMatch[3];
      continue;
    }
    const italicMatch = remaining.match(/^(.*?)\*(.+?)\*(.*)$/);
    if (italicMatch) {
      if (italicMatch[1]) parts.push(italicMatch[1]);
      parts.push(<em key={pKey++}>{italicMatch[2]}</em>);
      remaining = italicMatch[3];
      continue;
    }
    parts.push(remaining);
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function renderTable(lines: string[], key: number): React.ReactNode {
  const parseRow = (line: string) =>
    line.split('|').map(c => c.trim()).filter(c => c.length > 0);

  const headers = parseRow(lines[0]);
  // lines[1] はセパレータ行 (---|---)、スキップ
  const rows = lines.slice(2).map(parseRow);

  return (
    <table key={key}>
      <thead>
        <tr>
          {headers.map((h, i) => <th key={i}>{inlineFormat(h)}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {headers.map((_, ci) => <td key={ci}>{inlineFormat(row[ci] || '')}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
