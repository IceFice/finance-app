import { userQuery, withUserContext } from '../../db/context';
import { NotFoundError, ForbiddenError } from '../../lib/errors';
import type { CreateCategoryInput, UpdateCategoryInput } from './categories.schema';

interface CategoryRow {
  id: string; user_id: string | null; parent_id: string | null;
  name: string; type: string; color: string | null; icon: string | null;
  is_system: boolean; sort_order: number;
}

function mapCategory(row: CategoryRow) {
  return {
    id: row.id, parentId: row.parent_id, name: row.name, type: row.type,
    color: row.color, icon: row.icon, isSystem: row.is_system, sortOrder: row.sort_order,
  };
}

export async function list(userId: string) {
  // RLS categories_read already limits to system (user_id IS NULL) + own.
  const res = await userQuery<CategoryRow>(
    userId,
    `SELECT * FROM categories WHERE (user_id IS NULL OR user_id = $1)
     ORDER BY is_system DESC, sort_order ASC, name ASC`,
    [userId]
  );
  return res.rows.map(mapCategory);
}

export async function create(userId: string, input: CreateCategoryInput) {
  // WITH CHECK (008) rejects any user_id other than the caller's.
  const res = await userQuery<CategoryRow>(
    userId,
    `INSERT INTO categories (user_id, parent_id, name, type, color, icon, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [userId, input.parentId ?? null, input.name, input.type, input.color ?? null, input.icon ?? null, input.sortOrder]
  );
  return mapCategory(res.rows[0]);
}

export async function update(userId: string, categoryId: string, input: UpdateCategoryInput) {
  return withUserContext(userId, async (db) => {
    // Under RLS this returns the row only if it is a system category or owned.
    const check = await db.query<CategoryRow>(`SELECT * FROM categories WHERE id = $1`, [categoryId]);
    if (!check.rows[0]) throw new NotFoundError('Category');
    if (check.rows[0].is_system || check.rows[0].user_id !== userId) {
      throw new ForbiddenError('Cannot edit system category');
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (input.name !== undefined) { fields.push(`name = $${i++}`); values.push(input.name); }
    if (input.type !== undefined) { fields.push(`type = $${i++}`); values.push(input.type); }
    if (input.color !== undefined) { fields.push(`color = $${i++}`); values.push(input.color); }
    if (input.icon !== undefined) { fields.push(`icon = $${i++}`); values.push(input.icon); }
    if (input.sortOrder !== undefined) { fields.push(`sort_order = $${i++}`); values.push(input.sortOrder); }
    if (fields.length === 0) return mapCategory(check.rows[0]);
    values.push(categoryId);
    const res = await db.query<CategoryRow>(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`, values
    );
    return mapCategory(res.rows[0]);
  });
}

export async function remove(userId: string, categoryId: string) {
  return withUserContext(userId, async (db) => {
    const check = await db.query<CategoryRow>(`SELECT * FROM categories WHERE id = $1`, [categoryId]);
    if (!check.rows[0]) throw new NotFoundError('Category');
    if (check.rows[0].is_system || check.rows[0].user_id !== userId) {
      throw new ForbiddenError('Cannot delete system category');
    }
    await db.query(`DELETE FROM categories WHERE id = $1`, [categoryId]);
  });
}
