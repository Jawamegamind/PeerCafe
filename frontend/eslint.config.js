import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2021,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      // Make console statements warnings (not errors)
      'no-console': 'warn',

      // Make unused vars warnings (not errors)
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-unused-vars': 'off', // Use TypeScript version instead

      // General code quality rules
      'prefer-const': 'error',
      'no-var': 'error',

      // Disable problematic rules for React/Next.js
      'no-undef': 'off', // TypeScript handles this
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'build/**',
      'dist/**',
      'coverage/**',
      '*.config.js',
      '*.config.ts',
      '*.config.cjs',
    ],
  },
];
