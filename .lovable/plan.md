

## Plan: Room Persistence, Host Controls & Sync Fixes

### Summary
Stop auto-leaving rooms on navigation, add host approval for joins, transfer host role, mute others, and fix sync drift.

---

### 1. Together Page: Show Active Room Instead of Auto-Leaving

**`src/pages/TogetherPage.tsx`**:
- Remove the `useEffect` that calls `leaveRoom` on mount (lines 27-32)
- If `currentRoom` exists, show an "Active Room" card with:
  - Room name and ID
  - "Rejoin Room" button that navigates to `/room/{id}`
  - "Leave Room" button that calls `leaveRoom` and resets to create/join UI
- Only show create/join UI when `currentRoom` is null

### 2. Fix Sync (Drift Correction Improvements)

**`src/pages/RoomPage.tsx`**:
- Reduce drift threshold from 2s to 1s for tighter sync
- Add a periodic drift check interval (every 3s) for listeners that compares `Date.now() - started_at_ms` to `audio.currentTime` and corrects if off by >1s
- On join, immediately seek to the host's current position using `started_at_ms`

**`src/store/roomStore.ts`**:
- Increase host periodic sync from 10s to 5s
- When a new member joins (detected via presence sync), immediately broadcast current playback state so the new user gets instant sync

### 3. Host Can Mute Others' Music

**`src/store/roomStore.ts`**:
- Add `broadcastMuteUser(userId: string, muted: boolean)` - broadcasts a `mute_user` event
- Listen for `mute_user` broadcast: if current user matches, set local audio volume to 0 (muted) or restore

**`src/pages/RoomPage.tsx`**:
- In the members list, add a mute/unmute toggle button next to each non-host member (host only)
- Track muted user IDs in local state

### 4. Host Can Transfer Host Role

**`src/store/roomStore.ts`**:
- Add `transferHost(newHostId: string)` method:
  - Updates `rooms.host_id` to the new user
  - Broadcasts a `host_transfer` event with `{ newHostId }`
- Listen for `host_transfer`: update `currentRoom.host_id` and `isHost` accordingly

**`src/pages/RoomPage.tsx`**:
- In the members list, add a "Make Host" button (crown icon) next to each non-host member (host only)
- When clicked, calls `transferHost(userId)`

### 5. Host Approval for Join Requests

This requires a new table to store pending join requests.

**Database migration**:
```sql
CREATE TABLE public.join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can view join requests"
  ON public.join_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM room_members WHERE room_members.room_id = join_requests.room_id AND room_members.user_id = auth.uid()));

CREATE POLICY "Users can request to join"
  ON public.join_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Host can update join requests"
  ON public.join_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM rooms WHERE rooms.id = join_requests.room_id AND rooms.host_id = auth.uid()));
```

**`src/store/roomStore.ts`**:
- Modify `joinRoom` flow: instead of inserting into `room_members` directly, insert into `join_requests` with status `pending`, then broadcast a `join_request` event to the host
- Add `approveJoin(requestId, userId, userName, roomId)` - host approves: updates join_requests status, inserts into room_members, broadcasts `join_approved` to the requesting user
- Add `rejectJoin(requestId)` - updates status to rejected, broadcasts `join_rejected`
- Listen for `join_approved`: if matching user, complete the join (set currentRoom, subscribe)
- Listen for `join_rejected`: show toast "Host denied your request"

**`src/pages/RoomPage.tsx`**:
- Add join requests section showing pending requests with Accept/Reject buttons (host only)
- Subscribe to `join_requests` postgres changes for real-time updates

**`src/pages/TogetherPage.tsx`**:
- After attempting to join, show a "Waiting for host approval..." state instead of immediately navigating

### 6. Files Changed

| File | Changes |
|---|---|
| `src/pages/TogetherPage.tsx` | Show active room card instead of auto-leaving |
| `src/store/roomStore.ts` | Add transferHost, broadcastMute, join approval flow, faster sync |
| `src/pages/RoomPage.tsx` | Mute/make-host/join-request UI, tighter drift correction |
| `src/integrations/supabase/types.ts` | Auto-updated with join_requests table |
| Migration | Create `join_requests` table with RLS |

