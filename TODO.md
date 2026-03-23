# Time-Synchronized Playback Engine Upgrade (Hybrid: Supabase + NTP)
Status: 0% Complete | Updated: $(date)

## Steps

### 1. Backend /time endpoint ✅ In Progress
- [ ] Create `supabase/functions/time/index.ts`
- [ ] `supabase functions deploy time`

### 2. Frontend Time Sync Hook
- [ ] Create `src/hooks/useTimeSync.ts` (NTP, offset, now(), resync)

### 3. Update playerStore.ts
- [ ] Add `timeOffset: 0`, `setTimeOffset()`
- [ ] Export `useNow`

### 4. Update roomStore.ts
- [ ] Use `now()` instead of `Date.now()`
- [ ] `startedAt: now()` (ms)
- [ ] Listeners: `elapsed = (now() - startedAt) / 1000`

### 5. Enhance MusicPlayer.tsx
- [ ] Drift: 1s interval, 0.1s threshold, predictive +0.05s
- [ ] `audio.preload = 'auto'`, `canplay` play

### 6. RoomPage.tsx Init
- [ ] Mount: `syncTime()`
- [ ] Reconnect handling

### 7. Deploy & Test
- [ ] Supabase deploy
- [ ] Multi-client sync test (<100ms)
- [ ] Network throttle test

### 8. Complete
- [ ] attempt_completion
