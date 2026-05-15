DROP POLICY IF EXISTS "Authenticated can read room realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can send room realtime" ON realtime.messages;

CREATE OR REPLACE FUNCTION public.realtime_can_access(topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  parts text[];
  rid text;
  target uuid;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  -- Global app-wide channels
  IF topic = 'dm-updates' THEN
    RETURN true;
  END IF;

  -- room:<roomId>
  IF topic LIKE 'room:%' THEN
    rid := substring(topic from 6);
    RETURN EXISTS (SELECT 1 FROM public.room_members WHERE room_id = rid AND user_id = uid)
        OR EXISTS (SELECT 1 FROM public.rooms WHERE id = rid AND host_id = uid);
  END IF;

  -- pending-join:<roomId>:<userId>
  IF topic LIKE 'pending-join:%' THEN
    parts := string_to_array(topic, ':');
    IF array_length(parts, 1) >= 3 THEN
      rid := parts[2];
      BEGIN
        target := parts[3]::uuid;
      EXCEPTION WHEN others THEN
        RETURN false;
      END;
      RETURN target = uid
          OR EXISTS (SELECT 1 FROM public.rooms WHERE id = rid AND host_id = uid);
    END IF;
    RETURN false;
  END IF;

  -- Personal user-scoped channels
  IF topic = uid::text OR topic = 'user:' || uid::text THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE POLICY "Realtime authorization read"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.realtime_can_access(realtime.topic()));

CREATE POLICY "Realtime authorization send"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.realtime_can_access(realtime.topic()));