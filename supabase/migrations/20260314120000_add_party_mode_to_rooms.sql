-- Add party mode and beat drop tracking to rooms

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS party_mode BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_drop_at DOUBLE PRECISION;

-- Ensure host can update party mode and drop timestamp (existing update policy already covers host)
-- No additional policy needed because the update policy is based on host_id.
