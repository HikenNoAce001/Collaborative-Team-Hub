import { PrismaClient } from './generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { env, isProd } from './env.js';

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

// Hot-reload guard — `node --watch` re-evaluates the module graph on every save,
// so a fresh PrismaClient would be constructed each time and leak the previous
// connection pool. Stash on globalThis in non-prod so we reuse one instance.
const globalForPrisma = /** @type {{ __prisma?: PrismaClient }} */ (globalThis);

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    adapter,
    log: isProd ? ['error'] : ['warn', 'error'],
  });

if (!isProd) globalForPrisma.__prisma = prisma;

export async function disconnect() {
  await prisma.$disconnect();
}
