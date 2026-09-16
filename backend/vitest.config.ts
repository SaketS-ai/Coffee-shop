import { defineConfig } from 'vitest/config';

// Integration tests hit the real local Postgres database (per CLAUDE.md:
// money/credit-moving logic must be verified end-to-end, not mocked) - run
// serially (no parallel test files) so tests that create/inspect ledger
// rows never race each other, and allow enough time for real DB round trips.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
