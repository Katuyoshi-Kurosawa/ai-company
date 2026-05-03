interface BreadcrumbItem {
  label: string;
  icon?: string;
  onClick?: () => void;
}

interface Props {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: Props) {
  return (
    <nav
      aria-label="パンくずナビゲーション"
      className="flex items-center gap-1 px-6 py-1.5 text-xs border-b shrink-0"
      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && (
            <span className="opacity-20 mx-0.5 select-none">/</span>
          )}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="flex items-center gap-1 opacity-50 hover:opacity-90 transition-opacity cursor-pointer rounded px-1 py-0.5 hover:bg-white/5"
            >
              {item.icon && <span>{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ) : (
            <span className="flex items-center gap-1 opacity-80 font-medium px-1 py-0.5">
              {item.icon && <span>{item.icon}</span>}
              <span>{item.label}</span>
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
