import type { Song } from '@/store/playerStore';

const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ytmusic`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function ytFetch(params: Record<string, string>) {
  const url = new URL(FUNCTION_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: {
      'apikey': ANON_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `YT Music API error ${res.status}`);
  }
  return res.json();
}

export interface YTMusicResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  image: string;
  videoId: string;
}

export async function searchYTMusic(query: string): Promise<YTMusicResult[]> {
  try {
    const data = await ytFetch({ action: 'search', q: query });
    return data.results || [];
  } catch {
    return [];
  }
}

export async function getYTMusicSong(videoId: string): Promise<Song | null> {
  try {
    const data = await ytFetch({ action: 'get_song', videoId });
    if (!data.streamUrl) return null;
    return {
      id: `yt-${data.videoId}`,
      name: data.title || 'Unknown',
      artist: data.artist || 'Unknown Artist',
      album: '',
      image: data.image || '',
      url: data.streamUrl,
      duration: parseInt(data.duration || '0', 10),
    };
  } catch {
    return null;
  }
}

export async function getYTMusicSuggestions(query: string): Promise<string[]> {
  try {
    const data = await ytFetch({ action: 'suggestions', q: query });
    return data.suggestions || [];
  } catch {
    return [];
  }
}
