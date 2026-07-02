/**
 * Integration test: verifies that anonymous (guest) callers can fetch
 * a track list AND that the returned stream URLs are actually playable.
 *
 * Hits the deployed Supabase edge function using the public anon key —
 * no session, no login.
 */
import { describe, it, expect } from 'vitest';

const PROJECT = 'uwvsyladvvvjqlgnqppq';
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3dnN5bGFkdnZ2anFsZ25xcHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNDY3NDEsImV4cCI6MjA4NzgyMjc0MX0.ibwH6IntJjky3uZKxFplDkVGW9bSH0RrwT0cVrd94hI';
const URL_BASE = `https://${PROJECT}.supabase.co/functions/v1/spotify`;

async function guestFetch(params: Record<string, string>) {
  const url = new URL(URL_BASE);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  expect(res.status).toBe(200);
  return res.json();
}

function extractUrl(s: any): string {
  const d = s.downloadUrl;
  if (Array.isArray(d)) {
    for (let i = d.length - 1; i >= 0; i--) {
      const u = d[i]?.url || d[i]?.link;
      if (u) return u;
    }
  }
  return s.media_preview_url || '';
}

describe('guest music API', () => {
  it('returns a non-empty playlist track list without auth', async () => {
    const json = await guestFetch({ action: 'jiosaavn-playlist', id: '1134543272' });
    const info = json.data || json;
    const songs = info.songs || info.list || [];
    expect(Array.isArray(songs)).toBe(true);
    expect(songs.length).toBeGreaterThan(5);
  }, 30_000);

  it('returns tracks whose stream URLs are reachable', async () => {
    const json = await guestFetch({ action: 'jiosaavn-playlist', id: '1134543272' });
    const songs = (json.data || json).songs || [];
    const url = songs.map(extractUrl).find(Boolean);
    expect(url, 'at least one playable URL').toBeTruthy();

    const head = await fetch(url!, { method: 'GET', headers: { Range: 'bytes=0-1023' } });
    expect([200, 206]).toContain(head.status);
    const ct = head.headers.get('content-type') || '';
    expect(ct).toMatch(/audio|mpegurl|mp4|octet-stream/i);
  }, 30_000);

  it('returns search results for a guest query', async () => {
    const json = await guestFetch({ action: 'jiosaavn-search', q: 'arijit singh', limit: '10' });
    const results = json.data?.results || json.results || [];
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(extractUrl)).toBe(true);
  }, 30_000);
});
