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
          style={{ backdropFilter: 'blur(30px)' }}
        >
          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-secondary">
            <div className="h-full bg-primary transition-all duration-150" style={{ width: `${progress}%` }} />
          </div>

          {/* Mobile layout */}
          <div
            className="flex md:hidden items-center h-16 px-3 gap-3 cursor-pointer"
            onClick={() => setNowPlayingOpen(true)}
          >
            <motion.img
              key={currentSong.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={currentSong.image}
              alt={currentSong.name}
              className="w-11 h-11 rounded-lg object-cover shadow-lg"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate text-foreground">{currentSong.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{currentSong.artist}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); toggleLike(currentSong); }}
              className={`transition-colors ${liked ? 'text-accent' : 'text-muted-foreground'}`}
            >
              <Heart className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center"
            >
              {isPlaying ? <Pause className="w-4 h-4 text-background" /> : <Play className="w-4 h-4 text-background ml-0.5" />}
            </button>
          </div>

          {/* Desktop layout */}
          <div className="hidden md:flex items-center h-20 px-4 gap-4">
            <div
              className="flex items-center gap-3 min-w-0 w-[280px] cursor-pointer"
              onClick={() => setNowPlayingOpen(true)}
            >
              <motion.img
                key={currentSong.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={currentSong.image}
                alt={currentSong.name}
                className="w-14 h-14 rounded-lg object-cover shadow-lg"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate text-foreground">{currentSong.name}</p>
                <p className="text-xs text-muted-foreground truncate">{currentSong.artist}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); toggleLike(currentSong); }}
                className={`ml-2 transition-colors shrink-0 ${liked ? 'text-accent' : 'text-muted-foreground hover:text-accent'}`}
              >
                <Heart className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center gap-1 max-w-[600px] mx-auto">
              <div className="flex items-center gap-4">
                <button onClick={toggleShuffle} className={`transition-colors ${shuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  <Shuffle className="w-4 h-4" />
                </button>
                <button onClick={playPrev} className="text-muted-foreground hover:text-foreground transition-colors">
                  <SkipBack className="w-5 h-5" />
                </button>
                <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center hover:scale-105 transition-transform">
                  {isPlaying ? <Pause className="w-5 h-5 text-background" /> : <Play className="w-5 h-5 text-background ml-0.5" />}
                </button>
                <button onClick={playNext} className="text-muted-foreground hover:text-foreground transition-colors">
                  <SkipForward className="w-5 h-5" />
                </button>
                <button onClick={toggleRepeat} className={`transition-colors ${repeat !== 'off' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center gap-2 w-full">
                <span className="text-[10px] text-muted-foreground w-10 text-right">{formatTime(currentTime)}</span>
                <input
                  type="range" min={0} max={duration || 0} value={currentTime} onChange={handleSeek}
                  className="flex-1 h-1 bg-secondary rounded-full appearance-none cursor-pointer player-seek"
                  style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${progress}%, hsl(var(--muted)) ${progress}%)` }}
                />
                <span className="text-[10px] text-muted-foreground w-10">{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-[280px] justify-end">
              <AudioVisualizer audioElement={audioRef.current} barCount={16} className="h-8 w-24 mr-1" />
              <button onClick={handleDownload} className="text-muted-foreground hover:text-foreground transition-colors" title="Download">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={() => setNowPlayingOpen(true)} className="text-muted-foreground hover:text-foreground transition-colors" title="Now Playing">
                <Maximize2 className="w-4 h-4" />
              </button>
              <button onClick={() => setLyricsOpen(true)} className="text-muted-foreground hover:text-foreground transition-colors">
                <Music2 className="w-4 h-4" />
              </button>
              <button onClick={() => setQueueOpen(true)} className="text-muted-foreground hover:text-foreground transition-colors">
                <ListMusic className="w-4 h-4" />
              </button>
              <PlaybackControls
                playbackRate={playbackRate}
                onPlaybackRateChange={setPlaybackRate}
                crossfadeDuration={crossfadeDuration}
                onCrossfadeDurationChange={setCrossfadeDuration}
              />
              <SleepTimer />
              <button onClick={() => setVolume(volume === 0 ? 0.7 : 0)} className="text-muted-foreground hover:text-foreground transition-colors">
                <VolumeIcon className="w-4 h-4" />
              </button>
              <input
                type="range" min={0} max={1} step={0.01} value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 h-1 bg-secondary rounded-full appearance-none cursor-pointer player-seek"
                style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${volume * 100}%, hsl(var(--muted)) ${volume * 100}%)` }}
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
