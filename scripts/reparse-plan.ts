import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();
import { WorkoutGenerationService } from '../src/services/WorkoutGenerationService';

const prisma = new PrismaClient();

async function main() {
  const planId = BigInt(process.argv[2] || '7');
  const plan = await prisma.workoutPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error(`Plan ${planId} not found`);

  await prisma.workout.deleteMany({ where: { planId } });
  const r = await WorkoutGenerationService.generateWorkoutsFromPlanDetails(planId, plan.planDetails || '');
  console.log(`plan ${planId}: created=${r.created}, updated=${r.updated}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
