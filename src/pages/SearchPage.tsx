import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchSongs } from '@/services/musicApi';
import SongCard from '@/components/SongCard';
import PlaylistCardRef from '@/components/PlaylistCardRef';
import { Search as SearchIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const CATEGORIES = ['All', 'Songs', 'Artists', 'Playlists', 'Albums', 'Podcasts', 'Genres'];

const BROWSE_GENRES = [
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
  const [activeCategory, setActiveCategory] = useState('All');

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchSongs(debouncedQuery),
    enabled: debouncedQuery.length > 1,
  });

  const handleInput = (val: string) => {
    setQuery(val);
    const timerKey = '__searchTimer' as keyof Window;
    clearTimeout((window[timerKey] as unknown) as NodeJS.Timeout);
    (window[timerKey] as unknown) = setTimeout(() => setDebouncedQuery(val), 400);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-36 md:pb-28 px-4 md:px-6 pt-5">
      {/* Search bar - glass container like reference */}
      <div className="glass rounded-2xl p-5 mb-6">
        <div className="flex items-center bg-white/10 rounded-full px-5 py-3 transition-all focus-within:bg-white/15">
          <SearchIcon className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="Search for songs, artists, or albums"
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-[15px]"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="flex gap-2.5 mb-6 overflow-x-auto scrollbar-hide pb-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      {results && results.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Results</h2>
          <div className="flex flex-col">
            {results.map((song, i) => (
              <SongCard key={song.id} song={song} songs={results} index={i} />
            ))}
          </div>
        </section>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="song-item animate-pulse">
              <div className="w-8 h-4 bg-secondary rounded mr-4" />
              <div className="w-[50px] h-[50px] bg-secondary rounded-[10px] mr-4" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-secondary rounded w-1/2" />
                <div className="h-3 bg-secondary rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Browse genres */}
      {!debouncedQuery && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Browse all</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {BROWSE_GENRES.map((g, i) => (
              <motion.div
                key={g.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleInput(g.name)}
                className={`bg-gradient-to-br ${g.gradient} rounded-2xl p-6 cursor-pointer hover:scale-105 transition-transform shadow-lg`}
              >
                <span className="text-sm font-bold text-white">{g.name}</span>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
