import { useTTSContext } from '../context/TTSContext';
import type { TTSUtterance } from '../hooks/useTTS';

interface Props {
  getUtterances: () => TTSUtterance[];
  label?: string;
  className?: string;
}

export function TTSButton({ getUtterances, label = '読み上げ', className = '' }: Props) {
  const tts = useTTSContext();

  if (!tts.state.available) return null;

  const isThisPlaying = tts.state.playing;

  const handleClick = () => {
    if (isThisPlaying) {
      tts.stop();
    } else {
      tts.speak(getUtterances());
    }
  };

  return (
    <button
      onClick={handleClick}
      title={isThisPlaying ? '停止' : label}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium
        transition-all cursor-pointer
        ${isThisPlaying
          ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-400/50'
          : 'bg-white/10 hover:bg-white/20 opacity-70 hover:opacity-100'
        } ${className}`}
      data-testid="tts-button"
    >
      <span>{isThisPlaying ? '⏹' : '🔊'}</span>
      <span>{isThisPlaying ? '停止' : label}</span>
      {isThisPlaying && tts.state.queueLength > 0 && (
        <span className="ml-1 opacity-60">({tts.state.queueLength})</span>
      )}
    </button>
  );
}
