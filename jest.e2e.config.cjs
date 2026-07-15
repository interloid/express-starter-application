module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  resolver: 'jest-ts-webcompat-resolver',
  moduleDirectories: ['node_modules', '<rootDir>'],   // ← ADD
  transform: { '^.+\\.ts$': ['ts-jest', { useESM: true }] },
  testMatch: ['**/test/e2e/**/*.e2e.spec.ts'],
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  globalSetup: '<rootDir>/test/global-setup.ts',
  testTimeout: 30000,
  maxWorkers: 1,
};