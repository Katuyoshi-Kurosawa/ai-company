export interface VoiceProfile {
  gender: 'female' | 'male';
  pitch: number;   // 0.5–2.0、デフォルト 1.0
  rate: number;    // 0.5–2.0、デフォルト 1.0
  volume: number;  // 0.0–1.0
}

// 13エージェント + ナレーター
export const AGENT_VOICE_PROFILES: Record<string, VoiceProfile> = {
  ceo:               { gender: 'male',   pitch: 0.85, rate: 0.90, volume: 1.0 },
  secretary:         { gender: 'female', pitch: 1.10, rate: 1.00, volume: 1.0 },
  'chief-secretary': { gender: 'female', pitch: 1.05, rate: 0.95, volume: 1.0 },
  marketing:         { gender: 'female', pitch: 1.20, rate: 1.10, volume: 1.0 },
  hr:                { gender: 'female', pitch: 1.00, rate: 0.90, volume: 1.0 },
  cs:                { gender: 'female', pitch: 1.15, rate: 1.05, volume: 1.0 },
  rd:                { gender: 'male',   pitch: 1.10, rate: 1.15, volume: 1.0 },
  planner:           { gender: 'male',   pitch: 0.95, rate: 0.95, volume: 1.0 },
  architect:         { gender: 'male',   pitch: 0.90, rate: 0.85, volume: 1.0 },
  developer:         { gender: 'male',   pitch: 1.00, rate: 1.05, volume: 1.0 },
  'qa-reviewer':     { gender: 'male',   pitch: 0.95, rate: 0.90, volume: 1.0 },
  'ui-designer':     { gender: 'female', pitch: 1.15, rate: 1.05, volume: 1.0 },
  'doc-writer':      { gender: 'male',   pitch: 0.90, rate: 0.88, volume: 1.0 },
  narrator:          { gender: 'female', pitch: 1.00, rate: 0.95, volume: 1.0 },
};

/** macOS/Windows を横断して日本語音声を探す */
export function findVoice(
  gender: 'female' | 'male',
  overrideName?: string | null,
): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // ユーザー指定音声
  if (overrideName) {
    const found = voices.find(v => v.name === overrideName);
    if (found) return found;
  }

  // macOS / Windows 優先候補
  const FEMALE_PREFS = ['Kyoko', 'O-ren', 'Microsoft Haruka Desktop', 'Microsoft Haruka'];
  const MALE_PREFS   = ['Otoya', 'Hattori', 'Microsoft Ichiro Desktop', 'Microsoft Ichiro'];
  const prefs = gender === 'female' ? FEMALE_PREFS : MALE_PREFS;

  for (const name of prefs) {
    const v = voices.find(v => v.name.includes(name));
    if (v) return v;
  }

  // fallback: ja-JP の音声を順に試す
  const jaVoices = voices.filter(v => v.lang.startsWith('ja'));
  return jaVoices[0] ?? voices[0] ?? null;
}

/** Markdown・ANSI エスケープを除去してプレーンテキストに変換 */
export function stripToPlain(text: string): string {
  return text
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')          // ANSI
    .replace(/```[\s\S]*?```/g, 'コードブロック')       // code block
    .replace(/`([^`]+)`/g, '$1')                      // inline code
    .replace(/#{1,6}\s+/g, '')                         // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')                  // bold
    .replace(/\*(.+?)\*/g, '$1')                      // italic
    .replace(/__(.+?)__/g, '$1')                      // bold
    .replace(/_(.+?)_/g, '$1')                        // italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')          // links
    .replace(/^[-*+]\s+/gm, '')                       // ul
    .replace(/^\d+\.\s+/gm, '')                       // ol
    .replace(/^>\s*/gm, '')                           // blockquote
    .replace(/\|[^|\n]+/g, ' ')                       // table
    .replace(/^---+$/gm, '')                          // hr
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
