/**
 * Migration Script: Populate Workout and Exercise tables from workout_sessions
 *
 * This script:
 * 1. Reads workout_sessions.exercises data
 * 2. Parses workout_plans.planDetails to get muscle groups
 * 3. Creates Workout records (one per day per plan)
 * 4. Creates Exercise records from session data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SessionExercise {
  name: string;
  sets: number;
  completedSets?: number;
  reps: string;
  weight: string; // 'b' for bodyweight or numeric string
}

interface MuscleGroupMap {
  [day: number]: string;
}

/**
 * Parse planDetails to extract muscle groups for each day
 */
function parseMuscleGroups(planDetails: string): MuscleGroupMap {
  const muscleGroups: MuscleGroupMap = {};
  const lines = planDetails.split('\n');

  for (const line of lines) {
    const dayMatch = line.match(/^Day (\d+)\s*-\s*(.+):?$/i);
    if (dayMatch) {
      const day = parseInt(dayMatch[1]);
      const muscleGroup = dayMatch[2].trim().replace(/:$/, '');
      muscleGroups[day] = muscleGroup;
    }
  }

  return muscleGroups;
}

/**
 * Parse planDetails to extract rest times for exercises
 */
function parseExerciseDetails(planDetails: string): Map<string, { restTime?: number; notes?: string; weight?: number }> {
  const exerciseDetails = new Map<string, { restTime?: number; notes?: string; weight?: number }>();
  const lines = planDetails.split('\n');

  for (const line of lines) {
    // Match exercise line: "1. Exercise Name - details"
    // Use negative lookahead to capture exercise name up to the last dash before details
    const exerciseMatch = line.match(/^\d+\.\s*(.+)\s+-\s+(\d+x\d+.+)$/);
    if (exerciseMatch) {
      const exerciseName = exerciseMatch[1].trim();
      const details = exerciseMatch[2].trim();

      const info: { restTime?: number; notes?: string; weight?: number } = {};

      // Extract rest time - handle multiple patterns:
      // Pattern 1: "| 120s rest"
      // Pattern 2: "| 60s" or "| 60s | 90s"
      const restMatch = details.match(/\|\s*(\d+)s/);
      if (restMatch) {
        info.restTime = parseInt(restMatch[1]);
      }

      // Extract weight
      const weightMatch = details.match(/@ ([\d.]+)kg/);
      if (weightMatch) {
        info.weight = parseFloat(weightMatch[1]);
      }

      // Extract notes (text in parentheses)
      const notesMatch = details.match(/\(([^)]+)\)/);
      if (notesMatch) {
        info.notes = notesMatch[1];
      }

      exerciseDetails.set(exerciseName, info);
    }
  }

  return exerciseDetails;
}

/**
 * Migrate workout sessions to structured workout/exercise tables
 */
async function migrateFromSessions() {
  console.log('🚀 Starting migration from workout sessions...\n');

  try {
    // Get all workout plans that have sessions
    const plans = await prisma.workoutPlan.findMany({
      include: {
        workoutSessions: {
          where: {
            exercises: {
              not: null
            }
          },
          orderBy: {
            dayNumber: 'asc'
          }
        }
      }
    });

    console.log(`📊 Found ${plans.length} workout plans\n`);

    for (const plan of plans) {
      if (plan.workoutSessions.length === 0) {
        console.log(`⏭️  Skipping plan "${plan.name}" (no sessions with exercises)\n`);
        continue;
      }

      console.log(`📝 Processing plan: ${plan.name} (ID: ${plan.id})`);
      console.log(`   Sessions: ${plan.workoutSessions.length}`);

      // Parse muscle groups from planDetails
      const muscleGroups = plan.planDetails
        ? parseMuscleGroups(plan.planDetails)
        : {};

      // Parse exercise details (rest time, notes, weights) from planDetails
      const exerciseDetailsMap = plan.planDetails
        ? parseExerciseDetails(plan.planDetails)
        : new Map();

      // Group sessions by day number
      const sessionsByDay = new Map<number, typeof plan.workoutSessions>();
      for (const session of plan.workoutSessions) {
        if (session.dayNumber === null) continue;

        if (!sessionsByDay.has(session.dayNumber)) {
          sessionsByDay.set(session.dayNumber, []);
        }
        sessionsByDay.get(session.dayNumber)!.push(session);
      }

      console.log(`   Unique days: ${sessionsByDay.size}`);

      // Create workouts for each unique day
      for (const [dayNumber, sessions] of sessionsByDay.entries()) {
        const muscleGroup = muscleGroups[dayNumber] || 'Unknown';

        // Check if workout already exists
        const existingWorkout = await prisma.workout.findUnique({
          where: {
            planId_day: {
              planId: plan.id,
              day: dayNumber
            }
          }
        });

        if (existingWorkout) {
          console.log(`   ⏭️  Day ${dayNumber} (${muscleGroup}) - Already exists, skipping`);
          continue;
        }

        console.log(`   Creating Day ${dayNumber} - ${muscleGroup}`);

        // Use the most recent session for this day to get exercise list
        const latestSession = sessions[sessions.length - 1];

        if (!latestSession.exercises) continue;

        let sessionExercises: SessionExercise[];
        try {
          sessionExercises = JSON.parse(latestSession.exercises);
        } catch (error) {
          console.error(`   ❌ Error parsing exercises for session ${latestSession.id}`);
          continue;
        }

        // Create workout with exercises
        const workout = await prisma.workout.create({
          data: {
            planId: plan.id,
            day: dayNumber,
            muscleGroup,
            exercises: {
              create: sessionExercises.map((exercise, index) => {
                const isBodyweight = exercise.weight === 'b';
                const weight = isBodyweight ? null : parseFloat(exercise.weight);

                // Get additional details from planDetails
                const details = exerciseDetailsMap.get(exercise.name) || {};

                // Create reps array
                const reps = parseInt(exercise.reps);
                const numberOfReps = Array(exercise.sets).fill(reps);

                return {
                  orderIndex: index + 1,
                  exerciseTitle: exercise.name,
                  numberOfReps: JSON.stringify(numberOfReps),
                  // Prefer weight from planDetails over session data
                  weight: details.weight || weight || null,
                  isBodyweight,
                  restTime: details.restTime || null,
                  notes: details.notes || null
                };
              })
            }
          },
          include: {
            exercises: true
          }
        });

        console.log(`   ✅ Created ${workout.exercises.length} exercises for Day ${dayNumber}`);
      }

      console.log(`✅ Completed plan: ${plan.name}\n`);
    }

    // Summary
    const totalWorkouts = await prisma.workout.count();
    const totalExercises = await prisma.exercise.count();

    console.log('\n🎉 Migration completed!');
    console.log(`\n📈 Summary:`);
    console.log(`   - Total workouts created: ${totalWorkouts}`);
    console.log(`   - Total exercises created: ${totalExercises}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  await migrateFromSessions();
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
