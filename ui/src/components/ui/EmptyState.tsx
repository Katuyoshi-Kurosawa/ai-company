import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon = '📭', title, description, action, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-12 text-center ${className ?? ''}`}>
      <div className="text-4xl opacity-40">{icon}</div>
      <div className="font-medium opacity-60 text-sm">{title}</div>
      {description && (
        <div className="text-xs opacity-40 max-w-xs">{description}</div>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
