import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPlaylist, FEATURED_PLAYLISTS } from '@/services/musicApi';
import { useLikedStore, usePlayerStore, Song } from '@/store/playerStore';
import SongCard from '@/components/SongCard';
import PlaylistCardRef from '@/components/PlaylistCardRef';
import { Heart, Play, Shuffle, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const tabs = [
  { id: 'playlists', label: 'Playlists' },
  { id: 'liked', label: 'Liked Songs' },
  { id: 'artists', label: 'Artists' },
  { id: 'albums', label: 'Albums' },
];

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState('playlists');
  const { likedSongs } = useLikedStore();
  const { setCurrentSong, setQueue } = usePlayerStore();

  const playlistQueries = FEATURED_PLAYLISTS.map(p => ({
    ...p,
    query: useQuery({
      queryKey: ['playlist-meta', p.id],
      queryFn: () => fetchPlaylist(p.id),
    }),
  }));

  const loadedPlaylists = playlistQueries.filter(p => p.query.data);

  const handlePlayAll = (songs: Song[]) => {
    if (songs.length) { setQueue(songs); setCurrentSong(songs[0]); }
  };

  const handleShuffle = (songs: Song[]) => {
    if (songs.length) {
      const shuffled = [...songs].sort(() => Math.random() - 0.5);
      setQueue(shuffled); setCurrentSong(shuffled[0]);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-36 md:pb-28 px-4 md:px-6 pt-5">
      {/* Library tabs like reference */}
      <div className="flex gap-5 mb-6 border-b border-border/50 pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`library-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Playlists Tab */}
          {activeTab === 'playlists' && (
            <div>
              {loadedPlaylists.length === 0 ? (
                <div className="horizontal-scroll">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="min-w-[180px] h-[180px] rounded-2xl bg-secondary/30 animate-pulse shrink-0" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="horizontal-scroll mb-6">
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
                  {/* Show first playlist songs */}
                  {loadedPlaylists[0]?.query.data?.songs && (
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-3">
                        {loadedPlaylists[0].query.data.name}
                      </h3>
                      <div className="flex flex-col">
                        {loadedPlaylists[0].query.data.songs.slice(0, 8).map((song, i) => (
                          <SongCard key={song.id} song={song} songs={loadedPlaylists[0].query.data!.songs} index={i} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Liked Songs Tab */}
          {activeTab === 'liked' && (
            <div>
              {likedSongs.length > 0 && (
                <div className="flex gap-3 mb-5">
                  <button
                    onClick={() => handlePlayAll(likedSongs)}
                    className="px-6 py-2.5 rounded-full font-semibold text-sm text-primary-foreground flex items-center gap-2 shadow-lg"
                    style={{ background: 'var(--gradient-primary)' }}
                  >
                    <Play className="w-4 h-4 ml-0.5" /> Play All
                  </button>
                  <button onClick={() => handleShuffle(likedSongs)} className="px-5 py-2.5 rounded-full glass text-foreground font-semibold text-sm hover:bg-white/10 transition-colors flex items-center gap-2">
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
                <div className="flex flex-col">
                  {likedSongs.map((song, i) => (
                    <SongCard key={song.id} song={song} songs={likedSongs} index={i} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Artists Tab */}
          {activeTab === 'artists' && (
            <div>
              <div className="horizontal-scroll">
                {loadedPlaylists.map((p) => {
                  const artist = p.query.data?.songs?.[0]?.artist || p.name;
                  const image = p.query.data?.songs?.[0]?.image || p.query.data?.image || '';
                  return (
                    <div key={p.id} className="text-center cursor-pointer group shrink-0" style={{ minWidth: 150 }}>
                      <div className="w-[150px] h-[150px] rounded-full overflow-hidden border-[3px] border-border/50 shadow-lg mx-auto mb-3 group-hover:-translate-y-1 transition-transform">
                        <img src={image} alt={artist} className="w-full h-full object-cover" />
                      </div>
                      <p className="font-semibold text-foreground text-sm">{artist}</p>
                      <p className="text-xs text-muted-foreground">Artist</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Albums Tab */}
          {activeTab === 'albums' && (
            <div>
              <div className="horizontal-scroll">
                {loadedPlaylists.map((p) => (
                  <PlaylistCardRef
                    key={p.id}
                    id={p.id}
                    name={p.query.data?.songs?.[0]?.album || p.query.data?.name || p.name}
                    image={p.query.data?.image || ''}
                    songCount={p.query.data?.songs.length}
                    songs={p.query.data?.songs}
                  />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
