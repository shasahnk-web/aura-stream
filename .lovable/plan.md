## Plan: Visual Redesign + Together Fixes + Lyrics + JioSaavn Hardening

### 1. Visual redesign (full app, mockup-aligned)

New design tokens in `src/index.css` + `tailwind.config.ts`:
- Accent: warm red/orange (`--primary: 8 85% 58%`, `--primary-glow: 18 95% 62%`).
- Surfaces: deep wine/black gradient backgrounds, glass cards with red glow shadow.
- Typography: keep display font but bump weight; add italic display variant for hero ("Discover Music Made For You" style).
- Add `--gradient-hero`, `--shadow-glow-red`, `--radius-pill: 999px`.

Components restyled (no logic changes):
- `Index.tsx` (Home): "Hi, {name}" header with avatar + bell, pill category tabs (All / Popular / Trending / New Release) above existing sections, big rounded "Top Trending" hero card with overlay play button + heart, playlist list rows with circular thumb + inline play.
- `MobileNav.tsx`: floating pill nav with red active pill (Home / Music / Liked / Profile), centered, bottom-safe-area; fix hidden items by collapsing to 4 primary tabs and moving the rest to a "More" sheet.
- `MusicPlayer.tsx` mobile bar: rounded card style matching mockup.
- `NowPlayingView.tsx`: full redesign — circular spinning album art with dotted progress ring, mute/volume side icons, waveform-style seek bar, large round red play button, prev/next + ±10s skip, heart, "By {artist}" + title, lyrics line floating above artwork.
- `SongCard`, `PlaylistCard`, `PlaylistCardRef`: rounded-2xl, red play overlay, subtle glass.
- `Header.tsx` desktop: search bar + bell + avatar, no logic changes.

Responsiveness pass:
- Audit every page with `sm:` / `md:` breakpoints; ensure no horizontal scroll at 360px.
- Mobile padding bottom = nav (80) + player (70) safe areas.
- Together / Room / Friends / Library / Settings / Search / Trending / Playlist / Artist verified at 360, 414, 768, 1280.

### 2. Synced karaoke lyrics

`src/components/LyricsPanel.tsx` and Now Playing overlay:
- Try LRC source first: `https://lrclib.net/api/get?artist_name=...&track_name=...` (returns `syncedLyrics` LRC text). Fallback to existing lyrics.ovh plain text.
- Parser: convert LRC `[mm:ss.xx]` → `{time, text}[]`.
- Render: active line scaled + bright, prev/next dimmed, auto-scroll to active line. Driven by `usePlayerStore.currentTime`.
- In Now Playing: show 3 floating lines centered above the album art (mockup style). Sheet panel shows full scroller.
- Plain fallback: render styled paragraph, no scroll-sync.

### 3. Host join-request notification sound

- Add `public/sounds/notify.mp3` (small CC0 file from `https://cdn.pixabay.com/audio/2022/03/15/audio_2c2c2b1c25.mp3` style — bundled locally to avoid CORS).
- In `RoomPage.tsx`, when host receives a new pending row in `join_requests` (existing realtime broadcast), play `new Audio('/sounds/notify.mp3')` with volume 0.6, plus a `toast.info` with the requester name.
- Guard: only host plays it; debounce 1s.

### 4. Together / Sync fixes

`TogetherPage.tsx`:
- Confirm no `leaveRoom()` on mount; if `currentRoom && roomMembers.includes(me)` → show Active Room card (Rejoin / Leave). Verified after edit.

`roomStore.ts` + `RoomPage.tsx`:
- Fix sync regression: host broadcasts `playback-sync` every 2s (was 5s) using performance.now() based timestamp; include `sentAt` so listeners compensate for network latency: `expected = hostTime + (Date.now() - sentAt)/1000`.
- Drift threshold 0.8s for snap; <0.8s use `playbackRate` nudging (0.97 / 1.03) for 1s then back to 1.
- On `currentSong` change broadcast, listeners load and seek to `started_at_ms` offset before playing.
- Host controls: re-test mute (broadcast `mute-user`), transfer host (update `rooms.host_id` + broadcast `host-changed`), approve/reject join (update `join_requests.status` + broadcast).

### 5. JioSaavn edge function hardening (fix 500)

`supabase/functions/spotify/index.ts`:
- Wrap `jioGet` with retry (2 attempts) + multiple endpoints fallback chain:
  1. `https://www.jiosaavn.com/api.php` (current)
  2. `https://saavn.dev/api/...` (community mirror)
  3. `https://jiosaavn-api-with-playlist.vercel.app/...`
- Mappers normalize each shape into the same internal format.
- On total failure: return `{ data: { songs: [], results: [], fallback: true, error: 'JIOSAAVN_UNAVAILABLE' } }` with status **200** so frontend doesn't crash.

`src/services/musicApi.ts`:
- Detect `fallback: true` and surface a toast "Music service temporarily unavailable" instead of throwing; return empty arrays so UI renders gracefully (no blank screen).

### 6. Files changed

| File | Change |
|---|---|
| `src/index.css`, `tailwind.config.ts` | New color tokens, gradients, shadows |
| `src/pages/Index.tsx` | Mockup-style home (greeting, pill tabs, hero card) |
| `src/components/MobileNav.tsx` | Floating pill nav, 4 tabs + More sheet |
| `src/components/NowPlayingView.tsx` | Circular art, dotted ring, waveform seek, lyrics overlay |
| `src/components/MusicPlayer.tsx` | Restyled mobile/desktop bar |
| `src/components/LyricsPanel.tsx` | LRC fetch + synced renderer |
| `src/components/SongCard.tsx`, `PlaylistCard*.tsx`, `Header.tsx` | Mockup styling |
| `src/pages/RoomPage.tsx` | Notification sound, sync fix, host control polish |
| `src/store/roomStore.ts` | 2s heartbeat + latency-compensated sync |
| `src/pages/TogetherPage.tsx` | Verify Active Room persistence |
| `public/sounds/notify.mp3` | New asset |
| `supabase/functions/spotify/index.ts` | Multi-endpoint fallback, 200 graceful errors |
| `src/services/musicApi.ts` | Handle `fallback: true` |
| All pages | Responsive audit at 360/414/768/1280 |

### 7. Out of scope

- No DB schema changes (existing tables already cover host approval, mute is broadcast-only).
- No new auth providers.
- "Leaked Password Protection" remains a manual toggle in Supabase dashboard.
