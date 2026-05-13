import { describe, it, expect } from 'vitest';
import { encodeCursor, decodeCursor } from '../cursor';

describe('encodeCursor / decodeCursor', () => {
  describe('round-trip', () => {
    it('encodes and decodes back to the original values', () => {
      const date = '2024-03-15';
      const id   = 'abc-123-uuid';
      expect(decodeCursor(encodeCursor(date, id))).toEqual({ date, id });
    });

    it('handles dates at epoch boundaries', () => {
      const date = '1970-01-01';
      const id   = '00000000-0000-0000-0000-000000000000';
      expect(decodeCursor(encodeCursor(date, id))).toEqual({ date, id });
    });

    it('handles UUIDs with all character types', () => {
      const date = '2099-12-31';
      const id   = 'ffffffff-ffff-4fff-bfff-ffffffffffff';
      expect(decodeCursor(encodeCursor(date, id))).toEqual({ date, id });
    });
  });

  describe('encodeCursor', () => {
    it('produces a base64url string (no +, /, or = padding)', () => {
      const cursor = encodeCursor('2024-01-01', 'some-id');
      expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('two different inputs produce different cursors', () => {
      const a = encodeCursor('2024-01-01', 'id-a');
      const b = encodeCursor('2024-01-01', 'id-b');
      expect(a).not.toBe(b);
    });

    it('same date + id always produces the same cursor (deterministic)', () => {
      const c1 = encodeCursor('2024-06-01', 'stable-id');
      const c2 = encodeCursor('2024-06-01', 'stable-id');
      expect(c1).toBe(c2);
    });
  });

  describe('decodeCursor — malformed input', () => {
    it('throws on completely invalid base64', () => {
      expect(() => decodeCursor('not-base64!!!')).toThrow('Invalid pagination cursor');
    });

    it('throws on valid base64 but not JSON', () => {
      const bad = Buffer.from('this is not json').toString('base64url');
      expect(() => decodeCursor(bad)).toThrow('Invalid pagination cursor');
    });

    it('throws on JSON missing the "date" field', () => {
      const bad = Buffer.from(JSON.stringify({ id: 'abc' })).toString('base64url');
      expect(() => decodeCursor(bad)).toThrow('Invalid pagination cursor');
    });

    it('throws on JSON missing the "id" field', () => {
      const bad = Buffer.from(JSON.stringify({ date: '2024-01-01' })).toString('base64url');
      expect(() => decodeCursor(bad)).toThrow('Invalid pagination cursor');
    });

    it('throws on empty string', () => {
      expect(() => decodeCursor('')).toThrow('Invalid pagination cursor');
    });
  });
});
