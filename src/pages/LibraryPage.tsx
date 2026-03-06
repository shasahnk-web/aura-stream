import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPlaylist, FEATURED_PLAYLISTS } from '@/services/musicApi';
import { useLikedStore, usePlayerStore, Song } from '@/store/playerStore';
import SongCard from '@/components/SongCard';
import PlaylistCardRef from '@/components/PlaylistCardRef';
import { MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const tabs = [
  { id: 'playlists', label: 'Playlists' },
  { id: 'artists', label: 'Artists' },
  { id: 'albums', label: 'Albums' },
];

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState('playlists');
  const { likedSongs } = useLikedStore();
  const { setCurrentSong, setQueue } = usePlayerStore();
  const navigate = useNavigate();

  const playlistQueries = FEATURED_PLAYLISTS.map(p => ({
    ...p,
    query: useQuery({
      queryKey: ['playlist-meta', p.id],
      queryFn: () => fetchPlaylist(p.id),
    }),
  }));

  const loadedPlaylists = playlistQueries.filter(p => p.query.data);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-36 px-4 md:px-6 pt-5">
      {/* Library tabs matching reference */}
      <div className="flex gap-4 mb-6 border-b border-border/50 pb-1">
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
          {/* Playlists Tab - song-item list style like reference */}
          {activeTab === 'playlists' && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center justify-between">
                Your playlists
                <span className="text-sm text-muted-foreground font-normal cursor-pointer hover:text-foreground transition-colors">See all</span>
              </h2>
              <div className="flex flex-col">
                {/* Liked Songs entry */}
                <div
                  className="song-item"
                  onClick={() => navigate('/liked')}
                >
                  <div className="relative w-[50px] h-[50px] rounded-[10px] overflow-hidden mr-4 shrink-0 shadow-md bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <span className="text-primary-foreground text-lg">♥</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[15px] text-foreground truncate">Liked Songs</p>
                    <p className="text-[13px] text-muted-foreground truncate">{likedSongs.length} songs</p>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground transition-all">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                {/* Loaded playlists as song-item rows */}
                {loadedPlaylists.map((p) => (
                  <div
                    key={p.id}
                    className="song-item"
                    onClick={() => navigate(`/playlist/${p.id}`)}
                  >
                    <div className="relative w-[50px] h-[50px] rounded-[10px] overflow-hidden mr-4 shrink-0 shadow-md">
                      <img src={p.query.data!.image} alt={p.query.data!.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[15px] text-foreground truncate">{p.query.data!.name}</p>
                      <p className="text-[13px] text-muted-foreground truncate">{p.query.data!.songs.length} songs</p>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground transition-all">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                ))}

                {loadedPlaylists.length === 0 && (
                  <div className="space-y-2.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="song-item animate-pulse">
                        <div className="w-[50px] h-[50px] bg-secondary rounded-[10px] mr-4" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-secondary rounded w-1/2" />
                          <div className="h-3 bg-secondary rounded w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Artists Tab - circular cards horizontal scroll like reference */}
          {activeTab === 'artists' && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center justify-between">
                Your artists
                <span className="text-sm text-muted-foreground font-normal cursor-pointer hover:text-foreground transition-colors">See all</span>
              </h2>
              <div className="horizontal-scroll">
                {loadedPlaylists.map((p) => {
                  const artist = p.query.data?.songs?.[0]?.artist || p.name;
                  const image = p.query.data?.songs?.[0]?.image || p.query.data?.image || '';
                  return (
                    <div key={p.id} className="text-center cursor-pointer group shrink-0" style={{ minWidth: 150 }}>
                      <div className="w-[150px] h-[150px] rounded-full overflow-hidden border-[3px] border-border/50 shadow-lg mx-auto mb-3 group-hover:-translate-y-1 transition-transform">
                        <img src={image} alt={artist} className="w-full h-full object-cover" />
                      </div>
                      <p className="font-semibold text-foreground text-[16px]">{artist}</p>
                      <p className="text-xs text-muted-foreground">Artist</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Albums Tab - playlist cards horizontal scroll like reference */}
          {activeTab === 'albums' && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center justify-between">
                Your albums
                <span className="text-sm text-muted-foreground font-normal cursor-pointer hover:text-foreground transition-colors">See all</span>
              </h2>
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
