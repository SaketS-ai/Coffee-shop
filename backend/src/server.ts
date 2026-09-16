import { app } from './app';
import { env } from './config/env';
import { startScheduledJobs } from './jobs/scheduler';
import { logger } from './utils/logger';

app.listen(env.port, () => {
  logger.info(`Social Cup backend listening on port ${env.port} (${env.nodeEnv})`);
  logger.info(`Health check: http://localhost:${env.port}/api/health`);
  startScheduledJobs();
});
