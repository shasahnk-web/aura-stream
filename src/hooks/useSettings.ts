import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';
export type PlaybackQuality = 'low' | 'medium' | 'high' | 'auto';

export interface NotificationPrefs {
  joinRequests: boolean;
  playlistUpdates: boolean;
  newReleases: boolean;
  quietHoursEnabled: boolean;
  quietStart: string; // "HH:MM"
  quietEnd: string;   // "HH:MM"
  soundEnabled: boolean;
}

export interface AppSettings {
  theme: Theme;
  playbackQuality: PlaybackQuality;
  sleepTimerEnabled: boolean;
  sleepTimerDuration: number;
  autoplay: boolean;
  crossfade: number;
  notifications: NotificationPrefs;
}

const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  joinRequests: true,
  playlistUpdates: true,
  newReleases: true,
  quietHoursEnabled: false,
  quietStart: '22:00',
  quietEnd: '08:00',
  soundEnabled: true,
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  playbackQuality: 'high',
  sleepTimerEnabled: false,
  sleepTimerDuration: 30,
  autoplay: true,
  crossfade: 0,
  notifications: DEFAULT_NOTIFICATIONS,
};

const STORAGE_KEY = 'kanako-settings';

export function getSettings(): AppSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(data);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      notifications: { ...DEFAULT_NOTIFICATIONS, ...(parsed.notifications || {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event('kanako-settings-changed'));
}

export function useSettings(): AppSettings {
  const [settings, setSettings] = useState<AppSettings>(getSettings);
  useEffect(() => {
    const onChange = () => setSettings(getSettings());
    window.addEventListener('storage', onChange);
    window.addEventListener('kanako-settings-changed', onChange);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener('kanako-settings-changed', onChange);
    };
  }, []);
  return settings;
}

export function qualityIndex(q: PlaybackQuality): number {
  switch (q) {
    case 'low': return 1;
    case 'medium': return 2;
    case 'high': return 4;
    case 'auto': return 4;
  }
}

/** Returns true if current time is inside the user's quiet-hours window. */
export function isInQuietHours(prefs: NotificationPrefs, now = new Date()): boolean {
  if (!prefs.quietHoursEnabled) return false;
  const [sh, sm] = prefs.quietStart.split(':').map(Number);
  const [eh, em] = prefs.quietEnd.split(':').map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  return start <= end ? cur >= start && cur < end : cur >= start || cur < end;
}

/** Should we surface (sound + toast) for a given category right now? */
export function shouldNotify(
  category: keyof Pick<NotificationPrefs, 'joinRequests' | 'playlistUpdates' | 'newReleases'>,
  prefs?: NotificationPrefs,
): { toast: boolean; sound: boolean } {
  const p = prefs ?? getSettings().notifications;
  const enabled = p[category];
  if (!enabled) return { toast: false, sound: false };
  const quiet = isInQuietHours(p);
  return { toast: true, sound: p.soundEnabled && !quiet };
}
