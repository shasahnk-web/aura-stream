import { useQuery } from '@tanstack/react-query';
import { usePlayerStore, Song } from '@/store/playerStore';
import { searchSongs } from '@/services/musicApi';
import SongCard from './SongCard';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SpotifyRecommendations() {
  const currentSong = usePlayerStore(s => s.currentSong);

  const { data: recommendations } = useQuery({
    queryKey: ['recommendations', currentSong?.name, currentSong?.artist],
    queryFn: async (): Promise<Song[]> => {
      if (!currentSong) return [];
      try {
        // Use JioSaavn search as recommendation engine based on current artist
        const results = await searchSongs(currentSong.artist);
        // Filter out the current song and limit
        return results.filter(s => s.id !== currentSong.id).slice(0, 8);
      } catch {
        return [];
      }
    },
    enabled: !!currentSong,
    staleTime: 5 * 60 * 1000,
  });

  if (!recommendations || recommendations.length === 0) return null;

  return (
    <section className="mb-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 mb-4"
      >
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold font-display text-foreground">Recommended For You</h2>
        <span className="text-xs text-muted-foreground ml-2">Based on "{currentSong?.name}"</span>
      </motion.div>
      <div className="glass rounded-xl p-2">
        {recommendations.map((song, i) => (
          <SongCard key={song.id} song={song} songs={recommendations} index={i} />
        ))}
      </div>
    </section>
  );
}
