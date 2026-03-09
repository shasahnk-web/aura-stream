import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPlaylist, FEATURED_PLAYLISTS } from '@/services/musicApi';
import PlaylistCardRef from '@/components/PlaylistCardRef';
import SongCard from '@/components/SongCard';
import SpotifyRecommendations from '@/components/SpotifyRecommendations';
import NewReleases from '@/components/NewReleases';
import AiDjSection from '@/components/AiDjSection';
import { usePlayerStore, Song } from '@/store/playerStore';
import { motion } from 'framer-motion';
import { useAutoplay } from '@/hooks/useAutoplay';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';

export default function HomePage() {
  useAutoplay();
  const { user } = useAuthStore();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('name').eq('id', user.id).single().then(({ data }) => {
        if (data?.name) setUserName(data.name);
      });
    } else {
      // Fallback to localStorage
      const stored = localStorage.getItem('kanako-user-name');
      if (stored) setUserName(stored);
    }
  }, [user]);

  const playlistQueries = FEATURED_PLAYLISTS.map(p => ({
    ...p,
    query: useQuery({
      queryKey: ['playlist-meta', p.id],
      queryFn: () => fetchPlaylist(p.id),
    }),
  }));

  const loadedPlaylists = playlistQueries.filter(p => p.query.data);
  const trendingSongs = loadedPlaylists[0]?.query.data?.songs?.slice(0, 8) || [];

  const greeting = () => {
    const h = new Date().getHours();
    const name = userName || 'there';
    if (h >= 5 && h < 12) return `Morning ${name}`;
    if (h >= 12 && h < 17) return `Afternoon ${name}`;
    if (h >= 17 && h < 21) return `Evening ${name}`;
    return `Night ${name}`;
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-36 md:pb-28 px-4 md:px-6 pt-5">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">{greeting()}</h1>
        <p className="text-muted-foreground text-sm mt-1">Discover your next favorite track</p>
      </motion.div>

      {/* Recently Played - Horizontal scroll */}
      {loadedPlaylists.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Recently Played</h2>
            <span className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">See all</span>
          </div>
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

      {/* AI DJ Section */}
      <AiDjSection />

      {/* Spotify Recommendations */}
      <SpotifyRecommendations />

      {/* New Releases / Trending */}
      <NewReleases />

      {/* Popular Songs */}
      {trendingSongs.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Popular Songs</h2>
          <div className="flex flex-col">
            {trendingSongs.map((song, i) => (
              <SongCard key={song.id} song={song} songs={trendingSongs} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Made For You - horizontal playlists */}
      {loadedPlaylists.length > 1 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Made For You</h2>
            <span className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">See all</span>
          </div>
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
