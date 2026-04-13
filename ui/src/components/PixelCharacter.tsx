import type { AgentVisual } from '../types';

interface Props {
  visual: AgentVisual;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  className?: string;
}

const SKIN = '#f5d0a9';

function hairPath(style: string, _gender: string): string {
  // Returns SVG path for hair based on style
  switch (style) {
    case 'short-back':
      return 'M14,8 C14,4 20,2 26,4 C32,6 34,10 34,12 L34,10 C34,4 28,0 24,0 C18,0 14,3 14,8Z';
    case 'short-side':
      return 'M12,10 C12,4 18,1 24,1 C30,1 36,4 36,10 L36,8 C36,2 30,-1 24,-1 C18,-1 12,2 12,8Z';
    case 'short-natural':
      return 'M13,10 C13,5 18,2 24,2 C30,2 35,5 35,10 L35,7 C35,2 30,-1 24,-1 C18,-1 13,2 13,7Z';
    case 'messy':
      return 'M11,12 C10,5 16,0 24,0 C32,0 38,5 37,12 L38,8 C39,2 32,-2 24,-2 C16,-2 9,2 10,8Z M14,4 L12,1 M32,3 L35,0 M22,1 L21,-2 M28,1 L30,-2';
    case 'long-straight':
      return 'M12,10 C12,4 18,1 24,1 C30,1 36,4 36,10 L36,8 C36,2 30,-1 24,-1 C18,-1 12,2 12,8Z M12,10 L10,28 L14,28 L14,10Z M36,10 L38,28 L34,28 L34,10Z';
    case 'long-wave':
      return 'M12,10 C12,4 18,1 24,1 C30,1 36,4 36,10 L36,8 C36,2 30,-1 24,-1 C18,-1 12,2 12,8Z M12,10 C10,16 12,22 10,28 L14,28 C14,22 12,16 14,10Z M36,10 C38,16 36,22 38,28 L34,28 C34,22 36,16 34,10Z';
    case 'medium-wave':
      return 'M12,10 C12,4 18,1 24,1 C30,1 36,4 36,10 L36,8 C36,2 30,-1 24,-1 C18,-1 12,2 12,8Z M12,10 C10,14 12,18 11,22 L15,22 C14,18 12,14 14,10Z M36,10 C38,14 36,18 37,22 L33,22 C34,18 36,14 34,10Z';
    case 'bob':
      return 'M12,10 C12,4 18,1 24,1 C30,1 36,4 36,10 L36,8 C36,2 30,-1 24,-1 C18,-1 12,2 12,8Z M12,10 L11,20 L15,20 L14,10Z M36,10 L37,20 L33,20 L34,10Z';
    case 'ponytail':
      return 'M12,10 C12,4 18,1 24,1 C30,1 36,4 36,10 L36,8 C36,2 30,-1 24,-1 C18,-1 12,2 12,8Z M34,6 C38,6 40,10 38,18 C37,22 36,26 35,28 L33,26 C34,22 35,18 36,14 C37,10 36,8 34,8Z';
    case 'updo':
      return 'M13,10 C13,4 18,1 24,1 C30,1 35,4 35,10 L35,6 C35,1 30,-2 24,-2 C18,-2 13,1 13,6Z M18,-2 C18,-6 24,-7 28,-5 C32,-3 30,0 26,0 C22,0 18,-1 18,-2Z';
    default:
      return 'M14,8 C14,4 20,2 26,4 C32,6 34,10 34,12 L34,10 C34,4 28,0 24,0 C18,0 14,3 14,8Z';
  }
}

function Accessory({ type }: { type: string }) {
  switch (type) {
    case 'glasses':
      return (
        <g>
          <circle cx="19" cy="13" r="3.5" fill="none" stroke="#555" strokeWidth="0.8" />
          <circle cx="29" cy="13" r="3.5" fill="none" stroke="#555" strokeWidth="0.8" />
          <line x1="22.5" y1="13" x2="25.5" y2="13" stroke="#555" strokeWidth="0.8" />
          <line x1="15.5" y1="13" x2="13" y2="12" stroke="#555" strokeWidth="0.6" />
          <line x1="32.5" y1="13" x2="35" y2="12" stroke="#555" strokeWidth="0.6" />
        </g>
      );
    case 'earring':
      return (
        <g>
          <circle cx="13" cy="16" r="1.2" fill="#d4a843" />
          <circle cx="35" cy="16" r="1.2" fill="#d4a843" />
        </g>
      );
    case 'necklace':
      return (
        <path d="M18,24 Q24,28 30,24" fill="none" stroke="#d4a843" strokeWidth="0.8" />
      );
    case 'scarf':
      return (
        <g>
          <path d="M17,22 Q24,26 31,22 L30,24 Q24,28 18,24Z" fill="#c04040" opacity="0.8" />
        </g>
      );
    case 'watch':
      return (
        <rect x="8" y="36" width="3" height="2" rx="0.5" fill="#888" stroke="#666" strokeWidth="0.3" />
      );
    case 'tie-pin':
      return (
        <g>
          <rect x="22.5" y="28" width="3" height="1" rx="0.5" fill="#d4a843" />
        </g>
      );
    default:
      return null;
  }
}

export function PixelCharacter({ visual, size = 'md', active = true, className = '' }: Props) {
  const scale = size === 'sm' ? 0.6 : size === 'md' ? 1 : 1.4;
  const w = Math.round(72 * scale);
  const h = Math.round(72 * scale);
  const isFemale = visual.gender === 'female';

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`} style={{ width: w, height: h + Math.round(20 * scale) }}>
      {/* Character + Desk SVG */}
      <svg
        viewBox="0 0 72 72"
        width={w}
        height={h}
        style={{ overflow: 'visible' }}
      >
        {/* Desk */}
        <rect x="6" y="50" width="60" height="4" rx="1" fill="#8B6F47" />
        <rect x="8" y="54" width="4" height="12" rx="0.5" fill="#7A5F3A" />
        <rect x="60" y="54" width="4" height="12" rx="0.5" fill="#7A5F3A" />
        {/* Desk surface items */}
        <rect x="12" y="47" width="14" height="3" rx="1" fill="#333" /> {/* keyboard */}
        <rect x="30" y="40" width="16" height="10" rx="1" fill="#2a2a3a" stroke="#444" strokeWidth="0.5" /> {/* monitor */}
        <rect x="36" y="50" width="4" height="2" fill="#444" /> {/* monitor stand */}
        {/* Monitor screen glow */}
        <rect x="31" y="41" width="14" height="7" rx="0.5" fill="#1a3a5a" opacity="0.8" />
        {active && (
          <rect x="31" y="41" width="14" height="7" rx="0.5" fill="#3b82f6" opacity="0.15">
            <animate attributeName="opacity" values="0.15;0.25;0.15" dur="3s" repeatCount="indefinite" />
          </rect>
        )}

        {/* Chair */}
        <rect x="16" y="52" width="20" height="3" rx="1.5" fill="#444" />
        <rect x="14" y="38" width="3" height="16" rx="1" fill="#3a3a3a" />

        {/* Body group with breathing animation */}
        <g>
          {active && (
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0;0,-0.5;0,0"
              dur="3s"
              repeatCount="indefinite"
            />
          )}

          {/* Body / Torso (sitting) */}
          <path
            d={isFemale
              ? 'M18,26 L18,44 Q18,48 22,48 L30,48 Q34,48 34,44 L34,26 Q34,22 26,22 Q18,22 18,26Z'
              : 'M16,26 L16,44 Q16,48 20,48 L32,48 Q36,48 36,44 L36,26 Q36,22 26,22 Q16,22 16,26Z'}
            fill={visual.suitColor}
          />
          {/* Shirt/collar */}
          <path d="M21,24 L24,28 L27,24" fill="none" stroke="#fff" strokeWidth="0.6" opacity="0.5" />
          {isFemale || (
            <line x1="24" y1="28" x2="24" y2="42" stroke="#fff" strokeWidth="0.4" opacity="0.3" />
          )}

          {/* Left arm */}
          <g>
            {active && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 14 32;-3 14 32;0 14 32;2 14 32;0 14 32"
                dur="1.5s"
                repeatCount="indefinite"
              />
            )}
            <path
              d={isFemale
                ? 'M18,28 L10,36 L12,42 L16,38 L18,34Z'
                : 'M16,28 L8,36 L10,42 L14,38 L16,34Z'}
              fill={visual.suitColor}
            />
            <circle cx={isFemale ? 11 : 9} cy="42" r="2.2" fill={SKIN} />
          </g>

          {/* Right arm */}
          <g>
            {active && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 38 32;2 38 32;0 38 32;-3 38 32;0 38 32"
                dur="1.8s"
                repeatCount="indefinite"
              />
            )}
            <path
              d={isFemale
                ? 'M34,28 L42,36 L40,42 L36,38 L34,34Z'
                : 'M36,28 L44,36 L42,42 L38,38 L36,34Z'}
              fill={visual.suitColor}
            />
            <circle cx={isFemale ? 41 : 43} cy="42" r="2.2" fill={SKIN} />
          </g>

          {/* Head */}
          <ellipse cx="24" cy="14" rx="11" ry="12" fill={SKIN} />

          {/* Eyes */}
          <g>
            {active ? (
              <>
                {/* Blinking eyes */}
                <ellipse cx="19" cy="14" rx="1.8" ry="2">
                  <animate attributeName="ry" values="2;2;2;0.3;2;2;2;2;2;2" dur="4s" repeatCount="indefinite" />
                </ellipse>
                <ellipse cx="29" cy="14" rx="1.8" ry="2">
                  <animate attributeName="ry" values="2;2;2;0.3;2;2;2;2;2;2" dur="4s" repeatCount="indefinite" />
                </ellipse>
                {/* Eye highlights */}
                <circle cx="19.8" cy="13.2" r="0.6" fill="#fff" />
                <circle cx="29.8" cy="13.2" r="0.6" fill="#fff" />
              </>
            ) : (
              <>
                {/* Closed eyes (inactive) */}
                <line x1="17" y1="14" x2="21" y2="14" stroke="#333" strokeWidth="0.8" strokeLinecap="round" />
                <line x1="27" y1="14" x2="31" y2="14" stroke="#333" strokeWidth="0.8" strokeLinecap="round" />
              </>
            )}
          </g>

          {/* Mouth */}
          {active ? (
            <path d="M22,18 Q24,20 26,18" fill="none" stroke="#c47" strokeWidth="0.7" />
          ) : (
            <line x1="22" y1="18.5" x2="26" y2="18.5" stroke="#999" strokeWidth="0.6" />
          )}

          {/* Cheek blush */}
          {isFemale && (
            <>
              <ellipse cx="16" cy="16" rx="2" ry="1.2" fill="#f5a0a0" opacity="0.3" />
              <ellipse cx="32" cy="16" rx="2" ry="1.2" fill="#f5a0a0" opacity="0.3" />
            </>
          )}

          {/* Hair */}
          <path d={hairPath(visual.hairStyle, visual.gender)} fill={visual.hairColor} />

          {/* Accessory */}
          <Accessory type={visual.accessory} />
        </g>
      </svg>
    </div>
  );
}
