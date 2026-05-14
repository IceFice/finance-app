import { ValidationError } from './errors';

export function encodeCursor(date: string, id: string): string {
  return Buffer.from(JSON.stringify({ date, id })).toString('base64url');
}

export function decodeCursor(cursor: string): { date: string; id: string } {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as { date: string; id: string };
    if (!parsed.date || !parsed.id) throw new ValidationError('Invalid pagination cursor');
    return parsed;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError('Invalid pagination cursor');
  }
}
