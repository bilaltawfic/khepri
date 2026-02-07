import js from '@eslint/js';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.expo/**',
      '**/coverage/**',
      '**/*.d.ts',
    ],
  },

  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript recommended rules (includes parser)
  ...tseslint.configs.recommended,

  // SonarJS recommended rules
  sonarjs.configs.recommended,

  // Custom configuration for all TS/JS files
  {
    files: ['**/*.{js,ts,jsx,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        // Node globals
        process: 'readonly',
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        // Test globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
    rules: {
      // Disable rules that conflict with TypeScript or Biome
      '@typescript-eslint/no-unused-vars': 'off', // Biome handles this
      '@typescript-eslint/no-explicit-any': 'off', // Allow any for now
      '@typescript-eslint/no-require-imports': 'off', // Some configs use require

      // SonarJS rules - treat as errors, except TODOs which are expected during development
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/todo-tag': 'off', // TODOs are expected in active development
      'sonarjs/fixme-tag': 'off',
    },
  }
);
