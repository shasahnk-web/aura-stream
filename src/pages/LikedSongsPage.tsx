import { useLikedStore } from '@/store/playerStore';
import { usePlayerStore } from '@/store/playerStore';
import SongCard from '@/components/SongCard';
import { Play, Shuffle, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LikedSongsPage() {
  const { likedSongs } = useLikedStore();
  const { setCurrentSong, setQueue } = usePlayerStore();

  const handlePlayAll = () => {
    if (likedSongs.length) {
      setQueue(likedSongs);
      setCurrentSong(likedSongs[0]);
    }
  };

  const handleShuffle = () => {
    if (likedSongs.length) {
      const shuffled = [...likedSongs].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      setCurrentSong(shuffled[0]);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-36 md:pb-28">
      {/* Hero */}
      <div className="relative px-4 md:px-8 pt-6 pb-6">
        <div className="absolute inset-0 h-[250px] bg-gradient-to-b from-accent/20 to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex flex-col sm:flex-row gap-6 items-start sm:items-end"
        >
          <div className="w-40 h-40 rounded-xl shadow-2xl shrink-0 overflow-hidden bg-gradient-to-br from-pink-400 via-rose-500 to-red-600 flex items-center justify-center relative">
            {/* Gradient shine effect */}
            <div className="absolute inset-0 opacity-40" style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5), transparent)',
            }} />
            {/* Heart icon */}
            <div className="relative z-10 text-6xl animate-pulse">❤️</div>
            {/* Music notes around heart */}
            <div className="absolute top-4 left-4 text-2xl opacity-80">♪</div>
            <div className="absolute bottom-4 right-4 text-2xl opacity-80">♫</div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Playlist</p>
            <h1 className="text-3xl md:text-5xl font-bold font-display text-foreground mb-2">Liked Songs</h1>
            <p className="text-sm text-muted-foreground">{likedSongs.length} songs</p>
          </div>
        </motion.div>

        {likedSongs.length > 0 && (
          <div className="relative flex gap-3 mt-6">
            <button
              onClick={handlePlayAll}
              className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2 neon-glow"
            >
              <Play className="w-5 h-5 ml-0.5" /> Play All
            </button>
            <button
              onClick={handleShuffle}
              className="px-6 py-3 rounded-full glass text-foreground font-semibold text-sm hover:bg-secondary/40 transition-colors flex items-center gap-2"
            >
              <Shuffle className="w-4 h-4" /> Shuffle
            </button>
          </div>
        )}
      </div>

      {/* Song list */}
      <div className="px-4 md:px-8">
        {likedSongs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Heart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No liked songs yet</h2>
            <p className="text-sm text-muted-foreground">Songs you like will appear here. Tap the heart icon to add songs.</p>
          </motion.div>
        ) : (
          <div className="glass rounded-xl p-2">
            {likedSongs.map((song, i) => (
              <SongCard key={song.id} song={song} songs={likedSongs} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
