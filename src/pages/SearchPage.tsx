import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchSongs } from '@/services/musicApi';
import SongCard from '@/components/SongCard';
import PlaylistCardRef from '@/components/PlaylistCardRef';
import { Search as SearchIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchPlaylist, FEATURED_PLAYLISTS } from '@/services/musicApi';

const CATEGORIES = ['All', 'Songs', 'Artists', 'Playlists', 'Albums', 'Podcasts', 'Genres'];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchSongs(debouncedQuery),
    enabled: debouncedQuery.length > 1,
  });

  // Browse all playlists
  const browseQueries = FEATURED_PLAYLISTS.slice(0, 4).map(p => ({
    ...p,
    query: useQuery({
      queryKey: ['playlist-meta', p.id],
      queryFn: () => fetchPlaylist(p.id),
    }),
  }));
  const loadedBrowse = browseQueries.filter(p => p.query.data);

  const handleInput = (val: string) => {
    setQuery(val);
    clearTimeout((window as any).__searchTimer);
    (window as any).__searchTimer = setTimeout(() => setDebouncedQuery(val), 400);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-40 px-5 pt-5">
      {/* Search bar - glass container like reference */}
      <div className="glass rounded-2xl p-5 mb-6">
        <div className="flex items-center bg-white/10 rounded-full px-5 py-3 transition-all focus-within:bg-white/15">
          <SearchIcon className="w-[18px] h-[18px] text-muted-foreground mr-3 shrink-0" />
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

      {/* Browse all - horizontal playlist cards like reference */}
      {!debouncedQuery && (
        <>
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-5">Browse all</h2>
            <div className="horizontal-scroll">
              {loadedBrowse.map((p) => (
                <PlaylistCardRef
                  key={p.id}
                  id={p.id}
                  name={p.query.data!.name}
                  image={p.query.data!.image}
                  songCount={p.query.data!.songs.length}
                  songs={p.query.data!.songs}
                />
              ))}
            </div>
          </section>

          {/* Popular artists - circular cards like reference */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-5">Popular artists</h2>
            <div className="horizontal-scroll">
              {loadedBrowse.map((p) => {
                const artist = p.query.data?.songs?.[0]?.artist || p.name;
                const image = p.query.data?.songs?.[0]?.image || '';
                return (
                  <div key={p.id} className="text-center cursor-pointer group shrink-0" style={{ minWidth: 150 }}>
                    <div className="w-[150px] h-[150px] rounded-full overflow-hidden border-[3px] border-border/50 shadow-lg mx-auto mb-4 group-hover:-translate-y-1 transition-transform">
                      <img src={image} alt={artist} className="w-full h-full object-cover" />
                    </div>
                    <p className="font-semibold text-foreground text-[16px] mb-1">{artist}</p>
                    <p className="text-xs text-muted-foreground">Artist</p>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
