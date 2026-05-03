import { useState, useEffect, useRef, useCallback } from 'react';
import { AGENT_VOICE_PROFILES, findVoice, stripToPlain } from '../config/agentVoices';

const TTS_SETTINGS_KEY = 'ai-company-tts-settings';

export interface TTSSettings {
  enabled: boolean;
  volume: number;
  femaleVoiceName: string | null;
  maleVoiceName: string | null;
  agentOverrides: Record<string, { pitch: number; rate: number }>;
}

const DEFAULT_SETTINGS: TTSSettings = {
  enabled: true,
  volume: 1.0,
  femaleVoiceName: null,
  maleVoiceName: null,
  agentOverrides: {},
};

export interface TTSUtterance {
  text: string;
  agentId?: string; // undefined = narrator
}

export interface TTSState {
  available: boolean;
  playing: boolean;
  paused: boolean;
  currentAgentId: string | null;
  currentSourceId: string | null;
  queueLength: number;
}

export interface TTSControls {
  state: TTSState;
  settings: TTSSettings;
  availableVoices: SpeechSynthesisVoice[];
  speak(utterances: TTSUtterance[], sourceId?: string): void;
  append(utterances: TTSUtterance[]): void;
  pause(): void;
  resume(): void;
  stop(): void;
  skip(): void;
  updateSettings(patch: Partial<TTSSettings>): void;
}

export function useTTS(): TTSControls {
  const [available, setAvailable] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const [currentSourceId, setCurrentSourceId] = useState<string | null>(null);
  const [queueLength, setQueueLength] = useState(0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [settings, setSettings] = useState<TTSSettings>(() => {
    try {
      const raw = localStorage.getItem(TTS_SETTINGS_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const queueRef = useRef<TTSUtterance[]>([]);
  const isPlayingRef = useRef(false);
  const skipRef = useRef(false);
  // settingsRef で最新の settings を非同期コールバック内から参照できるようにする
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // 音声一覧の初期化（非同期）
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    setAvailable(true);

    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      const jaVoices = voices.filter(v => v.lang.startsWith('ja') || v.lang.startsWith('ja-'));
      setAvailableVoices(jaVoices.length > 0 ? jaVoices : voices);
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const updateSettings = useCallback((patch: Partial<TTSSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem(TTS_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // 1件の発話を実行するプロミス
  const speakOne = useCallback((utt: TTSUtterance, vol: number): Promise<void> => {
    return new Promise(resolve => {
      const plain = stripToPlain(utt.text);
      if (!plain.trim()) { resolve(); return; }

      const s = settingsRef.current;
      const agentId = utt.agentId ?? 'narrator';
      const profile = AGENT_VOICE_PROFILES[agentId] ?? AGENT_VOICE_PROFILES['narrator'];
      const override = s.agentOverrides[agentId];
      const overrideName = profile.gender === 'female' ? s.femaleVoiceName : s.maleVoiceName;
      const voice = findVoice(profile.gender, overrideName);

      const su = new SpeechSynthesisUtterance(plain);
      su.lang = 'ja-JP';
      su.pitch = override?.pitch ?? profile.pitch;
      su.rate = override?.rate ?? profile.rate;
      su.volume = vol;
      if (voice) su.voice = voice;

      setCurrentAgentId(agentId);
      skipRef.current = false;

      su.onend = () => resolve();
      su.onerror = () => resolve();

      window.speechSynthesis.speak(su);
    });
  }, []);

  // キューを順番に処理するループ
  const drainQueue = useCallback(async (vol: number) => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    setPlaying(true);

    while (queueRef.current.length > 0) {
      const utt = queueRef.current.shift()!;
      setQueueLength(queueRef.current.length);
      if (skipRef.current) { skipRef.current = false; continue; }
      await speakOne(utt, vol);
    }

    isPlayingRef.current = false;
    setPlaying(false);
    setPaused(false);
    setCurrentAgentId(null);
    setCurrentSourceId(null);
    setQueueLength(0);
  }, [speakOne]);

  const speak = useCallback((utterances: TTSUtterance[], sourceId?: string) => {
    if (!('speechSynthesis' in window)) return;
    if (!settingsRef.current.enabled) return;
    window.speechSynthesis.cancel();
    isPlayingRef.current = false;
    queueRef.current = [...utterances];
    setQueueLength(utterances.length);
    setCurrentSourceId(sourceId ?? null);
    drainQueue(settingsRef.current.volume);
  }, [drainQueue]);

  const append = useCallback((utterances: TTSUtterance[]) => {
    if (!('speechSynthesis' in window)) return;
    if (!settingsRef.current.enabled) return;
    queueRef.current.push(...utterances);
    setQueueLength(queueRef.current.length);
    if (!isPlayingRef.current) drainQueue(settingsRef.current.volume);
  }, [drainQueue]);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setPaused(false);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    queueRef.current = [];
    isPlayingRef.current = false;
    setPlaying(false);
    setPaused(false);
    setCurrentAgentId(null);
    setCurrentSourceId(null);
    setQueueLength(0);
  }, []);

  const skip = useCallback(() => {
    skipRef.current = true;
    window.speechSynthesis.cancel();
  }, []);

  return {
    state: { available, playing, paused, currentAgentId, currentSourceId, queueLength },
    settings,
    availableVoices,
    speak,
    append,
    pause,
    resume,
    stop,
    skip,
    updateSettings,
  };
}
