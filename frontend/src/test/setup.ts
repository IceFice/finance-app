// Adds jest-dom matchers (toBeInTheDocument, etc.) to Vitest's `expect`
// and registers automatic cleanup after each test.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
