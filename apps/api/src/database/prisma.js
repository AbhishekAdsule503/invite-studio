import { PrismaClient } from '@prisma/client';

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['warn', 'error']
    });
  }
  prisma = global.__prisma;
}

/**
 * Test database connectivity
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
export async function testDatabaseConnection() {
  if (!process.env.DATABASE_URL) {
    return {
      ok: false,
      message: 'DATABASE_URL is not configured in environment variables.'
    };
  }

  try {
    // Quick query to check DB availability
    await prisma.$queryRaw`SELECT 1;`;
    return {
      ok: true,
      message: 'PostgreSQL database connected successfully.'
    };
  } catch (error) {
    return {
      ok: false,
      message: error.message || 'Database connection failed.'
    };
  }
}

export { prisma };
export default prisma;

