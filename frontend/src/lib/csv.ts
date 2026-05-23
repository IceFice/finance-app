// Tiny RFC 4180-ish CSV parser. Handles quoted fields with commas / escaped
// quotes / CR-LF, skips blank lines. Used by the /import flow so we don't
// pull in papaparse (50 KB) just to chop a few hundred bank-statement rows.
//
// Tradeoffs we knowingly do NOT support: custom delimiters at runtime
// (caller passes one), multibyte BOM beyond the leading UTF-8 BOM (stripped),
// streaming. Good enough for a CSV that fits in memory (we cap import to
// 2000 rows backend-side anyway). parseAmount handles NBSP (U+00A0) and
// NNBSP (U+202F) that show up in Russian bank exports as digit grouping.

export function parseCSV(text: string, delimiter = ','): string[][] {
  // Strip UTF-8 BOM (U+FEFF) if present so the first cell stays clean.
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === delimiter) { row.push(cell); cell = ''; continue; }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (!(row.length === 1 && row[0] === '')) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    if (!(row.length === 1 && row[0] === '')) rows.push(row);
  }
  return rows;
}

// Best-effort date parser - accepts ISO yyyy-MM-dd, dd.MM.yyyy,
// dd/MM/yyyy, MM/dd/yyyy, yyyy/MM/dd. Returns yyyy-MM-dd string or null.
export function parseDate(s: string): string | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})/.exec(trimmed);
  if (m) {
    const d = m[1].padStart(2, '0');
    const mo = m[2].padStart(2, '0');
    return `${m[3]}-${mo}-${d}`;
  }
  m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})/.exec(trimmed);
  if (m) {
    const mo = m[2].padStart(2, '0');
    const d = m[3].padStart(2, '0');
    return `${m[1]}-${mo}-${d}`;
  }
  const t = Date.parse(trimmed);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
  }
  return null;
}

// Parse a money cell: strips currency symbols / spaces (incl. NBSP / NNBSP),
// accepts comma or dot decimal separator, returns an absolute number string
// with 2 decimals and a sign flag - caller decides what to do with negative.
export function parseAmount(s: string): { amount: string; negative: boolean } | null {
  // \s covers ordinary space + tab. NBSP (U+00A0) and NNBSP (U+202F)
  // are the non-breaking spaces Russian banks use between digit groups.
  let v = s.trim().replace(new RegExp('[\\s\\u00A0\\u202F\\u2009₽$€]', 'g'), '');
  if (!v) return null;
  const negative = v.startsWith('-') || (v.startsWith('(') && v.endsWith(')'));
  v = v.replace(/^[-(]/, '').replace(/\)$/, '');
  const lastComma = v.lastIndexOf(',');
  const lastDot = v.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      v = v.replace(/\./g, '').replace(',', '.');
    } else {
      v = v.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    if (/^\d+(\d{3})*,\d{1,2}$/.test(v)) v = v.replace(',', '.');
    else v = v.replace(/,/g, '');
  }
  const num = Number(v);
  if (!Number.isFinite(num)) return null;
  return { amount: Math.abs(num).toFixed(2), negative };
}
