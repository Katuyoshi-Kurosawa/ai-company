import { useRef, useEffect, useCallback, useState } from 'react';

interface FileAttachment {
  name: string;
  content: string;  // テキストファイルの中身
  size: number;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  className?: string;
  onSubmit?: () => void;
  onFiles?: (files: FileAttachment[]) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export type { FileAttachment };

export function AutoTextarea({
  value,
  onChange,
  placeholder,
  minRows = 1,
  maxRows = 12,
  className = '',
  onSubmit,
  onFiles,
  disabled,
  autoFocus,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // 高さ自動調整
  const adjustHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = parseInt(getComputedStyle(el).lineHeight) || 20;
    const minH = lineHeight * minRows + 24; // padding分
    const maxH = lineHeight * maxRows + 24;
    const scrollH = el.scrollHeight;
    el.style.height = `${Math.min(Math.max(scrollH, minH), maxH)}px`;
  }, [minRows, maxRows]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // テキストファイル読み込み
  const readFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const attachments: FileAttachment[] = [];
    const textInserts: string[] = [];

    for (const file of files) {
      if (file.size > 1024 * 1024) continue; // 1MB上限

      try {
        const text = await file.text();
        if (onFiles) {
          attachments.push({ name: file.name, content: text, size: file.size });
        } else {
          // onFilesが未設定ならテキストを直接挿入
          textInserts.push(`--- ${file.name} ---\n${text}`);
        }
      } catch {
        // バイナリファイルはスキップ
      }
    }

    if (attachments.length > 0 && onFiles) {
      onFiles(attachments);
    }
    if (textInserts.length > 0) {
      const insert = textInserts.join('\n\n');
      const el = ref.current;
      if (el) {
        const pos = el.selectionStart;
        const before = value.slice(0, pos);
        const after = value.slice(pos);
        const sep = before && !before.endsWith('\n') ? '\n' : '';
        onChange(before + sep + insert + after);
      } else {
        onChange(value + (value ? '\n' : '') + insert);
      }
    }
  }, [value, onChange, onFiles]);

  // ペースト
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];

    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      readFiles(files);
    }
    // テキストペーストはデフォルト動作に任せる
  }, [readFiles]);

  // ドラッグ＆ドロップ
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      readFiles(e.dataTransfer.files);
    }
  }, [readFiles]);

  // キーボード: Cmd+Enter or Ctrl+Enter で送信
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSubmit?.();
    }
  }, [onSubmit]);

  return (
    <div
      className={`relative ${dragOver ? 'ring-2 ring-indigo-400/50' : ''} rounded-xl transition-all`}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`w-full resize-none overflow-y-auto bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm leading-relaxed
          focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/30 focus:outline-none
          placeholder:text-white/20 transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}`}
        style={{ minHeight: `${(parseInt(getComputedStyle(document.documentElement).fontSize) || 16) * 1.625 * minRows + 24}px` }}
      />
      {dragOver && (
        <div className="absolute inset-0 rounded-xl bg-indigo-500/10 border-2 border-dashed border-indigo-400/40 flex items-center justify-center pointer-events-none">
          <span className="text-sm text-indigo-300">ファイルをドロップ</span>
        </div>
      )}
    </div>
  );
}
