/**
 * Export workouts and exercises from Neon PostgreSQL to SQL statements
 * Then execute them in SQLite
 */

import prisma from '../src/lib/database';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function exportWorkoutsToSQL() {
  try {
    console.log('🔄 Exporting workouts from Neon...');

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

    // Generate SQL statements
    const sqlStatements: string[] = [];

    // Create tables
    sqlStatements.push(`
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

    sqlStatements.push(`
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

    // Clear existing data
    sqlStatements.push('DELETE FROM exercises;');
    sqlStatements.push('DELETE FROM workouts;');

    // Insert workouts and exercises
    for (const workout of workouts) {
      const createdAt = workout.createdAt.toISOString().replace('T', ' ').replace('Z', '');
      sqlStatements.push(`
INSERT INTO workouts (id, plan_id, day, muscle_group, created_at)
VALUES (${workout.id}, ${workout.planId}, ${workout.day}, '${workout.muscleGroup.replace(/'/g, "''")}', '${createdAt}');
`);

      for (const exercise of workout.exercises) {
        const exCreatedAt = exercise.createdAt.toISOString().replace('T', ' ').replace('Z', '');
        const title = exercise.exerciseTitle.replace(/'/g, "''");
        const notes = exercise.notes ? `'${exercise.notes.replace(/'/g, "''")}'` : 'NULL';
        const weight = exercise.weight !== null ? exercise.weight : 'NULL';

        sqlStatements.push(`
INSERT INTO exercises (id, workout_id, order_index, exercise_title, number_of_reps, weight, is_bodyweight, rest_time, notes, created_at)
VALUES (${exercise.id}, ${exercise.workoutId}, ${exercise.orderIndex}, '${title}', '${exercise.numberOfReps}', ${weight}, ${exercise.isBodyweight ? 1 : 0}, ${exercise.restTime || 'NULL'}, ${notes}, '${exCreatedAt}');
`);
      }
    }

    // Write SQL to file
    const sqlFile = path.join(__dirname, '..', 'prisma', 'sync-workouts.sql');
    fs.writeFileSync(sqlFile, sqlStatements.join('\n'));
    console.log(`✅ SQL statements written to ${sqlFile}`);

    // Execute SQL in SQLite
    const dbPath = path.join(__dirname, '..', 'prisma', 'workout.db');
    console.log('🔄 Executing SQL in SQLite...');

    execSync(`sqlite3 "${dbPath}" < "${sqlFile}"`, { stdio: 'inherit' });

    console.log('✅ SQL executed successfully');

    // Verify
    const countResult = execSync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM workouts;"`, { encoding: 'utf-8' });
    const workoutCount = parseInt(countResult.trim());

    const exCountResult = execSync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM exercises;"`, { encoding: 'utf-8' });
    const exerciseCount = parseInt(exCountResult.trim());

    console.log(`\n📊 SQLite verification:`);
    console.log(`  Workouts: ${workoutCount}`);
    console.log(`  Exercises: ${exerciseCount}`);

    console.log('\n🎉 Successfully synced workouts to SQLite!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportWorkoutsToSQL();
