import { Song, Playlist } from '@/store/playerStore';

const API_BASE = 'https://jiosaavnproxy.vercel.app/api';

function decodeHtml(html: string): string {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}

function mapSong(s: any): Song {
  return {
    id: s.id || String(Math.random()),
    name: decodeHtml(s.name || s.song || s.title || 'Unknown'),
    artist: decodeHtml(s.primaryArtists || s.artist || s.singers || 'Unknown Artist'),
    album: decodeHtml(s.album?.name || s.album || ''),
    image: s.image?.[2]?.link || s.image?.[1]?.link || s.image?.[0]?.link || s.image || '',
    url: s.downloadUrl?.[4]?.link || s.downloadUrl?.[3]?.link || s.downloadUrl?.[2]?.link || s.downloadUrl?.[1]?.link || s.downloadUrl?.[0]?.link || s.media_preview_url || '',
    duration: parseInt(s.duration || '0', 10),
  };
}

export async function fetchPlaylist(listId: string): Promise<{ name: string; image: string; songs: Song[] }> {
  const res = await fetch(`${API_BASE}/playlist?listid=${listId}`);
  const data = await res.json();
  const info = data.data || data;
  return {
    name: decodeHtml(info.name || info.listname || 'Playlist'),
    image: info.image?.[2]?.link || info.image?.[1]?.link || info.image?.[0]?.link || info.image || '',
    songs: (info.songs || []).map(mapSong),
  };
}

export async function searchSongs(query: string): Promise<Song[]> {
  const res = await fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(query)}`);
  const data = await res.json();
  const results = data.data?.results || data.results || [];
  return results.map(mapSong);
}

export async function fetchHomepage(): Promise<any> {
  const res = await fetch(`${API_BASE}/home`);
  const data = await res.json();
  return data.data || data;
}

// Featured playlist IDs from JioSaavn
export const FEATURED_PLAYLISTS = [
  { id: '1134543272', name: 'Trending Now' },
  { id: '110858205', name: 'Bollywood Butter' },
  { id: '159144718', name: 'Romantic Hits' },
  { id: '49702727', name: 'English Vibes' },
  { id: '1180179657', name: 'Party Anthems' },
  { id: '84498994', name: 'Workout Beats' },
  { id: '1134543292', name: 'Chill Vibes' },
  { id: '929489', name: 'Top 50' },
];
