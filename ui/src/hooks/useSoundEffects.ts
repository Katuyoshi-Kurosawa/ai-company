import { useRef, useCallback, useEffect, useState } from 'react';

// ══════════════════════════════════════════
// Chiptune Sound Effects using Web Audio API
// ══════════════════════════════════════════

type SoundType = 'click' | 'select' | 'phaseStart' | 'phaseComplete' | 'error' | 'celebration' | 'notification' | 'typing';

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  ramp?: number;       // end frequency for sweep
  volume?: number;
  delay?: number;
}

const SOUND_DEFS: Record<SoundType, SoundConfig[]> = {
  click: [
    { frequency: 800, duration: 0.05, type: 'square', volume: 0.15 },
  ],
  select: [
    { frequency: 440, duration: 0.08, type: 'square', volume: 0.12 },
    { frequency: 660, duration: 0.08, type: 'square', volume: 0.12, delay: 0.06 },
  ],
  phaseStart: [
    { frequency: 330, duration: 0.12, type: 'square', volume: 0.15 },
    { frequency: 440, duration: 0.12, type: 'square', volume: 0.15, delay: 0.1 },
    { frequency: 550, duration: 0.12, type: 'square', volume: 0.15, delay: 0.2 },
    { frequency: 660, duration: 0.2, type: 'square', volume: 0.15, delay: 0.3 },
  ],
  phaseComplete: [
    { frequency: 523, duration: 0.1, type: 'square', volume: 0.15 },
    { frequency: 659, duration: 0.1, type: 'square', volume: 0.15, delay: 0.08 },
    { frequency: 784, duration: 0.1, type: 'square', volume: 0.15, delay: 0.16 },
    { frequency: 1047, duration: 0.3, type: 'square', volume: 0.18, delay: 0.24 },
  ],
  error: [
    { frequency: 200, duration: 0.15, type: 'sawtooth', volume: 0.12 },
    { frequency: 150, duration: 0.2, type: 'sawtooth', volume: 0.12, delay: 0.15 },
  ],
  celebration: [
    { frequency: 523, duration: 0.08, type: 'square', volume: 0.15 },
    { frequency: 659, duration: 0.08, type: 'square', volume: 0.15, delay: 0.06 },
    { frequency: 784, duration: 0.08, type: 'square', volume: 0.15, delay: 0.12 },
    { frequency: 1047, duration: 0.08, type: 'square', volume: 0.15, delay: 0.18 },
    { frequency: 784, duration: 0.08, type: 'square', volume: 0.12, delay: 0.24 },
    { frequency: 1047, duration: 0.3, type: 'square', volume: 0.18, delay: 0.30 },
  ],
  notification: [
    { frequency: 880, duration: 0.1, type: 'sine', volume: 0.1 },
    { frequency: 1100, duration: 0.15, type: 'sine', volume: 0.1, delay: 0.1 },
  ],
  typing: [
    { frequency: 1200 + Math.random() * 400, duration: 0.02, type: 'square', volume: 0.05 },
  ],
};

// ══════════════════════════════════════════
// Simple BGM using Web Audio API oscillators
// ══════════════════════════════════════════
const BGM_NOTES = [
  // Ambient office melody (C major pentatonic, slow)
  { freq: 262, dur: 0.8 }, { freq: 294, dur: 0.4 }, { freq: 330, dur: 0.8 },
  { freq: 392, dur: 0.4 }, { freq: 440, dur: 0.8 }, { freq: 392, dur: 0.4 },
  { freq: 330, dur: 0.8 }, { freq: 294, dur: 0.4 }, { freq: 262, dur: 1.2 },
  { freq: 0, dur: 0.4 },  // rest
  { freq: 330, dur: 0.6 }, { freq: 392, dur: 0.6 }, { freq: 440, dur: 0.8 },
  { freq: 524, dur: 0.4 }, { freq: 440, dur: 0.8 }, { freq: 392, dur: 0.4 },
  { freq: 330, dur: 1.2 },
  { freq: 0, dur: 0.8 },
];

export function useSoundEffects() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [bgmPlaying, setBgmPlaying] = useState(false);
  const bgmTimerRef = useRef<number | null>(null);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [bgmEnabled, setBgmEnabled] = useState(false);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playNoteRaw = useCallback((config: SoundConfig) => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = config.type;
      osc.frequency.setValueAtTime(config.frequency, ctx.currentTime + (config.delay || 0));
      if (config.ramp) {
        osc.frequency.linearRampToValueAtTime(config.ramp, ctx.currentTime + (config.delay || 0) + config.duration);
      }

      const vol = config.volume ?? 0.1;
      gain.gain.setValueAtTime(0, ctx.currentTime + (config.delay || 0));
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + (config.delay || 0) + 0.005);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + (config.delay || 0) + config.duration);

      osc.start(ctx.currentTime + (config.delay || 0));
      osc.stop(ctx.currentTime + (config.delay || 0) + config.duration + 0.01);
    } catch { /* ignore audio errors */ }
  }, [getCtx]);

  const play = useCallback((type: SoundType) => {
    if (!sfxEnabled) return;
    const sounds = SOUND_DEFS[type];
    if (!sounds) return;
    sounds.forEach(s => playNoteRaw(s));
  }, [sfxEnabled, playNoteRaw]);

  // BGM loop (independent of sfxEnabled)
  const startBgm = useCallback(() => {
    if (!bgmEnabled) return;
    setBgmPlaying(true);
    let noteIdx = 0;

    const playNext = () => {
      const note = BGM_NOTES[noteIdx % BGM_NOTES.length];
      if (note.freq > 0) {
        playNoteRaw({ frequency: note.freq, duration: note.dur * 0.9, type: 'sine', volume: 0.04 });
        playNoteRaw({ frequency: note.freq * 1.5, duration: note.dur * 0.9, type: 'sine', volume: 0.02, delay: 0.01 });
      }
      noteIdx++;
      bgmTimerRef.current = window.setTimeout(playNext, note.dur * 1000);
    };

    playNext();
  }, [bgmEnabled, playNoteRaw]);

  const stopBgm = useCallback(() => {
    setBgmPlaying(false);
    if (bgmTimerRef.current) {
      clearTimeout(bgmTimerRef.current);
      bgmTimerRef.current = null;
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (bgmTimerRef.current) clearTimeout(bgmTimerRef.current);
      ctxRef.current?.close();
    };
  }, []);

  return {
    play,
    sfxEnabled, setSfxEnabled,
    bgmEnabled, setBgmEnabled,
    bgmPlaying, startBgm, stopBgm,
  };
}
