import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function main() {
  // 1) Workouts with 0 exercises
  const empty = await prisma.workout.findMany({
    where: { exercises: { none: {} } },
    include: {
      plan: { select: { id: true, name: true, userId: true, isActive: true } },
    },
    orderBy: [{ planId: 'asc' }, { day: 'asc' }],
  });
  console.log(`\n[1] Workouts with 0 exercises: ${empty.length}`);
  for (const w of empty) {
    console.log(`    workoutId=${w.id} planId=${w.planId} day=${w.day} mg="${w.muscleGroup}" plan="${w.plan?.name}" active=${w.plan?.isActive}`);
  }

  // 2) Active plans + their workouts list
  const activePlans = await prisma.workoutPlan.findMany({
    where: { isActive: true },
    include: {
      workouts: {
        include: { _count: { select: { exercises: true } } },
        orderBy: { day: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`\n[2] Active plans: ${activePlans.length}`);
  for (const p of activePlans) {
    console.log(`\n  plan id=${p.id} name="${p.name}" userId=${p.userId} createdAt=${p.createdAt.toISOString()}`);
    console.log(`  ${p.workouts.length} workouts:`);
    for (const w of p.workouts) {
      console.log(`    day=${w.day} mg="${w.muscleGroup}" exercises=${w._count.exercises}`);
    }
    console.log(`  --- planDetails (first 1500 chars) ---`);
    console.log((p.planDetails || '<empty>').slice(0, 1500));
  }

  // 3) Most recently created plans (last 5) regardless of active
  const recent = await prisma.workoutPlan.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      workouts: {
        include: { _count: { select: { exercises: true } } },
        orderBy: { day: 'asc' },
      },
    },
  });
  console.log(`\n[3] 5 most recent plans:`);
  for (const p of recent) {
    const summary = p.workouts.map((w) => `d${w.day}=${w._count.exercises}`).join(' ');
    console.log(`  id=${p.id} active=${p.isActive} name="${p.name}" => ${summary}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
