import { useState } from 'react';
import { useLikedStore, usePlayerStore, Song } from '@/store/playerStore';
import { searchSongs } from '@/services/musicApi';
import { toast } from 'sonner';

export function useAiDj() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentMix, setCurrentMix] = useState<Song[] | null>(null);
  
  const { likedSongs } = useLikedStore();
  const { setQueue, setCurrentSong, setIsPlaying } = usePlayerStore();
  
  const startAiDj = async () => {
    setIsLoading(true);
    
    try {
      // Analyze liked songs to find common artists
      const artistCounts: Record<string, number> = {};
      likedSongs.forEach(song => {
        const artist = song.artist.split(',')[0].trim(); // Get primary artist
        artistCounts[artist] = (artistCounts[artist] || 0) + 1;
      });
      
      // Get top 3 artists (or use defaults if not enough liked songs)
      let topArtists = Object.entries(artistCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([artist]) => artist);
      
      // Fallback artists if user hasn't liked enough songs
      if (topArtists.length < 2) {
        topArtists = ['Arijit Singh', 'Pritam', 'A.R. Rahman'];
      }
      
      // Search for songs by each top artist
      const searchPromises = topArtists.map(artist => searchSongs(artist));
      const results = await Promise.all(searchPromises);
      
      // Merge and deduplicate results
      const allSongs: Song[] = [];
      const seenIds = new Set(likedSongs.map(s => s.id));
      
      results.flat().forEach(song => {
        if (!seenIds.has(song.id)) {
          seenIds.add(song.id);
          allSongs.push(song);
        }
      });
      
      // Shuffle the results
      const shuffled = allSongs.sort(() => Math.random() - 0.5).slice(0, 20);
      
      if (shuffled.length === 0) {
        toast.error('Could not find recommendations. Try liking some songs first!');
        setIsLoading(false);
        return;
      }
      
      // Set as queue and start playing
      setQueue(shuffled);
      setCurrentSong(shuffled[0]);
      setIsPlaying(true);
      setCurrentMix(shuffled);
      
      toast.success(`AI DJ: Playing ${shuffled.length} songs based on your taste!`);
    } catch (error) {
      console.error('AI DJ error:', error);
      toast.error('Failed to create AI mix');
    }
    
    setIsLoading(false);
  };
  
  return {
    isLoading,
    startAiDj,
    currentMix,
  };
}
