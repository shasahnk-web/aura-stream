import { usePlayerStore, Song, useLikedStore } from '@/store/playerStore';
import { Play, Pause, Heart, Download, MoreHorizontal } from 'lucide-react';

interface SongCardProps {
  song: Song;
  songs?: Song[];
  index?: number;
  showNumber?: boolean;
}

export default function SongCard({ song, songs, index = 0, showNumber = true }: SongCardProps) {
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

  const duration = song.duration > 0
    ? `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}`
    : '';

  return (
    <div
      className="song-item group"
      onClick={handlePlay}
    >
      {/* Number */}
      {showNumber && (
        <div className="w-8 text-center text-muted-foreground text-sm font-medium shrink-0">
          {isCurrentSong && isPlaying ? (
            <div className="flex items-center justify-center gap-[2px]">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-[3px] bg-primary rounded-full animate-wave"
                  style={{ animationDelay: `${i * 0.15}s`, height: '8px' }}
                />
              ))}
            </div>
          ) : (
            <span>{index + 1}</span>
          )}
        </div>
      )}

      {/* Image */}
      <div className="relative w-[50px] h-[50px] rounded-[10px] overflow-hidden mr-4 shrink-0 shadow-md">
        <img src={song.image} alt={song.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isCurrentSong && isPlaying ? (
            <Pause className="w-5 h-5 text-foreground" />
          ) : (
            <Play className="w-5 h-5 text-foreground ml-0.5" />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-[15px] truncate ${isCurrentSong ? 'text-primary' : 'text-foreground'}`}>
          {song.name}
        </p>
        <p className="text-[13px] text-muted-foreground truncate">{song.artist}</p>
      </div>

      {/* Duration */}
      {duration && (
        <span className="text-[13px] text-muted-foreground mr-4 hidden sm:block">{duration}</span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={(e) => { e.stopPropagation(); toggleLike(song); }}
          className={`transition-all hover:scale-110 ${liked ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Heart className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={handleDownload}
          className="text-muted-foreground hover:text-foreground transition-all hover:scale-110"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
