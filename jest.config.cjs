/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },

  testPathIgnorePatterns: ['/node_modules/', '/dist/'],

  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.service.ts',
    'src/**/*.middleware.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/main.ts',
    '!src/server.ts',
  ],
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/','/test/e2e/'],
};
