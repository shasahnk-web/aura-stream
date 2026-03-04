import { usePlayerStore, useLikedStore } from '@/store/playerStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Heart, Download, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, ChevronDown
} from 'lucide-react';
import AudioVisualizer from './AudioVisualizer';

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

interface NowPlayingViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audioElement: HTMLAudioElement | null;
  onSeek: (time: number) => void;
}

export default function NowPlayingView({ open, onOpenChange, audioElement, onSeek }: NowPlayingViewProps) {
  const {
    currentSong, isPlaying, currentTime, duration,
    shuffle, repeat, togglePlay, playNext, playPrev,
    toggleShuffle, toggleRepeat
  } = usePlayerStore();
  const { isLiked, toggleLike } = useLikedStore();

  if (!currentSong) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const liked = isLiked(currentSong.id);

  const handleDownload = async () => {
    if (!currentSong.url) return;
    try {
      const response = await fetch(currentSong.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentSong.name} - ${currentSong.artist}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(currentSong.url, '_blank');
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(parseFloat(e.target.value));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-[100] flex flex-col"
          style={{
            background: `linear-gradient(180deg, hsl(var(--primary) / 0.3) 0%, hsl(var(--background)) 50%)`,
          }}
        >
          {/* Blurred album art background */}
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={currentSong.image}
              alt=""
              className="w-full h-full object-cover opacity-20 blur-[80px] scale-150"
            />
            <div className="absolute inset-0 bg-background/70" />
          </div>

          {/* Header */}
          <div className="relative flex items-center justify-between px-6 pt-6 pb-2">
            <button
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className="w-7 h-7" />
            </button>
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Now Playing</p>
            </div>
            <div className="w-7" />
          </div>

          {/* Content */}
          <div className="relative flex-1 flex flex-col items-center justify-center px-8 gap-6 max-w-lg mx-auto w-full">
            {/* Album Art */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="relative w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-2xl"
              style={{ boxShadow: 'var(--shadow-glow), 0 25px 50px -12px rgba(0,0,0,0.5)' }}
            >
              <img
                src={currentSong.image}
                alt={currentSong.name}
                className={`w-full h-full object-cover ${isPlaying ? 'animate-pulse-slow' : ''}`}
              />
            </motion.div>

            {/* Visualizer */}
            <AudioVisualizer audioElement={audioElement} barCount={32} className="h-12 w-full max-w-xs" />

            {/* Song Info */}
            <div className="text-center w-full">
              <h2 className="text-xl md:text-2xl font-bold font-display text-foreground truncate">
                {currentSong.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 truncate">{currentSong.artist}</p>
              {currentSong.album && (
                <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">{currentSong.album}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => toggleLike(currentSong)}
                className={`transition-colors ${liked ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Heart className="w-6 h-6" fill={liked ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={handleDownload}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Download song"
              >
                <Download className="w-6 h-6" />
              </button>
            </div>

            {/* Progress */}
            <div className="w-full">
              <input
                type="range" min={0} max={duration || 0} value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-secondary rounded-full appearance-none cursor-pointer player-seek"
                style={{
                  background: `linear-gradient(to right, hsl(var(--primary)) ${progress}%, hsl(var(--muted)) ${progress}%)`
                }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">{formatTime(currentTime)}</span>
                <span className="text-xs text-muted-foreground">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6">
              <button
                onClick={toggleShuffle}
                className={`transition-colors ${shuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Shuffle className="w-5 h-5" />
              </button>
              <button onClick={playPrev} className="text-foreground hover:scale-110 transition-transform">
                <SkipBack className="w-7 h-7" />
              </button>
              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
              >
                {isPlaying
                  ? <Pause className="w-7 h-7 text-background" />
                  : <Play className="w-7 h-7 text-background ml-1" />
                }
              </button>
              <button onClick={playNext} className="text-foreground hover:scale-110 transition-transform">
                <SkipForward className="w-7 h-7" />
              </button>
              <button
                onClick={toggleRepeat}
                className={`transition-colors ${repeat !== 'off' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {repeat === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
