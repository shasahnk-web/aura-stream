import { useRef, useEffect, useCallback, useState } from 'react';
import { usePlayerStore, useLikedStore } from '@/store/playerStore';
import { useRoomStore } from '@/store/roomStore';
import {
  Play, Pause,
  Heart, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import NowPlayingView from './NowPlayingView';
import useBeatDetector from '@/hooks/useBeatDetector';

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const {
    currentSong, isPlaying, volume, currentTime, duration,
    repeat, togglePlay, setCurrentSong, setCurrentTime, setDuration,
    setIsPlaying, playNext,
  } = usePlayerStore();
  const { isLiked, toggleLike } = useLikedStore();
  const { isHost, currentRoom, emitBeatDrop } = useRoomStore();

  const onBeatDrop = useCallback(
    (time: number) => {
      if (isHost && currentRoom?.party_mode) {
        emitBeatDrop(time);
      }
    },
    [emitBeatDrop, isHost, currentRoom?.party_mode]
  );

  useBeatDetector(audioRef.current, Boolean(currentRoom?.party_mode), onBeatDrop, {
    sensitivity: 1.5,
    minIntervalMs: 1000,
  });

  // Listener: sync to room state
  useEffect(() => {
    if (!currentRoom || isHost) return;

    if (currentRoom.current_song && currentRoom.current_song.id !== currentSong?.id) {
      setCurrentSong(currentRoom.current_song);
    }

    setIsPlaying(currentRoom.is_playing);

    if (audioRef.current) {
      const drift = Math.abs(audioRef.current.currentTime - currentRoom.playback_time);
      if (drift > 1.0) {
        audioRef.current.currentTime = currentRoom.playback_time;
        setCurrentTime(currentRoom.playback_time);
      }
    }
  }, [currentRoom?.current_song?.id, currentRoom?.is_playing, currentRoom?.playback_time, isHost, currentSong?.id, setCurrentSong, setCurrentTime, setIsPlaying]);

  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);

  // Load song
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    audio.src = currentSong.url;
    audio.volume = volume;
    if (isPlaying) audio.play().catch(() => { });
  }, [currentSong]);

  // Play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.play().catch(() => { });
    else audio.pause();
  }, [isPlaying]);

  // Volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const onTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    setCurrentTime(current);
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

  const handleNowPlayingSeek = (time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  if (!currentSong) return null;

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
        {!nowPlayingOpen && currentSong && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="music-player fixed z-[9999] left-[10px] right-[10px] h-[var(--player-height)] bottom-[calc(var(--nav-height)+8px)] md:bottom-[calc(var(--nav-height)+10px)]"
          >
            <div className="flex items-center gap-3 w-full">
              <img
                src={currentSong.image}
                alt={currentSong.name}
                className="w-[50px] h-[50px] rounded-xl object-cover shadow-lg player-img"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate text-text">{currentSong.name}</p>
                <p className="text-xs text-subtext truncate">{currentSong.artist}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleLike(currentSong); }}
                  className={`transition-all hover:scale-110 ${liked ? 'text-accent' : 'text-subtext'}`}
                >
                  <Heart className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center shadow-lg play-btn"
                  style={{ boxShadow: '0 0 20px rgba(168,85,247,0.6)' }}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <button
                  onClick={() => setNowPlayingOpen(true)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-text hover:bg-white/10 transition-all"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <NowPlayingView
        open={nowPlayingOpen}
        onOpenChange={setNowPlayingOpen}
        audioElement={audioRef.current}
        onSeek={handleNowPlayingSeek}
      />
    </>
  );
}
