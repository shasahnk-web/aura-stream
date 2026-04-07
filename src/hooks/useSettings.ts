import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light';
export type PlaybackQuality = 'low' | 'medium' | 'high' | 'auto';

export interface AppSettings {
  theme: Theme;
  playbackQuality: PlaybackQuality;
  sleepTimerEnabled: boolean;
  sleepTimerDuration: number; // minutes
  autoplay: boolean;
  crossfade: number; // seconds
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  playbackQuality: 'high',
  sleepTimerEnabled: false,
  sleepTimerDuration: 30,
  autoplay: true,
  crossfade: 0,
};

const STORAGE_KEY = 'kanako-settings';

export function getSettings(): AppSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Reactive hook – re-reads localStorage on every `storage` event so
 *  changes made in SettingsPage propagate to MusicPlayer etc. */
export function useSettings(): AppSettings {
  const [settings, setSettings] = useState<AppSettings>(getSettings);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSettings(getSettings());
    };
    window.addEventListener('storage', onStorage);

    // Also poll every 2s for same-tab changes (storage event only fires cross-tab)
    const id = setInterval(() => setSettings(getSettings()), 2000);
    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(id);
    };
  }, []);

  return settings;
}

/** Map quality setting to JioSaavn downloadUrl index (0=12kbps … 4=320kbps) */
export function qualityIndex(q: PlaybackQuality): number {
  switch (q) {
    case 'low': return 1;    // 48 kbps
    case 'medium': return 2; // 96 kbps
    case 'high': return 4;   // 320 kbps
    case 'auto': return 4;   // best available
  }
}
