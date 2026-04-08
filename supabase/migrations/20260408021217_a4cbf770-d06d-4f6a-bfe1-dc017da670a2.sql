
-- ==============================
-- 1. Direct Messages table
-- ==============================
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Only sender or receiver can view their messages
CREATE POLICY "Users can view own messages"
  ON public.direct_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can only send messages as themselves, and only to accepted friends
CREATE POLICY "Users can send messages to friends"
  ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
        AND (
          (requester_id = auth.uid() AND addressee_id = receiver_id)
          OR (addressee_id = auth.uid() AND requester_id = receiver_id)
        )
    )
  );

-- Users can update (mark as read) only messages they received
CREATE POLICY "Users can mark received messages as read"
  ON public.direct_messages FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id);

CREATE INDEX idx_dm_sender ON public.direct_messages (sender_id, created_at DESC);
CREATE INDEX idx_dm_receiver ON public.direct_messages (receiver_id, created_at DESC);
CREATE INDEX idx_dm_conversation ON public.direct_messages (
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id),
  created_at DESC
);

-- ==============================
-- 2. Fix: room_messages SELECT - restrict to room members only
-- ==============================
DROP POLICY "Room members can view messages" ON public.room_messages;
CREATE POLICY "Room members can view messages"
  ON public.room_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = room_messages.room_id
        AND room_members.user_id = auth.uid()
    )
  );

-- ==============================
-- 3. Fix: profiles SELECT - only self or accepted friends can see email, public fields visible to all
-- ==============================
-- We keep the existing "Users can view own profile" (uid=id) and "Users can search profiles by email" (true)
-- The email column itself isn't sensitive for search (needed for friend requests).
-- But we should restrict it more: drop the blanket true policy, replace with one that shows name+avatar to all but email only to self.
-- Actually, the friend system needs email search. Let's keep it but make email-based search a function instead.

-- For now: the profiles are needed for friend lookup. We'll use a security definer function instead.
DROP POLICY "Users can search profiles by email" ON public.profiles;
DROP POLICY "Users can view own profile" ON public.profiles;

-- Users can always view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Users can view profiles of their friends
CREATE POLICY "Users can view friend profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
        AND (
          (requester_id = auth.uid() AND addressee_id = profiles.id)
          OR (addressee_id = auth.uid() AND requester_id = profiles.id)
        )
    )
  );

-- Security definer function for email-based friend search (no direct email exposure)
CREATE OR REPLACE FUNCTION public.find_user_by_email(search_email text)
RETURNS TABLE(id uuid, name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.avatar_url
  FROM profiles p
  WHERE LOWER(p.email) = LOWER(search_email)
  LIMIT 1;
$$;

-- Also allow viewing profiles of room co-members
CREATE POLICY "Users can view room co-member profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM room_members rm1
      JOIN room_members rm2 ON rm1.room_id = rm2.room_id
      WHERE rm1.user_id = auth.uid() AND rm2.user_id = profiles.id
    )
  );
