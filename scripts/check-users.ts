import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();
const prisma = new PrismaClient();
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
prisma.user
  .findMany({
    select: {
      id: true,
      email: true,
      age: true,
      weight: true,
      height: true,
      fitnessLevel: true,
      goals: true,
    },
  })
  .then((rows) => {
    console.log(JSON.stringify(rows, null, 2));
    prisma.$disconnect();
  });
