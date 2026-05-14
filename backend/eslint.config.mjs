// @ts-check
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import securityPlugin from 'eslint-plugin-security';
import nodePlugin from 'eslint-plugin-n';
import globals from 'globals';

export default [
  // ── Base JS recommended (no-undef, no-unused-vars, etc.) ──────────────────
  js.configs.recommended,

  // ── TypeScript source files ───────────────────────────────────────────────
  {
    files: ['src/**/*.ts', 'scripts/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
      // Node.js globals — fixes: process, console, Buffer, __dirname, setTimeout…
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      security: securityPlugin,
      n: nodePlugin,
    },
    rules: {
      // Disable base rule — @typescript-eslint/no-unused-vars handles TS correctly
      // (understands type-only params, constructor property params, etc.)
      'no-unused-vars': 'off',
      // Disable base no-undef — TypeScript compiler already catches undefined vars;
      // and globals.node above covers all Node.js builtins
      'no-undef': 'off',

      // ── Security: injection & eval ──────────────────────────────────────
      'security/detect-eval-with-expression': 'error',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-non-literal-require': 'error',
      // Too many false positives in TypeScript where types prove safety
      'security/detect-object-injection': 'off',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'error',
      'security/detect-non-literal-fs-filename': 'warn',

      // ── Disallow dangerous patterns ─────────────────────────────────────
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-implied-eval': 'error',
      'no-script-url': 'error',

      // ── TypeScript strict rules ─────────────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          // Don't flag type-only imports as unused
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',

      // ── General quality ─────────────────────────────────────────────────
      // Server-side code uses console extensively — this is expected
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      // Allow == null (checks both null and undefined — useful TS pattern)
      eqeqeq: ['error', 'always', { null: 'ignore' }],

      // ── Node.js security ─────────────────────────────────────────────────
      'n/no-process-env': 'off',        // env validated via Zod config module
      'n/no-extraneous-require': 'error',
    },
  },

  // ── Test files: relax strict TypeScript unsafe rules ──────────────────────
  // Test helpers and integration tests frequently use `any`-typed supertest
  // responses, which triggers false-positive @typescript-eslint/no-unsafe-* errors.
  {
    files: ['src/tests/**/*.ts', 'src/lib/__tests__/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Relax unsafe rules in tests — supertest responses are untyped by design
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },

  // ── Ignore patterns ────────────────────────────────────────────────────────
  {
    ignores: ['dist/', 'node_modules/', '*.js.map', 'scripts/generate-secrets.js'],
  },
];
