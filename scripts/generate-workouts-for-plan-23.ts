/**
 * Generate workouts for plan 23 from its plan_details
 */

import prisma from '../src/lib/database';
import { WorkoutGenerationService } from '../src/services/WorkoutGenerationService';

async function generateWorkoutsForPlan23() {
  try {
    console.log('🏋️ Generating workouts for plan 23...');

    // Get plan 23
    const plan = await prisma.workoutPlan.findUnique({
      where: { id: 23n }
    });

    if (!plan) {
      console.error('❌ Plan 23 not found');
      process.exit(1);
    }

    if (!plan.planDetails) {
      console.error('❌ Plan 23 has no plan_details');
      process.exit(1);
    }

    console.log(`📋 Plan: ${plan.name}`);
    console.log(`📝 Plan details length: ${plan.planDetails.length} characters`);

    // Generate workouts from plan_details
    const result = await WorkoutGenerationService.generateWorkoutsFromPlanDetails(
      plan.id,
      plan.planDetails
    );

    console.log(`✅ Created ${result.created} workouts`);
    console.log(`✅ Updated ${result.updated} workouts`);

    // Verify workouts were created
    const workouts = await prisma.workout.findMany({
      where: { planId: 23n },
      include: {
        exercises: true
      },
      orderBy: { day: 'asc' }
    });

    console.log(`\n📊 Total workouts for plan 23: ${workouts.length}`);

    for (const workout of workouts) {
      console.log(`  Day ${workout.day}: ${workout.muscleGroup} (${workout.exercises.length} exercises)`);
    }

    console.log('\n🎉 Successfully generated workouts for plan 23!');
  } catch (error) {
    console.error('❌ Error generating workouts:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

generateWorkoutsForPlan23();
