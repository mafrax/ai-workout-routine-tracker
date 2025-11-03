-- Add missing columns to workout_plans table
ALTER TABLE workout_plans ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE workout_plans ADD COLUMN IF NOT EXISTS days_per_week INTEGER;
ALTER TABLE workout_plans ADD COLUMN IF NOT EXISTS duration_weeks INTEGER;
ALTER TABLE workout_plans ADD COLUMN IF NOT EXISTS difficulty_level TEXT;
ALTER TABLE workout_plans ADD COLUMN IF NOT EXISTS color TEXT;

-- Add exercises column to workout_sessions table
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS exercises TEXT;
