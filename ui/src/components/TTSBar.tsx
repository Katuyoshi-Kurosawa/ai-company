import { useTTSContext } from '../context/TTSContext';
import { AGENT_VOICE_PROFILES } from '../config/agentVoices';
import type { Agent } from '../types';

interface Props {
  agents: Agent[];
}

export function TTSBar({ agents }: Props) {
  const tts = useTTSContext();
  const { state } = tts;

  if (!state.playing && !state.paused) return null;

  const agentId = state.currentAgentId ?? 'narrator';
  const agent = agents.find(a => a.id === agentId);
  const profile = AGENT_VOICE_PROFILES[agentId] ?? AGENT_VOICE_PROFILES['narrator'];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-2.5
        border-t border-indigo-500/30 backdrop-blur-sm"
      style={{ background: 'rgba(15,17,23,0.95)' }}
      data-testid="tts-bar"
    >
      {/* エージェントアバター */}
      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm"
        style={{
          background: profile.gender === 'female' ? 'rgba(244,114,182,0.2)' : 'rgba(99,102,241,0.2)'
        }}>
        {agent ? agent.icon : '🔊'}
      </div>

      {/* エージェント名 */}
      <div className="shrink-0 text-xs font-bold min-w-[4rem]">
        {agent ? agent.name : 'ナレーター'}
      </div>

      {/* 残件数 */}
      {state.queueLength > 0 && (
        <div className="text-[10px] opacity-40 shrink-0">
          残 {state.queueLength}件
        </div>
      )}

      {/* 波形アニメーション */}
      <div className="flex items-center gap-0.5 shrink-0">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`w-0.5 bg-indigo-400 rounded-full ${state.paused ? '' : 'animate-pulse'}`}
            style={{
              height: `${8 + (i % 3) * 4}px`,
              animationDelay: `${i * 0.1}s`,
              opacity: state.paused ? 0.3 : 0.8,
            }}
          />
        ))}
      </div>

      {/* スペーサー */}
      <div className="flex-1" />

      {/* コントロールボタン */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => tts.skip()}
          title="スキップ"
          className="w-7 h-7 rounded flex items-center justify-center text-sm
            bg-white/5 hover:bg-white/15 cursor-pointer transition-colors"
        >
          ⏭
        </button>
        <button
          onClick={() => state.paused ? tts.resume() : tts.pause()}
          title={state.paused ? '再開' : '一時停止'}
          className="w-7 h-7 rounded flex items-center justify-center text-sm
            bg-white/5 hover:bg-white/15 cursor-pointer transition-colors"
        >
          {state.paused ? '▶' : '⏸'}
        </button>
        <button
          onClick={() => tts.stop()}
          title="停止"
          className="w-7 h-7 rounded flex items-center justify-center text-sm
            bg-white/5 hover:bg-red-500/20 hover:text-red-400 cursor-pointer transition-colors"
        >
          ⏹
        </button>
      </div>
    </div>
  );
}
