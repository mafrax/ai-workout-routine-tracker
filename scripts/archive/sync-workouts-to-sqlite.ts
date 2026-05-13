/**
 * Sync workouts and exercises from Neon PostgreSQL to local SQLite
 */

import prisma from '../src/lib/database';
import Database from 'better-sqlite3';
import * as path from 'path';

async function syncWorkoutsToSQLite() {
  const sqlitePath = path.join(__dirname, '..', 'prisma', 'workout.db');
  const sqlite = new Database(sqlitePath);

  try {
    console.log('🔄 Syncing workouts from Neon to SQLite...');

    // Create workouts table if it doesn't exist
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY,
        plan_id INTEGER NOT NULL,
        day INTEGER NOT NULL,
        muscle_group TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(plan_id, day),
        FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE
      );
    `);

    // Create exercises table if it doesn't exist
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY,
        workout_id INTEGER NOT NULL,
        order_index INTEGER NOT NULL,
        exercise_title TEXT NOT NULL,
        number_of_reps TEXT NOT NULL,
        weight REAL,
        is_bodyweight INTEGER DEFAULT 0,
        rest_time INTEGER,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(workout_id, order_index),
        FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
      );
    `);

    console.log('✅ Tables created/verified');

    // Fetch all workouts from Neon
    const workouts = await prisma.workout.findMany({
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: [
        { planId: 'asc' },
        { day: 'asc' }
      ]
    });

    console.log(`📦 Found ${workouts.length} workouts in Neon`);

    // Clear existing data
    sqlite.exec('DELETE FROM exercises;');
    sqlite.exec('DELETE FROM workouts;');
    console.log('🗑️ Cleared existing workout data from SQLite');

    // Insert workouts and exercises
    const insertWorkout = sqlite.prepare(`
      INSERT INTO workouts (id, plan_id, day, muscle_group, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertExercise = sqlite.prepare(`
      INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let workoutCount = 0;
    let exerciseCount = 0;

    sqlite.exec('BEGIN TRANSACTION;');

    for (const workout of workouts) {
      // Insert workout
      insertWorkout.run(
        Number(workout.id),
        Number(workout.planId),
        workout.day,
        workout.muscleGroup,
        workout.createdAt.toISOString()
      );
      workoutCount++;

      // Insert exercises
      for (const exercise of workout.exercises) {
        insertExercise.run(
          Number(exercise.id),
          Number(exercise.workoutId),
          exercise.orderIndex,
          exercise.exerciseTitle,
          exercise.numberOfReps, // Already a JSON string
          exercise.weight,
          exercise.isBodyweight ? 1 : 0,
          exercise.restTime,
          exercise.notes,
          exercise.createdAt.toISOString()
        );
        exerciseCount++;
      }
    }

    sqlite.exec('COMMIT;');

    console.log(`✅ Inserted ${workoutCount} workouts`);
    console.log(`✅ Inserted ${exerciseCount} exercises`);

    // Verify the data
    const sqliteWorkoutCount = sqlite.prepare('SELECT COUNT(*) as count FROM workouts').get() as { count: number };
    const sqliteExerciseCount = sqlite.prepare('SELECT COUNT(*) as count FROM exercises').get() as { count: number };

    console.log(`\n📊 SQLite verification:`);
    console.log(`  Workouts: ${sqliteWorkoutCount.count}`);
    console.log(`  Exercises: ${sqliteExerciseCount.count}`);

    console.log('\n🎉 Successfully synced workouts to SQLite!');
  } catch (error) {
    console.error('❌ Error syncing workouts:', error);
    sqlite.exec('ROLLBACK;');
    process.exit(1);
  } finally {
    sqlite.close();
    await prisma.$disconnect();
  }
}

syncWorkoutsToSQLite();
