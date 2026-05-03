import { createContext, useContext, type ReactNode } from 'react';
import { useTTS, type TTSControls } from '../hooks/useTTS';

const TTSContext = createContext<TTSControls | null>(null);

export function TTSProvider({ children }: { children: ReactNode }) {
  const tts = useTTS();
  return <TTSContext.Provider value={tts}>{children}</TTSContext.Provider>;
}

export function useTTSContext(): TTSControls {
  const ctx = useContext(TTSContext);
  if (!ctx) throw new Error('useTTSContext must be used inside TTSProvider');
  return ctx;
}
