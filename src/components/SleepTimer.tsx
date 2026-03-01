import { useState, useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Moon } from 'lucide-react';

const PRESETS = [
  { label: '5 min', minutes: 5 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 hour', minutes: 60 },
];

export default function SleepTimer() {
  const { setIsPlaying } = usePlayerStore();
  const [remaining, setRemaining] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) {
      setIsPlaying(false);
      setRemaining(null);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [remaining, setIsPlaying]);

  const startTimer = (minutes: number) => {
    setRemaining(minutes * 60);
  };

  const cancelTimer = () => {
    setRemaining(null);
    clearInterval(intervalRef.current);
  };

  const formatRemaining = () => {
    if (remaining === null) return '';
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isActive = remaining !== null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`transition-colors relative ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
          <Moon className="w-4 h-4" />
          {isActive && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="glass border-border/50 w-48 p-2" align="end" side="top">
        <p className="text-xs font-medium text-foreground mb-2 px-1">Sleep Timer</p>
        {isActive ? (
          <div className="text-center py-2">
            <p className="text-lg font-bold text-primary font-mono">{formatRemaining()}</p>
            <button onClick={cancelTimer} className="text-xs text-muted-foreground hover:text-destructive mt-1">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {PRESETS.map(p => (
              <button
                key={p.minutes}
                onClick={() => startTimer(p.minutes)}
                className="text-left text-sm px-2 py-1.5 rounded hover:bg-secondary/50 text-foreground transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
