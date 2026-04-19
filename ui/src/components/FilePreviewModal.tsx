import { useState, useEffect, useCallback } from 'react';
import { MarkdownViewer } from './MarkdownViewer';

const RELAY_URL = 'http://localhost:3939';

interface Props {
  filePath: string;   // e.g. "./output/20260416_020727/deliverable.md"
  onClose: () => void;
}

export function FilePreviewModal({ filePath, onClose }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const cleanPath = filePath.replace(/[`'"]/g, '');
  const fileName = cleanPath.split('/').pop() || cleanPath;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${RELAY_URL}/file?path=${encodeURIComponent(cleanPath)}`);
        if (!res.ok) throw new Error('ファイルを読み込めませんでした');
        const data = await res.json();
        setContent(data.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : '読み込みエラー');
      } finally {
        setLoading(false);
      }
    })();
  }, [filePath]);

  // ESCで閉じる
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleCopy = useCallback(async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: 'rgba(15,23,42,0.97)', border: '1px solid rgba(99,102,241,0.3)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <span className="text-lg">
            {fileName.endsWith('.md') ? '📝' : fileName.endsWith('.json') ? '📊' : fileName.endsWith('.html') ? '🌐' : fileName.endsWith('.sql') ? '🗄️' : '📄'}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">{fileName}</div>
            <div className="text-[10px] text-white/40 font-mono truncate">{filePath}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!content}
              className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all disabled:opacity-30"
              style={{
                background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.15)',
                color: copied ? '#4ade80' : '#a5b4fc',
                border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)'}`,
              }}>
              {copied ? 'コピーしました' : 'コピー'}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer transition-colors text-lg">
              &times;
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-3">
                <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-white/50">読み込み中...</p>
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-3">
                <span className="text-4xl block">⚠️</span>
                <p className="text-sm text-red-400">{error}</p>
                <p className="text-xs text-white/40">リレーサーバーが起動していることを確認してください</p>
              </div>
            </div>
          )}
          {content !== null && !loading && (
            fileName.endsWith('.md') ? (
              <MarkdownViewer content={content} />
            ) : (
              <pre className="text-xs text-green-300/80 font-mono whitespace-pre-wrap break-all">
                {content}
              </pre>
            )
          )}
        </div>
      </div>
    </div>
  );
}
