const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Parse workout plan to extract exercises for each day
function parseWorkoutPlan(planDetails) {
  const workouts = {};
  const lines = planDetails.split('\n');

  let currentDay = null;
  let currentExercises = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match "Day X - Focus"
    const dayMatch = trimmed.match(/^Day (\d+)\s*[-:]\s*(.+)/i);
    if (dayMatch) {
      // Save previous day if exists
      if (currentDay !== null && currentExercises.length > 0) {
        workouts[currentDay] = currentExercises;
      }

      currentDay = parseInt(dayMatch[1]);
      currentExercises = [];
      continue;
    }

    // Match exercise line: "1. Exercise Name - 4x10 @ 40kg | 90s | 120s"
    const exerciseMatch = trimmed.match(/^\d+[a-z]?\.\s*(.+?)\s*-\s*(\d+)(?:x|X)([\d-]+)\s+(?:@|reps @)\s+(.+?)(?:\s*\|\s*(\d+)s(?:\s+rest)?)?(?:\s*\|\s*(\d+)s)?/i);

    if (exerciseMatch && currentDay !== null) {
      const [, name, sets, reps, weight, restSets, restNext] = exerciseMatch;

      // Clean up weight
      let cleanWeight = weight.trim().replace(/\s*\([^)]*\).*$/, '').replace(/\s*\|.*$/, '').trim();
      cleanWeight = cleanWeight.replace(/body\s+weight/gi, 'bodyweight');

      currentExercises.push({
        name: name.trim(),
        sets: parseInt(sets),
        completedSets: 0,
        reps: reps.trim(),
        weight: cleanWeight
      });
    }
  }

  // Save last day
  if (currentDay !== null && currentExercises.length > 0) {
    workouts[currentDay] = currentExercises;
  }

  return workouts;
}

async function populateWorkoutSessions() {
  try {
    console.log('🔄 Starting workout session population...\n');

    // Get the workout plan with completed workouts
    const plan = await prisma.workoutPlan.findFirst({
      where: { userId: BigInt(1) }
    });

    if (!plan) {
      console.log('❌ No workout plan found');
      return;
    }

    console.log(`📋 Plan: ${plan.name}`);

    // Parse completed workouts array
    let completedWorkouts = [];
    try {
      completedWorkouts = JSON.parse(plan.completedWorkouts || '[]');
    } catch (e) {
      console.log('⚠️  Could not parse completedWorkouts, using empty array');
    }

    console.log(`✅ Completed workouts: ${completedWorkouts.join(', ')}`);
    console.log(`📝 Total: ${completedWorkouts.length} completed workouts\n`);

    // Parse plan details to get exercises for each day
    const workoutsByDay = parseWorkoutPlan(plan.planDetails);
    console.log(`📚 Parsed ${Object.keys(workoutsByDay).length} workout days from plan\n`);

    // Get all workout sessions ordered by date
    const sessions = await prisma.workoutSession.findMany({
      where: { userId: BigInt(1) },
      orderBy: { sessionDate: 'asc' }
    });

    console.log(`📅 Found ${sessions.length} workout sessions\n`);

    // Remove duplicates from completedWorkouts array (just in case)
    const uniqueCompletedWorkouts = [...new Set(completedWorkouts)];

    if (uniqueCompletedWorkouts.length !== completedWorkouts.length) {
      console.log(`🔧 Removed ${completedWorkouts.length - uniqueCompletedWorkouts.length} duplicate(s) from completed workouts\n`);
    }

    // Match sessions to completed workouts
    let updatedCount = 0;
    for (let i = 0; i < Math.min(sessions.length, uniqueCompletedWorkouts.length); i++) {
      const session = sessions[i];
      const dayNumber = uniqueCompletedWorkouts[i];
      const exercises = workoutsByDay[dayNumber];

      if (!exercises) {
        console.log(`⚠️  Session ${i + 1}: No exercises found for Day ${dayNumber}`);
        continue;
      }

      // Update session with exercises and day number
      await prisma.workoutSession.update({
        where: { id: session.id },
        data: {
          dayNumber: dayNumber,
          planId: plan.id,
          exercises: JSON.stringify(exercises)
        }
      });

      console.log(`✅ Session ${i + 1}: Updated with Day ${dayNumber} (${exercises.length} exercises)`);
      updatedCount++;
    }

    console.log(`\n🎉 Successfully updated ${updatedCount} workout sessions!`);

    // Update the plan to remove duplicates from completedWorkouts
    if (uniqueCompletedWorkouts.length !== completedWorkouts.length) {
      await prisma.workoutPlan.update({
        where: { id: plan.id },
        data: {
          completedWorkouts: JSON.stringify(uniqueCompletedWorkouts)
        }
      });
      console.log(`🔧 Cleaned up completedWorkouts array in plan`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateWorkoutSessions();
