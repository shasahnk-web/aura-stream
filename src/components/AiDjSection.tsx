import { useState } from 'react';
import { Sparkles, Radio, Play, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAiDj } from '@/hooks/useAiDj';
import { usePlayerStore } from '@/store/playerStore';

export default function AiDjSection() {
  const { isLoading, startAiDj, currentMix } = useAiDj();
  const { currentSong, isPlaying } = usePlayerStore();
  
  return (
    <section className="mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 p-5 border border-border/30"
      >
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-radial from-primary/10 to-transparent rounded-full animate-pulse" />
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-radial from-accent/10 to-transparent rounded-full animate-pulse delay-500" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <Radio className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                AI DJ
                <Sparkles className="w-4 h-4 text-accent" />
              </h2>
              <p className="text-xs text-muted-foreground">Personalized music just for you</p>
            </div>
          </div>
          
          {currentMix && currentSong && isPlaying ? (
            <div className="flex items-center gap-3 p-3 rounded-xl glass mb-3">
              <img 
                src={currentSong.image} 
                alt={currentSong.name}
                className="w-12 h-12 rounded-lg object-cover shadow"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{currentSong.name}</p>
                <p className="text-xs text-muted-foreground truncate">{currentSong.artist}</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-3 bg-primary rounded-full animate-pulse" />
                <span className="w-1.5 h-4 bg-accent rounded-full animate-pulse delay-75" />
                <span className="w-1.5 h-2 bg-primary rounded-full animate-pulse delay-150" />
              </div>
            </div>
          ) : null}
          
          <Button
            onClick={startAiDj}
            disabled={isLoading}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating your mix...
              </>
            ) : currentMix ? (
              <>
                <Play className="w-5 h-5 mr-2" />
                New AI Mix
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Start AI DJ
              </>
            )}
          </Button>
          
          {!currentMix && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              Based on your liked songs and listening history
            </p>
          )}
        </div>
      </motion.div>
    </section>
  );
}
