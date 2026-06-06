
-- 1) Direct messages: prevent receivers from tampering with content
DROP POLICY IF EXISTS "Users can mark received messages as read" ON public.direct_messages;

CREATE OR REPLACE FUNCTION public.mark_messages_read(p_sender_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.direct_messages
  SET read = true
  WHERE receiver_id = auth.uid()
    AND sender_id = p_sender_id
    AND read = false;
$$;
REVOKE EXECUTE ON FUNCTION public.mark_messages_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid) TO authenticated;

-- 2) Room membership: require approved request or being host
DROP POLICY IF EXISTS "Authenticated users can join rooms" ON public.room_members;
CREATE POLICY "Join requires approval or host"
ON public.room_members FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id AND (
    EXISTS (SELECT 1 FROM public.rooms WHERE id = room_members.room_id AND host_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.join_requests jr
      WHERE jr.room_id = room_members.room_id
        AND jr.user_id = auth.uid()
        AND jr.status = 'approved'
    )
  )
);

-- Host-side atomic approval helper
CREATE OR REPLACE FUNCTION public.approve_join_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  SELECT jr.id, jr.room_id, jr.user_id, jr.user_name, ro.host_id
  INTO r
  FROM public.join_requests jr
  JOIN public.rooms ro ON ro.id = jr.room_id
  WHERE jr.id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Join request not found';
  END IF;
  IF r.host_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the host can approve join requests';
  END IF;

  UPDATE public.join_requests SET status = 'approved' WHERE id = r.id;
  INSERT INTO public.room_members(room_id, user_id, user_name)
  VALUES (r.room_id, r.user_id, r.user_name)
  ON CONFLICT DO NOTHING;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.approve_join_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid) TO authenticated;

-- 3) Requester visibility on own join requests
DROP POLICY IF EXISTS "Requester can view own join requests" ON public.join_requests;
CREATE POLICY "Requester can view own join requests"
ON public.join_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 4) Stop exposing friend emails via profiles table
DROP POLICY IF EXISTS "Users can view friend profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_friend_profiles()
RETURNS TABLE(id uuid, name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.avatar_url
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted' AND (
      (f.requester_id = auth.uid() AND f.addressee_id = p.id) OR
      (f.addressee_id  = auth.uid() AND f.requester_id = p.id)
    )
  );
$$;
REVOKE EXECUTE ON FUNCTION public.get_friend_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_friend_profiles() TO authenticated;

-- 5) Fix mutable search_path on helper
ALTER FUNCTION public.realtime_topic_room_id(text) SET search_path = public;

-- 6) Remove implicit anon SELECT exposure (no table is intended for anon)
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon;
