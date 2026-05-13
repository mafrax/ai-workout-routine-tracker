const { PrismaClient } = require('@prisma/client');
const { WorkoutGenerationService } = require('../dist/services/WorkoutGenerationService');

const prisma = new PrismaClient();

async function reparsePlan(planId) {
  const plan = await prisma.workoutPlan.findUnique({
    where: { id: BigInt(planId) }
  });

  if (!plan || !plan.planDetails) {
    console.error('Plan not found or has no details');
    return;
  }

  console.log('📝 Re-parsing plan', planId);
  console.log('Plan details preview:', plan.planDetails.substring(0, 200));

  // Delete existing workouts
  await prisma.workout.deleteMany({
    where: { planId: BigInt(planId) }
  });

  // Re-parse and create workouts
  const result = await WorkoutGenerationService.generateWorkoutsFromPlanDetails(
    BigInt(planId),
    plan.planDetails
  );

  console.log('✅ Re-parsed successfully:', result);

  // Fetch and display the workouts
  const workouts = await prisma.workout.findMany({
    where: { planId: BigInt(planId) },
    include: { exercises: true },
    orderBy: { day: 'asc' }
  });

  console.log('\nWorkouts created:');
  workouts.forEach(w => {
    console.log(`Day ${w.day}: ${w.muscleGroup} - ${w.exercises.length} exercises`);
  });

  await prisma.$disconnect();
}

const planId = process.argv[2] || '4';
reparsePlan(planId).catch(console.error);
