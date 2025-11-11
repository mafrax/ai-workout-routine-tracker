-- Migration: Add workout references to workout_sessions
-- Step 1: Add new columns (keep old ones for now)

ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS workout_id BIGINT;

-- Step 2: Add foreign key constraint
ALTER TABLE workout_sessions
  ADD CONSTRAINT workout_sessions_workout_id_fkey
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE SET NULL;

-- Step 3: Populate workout_id from existing day_number and plan_id
UPDATE workout_sessions ws
SET workout_id = w.id
FROM workouts w
WHERE ws.plan_id = w.plan_id
  AND ws.day_number = w.day
  AND ws.workout_id IS NULL;

-- Step 4: Remove completed_workouts column from workout_plans
ALTER TABLE workout_plans DROP COLUMN IF EXISTS completed_workouts;

-- Step 5: Remove old columns from workout_sessions (after confirming data migration)
-- Commented out for safety - uncomment after verifying data is correct
-- ALTER TABLE workout_sessions DROP COLUMN IF EXISTS day_number;
-- ALTER TABLE workout_sessions DROP COLUMN IF EXISTS exercises;
