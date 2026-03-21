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
    if (!song.url) {
      // Some songs may not have a playable URL from the API
      window.alert('Unable to play this track (no playable URL).');
      return;
    }

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
      className="song-card"
      onClick={handlePlay}
    >
      {/* Number */}
      {showNumber && (
        <div className="w-8 text-center text-subtext text-sm font-medium shrink-0">
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
      <div className="relative w-[60px] h-[60px] rounded-[14px] overflow-hidden mr-4 shrink-0 shadow-md">
        <img src={song.image} alt={song.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isCurrentSong && isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-0.5" />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-base truncate ${isCurrentSong ? 'text-primary' : 'text-text'}`}>
          {song.name}
        </p>
        <p className="text-sm text-subtext truncate">{song.artist}</p>
      </div>

      {/* Duration */}
      {duration && (
        <span className="text-sm text-subtext mr-4 hidden sm:block">{duration}</span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={(e) => { e.stopPropagation(); toggleLike(song); }}
          className={`transition-all hover:scale-110 ${liked ? 'text-accent' : 'text-subtext hover:text-text'}`}
        >
          <Heart className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={handleDownload}
          className="text-subtext hover:text-text transition-all hover:scale-110"
          title="Download"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
