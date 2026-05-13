export function encodeCursor(date: string, id: string): string {
  return Buffer.from(JSON.stringify({ date, id })).toString('base64url');
}

export function decodeCursor(cursor: string): { date: string; id: string } {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as { date: string; id: string };
    if (!parsed.date || !parsed.id) throw new Error('Invalid cursor shape');
    return parsed;
  } catch {
    throw new Error('Invalid pagination cursor');
  }
}
