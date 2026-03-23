# Time-Synchronized Playback Engine Upgrade (Hybrid: Supabase + NTP)
Status: 85% Complete | Updated: `date`

## Steps

### 1. Backend /time endpoint ✅ Complete
- ✅ supabase/functions/time/index.ts (Deno handler returns {serverTime: Date.now()})
- ⏳ `supabase functions deploy time`

### 2. Frontend Time Sync Hook ✅ Complete
- ✅ src/hooks/useTimeSync.ts (Supabase /time offset, now(), 10s resync)

### 3. Update playerStore.ts ✅ Complete
- ✅ Added timeOffset: 0, setTimeOffset(offset)
- ✅ now(): Date.now() + offset
- ✅ Export useNow (via selector if needed)

### 4. Update roomStore.ts ✅ Complete
- ✅ Replace Date.now() with playerStore.now()
- ✅ startedAt: now() ms
- ✅ Listeners: elapsed = (now() - startedAt) / 1000

### 5. Enhance MusicPlayer.tsx ✅ Complete
- ✅ Drift correction: 1s interval, 0.1s threshold, predictive +0.05s
- ✅ audio.preload = 'auto', canplaythrough play trigger

### 6. RoomPage.tsx Init ✅ Complete
- ✅ useEffect mount: syncTime()
- ✅ Realtime reconnect: resync on broadcast

### 7. Deploy & Test ⏳ Next
- [ ] supabase functions deploy time
- [ ] pnpm dev + multi-tab room sync test (<100ms drift)
- [ ] Network throttle test (Chrome DevTools)

### 8. Complete ✅ Ready
- [ ] attempt_completion
