import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Gauge } from 'lucide-react';

interface PlaybackControlsProps {
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  crossfadeDuration: number;
  onCrossfadeDurationChange: (duration: number) => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const CROSSFADE_OPTIONS = [0, 2, 4, 6, 8, 12];

export default function PlaybackControls({
  playbackRate,
  onPlaybackRateChange,
  crossfadeDuration,
  onCrossfadeDurationChange,
}: PlaybackControlsProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`transition-colors relative ${
            playbackRate !== 1 || crossfadeDuration > 0
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Gauge className="w-4 h-4" />
          {playbackRate !== 1 && (
            <span className="absolute -top-2 -right-2 text-[9px] font-bold text-primary">
              {playbackRate}x
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="glass border-border/50 w-56 p-3" align="end" side="top">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-foreground mb-2">Playback Speed</p>
            <div className="flex flex-wrap gap-1">
              {SPEED_OPTIONS.map((speed) => (
                <button
                  key={speed}
                  onClick={() => onPlaybackRateChange(speed)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    playbackRate === speed
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border/50 pt-3">
            <p className="text-xs font-medium text-foreground mb-2">Crossfade</p>
            <div className="flex flex-wrap gap-1">
              {CROSSFADE_OPTIONS.map((dur) => (
                <button
                  key={dur}
                  onClick={() => onCrossfadeDurationChange(dur)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    crossfadeDuration === dur
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {dur === 0 ? 'Off' : `${dur}s`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
