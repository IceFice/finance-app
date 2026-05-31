// buildPartialUpdate — assembles the SET clause + ordered values array for a
// dynamic partial UPDATE, skipping `undefined` fields. Replaces the
// hand-rolled `fields/values/i` builder that was copy-pasted into 6 services.
//
// Usage:
//   const { setClause, values, nextParam } = buildPartialUpdate({
//     name: input.name,           // included only if !== undefined
//     amount: input.amount,
//     category_id: input.categoryId,
//   });
//   if (!setClause) return /* nothing to update */;
//   await db.query(
//     `UPDATE budgets SET ${setClause} WHERE id = $${nextParam}`,
//     [...values, id],
//   );
//
// Column names come from the caller as object keys — they are NEVER user
// input (they're hard-coded literals at every call site), so there's no
// injection surface. Values are always parameterised.

export interface PartialUpdate {
  /** "name = $1, amount = $2" — empty string when no fields to set. */
  setClause: string;
  /** Ordered values matching the $1..$n placeholders. */
  values: unknown[];
  /** The next free placeholder index (= values.length + 1), for the WHERE id. */
  nextParam: number;
}

export function buildPartialUpdate(fields: Record<string, unknown>): PartialUpdate {
  const setParts: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [col, val] of Object.entries(fields)) {
    if (val === undefined) continue;
    setParts.push(`${col} = $${i++}`);
    values.push(val);
  }
  return { setClause: setParts.join(', '), values, nextParam: i };
}
