import { useQuery } from '@tanstack/react-query';
import { fetchPlaylist } from '@/services/musicApi';
import { usePlayerStore, Song } from '@/store/playerStore';
import SongCard from '@/components/SongCard';
import PlaylistCard from '@/components/PlaylistCard';
import { Play, Shuffle } from 'lucide-react';
import { motion } from 'framer-motion';

const RADIO_STATIONS = [
  { id: '1134543272', name: 'Bollywood Hits Radio', genre: 'Bollywood' },
  { id: '110858205', name: 'Pop Radio', genre: 'Pop' },
  { id: '159470188', name: 'Retro Radio', genre: 'Retro' },
  { id: '82914609', name: 'Indie Radio', genre: 'Indie' },
];

export default function RadioPage() {
  const { setCurrentSong, setQueue } = usePlayerStore();

  const stationQueries = RADIO_STATIONS.map((station) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const query = useQuery({
      queryKey: ['radio-station', station.id],
      queryFn: () => fetchPlaylist(station.id),
    });
    return { ...station, query };
  });

  const handlePlayStation = (songs: Song[]) => {
    if (songs.length) {
      const shuffled = [...songs].sort(() => Math.random() - 0.5);
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
          <div className="w-40 h-40 rounded-xl shadow-2xl shrink-0 overflow-hidden bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center relative">
            {/* Gradient wave effect */}
            <div className="absolute inset-0 opacity-50" style={{
              background: 'linear-gradient(45deg, rgba(0,255,200,0.3), rgba(255,0,200,0.3))',
            }} />
            {/* Radio waves */}
            <div className="relative z-10">
              <div className="text-4xl">📻</div>
              <div className="absolute inset-0 animate-pulse" style={{
                textShadow: '0 0 10px rgba(0,255,200,0.8)',
              }} />
            </div>
            {/* Decorative notes */}
            <div className="absolute top-3 right-3 text-xl opacity-80">♪</div>
            <div className="absolute bottom-3 left-3 text-xl opacity-80">♫</div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Live</p>
            <h1 className="text-3xl md:text-5xl font-bold font-display text-foreground mb-2">Radio</h1>
            <p className="text-sm text-muted-foreground">Curated stations based on genres & moods</p>
          </div>
        </motion.div>
      </div>

      {/* Station Cards */}
      <div className="px-4 md:px-8 mb-8">
        <h2 className="text-xl font-bold font-display text-foreground mb-4">Pick a Station</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {stationQueries.map((station, i) => (
            <motion.div
              key={station.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => station.query.data?.songs && handlePlayStation(station.query.data.songs)}
              className="group cursor-pointer"
            >
              <div className="relative rounded-xl overflow-hidden glass p-3 hover:bg-secondary/30 transition-all duration-300">
                <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                  {station.query.data?.image ? (
                    <img src={station.query.data.image} alt={station.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <Radio className="w-12 h-12 text-primary/60" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                  >
                    <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                  </motion.button>
                </div>
                <h3 className="text-sm font-semibold text-foreground truncate">{station.name}</h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {station.query.data ? `${station.query.data.songs.length} tracks` : 'Loading...'}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* First station songs preview */}
      {stationQueries[0]?.query.data?.songs && stationQueries[0].query.data.songs.length > 0 && (
        <div className="px-4 md:px-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold font-display text-foreground">
              Now on {stationQueries[0].name}
            </h2>
            <button
              onClick={() => handlePlayStation(stationQueries[0].query.data!.songs)}
              className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              <Shuffle className="w-4 h-4" /> Shuffle Play
            </button>
          </div>
          <div className="glass rounded-xl p-2">
            {stationQueries[0].query.data.songs.slice(0, 10).map((song, i) => (
              <SongCard key={song.id} song={song} songs={stationQueries[0].query.data!.songs} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
