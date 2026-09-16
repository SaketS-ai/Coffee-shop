import { beforeEach, describe, expect, it, vi } from 'vitest';

// Scenario 9: ENABLE_SCHEDULER=false must mean no automatic reset ever
// fires; ENABLE_SCHEDULER=true must register both jobs. node-cron and env
// are mocked so this is a fast, DB-free unit test of the gating logic
// itself, not the jobs' internals (those are covered by
// membership.service.test.ts's real-database tests).
describe('Scheduler ENABLE_SCHEDULER gating', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('does not schedule anything when ENABLE_SCHEDULER is false', async () => {
    const schedule = vi.fn();
    vi.doMock('node-cron', () => ({ default: { schedule } }));
    vi.doMock('../config/env', () => ({ env: { enableScheduler: false } }));

    const { startScheduledJobs } = await import('./scheduler');
    startScheduledJobs();

    expect(schedule).not.toHaveBeenCalled();
  });

  it('schedules the membership-cycle and redemption-cleanup jobs when ENABLE_SCHEDULER is true', async () => {
    const schedule = vi.fn();
    vi.doMock('node-cron', () => ({ default: { schedule } }));
    vi.doMock('../config/env', () => ({ env: { enableScheduler: true } }));

    const { startScheduledJobs } = await import('./scheduler');
    startScheduledJobs();

    expect(schedule).toHaveBeenCalledTimes(2);
  });

  it('calling startScheduledJobs twice in the same process only registers the jobs once', async () => {
    const schedule = vi.fn();
    vi.doMock('node-cron', () => ({ default: { schedule } }));
    vi.doMock('../config/env', () => ({ env: { enableScheduler: true } }));

    const { startScheduledJobs } = await import('./scheduler');
    startScheduledJobs();
    startScheduledJobs();

    expect(schedule).toHaveBeenCalledTimes(2); // not 4
  });
});
