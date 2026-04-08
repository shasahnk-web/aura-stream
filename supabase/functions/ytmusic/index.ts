const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const YTMUSIC_API = 'https://music.youtube.com/youtubei/v1';
const CLIENT_VERSION = '1.20241023.01.00';

const context = {
  client: {
    clientName: 'WEB_REMIX',
    clientVersion: CLIENT_VERSION,
    hl: 'en',
    gl: 'US',
  },
};

async function ytFetch(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(
    `${YTMUSIC_API}/${endpoint}?alt=json&key=AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://music.youtube.com',
        'Referer': 'https://music.youtube.com/',
      },
      body: JSON.stringify({ context, ...body }),
    }
  );
  if (!res.ok) throw new Error(`YouTube Music API error: ${res.status}`);
  return res.json();
}

function extractThumbnail(thumbnails: any[]): string {
  if (!thumbnails?.length) return '';
  return thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url || '';
}

function extractRuns(runs: any[]): string {
  return runs?.map((r: any) => r.text).join('') || '';
}

function parseSongResult(item: any) {
  const flexColumns = item.flexColumns || [];
  const title = extractRuns(flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs);
  const subtitleRuns = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
  
  // Extract artist and album from subtitle runs
  const subtitleParts = subtitleRuns.map((r: any) => r.text).filter((t: string) => t !== ' • ' && t !== ' & ');
  const artist = subtitleParts[1] || subtitleParts[0] || 'Unknown Artist';
  const album = subtitleParts[2] || '';
  const duration = subtitleParts[subtitleParts.length - 1] || '';
  
  const thumbnails = item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
  const videoId = item.playlistItemData?.videoId ||
    item.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId || '';

  return {
    id: videoId,
    title,
    artist,
    album,
    duration,
    image: extractThumbnail(thumbnails),
    videoId,
  };
}

function parseSearchResults(data: any) {
  const contents = data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
  const results: any[] = [];

  for (const section of contents) {
    const items = section.musicShelfRenderer?.contents || [];
    for (const item of items) {
      const renderer = item.musicResponsiveListItemRenderer;
      if (!renderer) continue;
      try {
        const parsed = parseSongResult(renderer);
        if (parsed.videoId && parsed.title) {
          results.push(parsed);
        }
      } catch { /* skip malformed */ }
    }
  }
  return results;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const query = url.searchParams.get('q') || '';

    if (action === 'search') {
      const data = await ytFetch('search', {
        query,
        params: 'EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D', // filter: songs
      });
      const results = parseSearchResults(data);
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_song') {
      const videoId = url.searchParams.get('videoId') || '';
      const data = await ytFetch('player', {
        videoId,
        playbackContext: {
          contentPlaybackContext: { signatureTimestamp: 0 },
        },
      });
      
      // Extract streaming URL
      const formats = data.streamingData?.adaptiveFormats || [];
      const audioFormats = formats.filter((f: any) => f.mimeType?.startsWith('audio/'));
      const best = audioFormats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];

      return new Response(JSON.stringify({
        videoId,
        title: data.videoDetails?.title,
        artist: data.videoDetails?.author,
        duration: data.videoDetails?.lengthSeconds,
        image: extractThumbnail(data.videoDetails?.thumbnail?.thumbnails || []),
        streamUrl: best?.url || null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'suggestions') {
      const data = await ytFetch('music/get_search_suggestions', { input: query });
      const suggestions = data.contents?.[0]?.searchSuggestionsSectionRenderer?.contents?.map((c: any) => {
        return extractRuns(c.searchSuggestionRenderer?.suggestion?.runs || []);
      }).filter(Boolean) || [];

      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action. Use: search, get_song, suggestions' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
