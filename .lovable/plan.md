

## Plan: Party Mode + Working Settings + Host Kick/End Room

Three areas to implement:

---

### 1. Make Settings Actually Functional

Currently settings are saved to localStorage but never consumed by the player or app. Wire them up:

**`src/hooks/useSettings.ts`** (new): A small hook that reads `kanako-settings` from localStorage and returns the current settings object. Exposes a `getSettings()` function.

**`src/components/MusicPlayer.tsx`**:
- On mount and when settings change, read `kanako-settings` from localStorage
- **Autoplay**: When `autoplay` is false, modify `onEnded` to NOT call `playNext()`
- **Crossfade**: Set `crossfadeDuration` state from settings value instead of hardcoded 0
- **Sleep Timer**: When `sleepTimerEnabled` is true, start a countdown timer using `sleepTimerDuration` from settings. When it hits 0, pause playback.

**`src/index.css` / `src/App.tsx`**:
- **Dark/Light theme**: The toggle already applies `light-theme` class. Add a `.light-theme` CSS section with inverted color variables so the toggle actually changes the UI appearance.

**`src/services/musicApi.ts`** (or MusicPlayer):
- **Playback quality**: The JioSaavn API returns multiple quality URLs. Map settings quality (low/medium/high/auto) to the appropriate bitrate URL when setting `audio.src`.

---

### 2. Party Mode in Together Room

**`src/store/roomStore.ts`**:
- Add `partyMode` boolean to Room interface (already exists in DB as `party_mode`)
- Add `broadcastPartyMode(enabled: boolean)` — broadcasts toggle + updates DB
- Add `broadcastReaction(emoji: string)` — broadcasts reaction event to all users
- Listen for `party_mode` and `reaction` broadcast events

**`src/pages/RoomPage.tsx`**:
- Add Party Mode toggle button (host only) in the header area
- When party mode is ON:
  - Show a reaction bar at the bottom of the now-playing section with emoji buttons: 🔥 👏 💥 🎉
  - Floating emoji animations when reactions are received (CSS animation: float up and fade out)
  - Album art pulses with a CSS animation synced to a simple beat interval
  - Background gets a subtle color-shifting glow effect
- Add a `partyMode` state that syncs from room broadcasts
- Reaction display: maintain a temporary array of received reactions, render them as floating elements, remove after 2s

**Beat-sync visuals** (lightweight, no Web Audio needed for MVP):
- Use a CSS `@keyframes pulse` animation on album art when party mode is ON
- Background glow uses `animation: party-glow 2s ease-in-out infinite alternate`
- Add these keyframes to `src/index.css`

---

### 3. Host Kick User + End Room

**`src/store/roomStore.ts`**:
- Add `kickUser(userId: string)` — host deletes from `room_members`, broadcasts `kick` event with the kicked user's ID
- Add `endRoom()` — host broadcasts `room_ended` event, deletes all room_members, deletes room from DB, resets store
- Listen for `kick` broadcast: if current user's ID matches, auto-leave and navigate to `/together`
- Listen for `room_ended` broadcast: auto-leave and navigate to `/together`

**`src/pages/RoomPage.tsx`**:
- In the members/participants section, if `isHost`, show a ✕ button next to each non-host member to kick them
- Add "End Room" button in the header (host only) with a confirmation prompt
- On receiving `kick` or `room_ended` event, show a toast and redirect

**Database**: The existing RLS allows host to delete room and members can delete themselves. For kick, the host needs to delete other members' rows. Need a migration to update `room_members` DELETE policy to also allow the room host:

```sql
DROP POLICY "Users can leave rooms" ON public.room_members;
CREATE POLICY "Users or host can remove members" ON public.room_members
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM rooms WHERE rooms.id = room_members.room_id AND rooms.host_id = auth.uid()
    )
  );
```

---

### Files Changed

| File | Changes |
|---|---|
| `src/index.css` | Add `.light-theme` color vars, party-mode keyframes |
| `src/hooks/useSettings.ts` | New: hook to read settings from localStorage |
| `src/components/MusicPlayer.tsx` | Wire autoplay, crossfade, sleep timer from settings |
| `src/store/roomStore.ts` | Add partyMode, reactions, kick, endRoom |
| `src/pages/RoomPage.tsx` | Party mode UI, reactions, kick buttons, end room button |
| Migration | Update room_members DELETE RLS for host kick |

