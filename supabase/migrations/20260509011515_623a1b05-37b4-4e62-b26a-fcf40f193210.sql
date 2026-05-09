-- 1. Remove public exposure of email in profiles by dropping the room co-member SELECT policy
-- and creating a safer one that excludes the email column via a view-style approach.
-- Simplest fix: revoke read access to email by replacing room co-member policy with friend-only,
-- and ensure room co-members can still see name/avatar via a SECURITY DEFINER function.

DROP POLICY IF EXISTS "Users can view room co-member profiles" ON public.profiles;

-- Create a security definer function for safe profile lookup (no email)
CREATE OR REPLACE FUNCTION public.get_room_member_profile(_user_id uuid)
RETURNS TABLE(id uuid, name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.avatar_url
  FROM profiles p
  WHERE p.id = _user_id
    AND EXISTS (
      SELECT 1 FROM room_members rm1
      JOIN room_members rm2 ON rm1.room_id = rm2.room_id
      WHERE rm1.user_id = auth.uid() AND rm2.user_id = _user_id
    );
$$;

-- 2. Fix song_requests overly-permissive SELECT
DROP POLICY IF EXISTS "Room members can view requests" ON public.song_requests;
CREATE POLICY "Room members can view requests"
ON public.song_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM room_members
    WHERE room_members.room_id = song_requests.room_id
      AND room_members.user_id = auth.uid()
  )
);

-- 3. Prevent friendship status escalation by requester
DROP POLICY IF EXISTS "Users can update own friendships" ON public.friendships;

CREATE POLICY "Addressee can accept or update friendship"
ON public.friendships
FOR UPDATE
TO authenticated
USING (auth.uid() = addressee_id)
WITH CHECK (auth.uid() = addressee_id);

CREATE POLICY "Requester can update but not accept"
ON public.friendships
FOR UPDATE
TO authenticated
USING (auth.uid() = requester_id)
WITH CHECK (auth.uid() = requester_id AND status <> 'accepted');
