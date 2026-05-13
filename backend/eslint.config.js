// @ts-check
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import securityPlugin from 'eslint-plugin-security';
import nodePlugin from 'eslint-plugin-n';

export default [
  js.configs.recommended,

  // ── TypeScript files ────────────────────────────────────────
  {
    files: ['src/**/*.ts', 'scripts/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      security: securityPlugin,
      n: nodePlugin,
    },
    rules: {
      // ── Security: injection & eval ──────────────────────────
      'security/detect-eval-with-expression': 'error',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-non-literal-require': 'error',
      'security/detect-object-injection': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error',
      // Catches patterns like: `SELECT * FROM users WHERE id = ${userId}`
      'security/detect-non-literal-fs-filename': 'warn',

      // ── Disallow dangerous patterns ─────────────────────────
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-implied-eval': 'error',
      'no-script-url': 'error',

      // ── TypeScript strict rules ─────────────────────────────
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',

      // ── General quality ─────────────────────────────────────
      'no-console': ['warn', { allow: ['error', 'warn', 'info'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],

      // ── Node.js security ────────────────────────────────────
      'n/no-process-env': 'off',       // we validate env via Zod config
      'n/no-extraneous-require': 'error',
    },
  },

  // ── Ignore patterns ─────────────────────────────────────────
  {
    ignores: ['dist/', 'node_modules/', '*.js.map', 'scripts/generate-secrets.js'],
  },
];
