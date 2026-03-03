import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchSongs } from '@/services/musicApi';
import { spotifySearch, spotifyTrackToSong, SpotifyTrack } from '@/services/spotifyApi';
import SongCard from '@/components/SongCard';
import { Search as SearchIcon, Music2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Song } from '@/store/playerStore';

const GENRES = [
  { name: 'Pop', gradient: 'from-pink-500 to-rose-400' },
  { name: 'Hip Hop', gradient: 'from-amber-500 to-orange-400' },
  { name: 'Rock', gradient: 'from-red-600 to-red-400' },
  { name: 'Electronic', gradient: 'from-cyan-500 to-blue-400' },
  { name: 'Jazz', gradient: 'from-emerald-500 to-teal-400' },
  { name: 'Classical', gradient: 'from-purple-500 to-violet-400' },
  { name: 'R&B', gradient: 'from-fuchsia-500 to-pink-400' },
  { name: 'Bollywood', gradient: 'from-yellow-500 to-amber-400' },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { data: jiosaavnResults, isLoading: jiosaavnLoading } = useQuery({
    queryKey: ['search-jiosaavn', debouncedQuery],
    queryFn: () => searchSongs(debouncedQuery),
    enabled: debouncedQuery.length > 1,
  });

  const { data: spotifyResults, isLoading: spotifyLoading } = useQuery({
    queryKey: ['search-spotify', debouncedQuery],
    queryFn: async (): Promise<Song[]> => {
      try {
        const data = await spotifySearch(debouncedQuery, 'track', 10);
        const tracks: SpotifyTrack[] = data.tracks?.items || [];
        return tracks.filter(t => t.preview_url).map(spotifyTrackToSong);
      } catch {
        return [];
      }
    },
    enabled: debouncedQuery.length > 1,
  });

  const isLoading = jiosaavnLoading || spotifyLoading;

  const handleInput = (val: string) => {
    setQuery(val);
    clearTimeout((window as any).__searchTimer);
    (window as any).__searchTimer = setTimeout(() => setDebouncedQuery(val), 400);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-36 md:pb-28 px-4 md:px-8 pt-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold font-display text-foreground mb-4">Search</h1>

        <div className="relative mb-6 max-w-xl">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="What do you want to listen to?"
            className="w-full pl-12 pr-4 py-3 rounded-full glass border-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>
      </motion.div>

      {/* Spotify Results */}
      {spotifyResults && spotifyResults.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Music2 className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">From Spotify</h2>
          </div>
          <div className="glass rounded-xl p-2">
            {spotifyResults.map((song, i) => (
              <SongCard key={song.id} song={song} songs={spotifyResults} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* JioSaavn Results */}
      {jiosaavnResults && jiosaavnResults.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-3">From JioSaavn</h2>
          <div className="glass rounded-xl p-2">
            {jiosaavnResults.map((song, i) => (
              <SongCard key={song.id} song={song} songs={jiosaavnResults} index={i} />
            ))}
          </div>
        </section>
      )}

      {isLoading && (
        <div className="glass rounded-xl p-4 animate-pulse space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary rounded" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-secondary rounded w-1/2" />
                <div className="h-2 bg-secondary rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!debouncedQuery && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Browse All</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {GENRES.map((g, i) => (
              <motion.div
                key={g.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleInput(g.name)}
                className={`bg-gradient-to-br ${g.gradient} rounded-xl p-6 cursor-pointer hover:scale-105 transition-transform`}
              >
                <span className="text-sm font-bold text-primary-foreground">{g.name}</span>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
