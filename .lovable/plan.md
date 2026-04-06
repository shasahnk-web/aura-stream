

## Plan: Fix Layout, Together Sync, Friends, Activity Tracking, and Mobile Issues

This plan addresses all the reported bugs and missing features in priority order.

---

### 1. Fix MobileNav + Together Button Centering

**Problem**: Together button shifts position, isn't perfectly centered, overlaps player.

**Fix in `MobileNav.tsx`**:
- Use a 5-item flex layout with `justify-around` instead of left/right groups + center
- Each nav item gets equal `flex-1` space
- Together button uses `relative` positioning with `top: -28px` to float above, centered in its flex slot
- Navbar height set via CSS variable `--nav-height: 64px`

### 2. Fix Music Player Positioning (No Overlap)

**Problem**: Player overlaps navbar and content on mobile.

**Fix in `MusicPlayer.tsx`**:
- Mobile: `bottom: 64px` (above navbar) instead of `bottom-16`
- Use `z-[50]` for player, `z-[60]` for navbar
- Content padding-bottom in pages adjusted to `pb-40` on mobile (player + navbar + buffer)

**Fix in `RoomPage.tsx`**:
- Chat input area: add extra bottom padding on mobile so it's not covered by the player/navbar stack
- Use `pb-[calc(64px+80px+16px)]` or similar to clear both player and navbar

### 3. Fix Together Room Real-Time Sync

**Problem**: Playback not properly synchronized across users.

**Fix in `roomStore.ts`**:
- On host play/pause/seek/song change, immediately broadcast via Supabase Realtime Broadcast (not just every 5 seconds)
- Add `seek` broadcast event
- On listener receive: sync `currentSong`, `isPlaying`, and `currentTime` to the audio element
- Add drift correction: if listener time differs by >2s from host broadcast, snap to correct time

**Fix in `RoomPage.tsx`**:
- Host: on every play/pause/seek action, call `updatePlayback()` immediately (not just interval)
- Host: broadcast current `audioRef.currentTime` in the periodic sync (not hardcoded `0`)
- Listeners: when receiving sync, update `playerStore` and seek the audio element
- Add sync indicator (green dot = synced)

### 4. Fix Host Auto-Assignment on Leave

**Fix in `roomStore.ts` `leaveRoom`**:
- If host leaves, before deleting room, check if other members exist
- If yes, update `rooms.host_id` to the oldest member, then leave
- If no other members, delete room

### 5. Fix "User Not Found" in Friends

**Problem**: Email lookup fails because emails might be stored differently (case, empty).

**Fix in `FriendsPage.tsx`**:
- Use `ilike` instead of `eq` for case-insensitive email search
- Add a more helpful error message suggesting the friend needs an account first
- Trim and lowercase the email before searching

### 6. Add Activity Tracking on Song Play

**Fix in `playerStore.ts` or `MusicPlayer.tsx`**:
- When `currentSong` changes and user is authenticated, upsert to `user_activity` table
- Use `upsert` with `onConflict: 'user_id'` (need a unique constraint on `user_id` — add via migration)
- Set `action: 'playing'`, `song_data: currentSong`, `updated_at: now()`

**Migration needed**: Add unique constraint on `user_activity.user_id` so upsert works (one activity row per user).

### 7. Fix Mobile Chat Input Overlap in Together Room

**Problem**: Music player covers chat input in room page on mobile.

**Fix in `RoomPage.tsx`**:
- Add sufficient bottom padding to the chat input container
- Use `pb-[160px]` on mobile to clear player + navbar
- Or detect if player is visible and add dynamic spacing

### 8. Vercel SPA Routing

**Fix**: Add/verify `vercel.json` with SPA rewrite rule so deep links work on reload.

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

### Technical Summary

| File | Changes |
|---|---|
| `src/components/MobileNav.tsx` | Rewrite to 5-item flex layout with centered floating Together button |
| `src/components/MusicPlayer.tsx` | Fix mobile `bottom` position to sit above navbar |
| `src/store/roomStore.ts` | Add immediate broadcast on play/pause/seek, drift correction, host auto-assign |
| `src/pages/RoomPage.tsx` | Pass actual currentTime in sync, fix mobile padding, add sync indicator |
| `src/pages/FriendsPage.tsx` | Fix email lookup with `ilike`, better error messages |
| `src/components/MusicPlayer.tsx` or new hook | Add activity tracking upsert on song change |
| `vercel.json` | SPA rewrite rule |
| Migration | Add unique constraint on `user_activity.user_id` |

