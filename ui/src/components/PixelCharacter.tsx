import type { AgentVisual } from '../types';

interface Props {
  visual: AgentVisual;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  className?: string;
}

const SKIN = '#ffe0c2';
const SKIN_SHADOW = '#f0c8a0';

/* ---- Chibi hair ---- */
function Hair({ style, color }: { style: string; color: string; gender: string }) {
  const dark = color;
  // Slightly lighter highlight
  const hi = color + '99';

  switch (style) {
    case 'short-back':
      return (
        <g>
          <ellipse cx="40" cy="18" rx="20" ry="17" fill={dark} />
          <ellipse cx="40" cy="12" rx="17" ry="10" fill={hi} />
        </g>
      );
    case 'short-side':
      return (
        <g>
          <ellipse cx="40" cy="18" rx="21" ry="18" fill={dark} />
          <path d="M22,22 Q20,28 22,32" stroke={dark} strokeWidth="3" fill="none" />
          <path d="M58,22 Q60,28 58,32" stroke={dark} strokeWidth="3" fill="none" />
          <ellipse cx="40" cy="12" rx="16" ry="9" fill={hi} />
        </g>
      );
    case 'short-natural':
      return (
        <g>
          <ellipse cx="40" cy="17" rx="20" ry="16" fill={dark} />
          <path d="M25,14 Q30,6 40,5 Q50,6 55,14" fill={hi} />
          <path d="M34,5 Q36,1 40,2" stroke={dark} strokeWidth="1.5" fill="none" />
        </g>
      );
    case 'messy':
      return (
        <g>
          <ellipse cx="40" cy="17" rx="22" ry="18" fill={dark} />
          {/* Spiky bits */}
          <path d="M22,12 L18,4 L26,10Z" fill={dark} />
          <path d="M55,10 L62,3 L56,12Z" fill={dark} />
          <path d="M35,4 L33,-2 L38,3Z" fill={dark} />
          <path d="M45,4 L48,-1 L47,5Z" fill={dark} />
          <path d="M28,7 L24,1 L30,6Z" fill={dark} />
          <ellipse cx="40" cy="12" rx="15" ry="8" fill={hi} />
        </g>
      );
    case 'long-straight':
      return (
        <g>
          <ellipse cx="40" cy="17" rx="21" ry="17" fill={dark} />
          {/* Long side hair with sway */}
          <g>
            <animateTransform attributeName="transform" type="rotate" values="0 20 20;1 20 20;0 20 20;-1 20 20;0 20 20" dur="4s" repeatCount="indefinite" />
            <path d="M20,20 Q18,35 19,52 L24,52 Q24,35 23,20Z" fill={dark} />
          </g>
          <g>
            <animateTransform attributeName="transform" type="rotate" values="0 60 20;-1 60 20;0 60 20;1 60 20;0 60 20" dur="4.5s" repeatCount="indefinite" />
            <path d="M57,20 Q59,35 58,52 L53,52 Q53,35 55,20Z" fill={dark} />
          </g>
          <ellipse cx="40" cy="12" rx="16" ry="9" fill={hi} />
        </g>
      );
    case 'long-wave':
      return (
        <g>
          <ellipse cx="40" cy="17" rx="21" ry="17" fill={dark} />
          <g>
            <animateTransform attributeName="transform" type="rotate" values="0 20 20;2 20 20;0 20 20;-2 20 20;0 20 20" dur="3.5s" repeatCount="indefinite" />
            <path d="M20,20 C17,30 22,38 18,48 C16,52 20,54 22,50 C24,44 20,36 23,26Z" fill={dark} />
          </g>
          <g>
            <animateTransform attributeName="transform" type="rotate" values="0 60 20;-2 60 20;0 60 20;2 60 20;0 60 20" dur="4s" repeatCount="indefinite" />
            <path d="M58,20 C61,30 56,38 60,48 C62,52 58,54 56,50 C54,44 58,36 55,26Z" fill={dark} />
          </g>
          <ellipse cx="40" cy="12" rx="16" ry="9" fill={hi} />
        </g>
      );
    case 'medium-wave':
      return (
        <g>
          <ellipse cx="40" cy="17" rx="21" ry="17" fill={dark} />
          <g>
            <animateTransform attributeName="transform" type="rotate" values="0 22 22;1.5 22 22;0 22 22;-1.5 22 22;0 22 22" dur="3s" repeatCount="indefinite" />
            <path d="M20,22 C18,28 22,34 20,40 L25,38 C24,32 20,28 22,22Z" fill={dark} />
          </g>
          <g>
            <animateTransform attributeName="transform" type="rotate" values="0 58 22;-1.5 58 22;0 58 22;1.5 58 22;0 58 22" dur="3.5s" repeatCount="indefinite" />
            <path d="M58,22 C60,28 56,34 58,40 L53,38 C54,32 58,28 56,22Z" fill={dark} />
          </g>
          <ellipse cx="40" cy="12" rx="16" ry="9" fill={hi} />
        </g>
      );
    case 'bob':
      return (
        <g>
          <ellipse cx="40" cy="17" rx="21" ry="17" fill={dark} />
          <g>
            <animateTransform attributeName="transform" type="rotate" values="0 40 20;0.5 40 20;0 40 20;-0.5 40 20;0 40 20" dur="3s" repeatCount="indefinite" />
            <path d="M19,20 Q18,30 20,36 L25,34 Q24,28 22,20Z" fill={dark} />
            <path d="M61,20 Q62,30 60,36 L55,34 Q56,28 58,20Z" fill={dark} />
          </g>
          <ellipse cx="40" cy="11" rx="16" ry="9" fill={hi} />
        </g>
      );
    case 'ponytail':
      return (
        <g>
          <ellipse cx="40" cy="17" rx="20" ry="16" fill={dark} />
          {/* Ponytail with bounce */}
          <g>
            <animateTransform attributeName="transform" type="rotate" values="0 55 14;5 55 14;0 55 14;-3 55 14;0 55 14" dur="2.5s" repeatCount="indefinite" />
            <path d="M55,14 Q62,16 60,28 Q58,38 55,44 Q54,38 56,28 Q57,20 54,16Z" fill={dark} />
            <circle cx="55" cy="14" r="3" fill={dark} />
          </g>
          <ellipse cx="40" cy="12" rx="16" ry="9" fill={hi} />
        </g>
      );
    case 'updo':
      return (
        <g>
          <ellipse cx="40" cy="17" rx="20" ry="16" fill={dark} />
          {/* Bun on top */}
          <circle cx="40" cy="2" r="7" fill={dark} />
          <circle cx="40" cy="2" r="5" fill={hi} />
          <ellipse cx="40" cy="12" rx="15" ry="8" fill={hi} />
        </g>
      );
    default:
      return (
        <g>
          <ellipse cx="40" cy="17" rx="20" ry="16" fill={dark} />
          <ellipse cx="40" cy="12" rx="16" ry="9" fill={hi} />
        </g>
      );
  }
}

/* ---- Accessories ---- */
function Accessory({ type }: { type: string }) {
  switch (type) {
    case 'glasses':
      return (
        <g>
          <rect x="28" y="22" width="9" height="7" rx="2" fill="none" stroke="#7089b0" strokeWidth="1.2" />
          <rect x="43" y="22" width="9" height="7" rx="2" fill="none" stroke="#7089b0" strokeWidth="1.2" />
          <line x1="37" y1="25" x2="43" y2="25" stroke="#7089b0" strokeWidth="1" />
          <line x1="28" y1="25" x2="24" y2="23" stroke="#7089b0" strokeWidth="0.8" />
          <line x1="52" y1="25" x2="56" y2="23" stroke="#7089b0" strokeWidth="0.8" />
          {/* Lens shine */}
          <line x1="30" y1="23.5" x2="32" y2="23.5" stroke="#fff" strokeWidth="0.6" opacity="0.5" />
          <line x1="45" y1="23.5" x2="47" y2="23.5" stroke="#fff" strokeWidth="0.6" opacity="0.5" />
        </g>
      );
    case 'earring':
      return (
        <g>
          <circle cx="22" cy="32" r="2" fill="#ffd700" opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.6;0.9" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="58" cy="32" r="2" fill="#ffd700" opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.6;0.9" dur="2.3s" repeatCount="indefinite" />
          </circle>
        </g>
      );
    case 'necklace':
      return (
        <g>
          <path d="M32,38 Q40,44 48,38" fill="none" stroke="#ffd700" strokeWidth="1.2" />
          <circle cx="40" cy="42" r="2" fill="#ff69b4">
            <animate attributeName="r" values="2;2.3;2" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>
      );
    case 'scarf':
      return (
        <g>
          <path d="M30,38 Q40,44 50,38 L48,42 Q40,48 32,42Z" fill="#e74c6f" opacity="0.85" />
          <path d="M38,42 L36,52 L40,50 L42,52 L40,42" fill="#e74c6f" opacity="0.7">
            <animateTransform attributeName="transform" type="rotate" values="0 40 42;3 40 42;0 40 42;-3 40 42;0 40 42" dur="4s" repeatCount="indefinite" />
          </path>
        </g>
      );
    case 'watch':
      return (
        <g>
          <rect x="14" y="56" width="5" height="3.5" rx="1" fill="#b0b0b0" stroke="#888" strokeWidth="0.5" />
          <circle cx="16.5" cy="57.8" r="1" fill="#333" />
        </g>
      );
    case 'tie-pin':
      return (
        <g>
          <rect x="38" y="44" width="4" height="1.5" rx="0.5" fill="#ffd700" />
          <circle cx="40" cy="44.8" r="0.8" fill="#fff" opacity="0.6" />
        </g>
      );
    default:
      return null;
  }
}

/* ---- Big sparkly anime eyes ---- */
function Eyes({ active, isFemale }: { active: boolean; isFemale: boolean }) {
  if (!active) {
    // Sleeping zzz
    return (
      <g>
        <path d="M29,24 Q32,22 35,24" stroke="#888" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M45,24 Q48,22 51,24" stroke="#888" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <text x="56" y="16" fontSize="6" fill="#88a" opacity="0.6">z</text>
        <text x="60" y="12" fontSize="5" fill="#88a" opacity="0.4">z</text>
      </g>
    );
  }

  const eyeColor = isFemale ? '#4a90d9' : '#2c3e50';

  return (
    <g>
      {/* Left eye */}
      <g>
        <ellipse cx="32" cy="25" rx="5" ry="5.5" fill="#fff">
          <animate attributeName="ry" values="5.5;5.5;5.5;5.5;0.8;5.5;5.5;5.5;5.5;5.5;5.5;5.5" dur="5s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="32" cy="25.5" rx="3.5" ry="4" fill={eyeColor}>
          <animate attributeName="ry" values="4;4;4;4;0.5;4;4;4;4;4;4;4" dur="5s" repeatCount="indefinite" />
        </ellipse>
        <circle cx="32" cy="25" r="2" fill="#111">
          <animate attributeName="r" values="2;2;2;2;0.3;2;2;2;2;2;2;2" dur="5s" repeatCount="indefinite" />
        </circle>
        {/* Sparkle highlights */}
        <circle cx="34" cy="23" r="1.3" fill="#fff" opacity="0.9" />
        <circle cx="30.5" cy="27" r="0.7" fill="#fff" opacity="0.6" />
      </g>
      {/* Right eye */}
      <g>
        <ellipse cx="48" cy="25" rx="5" ry="5.5" fill="#fff">
          <animate attributeName="ry" values="5.5;5.5;5.5;5.5;0.8;5.5;5.5;5.5;5.5;5.5;5.5;5.5" dur="5s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="48" cy="25.5" rx="3.5" ry="4" fill={eyeColor}>
          <animate attributeName="ry" values="4;4;4;4;0.5;4;4;4;4;4;4;4" dur="5s" repeatCount="indefinite" />
        </ellipse>
        <circle cx="48" cy="25" r="2" fill="#111">
          <animate attributeName="r" values="2;2;2;2;0.3;2;2;2;2;2;2;2" dur="5s" repeatCount="indefinite" />
        </circle>
        <circle cx="50" cy="23" r="1.3" fill="#fff" opacity="0.9" />
        <circle cx="46.5" cy="27" r="0.7" fill="#fff" opacity="0.6" />
      </g>
      {/* Blush cheeks */}
      <ellipse cx="25" cy="29" rx="4" ry="2.2" fill="#ff9999" opacity="0.35">
        <animate attributeName="opacity" values="0.35;0.5;0.35" dur="3s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="55" cy="29" rx="4" ry="2.2" fill="#ff9999" opacity="0.35">
        <animate attributeName="opacity" values="0.35;0.5;0.35" dur="3.5s" repeatCount="indefinite" />
      </ellipse>
    </g>
  );
}

/* ---- Main component ---- */
export function PixelCharacter({ visual, size = 'md', active = true, className = '' }: Props) {
  const scale = size === 'sm' ? 0.55 : size === 'md' ? 0.9 : 1.3;
  const w = Math.round(80 * scale);
  const h = Math.round(100 * scale);
  const isFemale = visual.gender === 'female';

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`} style={{ width: w, height: h }}>
      <svg viewBox="0 0 80 100" width={w} height={h} style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id="deskGrad" cx="50%" cy="30%">
            <stop offset="0%" stopColor="#a08060" />
            <stop offset="100%" stopColor="#6b4f35" />
          </radialGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.2" />
          </filter>
        </defs>

        {/* === Desk === */}
        <rect x="5" y="74" width="70" height="5" rx="2" fill="url(#deskGrad)" />
        <rect x="10" y="79" width="4" height="14" rx="1" fill="#6b4f35" />
        <rect x="66" y="79" width="4" height="14" rx="1" fill="#6b4f35" />
        {/* Keyboard */}
        <rect x="14" y="70" width="18" height="4" rx="1.5" fill="#444" />
        <rect x="15" y="71" width="3" height="1.5" rx="0.3" fill="#666" />
        <rect x="19" y="71" width="3" height="1.5" rx="0.3" fill="#666" />
        <rect x="23" y="71" width="3" height="1.5" rx="0.3" fill="#666" />
        <rect x="27" y="71" width="3" height="1.5" rx="0.3" fill="#666" />
        {/* Monitor */}
        <rect x="38" y="58" width="22" height="16" rx="2" fill="#2a2a3a" stroke="#555" strokeWidth="0.6" />
        <rect x="39.5" y="59.5" width="19" height="12" rx="1" fill="#1a2a40" />
        <rect x="47" y="74" width="6" height="3" fill="#444" />
        {/* Screen glow */}
        {active && (
          <>
            <rect x="39.5" y="59.5" width="19" height="12" rx="1" fill="#4488cc" opacity="0.12">
              <animate attributeName="opacity" values="0.12;0.22;0.12" dur="2.5s" repeatCount="indefinite" />
            </rect>
            {/* Code lines on screen */}
            <rect x="41" y="62" width="10" height="1" rx="0.5" fill="#6af" opacity="0.3" />
            <rect x="41" y="64.5" width="14" height="1" rx="0.5" fill="#8f8" opacity="0.2" />
            <rect x="41" y="67" width="8" height="1" rx="0.5" fill="#fa8" opacity="0.25" />
          </>
        )}

        {/* === Chair === */}
        <path d="M20,76 Q22,80 24,76" fill="#555" />
        <path d="M56,76 Q58,80 60,76" fill="#555" />
        <rect x="18" y="56" width="4" height="22" rx="1.5" fill="#484848" />

        {/* === Character body group === */}
        <g filter="url(#shadow)">
          {/* Breathing bounce */}
          {active && (
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0;0,-1;0,0"
              dur="3s"
              repeatCount="indefinite"
            />
          )}

          {/* Body / torso */}
          <path
            d={isFemale
              ? 'M30,40 Q30,36 34,35 L46,35 Q50,36 50,40 L50,68 Q50,72 46,72 L34,72 Q30,72 30,68Z'
              : 'M28,40 Q28,36 32,35 L48,35 Q52,36 52,40 L52,68 Q52,72 48,72 L32,72 Q28,72 28,68Z'}
            fill={visual.suitColor}
          />
          {/* Collar / shirt V */}
          <path d="M36,37 L40,44 L44,37" fill="#fff" opacity="0.15" />
          <path d="M36,37 L40,44 L44,37" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.4" />

          {/* Left arm with typing animation */}
          <g>
            {active && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 28 50;-4 28 50;0 28 50;3 28 50;0 28 50"
                dur="1.2s"
                repeatCount="indefinite"
              />
            )}
            <path
              d={isFemale
                ? 'M30,42 L20,54 L22,60 L28,56 L30,48Z'
                : 'M28,42 L16,54 L18,62 L26,56 L28,48Z'}
              fill={visual.suitColor}
            />
            {/* Hand */}
            <circle cx={isFemale ? 21 : 17} cy={isFemale ? 60 : 62} r="3" fill={SKIN} />
          </g>

          {/* Right arm with typing animation */}
          <g>
            {active && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 52 50;3 52 50;0 52 50;-4 52 50;0 52 50"
                dur="1.4s"
                repeatCount="indefinite"
              />
            )}
            <path
              d={isFemale
                ? 'M50,42 L60,54 L58,60 L52,56 L50,48Z'
                : 'M52,42 L64,54 L62,62 L54,56 L52,48Z'}
              fill={visual.suitColor}
            />
            <circle cx={isFemale ? 59 : 63} cy={isFemale ? 60 : 62} r="3" fill={SKIN} />
          </g>

          {/* === Head (big chibi head!) === */}
          {/* Head shadow */}
          <ellipse cx="40" cy="24" rx="19" ry="20" fill={SKIN_SHADOW} />
          {/* Head main */}
          <ellipse cx="40" cy="23" rx="19" ry="20" fill={SKIN} />

          {/* Ears */}
          <ellipse cx="21" cy="26" rx="3" ry="4" fill={SKIN} />
          <ellipse cx="21" cy="26" rx="2" ry="3" fill={SKIN_SHADOW} />
          <ellipse cx="59" cy="26" rx="3" ry="4" fill={SKIN} />
          <ellipse cx="59" cy="26" rx="2" ry="3" fill={SKIN_SHADOW} />

          {/* Eyes */}
          <Eyes active={active} isFemale={isFemale} />

          {/* Nose - tiny dot */}
          <ellipse cx="40" cy="30" rx="1" ry="0.6" fill={SKIN_SHADOW} />

          {/* Mouth */}
          {active ? (
            <g>
              <path d="M36,33 Q40,37 44,33" fill="#f8a0a0" stroke="#e08080" strokeWidth="0.5" />
              {/* Cute little fang for some characters */}
              {isFemale && <path d="M43,33 L42.5,35 L44,33" fill="#fff" />}
            </g>
          ) : (
            <path d="M37,34 Q40,35 43,34" fill="none" stroke="#caa" strokeWidth="0.8" />
          )}

          {/* Hair (on top of face) */}
          <Hair style={visual.hairStyle} color={visual.hairColor} gender={visual.gender} />

          {/* Accessory */}
          <Accessory type={visual.accessory} />
        </g>

        {/* Sparkle effects when active */}
        {active && (
          <g>
            <circle cx="12" cy="14" r="1" fill="#ffd700" opacity="0">
              <animate attributeName="opacity" values="0;0.8;0" dur="3s" repeatCount="indefinite" begin="0s" />
              <animate attributeName="r" values="0.5;1.5;0.5" dur="3s" repeatCount="indefinite" begin="0s" />
            </circle>
            <circle cx="68" cy="10" r="1" fill="#ffd700" opacity="0">
              <animate attributeName="opacity" values="0;0.7;0" dur="3.5s" repeatCount="indefinite" begin="1s" />
              <animate attributeName="r" values="0.5;1.2;0.5" dur="3.5s" repeatCount="indefinite" begin="1s" />
            </circle>
            <circle cx="65" cy="38" r="1" fill="#ff69b4" opacity="0">
              <animate attributeName="opacity" values="0;0.6;0" dur="4s" repeatCount="indefinite" begin="2s" />
              <animate attributeName="r" values="0.3;1;0.3" dur="4s" repeatCount="indefinite" begin="2s" />
            </circle>
          </g>
        )}
      </svg>
    </div>
  );
}
