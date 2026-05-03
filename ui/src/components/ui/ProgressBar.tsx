import { type HTMLAttributes } from 'react';

interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;   // 0-100
  max?: number;
  color?: string;
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = { sm: 'h-1', md: 'h-2', lg: 'h-3' } as const;

export function ProgressBar({
  value,
  max = 100,
  color = '#6366f1',
  label,
  showValue,
  size = 'md',
  className,
  ...props
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={className} {...props}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-[10px] uppercase tracking-wider opacity-60">{label}</span>}
          {showValue && <span className="text-[10px] font-mono opacity-60">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        className={`w-full rounded-full overflow-hidden bg-white/10 ${SIZE_MAP[size]}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
