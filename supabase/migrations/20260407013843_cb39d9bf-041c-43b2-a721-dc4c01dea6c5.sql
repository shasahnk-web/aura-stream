DROP POLICY "Users can leave rooms" ON public.room_members;
CREATE POLICY "Users or host can remove members" ON public.room_members
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM rooms WHERE rooms.id = room_members.room_id AND rooms.host_id = auth.uid()
    )
  );