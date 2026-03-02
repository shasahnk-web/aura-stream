const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`Spotify auth failed: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

async function spotifyFetch(path: string, token: string) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify API error ${res.status}: ${text}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const token = await getAccessToken();

    let result: any;

    switch (action) {
      case 'search': {
        const q = url.searchParams.get('q') || '';
        const type = url.searchParams.get('type') || 'track';
        const limit = url.searchParams.get('limit') || '20';
        result = await spotifyFetch(
          `/search?q=${encodeURIComponent(q)}&type=${type}&limit=${limit}`,
          token
        );
        break;
      }

      case 'recommendations': {
        const seedTracks = url.searchParams.get('seed_tracks') || '';
        const seedArtists = url.searchParams.get('seed_artists') || '';
        const seedGenres = url.searchParams.get('seed_genres') || '';
        const limit = url.searchParams.get('limit') || '20';
        const params = new URLSearchParams({ limit });
        if (seedTracks) params.set('seed_tracks', seedTracks);
        if (seedArtists) params.set('seed_artists', seedArtists);
        if (seedGenres) params.set('seed_genres', seedGenres);
        result = await spotifyFetch(`/recommendations?${params}`, token);
        break;
      }

      case 'artist': {
        const id = url.searchParams.get('id') || '';
        result = await spotifyFetch(`/artists/${id}`, token);
        break;
      }

      case 'artist-top-tracks': {
        const id = url.searchParams.get('id') || '';
        const market = url.searchParams.get('market') || 'US';
        result = await spotifyFetch(`/artists/${id}/top-tracks?market=${market}`, token);
        break;
      }

      case 'new-releases': {
        const limit = url.searchParams.get('limit') || '20';
        result = await spotifyFetch(`/browse/new-releases?limit=${limit}`, token);
        break;
      }

      case 'featured-playlists': {
        const limit = url.searchParams.get('limit') || '20';
        result = await spotifyFetch(`/browse/featured-playlists?limit=${limit}`, token);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: search, recommendations, artist, artist-top-tracks, new-releases, featured-playlists' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
