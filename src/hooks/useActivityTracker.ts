import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/playerStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook that tracks the user's currently playing song in user_activity table.
 * Should be called once in a top-level component (e.g., App or MusicPlayer).
 */
export function useActivityTracker() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const user = useAuthStore((s) => s.user);
  const lastSongIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !currentSong) return;
    if (currentSong.id === lastSongIdRef.current) return;
    
    lastSongIdRef.current = currentSong.id;

    supabase
      .from('user_activity')
      .upsert(
        {
          user_id: user.id,
          action: 'playing',
          song_data: currentSong as any,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .then(({ error }) => {
        if (error) console.error('Activity tracking error:', error);
      });
  }, [currentSong?.id, user?.id]);
}
