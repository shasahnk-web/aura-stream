-- Allow authenticated users to search profiles by email for friend requests
CREATE POLICY "Users can search profiles by email" ON public.profiles
  FOR SELECT TO authenticated USING (true);