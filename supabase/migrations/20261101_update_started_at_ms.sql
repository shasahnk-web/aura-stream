-- Time Sync Upgrade: started_at to bigint ms timestamp
-- Safe migration - add new column, backfill, optional old column drop

BEGIN;

-- 1. Add new started_at_ms column
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS started_at_ms bigint;

-- 2. Create index for perf
CREATE INDEX IF NOT EXISTS idx_rooms_started_at_ms ON public.rooms(started_at_ms) WHERE started_at_ms IS NOT NULL;

-- 3. Backfill skipped (no old started_at column)
-- New systems start with started_at_ms NULL

-- 4. Update app to use started_at_ms (future code uses Number(started_at_ms))
-- Old clients safe - fallback to text

COMMIT;

-- Optional: Drop old column after verification (run separately)
-- ALTER TABLE public.rooms DROP COLUMN IF EXISTS started_at;
-- ALTER TABLE public.rooms RENAME COLUMN started_at_ms TO started_at;
