/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'bundler',
          verbatimModuleSyntax: false,
        },
      },
    ],
  },
  // Run all *.test.ts files except *.integration.test.ts in normal test runs.
  // Integration tests should be run via `pnpm test:integration` which overrides testPathIgnorePatterns.
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', String.raw`\.integration\.test\.ts$`],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/__tests__/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
};
