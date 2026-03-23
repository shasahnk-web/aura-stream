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
    repeat, togglePlay, setCurrentTime, setDuration, playNext,
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

  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);

  // Load song and sync time + drift correction
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    
    if (audio.src !== currentSong.url) {
      audio.src = currentSong.url;
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
    }
    
    // Sync audio to store time (all clients)
    const drift = Math.abs(audio.currentTime - currentTime);
    if (drift > 0.5) {
      audio.currentTime = currentTime;
    }

    audio.volume = volume;

    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [currentSong, isPlaying, volume, currentTime]);

// Micro drift correction (<100ms) - all clients
  useEffect(() => {
    const playerStore = usePlayerStore.getState();
    const { currentRoom } = useRoomStore.getState();
    if (!currentRoom?.current_song || !audioRef.current) return;

    const interval = setInterval(() => {
      const audio = audioRef.current!;
      const roomState = currentRoom;
      let expectedTime = 0;
      if (roomState.is_playing && roomState.started_at) {
        expectedTime = (playerStore.now() - Number(roomState.started_at)) / 1000 + 0.05; // Predictive offset
      } else if (roomState.started_at) {
        expectedTime = Number(roomState.playback_time);
      }
      
      const diff = audio.currentTime - expectedTime;
      if (Math.abs(diff) > 0.1) {
        audio.currentTime = expectedTime;
      }
    }, 1000); // Every 1s

    return () => clearInterval(interval);
  }, []);


  const onTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, [setCurrentTime]);

  const onLoadedMetadata = useCallback(() => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  }, [setDuration]);

  const onEnded = useCallback(() => {
    if (repeat === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else if (isHost) {
      playNext();
    }
  }, [repeat, playNext, isHost]);

  const handleSeek = (time: number) => {
    if (audioRef.current && (isHost || !currentRoom)) { // Allow seeking if host or not in a room
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
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
            className="music-player"
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
        onSeek={handleSeek}
      />
    </>
  );
}
