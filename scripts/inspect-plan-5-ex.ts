import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

(BigInt.prototype as any).toJSON = function () { return this.toString(); };

async function main() {
  const w = await prisma.workout.findFirst({
    where: { planId: BigInt(5), day: 1 },
    include: { exercises: { orderBy: { orderIndex: 'asc' } } },
  });
  console.log(JSON.stringify(w, null, 2));
  await prisma.$disconnect();
}
main();
