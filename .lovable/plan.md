

## Plan: UI Fixes + Listen Together + AI DJ + Social Features

This is a large scope covering 4 major areas. I will implement them in phases within a single pass, prioritizing the quick UI fixes first, then the "Listen Together" feature, then AI DJ, then social features.

---

### Phase 1: UI Fixes (Quick Wins)

**1. Logo size increase**
- Header: increase logo from `w-10 h-10` to `w-12 h-12` on mobile, keep text size
- Sidebar: increase from `w-11 h-11` to `w-14 h-14`

**2. Dynamic greeting with username**
- Update `Index.tsx` greeting logic to use 4 time ranges (Morning/Afternoon/Evening/Night without "Good")
- Pull user name from `authStore` + profile fetch, fallback to localStorage profile name, fallback to "there"
- Display: "Morning Ayush"

**3. Telegram button alignment**
- MobileNav: change from absolute positioning to a proper flex item in the flow
- Make center button use a dedicated flex slot with equal spacing using `flex-1` on spacer items
- Keep the elevated floating style but center it properly

**4. MobileNav update**
- Replace Settings item (currently pointing to `/trending`) with a "Together" tab pointing to `/together`
- Items: Home, Search, Together (center, replacing Telegram float), Library, Settings

---

### Phase 2: Listen Together (Supabase Realtime)

**Database tables needed** (migration):
- `rooms` — id (text, PK), host_id (uuid), room_name (text), current_song (jsonb), is_playing (boolean), current_time (float), created_at, updated_at
- `room_members` — id (uuid), room_id (text FK), user_id (uuid), user_name (text), joined_at
- `room_messages` — id (uuid), room_id (text FK), user_name (text), message (text), created_at
- `song_requests` — id (uuid), room_id (text FK), song_data (jsonb), requested_by (text), status (text default 'pending'), created_at

RLS: Authenticated users can read/write rooms they're members of. Public read on rooms for discovery.

**New files:**
- `src/pages/TogetherPage.tsx` — Landing page with name input, Create Room button, Join Room input
- `src/pages/RoomPage.tsx` — Room view with synced player, live chat, song requests, member list
- `src/store/roomStore.ts` — Zustand store managing room state, Supabase Realtime channel subscriptions (Broadcast for playback sync, Presence for online users, Postgres changes for messages/requests)

**How sync works:**
- Host broadcasts playback state (song, isPlaying, currentTime) via Supabase Realtime Broadcast channel
- Listeners receive broadcast and sync their audio element
- Chat uses `room_messages` table with Realtime Postgres Changes subscription
- Song requests use `song_requests` table; host sees pending requests and can accept/reject

**Navigation:** Add `/together` and `/room/:id` routes in App.tsx

---

### Phase 3: AI DJ

**New files:**
- `src/components/AiDjSection.tsx` — Home page section with "Start AI DJ" button
- `src/hooks/useAiDj.ts` — Logic that analyzes liked songs (from `useLikedStore`), extracts common artists/genres, searches JioSaavn for similar songs, builds a dynamic playlist

**Logic (client-side, no ML needed):**
1. Collect liked songs artists
2. Pick top 3 most-liked artists
3. Search JioSaavn for each artist
4. Merge results, remove duplicates and already-liked songs
5. Shuffle and set as queue with autoplay

**Home page integration:** Add AI DJ section between greeting and Recently Played

---

### Phase 4: Social Features (Friends Activity)

**Database tables** (migration):
- `friendships` — id (uuid), requester_id (uuid), addressee_id (uuid), status (text: 'pending'/'accepted'/'rejected'), created_at
- `user_activity` — id (uuid), user_id (uuid), song_data (jsonb), action (text: 'playing'/'liked'), updated_at

RLS: Users can see accepted friends' activity. Users can manage their own friend requests.

**New files:**
- `src/components/FriendsActivity.tsx` — Sidebar/home section showing what friends are listening to
- `src/pages/FriendsPage.tsx` — Add friend by email, manage requests, friend list

**Activity tracking:** Update `playerStore` to write current song to `user_activity` table when authenticated.

---

### Navigation Summary

**MobileNav tabs:** Home | Search | [Together] | Library | Settings
**Sidebar:** Home, Search, Library + Your Library section (Liked, Trending, Radio, Together, Friends, Settings)
**Routes added:** `/together`, `/room/:id`, `/friends`

---

### Technical Notes

- Supabase Realtime Broadcast handles low-latency playback sync (no extra WebSocket server needed)
- Supabase Realtime Presence tracks who's online in a room
- Postgres Changes subscription for chat messages and song requests
- All real-time features require authentication
- Room IDs will be short random codes (e.g., "ROOM-4582") generated client-side
- AI DJ is purely client-side logic using existing JioSaavn search API

### Implementation Order
1. Database migration (all tables at once)
2. UI fixes (logo, greeting, nav)
3. Together page + Room page + roomStore
4. AI DJ section + hook
5. Friends system + activity tracking

