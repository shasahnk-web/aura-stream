import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPlaylist } from '@/services/musicApi';
import { usePlayerStore } from '@/store/playerStore';
import SongCard from '@/components/SongCard';
import { Play, Shuffle, Clock, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setCurrentSong, setQueue } = usePlayerStore();

  const { data, isLoading } = useQuery({
    queryKey: ['playlist', id],
    queryFn: () => fetchPlaylist(id!),
    enabled: !!id,
  });

  const handlePlayAll = () => {
    if (data?.songs?.length) {
      setQueue(data.songs);
      setCurrentSong(data.songs[0]);
    }
  };

  const handleShuffle = () => {
    if (data?.songs?.length) {
      const shuffled = [...data.songs].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      setCurrentSong(shuffled[0]);
    }
  };

  const totalDuration = data?.songs?.reduce((acc, s) => acc + s.duration, 0) || 0;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin pb-28">
      {/* Hero */}
      <div className="relative">
        {data?.image && (
          <div
            className="absolute inset-0 h-[350px] opacity-30 blur-3xl"
            style={{ background: `url(${data.image}) center/cover` }}
          />
        )}
        <div className="relative px-4 md:px-8 pt-6 pb-6">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row gap-6 items-start sm:items-end"
          >
            {isLoading ? (
              <div className="w-48 h-48 rounded-xl bg-secondary animate-pulse shrink-0" />
            ) : (
              <img
                src={data?.image}
                alt={data?.name}
                className="w-48 h-48 rounded-xl shadow-2xl object-cover"
              />
            )}
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Playlist</p>
              <h1 className="text-3xl md:text-5xl font-bold font-display text-foreground mb-2">
                {data?.name || 'Loading...'}
              </h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{data?.songs?.length || 0} songs</span>
                {totalDuration > 0 && (
                  <>
                    <span>•</span>
                    <Clock className="w-3 h-3" />
                    <span>{Math.floor(totalDuration / 60)} min</span>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          <div className="flex gap-3 mt-6">
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
        </div>
      </div>

      {/* Song list */}
      <div className="px-4 md:px-8">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="w-10 h-10 bg-secondary rounded" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-secondary rounded w-1/3" />
                  <div className="h-2 bg-secondary rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-xl p-2">
            {data?.songs?.map((song, i) => (
              <SongCard key={song.id} song={song} songs={data.songs} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
