import { usePlayerStore, Song, useLikedStore } from '@/store/playerStore';
import { Play, Pause, Heart, Download } from 'lucide-react';
import { motion } from 'framer-motion';

interface SongCardProps {
  song: Song;
  songs?: Song[];
  index?: number;
}

export default function SongCard({ song, songs, index = 0 }: SongCardProps) {
  const { setCurrentSong, setQueue, currentSong, isPlaying, togglePlay } = usePlayerStore();
  const { isLiked, toggleLike } = useLikedStore();
  const isCurrentSong = currentSong?.id === song.id;
  const liked = isLiked(song.id);

  const handlePlay = () => {
    if (isCurrentSong) {
      togglePlay();
    } else {
      if (songs) setQueue(songs);
      setCurrentSong(song);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!song.url) return;
    try {
      const response = await fetch(song.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${song.name} - ${song.artist}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(song.url, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/40 transition-all cursor-pointer"
      onClick={handlePlay}
    >
      <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0">
        <img src={song.image} alt={song.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isCurrentSong && isPlaying ? (
            <Pause className="w-4 h-4 text-foreground" />
          ) : (
            <Play className="w-4 h-4 text-foreground ml-0.5" />
          )}
        </div>
        {isCurrentSong && isPlaying && (
          <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-[2px]">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-[3px] bg-primary rounded-full animate-wave"
                style={{ animationDelay: `${i * 0.15}s`, height: '4px' }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium truncate ${isCurrentSong ? 'text-primary' : 'text-foreground'}`}>
          {song.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
      </div>
      <button
        onClick={handleDownload}
        className="shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground/60 hover:!text-foreground transition-colors"
        title="Download"
      >
        <Download className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); toggleLike(song); }}
        className={`shrink-0 transition-colors ${liked ? 'text-accent' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
      >
        <Heart className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} />
      </button>
      <span className="text-xs text-muted-foreground hidden sm:block w-10 text-right">
        {song.duration > 0 ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}` : ''}
      </span>
    </motion.div>
  );
}
