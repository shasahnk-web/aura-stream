import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import { Music2 } from 'lucide-react';

interface LyricLine { time: number; text: string }
interface LyricsResult { synced: LyricLine[] | null; plain: string }

function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const re = /\[(\d+):(\d+(?:\.\d+)?)\](.*)/g;
  for (const raw of lrc.split('\n')) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(raw)) !== null) {
      lines.push({ time: parseInt(m[1]) * 60 + parseFloat(m[2]), text: m[3].trim() });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

async function fetchLyrics(songName: string, artist: string): Promise<LyricsResult> {
  // Try synced from lrclib
  try {
    const r = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(songName)}`);
    if (r.ok) {
      const d = await r.json();
      if (d.syncedLyrics) return { synced: parseLrc(d.syncedLyrics), plain: d.plainLyrics || '' };
      if (d.plainLyrics) return { synced: null, plain: d.plainLyrics };
    }
  } catch {}
  // Fallback to lyrics.ovh
  try {
    const r = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(songName)}`);
    if (r.ok) {
      const d = await r.json();
      return { synced: null, plain: d.lyrics || 'Lyrics not available for this song.' };
    }
  } catch {}
  return { synced: null, plain: 'Lyrics not available for this song.' };
}

interface LyricsPanelProps { open: boolean; onOpenChange: (open: boolean) => void }

export default function LyricsPanel({ open, onOpenChange }: LyricsPanelProps) {
  const { currentSong, currentTime } = usePlayerStore();
  const activeRef = useRef<HTMLParagraphElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['lyrics', currentSong?.name, currentSong?.artist],
    queryFn: () => fetchLyrics(currentSong!.name, currentSong!.artist),
    enabled: !!currentSong && open,
    staleTime: Infinity,
  });

  const activeIdx = data?.synced
    ? Math.max(0, data.synced.findIndex((l, i) => l.time <= currentTime && (data.synced![i + 1]?.time ?? Infinity) > currentTime))
    : -1;

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIdx]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="glass border-border/50 w-full sm:w-[450px] p-0 flex flex-col">
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

        <div className="flex-1 overflow-y-auto px-6 pb-24 scrollbar-hide">
          {!currentSong ? (
            <p className="text-sm text-muted-foreground text-center py-8">Play a song to see lyrics</p>
          ) : isLoading ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Finding lyrics…</p>
            </div>
          ) : data?.synced ? (
            <div className="py-12 space-y-4 text-center">
              {data.synced.map((line, i) => (
                <p
                  key={i}
                  ref={i === activeIdx ? activeRef : null}
                  className={`transition-all duration-300 leading-snug ${
                    i === activeIdx
                      ? 'text-foreground text-xl font-bold scale-105'
                      : i < activeIdx
                      ? 'text-muted-foreground/50 text-base'
                      : 'text-muted-foreground/70 text-base'
                  }`}
                >
                  {line.text || '♪'}
                </p>
              ))}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-foreground/80 font-sans leading-7">
              {data?.plain}
            </pre>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
