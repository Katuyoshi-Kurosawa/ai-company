import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const statusDot = cva(
  'rounded-full shrink-0',
  {
    variants: {
      status: {
        active:  'bg-green-400',
        idle:    'bg-gray-400',
        running: 'bg-indigo-400 animate-pulse',
        error:   'bg-red-400',
        warning: 'bg-amber-400',
      },
      size: {
        sm: 'w-1.5 h-1.5',
        md: 'w-2 h-2',
        lg: 'w-3 h-3',
      },
    },
    defaultVariants: {
      status: 'idle',
      size: 'md',
    },
  },
);

export type StatusType = 'active' | 'idle' | 'running' | 'error' | 'warning';

interface StatusDotProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof statusDot> {
  status: StatusType;
}

export function StatusDot({ status, size, className, ...props }: StatusDotProps) {
  return (
    <span
      className={statusDot({ status, size, className })}
      aria-label={status}
      role="status"
      {...props}
    />
  );
}
