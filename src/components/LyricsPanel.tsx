import { usePlayerStore } from '@/store/playerStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import { Music2 } from 'lucide-react';

async function fetchLyrics(songName: string, artist: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(songName)}`
    );
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    return data.lyrics || 'Lyrics not available for this song.';
  } catch {
    return 'Lyrics not available for this song.';
  }
}

interface LyricsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LyricsPanel({ open, onOpenChange }: LyricsPanelProps) {
  const { currentSong } = usePlayerStore();

  const { data: lyrics, isLoading } = useQuery({
    queryKey: ['lyrics', currentSong?.name, currentSong?.artist],
    queryFn: () => fetchLyrics(currentSong!.name, currentSong!.artist),
    enabled: !!currentSong && open,
    staleTime: Infinity,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="glass border-border/50 w-[340px] sm:w-[450px] p-0">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="text-foreground font-display flex items-center gap-2">
            <Music2 className="w-5 h-5 text-primary" /> Lyrics
          </SheetTitle>
        </SheetHeader>

        {currentSong && (
          <div className="px-4 pb-3 flex items-center gap-3">
            <img src={currentSong.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate text-foreground">{currentSong.name}</p>
              <p className="text-xs text-muted-foreground truncate">{currentSong.artist}</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 pb-24 max-h-[calc(100vh-160px)]">
          {!currentSong ? (
            <p className="text-sm text-muted-foreground text-center py-8">Play a song to see lyrics</p>
          ) : isLoading ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Finding lyrics…</p>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-foreground/80 font-sans leading-7">
              {lyrics}
            </pre>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
