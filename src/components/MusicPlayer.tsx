import { useRef, useEffect, useCallback, useState } from 'react';
import { usePlayerStore, useLikedStore } from '@/store/playerStore';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle,
  Volume2, Volume1, VolumeX, Heart, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QueueDrawer from './QueueDrawer';
import LyricsPanel from './LyricsPanel';
import NowPlayingView from './NowPlayingView';

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const {
    currentSong, isPlaying, volume, currentTime, duration,
    shuffle, repeat, togglePlay, setCurrentTime, setDuration,
    setIsPlaying, playNext, playPrev, toggleShuffle, toggleRepeat, setVolume
  } = usePlayerStore();
  const { isLiked, toggleLike } = useLikedStore();

  const [queueOpen, setQueueOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);

  // Load song
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    audio.src = currentSong.url;
    audio.volume = volume;
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

  const onTimeUpdate = useCallback(() => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  }, [setCurrentTime]);

  const onLoadedMetadata = useCallback(() => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  }, [setDuration]);

  const onEnded = useCallback(() => {
    if (repeat === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else {
      playNext();
    }
  }, [repeat, playNext]);

  const handleNowPlayingSeek = (time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  if (!currentSong) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
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
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50"
          style={{ backdropFilter: 'blur(12px)', height: '90px' }}
        >
          {/* Progress bar on top */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-white/10">
            <div
              className="h-full rounded-r-sm relative"
              style={{
                width: `${progress}%`,
                background: 'var(--gradient-primary)',
              }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[10px] h-[10px] bg-foreground rounded-full shadow-md" />
            </div>
          </div>

          <div className="flex items-center h-full px-5 gap-3">
            {/* Left: Song info */}
            <div
              className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
              onClick={() => setNowPlayingOpen(true)}
            >
              <motion.img
                key={currentSong.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={currentSong.image}
                alt={currentSong.name}
                className="w-[60px] h-[60px] rounded-xl object-cover shadow-lg shrink-0"
              />
              <div className="min-w-0">
                <p className="text-base font-semibold truncate text-foreground">{currentSong.name}</p>
                <p className="text-[13px] text-muted-foreground truncate">{currentSong.artist}</p>
              </div>
            </div>

            {/* Center: Controls */}
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

            {/* Right: Extra controls */}
            <div className="flex-1 flex items-center justify-end gap-4">
              <button
                onClick={toggleShuffle}
                className={`transition-all hover:scale-110 hidden sm:block ${shuffle ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Shuffle className="w-[18px] h-[18px]" />
              </button>
              <button
                onClick={() => toggleLike(currentSong)}
                className={`transition-all hover:scale-110 ${liked ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Heart className="w-[18px] h-[18px]" fill={liked ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
                className="text-muted-foreground hover:text-foreground transition-all hover:scale-110 hidden sm:block"
              >
                {volume === 0 ? <VolumeX className="w-[18px] h-[18px]" /> : volume < 0.5 ? <Volume1 className="w-[18px] h-[18px]" /> : <Volume2 className="w-[18px] h-[18px]" />}
              </button>
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
