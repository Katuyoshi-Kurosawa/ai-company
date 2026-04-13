import type { Notification } from '../types';

interface Props {
  notifications: Notification[];
}

export function NotificationBar({ notifications }: Props) {
  const latest = notifications.slice(0, 3);
  if (latest.length === 0) return null;

  return (
    <div className="border-t border-white/10 px-4 py-2 space-y-1">
      {latest.map(n => (
        <div key={n.id} className="flex items-center gap-2 text-sm animate-[slideIn_0.3s_ease-out]">
          <span className="text-yellow-400">
            {n.type === 'levelup' ? '⬆️' : n.type === 'badge' ? '🏅' : n.type === 'consultation' ? '📨' : n.type === 'mtg' ? '📋' : '🔔'}
          </span>
          <span className="opacity-80">{n.message}</span>
        </div>
      ))}
    </div>
  );
}
