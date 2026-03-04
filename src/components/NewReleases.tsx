import { useQuery } from '@tanstack/react-query';
import { fetchPlaylist } from '@/services/musicApi';
import { Song } from '@/store/playerStore';
import { Disc3, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import PlaylistCard from './PlaylistCard';

// Use JioSaavn playlists for new/trending content since Spotify API is in dev mode
const NEW_RELEASE_PLAYLISTS = [
  { id: '1134543272', name: 'Top Hits' },
  { id: '110858205', name: 'Trending Today' },
];

export default function NewReleases() {
  const { data, isLoading } = useQuery({
    queryKey: ['new-releases-jiosaavn'],
    queryFn: async () => {
      const playlist = await fetchPlaylist('110858205');
      return playlist.songs.slice(0, 12);
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading || !data || data.length === 0) return null;

  return (
    <section className="mb-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 mb-4"
      >
        <Disc3 className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold font-display text-foreground">Trending Today</h2>
      </motion.div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {data.map((song, i) => (
          <motion.div
            key={song.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-xl p-3 group cursor-pointer hover:bg-secondary/40 transition-all"
            onClick={() => {
              const { usePlayerStore } = require('@/store/playerStore');
              usePlayerStore.getState().setQueue(data);
              usePlayerStore.getState().setCurrentSong(song);
            }}
          >
            <div className="relative aspect-square rounded-lg overflow-hidden mb-3">
              <img
                src={song.image}
                alt={song.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-background/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                  <Play className="w-4 h-4 text-primary-foreground ml-0.5" />
                </div>
              </div>
            </div>
            <p className="text-sm font-medium text-foreground truncate">{song.name}</p>
            <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
