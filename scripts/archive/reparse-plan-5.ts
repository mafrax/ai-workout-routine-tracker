import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

import { WorkoutGenerationService } from '../src/services/WorkoutGenerationService';

const prisma = new PrismaClient();

async function main() {
  const planId = BigInt(5);
  const plan = await prisma.workoutPlan.findUnique({
    where: { id: planId },
    include: { workouts: { include: { _count: { select: { exercises: true } } } } },
  });
  if (!plan) {
    console.error('Plan 5 not found');
    process.exit(1);
  }

  console.log(`Before: plan ${plan.id} "${plan.name}" has ${plan.workouts.length} workouts`);
  for (const w of plan.workouts) {
    console.log(`  day=${w.day} mg="${w.muscleGroup}" exercises=${w._count.exercises}`);
  }

  const preview = WorkoutGenerationService.previewParsedWorkouts(plan.planDetails || '');
  console.log(`\nPreview parse: ${preview.length} day(s)`);
  for (const d of preview) console.log(`  day=${d.day} exercises=${d.exerciseCount}`);

  if (preview.length === 0) {
    console.error('Preview parse returned 0 days — refusing to proceed');
    process.exit(1);
  }

  // Wipe then regenerate. Workout.exercises cascades on delete.
  const deleted = await prisma.workout.deleteMany({ where: { planId } });
  console.log(`\nDeleted ${deleted.count} existing workout rows for plan ${planId}`);

  const result = await WorkoutGenerationService.generateWorkoutsFromPlanDetails(
    planId,
    plan.planDetails || ''
  );
  console.log(`Generated: ${result.created} created, ${result.updated} updated`);

  const after = await prisma.workout.findMany({
    where: { planId },
    include: { _count: { select: { exercises: true } } },
    orderBy: { day: 'asc' },
  });
  console.log(`\nAfter: ${after.length} workouts`);
  for (const w of after) {
    console.log(`  day=${w.day} mg="${w.muscleGroup}" exercises=${w._count.exercises}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
