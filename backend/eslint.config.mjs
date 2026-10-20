import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Flat ESLint config for ESLint 9+/10 (backend).
 * Uses tsconfig.eslint.json so test files are type-checked by the linter
 * without being emitted into dist/.
 */
export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'uploads/**', 'uploads-test/**', 'coverage/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'scripts/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
    },
  },
);
