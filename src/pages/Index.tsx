import { useQuery } from '@tanstack/react-query';
import { fetchPlaylist, FEATURED_PLAYLISTS } from '@/services/musicApi';
import PlaylistCardRef from '@/components/PlaylistCardRef';
import SongCard from '@/components/SongCard';
import { motion } from 'framer-motion';

export default function HomePage() {
  const playlistQueries = FEATURED_PLAYLISTS.map(p => ({
    ...p,
    query: useQuery({
      queryKey: ['playlist-meta', p.id],
      queryFn: () => fetchPlaylist(p.id),
    }),
  }));

  const loadedPlaylists = playlistQueries.filter(p => p.query.data);
  const trendingSongs = loadedPlaylists[0]?.query.data?.songs?.slice(0, 5) || [];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-40 px-5 pt-5">
      {/* Recently Played */}
      {loadedPlaylists.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-5 flex items-center justify-between">
            Recently Played
            <span className="text-sm text-muted-foreground font-normal cursor-pointer hover:text-foreground transition-colors">See all</span>
          </h2>
          <div className="horizontal-scroll">
            {loadedPlaylists.map((p) => (
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
      )}

      {/* Made For You */}
      {loadedPlaylists.length > 1 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-5 flex items-center justify-between">
            Made For You
            <span className="text-sm text-muted-foreground font-normal cursor-pointer hover:text-foreground transition-colors">See all</span>
          </h2>
          <div className="horizontal-scroll">
            {loadedPlaylists.slice(1).map((p) => (
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
      )}

      {/* Popular Songs */}
      {trendingSongs.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-5">Popular Songs</h2>
          <div className="flex flex-col">
            {trendingSongs.map((song, i) => (
              <SongCard key={song.id} song={song} songs={trendingSongs} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Loading skeleton */}
      {loadedPlaylists.length === 0 && (
        <div className="horizontal-scroll">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="min-w-[180px] h-[180px] rounded-2xl bg-secondary/30 animate-pulse shrink-0" />
          ))}
        </div>
      )}
    </div>
  );
}
