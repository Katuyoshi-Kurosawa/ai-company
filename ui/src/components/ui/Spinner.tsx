import { cva, type VariantProps } from 'class-variance-authority';

const spinner = cva(
  'border-2 border-current border-t-transparent rounded-full animate-spin',
  {
    variants: {
      size: {
        sm: 'w-3 h-3',
        md: 'w-5 h-5',
        lg: 'w-8 h-8',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

interface SpinnerProps extends VariantProps<typeof spinner> {
  className?: string;
  label?: string;
}

export function Spinner({ size, className, label = 'Loading...' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className="inline-flex">
      <span className={spinner({ size, className })} />
    </span>
  );
}
