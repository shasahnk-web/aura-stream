import { supabase } from '@/integrations/supabase/client';

const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/spotify`;

async function spotifyCall(params: Record<string, string>) {
  const url = new URL(FUNCTION_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: {
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Spotify API error ${res.status}`);
  }

  return res.json();
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: { name: string; images: { url: string; width: number }[] };
  duration_ms: number;
  preview_url: string | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; width: number }[];
  genres: string[];
  followers: { total: number };
  popularity: number;
}

export async function spotifySearch(query: string, type = 'track', limit = 20) {
  return spotifyCall({ action: 'search', q: query, type, limit: String(limit) });
}

export async function spotifyRecommendations(opts: {
  seedTracks?: string;
  seedArtists?: string;
  seedGenres?: string;
  limit?: number;
}) {
  const params: Record<string, string> = { action: 'recommendations' };
  if (opts.seedTracks) params.seed_tracks = opts.seedTracks;
  if (opts.seedArtists) params.seed_artists = opts.seedArtists;
  if (opts.seedGenres) params.seed_genres = opts.seedGenres;
  if (opts.limit) params.limit = String(opts.limit);
  return spotifyCall(params);
}

export async function spotifyArtist(id: string): Promise<SpotifyArtist> {
  return spotifyCall({ action: 'artist', id });
}

export async function spotifyArtistTopTracks(id: string, market = 'US') {
  return spotifyCall({ action: 'artist-top-tracks', id, market });
}

export async function spotifyNewReleases(limit = 20) {
  return spotifyCall({ action: 'new-releases', limit: String(limit) });
}

export async function spotifyFeaturedPlaylists(limit = 20) {
  return spotifyCall({ action: 'featured-playlists', limit: String(limit) });
}

/** Convert a Spotify track to our Song interface */
export function spotifyTrackToSong(track: SpotifyTrack): import('@/store/playerStore').Song {
  return {
    id: `spotify-${track.id}`,
    name: track.name,
    artist: track.artists.map(a => a.name).join(', '),
    album: track.album.name,
    image: track.album.images?.[0]?.url || '',
    url: track.preview_url || '',
    duration: Math.round(track.duration_ms / 1000),
  };
}
