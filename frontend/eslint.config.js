// @ts-check
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import securityPlugin from 'eslint-plugin-security';
import globals from 'globals';

export default [
  js.configs.recommended,

  // ── React + TypeScript files ────────────────────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true },
      },
      // Use the globals package — covers all browser + ES2022 built-ins
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      security: securityPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // Disable base rule — TS version understands type params & destructured vars
      'no-unused-vars': 'off',
      // TypeScript compiler already catches undefined names; globals.browser covers the rest
      'no-undef': 'off',

      // ── XSS prevention ─────────────────────────────────────────────────
      'react/no-danger': 'error',
      'react/no-danger-with-children': 'error',

      // ── Security ─────────────────────────────────────────────────────────
      'security/detect-eval-with-expression': 'error',
      'security/detect-pseudoRandomBytes': 'error',
      // False positives in typed TS code — disabled to keep signal/noise ratio high
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-regexp': 'off',
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-implied-eval': 'error',
      'no-script-url': 'error',

      // ── React best practices ─────────────────────────────────────────────
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/jsx-no-target-blank': 'error',
      'react/jsx-no-script-url': 'error',

      // ── TypeScript ────────────────────────────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/no-floating-promises': 'error',

      // ── General ──────────────────────────────────────────────────────────
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      // Frontend React code frequently uses console for debugging; allow all
      'no-console': 'off',
    },
  },

  // ── Ignore patterns ───────────────────────────────────────────────────────
  {
    ignores: ['dist/', 'node_modules/', 'vite.config.ts'],
  },
];
