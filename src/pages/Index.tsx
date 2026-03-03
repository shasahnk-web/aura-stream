import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPlaylist, FEATURED_PLAYLISTS } from '@/services/musicApi';
import PlaylistCard from '@/components/PlaylistCard';
import SongCard from '@/components/SongCard';
import SpotifyRecommendations from '@/components/SpotifyRecommendations';
import NewReleases from '@/components/NewReleases';
import { usePlayerStore, Song } from '@/store/playerStore';
import { motion } from 'framer-motion';
import { Play, TrendingUp, Clock, Sparkles } from 'lucide-react';

function QuickPlayCard({ name, image, songs, index }: { name: string; image: string; songs: Song[]; index: number }) {
  const { setCurrentSong, setQueue } = usePlayerStore();
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => { setQueue(songs); if (songs[0]) setCurrentSong(songs[0]); }}
      className="flex items-center gap-3 glass rounded-lg overflow-hidden cursor-pointer hover:bg-secondary/40 transition-all group"
    >
      <img src={image} alt={name} className="w-12 h-12 object-cover" />
      <span className="text-sm font-medium text-foreground truncate flex-1 pr-2">{name}</span>
      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <Play className="w-3 h-3 text-primary ml-0.5" />
      </div>
    </motion.div>
  );
}

export default function HomePage() {
  const trendingQuery = useQuery({
    queryKey: ['playlist', FEATURED_PLAYLISTS[0].id],
    queryFn: () => fetchPlaylist(FEATURED_PLAYLISTS[0].id),
  });

  const playlistQueries = FEATURED_PLAYLISTS.slice(0, 6).map(p => ({
    ...p,
    query: useQuery({
      queryKey: ['playlist-meta', p.id],
      queryFn: () => fetchPlaylist(p.id),
    }),
  }));

  const loadedPlaylists = playlistQueries.filter(p => p.query.data);
  const trendingSongs = trendingQuery.data?.songs?.slice(0, 10) || [];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-36 md:pb-28 px-4 md:px-8 pt-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-1">{greeting()}</h1>
        <p className="text-muted-foreground text-sm mb-6">Discover your next favorite track</p>
      </motion.div>

      {/* Quick Play Grid */}
      {loadedPlaylists.length > 0 && (
        <section className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {loadedPlaylists.slice(0, 6).map((p, i) => (
              <QuickPlayCard
                key={p.id}
                name={p.query.data!.name}
                image={p.query.data!.image}
                songs={p.query.data!.songs}
                index={i}
              />
            ))}
          </div>
        </section>
      )}

      {/* Spotify Recommendations */}
      <SpotifyRecommendations />

      {/* New Releases */}
      <NewReleases />

      {/* Trending Songs */}
      {trendingSongs.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold font-display text-foreground">Trending Now</h2>
          </div>
          <div className="glass rounded-xl p-2">
            {trendingSongs.map((song, i) => (
              <SongCard key={song.id} song={song} songs={trendingSongs} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Featured Playlists */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-accent" />
          <h2 className="text-xl font-bold font-display text-foreground">Featured Playlists</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {loadedPlaylists.map((p, i) => (
            <PlaylistCard
              key={p.id}
              id={p.id}
              name={p.query.data!.name}
              image={p.query.data!.image}
              subtitle={`${p.query.data!.songs.length} songs`}
              index={i}
            />
          ))}
        </div>
      </section>

      {/* Loading skeleton */}
      {loadedPlaylists.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-xl p-3 animate-pulse">
              <div className="aspect-square rounded-lg bg-secondary mb-3" />
              <div className="h-3 bg-secondary rounded w-3/4 mb-1" />
              <div className="h-2 bg-secondary rounded w-1/2" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
