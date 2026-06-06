import CryptoJS from "npm:crypto-js@4.2.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function requireUser(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const token = authHeader.slice('Bearer '.length);
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );
  const { data, error } = await sb.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return null;
}

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

// ----- JioSaavn integration with multi-endpoint fallback -----
const DES_KEY = '38346591';

function decryptUrl(encrypted: string): string {
  try {
    const key = CryptoJS.enc.Utf8.parse(DES_KEY);
    const enc = CryptoJS.enc.Base64.parse(encrypted);
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: enc } as any, key,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch { return ''; }
}

function buildDownloadUrls(encryptedUrl: string, has320: boolean) {
  const url = decryptUrl(encryptedUrl);
  if (!url) return [];
  const qualities = has320
    ? ['12kbps', '48kbps', '96kbps', '160kbps', '320kbps']
    : ['12kbps', '48kbps', '96kbps', '160kbps'];
  const map: Record<string, string> = { '12kbps':'_12','48kbps':'_48','96kbps':'_96','160kbps':'_160','320kbps':'_320' };
  return qualities.map(q => ({ quality: q, url: url.replace('_96', map[q]) }));
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
    name: s.title || s.song || s.name,
    duration: parseInt(mi.duration || s.duration || '0', 10),
    image: imgVariants(s.image || ''),
    downloadUrl: buildDownloadUrls(mi.encrypted_media_url || '', has320),
    album: { name: mi.album || s.album || '' },
    artists: { primary: (mi.artistMap?.primary_artists || []).map((a: any) => ({ id: a.id, name: a.name })) },
  };
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally { clearTimeout(t); }
}

async function jioOfficial(params: Record<string, string>) {
  const qs = new URLSearchParams({ _format:'json',_marker:'0',api_version:'4',ctx:'web6dot0', ...params });
  const res = await fetchWithTimeout(`https://www.jiosaavn.com/api.php?${qs}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`jiosaavn.com ${res.status}`);
  const text = await res.text();
  return JSON.parse(text.replace(/\)\]\}',?\n?/, ''));
}

async function saavnDevPlaylist(id: string) {
  const res = await fetchWithTimeout(`https://saavn.dev/api/playlists?id=${id}&limit=50`);
  if (!res.ok) throw new Error(`saavn.dev ${res.status}`);
  const j = await res.json();
  if (!j?.success) throw new Error('saavn.dev unsuccessful');
  return j.data;
}

async function saavnDevSearch(q: string, limit: string) {
  const res = await fetchWithTimeout(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(q)}&limit=${limit}`);
  if (!res.ok) throw new Error(`saavn.dev ${res.status}`);
  const j = await res.json();
  if (!j?.success) throw new Error('saavn.dev unsuccessful');
  return j.data;
}

async function jioPlaylist(id: string) {
  // Try official first
  try {
    const data = await jioOfficial({ __call: 'playlist.getDetails', listid: id });
    const songs = (data.list || []).map(mapJioSong);
    return { data: { id: data.id, name: data.title, image: imgVariants(data.image || ''), songCount: data.list_count, songs } };
  } catch (e1) {
    console.warn('jio official playlist failed:', (e1 as Error).message);
    // Fallback: saavn.dev
    try {
      const d = await saavnDevPlaylist(id);
      return { data: { id: d.id, name: d.name, image: d.image, songCount: d.songCount, songs: d.songs || [] } };
    } catch (e2) {
      console.warn('saavn.dev playlist failed:', (e2 as Error).message);
      return { data: { id, name: 'Unavailable', image: [], songCount: 0, songs: [], fallback: true, error: 'JIOSAAVN_UNAVAILABLE' } };
    }
  }
}

async function jioSearch(q: string, limit: string) {
  try {
    const data = await jioOfficial({ __call: 'search.getResults', q, n: limit, p: '1' });
    const results = (data.results || []).map(mapJioSong);
    return { data: { total: data.total, results } };
  } catch (e1) {
    console.warn('jio official search failed:', (e1 as Error).message);
    try {
      const d = await saavnDevSearch(q, limit);
      return { data: { total: d.total, results: d.results || [] } };
    } catch (e2) {
      console.warn('saavn.dev search failed:', (e2 as Error).message);
      return { data: { total: 0, results: [], fallback: true, error: 'JIOSAAVN_UNAVAILABLE' } };
    }
  }
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
    // Return 200 with fallback flag so frontend doesn't crash
    return new Response(JSON.stringify({ data: { songs: [], results: [], fallback: true }, error: (error as Error).message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
