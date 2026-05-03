import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { getRoleColor } from '../../tokens/roles';

const avatar = cva(
  'inline-flex items-center justify-center rounded-full shrink-0 font-medium select-none',
  {
    variants: {
      size: {
        xs:  'w-6 h-6 text-sm',
        sm:  'w-8 h-8 text-base',
        md:  'w-10 h-10 text-lg',
        lg:  'w-14 h-14 text-2xl',
        xl:  'w-20 h-20 text-4xl',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

interface AvatarProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof avatar> {
  icon: string;
  agentId?: string;
  /** trueのとき左下にロールカラードットを表示 */
  showRoleDot?: boolean;
}

export function Avatar({ icon, agentId, size, showRoleDot, className, ...props }: AvatarProps) {
  const roleColor = agentId ? getRoleColor(agentId) : null;
  const bgColor = roleColor ? `${roleColor.primary}22` : 'rgba(99,102,241,0.1)';

  return (
    <span className="relative inline-flex shrink-0">
      <span
        className={avatar({ size, className })}
        style={{ background: bgColor }}
        {...props}
      >
        {icon}
      </span>
      {showRoleDot && roleColor && (
        <span
          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-current"
          style={{ background: roleColor.primary }}
          aria-hidden="true"
        />
      )}
    </span>
  );
}
