import { Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAiDj } from '@/hooks/useAiDj';

export default function AiDjSection() {
  const { isLoading, startAiDj } = useAiDj();
  
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
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-[2] p-6 rounded-[20px] bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] hover:border-[#a855f7]/40 transition-colors"
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🎧</span>
          <h2 className="text-xl font-semibold text-white">AI DJ</h2>
        </div>

        <p className="text-sm text-gray-400 mb-5 leading-relaxed">
          Personalized music just for you based on your vibe, history, and mood.
        </p>

        <button
          onClick={startAiDj}
          disabled={isLoading}
          className="w-full py-3.5 rounded-xl border-none bg-gradient-to-br from-[#a855f7] to-[#ec4899] text-white font-semibold cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Mix...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Start AI DJ
            </>
          )}
        </button>

        <span className="block mt-3 text-xs text-gray-500 text-center">
          Based on your liked songs & listening history
        </span>
      </motion.div>
    </section>
  );
}
