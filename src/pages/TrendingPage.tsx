import { useQuery } from '@tanstack/react-query';
import { fetchPlaylist } from '@/services/musicApi';
import { usePlayerStore } from '@/store/playerStore';
import SongCard from '@/components/SongCard';
import { Play, Shuffle } from 'lucide-react';
import { motion } from 'framer-motion';

const TRENDING_PLAYLISTS = [
  { id: '1134543272', name: 'India Superhits Top 50' },
  { id: '110858205', name: 'Trending Today' },
];

export default function TrendingPage() {
  const { setCurrentSong, setQueue } = usePlayerStore();
  const handlePlaySong = (song: { url?: string }, songs: Array<{ url?: string }>) => {
    if (!song.url) {
      console.warn('Song has no playable URL:', song);
      return;
    }
    setQueue(songs);
    setCurrentSong(song);
  };

  const mainQuery = useQuery({
    queryKey: ['playlist', TRENDING_PLAYLISTS[0].id],
    queryFn: () => fetchPlaylist(TRENDING_PLAYLISTS[0].id),
  });

  const secondQuery = useQuery({
    queryKey: ['playlist', TRENDING_PLAYLISTS[1].id],
    queryFn: () => fetchPlaylist(TRENDING_PLAYLISTS[1].id),
  });

  const trendingSongs = mainQuery.data?.songs || [];
  const trendingToday = secondQuery.data?.songs || [];

  const handlePlayAll = (songs: typeof trendingSongs) => {
    if (songs.length) { setQueue(songs); setCurrentSong(songs[0]); }
  };

  const handleShuffle = (songs: typeof trendingSongs) => {
    if (songs.length) {
      const shuffled = [...songs].sort(() => Math.random() - 0.5);
      setQueue(shuffled); setCurrentSong(shuffled[0]);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-52 md:pb-44">
      {/* Hero */}
      <div className="relative px-4 md:px-8 pt-6 pb-6">
        <div className="absolute inset-0 h-[250px] bg-gradient-to-b from-primary/20 to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex flex-col sm:flex-row gap-6 items-start sm:items-end"
        >
          <div className="w-40 h-40 rounded-xl shadow-2xl shrink-0 overflow-hidden bg-gradient-to-br from-orange-500 via-red-500 to-yellow-500 flex items-center justify-center relative">
            {/* Flame effect background */}
            <div className="absolute inset-0 animate-pulse opacity-50" style={{
              background: 'radial-gradient(circle at 50% 30%, rgba(255,200,0,0.8), transparent)',
            }} />
            {/* Music notes icon */}
            <div className="relative text-5xl z-10 animate-bounce" style={{ animationDelay: '0.1s' }}>
              🔥
            </div>
            <div className="absolute top-2 right-4 text-3xl opacity-80">🎵</div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Charts</p>
            <h1 className="text-3xl md:text-5xl font-bold font-display text-foreground mb-2">Trending</h1>
            <p className="text-sm text-muted-foreground">The hottest tracks right now</p>
          </div>
        </motion.div>

        {trendingSongs.length > 0 && (
          <div className="relative flex gap-3 mt-6">
            <button onClick={() => handlePlayAll(trendingSongs)} className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 neon-glow">
              <Play className="w-5 h-5 ml-0.5" /> Play All
            </button>
            <button onClick={() => handleShuffle(trendingSongs)} className="px-6 py-3 rounded-full glass text-foreground font-semibold text-sm hover:bg-secondary/40 transition-colors flex items-center gap-2">
              <Shuffle className="w-4 h-4" /> Shuffle
            </button>
          </div>
        )}
      </div>

      {/* Top 50 */}
      <div className="px-4 md:px-8 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 flex items-center justify-center text-primary">🔥</div>
          <h2 className="text-xl font-bold font-display text-foreground">India Superhits Top 50</h2>
        </div>
        {mainQuery.isLoading ? (
          <div className="glass rounded-xl p-2 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
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

      {/* Trending Today */}
      {trendingToday.length > 0 && (
        <div className="px-4 md:px-8 mb-8">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-bold font-display text-foreground">Trending Today</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePlayAll(trendingToday)}
                className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity flex items-center gap-1"
              >
                <Play className="w-4 h-4" /> Play All
              </button>
              <button
                onClick={() => handleShuffle(trendingToday)}
                className="px-4 py-2 rounded-full glass text-foreground font-semibold text-xs hover:bg-secondary/40 transition-colors flex items-center gap-1"
              >
                <Shuffle className="w-4 h-4" /> Shuffle
              </button>
            </div>
          </div>
          <div className="glass rounded-xl p-2">
            {trendingToday.map((song, i) => (
              <SongCard key={song.id} song={song} songs={trendingToday} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
