import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAiDj } from '@/hooks/useAiDj';
import { cn } from '@/lib/utils';

export default function AiDjSection() {
  const { isLoading, startAiDj: triggerAiDj } = useAiDj();
  const [aiState, setAiState] = useState<'idle' | 'thinking' | 'mixing' | 'playing'>('idle');

  const statusMap = {
    idle: 'Idle',
    thinking: 'Thinking...',
    mixing: 'Mixing...',
    playing: 'Playing',
  };

  const messageMap = {
    idle: 'Tap to start your personalized mix 🎧',
    thinking: 'Analyzing your vibe 🎧',
    mixing: 'Creating your perfect playlist 🔥',
    playing: 'Starting your AI-powered mix 🚀',
  };

  const handleStartAiDj = () => {
    if (aiState !== 'idle' && aiState !== 'playing') return;

    setAiState('thinking');

    setTimeout(() => {
      setAiState('mixing');
    }, 2000);

    setTimeout(() => {
      setAiState('playing');
      triggerAiDj();
      setTimeout(() => setAiState('idle'), 5000);
    }, 4000);
  };

  const isAiActive = aiState === 'thinking' || aiState === 'mixing';

  return (
    <section className="relative p-5 rounded-[20px] overflow-hidden mb-8">
      {/* BACKGROUND AURA */}
      <div className="absolute inset-0 overflow-hidden z-[1]">
        <div className="absolute -top-[30%] -right-[30%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-50 animate-float bg-[radial-gradient(circle,#a855f7,transparent_70%)]" />
        <div
          className="absolute -bottom-[30%] -left-[30%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-50 animate-float bg-[radial-gradient(circle,#ec4899,transparent_70%)]"
          style={{ animationDelay: '4s' }}
        />
      </div>

      {/* GLASS CONTENT CARD */}
      <div
        className={cn(
          'relative z-[2] p-6 rounded-[20px] bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all duration-300',
          isAiActive && 'shadow-[0_0_40px_rgba(168,85,247,0.4)] border-[#a855f7]/40',
        )}
      >
        {/* AI HEADER */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a855f7] to-[#ec4899] shadow-[0_0_15px_rgba(168,85,247,0.6)]" />
          <div>
            <h2 className="text-lg font-semibold text-white">AI DJ</h2>
            <span className="text-xs text-gray-400">{statusMap[aiState]}</span>
          </div>
        </div>

        {/* AI MESSAGE */}
        <p className="text-sm text-gray-200 my-4 min-h-[20px]">{messageMap[aiState]}</p>

        {/* VISUALIZER */}
        <div className="group flex items-center gap-1 h-5 mb-4" data-active={isAiActive}>
          {[0, 0.1, 0.2, 0.3].map((delay) => (
            <span
              key={delay}
              className="w-1 h-full bg-gradient-to-b from-[#a855f7] to-[#ec4899] rounded-full opacity-0 group-data-[active=true]:opacity-100 group-data-[active=true]:animate-bounce"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
        </div>

        <button
          onClick={handleStartAiDj}
          disabled={isLoading || isAiActive}
          className="w-full py-3.5 rounded-xl border-none bg-gradient-to-br from-[#a855f7] to-[#ec4899] text-white font-semibold cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading || isAiActive ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {isLoading || isAiActive ? 'Please wait...' : 'Start AI DJ'}
        </button>
      </div>
    </section>
  );
}
