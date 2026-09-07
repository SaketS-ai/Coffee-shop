import { Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/prisma';
import { env } from '../config/env';

export async function getHealth(req: Request, res: Response) {
  const databaseConnected = await checkDatabaseConnection();

  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    service: 'Social Cup Dallas API',
    environment: env.nodeEnv,
    database: databaseConnected ? 'connected' : 'unreachable',
    timestamp: new Date().toISOString(),
  });
}
