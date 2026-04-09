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

CREATE POLICY "Host can view join requests"
  ON public.join_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM rooms WHERE rooms.id = join_requests.room_id AND rooms.host_id = auth.uid()));

CREATE POLICY "Users can request to join"
  ON public.join_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Host can update join requests"
  ON public.join_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM rooms WHERE rooms.id = join_requests.room_id AND rooms.host_id = auth.uid()));