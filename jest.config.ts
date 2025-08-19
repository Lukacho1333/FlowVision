import nextJest from 'next/jest';
import type { Config } from 'jest';

const createJestConfig = nextJest({
  // Provide the path to your Next app to load next.config.js and .env files in your test environment
  dir: './',
});

const customJestConfig: Config = {
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup/test-env.ts'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!tests/**/*',
  ],
};

export default createJestConfig(customJestConfig);
