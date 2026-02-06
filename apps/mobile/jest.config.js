/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo/web',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)', '**/*.test.ts?(x)'],
  // Pattern for pnpm's .pnpm directory structure
  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-safe-area-context))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'constants/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/index.ts', // Exclude re-export barrel files
    '!hooks/useColorScheme.ts', // Re-exports from react-native
    '!app/_layout.tsx', // Root layout is mostly config, tested via e2e
    '!app/*/_layout.tsx', // Tab/onboarding layouts are mostly config
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 60,
      lines: 80,
      statements: 80,
    },
  },
};
