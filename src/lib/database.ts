import { PrismaClient } from '@prisma/client';
import { isProd } from '../config/env';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (!isProd) {
  global.prisma = prisma;
}

export default prisma;