import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from '../utils/logger';

// Prisma automatically respects pool and SSL parameters in DATABASE_URL:
// e.g. postgresql://user:pass@host:5432/dbname?sslmode=require&connection_limit=10&pool_timeout=15
export const prisma = new PrismaClient({
  log: env.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
});

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    logger.error('Database connectivity check failed', err);
    return false;
  }
}

// Graceful container shutdown support for AWS ECS / container environments
async function handleShutdown(signal: string) {
  logger.info(`Received ${signal}. Disconnecting Prisma client...`);
  try {
    await prisma.$disconnect();
    logger.info('Prisma disconnected gracefully.');
  } catch (err) {
    logger.error('Error disconnecting Prisma during shutdown', err);
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
