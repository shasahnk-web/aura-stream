import { useQuery } from '@tanstack/react-query';
import { usePlayerStore, Song } from '@/store/playerStore';
import { spotifySearch, spotifyRecommendations, spotifyTrackToSong, SpotifyTrack } from '@/services/spotifyApi';
import SongCard from './SongCard';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SpotifyRecommendations() {
  const currentSong = usePlayerStore(s => s.currentSong);

  // First find the Spotify track ID by searching the current song
  const { data: seedTrackId } = useQuery({
    queryKey: ['spotify-seed', currentSong?.name, currentSong?.artist],
    queryFn: async () => {
      if (!currentSong) return null;
      const q = `${currentSong.name} ${currentSong.artist}`;
      const data = await spotifySearch(q, 'track', 1);
      return data.tracks?.items?.[0]?.id || null;
    },
    enabled: !!currentSong && !currentSong.id.startsWith('spotify-'),
    staleTime: 5 * 60 * 1000,
  });

  const resolvedSeedId = currentSong?.id.startsWith('spotify-')
    ? currentSong.id.replace('spotify-', '')
    : seedTrackId;

  const { data: recommendations } = useQuery({
    queryKey: ['spotify-recs', resolvedSeedId],
    queryFn: async (): Promise<Song[]> => {
      if (!resolvedSeedId) return [];
      try {
        const data = await spotifyRecommendations({ seedTracks: resolvedSeedId, limit: 8 });
        const tracks: SpotifyTrack[] = data.tracks || [];
        return tracks.filter(t => t.preview_url).map(spotifyTrackToSong);
      } catch {
        return [];
      }
    },
    enabled: !!resolvedSeedId,
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
