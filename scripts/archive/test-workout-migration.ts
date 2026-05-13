/**
 * Test script for workout migration
 * Creates sample workout plan data and tests the migration
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SAMPLE_PLAN_DETAILS = `Day 1 - Chest & Triceps:
1. Pull-ups - 2x1 @ bodyweight | 120s rest (regular)
2. Negative Pull-ups - 2x3 @ bodyweight (5s lower) | 120s rest
3. Push-ups - 4x12 @ bodyweight | 60s
4. Technogym Chest Press - 4x10 @ 55kg | 90s
5. Incline Dumbbell Press - 3x12 @ 16kg | 60s
6. Cable Triceps Pushdown - 3x15 @ 17.5kg | 60s
7. Push-ups Close Grip - 3x10 @ 1kg | 60s
8. Technogym Cable Machine Flyes - 3x15 @ 15kg | 60s
9. Triceps Rope Extension - 3x12 @ 20kg | 60s

Day 2 - Back & Biceps:
1. Deadlifts - 4x8 @ 80kg | 120s rest
2. Barbell Rows - 4x10 @ 60kg | 90s rest
3. Lat Pulldowns - 3x12 @ 50kg | 60s rest
4. Cable Bicep Curls - 3x15 @ 15kg | 60s rest
5. Hammer Curls - 3x12 @ 12kg | 60s rest`;

async function createSamplePlan() {
  console.log('📝 Creating sample workout plan...');

  // First, ensure we have a test user
  let user = await prisma.user.findFirst({
    where: { email: 'test@example.com' }
  });

  if (!user) {
    console.log('👤 Creating test user...');
    user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User'
      }
    });
  }

  // Create a workout plan with plan_details
  const plan = await prisma.workoutPlan.create({
    data: {
      userId: user.id,
      name: 'Test Migration Plan',
      description: 'Sample plan to test workout migration',
      planDetails: SAMPLE_PLAN_DETAILS,
      daysPerWeek: 2,
      difficultyLevel: 'Intermediate',
      isActive: true
    }
  });

  console.log(`✅ Created workout plan: ${plan.name} (ID: ${plan.id})`);
  return plan;
}

async function testDirectCreation() {
  console.log('\n🧪 Testing direct creation of workouts and exercises...');

  // Create a test user
  let user = await prisma.user.findFirst({
    where: { email: 'direct-test@example.com' }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'direct-test@example.com',
        name: 'Direct Test User'
      }
    });
  }

  // Create a workout plan
  const plan = await prisma.workoutPlan.create({
    data: {
      userId: user.id,
      name: 'Direct Test Plan',
      description: 'Testing direct workout creation',
      daysPerWeek: 1,
      isActive: true
    }
  });

  // Create a workout
  const workout = await prisma.workout.create({
    data: {
      planId: plan.id,
      day: 1,
      muscleGroup: 'Chest & Triceps'
    }
  });

  console.log(`   ✓ Created workout: Day ${workout.day} - ${workout.muscleGroup}`);

  // Create exercises
  const exercises = [
    {
      orderIndex: 1,
      exerciseTitle: 'Push-ups',
      numberOfReps: JSON.stringify([12, 12, 12, 12]),
      isBodyweight: true,
      restTime: 60
    },
    {
      orderIndex: 2,
      exerciseTitle: 'Chest Press',
      numberOfReps: JSON.stringify([10, 10, 10, 10]),
      weight: 55,
      isBodyweight: false,
      restTime: 90
    }
  ];

  for (const exerciseData of exercises) {
    await prisma.exercise.create({
      data: {
        workoutId: workout.id,
        ...exerciseData
      }
    });
    console.log(`   ✓ Created exercise: ${exerciseData.exerciseTitle}`);
  }

  console.log('✅ Direct creation test passed!');
}

async function queryWorkouts() {
  console.log('\n🔍 Querying workouts with exercises...');

  const workouts = await prisma.workout.findMany({
    include: {
      exercises: {
        orderBy: {
          orderIndex: 'asc'
        }
      },
      plan: {
        select: {
          name: true
        }
      }
    }
  });

  console.log(`\n📊 Found ${workouts.length} workouts:\n`);

  for (const workout of workouts) {
    console.log(`📅 ${workout.plan.name} - Day ${workout.day}: ${workout.muscleGroup}`);
    console.log(`   Exercises (${workout.exercises.length}):`);

    for (const exercise of workout.exercises) {
      const reps = JSON.parse(exercise.numberOfReps);
      const setsReps = `${reps.length}x${reps[0]}`;
      const weightInfo = exercise.isBodyweight
        ? 'bodyweight'
        : `${exercise.weight}kg`;
      const restInfo = exercise.restTime ? `${exercise.restTime}s rest` : '';

      console.log(`   ${exercise.orderIndex}. ${exercise.exerciseTitle} - ${setsReps} @ ${weightInfo} ${restInfo}`.trim());
      if (exercise.notes) {
        console.log(`      Note: ${exercise.notes}`);
      }
    }
    console.log('');
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');

  // Delete test users (cascade will delete related data)
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: 'test@example.com' },
        { email: 'direct-test@example.com' }
      ]
    }
  });

  console.log('✅ Cleanup completed');
}

async function main() {
  console.log('🚀 Starting workout migration test\n');

  try {
    // Test 1: Create sample plan with plan_details
    await createSamplePlan();

    // Test 2: Test direct workout/exercise creation
    await testDirectCreation();

    // Test 3: Query and display workouts
    await queryWorkouts();

    // Cleanup
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('\nDo you want to clean up test data? (y/n): ', async (answer: string) => {
      if (answer.toLowerCase() === 'y') {
        await cleanup();
      }
      readline.close();
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    // Don't disconnect here as readline is async
  });
