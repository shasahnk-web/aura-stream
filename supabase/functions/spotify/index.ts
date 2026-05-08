import CryptoJS from "npm:crypto-js@4.2.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;
  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Spotify credentials not configured');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`Spotify auth failed: ${res.status}`);
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.token;
}

async function spotifyFetch(path: string, token: string) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Spotify API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ----- JioSaavn direct integration -----
const JIO_BASE = 'https://www.jiosaavn.com/api.php';
const DES_KEY = '38346591';

function decryptUrl(encrypted: string): string {
  try {
    const key = CryptoJS.enc.Utf8.parse(DES_KEY);
    const enc = CryptoJS.enc.Base64.parse(encrypted);
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: enc } as any,
      key,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch {
    return '';
  }
}

function buildDownloadUrls(encryptedUrl: string, has320: boolean) {
  const url = decryptUrl(encryptedUrl);
  if (!url) return [];
  const qualities = has320
    ? ['12kbps', '48kbps', '96kbps', '160kbps', '320kbps']
    : ['12kbps', '48kbps', '96kbps', '160kbps'];
  const bitrateMap: Record<string, string> = {
    '12kbps': '_12', '48kbps': '_48', '96kbps': '_96', '160kbps': '_160', '320kbps': '_320',
  };
  return qualities.map(q => ({
    quality: q,
    url: url.replace('_96', bitrateMap[q]),
  }));
}

function imgVariants(image: string) {
  const i = image || '';
  return [
    { quality: '50x50', url: i.replace('150x150', '50x50') },
    { quality: '150x150', url: i },
    { quality: '500x500', url: i.replace('150x150', '500x500') },
  ];
}

function mapJioSong(s: any) {
  const mi = s.more_info || {};
  const has320 = mi['320kbps'] === 'true' || mi['320kbps'] === true;
  return {
    id: s.id,
    name: s.title || s.song,
    duration: parseInt(mi.duration || s.duration || '0', 10),
    image: imgVariants(s.image || ''),
    downloadUrl: buildDownloadUrls(mi.encrypted_media_url || '', has320),
    album: { name: mi.album || '' },
    artists: {
      primary: (mi.artistMap?.primary_artists || []).map((a: any) => ({ id: a.id, name: a.name })),
    },
  };
}

async function jioGet(params: Record<string, string>) {
  const qs = new URLSearchParams({
    _format: 'json', _marker: '0', api_version: '4', ctx: 'web6dot0', ...params,
  });
  const res = await fetch(`${JIO_BASE}?${qs}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`JioSaavn ${res.status}`);
  const text = await res.text();
  return JSON.parse(text.replace(/\)\]\}',?\n?/, ''));
}

async function jioPlaylist(id: string) {
  const data = await jioGet({ __call: 'playlist.getDetails', listid: id });
  const songs = (data.list || []).map(mapJioSong);
  return {
    data: {
      id: data.id,
      name: data.title,
      image: imgVariants(data.image || ''),
      songCount: data.list_count,
      songs,
    },
  };
}

async function jioSearch(q: string, limit: string) {
  const data = await jioGet({ __call: 'search.getResults', q, n: limit, p: '1' });
  const results = (data.results || []).map(mapJioSong);
  return { data: { total: data.total, results } };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    let result: any;

    switch (action) {
      case 'jiosaavn-search':
        result = await jioSearch(url.searchParams.get('q') || '', url.searchParams.get('limit') || '20');
        break;
      case 'jiosaavn-playlist':
        result = await jioPlaylist(url.searchParams.get('id') || '');
        break;
      case 'search': {
        const token = await getAccessToken();
        result = await spotifyFetch(`/search?q=${encodeURIComponent(url.searchParams.get('q') || '')}&type=${url.searchParams.get('type') || 'track'}&limit=${url.searchParams.get('limit') || '20'}`, token);
        break;
      }
      case 'recommendations': {
        const token = await getAccessToken();
        const params = new URLSearchParams({ limit: url.searchParams.get('limit') || '20' });
        const st = url.searchParams.get('seed_tracks'); if (st) params.set('seed_tracks', st);
        const sa = url.searchParams.get('seed_artists'); if (sa) params.set('seed_artists', sa);
        const sg = url.searchParams.get('seed_genres'); if (sg) params.set('seed_genres', sg);
        result = await spotifyFetch(`/recommendations?${params}`, token);
        break;
      }
      case 'artist': {
        const token = await getAccessToken();
        result = await spotifyFetch(`/artists/${url.searchParams.get('id') || ''}`, token);
        break;
      }
      case 'artist-top-tracks': {
        const token = await getAccessToken();
        result = await spotifyFetch(`/artists/${url.searchParams.get('id') || ''}/top-tracks?market=${url.searchParams.get('market') || 'US'}`, token);
        break;
      }
      case 'new-releases': {
        const token = await getAccessToken();
        result = await spotifyFetch(`/browse/new-releases?limit=${url.searchParams.get('limit') || '20'}`, token);
        break;
      }
      case 'featured-playlists': {
        const token = await getAccessToken();
        result = await spotifyFetch(`/browse/featured-playlists?limit=${url.searchParams.get('limit') || '20'}`, token);
        break;
      }
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
