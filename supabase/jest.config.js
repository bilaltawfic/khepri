/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.ts$': '$1',
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
  testMatch: ['**/functions/**/__tests__/**/*.test.ts', '**/seed/**/*.test.ts'],
  collectCoverageFrom: [
    'functions/**/context-builder.ts',
    'functions/**/prompts.ts',
    'functions/**/stream.ts',
    'functions/**/types.ts',
    'functions/**/validate.ts',
    'functions/mcp-gateway/tools/create-event.ts',
    'functions/mcp-gateway/tools/event-validation.ts',
    'functions/mcp-gateway/tools/get-events.ts',
    'functions/mcp-gateway/tools/update-event.ts',
    'functions/mcp-gateway/utils/intervals-api.ts',
    'functions/**/tools/search-knowledge.ts',
    'seed/chunk-parser.ts',
    'seed/seed-knowledge.ts',
    '!functions/**/__tests__/**',
    '!seed/**/*.test.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
};
