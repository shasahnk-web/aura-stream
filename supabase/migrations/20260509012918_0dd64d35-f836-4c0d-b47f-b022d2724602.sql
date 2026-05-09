-- Enable RLS on realtime.messages (Realtime Authorization)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Helper: extract the room id from a channel topic.
-- Topics in this app are either the raw room id (e.g. "abc123")
-- or prefixed like "room:abc123" / "room-abc123".
CREATE OR REPLACE FUNCTION public.realtime_topic_room_id(topic text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN topic LIKE 'room:%'  THEN substring(topic from 6)
    WHEN topic LIKE 'room-%'  THEN substring(topic from 6)
    ELSE topic
  END;
$$;

-- Allow authenticated users to receive realtime messages for a topic
-- only if they are a member or host of the corresponding room,
-- OR if the topic targets their own user id (personal channels).
DROP POLICY IF EXISTS "Authenticated can read room realtime" ON realtime.messages;
CREATE POLICY "Authenticated can read room realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = public.realtime_topic_room_id(realtime.topic())
      AND rm.user_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = public.realtime_topic_room_id(realtime.topic())
      AND r.host_id = (SELECT auth.uid())
  )
  OR realtime.topic() = (SELECT auth.uid())::text
  OR realtime.topic() LIKE 'user:' || (SELECT auth.uid())::text
);

-- Allow authenticated users to send broadcast/presence on the same conditions.
DROP POLICY IF EXISTS "Authenticated can send room realtime" ON realtime.messages;
CREATE POLICY "Authenticated can send room realtime"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = public.realtime_topic_room_id(realtime.topic())
      AND rm.user_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = public.realtime_topic_room_id(realtime.topic())
      AND r.host_id = (SELECT auth.uid())
  )
  OR realtime.topic() = (SELECT auth.uid())::text
  OR realtime.topic() LIKE 'user:' || (SELECT auth.uid())::text
);