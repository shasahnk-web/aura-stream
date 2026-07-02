import { Song } from '@/store/playerStore';
import { supabase } from '@/integrations/supabase/client';
import { getCachedPromise } from '@/lib/requestCache';

const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/spotify`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const LS_PREFIX = 'kanako-cache:';
const LS_TTL_MS = 24 * 60 * 60 * 1000; // 24h stale-while-error fallback

function readLS(key: string): any | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.t !== 'number') return null;
    if (Date.now() - parsed.t > LS_TTL_MS) return null;
    return parsed.d;
  } catch { return null; }
}

function writeLS(key: string, data: any) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify({ t: Date.now(), d: data })); } catch {}
}

async function fetchWithRetry(url: string, init: RequestInit, retries = 3): Promise<Response> {
  let lastErr: any;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) return res;
      // retry on 5xx / 429
      if (res.status < 500 && res.status !== 429) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) { lastErr = e; }
    await new Promise(r => setTimeout(r, 400 * Math.pow(2, attempt) + Math.random() * 200));
  }
  throw lastErr ?? new Error('fetch failed');
}

async function edgeFetch(params: Record<string, string>) {
  const url = new URL(FUNCTION_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const key = url.toString();
  const cacheKey = `edge:${key}`;

  return getCachedPromise(cacheKey, async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || ANON_KEY;
      const res = await fetchWithRetry(url.toString(), {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      writeLS(key, json);
      return json;
    } catch (err) {
      const cached = readLS(key);
      if (cached) return cached;
      throw err;
    }
  }, 60_000);
}

function decodeHtml(html: string): string {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}

function extractImage(img: any): string {
  if (!img) return '';
  if (typeof img === 'string') return img;
  if (Array.isArray(img)) {
    return img[2]?.url || img[2]?.link || img[1]?.url || img[1]?.link || img[0]?.url || img[0]?.link || '';
  }
  return '';
}

function extractArtist(s: any): string {
  if (s.artists?.primary) return s.artists.primary.map((a: any) => a.name).join(', ');
  if (s.primaryArtists) return decodeHtml(s.primaryArtists);
  if (s.subtitle) return decodeHtml(s.subtitle.split(' - ')[0] || s.subtitle);
  if (s.more_info?.artistMap?.primary_artists) return s.more_info.artistMap.primary_artists.map((a: any) => a.name).join(', ');
  return 'Unknown Artist';
}

function extractUrl(s: any): string {
  if (s.downloadUrl) {
    if (Array.isArray(s.downloadUrl)) {
      return s.downloadUrl[4]?.url || s.downloadUrl[3]?.url || s.downloadUrl[2]?.url ||
        s.downloadUrl[4]?.link || s.downloadUrl[3]?.link || s.downloadUrl[2]?.link ||
        s.downloadUrl[1]?.url || s.downloadUrl[0]?.url ||
        s.downloadUrl[1]?.link || s.downloadUrl[0]?.link || '';
    }
    if (typeof s.downloadUrl === 'string') return s.downloadUrl;
  }
  if (s.media_preview_url) return s.media_preview_url;
  return '';
}

function mapSong(s: any): Song {
  return {
    id: s.id || crypto.randomUUID(),
    name: decodeHtml(s.name || s.song || s.title || 'Unknown'),
    artist: extractArtist(s),
    album: decodeHtml(s.album?.name || s.album || s.more_info?.album || ''),
    image: extractImage(s.image),
    url: extractUrl(s),
    duration: parseInt(s.duration || s.more_info?.duration || '0', 10),
  };
}

export async function fetchPlaylist(listId: string): Promise<{ name: string; image: string; songs: Song[] }> {
  const data = await edgeFetch({ action: 'jiosaavn-playlist', id: listId });
  const info = data.data || data;
  if (info?.fallback) throw new Error('Music service temporarily unavailable');
  const songList = info.songs || info.list || [];
  const songs = Array.isArray(songList) ? songList.map(mapSong).filter((s: Song) => s.url) : [];
  if (songs.length === 0) throw new Error('No playable tracks returned');
  return { name: decodeHtml(info.name || info.title || 'Playlist'), image: extractImage(info.image), songs };
}

export async function searchSongs(query: string): Promise<Song[]> {
  const data = await edgeFetch({ action: 'jiosaavn-search', q: query, limit: '20' });
  if (data?.data?.fallback) throw new Error('Search unavailable');
  const results = data.data?.results || data.results || [];
  return results.map(mapSong).filter((s: Song) => s.url);
}

export async function fetchHomepage(): Promise<any> {
  const data = await edgeFetch({ action: 'jiosaavn-playlist', id: '1134543272' });
  return data.data || data;
}

export const FEATURED_PLAYLISTS = [
  { id: '1134543272', name: 'India Superhits Top 50' },
  { id: '110858205', name: 'Trending Today' },
  { id: '159470188', name: '90s Duets' },
  { id: '82914609', name: 'Best of Indie' },
];
