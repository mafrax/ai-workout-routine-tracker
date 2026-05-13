import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();
const prisma = new PrismaClient();
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

prisma.workoutPlan
  .findMany({
    where: { userId: BigInt(2) },
    include: {
      workouts: {
        orderBy: { day: 'asc' },
        include: { exercises: { orderBy: { orderIndex: 'asc' }, select: { exerciseTitle: true, attributes: true } } },
      },
    },
  })
  .then((rows) => {
    for (const p of rows) {
      console.log(`\nplan id=${p.id} name="${p.name}" active=${p.isActive}`);
      for (const w of p.workouts) {
        console.log(`  day=${w.day} "${w.muscleGroup}"`);
        for (const e of w.exercises) {
          console.log(`    - ${e.exerciseTitle}  attr=${JSON.stringify(e.attributes)}`);
        }
      }
    }
    return prisma.$disconnect();
  });
