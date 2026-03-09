-- Rooms table for Listen Together
CREATE TABLE public.rooms (
  id TEXT PRIMARY KEY,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  room_name TEXT NOT NULL DEFAULT 'Music Room',
  current_song JSONB,
  is_playing BOOLEAN NOT NULL DEFAULT false,
  playback_time FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Room members table
CREATE TABLE public.room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Room messages table for live chat
CREATE TABLE public.room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Song requests table
CREATE TABLE public.song_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  song_data JSONB NOT NULL,
  requested_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Friendships table
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  addressee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

-- User activity table for tracking what users are listening to
CREATE TABLE public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  song_data JSONB,
  action TEXT NOT NULL DEFAULT 'playing',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rooms
CREATE POLICY "Anyone can view rooms" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create rooms" ON public.rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host can update room" ON public.rooms FOR UPDATE TO authenticated USING (auth.uid() = host_id);
CREATE POLICY "Host can delete room" ON public.rooms FOR DELETE TO authenticated USING (auth.uid() = host_id);

-- RLS Policies for room_members
CREATE POLICY "Anyone can view room members" ON public.room_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can join rooms" ON public.room_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave rooms" ON public.room_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for room_messages
CREATE POLICY "Room members can view messages" ON public.room_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Room members can send messages" ON public.room_messages FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.room_members WHERE room_id = room_messages.room_id AND user_id = auth.uid())
);

-- RLS Policies for song_requests
CREATE POLICY "Room members can view requests" ON public.song_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Room members can request songs" ON public.song_requests FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.room_members WHERE room_id = song_requests.room_id AND user_id = auth.uid())
);
CREATE POLICY "Host can update requests" ON public.song_requests FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.rooms WHERE id = song_requests.room_id AND host_id = auth.uid())
);

-- RLS Policies for friendships
CREATE POLICY "Users can view own friendships" ON public.friendships FOR SELECT TO authenticated 
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users can send friend requests" ON public.friendships FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update own friendships" ON public.friendships FOR UPDATE TO authenticated 
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users can delete own friendships" ON public.friendships FOR DELETE TO authenticated 
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- RLS Policies for user_activity
CREATE POLICY "Friends can view activity" ON public.user_activity FOR SELECT TO authenticated USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.friendships 
    WHERE status = 'accepted' 
    AND ((requester_id = auth.uid() AND addressee_id = user_activity.user_id)
    OR (addressee_id = auth.uid() AND requester_id = user_activity.user_id))
  )
);
CREATE POLICY "Users can update own activity" ON public.user_activity FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can upsert own activity" ON public.user_activity FOR UPDATE TO authenticated 
  USING (auth.uid() = user_id);

-- Enable realtime for necessary tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.song_requests;