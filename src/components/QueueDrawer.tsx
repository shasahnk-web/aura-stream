import { usePlayerStore, Song } from '@/store/playerStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { GripVertical, Play, Pause, X } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';
import { useState } from 'react';

interface QueueDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QueueDrawer({ open, onOpenChange }: QueueDrawerProps) {
  const { queue, setQueue, currentSong, isPlaying, playSongFromQueue, togglePlay } = usePlayerStore();

  const handleReorder = (newQueue: Song[]) => {
    setQueue(newQueue);
  };

  const removeSong = (id: string) => {
    setQueue(queue.filter(s => s.id !== id));
  };

  const currentIdx = currentSong ? queue.findIndex(s => s.id === currentSong.id) : -1;
  const upNext = currentIdx >= 0 ? queue.slice(currentIdx + 1) : queue;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="glass border-border/50 w-[340px] sm:w-[400px] p-0">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="text-foreground font-display">Queue</SheetTitle>
        </SheetHeader>

        {currentSong && (
          <div className="px-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Now Playing</p>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/10">
              <img src={currentSong.image} alt="" className="w-10 h-10 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate text-foreground">{currentSong.name}</p>
                <p className="text-xs text-muted-foreground truncate">{currentSong.artist}</p>
              </div>
              <button onClick={togglePlay} className="shrink-0 text-primary">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Up Next · {upNext.length} songs
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-24 max-h-[calc(100vh-220px)]">
          {upNext.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Queue is empty</p>
          ) : (
            <Reorder.Group axis="y" values={upNext} onReorder={(newUpNext) => {
              const before = currentIdx >= 0 ? queue.slice(0, currentIdx + 1) : [];
              handleReorder([...before, ...newUpNext]);
            }}>
              {upNext.map((song, i) => (
                <Reorder.Item key={song.id} value={song}>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/40 transition-colors group cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    <img src={song.image} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate text-foreground">{song.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                    </div>
                    <button
                      onClick={() => {
                        const qIdx = queue.findIndex(s => s.id === song.id);
                        if (qIdx >= 0) playSongFromQueue(qIdx);
                      }}
                      className="shrink-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeSong(song.id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
