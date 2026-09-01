import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    hookTimeout: 900_000,
    testTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'phase-one-test-secret-that-is-not-used-outside-tests',
      JWT_EXPIRES_IN: '1h',
      OPENROUTER_API_KEY: 'test-key-never-sent',
      OPENROUTER_MODEL: 'test-model',
    },
  },
});
