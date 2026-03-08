import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { fetchPlaylist, FEATURED_PLAYLISTS } from '@/services/musicApi';

export function useAutoplay() {
  const hasRun = useRef(false);
  const { currentSong, setCurrentSong, setQueue } = usePlayerStore();

  useEffect(() => {
    if (hasRun.current || currentSong) return;
    hasRun.current = true;

    const autoplay = async () => {
      try {
        // Pick a random featured playlist for variety
        const randomPlaylist = FEATURED_PLAYLISTS[Math.floor(Math.random() * FEATURED_PLAYLISTS.length)];
        const data = await fetchPlaylist(randomPlaylist.id);
        if (data.songs.length > 0) {
          // Pick a random song from the playlist
          const randomIndex = Math.floor(Math.random() * Math.min(data.songs.length, 20));
          setQueue(data.songs);
          setCurrentSong(data.songs[randomIndex]);
        }
      } catch {
        // Silently fail - autoplay is a nice-to-have
      }
    };

    // Small delay so UI renders first
    const timer = setTimeout(autoplay, 1500);
    return () => clearTimeout(timer);
  }, [currentSong, setCurrentSong, setQueue]);
}
