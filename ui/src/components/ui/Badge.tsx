import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const badge = cva(
  'inline-flex items-center gap-1 rounded-full font-medium tracking-wide',
  {
    variants: {
      variant: {
        default:  'bg-gray-500/20 text-gray-300',
        primary:  'bg-blue-500/20 text-blue-300',
        success:  'bg-green-500/20 text-green-300',
        warning:  'bg-amber-500/20 text-amber-300',
        error:    'bg-red-500/20 text-red-300',
        outline:  'border border-current bg-transparent',
      },
      size: {
        sm: 'text-[10px] px-1.5 py-0.5',
        md: 'text-xs px-2 py-0.5',
        lg: 'text-sm px-2.5 py-1',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  },
);

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badge> {}

export function Badge({ variant, size, className, children, ...props }: BadgeProps) {
  return (
    <span className={badge({ variant, size, className })} {...props}>
      {children}
    </span>
  );
}
