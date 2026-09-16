import { Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/prisma';
import { env } from '../config/env';

/**
 * Liveness probe: Returns 200 OK if Node process is responsive.
 * Used by AWS ALB Target Group health checks so DB hiccups do not kill containers.
 */
export function getLiveness(_req: Request, res: Response) {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Readiness probe: Tests DB connectivity to ensure instance can serve traffic.
 */
export async function getReadiness(_req: Request, res: Response) {
  const databaseConnected = await checkDatabaseConnection();

  res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'ready' : 'not_ready',
    database: databaseConnected ? 'connected' : 'unreachable',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Overall health check: Preserved for existing consumers.
 */
export async function getHealth(_req: Request, res: Response) {
  const databaseConnected = await checkDatabaseConnection();

  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    service: 'Social Cup Dallas API',
    environment: env.nodeEnv,
    database: databaseConnected ? 'connected' : 'unreachable',
    timestamp: new Date().toISOString(),
  });
}
