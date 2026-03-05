import { Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore, Song } from '@/store/playerStore';

interface PlaylistCardRefProps {
  id: string;
  name: string;
  image: string;
  songCount?: number;
  songs?: Song[];
}

export default function PlaylistCardRef({ id, name, image, songCount, songs }: PlaylistCardRefProps) {
  const navigate = useNavigate();
  const { setCurrentSong, setQueue } = usePlayerStore();

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (songs?.length) {
      setQueue(songs);
      setCurrentSong(songs[0]);
    }
  };

  return (
    <div
      className="playlist-card-ref group"
      onClick={() => navigate(`/playlist/${id}`)}
    >
      <div className="relative w-[180px] h-[180px] overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <p className="font-semibold text-sm text-foreground">{name}</p>
          {songCount !== undefined && (
            <p className="text-xs text-foreground/80">{songCount} songs</p>
          )}
        </div>
        {/* Play button */}
        <button
          onClick={handlePlay}
          className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-primary flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-lg"
        >
          <Play className="w-4 h-4 text-primary-foreground ml-0.5" />
        </button>
      </div>
    </div>
  );
}
