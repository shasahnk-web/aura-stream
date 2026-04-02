import { Song, Playlist } from '@/store/playerStore';

const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/spotify`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function edgeFetch(params: Record<string, string>) {
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
    throw new Error(err.error || `API error ${res.status}`);
  }

  return res.json();
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
  if (s.artists?.primary) {
    return s.artists.primary.map((a: any) => a.name).join(', ');
  }
  if (s.primaryArtists) return decodeHtml(s.primaryArtists);
  if (s.subtitle) {
    const parts = s.subtitle.split(' - ');
    if (parts.length > 0) return decodeHtml(parts[0]);
  }
  if (s.more_info?.artistMap?.primary_artists) {
    return s.more_info.artistMap.primary_artists.map((a: any) => a.name).join(', ');
  }
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
    id: s.id || String(Math.random()),
    name: decodeHtml(s.name || s.song || s.title || 'Unknown'),
    artist: extractArtist(s),
    album: decodeHtml(s.album?.name || s.album || s.more_info?.album || ''),
    image: extractImage(s.image),
    url: extractUrl(s),
    duration: parseInt(s.duration || s.more_info?.duration || '0', 10),
  };
}

export async function fetchPlaylist(listId: string): Promise<{ name: string; image: string; songs: Song[] }> {
  try {
    const data = await edgeFetch({ action: 'jiosaavn-playlist', id: listId });
    const info = data.data || data;
    const songList = info.songs || info.list || [];
    const songs = Array.isArray(songList) ? songList.map(mapSong).filter((s: Song) => s.url) : [];
    return {
      name: decodeHtml(info.name || info.title || 'Playlist'),
      image: extractImage(info.image),
      songs,
    };
  } catch {
    return { name: 'Playlist', image: '', songs: [] };
  }
}

export async function searchSongs(query: string): Promise<Song[]> {
  try {
    const data = await edgeFetch({ action: 'jiosaavn-search', q: query, limit: '20' });
    const results = data.data?.results || data.results || [];
    return results.map(mapSong).filter((s: Song) => s.url);
  } catch {
    return [];
  }
}

export async function fetchHomepage(): Promise<any> {
  try {
    const data = await edgeFetch({ action: 'jiosaavn-playlist', id: '1134543272' });
    return data.data || data;
  } catch {
    return {};
  }
}

// Featured playlist IDs from JioSaavn (verified working)
export const FEATURED_PLAYLISTS = [
  { id: '1134543272', name: 'India Superhits Top 50' },
  { id: '110858205', name: 'Trending Today' },
  { id: '159470188', name: '90s Duets' },
  { id: '82914609', name: 'Best of Indie' },
];
