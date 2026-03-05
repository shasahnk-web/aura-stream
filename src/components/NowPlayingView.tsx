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
          style={{
            background: 'linear-gradient(135deg, hsl(240 40% 8%), hsl(250 30% 18%))',
          }}
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
          <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8 max-w-lg mx-auto w-full">
            {/* Album Art - floating like reference */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="relative w-[280px] h-[280px] rounded-[20px] overflow-hidden floating"
              style={{ boxShadow: '0 20px 50px hsl(0 0% 0% / 0.3)' }}
            >
              <img
                src={currentSong.image}
                alt={currentSong.name}
                className={`w-full h-full object-cover ${isPlaying ? 'spinning' : ''}`}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/50" />
            </motion.div>

            {/* Song Info */}
            <div className="text-center w-full">
              <h2 className="text-2xl font-bold text-foreground truncate">
                {currentSong.name}
              </h2>
              <p className="text-base text-muted-foreground mt-1 truncate">{currentSong.artist}</p>
            </div>

            {/* Progress */}
            <div className="w-full">
              <div className="flex justify-between mb-2">
                <span className="text-xs text-muted-foreground">{formatTime(currentTime)}</span>
                <span className="text-xs text-muted-foreground">{formatTime(duration)}</span>
              </div>
              <div className="relative w-full h-1 bg-white/10 rounded-sm overflow-visible">
                <div
                  className="h-full rounded-sm relative"
                  style={{
                    width: `${progress}%`,
                    background: 'var(--gradient-primary)',
                  }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
                </div>
              </div>
              <input
                type="range" min={0} max={duration || 0} value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 absolute opacity-0 cursor-pointer"
                style={{ marginTop: '-6px' }}
              />
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
