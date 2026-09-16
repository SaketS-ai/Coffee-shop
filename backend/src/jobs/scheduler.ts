import cron from 'node-cron';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { processMembershipCycles } from '../services/membership.service';
import { expireStaleRedemptions } from '../services/redemption.service';

// Guards against overlapping job runs and multiple scheduler initializations
let cycleJobRunning = false;
let expiryJobRunning = false;
let schedulerStarted = false;

/**
 * PRD Module 1.2's two scheduled jobs.
 * - Membership cycle processing runs every 15 minutes.
 * - Stale redemption cleanup runs every 5 minutes.
 *
 * Controlled via ENABLE_SCHEDULER environment variable. In multi-instance
 * deployments, only ONE instance should run scheduled jobs, or tasks
 * should be offloaded to AWS EventBridge / ECS tasks.
 */
export function startScheduledJobs(): void {
  if (schedulerStarted) {
    logger.warn('Scheduled jobs: startScheduledJobs() called more than once; ignoring duplicate call.');
    return;
  }

  if (!env.enableScheduler) {
    logger.info('Scheduled jobs: DISABLED on this instance (ENABLE_SCHEDULER is false).');
    return;
  }

  schedulerStarted = true;

  cron.schedule('*/15 * * * *', async () => {
    if (cycleJobRunning) return;
    cycleJobRunning = true;
    try {
      const summary = await processMembershipCycles();
      if (summary.membershipsProcessed > 0) {
        logger.info(
          `Scheduled job: reset ${summary.membershipsProcessed} membership cycle(s) (${summary.totalCyclesProcessed} cycle(s) total)`
        );
      }
    } catch (err) {
      logger.error('Scheduled membership cycle reset failed', err);
    } finally {
      cycleJobRunning = false;
    }
  });

  cron.schedule('*/5 * * * *', async () => {
    if (expiryJobRunning) return;
    expiryJobRunning = true;
    try {
      const count = await expireStaleRedemptions();
      if (count > 0) {
        logger.info(`Scheduled job: expired ${count} stale redemption code(s)`);
      }
    } catch (err) {
      logger.error('Scheduled redemption expiry cleanup failed', err);
    } finally {
      expiryJobRunning = false;
    }
  });

  logger.info('Scheduled jobs STARTED: membership cycle reset (every 15m), redemption code cleanup (every 5m)');
}
