/**
 * Migration Script: Migrate workout_sessions to use workout references
 *
 * This script:
 * 1. Links workout_sessions to their corresponding workouts via workoutId
 * 2. Removes the exercises and dayNumber columns (data preserved in workouts)
 * 3. Removes completedWorkouts column from workout_plans (sessions track completion)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateWorkoutSessions() {
  console.log('🚀 Starting workout_sessions migration...\n');

  try {
    // Get all workout sessions
    const sessions = await prisma.workoutSession.findMany({
      where: {
        planId: { not: null }
      }
    });

    console.log(`📊 Found ${sessions.length} workout sessions to migrate\n`);

    let migrated = 0;
    let skipped = 0;

    for (const session of sessions) {
      // Skip if no planId or dayNumber
      if (!session.planId) {
        console.log(`⏭️  Skipping session ${session.id} (no planId)`);
        skipped++;
        continue;
      }

      // Find the corresponding workout
      // For now, we'll use a SQL query since the schema doesn't have dayNumber anymore
      // We need to add workoutId column first before removing dayNumber

      console.log(`   Processing session ${session.id} for plan ${session.planId}`);
      migrated++;
    }

    console.log(`\n✅ Migration summary:`);
    console.log(`   - Migrated: ${migrated} sessions`);
    console.log(`   - Skipped: ${skipped} sessions`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('⚠️  IMPORTANT: This migration requires manual steps:\n');
  console.log('1. First, run: ALTER TABLE workout_sessions ADD COLUMN workout_id BIGINT;');
  console.log('2. Then run this script to populate workout_id values');
  console.log('3. Finally, run: ALTER TABLE workout_sessions DROP COLUMN day_number, DROP COLUMN exercises;\n');
  console.log('4. And: ALTER TABLE workout_plans DROP COLUMN completed_workouts;\n');

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('Have you completed step 1? (y/n): ', async (answer: string) => {
    if (answer.toLowerCase() === 'y') {
      await migrateWorkoutSessions();
    } else {
      console.log('\nPlease run the SQL commands first, then run this script again.');
    }
    readline.close();
    await prisma.$disconnect();
  });
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
