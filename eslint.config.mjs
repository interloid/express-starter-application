// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // 1. GLOBAL IGNORES
  {
    ignores: ['dist/', 'node_modules/', 'jest.config.cjs', 'src/newrelic.cjs'],
  },

  // 2. BASE RULES
  eslint.configs.recommended,
  eslintPluginPrettierRecommended,

  // 3. TYPESCRIPT — config + custom TS rules together
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      // TS rules live in the SAME object where the plugin is registered
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  },

  // 4. NON-TS custom rules (safe everywhere)
  {
    rules: {
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
);
