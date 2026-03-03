import { useQuery } from '@tanstack/react-query';
import { spotifyNewReleases, spotifyTrackToSong, SpotifyTrack } from '@/services/spotifyApi';
import { usePlayerStore, Song } from '@/store/playerStore';
import { Disc3, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  images: { url: string; width: number }[];
  release_date: string;
  total_tracks: number;
}

export default function NewReleases() {
  const { data: albums, isLoading } = useQuery({
    queryKey: ['spotify-new-releases'],
    queryFn: async (): Promise<SpotifyAlbum[]> => {
      try {
        const data = await spotifyNewReleases(12);
        return data.albums?.items || [];
      } catch {
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading || !albums || albums.length === 0) return null;

  return (
    <section className="mb-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 mb-4"
      >
        <Disc3 className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold font-display text-foreground">New Releases</h2>
      </motion.div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {albums.map((album, i) => (
          <motion.div
            key={album.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-xl p-3 group cursor-pointer hover:bg-secondary/40 transition-all"
          >
            <Link to={`/artist/${album.artists[0]?.id}`} className="block">
              <div className="relative aspect-square rounded-lg overflow-hidden mb-3">
                <img
                  src={album.images?.[0]?.url || ''}
                  alt={album.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-background/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <Play className="w-4 h-4 text-primary-foreground ml-0.5" />
                  </div>
                </div>
              </div>
              <p className="text-sm font-medium text-foreground truncate">{album.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {album.artists.map(a => a.name).join(', ')}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
