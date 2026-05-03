// プリミティブカラー — ハードコードする唯一の場所
export const PRIMITIVE = {
  blue: {
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
  },
  indigo: {
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
  },
  violet: {
    400: '#a78bfa',
    500: '#8b5cf6',
  },
  green: {
    400: '#4ade80',
    500: '#22c55e',
  },
  red: {
    400: '#f87171',
    500: '#ef4444',
  },
  amber: {
    400: '#fbbf24',
    500: '#f59e0b',
  },
  gray: {
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
} as const;

// セマンティックカラー（ライト・ダーク共通の意味）
export const SEMANTIC = {
  primary: PRIMITIVE.blue[500],
  primaryHover: PRIMITIVE.blue[600],
  success: PRIMITIVE.green[500],
  warning: PRIMITIVE.amber[500],
  error: PRIMITIVE.red[500],
  info: PRIMITIVE.indigo[500],
} as const;
