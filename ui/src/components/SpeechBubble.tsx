import { useEffect, useState } from 'react';

interface Props {
  text: string;
  position?: 'top' | 'bottom';
}

export function SpeechBubble({ text, position = 'top' }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // フェードイン
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const isTop = position === 'top';

  return (
    <div
      className={`absolute ${isTop ? 'bottom-full mb-1' : 'top-full mt-1'} left-1/2 -translate-x-1/2 z-30 pointer-events-none
        transition-all duration-300 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
    >
      <div className="relative rounded-lg px-3 py-2 shadow-lg whitespace-nowrap max-w-[200px] truncate"
        style={{
          background: 'linear-gradient(180deg, rgba(20,24,40,0.95), rgba(12,15,28,0.95))',
          border: '1.5px solid rgba(212,175,55,0.5)',
          boxShadow: '0 0 12px rgba(212,175,55,0.15), 0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        <span className="text-[11px] font-medium text-amber-50 leading-tight">{text}</span>
        {/* RPG風の吹き出し三角 */}
        <div className={`absolute left-1/2 -translate-x-1/2 w-0 h-0
          ${isTop
            ? 'top-full border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[rgba(20,24,40,0.95)]'
            : 'bottom-full border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-[rgba(20,24,40,0.95)]'
          }`}
        />
      </div>
    </div>
  );
}
