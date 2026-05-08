import { usePlayerStore, useLikedStore } from '@/store/playerStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Download, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, ChevronDown, Share2, Plus, Mic
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
          className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
          style={{ background: 'var(--gradient-hero)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <button
              onClick={() => onOpenChange(false)}
              className="text-foreground hover:scale-110 transition-transform"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-semibold text-foreground">Now Playing</h2>
            <div className="w-6" />
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 max-w-lg mx-auto w-full">
            {/* Circular Album Art with progress ring */}
            <div className="relative w-[260px] h-[260px] sm:w-[300px] sm:h-[300px]">
              {/* dotted track */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="48" fill="none" stroke="hsl(var(--muted-foreground))" strokeOpacity="0.2" strokeWidth="0.6" strokeDasharray="0.5 2" />
                <circle
                  cx="50" cy="50" r="48" fill="none"
                  stroke="hsl(var(--primary))" strokeWidth="1.2" strokeLinecap="round"
                  strokeDasharray={`${(progress / 100) * 301.6} 301.6`}
                  style={{ filter: 'drop-shadow(0 0 6px hsl(var(--primary)))' }}
                />
              </svg>
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute inset-4 rounded-full overflow-hidden shadow-2xl"
                style={{ boxShadow: '0 20px 60px hsl(8 85% 58% / 0.4)' }}
              >
                <img
                  src={currentSong.image}
                  alt={currentSong.name}
                  className={`w-full h-full object-cover ${isPlaying ? 'spinning' : ''}`}
                />
              </motion.div>
            </div>

            {/* Song Info */}
            <div className="text-center w-full px-4">
              <p className="text-sm text-muted-foreground">By {currentSong.artist}</p>
              <h2 className="text-2xl font-bold text-foreground truncate mt-1">{currentSong.name}</h2>
            </div>

            {/* Progress */}
            <div className="w-full px-2">
              <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-visible">
                <div
                  className="h-full rounded-full relative"
                  style={{ width: `${progress}%`, background: 'var(--gradient-primary)' }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
                </div>
                <input
                  type="range" min={0} max={duration || 0} value={currentTime}
                  onChange={handleSeek}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-muted-foreground">{formatTime(currentTime)}</span>
                <span className="text-xs text-muted-foreground">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between w-full max-w-xs">
              <button
                onClick={toggleShuffle}
                className={`w-[50px] h-[50px] rounded-full flex items-center justify-center transition-all hover:bg-white/10 hover:scale-110 ${shuffle ? 'text-accent' : 'text-foreground'}`}
              >
                <Shuffle className="w-5 h-5" />
              </button>
              <button
                onClick={playPrev}
                className="w-[50px] h-[50px] rounded-full flex items-center justify-center text-foreground hover:bg-white/10 hover:scale-110 transition-all"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={togglePlay}
                className="w-[70px] h-[70px] rounded-full bg-foreground flex items-center justify-center hover:scale-105 transition-transform"
                style={{ boxShadow: '0 8px 25px hsl(270 76% 53% / 0.4)' }}
              >
                {isPlaying
                  ? <Pause className="w-7 h-7 text-primary" />
                  : <Play className="w-7 h-7 text-primary ml-1" />
                }
              </button>
              <button
                onClick={playNext}
                className="w-[50px] h-[50px] rounded-full flex items-center justify-center text-foreground hover:bg-white/10 hover:scale-110 transition-all"
              >
                <SkipForward className="w-5 h-5" />
              </button>
              <button
                onClick={toggleRepeat}
                className={`w-[50px] h-[50px] rounded-full flex items-center justify-center transition-all hover:bg-white/10 hover:scale-110 ${repeat !== 'off' ? 'text-accent' : 'text-foreground'}`}
              >
                {repeat === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
              </button>
            </div>

            {/* Extra actions */}
            <div className="flex items-center justify-center gap-7">
              <button
                onClick={() => toggleLike(currentSong)}
                className={`transition-all hover:scale-110 text-xl ${liked ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Heart className="w-6 h-6" fill={liked ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={handleDownload}
                className="text-muted-foreground hover:text-foreground transition-all hover:scale-110"
              >
                <Download className="w-6 h-6" />
              </button>
              <button className="text-muted-foreground hover:text-foreground transition-all hover:scale-110">
                <Mic className="w-6 h-6" />
              </button>
              <button className="text-muted-foreground hover:text-foreground transition-all hover:scale-110">
                <Plus className="w-6 h-6" />
              </button>
              <button className="text-muted-foreground hover:text-foreground transition-all hover:scale-110">
                <Share2 className="w-6 h-6" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
