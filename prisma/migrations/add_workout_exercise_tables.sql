-- Migration: Add Workout and Exercise tables
-- Description: Extract workout plan details from JSON into relational tables

-- Create Workout table
CREATE TABLE IF NOT EXISTS "workouts" (
    "id" BIGSERIAL PRIMARY KEY,
    "plan_id" BIGINT NOT NULL,
    "day" INTEGER NOT NULL,
    "muscle_group" TEXT NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workouts_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "workout_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workouts_plan_id_day_key" UNIQUE ("plan_id", "day")
);

-- Create Exercise table
CREATE TABLE IF NOT EXISTS "exercises" (
    "id" BIGSERIAL PRIMARY KEY,
    "workout_id" BIGINT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "exercise_title" TEXT NOT NULL,
    "number_of_reps" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "is_bodyweight" BOOLEAN NOT NULL DEFAULT false,
    "rest_time" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exercises_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "exercises_workout_id_order_index_key" UNIQUE ("workout_id", "order_index")
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "workouts_plan_id_idx" ON "workouts" ("plan_id");
CREATE INDEX IF NOT EXISTS "exercises_workout_id_idx" ON "exercises" ("workout_id");
