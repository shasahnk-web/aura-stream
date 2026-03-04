import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPlaylist, FEATURED_PLAYLISTS } from '@/services/musicApi';
import { useLikedStore, usePlayerStore, Song } from '@/store/playerStore';
import SongCard from '@/components/SongCard';
import PlaylistCard from '@/components/PlaylistCard';
import { Heart, ListMusic, TrendingUp, Radio, Play, Shuffle, Library } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const tabs = [
  { id: 'liked', label: 'Liked Songs', icon: Heart },
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'radio', label: 'Radio', icon: Radio },
];

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState('liked');
  const { likedSongs } = useLikedStore();
  const { setCurrentSong, setQueue } = usePlayerStore();
  const navigate = useNavigate();

  const trendingQuery = useQuery({
    queryKey: ['playlist', FEATURED_PLAYLISTS[0].id],
    queryFn: () => fetchPlaylist(FEATURED_PLAYLISTS[0].id),
  });

  const playlistQueries = FEATURED_PLAYLISTS.map(p => ({
    ...p,
    query: useQuery({
      queryKey: ['playlist-meta', p.id],
      queryFn: () => fetchPlaylist(p.id),
    }),
  }));

  const handlePlayAll = (songs: Song[]) => {
    if (songs.length) { setQueue(songs); setCurrentSong(songs[0]); }
  };

  const handleShuffle = (songs: Song[]) => {
    if (songs.length) {
      const shuffled = [...songs].sort(() => Math.random() - 0.5);
      setQueue(shuffled); setCurrentSong(shuffled[0]);
    }
  };

  const trendingSongs = trendingQuery.data?.songs || [];
  const loadedPlaylists = playlistQueries.filter(p => p.query.data);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-36 md:pb-28">
      {/* Header */}
      <div className="px-4 md:px-8 pt-6 pb-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-4">
            <Library className="w-6 h-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Your Library</h1>
          </div>
        </motion.div>

        {/* Tabs - styled like reference design */}
        <div className="flex gap-1 border-b border-border/50 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="library-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full"
                  style={{ background: 'var(--gradient-primary)' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="px-4 md:px-8"
        >
          {/* Liked Songs Tab */}
          {activeTab === 'liked' && (
            <div>
              {likedSongs.length > 0 && (
                <div className="flex gap-3 mb-4">
                  <button onClick={() => handlePlayAll(likedSongs)} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 neon-glow">
                    <Play className="w-4 h-4 ml-0.5" /> Play All
                  </button>
                  <button onClick={() => handleShuffle(likedSongs)} className="px-5 py-2.5 rounded-full glass text-foreground font-semibold text-sm hover:bg-secondary/40 transition-colors flex items-center gap-2">
                    <Shuffle className="w-4 h-4" /> Shuffle
                  </button>
                </div>
              )}
              {likedSongs.length === 0 ? (
                <div className="text-center py-20">
                  <Heart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">No liked songs yet</h2>
                  <p className="text-sm text-muted-foreground">Tap the heart icon on any song to save it here.</p>
                </div>
              ) : (
                <div className="glass rounded-xl p-2">
                  {likedSongs.map((song, i) => (
                    <SongCard key={song.id} song={song} songs={likedSongs} index={i} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Playlists Tab */}
          {activeTab === 'playlists' && (
            <div>
              {loadedPlaylists.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="glass rounded-xl p-3 animate-pulse">
                      <div className="aspect-square rounded-lg bg-secondary mb-3" />
                      <div className="h-3 bg-secondary rounded w-3/4 mb-1" />
                      <div className="h-2 bg-secondary rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (
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
              )}
            </div>
          )}

          {/* Trending Tab */}
          {activeTab === 'trending' && (
            <div>
              {trendingSongs.length > 0 && (
                <div className="flex gap-3 mb-4">
                  <button onClick={() => handlePlayAll(trendingSongs)} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 neon-glow">
                    <Play className="w-4 h-4 ml-0.5" /> Play All
                  </button>
                  <button onClick={() => handleShuffle(trendingSongs)} className="px-5 py-2.5 rounded-full glass text-foreground font-semibold text-sm hover:bg-secondary/40 transition-colors flex items-center gap-2">
                    <Shuffle className="w-4 h-4" /> Shuffle
                  </button>
                </div>
              )}
              {trendingQuery.isLoading ? (
                <div className="glass rounded-xl p-2 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                      <div className="w-10 h-10 bg-secondary rounded" />
                      <div className="flex-1 space-y-1"><div className="h-3 bg-secondary rounded w-1/3" /><div className="h-2 bg-secondary rounded w-1/4" /></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass rounded-xl p-2">
                  {trendingSongs.map((song, i) => (
                    <SongCard key={song.id} song={song} songs={trendingSongs} index={i} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Radio Tab */}
          {activeTab === 'radio' && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">Pick a station and start listening</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {loadedPlaylists.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => {
                      if (p.query.data?.songs) {
                        const shuffled = [...p.query.data.songs].sort(() => Math.random() - 0.5);
                        setQueue(shuffled);
                        setCurrentSong(shuffled[0]);
                      }
                    }}
                    className="group cursor-pointer"
                  >
                    <div className="relative rounded-xl overflow-hidden glass p-3 hover:bg-secondary/30 transition-all duration-300">
                      <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-gradient-to-br from-accent/30 to-primary/30 flex items-center justify-center">
                        {p.query.data?.image ? (
                          <img src={p.query.data.image} alt={p.query.data.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <Radio className="w-12 h-12 text-primary/60" />
                        )}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                        >
                          <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                        </motion.button>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground truncate">{p.query.data?.name || p.name} Radio</h3>
                      <p className="text-xs text-muted-foreground">{p.query.data ? `${p.query.data.songs.length} tracks` : 'Loading...'}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
