import type { AgentVisual } from '../types';

interface Props {
  visual: AgentVisual;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  className?: string;
}

const SKIN = '#fde8d0';
const SKIN_S = '#f0cda8';

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + amt);
  const g = Math.min(255, ((n >> 8) & 0xff) + amt);
  const b = Math.min(255, (n & 0xff) + amt);
  return `rgb(${r},${g},${b})`;
}

/* ========== HAIR ========== */
function Hair({ style, color }: { style: string; color: string }) {
  const hi = lighten(color, 40);
  switch (style) {
    case 'long-straight':
      return (<g>
        <path d="M15,18 Q15,6 30,4 Q45,6 45,18" fill={color}/>
        <path d="M20,8 Q30,5 40,8" fill={hi} opacity="0.4"/>
        <g><animateTransform attributeName="transform" type="rotate" values="0 15 18;1 15 18;0 15 18;-1 15 18;0 15 18" dur="4s" repeatCount="indefinite"/>
          <path d="M14,18 Q12,35 13,55 L18,55 Q18,35 16,18Z" fill={color}/>
          <path d="M15,25 Q14,35 15,48" stroke={hi} strokeWidth="1" fill="none" opacity="0.3"/>
        </g>
        <g><animateTransform attributeName="transform" type="rotate" values="0 45 18;-1 45 18;0 45 18;1 45 18;0 45 18" dur="4.5s" repeatCount="indefinite"/>
          <path d="M44,18 Q46,35 45,55 L40,55 Q40,35 42,18Z" fill={color}/>
          <path d="M43,25 Q44,35 43,48" stroke={hi} strokeWidth="1" fill="none" opacity="0.3"/>
        </g>
      </g>);
    case 'long-wave':
      return (<g>
        <path d="M14,18 Q14,6 30,3 Q46,6 46,18" fill={color}/>
        <path d="M20,7 Q30,4 40,7" fill={hi} opacity="0.4"/>
        <g><animateTransform attributeName="transform" type="rotate" values="0 14 18;2 14 18;0 14 18;-2 14 18;0 14 18" dur="3.5s" repeatCount="indefinite"/>
          <path d="M13,18 C10,28 16,36 12,48 C10,54 15,56 16,52 C18,44 13,36 16,26Z" fill={color}/>
        </g>
        <g><animateTransform attributeName="transform" type="rotate" values="0 46 18;-2 46 18;0 46 18;2 46 18;0 46 18" dur="4s" repeatCount="indefinite"/>
          <path d="M46,18 C48,28 42,36 46,48 C48,54 43,56 42,52 C40,44 46,36 44,26Z" fill={color}/>
        </g>
      </g>);
    case 'medium-wave':
      return (<g>
        <path d="M14,18 Q14,6 30,4 Q46,6 46,18" fill={color}/>
        <path d="M20,7 Q30,4 40,7" fill={hi} opacity="0.4"/>
        <g><animateTransform attributeName="transform" type="rotate" values="0 14 20;1.5 14 20;0 14 20;-1.5 14 20;0 14 20" dur="3s" repeatCount="indefinite"/>
          <path d="M14,18 C12,24 16,30 13,38 L18,36 C18,30 14,24 16,18Z" fill={color}/>
        </g>
        <g><animateTransform attributeName="transform" type="rotate" values="0 46 20;-1.5 46 20;0 46 20;1.5 46 20;0 46 20" dur="3.5s" repeatCount="indefinite"/>
          <path d="M44,18 C46,24 42,30 45,38 L40,36 C40,30 44,24 42,18Z" fill={color}/>
        </g>
      </g>);
    case 'bob':
      return (<g>
        <path d="M14,18 Q14,6 30,4 Q46,6 46,18" fill={color}/>
        <path d="M20,7 Q30,4 40,7" fill={hi} opacity="0.4"/>
        <g><animateTransform attributeName="transform" type="rotate" values="0 30 18;0.5 30 18;0 30 18;-0.5 30 18;0 30 18" dur="3s" repeatCount="indefinite"/>
          <path d="M14,18 Q13,28 15,34 L19,32 Q18,26 16,18Z" fill={color}/>
          <path d="M44,18 Q45,28 43,34 L39,32 Q40,26 42,18Z" fill={color}/>
        </g>
      </g>);
    case 'ponytail':
      return (<g>
        <path d="M15,18 Q15,6 30,4 Q45,6 45,18" fill={color}/>
        <path d="M20,8 Q30,5 40,8" fill={hi} opacity="0.4"/>
        <g><animateTransform attributeName="transform" type="rotate" values="0 42 12;5 42 12;0 42 12;-3 42 12;0 42 12" dur="2.5s" repeatCount="indefinite"/>
          <circle cx="42" cy="12" r="4" fill={color}/>
          <path d="M42,16 Q48,22 46,38 Q44,44 42,48 L40,44 Q42,38 44,28 Q45,20 42,16Z" fill={color}/>
          <path d="M43,20 Q44,30 43,40" stroke={hi} strokeWidth="0.8" fill="none" opacity="0.3"/>
        </g>
      </g>);
    case 'updo':
      return (<g>
        <path d="M15,18 Q15,6 30,4 Q45,6 45,18" fill={color}/>
        <ellipse cx="30" cy="2" rx="8" ry="6" fill={color}/>
        <ellipse cx="30" cy="2" rx="6" ry="4" fill={hi} opacity="0.3"/>
        <path d="M20,7 Q30,4 40,7" fill={hi} opacity="0.4"/>
      </g>);
    case 'messy':
      return (<g>
        <path d="M13,18 Q12,5 30,2 Q48,5 47,18" fill={color}/>
        <path d="M16,8 L12,1" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <path d="M44,6 L48,0" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        <path d="M25,4 L23,-1" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M35,3 L37,-1" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M30,3 L29,0" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <path d="M20,7 Q30,4 40,7" fill={hi} opacity="0.35"/>
      </g>);
    case 'short-back':
      return (<g>
        <path d="M16,18 Q16,7 30,5 Q44,7 44,18" fill={color}/>
        <path d="M20,8 Q30,5 40,8" fill={hi} opacity="0.4"/>
      </g>);
    case 'short-side':
      return (<g>
        <path d="M14,18 Q14,6 30,4 Q46,6 46,18" fill={color}/>
        <path d="M14,18 Q12,24 14,28" stroke={color} strokeWidth="3" fill="none"/>
        <path d="M46,18 Q48,24 46,28" stroke={color} strokeWidth="3" fill="none"/>
        <path d="M20,7 Q30,4 40,7" fill={hi} opacity="0.4"/>
      </g>);
    default:
      return (<g>
        <path d="M16,18 Q16,7 30,5 Q44,7 44,18" fill={color}/>
        <path d="M20,8 Q30,5 40,8" fill={hi} opacity="0.4"/>
      </g>);
  }
}

/* ========== EYES ========== */
function Eyes({ active, isFemale }: { active: boolean; isFemale: boolean }) {
  if (!active) {
    return (<g>
      <path d="M22,23 Q25,21 28,23" stroke="#999" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <path d="M32,23 Q35,21 38,23" stroke="#999" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <text x="44" y="16" fontSize="5" fill="#8898bb" opacity="0.5" fontFamily="sans-serif">z</text>
      <text x="48" y="12" fontSize="4" fill="#8898bb" opacity="0.35" fontFamily="sans-serif">z</text>
    </g>);
  }
  const iris = isFemale ? '#4a90d9' : '#6b5040';
  return (<g>
    {/* Left eye */}
    <ellipse cx="25" cy="23" rx="4.5" ry="5" fill="#fff">
      <animate attributeName="ry" values="5;5;5;5;0.6;5;5;5;5;5;5;5;5" dur="5s" repeatCount="indefinite"/>
    </ellipse>
    <ellipse cx="25" cy="23.5" rx="3.2" ry="3.8" fill={iris}>
      <animate attributeName="ry" values="3.8;3.8;3.8;3.8;0.4;3.8;3.8;3.8;3.8;3.8;3.8;3.8;3.8" dur="5s" repeatCount="indefinite"/>
    </ellipse>
    <circle cx="25" cy="23" r="2" fill="#1a1a2e">
      <animate attributeName="r" values="2;2;2;2;0.2;2;2;2;2;2;2;2;2" dur="5s" repeatCount="indefinite"/>
    </circle>
    <circle cx="27" cy="21.5" r="1.3" fill="#fff" opacity="0.9"/>
    <circle cx="23.5" cy="25" r="0.7" fill="#fff" opacity="0.5"/>
    {/* Right eye */}
    <ellipse cx="35" cy="23" rx="4.5" ry="5" fill="#fff">
      <animate attributeName="ry" values="5;5;5;5;0.6;5;5;5;5;5;5;5;5" dur="5s" repeatCount="indefinite"/>
    </ellipse>
    <ellipse cx="35" cy="23.5" rx="3.2" ry="3.8" fill={iris}>
      <animate attributeName="ry" values="3.8;3.8;3.8;3.8;0.4;3.8;3.8;3.8;3.8;3.8;3.8;3.8;3.8" dur="5s" repeatCount="indefinite"/>
    </ellipse>
    <circle cx="35" cy="23" r="2" fill="#1a1a2e">
      <animate attributeName="r" values="2;2;2;2;0.2;2;2;2;2;2;2;2;2" dur="5s" repeatCount="indefinite"/>
    </circle>
    <circle cx="37" cy="21.5" r="1.3" fill="#fff" opacity="0.9"/>
    <circle cx="33.5" cy="25" r="0.7" fill="#fff" opacity="0.5"/>
    {/* Eyelashes for female */}
    {isFemale && (<g>
      <path d="M20,19 Q22,17 25,18" stroke="#333" strokeWidth="0.8" fill="none"/>
      <path d="M30,18 Q33,17 35,18 Q38,17 40,19" stroke="#333" strokeWidth="0.8" fill="none"/>
    </g>)}
    {/* Cheek blush */}
    <ellipse cx="19" cy="27" rx="3.5" ry="1.8" fill="#ffaaaa" opacity="0.25">
      <animate attributeName="opacity" values="0.25;0.4;0.25" dur="3s" repeatCount="indefinite"/>
    </ellipse>
    <ellipse cx="41" cy="27" rx="3.5" ry="1.8" fill="#ffaaaa" opacity="0.25">
      <animate attributeName="opacity" values="0.25;0.4;0.25" dur="3.5s" repeatCount="indefinite"/>
    </ellipse>
  </g>);
}

/* ========== ACCESSORY ========== */
function Accessory({ type }: { type: string }) {
  switch (type) {
    case 'glasses':
      return (<g>
        <rect x="20" y="20.5" width="10" height="7" rx="2.5" fill="none" stroke="#6080a0" strokeWidth="1"/>
        <rect x="31" y="20.5" width="10" height="7" rx="2.5" fill="none" stroke="#6080a0" strokeWidth="1"/>
        <line x1="30" y1="23.5" x2="31" y2="23.5" stroke="#6080a0" strokeWidth="0.8"/>
        <line x1="20" y1="23.5" x2="16" y2="22" stroke="#6080a0" strokeWidth="0.7"/>
        <line x1="41" y1="23.5" x2="44" y2="22" stroke="#6080a0" strokeWidth="0.7"/>
        <line x1="22" y1="21.5" x2="25" y2="21.5" stroke="#fff" strokeWidth="0.5" opacity="0.4"/>
        <line x1="33" y1="21.5" x2="36" y2="21.5" stroke="#fff" strokeWidth="0.5" opacity="0.4"/>
      </g>);
    case 'earring':
      return (<g>
        <circle cx="15" cy="30" r="1.5" fill="#ffd700" opacity="0.85">
          <animate attributeName="opacity" values="0.85;0.55;0.85" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="45" cy="30" r="1.5" fill="#ffd700" opacity="0.85">
          <animate attributeName="opacity" values="0.85;0.55;0.85" dur="2.3s" repeatCount="indefinite"/>
        </circle>
      </g>);
    case 'necklace':
      return (<g>
        <path d="M24,38 Q30,42 36,38" fill="none" stroke="#ffd700" strokeWidth="1"/>
        <circle cx="30" cy="41" r="1.8" fill="#ff69b4">
          <animate attributeName="r" values="1.8;2.1;1.8" dur="2s" repeatCount="indefinite"/>
        </circle>
      </g>);
    case 'scarf':
      return (<g>
        <path d="M22,37 Q30,42 38,37 L37,40 Q30,45 23,40Z" fill="#e05070" opacity="0.8"/>
        <path d="M28,40 L26,50 L30,48 L32,50 L30,40" fill="#e05070" opacity="0.65">
          <animateTransform attributeName="transform" type="rotate" values="0 30 40;3 30 40;0 30 40;-3 30 40;0 30 40" dur="4s" repeatCount="indefinite"/>
        </path>
      </g>);
    case 'tie-pin':
      return (<rect x="28.5" y="42" width="3" height="1.2" rx="0.5" fill="#ffd700"/>);
    default: return null;
  }
}

/* ========== MAIN ========== */
export function PixelCharacter({ visual, size = 'md', active = true, className = '' }: Props) {
  const sc = size === 'sm' ? 0.55 : size === 'md' ? 0.85 : 1.2;
  const w = Math.round(60 * sc);
  const h = Math.round(80 * sc);
  const isFemale = visual.gender === 'female';
  const isLightSuit = parseInt(visual.suitColor.replace('#',''), 16) > 0x888888;

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`} style={{ width: w, height: h }}>
      <svg viewBox="0 0 60 80" width={w} height={h} style={{ overflow: 'visible' }}>
        {/* Body group with breathing */}
        <g>
          {active && (
            <animateTransform attributeName="transform" type="translate" values="0,0;0,-0.6;0,0" dur="3s" repeatCount="indefinite"/>
          )}

          {/* Neck */}
          <rect x="27" y="34" width="6" height="6" rx="1" fill={SKIN}/>

          {/* Body */}
          <path
            d={isFemale
              ? 'M20,40 Q20,37 24,36 L36,36 Q40,37 40,40 L42,65 Q42,70 38,70 L22,70 Q18,70 18,65Z'
              : 'M18,40 Q18,37 22,36 L38,36 Q42,37 42,40 L44,65 Q44,70 40,70 L20,70 Q16,70 16,65Z'}
            fill={visual.suitColor}
          />
          {/* Collar */}
          {isLightSuit ? (
            <g>
              <path d="M26,37 L30,44 L34,37" fill="none" stroke="#c0c0c0" strokeWidth="0.8"/>
              <line x1="30" y1="44" x2="30" y2="55" stroke="#c0c0c0" strokeWidth="0.4" opacity="0.5"/>
              {/* Tie */}
              <path d="M28.5,42 L30,48 L31.5,42Z" fill="#6040a0" opacity="0.8"/>
              <rect x="28.5" y="40" width="3" height="2.5" rx="0.5" fill="#6040a0" opacity="0.8"/>
            </g>
          ) : isFemale ? (
            <path d="M26,37 L30,42 L34,37" fill="none" stroke="#fff" strokeWidth="0.6" opacity="0.5"/>
          ) : (
            <g>
              <path d="M26,37 L30,44 L34,37" fill="none" stroke="#fff" strokeWidth="0.6" opacity="0.4"/>
              <line x1="30" y1="44" x2="30" y2="58" stroke="#fff" strokeWidth="0.3" opacity="0.3"/>
            </g>
          )}
          {/* Ribbon for female light suit */}
          {isFemale && isLightSuit && (
            <g>
              <path d="M27,39 L30,41 L33,39" fill="none" stroke="#333" strokeWidth="0.8"/>
              <path d="M28,40 L26,44 M32,40 L34,44" stroke="#333" strokeWidth="0.6"/>
            </g>
          )}

          {/* Left arm */}
          <g>
            {active && (
              <animateTransform attributeName="transform" type="rotate" values="0 20 44;-3 20 44;0 20 44;2 20 44;0 20 44" dur="1.3s" repeatCount="indefinite"/>
            )}
            <path d={isFemale
              ? 'M20,40 L12,52 L14,58 L18,54 L20,46Z'
              : 'M18,40 L8,54 L10,60 L16,54 L18,46Z'}
              fill={visual.suitColor}/>
            <circle cx={isFemale ? 13 : 9} cy={isFemale ? 58 : 60} r="2.5" fill={SKIN}/>
          </g>

          {/* Right arm */}
          <g>
            {active && (
              <animateTransform attributeName="transform" type="rotate" values="0 40 44;2 40 44;0 40 44;-3 40 44;0 40 44" dur="1.5s" repeatCount="indefinite"/>
            )}
            <path d={isFemale
              ? 'M40,40 L48,52 L46,58 L42,54 L40,46Z'
              : 'M42,40 L52,54 L50,60 L44,54 L42,46Z'}
              fill={visual.suitColor}/>
            <circle cx={isFemale ? 47 : 51} cy={isFemale ? 58 : 60} r="2.5" fill={SKIN}/>
          </g>

          {/* Head */}
          <ellipse cx="30" cy="22" rx="16" ry="18" fill={SKIN_S}/>
          <ellipse cx="30" cy="21" rx="16" ry="18" fill={SKIN}/>
          {/* Ears */}
          <ellipse cx="14" cy="24" rx="2.5" ry="3.5" fill={SKIN}/>
          <ellipse cx="14" cy="24" rx="1.5" ry="2.5" fill={SKIN_S}/>
          <ellipse cx="46" cy="24" rx="2.5" ry="3.5" fill={SKIN}/>
          <ellipse cx="46" cy="24" rx="1.5" ry="2.5" fill={SKIN_S}/>

          {/* Eyes */}
          <Eyes active={active} isFemale={isFemale}/>

          {/* Nose */}
          <path d="M29,29 Q30,30.5 31,29" stroke={SKIN_S} strokeWidth="0.6" fill="none"/>

          {/* Mouth */}
          {active ? (
            <path d="M27,32 Q30,35 33,32" fill="#f0a0a0" stroke="#d08080" strokeWidth="0.4"/>
          ) : (
            <path d="M28,33 Q30,34 32,33" fill="none" stroke="#c0a0a0" strokeWidth="0.6"/>
          )}

          {/* Hair */}
          <Hair style={visual.hairStyle} color={visual.hairColor}/>

          {/* Accessory */}
          <Accessory type={visual.accessory}/>
        </g>

        {/* Sparkles */}
        {active && (<g>
          <circle cx="8" cy="10" r="1" fill="#ffd700" opacity="0">
            <animate attributeName="opacity" values="0;0.7;0" dur="3s" repeatCount="indefinite"/>
            <animate attributeName="r" values="0.5;1.5;0.5" dur="3s" repeatCount="indefinite"/>
          </circle>
          <circle cx="52" cy="8" r="1" fill="#ff69b4" opacity="0">
            <animate attributeName="opacity" values="0;0.6;0" dur="4s" repeatCount="indefinite" begin="1.5s"/>
            <animate attributeName="r" values="0.3;1.2;0.3" dur="4s" repeatCount="indefinite" begin="1.5s"/>
          </circle>
        </g>)}
      </svg>
    </div>
  );
}
