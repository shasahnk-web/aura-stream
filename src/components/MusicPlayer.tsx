import { useRef, useEffect, useCallback, useState } from 'react';
import { usePlayerStore, useLikedStore } from '@/store/playerStore';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, Volume1, VolumeX, Heart, ListMusic, Music2, Download, Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QueueDrawer from './QueueDrawer';
import LyricsPanel from './LyricsPanel';
import SleepTimer from './SleepTimer';
import PlaybackControls from './PlaybackControls';
import AudioVisualizer from './AudioVisualizer';
import NowPlayingView from './NowPlayingView';

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const crossfadeAudioRef = useRef<HTMLAudioElement>(null);
  const crossfadeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const {
    currentSong, isPlaying, volume, currentTime, duration,
    shuffle, repeat, togglePlay, setCurrentTime, setDuration,
    setIsPlaying, playNext, playPrev, toggleShuffle, toggleRepeat, setVolume
  } = usePlayerStore();
  const { isLiked, toggleLike } = useLikedStore();

  const [playbackRate, setPlaybackRate] = useState(1);
  const [crossfadeDuration, setCrossfadeDuration] = useState(0);
  const [queueOpen, setQueueOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);

  // Load song
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    audio.src = currentSong.url;
    audio.volume = volume;
    audio.playbackRate = playbackRate;
    if (isPlaying) audio.play().catch(() => {});
  }, [currentSong]);

  // Play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying]);

  // Volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Playback rate
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // Crossfade logic
  useEffect(() => {
    if (crossfadeDuration <= 0) return;
    const audio = audioRef.current;
    if (!audio || !duration || duration <= crossfadeDuration) return;

    const checkCrossfade = () => {
      const timeLeft = duration - audio.currentTime;
      if (timeLeft <= crossfadeDuration && timeLeft > 0) {
        const fadeStep = 50;
        const steps = (crossfadeDuration * 1000) / fadeStep;
        const volumeStep = volume / steps;
        let currentVol = volume;

        const fadeInterval = setInterval(() => {
          currentVol = Math.max(0, currentVol - volumeStep);
          if (audio) audio.volume = currentVol;
          if (currentVol <= 0) clearInterval(fadeInterval);
        }, fadeStep);

        clearTimeout(crossfadeTimerRef.current);
      }
    };

    audio.addEventListener('timeupdate', checkCrossfade);
    return () => audio.removeEventListener('timeupdate', checkCrossfade);
  }, [crossfadeDuration, duration, volume]);

  const onTimeUpdate = useCallback(() => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  }, [setCurrentTime]);

  const onLoadedMetadata = useCallback(() => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  }, [setDuration]);

  const onEnded = useCallback(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    if (repeat === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      playNext();
    }
  }, [repeat, playNext, volume]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const handleNowPlayingSeek = (time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleDownload = async () => {
    if (!currentSong?.url) return;
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

  if (!currentSong) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const liked = isLiked(currentSong.id);

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        crossOrigin="anonymous"
      />
      <audio ref={crossfadeAudioRef} crossOrigin="anonymous" />
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-16 md:bottom-0 left-0 right-0 z-50 glass border-t border-border/50"
          style={{ backdropFilter: 'blur(12px)' }}
        >
          {/* Progress bar on top like reference */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-white/10">
            <div
              className="h-full rounded-r-sm relative"
              style={{
                width: `${progress}%`,
                background: 'var(--gradient-primary)',
              }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[10px] h-[10px] bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100" />
            </div>
          </div>

          {/* Mobile layout */}
          <div
            className="flex md:hidden items-center h-[70px] px-4 gap-3 cursor-pointer"
            onClick={() => setNowPlayingOpen(true)}
          >
            <motion.img
              key={currentSong.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={currentSong.image}
              alt={currentSong.name}
              className="w-[50px] h-[50px] rounded-xl object-cover shadow-lg"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate text-foreground">{currentSong.name}</p>
              <p className="text-xs text-muted-foreground truncate">{currentSong.artist}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); toggleLike(currentSong); }}
              className={`transition-all hover:scale-110 ${liked ? 'text-accent' : 'text-muted-foreground'}`}
            >
              <Heart className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="w-[50px] h-[50px] rounded-full bg-foreground flex items-center justify-center shadow-lg"
              style={{ boxShadow: '0 4px 15px hsl(270 76% 53% / 0.4)' }}
            >
              {isPlaying ? <Pause className="w-5 h-5 text-primary" /> : <Play className="w-5 h-5 text-primary ml-0.5" />}
            </button>
          </div>

          {/* Desktop layout */}
          <div className="hidden md:flex items-center h-[90px] px-6 gap-4">
            {/* Left: Song info */}
            <div
              className="flex items-center gap-4 min-w-0 w-[280px] cursor-pointer"
              onClick={() => setNowPlayingOpen(true)}
            >
              <motion.img
                key={currentSong.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={currentSong.image}
                alt={currentSong.name}
                className="w-[60px] h-[60px] rounded-xl object-cover shadow-lg"
              />
              <div className="min-w-0">
                <p className="text-base font-semibold truncate text-foreground">{currentSong.name}</p>
                <p className="text-[13px] text-muted-foreground truncate">{currentSong.artist}</p>
              </div>
            </div>

            {/* Center: Controls */}
            <div className="flex-1 flex flex-col items-center gap-1 max-w-[600px] mx-auto">
              <div className="flex items-center gap-3">
                <button
                  onClick={playPrev}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-foreground hover:bg-white/10 transition-all"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-[50px] h-[50px] rounded-full bg-foreground flex items-center justify-center hover:scale-105 transition-transform"
                  style={{ boxShadow: '0 4px 15px hsl(270 76% 53% / 0.4)' }}
                >
                  {isPlaying ? <Pause className="w-6 h-6 text-primary" /> : <Play className="w-6 h-6 text-primary ml-0.5" />}
                </button>
                <button
                  onClick={playNext}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-foreground hover:bg-white/10 transition-all"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-2 w-full">
                <span className="text-[11px] text-muted-foreground w-10 text-right">{formatTime(currentTime)}</span>
                <input
                  type="range" min={0} max={duration || 0} value={currentTime} onChange={handleSeek}
                  className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer player-seek"
                  style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${progress}%, hsl(0 0% 100% / 0.1) ${progress}%)` }}
                />
                <span className="text-[11px] text-muted-foreground w-10">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right: Extra controls */}
            <div className="flex items-center gap-3 w-[280px] justify-end">
              <button
                onClick={toggleShuffle}
                className={`transition-all hover:scale-110 ${shuffle ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Shuffle className="w-[18px] h-[18px]" />
              </button>
              <button
                onClick={(e) => { toggleLike(currentSong); }}
                className={`transition-all hover:scale-110 ${liked ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Heart className="w-[18px] h-[18px]" fill={liked ? 'currentColor' : 'none'} />
              </button>
              <button onClick={() => setVolume(volume === 0 ? 0.7 : 0)} className="text-muted-foreground hover:text-foreground transition-all hover:scale-110">
                <VolumeIcon className="w-[18px] h-[18px]" />
              </button>
              <input
                type="range" min={0} max={1} step={0.01} value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 h-1 bg-white/10 rounded-full appearance-none cursor-pointer player-seek"
                style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${volume * 100}%, hsl(0 0% 100% / 0.1) ${volume * 100}%)` }}
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      <QueueDrawer open={queueOpen} onOpenChange={setQueueOpen} />
      <LyricsPanel open={lyricsOpen} onOpenChange={setLyricsOpen} />
      <NowPlayingView
        open={nowPlayingOpen}
        onOpenChange={setNowPlayingOpen}
        audioElement={audioRef.current}
        onSeek={handleNowPlayingSeek}
      />
    </>
  );
}
