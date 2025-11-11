/**
 * Data Migration Script: Extract workout plan details into Workout and Exercise tables
 *
 * This script:
 * 1. Reads existing workout_plans.plan_details (JSON string)
 * 2. Parses the workout structure
 * 3. Creates Workout records (one per day)
 * 4. Creates Exercise records (multiple per workout)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ExerciseData {
  exercise_title: string;
  number_of_reps: number[];
  bodyweight?: boolean;
  weight?: number;
  rest_time?: number;
  notes?: string;
}

interface WorkoutDayData {
  day: number;
  muscle_group: string;
  exercises: ExerciseData[];
}

/**
 * Parse plan_details string into structured workout data
 * Expected format:
 * ```
 * Day 1 - Chest & Triceps:
 * 1. Pull-ups - 2x1 @ bodyweight | 120s rest (regular)
 * 2. Push-ups - 4x12 @ bodyweight | 60s | 90s
 * ```
 */
function parsePlanDetails(planDetails: string): WorkoutDayData[] {
  const workouts: WorkoutDayData[] = [];
  const lines = planDetails.split('\n').filter(line => line.trim());

  let currentWorkout: WorkoutDayData | null = null;

  for (const line of lines) {
    // Check if this is a day header (e.g., "Day 1 - Chest & Triceps:")
    const dayMatch = line.match(/^Day (\d+)\s*-\s*(.+):?$/i);
    if (dayMatch) {
      if (currentWorkout) {
        workouts.push(currentWorkout);
      }
      currentWorkout = {
        day: parseInt(dayMatch[1]),
        muscle_group: dayMatch[2].trim().replace(/:$/, ''),
        exercises: []
      };
      continue;
    }

    // Check if this is an exercise line (e.g., "1. Pull-ups - 2x1 @ bodyweight | 120s rest")
    const exerciseMatch = line.match(/^\d+\.\s*(.+?)\s*-\s*(.+)$/);
    if (exerciseMatch && currentWorkout) {
      const exerciseTitle = exerciseMatch[1].trim();
      const details = exerciseMatch[2].trim();

      // Parse exercise details
      const exercise: ExerciseData = {
        exercise_title: exerciseTitle,
        number_of_reps: [],
        bodyweight: false
      };

      // Extract sets and reps (e.g., "2x1", "4x12")
      const setsRepsMatch = details.match(/(\d+)x(\d+)/);
      if (setsRepsMatch) {
        const sets = parseInt(setsRepsMatch[1]);
        const reps = parseInt(setsRepsMatch[2]);
        exercise.number_of_reps = Array(sets).fill(reps);
      }

      // Check if bodyweight
      if (details.includes('@ bodyweight')) {
        exercise.bodyweight = true;
      } else {
        // Extract weight (e.g., "@ 55kg")
        const weightMatch = details.match(/@ ([\d.]+)kg/);
        if (weightMatch) {
          exercise.weight = parseFloat(weightMatch[1]);
        }
      }

      // Extract rest time (e.g., "120s rest")
      const restMatch = details.match(/(\d+)s\s*rest/i);
      if (restMatch) {
        exercise.rest_time = parseInt(restMatch[1]);
      }

      // Extract notes (text in parentheses)
      const notesMatch = details.match(/\(([^)]+)\)/);
      if (notesMatch) {
        exercise.notes = notesMatch[1];
      }

      currentWorkout.exercises.push(exercise);
    }
  }

  // Add the last workout
  if (currentWorkout) {
    workouts.push(currentWorkout);
  }

  return workouts;
}

/**
 * Migrate workout plans to new structure
 */
async function migrateWorkoutPlans() {
  console.log('🚀 Starting workout plan migration...');

  try {
    // Fetch all workout plans with plan_details
    const plans = await prisma.workoutPlan.findMany({
      where: {
        planDetails: {
          not: null
        }
      }
    });

    console.log(`📊 Found ${plans.length} workout plans to migrate`);

    for (const plan of plans) {
      if (!plan.planDetails) continue;

      console.log(`\n📝 Migrating plan: ${plan.name} (ID: ${plan.id})`);

      try {
        // Parse the plan details
        const workouts = parsePlanDetails(plan.planDetails);
        console.log(`   Found ${workouts.length} workout days`);

        // Create workout and exercise records
        for (const workoutData of workouts) {
          console.log(`   Creating Day ${workoutData.day} - ${workoutData.muscle_group}`);

          const workout = await prisma.workout.create({
            data: {
              planId: plan.id,
              day: workoutData.day,
              muscleGroup: workoutData.muscle_group
            }
          });

          // Create exercises
          for (let i = 0; i < workoutData.exercises.length; i++) {
            const exerciseData = workoutData.exercises[i];

            await prisma.exercise.create({
              data: {
                workoutId: workout.id,
                orderIndex: i + 1,
                exerciseTitle: exerciseData.exercise_title,
                numberOfReps: JSON.stringify(exerciseData.number_of_reps),
                weight: exerciseData.weight,
                isBodyweight: exerciseData.bodyweight || false,
                restTime: exerciseData.rest_time,
                notes: exerciseData.notes
              }
            });
          }

          console.log(`   ✓ Created ${workoutData.exercises.length} exercises for Day ${workoutData.day}`);
        }

        console.log(`✅ Successfully migrated plan: ${plan.name}`);

      } catch (error) {
        console.error(`❌ Error migrating plan ${plan.name}:`, error);
        // Continue with next plan
      }
    }

    console.log('\n🎉 Migration completed!');

    // Summary
    const totalWorkouts = await prisma.workout.count();
    const totalExercises = await prisma.exercise.count();
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
  await migrateWorkoutPlans();
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
