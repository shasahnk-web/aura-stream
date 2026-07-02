import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  compact?: boolean;
}

export default function ApiErrorState({
  title = "Couldn't load music",
  message = 'The music service is temporarily unavailable. Please try again.',
  onRetry,
  retrying,
  compact,
}: Props) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex flex-col items-center justify-center text-center gap-3 rounded-2xl border border-border/50 bg-secondary/30 backdrop-blur-sm ${
        compact ? 'p-4' : 'p-8 my-4'
      }`}
    >
      <AlertCircle className={compact ? 'w-6 h-6 text-accent' : 'w-10 h-10 text-accent'} />
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:scale-105 transition disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
          {retrying ? 'Retrying…' : 'Try again'}
        </button>
      )}
    </div>
  );
}
