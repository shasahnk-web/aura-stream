import { useEffect, useState, useCallback } from 'react';

export interface TimeSync {
  timeOffset: number;
  now: () => number;
  syncTime: () => Promise<void>;
  isSynced: boolean;
}

export function useTimeSync(supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL): TimeSync {
  const [timeOffset, setTimeOffset] = useState(0);
  const [isSynced, setIsSynced] = useState(false);

  const now = useCallback(() => Date.now() + timeOffset, [timeOffset]);

  const syncTime = useCallback(async () => {
    try {
      const start = Date.now();
      const response = await fetch(`${supabaseUrl}/functions/v1/time`);
      const { serverTime } = await response.json();
      const end = Date.now();

      const latency = (end - start) / 2;
      const offset = serverTime - (start + latency);

      setTimeOffset(offset);
      setIsSynced(true);
    } catch (error) {
      console.error('Time sync failed:', error);
      setIsSynced(false);
    }
  }, [supabaseUrl]);

  // Initial sync and periodic resync (every 10s)
  useEffect(() => {
    syncTime();
    const interval = setInterval(syncTime, 10000);
    return () => clearInterval(interval);
  }, [syncTime]);

  return { timeOffset, now, syncTime, isSynced };
}
