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
      <div className="relative bg-white rounded-lg px-2.5 py-1.5 shadow-lg shadow-black/20 border border-gray-200
        whitespace-nowrap max-w-[180px] truncate"
      >
        <span className="text-[11px] font-medium text-gray-800 leading-tight">{text}</span>
        {/* 吹き出しの三角 */}
        <div className={`absolute left-1/2 -translate-x-1/2 w-0 h-0
          ${isTop
            ? 'top-full border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-white'
            : 'bottom-full border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-white'
          }`}
        />
      </div>
    </div>
  );
}
